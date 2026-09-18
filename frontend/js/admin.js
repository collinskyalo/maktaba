/**
 * Maktaba — js/admin.js
 * Entry point for admin.html. Checks the logged-in user is an admin
 * (via GET /api/users/profile), then loads analytics, books, users, and
 * payments, and wires up the add/edit/delete book form.
 */

import { fetchProfile } from './api.js';
import {
  fetchAdminAnalytics, fetchAdminUsers, fetchAdminPayments, fetchAdminBooks,
  createAdminBook, updateAdminBook, deleteAdminBook,
} from './api.js';
import { getSession } from './auth.js';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function money(n) {
  return `KSh ${Number(n).toLocaleString()}`;
}

// --- Tabs -------------------------------------------------------------

function initTabs() {
  document.querySelectorAll('.admin-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.admin-tab').forEach((t) => t.classList.remove('is-active'));
      document.querySelectorAll('.admin-panel').forEach((p) => p.classList.remove('is-active'));
      tab.classList.add('is-active');
      document.getElementById(tab.dataset.panel).classList.add('is-active');
    });
  });
}

// --- Analytics ----------------------------------------------------------

async function loadStats() {
  const grid = document.getElementById('statsGrid');
  try {
    const stats = await fetchAdminAnalytics();
    grid.innerHTML = `
      <div class="stat-card"><div class="stat-card__value">${stats.totalUsers}</div><div class="stat-card__label">Users</div></div>
      <div class="stat-card"><div class="stat-card__value">${stats.totalBooks}</div><div class="stat-card__label">Books</div></div>
      <div class="stat-card"><div class="stat-card__value">${stats.totalDownloads}</div><div class="stat-card__label">Downloads</div></div>
      <div class="stat-card"><div class="stat-card__value">${money(stats.totalRevenueKsh)}</div><div class="stat-card__label">Revenue</div></div>
    `;
  } catch (err) {
    grid.innerHTML = `<p class="results-empty">Couldn't load analytics: ${escapeHtml(err.message)}</p>`;
  }
}

// --- Books ----------------------------------------------------------------

let booksCache = [];

async function loadBooks() {
  const body = document.getElementById('booksTableBody');
  try {
    const { items, total } = await fetchAdminBooks({ limit: 100 });
    booksCache = items;
    document.getElementById('booksCount').textContent = `${total} books`;
    body.innerHTML = items.map((b) => `
      <tr>
        <td>${escapeHtml(b.title)}</td>
        <td>${escapeHtml(b.author)}</td>
        <td>${escapeHtml(b.category)}</td>
        <td>${Number(b.rating).toFixed(1)}</td>
        <td>${b.featured ? '<span class="admin-badge admin-badge--featured">Featured</span>' : ''}</td>
        <td>${b.pdf_url ? '✅' : '<span style="color:var(--color-danger)">Missing</span>'}</td>
        <td class="admin-row-actions">
          <button data-edit="${b.id}">Edit</button>
          <button data-delete="${b.id}" class="danger">Delete</button>
        </td>
      </tr>
    `).join('');

    body.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => openBookForm(booksCache.find((b) => String(b.id) === btn.dataset.edit)));
    });
    body.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', () => onDeleteBook(btn.dataset.delete));
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="7">Couldn't load books: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function openBookForm(book = null) {
  const form = document.getElementById('bookForm');
  form.hidden = false;
  document.getElementById('bookId').value = book?.id || '';
  document.getElementById('bookTitle').value = book?.title || '';
  document.getElementById('bookAuthor').value = book?.author || '';
  document.getElementById('bookCategory').value = book?.category || '';
  document.getElementById('bookIsbn').value = book?.isbn || '';
  document.getElementById('bookPublisher').value = book?.publisher || '';
  document.getElementById('bookPages').value = book?.pages || '';
  document.getElementById('bookRating').value = book?.rating || '';
  document.getElementById('bookPdfUrl').value = book?.pdf_url || '';
  document.getElementById('bookCoverUrl').value = book?.cover_url || '';
  document.getElementById('bookFeatured').value = String(Boolean(book?.featured));
  document.getElementById('bookSynopsis').value = book?.synopsis || '';
  document.getElementById('bookFormSubmit').textContent = book ? 'Save changes' : 'Add book';
  document.getElementById('bookForm').scrollIntoView({ behavior: 'smooth' });
}

