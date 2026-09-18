/**
 * Maktaba — js/auth.js
 * Wires up login.html, register.html, and forgot-password.html to the
 * real backend (Phase 5/6/7). Stores the JWT + user in localStorage so
 * other pages (profile.html, payment.html) can read them via
 * getSession()/isLoggedIn() without importing this whole module.
 */

import { registerUser, loginUser, requestPasswordReset } from './api.js';

const TOKEN_KEY = 'maktaba_token';
const USER_KEY = 'maktaba_user';

export function getSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (!token || !userRaw) return null;
  try {
    return { token, user: JSON.parse(userRaw) };
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(getSession());
}

export function saveSession({ token, user }) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function showMessage(text, kind = 'error') {
  const el = document.getElementById('formMessage');
  if (!el) return;
  el.textContent = text;
  el.className = `form-message is-visible form-message--${kind}`;
}

function showFieldError(fieldId, text) {
  const el = document.getElementById(`${fieldId}Error`);
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('is-visible', Boolean(text));
}

function clearFieldErrors(ids) {
  ids.forEach((id) => showFieldError(id, ''));
}

function setSubmitting(button, isSubmitting, label) {
  if (!button) return;
  button.disabled = isSubmitting;
  button.textContent = isSubmitting ? 'Please wait…' : label;
}

function initGoogleButton() {
  const btn = document.getElementById('googleBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    // See services/googleAuthService.js on the backend — not implemented yet.
    showMessage('Google sign-in is coming soon. Please use email for now.', 'error');
  });
}

function initRegisterForm() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(['name', 'email', 'password']);

    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    let hasError = false;
    if (name.length < 2) { showFieldError('name', 'Enter your full name.'); hasError = true; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showFieldError('email', 'Enter a valid email.'); hasError = true; }
    if (password.length < 8) { showFieldError('password', 'Must be at least 8 characters.'); hasError = true; }
    if (hasError) return;

    const button = document.getElementById('submitBtn');
    setSubmitting(button, true, 'Create account');
    try {
      const data = await registerUser({ name, email, password });
      saveSession(data);
      window.location.href = 'profile.html';
    } catch (err) {
      showMessage(err.message);
    } finally {
      setSubmitting(button, false, 'Create account');
    }
  });
}

function initLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(['email', 'password']);

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    let hasError = false;
    if (!email) { showFieldError('email', 'Enter your email.'); hasError = true; }
    if (!password) { showFieldError('password', 'Enter your password.'); hasError = true; }
    if (hasError) return;

    const button = document.getElementById('submitBtn');
    setSubmitting(button, true, 'Log in');
    try {
      const data = await loginUser({ email, password });
      saveSession(data);
      window.location.href = 'profile.html';
    } catch (err) {
      showMessage(err.message);
    } finally {
      setSubmitting(button, false, 'Log in');
    }
  });
}

function initForgotPasswordForm() {
  const form = document.getElementById('forgotForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(['email']);

    const email = document.getElementById('email').value.trim();
    if (!email) { showFieldError('email', 'Enter your email.'); return; }

    const button = document.getElementById('submitBtn');
    setSubmitting(button, true, 'Send reset link');
    try {
      const data = await requestPasswordReset({ email });
      showMessage(data.message, 'success');
      form.reset();
    } catch (err) {
      showMessage(err.message);
    } finally {
      setSubmitting(button, false, 'Send reset link');
    }
  });
}

/** Redirects away from login/register if the user already has a session. */
function redirectIfLoggedIn() {
  const onAuthPage = document.getElementById('loginForm') || document.getElementById('registerForm');
  if (onAuthPage && isLoggedIn()) {
    window.location.href = 'profile.html';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  redirectIfLoggedIn();
  initRegisterForm();
  initLoginForm();
  initForgotPasswordForm();
  initGoogleButton();
});

/**
 * Swaps the header's "Log in" / "Sign up" links for the user's first
 * name + "Log out", if a session exists. Called from app.js on every
 * page that includes the shared header.
 */
export function renderAuthState() {
  const session = getSession();
  if (!session) return;

  document.querySelectorAll('.header-actions, .mobile-nav').forEach((container) => {
    const loginLink = container.querySelector('a[href="login.html"]');
    const registerLink = container.querySelector('a[href="register.html"]');
    if (loginLink) {
      loginLink.textContent = session.user.name.split(' ')[0];
      loginLink.href = 'profile.html';
    }
    if (registerLink) {
      registerLink.textContent = 'Log out';
      registerLink.href = '#';
      registerLink.addEventListener('click', (e) => {
        e.preventDefault();
        clearSession();
        window.location.href = 'index.html';
      });
    }
  });
}
