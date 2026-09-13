const express = require("express");
const db = require("../db");
const { listTemplates, getTemplate } = require("../templates");
const { requireClientSession } = require("../middleware/clientAuth");

const router = express.Router();

// Everything here requires a valid client session — no calculator data (not even
// symbol defaults) is reachable without a live, unexpired access code.
router.use(requireClientSession);
router.use(express.json());

async function loadOverrides(codeId, templateId) {
  const rows = await db.all("SELECT * FROM code_overrides WHERE code_id = ? AND template_id = ? ORDER BY id ASC", [
    codeId,
    templateId,
  ]);
  const edits = {};
  const custom = [];
  const hidden = new Set();
  for (const row of rows) {
    if (row.kind === "edit") {
      edits[row.symbol_key] = { open: row.open_val, high: row.high_val, low: row.low_val, close: row.close_val };
    } else if (row.kind === "custom") {
      custom.push({
        key: row.symbol_key,
        label: row.label,
        group: row.group_key,
        open: row.open_val,
        high: row.high_val,
        low: row.low_val,
        close: row.close_val,
      });
    } else if (row.kind === "hidden") {
      hidden.add(row.symbol_key);
    }
  }
  return { edits, custom, hidden };
}

function buildRows(tpl, { edits, custom, hidden }) {
  const rows = [];
  for (const symbolDef of tpl.symbols) {
    if (hidden.has(symbolDef.key)) continue;
    const ohlc = { ...symbolDef.defaults, ...(edits[symbolDef.key] || {}) };
    rows.push(tpl.calculateRow(symbolDef, ohlc));
  }
  for (const c of custom) {
    const { open, high, low, close } = c;
    rows.push(tpl.calculateRow({ key: c.key, label: c.label, group: c.group }, { open, high, low, close }));
  }
  return rows;
}

async function persistOverrides(codeId, templateId, tpl, { edits, custom, hidden }) {
  await db.run("DELETE FROM code_overrides WHERE code_id = ? AND template_id = ?", [codeId, templateId]);

  const nowSql = db.toSqlDateTime();
  const defaultsByKey = Object.fromEntries(tpl.symbols.map((s) => [s.key, s.defaults]));

  for (const [key, ohlc] of Object.entries(edits)) {
    const d = defaultsByKey[key];
    if (!d) continue;
    const changed = d.open !== ohlc.open || d.high !== ohlc.high || d.low !== ohlc.low || d.close !== ohlc.close;
    if (!changed) continue;
    await db.run(
      `INSERT INTO code_overrides (code_id, template_id, symbol_key, kind, open_val, high_val, low_val, close_val, updated_at)
       VALUES (?, ?, ?, 'edit', ?, ?, ?, ?, ?)`,
      [codeId, templateId, key, ohlc.open, ohlc.high, ohlc.low, ohlc.close, nowSql]
    );
  }

  let order = 0;
  for (const c of custom) {
    await db.run(
      `INSERT INTO code_overrides (code_id, template_id, symbol_key, kind, label, group_key, open_val, high_val, low_val, close_val, sort_order, updated_at)
       VALUES (?, ?, ?, 'custom', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [codeId, templateId, c.key, c.label, c.group, c.open, c.high, c.low, c.close, order++, nowSql]
    );
  }

  for (const key of hidden) {
    await db.run(
      `INSERT INTO code_overrides (code_id, template_id, symbol_key, kind, updated_at) VALUES (?, ?, ?, 'hidden', ?)`,
      [codeId, templateId, key, nowSql]
    );
  }
}

async function hasAccess(codeId, templateId) {
  const row = await db.get("SELECT 1 FROM code_templates WHERE code_id = ? AND template_id = ?", [codeId, templateId]);
  return Boolean(row);
}

router.get("/", async (req, res) => {
  const grants = await db.all("SELECT template_id FROM code_templates WHERE code_id = ?", [req.clientSession.code.id]);
  const grantedIds = new Set(grants.map((g) => g.template_id));
  res.json({ templates: listTemplates().filter((t) => grantedIds.has(t.id)) });
});

router.use("/:id", async (req, res, next) => {
  const tpl = getTemplate(req.params.id);
  if (!tpl) return res.status(404).json({ error: "not_found" });
  if (!(await hasAccess(req.clientSession.code.id, tpl.id))) return res.status(403).json({ error: "template_not_granted" });
  next();
});

router.get("/:id", async (req, res) => {
  const tpl = getTemplate(req.params.id);

  const overrides = await loadOverrides(req.clientSession.code.id, tpl.id);
  res.json({
    id: tpl.id,
    name: tpl.name,
    groups: tpl.groups,
    rows: buildRows(tpl, overrides),
    customRows: overrides.custom,
    hiddenKeys: [...overrides.hidden],
  });
});

router.post("/:id/calculate", async (req, res) => {
  const tpl = getTemplate(req.params.id);
  if (!tpl) return res.status(404).json({ error: "not_found" });

  const validKeys = new Set(tpl.symbols.map((s) => s.key));
  const body = req.body || {};

  const sanitizedEdits = {};
  for (const [key, ohlc] of Object.entries(body.edits || {})) {
    if (!validKeys.has(key)) continue;
    const nums = [ohlc?.open, ohlc?.high, ohlc?.low, ohlc?.close].map(Number);
    if (nums.some((n) => !Number.isFinite(n))) continue;
    sanitizedEdits[key] = { open: nums[0], high: nums[1], low: nums[2], close: nums[3] };
  }

  const sanitizedCustom = [];
  for (const c of Array.isArray(body.custom) ? body.custom : []) {
    const key = String(c?.key || "").slice(0, 80);
    const label = String(c?.label || "").trim().slice(0, 128);
    if (!key.startsWith("custom-") || !label || validKeys.has(key)) continue;
    if (!tpl.isValidGroup(c?.group)) continue;
    const nums = [c?.open, c?.high, c?.low, c?.close].map(Number);
    if (nums.some((n) => !Number.isFinite(n))) continue;
    sanitizedCustom.push({ key, label, group: c.group, open: nums[0], high: nums[1], low: nums[2], close: nums[3] });
  }

  // Only built-in symbols need a "hidden" marker — a removed custom row is simply
  // left out of `custom` entirely, no trace needed.
  const sanitizedHidden = (Array.isArray(body.hidden) ? body.hidden : []).filter((k) => validKeys.has(k));

  const overrides = { edits: sanitizedEdits, custom: sanitizedCustom, hidden: new Set(sanitizedHidden) };
  const codeId = req.clientSession.code.id;
  await persistOverrides(codeId, tpl.id, tpl, overrides);

  res.json({ rows: buildRows(tpl, overrides) });
});

router.post("/:id/reset", async (req, res) => {
  const tpl = getTemplate(req.params.id);
  if (!tpl) return res.status(404).json({ error: "not_found" });

  await db.run("DELETE FROM code_overrides WHERE code_id = ? AND template_id = ?", [req.clientSession.code.id, tpl.id]);
  res.json({ rows: tpl.calculate(), customRows: [], hiddenKeys: [] });
});

module.exports = router;
