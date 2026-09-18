/**
 * Maktaba — js/payment.js
 * Entry point for payment.html: loads the book being purchased,
 * requires login, and initiates the KSh 5 M-Pesa STK Push via
 * POST /api/payments/stkpush. Until Phase 10 connects real Daraja
 * credentials, the backend returns a clearly-labeled mocked/pending
 * response — this page shows that honestly rather than pretending the
 * payment completed.
 */

import { fetchBookById, initiateStkPush } from './api.js';
import { coverColorFor } from './books.js';
import { getSession } from './auth.js';

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return { bookId: params.get('bookId'), title: params.get('title') };
}

function showMessage(text, kind = 'error') {
  const el = document.getElementById('formMessage');
  el.textContent = text;
  el.className = `form-message is-visible form-message--${kind}`;
}

function showStatus(text, kind = 'success') {
  const el = document.getElementById('paymentStatus');
  el.textContent = text;
  el.className = `payment-status is-visible payment-status--${kind === 'success' ? '' : 'error'}`.trim();
}

function validatePhone(phone) {
  return /^2547\d{8}$/.test(phone);
}

document.addEventListener('DOMContentLoaded', async () => {
  const { bookId, title } = getParams();
  const session = getSession();

  if (!bookId) {
    showMessage('No book was specified for this payment.');
    return;
  }

  if (!session) {
    window.location.href = `login.html?redirect=payment.html?bookId=${bookId}&title=${encodeURIComponent(title || '')}`;
    return;
  }

  // Show the title immediately from the URL param (fast paint), then
  // confirm/replace it with the real record and matching cover color.
  if (title) document.getElementById('paymentBookTitle').textContent = title;
  try {
    const book = await fetchBookById(bookId);
    document.getElementById('paymentBookTitle').textContent = book.title;
    document.getElementById('paymentCover').style.background = coverColorFor(book);
  } catch (err) {
    document.getElementById('paymentBookTitle').textContent = title || 'This book';
  }

  const form = document.getElementById('paymentForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phoneInput = document.getElementById('phone');
    const phone = phoneInput.value.trim();
    document.getElementById('phoneError').classList.remove('is-visible');

    if (!validatePhone(phone)) {
      const err = document.getElementById('phoneError');
      err.textContent = 'Enter a Safaricom number as 2547XXXXXXXX.';
      err.classList.add('is-visible');
      return;
    }

    const button = document.getElementById('submitBtn');
    button.disabled = true;
    button.textContent = 'Sending request…';

    try {
      const result = await initiateStkPush({ phoneNumber: phone, bookId });
      if (result.mocked) {
        showStatus(
          `STK Push request created (payment #${result.payment.id}, status: ${result.payment.status}). ` +
          `Daraja isn't connected yet in this environment, so no real M-Pesa prompt was sent — ` +
          `this is the placeholder response Phase 10 will replace with a live one.`,
          'info'
        );
      } else {
        showStatus('Check your phone for the M-Pesa prompt and enter your PIN to complete the payment.', 'success');
      }
      form.querySelector('button').textContent = 'Request sent';
    } catch (err) {
      showMessage(err.message);
      button.disabled = false;
      button.textContent = 'Pay with M-Pesa';
    }
  });
});
