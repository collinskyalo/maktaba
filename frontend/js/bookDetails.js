/**
 * Maktaba — js/bookDetails.js
 * Entry point for book-details.html: fetches the book from GET
 * /api/books/:id, renders its full details, and wires up "Read Online"
 * / "Download for KSh 5" (which opens the M-Pesa STK Push modal from
 * Phase 5/10's payment architecture).
 */

import { fetchBookById, initiateStkPush, fetchPaymentStatus, fetchDownloadLink } from './api.js';
import { coverColorFor } from './books.js';
import { getSession, renderAuthState } from './auth.js';

function getBookIdFromUrl() {
  return new URLSearchParams(window.location.search).get('id');
}

function starIcon() {
  return '<svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" style="color:var(--color-gold); vertical-align:-2px;"><path d="M10 1.5l2.6 5.5 6 .7-4.4 4.1 1.2 6-5.4-3-5.4 3 1.2-6L1.4 7.7l6-.7z"/></svg>';
}

function metaRow(label, value) {
  if (!value) return '';
  return `<dt>${label}</dt><dd>${value}</dd>`;
}

function renderBook(book) {
  document.title = `${book.title} — Maktaba`;

  const layout = document.getElementById('detailLayout');
  const coverStyle = book.cover_url
    ? `background-image:url('${book.cover_url}'); background-size:cover; background-position:center;`
    : `background:${coverColorFor(book)};`;

  const canReadOnline = Boolean(book.pdf_url);
  const alreadyOwned = false; // TODO (Phase 11/dashboard): check the logged-in user's download history

  layout.innerHTML = `
    <div class="detail-cover-col">
      <div class="cover" style="${coverStyle}">${book.cover_url ? '' : `<span>${book.title}</span>`}</div>
      <div class="detail-actions">
        <button type="button" class="btn btn--primary btn--block" id="readOnlineBtn" ${canReadOnline ? '' : 'disabled'}>
          ${canReadOnline ? 'Read online' : 'Preview not available'}
        </button>
        <button type="button" class="btn btn--gold btn--block" id="downloadBtn">
          ${alreadyOwned ? 'Download PDF' : 'Download for KSh 5'}
        </button>
      </div>
    </div>

    <div class="detail-info">
      <h1>${book.title}</h1>
      <p class="detail-author">by ${book.author}</p>

      <div class="detail-badges">
        <span class="detail-badge">${book.category}</span>
        ${book.rating ? `<span class="detail-badge detail-badge--gold">${starIcon()} ${Number(book.rating).toFixed(1)}</span>` : ''}
        ${book.reads ? `<span class="detail-badge">${Number(book.reads).toLocaleString()} readers</span>` : ''}
      </div>

      <dl class="detail-meta-grid">
        ${metaRow('Publisher', book.publisher)}
        ${metaRow('Published', book.created_at ? new Date(book.created_at).getFullYear() : null)}
        ${metaRow('Language', book.language)}
        ${metaRow('ISBN', book.isbn)}
        ${metaRow('Pages', book.pages)}
        ${metaRow('Category', book.category)}
      </dl>

      <div class="detail-synopsis">
        <h2>Synopsis</h2>
        <p>${book.synopsis || 'No synopsis available for this book yet.'}</p>
      </div>
    </div>
  `;

  document.getElementById('readOnlineBtn').addEventListener('click', () => {
    if (canReadOnline) window.open(book.pdf_url, '_blank', 'noopener');
  });

  document.getElementById('downloadBtn').addEventListener('click', () => openPaymentModal(book));
}

function openPaymentModal(book) {
  const session = getSession();
  if (!session) {
    window.location.href = `login.html?next=${encodeURIComponent(window.location.href)}`;
    return;
  }

  const modal = document.getElementById('paymentModal');
  const message = document.getElementById('paymentMessage');
  message.className = 'form-message';
  message.textContent = '';
  modal.hidden = false;

  const form = document.getElementById('paymentForm');
  const submitBtn = document.getElementById('paymentSubmitBtn');

  form.onsubmit = async (e) => {
    e.preventDefault();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    if (!/^2547\d{8}$/.test(phoneNumber)) {
      message.textContent = 'Enter a valid Safaricom number, e.g. 254712345678.';
      message.className = 'form-message is-visible form-message--error';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
    try {
      const result = await initiateStkPush({ phoneNumber, bookId: book.id });

      if (result.mocked) {
        // No real Daraja connection in this environment — nothing will ever
        // move this payment past "pending" on its own. Say so plainly
        // rather than polling forever. See services/darajaService.js.
        message.textContent = 'STK Push simulated (Daraja isn\'t connected yet in this environment) — payment recorded as pending.';
        message.className = 'form-message is-visible form-message--success';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send STK Push';
        return;
      }

      message.textContent = result.message || 'Check your phone to complete the M-Pesa payment.';
      message.className = 'form-message is-visible form-message--success';
      submitBtn.textContent = 'Waiting for payment…';
      await pollPaymentStatus(result.payment.id, book, message);
    } catch (err) {
      message.textContent = err.message;
      message.className = 'form-message is-visible form-message--error';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send STK Push';
    }
  };
}

/** Polls a real (non-mocked) payment until Safaricom's callback marks it done, then downloads. */
async function pollPaymentStatus(paymentId, book, message, attempt = 0) {
  if (attempt >= 10) {
    message.textContent = 'Still waiting on M-Pesa — check back in a moment.';
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const { status } = await fetchPaymentStatus(paymentId);
  if (status === 'completed') {
    message.textContent = 'Payment confirmed — starting your download.';
    const { downloadUrl } = await fetchDownloadLink(book.id);
    window.open(downloadUrl, '_blank', 'noopener');
    document.getElementById('paymentModal').hidden = true;
    return;
  }
  if (status === 'failed') {
    message.textContent = 'The payment failed or was cancelled. Please try again.';
    message.className = 'form-message is-visible form-message--error';
    return;
  }
  return pollPaymentStatus(paymentId, book, message, attempt + 1);
}

function initModalClose() {
  const modal = document.getElementById('paymentModal');
  document.getElementById('paymentModalClose').addEventListener('click', () => { modal.hidden = true; });
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
}

function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('mobileNav');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initMobileNav();
  initModalClose();
  renderAuthState();

  const id = getBookIdFromUrl();
  if (!id) {
    document.getElementById('detailLayout').hidden = true;
    document.getElementById('notFoundMessage').hidden = false;
    return;
  }

  try {
    const book = await fetchBookById(id);
    renderBook(book);
  } catch (err) {
    document.getElementById('detailLayout').hidden = true;
    document.getElementById('notFoundMessage').hidden = false;
  }
});
