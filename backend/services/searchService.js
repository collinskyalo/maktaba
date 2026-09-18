/**
 * Maktaba — services/searchService.js
 * External book-provider search (Phase 8). Each function calls one
 * provider's public API and normalizes its results into a common shape:
 *   { source, title, author, coverUrl, previewUrl, isbn }
 *
 * All four run in parallel via searchExternalProviders() using
 * Promise.allSettled, so one slow/unavailable provider never blocks the
 * others or the local database results returned alongside them.
 *
 * Note: these make real outbound HTTPS calls. In network-restricted
 * environments (e.g. a sandboxed CI job) they will fail closed — each
 * function catches its own errors and returns an empty array rather than
 * throwing, so a restricted network degrades gracefully to local-only
 * search results instead of breaking the endpoint.
 */

const env = require('../config/env');
const logger = require('../utils/logger');

const FETCH_TIMEOUT_MS = 4000;

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** https://openlibrary.org/dev/docs/api/search */
async function searchOpenLibrary(query, limit = 8) {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;
    const data = await fetchWithTimeout(url);
    return (data.docs || []).map((doc) => ({
      source: 'open-library',
      title: doc.title,
      author: (doc.author_name || [])[0] || 'Unknown',
      coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
      previewUrl: doc.key ? `https://openlibrary.org${doc.key}` : null,
      isbn: (doc.isbn || [])[0] || null,
    }));
  } catch (err) {
    logger.warn('Open Library search failed:', err.message);
    return [];
  }
}

/** https://gutendex.com — a community-run REST API over Project Gutenberg's catalog. */
async function searchGutenberg(query, limit = 8) {
  try {
    const url = `https://gutendex.com/books?search=${encodeURIComponent(query)}`;
    const data = await fetchWithTimeout(url);
    return (data.results || []).slice(0, limit).map((book) => ({
      source: 'project-gutenberg',
      title: book.title,
      author: (book.authors || [])[0]?.name || 'Unknown',
      coverUrl: book.formats?.['image/jpeg'] || null,
      previewUrl: book.formats?.['text/html'] || book.formats?.['application/pdf'] || null,
      downloadUrl: book.formats?.['application/pdf'] || null,
      isbn: null,
    }));
  } catch (err) {
    logger.warn('Project Gutenberg search failed:', err.message);
    return [];
  }
}

/** https://developers.google.com/books/docs/v1/using#WorkingVolumes */
async function searchGoogleBooks(query, limit = 8) {
  if (!env.googleBooksApiKey) {
    logger.info('Google Books search skipped — GOOGLE_BOOKS_API_KEY not set.');
    return [];
  }
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}&key=${env.googleBooksApiKey}`;
    const data = await fetchWithTimeout(url);
    return (data.items || []).map((item) => ({
      source: 'google-books',
      title: item.volumeInfo?.title,
      author: (item.volumeInfo?.authors || [])[0] || 'Unknown',
      coverUrl: item.volumeInfo?.imageLinks?.thumbnail || null,
      previewUrl: item.volumeInfo?.previewLink || null,
      isbn: (item.volumeInfo?.industryIdentifiers || [])[0]?.identifier || null,
    }));
  } catch (err) {
    logger.warn('Google Books search failed:', err.message);
    return [];
  }
}

/** https://archive.org/advancedsearch.php — restricted to the "texts" media type. */
async function searchInternetArchive(query, limit = 8) {
  try {
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(query)}+AND+mediatype:texts&fl[]=identifier&fl[]=title&fl[]=creator&rows=${limit}&output=json`;
    const data = await fetchWithTimeout(url);
    return (data.response?.docs || []).map((doc) => ({
      source: 'internet-archive',
      title: doc.title,
      author: doc.creator || 'Unknown',
      coverUrl: `https://archive.org/services/img/${doc.identifier}`,
      previewUrl: `https://archive.org/details/${doc.identifier}`,
      isbn: null,
    }));
  } catch (err) {
    logger.warn('Internet Archive search failed:', err.message);
    return [];
  }
}

/**
 * Runs all four providers in parallel and flattens the results. Used by
 * booksController.search() alongside the local database search so a
 * query returns Maktaba's own catalog first, with more results available
 * from public-domain/licensed sources.
 */
async function searchExternalProviders(query, limitPerProvider = 6) {
  const results = await Promise.allSettled([
    searchOpenLibrary(query, limitPerProvider),
    searchGutenberg(query, limitPerProvider),
    searchGoogleBooks(query, limitPerProvider),
    searchInternetArchive(query, limitPerProvider),
  ]);

  return results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .filter((book) => book.title); // drop any malformed entries
}

module.exports = {
  searchOpenLibrary,
  searchGutenberg,
  searchGoogleBooks,
  searchInternetArchive,
  searchExternalProviders,
};
