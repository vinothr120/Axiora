const db = require("../db");

const IDLE_MINUTES = Number(process.env.SESSION_IDLE_MINUTES || 30);
const COOKIE_NAME = "axiora_admin_session";

async function requireAdminSession(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "not_logged_in" });

  const session = await db.get("SELECT * FROM admin_sessions WHERE token = ?", [token]);
  if (!session) return res.status(401).json({ error: "not_logged_in" });

  const now = new Date();
  const lastActivity = new Date(session.last_activity_at.replace(" ", "T") + "Z");
  if (now - lastActivity > IDLE_MINUTES * 60 * 1000) {
    await db.run("DELETE FROM admin_sessions WHERE token = ?", [token]);
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ error: "session_expired" });
  }

  const admin = await db.get("SELECT id, username FROM admins WHERE id = ?", [session.admin_id]);
  if (!admin) return res.status(401).json({ error: "not_logged_in" });

  await db.run("UPDATE admin_sessions SET last_activity_at = ? WHERE token = ?", [
    db.toSqlDateTime(now),
    token,
  ]);

  req.admin = admin;
  next();
}

module.exports = { requireAdminSession, COOKIE_NAME, IDLE_MINUTES };
