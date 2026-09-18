# Maktaba — Deployment

## Architecture summary

- **Backend**: a stateless Node.js/Express API (`backend/`) — can run
  anywhere that runs a Docker container or a Node process.
- **Database**: PostgreSQL — needs a persistent volume/managed instance.
- **Frontend**: static HTML/CSS/JS (`frontend/`) — no build step, no
  server-side rendering. Can be hosted anywhere that serves static files.

Because the frontend is fully static and the backend is a stateless API,
they don't need to live on the same host — this matters for Kenya-based
traffic specifically: put the frontend on a CDN with an edge PoP in or
near Kenya (Cloudflare Pages, Netlify, Vercel — all have African/EU edge
locations that are meaningfully closer than serving everything from a
single US region), and keep the API + database physically close together
in the same region regardless of where that region is, since that
connection is far more latency-sensitive than the one to the API from a
browser.

## Recommended hosting

| Piece | Good fit | Why |
|---|---|---|
| Backend | Render, Railway, Fly.io, or a small VPS + the provided `Dockerfile` | All support Docker deploys, managed env vars, and zero-downtime restarts without needing your own orchestration |
| Database | Render/Railway managed Postgres, or Neon/Supabase | Automatic backups, connection pooling, easier than self-managing Postgres |
| Frontend | Cloudflare Pages, Netlify, or Vercel | Free tier, global CDN, trivial to point a custom domain at |

## Environment checklist

Before deploying, make sure every variable in `backend/.env.example` is
set for the target environment — especially:

- [ ] `DATABASE_URL` — the production Postgres connection string
- [ ] `JWT_SECRET` — a long, random value (not the dev default in `config/env.js`)
- [ ] `FRONTEND_URL` — the deployed frontend's exact origin(s), comma-separated if more than one (`https://maktaba.co.ke,https://www.maktaba.co.ke`). Leaving this unset makes CORS allow any origin — fine for local development, **not for production**.
- [ ] `MPESA_*` — real Daraja credentials once you're out of sandbox (see `docs/DarajaIntegration.md`); `MPESA_CALLBACK_URL` must be the production API's public HTTPS URL
- [ ] `GOOGLE_BOOKS_API_KEY` — optional, but Google Books search silently no-ops without it (see `services/searchService.js`)
- [ ] `frontend/js/api.js`'s `API_BASE_URL` — update from `http://localhost:5000/api` to the deployed API's URL (e.g. `https://api.maktaba.co.ke/api`, or `/api` if frontend and backend share a domain behind a reverse proxy)

## Database setup on a fresh environment

```bash
psql "$DATABASE_URL" -f database/schema.sql
psql "$DATABASE_URL" -f database/seed.sql   # optional — sample data, skip in production
```

`schema.sql` is written with `IF NOT EXISTS` throughout, so re-running it
against an already-migrated database is safe (it won't duplicate tables
or columns). There's no formal migration tool yet — for a project this
size, hand-applying schema changes with the same `IF NOT EXISTS` pattern
used throughout `schema.sql` is fine; a tool like `node-pg-migrate` is
worth adopting once schema changes get more frequent or more than one
person is deploying.

## Deploying the backend with Docker

```bash
cd backend
docker build -t maktaba-backend .
docker run -p 5000:5000 --env-file .env maktaba-backend
```

Or use the provided `docker-compose.yml` at the project root for a full
local stack (Postgres + backend) with one command:

```bash
JWT_SECRET=$(openssl rand -hex 32) docker compose up --build
```

## Deploying the frontend

No build step — `frontend/` can be deployed as-is to any static host.
Two things to update first:
1. `frontend/js/api.js`'s `API_BASE_URL` (see checklist above).
2. If serving frontend and backend from the same domain in production
   (recommended — avoids CORS entirely), put a reverse proxy in front
   that routes `/api/*` to the backend and everything else to the static
   files, and set `API_BASE_URL = '/api'`.

## Zero-downtime / rollback notes

- The backend is stateless — safe to run multiple instances behind a
  load balancer, and safe to restart/redeploy without any in-memory
  state loss (all state lives in Postgres).
- Keep the previous Docker image tag around after each deploy so a bad
  release can be rolled back by re-pointing to it, rather than rebuilding.
- Run `npm test` (see `docs/Testing.md`) — and the CI workflow at
  `.github/workflows/ci.yml` does this automatically on every push/PR —
  before promoting a build to production.

## Monitoring

Nothing beyond `morgan` request logging and the `/health` endpoint is
wired up yet. Before going live with real payments, at minimum add:
- Uptime monitoring on `GET /health`.
- Error tracking (e.g. Sentry) — `middleware/errorHandler.js` is the one
  place to add this that covers every route.
- A log drain for the container's stdout (most of the hosts above
  provide this built-in).
