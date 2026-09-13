const db = require("../db");

const IDLE_MINUTES = Number(process.env.SESSION_IDLE_MINUTES || 30);
const COOKIE_NAME = "axiora_session";

async function requireClientSession(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: "not_logged_in" });

  const session = await db.get("SELECT * FROM sessions WHERE token = ?", [token]);
  if (!session) return res.status(401).json({ error: "not_logged_in" });

  const now = new Date();
  const lastActivity = new Date(session.last_activity_at.replace(" ", "T") + "Z");
  const idleMs = now - lastActivity;
  if (idleMs > IDLE_MINUTES * 60 * 1000) {
    await db.run("DELETE FROM sessions WHERE token = ?", [token]);
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ error: "session_expired" });
  }

  const code = await db.get("SELECT * FROM access_codes WHERE id = ?", [session.code_id]);
  if (!code || code.status !== "active") {
    await db.run("DELETE FROM sessions WHERE token = ?", [token]);
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ error: "code_revoked" });
  }
  if (code.expires_at && db.toSqlDateTime(now) > code.expires_at) {
    await db.run("DELETE FROM sessions WHERE token = ?", [token]);
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ error: "code_expired" });
  }
  if (code.active_session_token !== token) {
    // A newer login on the same code has taken over — this session is stale.
    await db.run("DELETE FROM sessions WHERE token = ?", [token]);
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ error: "session_replaced" });
  }

  const nowSql = db.toSqlDateTime(now);
  await db.run("UPDATE sessions SET last_activity_at = ? WHERE token = ?", [nowSql, token]);
  await db.run("UPDATE access_codes SET last_used_at = ? WHERE id = ?", [nowSql, code.id]);

  req.clientSession = { token, code };
  next();
}

module.exports = { requireClientSession, COOKIE_NAME, IDLE_MINUTES };
