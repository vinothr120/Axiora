const express = require("express");
const { listTemplates, getTemplate } = require("../templates");
const { requireClientSession } = require("../middleware/clientAuth");

const router = express.Router();

// Everything here requires a valid client session — no calculator data (not even
// symbol defaults) is reachable without a live, unexpired access code.
router.use(requireClientSession);

router.get("/", (req, res) => {
  res.json({ templates: listTemplates() });
});

router.get("/:id", (req, res) => {
  const tpl = getTemplate(req.params.id);
  if (!tpl) return res.status(404).json({ error: "not_found" });
  // Defaults only — never expose calculate's internals. Client edits from here.
  res.json({
    id: tpl.id,
    name: tpl.name,
    rows: tpl.calculate(), // defaults, pre-computed server-side
  });
});

router.post("/:id/calculate", express.json(), (req, res) => {
  const tpl = getTemplate(req.params.id);
  if (!tpl) return res.status(404).json({ error: "not_found" });

  const input = req.body?.symbols;
  if (!input || typeof input !== "object") return res.status(400).json({ error: "symbols_required" });

  const validKeys = new Set(tpl.symbols.map((s) => s.key));
  const sanitized = {};
  for (const [key, ohlc] of Object.entries(input)) {
    if (!validKeys.has(key)) continue;
    const { open, high, low, close } = ohlc || {};
    const nums = [open, high, low, close].map(Number);
    if (nums.some((n) => !Number.isFinite(n))) continue;
    sanitized[key] = { open: nums[0], high: nums[1], low: nums[2], close: nums[3] };
  }

  res.json({ rows: tpl.calculate(sanitized) });
});

module.exports = router;
