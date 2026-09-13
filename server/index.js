require("dotenv").config();
const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const db = require("./db");

const authRoutes = require("./routes/auth");
const calcRoutes = require("./routes/calc");
const adminRoutes = require("./routes/admin");

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

async function main() {
  await db.ready;
  await bootstrapAdmin();

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
