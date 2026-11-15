# The Grand Library | المكتبة الكبرى

A cinematic, fully responsive digital library. Real book data and genuine
full-text reading, in English and Arabic (RTL/LTR), on phones, tablets and
desktops.

## Run it

Any static server works:

```bash
npx serve .          # or
python -m http.server 8000
```

Then open the printed URL. Opening `index.html` directly with `file://` also
works — all APIs used allow cross-origin requests — but a local server is
recommended.

## Data sources (all real, all live)

| Source | Used for | Notes |
|---|---|---|
| **Gutendex** (Project Gutenberg) | Shelf collections, full-text reading, EPUB/txt links | Primary source for readable books |
| **Open Library** | Catalog search, covers, ebook availability | Rate-limited politely (concurrency + spacing + caching) |
| **Google Books** | Descriptions, covers, previews; language filter | Optional API key in `js/config.js` |
| **Wikipedia** | Author biographies/context in book details | Clearly labelled as supplementary, with attribution |
| **Google Fonts** | Cormorant Garamond / Inter / Cairo | Arabic typography + RTL handled in CSS |

## Configuration

Edit `js/config.js` to set:

- `googleBooksApiKey` — optional Google Books key
- `cacheTTLMinutes` — how long API responses are cached (localStorage)
- shelves — which Gutendex collections appear, and their EN/AR labels
- `storagePrefix` — localStorage key prefix (change to reset all user data)

## Features

- Cinematic entrance, wooden bookshelves with real API data
- 3D hover interactions on desktop (fine pointers only), tap-to-select on touch
- Book details: desktop modal / mobile bottom sheet (swipe down to dismiss)
- Genuine full-text reader: paginated, font size + light/sepia/dark themes,
  progress and preferences persisted, automatic RTL for Arabic texts
- Unified search across all three catalog providers with language chips
- Favorites & recently viewed — persisted in localStorage
- Mobile: horizontal snap-scroll shelves, compact menu, bottom sheets,
  one-page-at-a-time reading, reduced particles
- `prefers-reduced-motion` respected everywhere; GSAP animations are
  breakpoint-scoped via `gsap.matchMedia()`

## User data

Everything personal (favorites, history, reading progress, preferences,
language) lives in your browser's localStorage under the `lib:` prefix.
Clearing site data resets the library.
