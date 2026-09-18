/**
 * Maktaba — js/search.js
 * Hero search box behavior. For now it just redirects to books.html with
 * a query string; Phase 8 (Search integration) will wire this to live
 * results (Open Library / Project Gutenberg / Google Books / Internet
 * Archive) via api.js, likely with a debounced type-ahead as well.
 */

export function initHeroSearch() {
  const form = document.getElementById('heroSearchForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('heroSearchInput');
    const query = input.value.trim();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    window.location.href = `books.html?${params.toString()}`;
  });
}

/**
 * Utility other modules (or a future type-ahead) can reuse: delays calling
 * `fn` until `wait` ms have passed since the last call.
 */
export function debounce(fn, wait = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
