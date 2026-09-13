const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { sessionToken, accessCode } = require("../lib/tokens");
const { requireAdminSession, COOKIE_NAME, IDLE_MINUTES } = require("../middleware/adminAuth");
const { listTemplates } = require("../templates");

const router = express.Router();
router.use(express.json());

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: IDLE_MINUTES * 60 * 1000,
};

router.post("/login", async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (!username || !password) return res.status(400).json({ error: "credentials_required" });

  const admin = await db.get("SELECT * FROM admins WHERE username = ?", [username]);
  if (!admin || !(await bcrypt.compare(password, admin.password_hash))) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const token = sessionToken();
  const nowSql = db.toSqlDateTime();
  await db.run(
    "INSERT INTO admin_sessions (token, admin_id, created_at, last_activity_at) VALUES (?, ?, ?, ?)",
    [token, admin.id, nowSql, nowSql]
  );
  res.cookie(COOKIE_NAME, token, cookieOpts);
  res.json({ ok: true, username: admin.username });
});

router.post("/logout", requireAdminSession, async (req, res) => {
  await db.run("DELETE FROM admin_sessions WHERE token = ?", [req.cookies[COOKIE_NAME]]);
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get("/me", requireAdminSession, (req, res) => {
  res.json({ username: req.admin.username });
});

router.use(requireAdminSession);

router.get("/templates", (req, res) => {
  res.json({ templates: listTemplates() });
});

// `ids` omitted -> grant every currently-registered template (sensible default).
// `ids` given as [] or with nothing valid in it -> reject, a code needs at least one.
function resolveTemplateIds(ids) {
  const allIds = listTemplates().map((t) => t.id);
  if (ids === undefined) return { ok: true, ids: allIds };
  if (!Array.isArray(ids)) return { ok: false };
  const valid = [...new Set(ids.filter((id) => allIds.includes(id)))];
  if (valid.length === 0) return { ok: false };
  return { ok: true, ids: valid };
}

async function grantTemplates(codeId, templateIds) {
  for (const templateId of templateIds) {
    await db.run("INSERT INTO code_templates (code_id, template_id) VALUES (?, ?)", [codeId, templateId]);
  }
}

async function withComputedStatus(row) {
  const now = db.toSqlDateTime();
  const isExpired = row.status === "active" && row.expires_at && now > row.expires_at;
  const grants = await db.all("SELECT template_id FROM code_templates WHERE code_id = ?", [row.id]);
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    durationDays: row.duration_days,
    status: row.status,
    isExpired: Boolean(isExpired),
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    expiresAt: row.expires_at,
    lastUsedAt: row.last_used_at,
    hasActiveSession: Boolean(row.active_session_token),
    templateIds: grants.map((g) => g.template_id),
  };
}

router.get("/codes", async (req, res) => {
  const rows = await db.all("SELECT * FROM access_codes ORDER BY id DESC");
  res.json({ codes: await Promise.all(rows.map(withComputedStatus)) });
});

router.post("/codes", async (req, res) => {
  const label = req.body?.label ? String(req.body.label).slice(0, 128) : null;
  const durationDays = Number(req.body?.durationDays);
  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    return res.status(400).json({ error: "duration_days_required" });
  }
  const templateIds = resolveTemplateIds(req.body?.templateIds);
  if (!templateIds.ok) return res.status(400).json({ error: "at_least_one_template_required" });

  const code = accessCode();
  const nowSql = db.toSqlDateTime();
  const { insertId } = await db.run(
    "INSERT INTO access_codes (code, label, duration_days, status, created_at, created_by) VALUES (?, ?, ?, 'active', ?, ?)",
    [code, label, durationDays, nowSql, req.admin.id]
  );
  await grantTemplates(insertId, templateIds.ids);
  const row = await db.get("SELECT * FROM access_codes WHERE id = ?", [insertId]);
  res.json({ code: await withComputedStatus(row) });
});

router.post("/codes/bulk", async (req, res) => {
  const label = req.body?.label ? String(req.body.label).slice(0, 128) : null;
  const durationDays = Number(req.body?.durationDays);
  const count = Number(req.body?.count);
  if (!Number.isInteger(durationDays) || durationDays <= 0) {
    return res.status(400).json({ error: "duration_days_required" });
  }
  if (!Number.isInteger(count) || count <= 0 || count > 500) {
    return res.status(400).json({ error: "count_must_be_1_to_500" });
  }
  const templateIds = resolveTemplateIds(req.body?.templateIds);
  if (!templateIds.ok) return res.status(400).json({ error: "at_least_one_template_required" });

  const nowSql = db.toSqlDateTime();
  const generated = [];
  for (let i = 0; i < count; i++) {
    const code = accessCode();
    const { insertId } = await db.run(
      "INSERT INTO access_codes (code, label, duration_days, status, created_at, created_by) VALUES (?, ?, ?, 'active', ?, ?)",
      [code, label, durationDays, nowSql, req.admin.id]
    );
    await grantTemplates(insertId, templateIds.ids);
    generated.push(code);
  }
  res.json({ codes: generated });
});

router.post("/codes/:id/revoke", async (req, res) => {
  const id = Number(req.params.id);
  await db.run("UPDATE access_codes SET status = 'revoked', active_session_token = NULL WHERE id = ?", [id]);
  await db.run("DELETE FROM sessions WHERE code_id = ?", [id]);
  res.json({ ok: true });
});

router.post("/codes/:id/reactivate", async (req, res) => {
  const id = Number(req.params.id);
  await db.run("UPDATE access_codes SET status = 'active' WHERE id = ?", [id]);
  res.json({ ok: true });
});

router.post("/codes/:id/templates", async (req, res) => {
  const id = Number(req.params.id);
  const templateIds = resolveTemplateIds(req.body?.templateIds);
  if (!templateIds.ok) return res.status(400).json({ error: "at_least_one_template_required" });

  await db.run("DELETE FROM code_templates WHERE code_id = ?", [id]);
  await grantTemplates(id, templateIds.ids);
  res.json({ ok: true, templateIds: templateIds.ids });
});

module.exports = router;
