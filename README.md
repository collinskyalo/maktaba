# Maktaba

Maktaba is an online library platform built for Kenya: search millions of
public-domain and licensed books, view details, read PDFs online, and pay
KSh 5 to download eligible PDFs (M-Pesa via Safaricom Daraja API).

## Status

This repository is being built in phases. **Phase 1 — Folder structure** is
complete. See `docs/Architecture.md` for the running architecture notes.

## Tech Stack

- **Frontend:** HTML5, CSS3, vanilla JavaScript (ES6 modules), mobile-first
- **Backend:** Node.js, Express.js, REST API
- **Database:** PostgreSQL (SQLite for local dev)
- **Auth:** JWT + bcrypt (Google login planned)
- **Payments:** Safaricom Daraja API (STK Push) — architecture only for now,
  no live credentials

## Project Structure

```
maktaba/
├── frontend/     # HTML5 + CSS3 + vanilla JS, mobile-first
├── backend/      # Node.js + Express REST API
├── database/     # SQL schema & seed data
└── docs/         # API, Daraja integration, and architecture docs
```

## Getting Started

```bash
# 1. Database
createdb maktaba
psql maktaba -f database/schema.sql
psql maktaba -f database/seed.sql

# 2. Backend
cd backend
npm install
cp .env.example .env      # set DATABASE_URL to your local Postgres, fill in the rest as needed
npm run dev                # http://localhost:5000

# 3. Frontend
# Open frontend/index.html directly, or serve the folder with any static
# server. frontend/js/api.js points at http://localhost:5000/api by
# default — update API_BASE_URL there once frontend and backend share a
# domain in production.
```

Sample login for the seeded data: `asha@example.com` / `supersecret1`.
Sample admin login (for `admin.html`): `admin@maktaba.co.ke` / `adminpass123`.

## Testing

```bash
cd backend
npm test
```

Runs the Jest + supertest suite against a disposable test database — see
`docs/Testing.md` for setup details.

## Build Phases

1. Folder structure ✅
2. Homepage ✅
3. CSS architecture ✅
4. JavaScript modules ✅
5. Backend API ✅
6. Database ✅
7. Authentication ✅
8. Search integration (Open Library, Project Gutenberg, Google Books, Internet Archive) ✅
9. Book Details ✅
10. Payment architecture (M-Pesa Daraja) ✅
11. Admin panel ✅
12. Testing ✅
13. Deployment ✅ — see `docs/Deployment.md`, `backend/Dockerfile`, `docker-compose.yml`
