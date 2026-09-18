-- Maktaba — database/schema.sql
-- PostgreSQL schema. Run against a fresh database, e.g.:
--   psql "$DATABASE_URL" -f database/schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ---------------------------------------------------------------------------
-- books
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(300) NOT NULL,
  author      VARCHAR(200) NOT NULL,
  isbn        VARCHAR(20),
  synopsis    TEXT,
  cover_url   TEXT,
  pdf_url     TEXT,
  category    VARCHAR(60) NOT NULL,
  language    VARCHAR(60) NOT NULL DEFAULT 'English',
  publisher   VARCHAR(200),
  pages       INTEGER,
  rating      NUMERIC(2,1) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  reads       INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_books_category ON books (category);
CREATE INDEX IF NOT EXISTS idx_books_created_at ON books (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_books_rating ON books (rating DESC);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books (isbn);
-- Full-text search across title/author, used by GET /api/books/search
CREATE INDEX IF NOT EXISTS idx_books_search
  ON books USING GIN (to_tsvector('english', title || ' ' || author));

-- ---------------------------------------------------------------------------
-- payments  (created before downloads: a download references a payment)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount           NUMERIC(10,2) NOT NULL,
  mpesa_receipt    VARCHAR(60),
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

-- ---------------------------------------------------------------------------
-- downloads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS downloads (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id       INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  payment_id    INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads (user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_book ON downloads (book_id);

-- ---------------------------------------------------------------------------
-- reading_history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reading_history (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id   INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  read_time INTEGER NOT NULL DEFAULT 0 -- seconds spent reading, this session
);

CREATE INDEX IF NOT EXISTS idx_reading_history_user ON reading_history (user_id);
CREATE INDEX IF NOT EXISTS idx_reading_history_book ON reading_history (book_id);

-- ---------------------------------------------------------------------------
-- Most Read Algorithm support view
-- Mirrors models/Book.js's popularityScore(): reads + downloads*3 + a
-- recency boost that decays to 0 after 60 days. Kept as a view so both the
-- app and ad-hoc reporting use the same definition.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW book_popularity AS
SELECT
  b.id,
  b.reads,
  COUNT(d.id) AS download_count,
  GREATEST(0, 60 - EXTRACT(DAY FROM now() - b.created_at)) * 50 AS recency_boost,
  b.reads + COUNT(d.id) * 3
    + GREATEST(0, 60 - EXTRACT(DAY FROM now() - b.created_at)) * 50 AS popularity_score
FROM books b
LEFT JOIN downloads d ON d.book_id = b.id
GROUP BY b.id;

-- ---------------------------------------------------------------------------
-- password_resets (Phase 7 — Authentication: forgot/reset password)
-- Only the SHA-256 hash of the reset token is stored, never the raw token.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_resets (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets (user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON password_resets (token_hash);

-- ---------------------------------------------------------------------------
-- payments: Phase 10 additions — link a payment to the book it's for, and
-- to Safaricom's own IDs so the callback (see docs/DarajaIntegration.md)
-- can find the right payment to update.
-- ---------------------------------------------------------------------------
ALTER TABLE payments ADD COLUMN IF NOT EXISTS book_id INTEGER REFERENCES books(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(60);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS merchant_request_id VARCHAR(60);

CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id ON payments (checkout_request_id);

-- ---------------------------------------------------------------------------
-- Phase 11 — Admin panel additions
-- ---------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin'));

ALTER TABLE books ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_books_featured ON books (featured) WHERE featured = true;
