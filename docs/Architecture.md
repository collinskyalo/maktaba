# Maktaba — Architecture Overview

## Data flow

```
frontend (HTML/CSS/vanilla JS)
        │  fetch()
        ▼
backend/server.js  →  routes/  →  controllers/  →  services/  →  models/
                                                                    │
                                                                    ▼
                                                        PostgreSQL (database/schema.sql)
```

- **routes/** only wire an HTTP verb + path to a controller function.
- **controllers/** parse the request, call a service, shape the HTTP response.
- **services/** hold business logic (e.g. merging external book providers in Phase 8,
  or building the Daraja STK Push request in Phase 10) — controllers stay thin.
- **models/** are the only files that talk to PostgreSQL directly (`config/db.js`).

## Database

See `database/schema.sql` for the full schema and `database/seed.sql` for
sample data. Five tables — `users`, `books`, `payments`, `downloads`,
`reading_history` — plus a `book_popularity` view that implements the
brief's Most Read Algorithm (`reads + downloads*3 + a 60-day recency boost`)
in one place so both the API and any future reporting query agree on it.

## Payments

`services/darajaService.js` is the single seam between Maktaba and
Safaricom. No other file constructs Daraja requests. Until real
credentials exist, it records a `pending` payment and returns a
labeled mock response — see `docs/DarajaIntegration.md`.

## Why in-memory, then Postgres

Phases 2–5 used in-memory arrays inside the model files so the frontend
and API were usable before a database existed. Phase 6 replaced those
same files with real `pg` queries without changing any controller, route,
or frontend code — the model function signatures never changed.
