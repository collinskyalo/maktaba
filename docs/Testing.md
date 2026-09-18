# Maktaba — Testing

Backend tests use **Jest** + **supertest** and run against a real,
disposable PostgreSQL database (not mocks) — the same schema and seed
data described in `database/schema.sql` / `database/seed.sql`.

## Setup

```bash
cd backend
npm install
```

Set `TEST_DATABASE_URL` in `backend/.env` (see `.env.example`) to a
Postgres connection string. **This database is dropped and recreated on
every test run** — never point it at development or production data.

```
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/maktaba_test
```

## Running

```bash
npm test
```

What happens:
1. `tests/globalSetup.js` runs once: drops/recreates the test database,
   then loads `database/schema.sql` and `database/seed.sql` into it.
2. `tests/jest.setup.js` runs before each test file: points
   `config/db.js` at the test database (via `DATABASE_URL`) and sets a
   fixed `JWT_SECRET`, before `server.js` is required.
3. Each test file imports the Express `app` from `server.js` directly
   (no port is bound — see the `require.main === module` guard at the
   bottom of `server.js`) and drives it with `supertest`.

## What's covered

- `tests/auth.test.js` — register (success, duplicate email, validation), login (success, wrong password, unknown email).
- `tests/books.test.js` — list, filter by category, get by id, 404 handling, search (including the `external` array from Phase 8), trending, best-books ordering.
- `tests/payments.test.js` — auth requirement, phone validation, the mocked STK Push response, and the full callback → download-unlock chain from Phase 10 (simulated with a real Safaricom-shaped payload).
- `tests/admin.test.js` — the `requireAdmin` guard (401/403/200) and book create/update/delete.

## What's not covered yet

- The real Daraja sandbox itself (network-restricted in some CI
  environments — see `services/darajaService.js`'s comments).
- Frontend JS (no test runner wired up for `frontend/js/*.js` yet).
- Rate limiting behavior under load.
