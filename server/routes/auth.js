const express = require("express");
const db = require("../db");
const { sessionToken } = require("../lib/tokens");
const { requireClientSession, COOKIE_NAME, IDLE_MINUTES } = require("../middleware/clientAuth");

const router = express.Router();

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  maxAge: IDLE_MINUTES * 60 * 1000,
};

router.post("/login", async (req, res) => {
  const raw = String(req.body?.code || "").trim().toUpperCase();
  if (!raw) return res.status(400).json({ error: "code_required" });

  const code = await db.get("SELECT * FROM access_codes WHERE code = ?", [raw]);
  if (!code) return res.status(401).json({ error: "invalid_code" });
  if (code.status !== "active") return res.status(401).json({ error: "code_revoked" });

  const now = new Date();
  const nowSql = db.toSqlDateTime(now);

  if (!code.activated_at) {
    const expiresAt = db.toSqlDateTime(new Date(now.getTime() + code.duration_days * 86400000));
    await db.run("UPDATE access_codes SET activated_at = ?, expires_at = ? WHERE id = ?", [
      nowSql,
      expiresAt,
      code.id,
    ]);
    code.expires_at = expiresAt;
  } else if (code.expires_at && nowSql > code.expires_at) {
    return res.status(401).json({ error: "code_expired" });
  }

  const token = sessionToken();
  await db.run("INSERT INTO sessions (token, code_id, created_at, last_activity_at) VALUES (?, ?, ?, ?)", [
    token,
    code.id,
    nowSql,
    nowSql,
  ]);
  // Overwriting active_session_token invalidates any session already open on this code.
  await db.run("UPDATE access_codes SET active_session_token = ?, last_used_at = ? WHERE id = ?", [
    token,
    nowSql,
    code.id,
  ]);

  res.cookie(COOKIE_NAME, token, cookieOpts);
  res.json({ ok: true, expiresAt: code.expires_at });
});

router.post("/logout", requireClientSession, async (req, res) => {
  const { token, code } = req.clientSession;
  await db.run("DELETE FROM sessions WHERE token = ?", [token]);
  await db.run("UPDATE access_codes SET active_session_token = NULL WHERE id = ? AND active_session_token = ?", [
    code.id,
    token,
  ]);
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

router.get("/me", requireClientSession, (req, res) => {
  const { code } = req.clientSession;
  res.json({ label: code.label, expiresAt: code.expires_at });
});

module.exports = router;
