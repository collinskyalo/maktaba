/**
 * Maktaba — js/app.js
 * Homepage entry point: wires up the mobile nav toggle, hero search, and
 * renders every dynamic homepage section (categories, most-read, best
 * books, recently added) via books.js.
 */

import { initHeroSearch } from './search.js';
import { renderAuthState } from './auth.js';
import {
  renderCategories,
  renderMostRead,
  renderBestBooks,
  renderRecentlyAdded,
  initCarouselControls,
} from './books.js';

function initMobileNav() {
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('mobileNav');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.setAttribute('aria-label', isOpen ? 'Close menu' : 'Open menu');
  });

  // Close the mobile menu automatically once the viewport grows past the
  // breakpoint where the full nav becomes visible again.
  const mq = window.matchMedia('(min-width: 860px)');
  mq.addEventListener('change', (e) => {
    if (e.matches) {
      menu.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initHeroSearch();
  initCarouselControls();
  renderAuthState();

  renderCategories();
  renderMostRead();
  renderBestBooks();
  renderRecentlyAdded();
});