function closeBookForm() {
  document.getElementById('bookForm').hidden = true;
  document.getElementById('bookForm').reset();
}

async function onSubmitBookForm(e) {
  e.preventDefault();
  const id = document.getElementById('bookId').value;
  const message = document.getElementById('bookFormMessage');

  const payload = {
    title: document.getElementById('bookTitle').value.trim(),
    author: document.getElementById('bookAuthor').value.trim(),
    category: document.getElementById('bookCategory').value.trim(),
    isbn: document.getElementById('bookIsbn').value.trim() || undefined,
    publisher: document.getElementById('bookPublisher').value.trim() || undefined,
    pages: document.getElementById('bookPages').value ? Number(document.getElementById('bookPages').value) : undefined,
    rating: document.getElementById('bookRating').value ? Number(document.getElementById('bookRating').value) : undefined,
    pdfUrl: document.getElementById('bookPdfUrl').value.trim() || undefined,
    coverUrl: document.getElementById('bookCoverUrl').value.trim() || undefined,
    featured: document.getElementById('bookFeatured').value === 'true',
    synopsis: document.getElementById('bookSynopsis').value.trim() || undefined,
  };

  try {
    if (id) {
      await updateAdminBook(id, payload);
    } else {
      await createAdminBook(payload);
    }
    closeBookForm();
    await Promise.all([loadBooks(), loadStats()]);
  } catch (err) {
    message.textContent = err.message;
    message.className = 'form-message is-visible form-message--error';
  }
}

async function onDeleteBook(id) {
  if (!confirm('Delete this book? This cannot be undone.')) return;
  try {
    await deleteAdminBook(id);
    await Promise.all([loadBooks(), loadStats()]);
  } catch (err) {
    alert(`Couldn't delete book: ${err.message}`);
  }
}

// --- Users & payments (read-only) ------------------------------------------

async function loadUsers() {
  const body = document.getElementById('usersTableBody');
  try {
    const { items, total } = await fetchAdminUsers({ limit: 100 });
    document.getElementById('usersCount').textContent = `${total} users`;
    body.innerHTML = items.map((u) => `
      <tr>
        <td>${escapeHtml(u.name)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.role)}</td>
        <td>${new Date(u.created_at).toLocaleDateString()}</td>
      </tr>
    `).join('');
  } catch (err) {
    body.innerHTML = `<tr><td colspan="4">Couldn't load users: ${escapeHtml(err.message)}</td></tr>`;
  }
}

async function loadPayments() {
  const body = document.getElementById('paymentsTableBody');
  try {
    const { items, total } = await fetchAdminPayments({ limit: 100 });
    document.getElementById('paymentsCount').textContent = `${total} payments`;
    body.innerHTML = items.map((p) => `
      <tr>
        <td>${escapeHtml(p.user_name)}<br><span style="color:var(--color-charcoal-soft); font-size:0.8em;">${escapeHtml(p.user_email)}</span></td>
        <td>${escapeHtml(p.book_title || '—')}</td>
        <td>${money(p.amount)}</td>
        <td><span class="admin-badge admin-badge--${p.status}">${p.status}</span></td>
        <td>${escapeHtml(p.mpesa_receipt || '—')}</td>
        <td>${new Date(p.transaction_date).toLocaleString()}</td>
      </tr>
    `).join('');
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6">Couldn't load payments: ${escapeHtml(err.message)}</td></tr>`;
  }
}

// --- Bootstrap -----------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  const session = getSession();
  if (!session) {
    document.getElementById('accessDenied').hidden = false;
    return;
  }

  try {
    const profile = await fetchProfile();
    if (profile.role !== 'admin') {
      document.getElementById('accessDenied').hidden = false;
      return;
    }
  } catch (err) {
    document.getElementById('accessDenied').hidden = false;
    return;
  }

  document.getElementById('adminContent').hidden = false;
  initTabs();

  document.getElementById('newBookBtn').addEventListener('click', () => openBookForm(null));
  document.getElementById('bookFormCancel').addEventListener('click', closeBookForm);
  document.getElementById('bookForm').addEventListener('submit', onSubmitBookForm);

  loadStats();
  loadBooks();
  loadUsers();
  loadPayments();
});
