/**
 * Maktaba — js/api.js
 * Central place for talking to the backend. As of Phase 8, book data is
 * real (categories, trending, best-books, recently-added, browse, and
 * search all hit the live API) — nothing here is mocked anymore.
 */

// In production (see deploy/nginx.conf), nginx proxies /api/* to the
// backend container, so the frontend can just call a same-origin '/api'.
// Locally, frontend and backend run on different ports, so default to
// the backend's dev port. Override by setting window.MAKTABA_API_BASE_URL
// before this script loads (e.g. from a small inline <script> in each
// HTML file) if your setup differs from both of these.
const API_BASE_URL = window.MAKTABA_API_BASE_URL
  || (['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:5000/api' : '/api');

/**
 * Thin wrapper around fetch() for JSON APIs. Attaches the stored JWT
 * (if any) as a Bearer token when { auth: true } is passed, and throws a
 * normal Error with the server's message on non-2xx responses so callers
 * can catch() it.
 */
async function request(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('maktaba_token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = payload?.error?.message || `Request failed with status ${res.status}`;
    const details = payload?.error?.details;
    throw new Error(details && details.length ? details.join(' ') : message);
  }

  return payload.data;
}

function toQueryString(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

// --- Auth (Phase 7) -------------------------------------------------------

export function registerUser({ name, email, password }) {
  return request('/auth/register', { method: 'POST', body: { name, email, password } });
}

export function loginUser({ email, password }) {
  return request('/auth/login', { method: 'POST', body: { email, password } });
}

export function requestPasswordReset({ email }) {
  return request('/auth/forgot-password', { method: 'POST', body: { email } });
}

export function fetchProfile() {
  return request('/users/profile', { auth: true });
}

/** POST /api/payments/stkpush — requires auth. See docs/DarajaIntegration.md. */
export function initiateStkPush({ phoneNumber, bookId }) {
  return request('/payments/stkpush', { method: 'POST', body: { phoneNumber, bookId }, auth: true });
}

/** GET /api/payments/:id/status — requires auth. Used to poll a pending STK Push. */
export function fetchPaymentStatus(paymentId) {
  return request(`/payments/${paymentId}/status`, { auth: true });
}

/** GET /api/books/:id/download — requires auth + a completed payment for this book. */
export function fetchDownloadLink(bookId) {
  return request(`/books/${bookId}/download`, { auth: true });
}

// --- Admin (Phase 11) — all require an admin-role auth token -------------

export function fetchAdminAnalytics() {
  return request('/admin/analytics', { auth: true });
}

export function fetchAdminUsers(params = {}) {
  return request(`/admin/users${toQueryString(params)}`, { auth: true });
}

export function fetchAdminPayments(params = {}) {
  return request(`/admin/payments${toQueryString(params)}`, { auth: true });
}

export function fetchAdminBooks(params = {}) {
  return request(`/admin/books${toQueryString(params)}`, { auth: true });
}

export function createAdminBook(book) {
  return request('/admin/books', { method: 'POST', body: book, auth: true });
}

export function updateAdminBook(id, book) {
  return request(`/admin/books/${id}`, { method: 'PUT', body: book, auth: true });
}

export function deleteAdminBook(id) {
  return request(`/admin/books/${id}`, { method: 'DELETE', auth: true });
}

// --- Books (Phase 8) -------------------------------------------------------

/** The 10 fixed categories shown on the homepage and in the browse filter. */
const CATEGORIES = [
  { slug: 'technology', label: 'Technology', icon: 'technology' },
  { slug: 'business', label: 'Business', icon: 'business' },
  { slug: 'finance', label: 'Finance', icon: 'finance' },
  { slug: 'education', label: 'Education', icon: 'education' },
  { slug: 'fiction', label: 'Fiction', icon: 'fiction' },
  { slug: 'religion', label: 'Religion', icon: 'religion' },
  { slug: 'history', label: 'History', icon: 'history' },
  { slug: 'science', label: 'Science', icon: 'science' },
  { slug: 'self-improvement', label: 'Self improvement', icon: 'self-improvement' },
  { slug: 'childrens-books', label: "Children's books", icon: 'childrens' },
];

/** Fixed list, no backend call needed. */
export async function getCategories() {
  return CATEGORIES;
}

/** GET /api/books — used by books.html's browse/filter grid. */
export function fetchBooks({ category, sort, page, limit, q } = {}) {
  return request(`/books${toQueryString({ category, sort, page, limit, q })}`);
}

/** GET /api/books/search — same shape as fetchBooks() plus an `external` array. */
export function searchBooks({ q, category, sort, page, limit } = {}) {
  return request(`/books/search${toQueryString({ q, category, sort, page, limit })}`);
}

/** GET /api/books/:id */
export function fetchBookById(id) {
  return request(`/books/${id}`);
}

/** POST /api/payments/stkpush — requires auth. amount is fixed server-side at KSh 5. */
export function initiateStkPush({ phoneNumber, bookId }) {
  return request('/payments/stkpush', { method: 'POST', body: { phoneNumber, bookId }, auth: true });
}

/** GET /api/trending — homepage "Most read right now" carousel. */
export function fetchTrending(limit = 10) {
  return request(`/trending${toQueryString({ limit })}`);
}

/** GET /api/best-books — homepage + books.html "Best books" section. */
export function fetchBestBooks(limit = 10) {
  return request(`/best-books${toQueryString({ limit })}`);
}

/** GET /api/books?sort=recent — homepage "Recently added" grid. */
export async function fetchRecentlyAdded(limit = 10) {
  const { items } = await fetchBooks({ sort: 'recent', limit });
  return items;
}

export { request };
