require("dotenv").config();
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const db = require("./db");

const authRoutes = require("./routes/auth");
const calcRoutes = require("./routes/calc");
const adminRoutes = require("./routes/admin");
const { listTemplates } = require("./templates");

const PORT = process.env.PORT || 4000;

async function bootstrapAdmin() {
  const existing = await db.get("SELECT id FROM admins LIMIT 1");
  if (existing) return;

  const username = process.env.ADMIN_BOOTSTRAP_USERNAME;
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
  if (!username || !password) {
    console.warn(
      "[axiora] No admin account exists and ADMIN_BOOTSTRAP_USERNAME/ADMIN_BOOTSTRAP_PASSWORD are not set — set them in .env and restart."
    );
    return;
  }
  const hash = await bcrypt.hash(password, 12);
  await db.run("INSERT INTO admins (username, password_hash, created_at) VALUES (?, ?, ?)", [
    username,
    hash,
    db.toSqlDateTime(),
  ]);
  console.log(`[axiora] Bootstrapped admin account "${username}"`);
}

// Codes created before per-template grants existed (or any code somehow left with zero
// grants) get access to every currently-registered template — safe, idempotent, never
// touches a code an admin has deliberately narrowed down (which always has >=1 grant row).
async function backfillTemplateGrants() {
  const allIds = listTemplates().map((t) => t.id);
  if (allIds.length === 0) return;
  const ungranted = await db.all(
    "SELECT id FROM access_codes WHERE id NOT IN (SELECT DISTINCT code_id FROM code_templates)"
  );
  for (const { id } of ungranted) {
    for (const templateId of allIds) {
      await db.run("INSERT INTO code_templates (code_id, template_id) VALUES (?, ?)", [id, templateId]);
    }
  }
  if (ungranted.length > 0) console.log(`[axiora] Backfilled template grants for ${ungranted.length} code(s)`);
}

async function main() {
  await db.ready;
  await bootstrapAdmin();
  await backfillTemplateGrants();

  const app = express();
  app.disable("x-powered-by");
  app.use(cookieParser());
  app.use(express.json());

  app.use("/api/auth", authRoutes);
  app.use("/api/templates", calcRoutes);
  app.use("/api/admin", adminRoutes);

  const clientDist = path.join(__dirname, "public");
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });

  app.listen(PORT, () => {
    console.log(`[axiora] server listening on :${PORT} (db driver: ${db.driver})`);
  });
}

main().catch((err) => {
  console.error("[axiora] failed to start:", err);
  process.exit(1);
});
