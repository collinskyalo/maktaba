/**
 * Maktaba — js/booksPage.js
 * Entry point for books.html: reads filters from the URL, fetches
 * matching books (search or plain browse) from the API, renders the
 * results grid, pagination, and any external-provider results, and
 * keeps the URL in sync as the user changes filters — so the page is
 * shareable/bookmarkable and the back button works as expected.
 */

import { getCategories, fetchBooks, searchBooks } from './api.js';
import { bookCardHtml, coverColorFor } from './books.js';
import { debounce } from './search.js';

const PAGE_SIZE = 12;

function getStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    q: params.get('q') || '',
    category: params.get('category') || '',
    sort: params.get('sort') || 'popular',
    page: Number(params.get('page')) || 1,
  };
}

function writeStateToUrl(state) {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.category) params.set('category', state.category);
  if (state.sort && state.sort !== 'popular') params.set('sort', state.sort);
  if (state.page && state.page !== 1) params.set('page', state.page);
  const query = params.toString();
  history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
}

function renderSkeletons(grid, count = 8) {
  grid.innerHTML = Array.from({ length: count }).map(() => `
    <div class="book-card skeleton-card">
      <div class="cover"></div>
      <div class="skeleton-line skeleton-line--wide"></div>
      <div class="skeleton-line skeleton-line--narrow"></div>
    </div>
  `).join('');
}

function renderPagination(container, { page, total, limit }, onPageChange) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  const buttons = [];
  buttons.push(`<button type="button" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">‹</button>`);

  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let p = start; p <= end; p++) {
    buttons.push(`<button type="button" data-page="${p}" class="${p === page ? 'is-active' : ''}">${p}</button>`);
  }

  buttons.push(`<button type="button" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''} aria-label="Next page">›</button>`);

  container.innerHTML = buttons.join('');
  container.querySelectorAll('button[data-page]').forEach((btn) => {
    btn.addEventListener('click', () => onPageChange(Number(btn.dataset.page)));
  });
}

function renderExternal(section, grid, externalBooks) {
  if (!externalBooks || externalBooks.length === 0) {
    section.hidden = true;
    return;
  }
  section.hidden = false;
  grid.innerHTML = externalBooks.map((b) => `
    <a class="external-card" href="${b.previewUrl || '#'}" target="_blank" rel="noopener">
      ${b.coverUrl
        ? `<img class="external-card__cover" src="${b.coverUrl}" alt="" loading="lazy">`
        : `<div class="external-card__cover" style="background:${coverColorFor({ category: '' })}"></div>`}
      <div class="external-card__body">
        <p class="external-card__source">${b.source.replace('-', ' ')}</p>
        <h4>${b.title}</h4>
        <p>${b.author}</p>
      </div>
    </a>
  `).join('');
}

async function populateCategoryFilter(select, selected) {
  const categories = await getCategories();
  select.innerHTML = `<option value="">All categories</option>` +
    categories.map((c) => `<option value="${c.slug}" ${c.slug === selected ? 'selected' : ''}>${c.label}</option>`).join('');
}

async function loadAndRender(state) {
  const grid = document.getElementById('resultsGrid');
  const empty = document.getElementById('resultsEmpty');
  const summary = document.getElementById('resultsSummary');
  const pagination = document.getElementById('pagination');
  const externalSection = document.getElementById('externalSection');
  const externalGrid = document.getElementById('externalGrid');

  empty.hidden = true;
  externalSection.hidden = true;
  renderSkeletons(grid);
  summary.textContent = '';

  try {
    const params = { category: state.category, sort: state.sort, page: state.page, limit: PAGE_SIZE };
    const result = state.q ? await searchBooks({ ...params, q: state.q }) : await fetchBooks(params);

    if (result.items.length === 0) {
      grid.innerHTML = '';
      empty.hidden = false;
    } else {
      grid.innerHTML = result.items.map((b) => bookCardHtml(b, { showReads: true })).join('');
    }

    summary.textContent = state.q
      ? `${result.total} result${result.total === 1 ? '' : 's'} for "${state.q}"`
      : `${result.total} book${result.total === 1 ? '' : 's'}`;

    renderPagination(pagination, result, (page) => {
      state.page = page;
      writeStateToUrl(state);
      loadAndRender(state);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    if (result.external) {
      renderExternal(externalSection, externalGrid, result.external);
    }
  } catch (err) {
    grid.innerHTML = '';
    empty.hidden = false;
    empty.textContent = `Something went wrong loading books: ${err.message}`;
    pagination.innerHTML = '';
  }
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

  const state = getStateFromUrl();

  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const sortFilter = document.getElementById('sortFilter');
  const searchForm = document.getElementById('searchForm');

  searchInput.value = state.q;
  sortFilter.value = state.sort;
  await populateCategoryFilter(categoryFilter, state.category);

  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.q = searchInput.value.trim();
    state.page = 1;
    writeStateToUrl(state);
    loadAndRender(state);
  });

  const debouncedSearch = debounce(() => {
    state.q = searchInput.value.trim();
    state.page = 1;
    writeStateToUrl(state);
    loadAndRender(state);
  }, 400);
  searchInput.addEventListener('input', debouncedSearch);

  categoryFilter.addEventListener('change', () => {
    state.category = categoryFilter.value;
    state.page = 1;
    writeStateToUrl(state);
    loadAndRender(state);
  });

  sortFilter.addEventListener('change', () => {
    state.sort = sortFilter.value;
    state.page = 1;
    writeStateToUrl(state);
    loadAndRender(state);
  });

  loadAndRender(state);
});
