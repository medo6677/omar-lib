/** Persistence: favorites, recently viewed, reading preferences & progress. */
window.LIB = window.LIB || {};
LIB.store = (function () {
  "use strict";
  const cfg = LIB.config;
  const P = cfg.storagePrefix;

  const read = (k, fallback) => {
    try { const v = localStorage.getItem(P + k); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  };
  const write = (k, v) => {
    try { localStorage.setItem(P + k, JSON.stringify(v)); } catch { /* storage unavailable */ }
  };

  /* ---------- favorites (keyed by book key, stores compact book data) ---------- */
  function compact(b) {
    return {
      key: b.key, source: b.source, id: b.id, title: b.title, authors: b.authors,
      year: b.year, lang: b.lang, cover: b.cover, coverLarge: b.coverLarge,
      fullText: b.fullText ? { txt: b.fullText.txt, html: b.fullText.html, epub: b.fullText.epub } : null,
      ia: b.ia || [],
      ebookAccess: b.ebookAccess,
      previewUrl: b.previewUrl, originUrl: b.originUrl, savedAt: Date.now(),
    };
  }

  const getFavorites = () => read("favorites", []);
  const isFavorite = (key) => getFavorites().some((b) => b.key === key);
  function toggleFavorite(book) {
    let list = getFavorites();
    if (list.some((b) => b.key === book.key)) {
      list = list.filter((b) => b.key !== book.key);
      write("favorites", list);
      return false;
    }
    list.unshift(compact(book));
    write("favorites", list);
    return true;
  }

  /* ---------- recently viewed ---------- */
  const getRecent = () => read("recent", []);
  function pushRecent(book) {
    let list = getRecent().filter((b) => b.key !== book.key);
    list.unshift(compact(book));
    write("recent", list.slice(0, 20));
  }

  /* ---------- reading preferences (persist across sessions) ---------- */
  const getPrefs = () => read("prefs", { fontSize: 3, theme: "sepia" });
  function setPrefs(patch) {
    const p = Object.assign(getPrefs(), patch);
    write("prefs", p);
    return p;
  }

  /* ---------- reading progress ---------- */
  const getProgress = (bookKey) => read("progress:" + bookKey, null);
  const setProgress = (bookKey, data) => write("progress:" + bookKey, data);

  /* ---------- interface language ---------- */
  const getLang = () => read("lang", null);
  const setLang = (l) => write("lang", l);

  return { getFavorites, isFavorite, toggleFavorite, getRecent, pushRecent, getPrefs, setPrefs, getProgress, setProgress, getLang, setLang };
})();
