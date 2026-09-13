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

## Deploying to cPanel (virasaka.com)

1. `cd client && npm run build` — builds the SPA into `server/public/`.
2. In cPanel → MySQL Databases, create a database + user; note the credentials.
3. In cPanel → Setup Node.js App, create an app pointing at the uploaded `server/` folder,
   startup file `index.js`, and set environment variables: `DB_DRIVER=mysql`, `DB_HOST`,
   `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `ADMIN_BOOTSTRAP_USERNAME`, `ADMIN_BOOTSTRAP_PASSWORD`,
   `NODE_ENV=production`. The app creates its tables automatically on first boot.
4. Point a subdomain or subfolder at the app (cPanel's Node.js App screen handles this).
