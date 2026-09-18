# Maktaba API Documentation

Base URL (local development): `http://localhost:5000/api`

All responses share a common envelope:

```json
{ "success": true, "data": { } }
```
or on failure:
```json
{ "success": false, "error": { "message": "…", "details": [] } }
```

## Auth

### POST /auth/register
Body: `{ "name": string, "email": string, "password": string (min 8 chars) }`
Returns `201` with `{ user, token }`. Rate-limited to 20 requests / 15 min per IP.

### POST /auth/login
Body: `{ "email": string, "password": string }`
Returns `200` with `{ user, token }`. Rate-limited the same as register.

Attach the returned `token` as `Authorization: Bearer <token>` on protected routes below.

### POST /auth/forgot-password
Body: `{ "email": string }`. Always returns `200` with a generic message,
whether or not the email has an account (prevents email enumeration). If
the account exists, a reset link is emailed (currently logged to the
server console — see `services/emailService.js`).

### POST /auth/reset-password
Body: `{ "token": string, "password": string (min 8 chars) }`. The token
is the one from the emailed reset link, valid for 1 hour and single-use.

### POST /auth/google
Placeholder — returns `501` until Google OAuth credentials are configured
(see `services/googleAuthService.js`).

## Books

### GET /books
Query params: `category`, `sort` (`popular` default | `recent` | `rating`/`best`), `page` (default 1), `limit` (default 20).
Returns `{ items: Book[], total, page, limit }`.

### GET /books/search?q=...
Same params as `/books` plus required `q`. Returns
`{ items: Book[], total, page, limit, external: ExternalBook[] }`.
`items` is Maktaba's own catalog (authoritative — these can actually be
read/downloaded here). `external` is merged in from Open Library, Project
Gutenberg, Google Books, and Internet Archive — each entry has
`{ source, title, author, coverUrl, previewUrl, isbn }` and links out to
its original source rather than being hosted by Maktaba. A provider that
is slow, rate-limited, or unreachable is silently dropped rather than
failing the whole request.

### GET /books/:id
Returns a single `Book`, or `404` if not found.

### GET /trending
Query: `limit` (default 10). Returns `Book[]` ranked by the most-read algorithm
(reads + downloads×3 + a recency boost that decays over ~60 days).

### GET /best-books
Query: `limit` (default 10). Returns `Book[]` ranked by `rating`.

## Users

### GET /users/profile
Requires auth. Returns the user's public profile plus their download and
reading history.

## Payments

### POST /payments/stkpush
Requires auth. Body: `{ "phoneNumber": "2547XXXXXXXX", "bookId": number }`.
Amount is fixed server-side at KSh 5. Until Daraja credentials are
configured, returns a `202` with a `mocked: true` response and a
`pending` payment record. With real credentials set, sends a real STK
Push and returns `{ mocked: false, message, payment }` — see
`docs/DarajaIntegration.md`.

### POST /payments/callback
Safaricom → Maktaba. Marks the matching payment `completed`/`failed` and,
on success, unlocks the download. Always responds `200`.

### GET /payments/:id/status
Requires auth (must be the payment's own owner). Returns
`{ status: "pending" | "completed" | "failed", mpesaReceipt? }`. Used to
poll a payment while waiting for the callback.

## Downloads

### GET /books/:id/download
Requires auth. Returns `{ downloadUrl }` if a completed payment exists
for this user + book, otherwise `402 Payment Required`.

## Admin (Phase 11)

Every route below requires auth **and** the logged-in user's `role` to be
`admin` (checked fresh against the database on each request, not cached
in the JWT) — otherwise `403`.

- `GET /admin/analytics` — `{ totalUsers, totalBooks, totalDownloads, totalRevenueKsh, topBooks }`.
- `GET /admin/users` — paginated user list (no password hashes).
- `GET /admin/payments` — paginated payments, joined with user + book info.
- `GET /admin/books` — same shape as `GET /books` but with a higher default limit for a management table.
- `POST /admin/books` — create a book. Body: `{ title, author, category, isbn?, synopsis?, coverUrl?, pdfUrl?, publisher?, pages?, rating?, featured? }`.
- `PUT /admin/books/:id` — update any subset of the same fields (e.g. fixing a broken `pdfUrl`).
- `DELETE /admin/books/:id` — remove a book.

## Errors

`404` — unknown route or resource. `401` — missing/invalid auth token.
`422` — validation failed (see `error.details`). `429` — rate limited.
`500` — unexpected server error (message hidden in production).
