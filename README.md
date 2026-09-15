# Axiora

Trading-level calculator web app, by Virasaka. Ports the OHLC → trade-level formulas from
`90 XL VIEW 3..xlsx` into a hosted app: clients edit OPEN/HIGH/LOW/CLOSE and see every
derived value recompute server-side (the formulas never reach the browser); an admin issues
time-limited access codes to clients.

## Structure

- `server/` — Express API, formula engine (`server/templates/`), auth, MySQL/SQLite data layer.
- `client/` — React (Vite) frontend: client login + calculator, admin login + dashboard.

## Local development

```bash
# terminal 1 — API (SQLite auto-created at server/data/axiora.db, no setup needed)
cd server
cp .env.example .env   # edit ADMIN_BOOTSTRAP_USERNAME/PASSWORD if you want different defaults
npm install
npm run dev             # http://localhost:4000

# terminal 2 — frontend
cd client
npm install
npm run dev              # http://localhost:5173 (proxies /api to :4000)
```

Open http://localhost:5173/admin/login with the bootstrap admin credentials from `server/.env`
to generate access codes; open http://localhost:5173/login as a client to use a code.

## Adding another calculator template

Drop a new file in `server/templates/` shaped like `90xl-view-3.js` (`{ id, name, symbols,
calculate }`) and register it in `server/templates/index.js`. It will automatically appear as
a new tab in the client UI — no other code changes needed.

## Deploying to GoDaddy cPanel (axiora.virasaka.com)

GoDaddy's hosting dashboard uses its own PaaS-style "Node.js Apps" panel (Add App → zip
upload) rather than the classic cPanel "Setup Node.js App" screen — the steps below match
that flow.

1. `cd client && npm run build` — builds the SPA straight into `server/public/` (see
   `client/vite.config.js`'s `build.outDir`), so the Express server can serve it as a static
   SPA alongside the API.
2. Zip the **contents** of `server/` (not the folder itself), excluding `node_modules/` and
   `data/` (local-only SQLite dev data) — include `index.js`, `package.json`,
   `package-lock.json`, `db/`, `lib/`, `middleware/`, `routes/`, `templates/`, and the built
   `public/`.
3. In cPanel → **MySQL® Databases**, create a database + user and grant the user All
   Privileges on it. Note the exact database name and username shown in "Current Databases" —
   GoDaddy may or may not prefix the database name with the account username, but it always
   prefixes the DB user.
4. In cPanel → **Domains**, create the subdomain the app will live on (e.g. `axiora` under
   `virasaka.com` → `axiora.virasaka.com`). Leave "Share document root" unchecked; the default
   document root is fine since the Node app doesn't actually serve from it.
5. From the GoDaddy hosting dashboard → **Node.js Apps** → **Add App** → **Upload a zip**,
   upload the zip from step 2. When asked "Does your app need secrets?", choose **Yes** and
   add:
   - `DB_DRIVER=mysql`
   - `DB_HOST=localhost`
   - `DB_USER` / `DB_PASSWORD` / `DB_NAME` — from step 3
   - `ADMIN_BOOTSTRAP_USERNAME` / `ADMIN_BOOTSTRAP_PASSWORD` — becomes the first admin login
   - Skip `NODE_ENV` — it's a reserved key the platform sets itself.

   The app creates its own tables automatically on first boot; check **Logs** for
   `[axiora] server listening on :<port> (db driver: mysql)` to confirm it started cleanly.
6. Click **Publish to Live** on the app's Overview page, syncing secrets when prompted.
7. In the app's **Settings → Domains → External Domain**, enter the subdomain from step 4
   (e.g. `axiora.virasaka.com`) and click **Connect** — GoDaddy handles DNS + TLS
   automatically when the domain is on the same GoDaddy account. Wait for "Your domain is
   connected to your app".
8. Verify end-to-end: open the domain, log into `/admin/login` with the bootstrap admin
   credentials, generate an access code, then confirm it works at `/login` as a client.

Never commit database credentials or admin passwords to this repo — keep them only in the
Node app's Secrets screen.
