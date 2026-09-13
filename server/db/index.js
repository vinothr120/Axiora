// Thin DB abstraction so the same query code runs against MySQL in production
// (cPanel) and SQLite locally in development (no local MySQL server required).
// Driver choice: env DB_DRIVER=mysql|sqlite (defaults to sqlite for local dev).
const path = require("path");

const DRIVER = process.env.DB_DRIVER || "sqlite";

// All datetimes are stored/compared as 'YYYY-MM-DD HH:MM:SS' UTC strings — this format
// is valid for MySQL DATETIME columns and sorts/compares correctly as plain text in
// SQLite (which has no native datetime type), so callers never touch driver-specific date logic.
function toSqlDateTime(date = new Date()) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

const MYSQL_DDL = [
  `CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at VARCHAR(19) NOT NULL
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS access_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    label VARCHAR(128) NULL,
    duration_days INT NOT NULL,
    status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
    created_at VARCHAR(19) NOT NULL,
    activated_at VARCHAR(19) NULL,
    expires_at VARCHAR(19) NULL,
    active_session_token CHAR(64) NULL,
    last_used_at VARCHAR(19) NULL,
    created_by INT NULL,
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token CHAR(64) PRIMARY KEY,
    code_id INT NOT NULL,
    created_at VARCHAR(19) NOT NULL,
    last_activity_at VARCHAR(19) NOT NULL,
    FOREIGN KEY (code_id) REFERENCES access_codes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    token CHAR(64) PRIMARY KEY,
    admin_id INT NOT NULL,
    created_at VARCHAR(19) NOT NULL,
    last_activity_at VARCHAR(19) NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS code_overrides (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code_id INT NOT NULL,
    template_id VARCHAR(64) NOT NULL,
    symbol_key VARCHAR(80) NOT NULL,
    kind ENUM('edit', 'custom', 'hidden') NOT NULL,
    label VARCHAR(128) NULL,
    group_key VARCHAR(16) NULL,
    open_val DOUBLE NULL,
    high_val DOUBLE NULL,
    low_val DOUBLE NULL,
    close_val DOUBLE NULL,
    sort_order INT NOT NULL DEFAULT 0,
    updated_at VARCHAR(19) NOT NULL,
    UNIQUE KEY uniq_code_tpl_symbol (code_id, template_id, symbol_key),
    FOREIGN KEY (code_id) REFERENCES access_codes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
  `CREATE TABLE IF NOT EXISTS code_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code_id INT NOT NULL,
    template_id VARCHAR(64) NOT NULL,
    UNIQUE KEY uniq_code_template (code_id, template_id),
    FOREIGN KEY (code_id) REFERENCES access_codes(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`,
];

const SQLITE_DDL = [
  `CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS access_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    label TEXT NULL,
    duration_days INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
    created_at TEXT NOT NULL,
    activated_at TEXT NULL,
    expires_at TEXT NULL,
    active_session_token TEXT NULL,
    last_used_at TEXT NULL,
    created_by INTEGER NULL REFERENCES admins(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    code_id INTEGER NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    last_activity_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    token TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    last_activity_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS code_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_id INTEGER NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    symbol_key TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('edit', 'custom', 'hidden')),
    label TEXT NULL,
    group_key TEXT NULL,
    open_val REAL NULL,
    high_val REAL NULL,
    low_val REAL NULL,
    close_val REAL NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    UNIQUE (code_id, template_id, symbol_key)
  )`,
  `CREATE TABLE IF NOT EXISTS code_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code_id INTEGER NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
    template_id TEXT NOT NULL,
    UNIQUE (code_id, template_id)
  )`,
];

let impl;

function initMysql() {
  const mysql = require("mysql2/promise");
  const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  });

  const ready = (async () => {
    for (const ddl of MYSQL_DDL) await pool.query(ddl);
  })();

  return {
    ready,
    async get(sql, params = []) {
      const [rows] = await pool.query(sql, params);
      return rows[0] || null;
    },
    async all(sql, params = []) {
      const [rows] = await pool.query(sql, params);
      return rows;
    },
    async run(sql, params = []) {
      const [result] = await pool.query(sql, params);
      return { insertId: result.insertId, changes: result.affectedRows };
    },
  };
}

function initSqlite() {
  // Node's built-in driver (stable since Node 22.5) — no native compile step, so
  // local dev needs nothing beyond `npm install` even without build tools on PATH.
  const { DatabaseSync } = require("node:sqlite");
  const dataDir = path.join(__dirname, "..", "data");
  require("fs").mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, "axiora.db"));
  db.exec("PRAGMA foreign_keys = ON");
  for (const ddl of SQLITE_DDL) db.exec(ddl);

  return {
    ready: Promise.resolve(),
    async get(sql, params = []) {
      return db.prepare(sql).get(...params) || null;
    },
    async all(sql, params = []) {
      return db.prepare(sql).all(...params);
    },
    async run(sql, params = []) {
      const info = db.prepare(sql).run(...params);
      return { insertId: info.lastInsertRowid, changes: info.changes };
    },
  };
}

impl = DRIVER === "mysql" ? initMysql() : initSqlite();

module.exports = {
  driver: DRIVER,
  ready: impl.ready,
  get: impl.get,
  all: impl.all,
  run: impl.run,
  toSqlDateTime,
};
