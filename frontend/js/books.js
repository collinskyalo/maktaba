/**
 * Maktaba — js/books.js
 * Renders book-related sections on the homepage: categories, most-read
 * carousel, best-books list, and recently-added grid. As of Phase 8 this
 * pulls real data from the API (see api.js) instead of mock data.
 * Also exports small helpers (cover color, reads formatting, card
 * rendering) reused by js/booksPage.js on the browse/search page.
 */

import {
  getCategories,
  fetchTrending,
  fetchBestBooks,
  fetchRecentlyAdded,
} from './api.js';

/** Simple monoline icon paths per category slug, drawn inline (no external assets). */
const ICONS = {
  technology: '<path d="M4 5h14v10H4z"/><path d="M9 18h4"/>',
  business: '<path d="M4 8h14v9H4z"/><path d="M8 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
  finance: '<circle cx="11" cy="11" r="8"/><path d="M11 6v10M8.5 8.5h4a1.6 1.6 0 0 1 0 3.2h-3a1.6 1.6 0 0 0 0 3.2h4.5"/>',
  education: '<path d="M2 8l9-4 9 4-9 4-9-4z"/><path d="M6 10v4c0 1.2 2.2 2.2 5 2.2s5-1 5-2.2v-4"/>',
  fiction: '<path d="M4 5.5C4 4.7 4.7 4 5.5 4H11v14H5.5c-.8 0-1.5-.7-1.5-1.5z"/><path d="M18 5.5c0-.8-.7-1.5-1.5-1.5H11v14h5.5c.8 0 1.5-.7 1.5-1.5z" opacity=".55"/>',
  religion: '<path d="M11 3v16M5 8h12"/><path d="M8 12h6"/>',
  history: '<circle cx="11" cy="11" r="8"/><path d="M11 6.5V11l3 2"/>',
  science: '<path d="M9 3h4M10 3v6l-5 8a2 2 0 0 0 1.7 3h8.6a2 2 0 0 0 1.7-3l-5-8V3"/>',
  'self-improvement': '<path d="M11 3v3M11 16v3M3 11h3M16 11h3M6 6l2 2M14 14l2 2M6 16l2-2M14 8l2-2"/><circle cx="11" cy="11" r="3"/>',
  childrens: '<circle cx="11" cy="8" r="3.4"/><path d="M5 19c0-3.3 2.7-6 6-6s6 2.7 6 6"/>',
};

/** Deterministic color per category, so covers look distinct without real cover art. */
const CATEGORY_COLORS = {
  technology: '#0F766E',
  business: '#1A1E1D',
  finance: '#0B5C56',
  education: '#4A4F4D',
  fiction: '#0F766E',
  religion: '#8A6D1D',
  history: '#1A1E1D',
  science: '#0B5C56',
  'self-improvement': '#4A4F4D',
  'childrens-books': '#0F766E',
};

export function coverColorFor(book) {
  return CATEGORY_COLORS[book.category] || '#0F766E';
}

/** "128000" → "128k reads" for compact display on cards. */
export function formatReads(n) {
  const num = Number(n) || 0;
  if (num >= 1000) return `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}k reads`;
  return `${num} reads`;
}

function iconSvg(name) {
  const paths = ICONS[name] || ICONS.fiction;
  return `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

function starIcon() {
  return '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M10 1.5l2.6 5.5 6 .7-4.4 4.1 1.2 6-5.4-3-5.4 3 1.2-6L1.4 7.7l6-.7z"/></svg>';
}

/** Shared card markup for a book, used on the homepage and books.html. Reused by booksPage.js. */
export function bookCardHtml(book, { showReads = false } = {}) {
  const cover = book.cover_url
    ? `<div class="cover" style="background-image:url('${book.cover_url}'); background-size:cover; background-position:center;"><span></span></div>`
    : `<div class="cover" style="background:${coverColorFor(book)}"><span>${book.title}</span></div>`;
  return `
    <a class="book-card" href="book-details.html?id=${book.id}">
      ${cover}
      <p class="book-card__title">${book.title}</p>
      <p class="book-card__author">${book.author}</p>
      ${showReads ? `<p class="book-card__meta">${formatReads(book.reads)}</p>` : ''}
    </a>
  `;
}

/** Renders the 10 category cards into #categoryGrid. */
export async function renderCategories() {
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;
  const categories = await getCategories();
  grid.innerHTML = categories.map((c) => `
    <a class="category-card" href="books.html?category=${c.slug}">
      <span class="category-card__icon">${iconSvg(c.icon)}</span>
      <span class="category-card__label">${c.label}</span>
    </a>
  `).join('');
}

/** Renders the horizontal most-read carousel into #mostReadTrack. */
export async function renderMostRead() {
  const track = document.getElementById('mostReadTrack');
  if (!track) return;
  try {
    const books = await fetchTrending(10);
    track.innerHTML = books.map((b) => bookCardHtml(b, { showReads: true })).join('');
  } catch (err) {
    track.innerHTML = `<p class="results-empty">Couldn't load trending books right now.</p>`;
  }
}

/** Renders the ranked best-books list into #bestList. */
export async function renderBestBooks() {
  const list = document.getElementById('bestList');
  if (!list) return;
  try {
    const books = await fetchBestBooks(5);
    list.innerHTML = books.map((b, i) => `
      <li class="best-list__item">
        <span class="best-list__rank">${i + 1}</span>
        <a class="best-list__cover" href="book-details.html?id=${b.id}">
          <div class="cover" style="background:${coverColorFor(b)}"></div>
        </a>
        <a class="best-list__info" href="book-details.html?id=${b.id}">
          <h3>${b.title}</h3>
          <p>${b.author}</p>
        </a>
        <span class="best-list__rating">${starIcon()} ${Number(b.rating).toFixed(1)}</span>
      </li>
    `).join('');
  } catch (err) {
    list.innerHTML = `<p class="results-empty">Couldn't load best books right now.</p>`;
  }
}

/** Renders the recently-added grid into #recentGrid. */
export async function renderRecentlyAdded() {
  const grid = document.getElementById('recentGrid');
  if (!grid) return;
  try {
    const books = await fetchRecentlyAdded(8);
    grid.innerHTML = books.map((b) => bookCardHtml(b)).join('');
  } catch (err) {
    grid.innerHTML = `<p class="results-empty">Couldn't load new books right now.</p>`;
  }
}

/** Wires the left/right buttons for any carousel with data-carousel-controls="<trackId>". */
export function initCarouselControls() {
  document.querySelectorAll('[data-carousel-controls]').forEach((controls) => {
    const track = document.getElementById(controls.dataset.carouselControls);
    if (!track) return;
    controls.querySelectorAll('.carousel-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dir = Number(btn.dataset.dir);
        track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
      });
    });
  });
}
