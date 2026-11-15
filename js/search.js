/** Search overlay — combined, debounced search; each provider streams in. */
window.LIB = window.LIB || {};
LIB.search = (function () {
  "use strict";
  const U = LIB.util;

  const overlay = () => document.getElementById("searchOverlay");
  const input = () => document.getElementById("searchInput");
  const resultsEl = () => document.getElementById("searchResults");
  const statusEl = () => document.getElementById("searchStatus");
  let currentLang = "all";
  let seq = 0;

  // Accumulated state for the running search
  let state = null;

  function open() {
    LIB.ui.showOverlay(overlay());
    renderInitial();
    setTimeout(() => input().focus({ preventScroll: true }), 60);
  }

  function close() { LIB.ui.hideOverlay(overlay()); input().blur(); }

  function renderInitial() {
    statusEl().hidden = false;
    statusEl().textContent = LIB.i18n.t("search.initial");
    statusEl().className = "search-status muted";
    resultsEl().innerHTML = "";
  }

  const runSearch = U.debounce(async () => {
    const q = input().value.trim();
    const mySeq = ++seq;
    if (q.length < 2) { renderInitial(); return; }

    state = { q, books: [], seen: new Set(), failed: new Set(), settled: 0, total: 3 };
    statusEl().hidden = false;
    statusEl().className = "search-status muted";
    statusEl().textContent = LIB.i18n.t("search.searching");
    resultsEl().innerHTML = skeletons(8);

    LIB.api.unifiedSearch(q, currentLang, (provider, books, failed) => {
      if (seq !== mySeq) return; // superseded by a newer search
      state.settled++;
      (failed || []).forEach((f) => state.failed.add(f));
      books.forEach((b) => {
        const k = (b.title || "").toLowerCase().replace(/\W/g, "").slice(0, 40) + "|" +
          (b.authors[0] || "").toLowerCase().replace(/\W/g, "").slice(0, 20);
        if (!state.seen.has(k)) { state.seen.add(k); state.books.push(b); }
      });
      render();
    });
  }, 450);

  function render() {
    if (!state) return;
    // Full-text first, then previews, then metadata-only
    state.books.sort((a, b) => (b.fullText ? 1 : 0) - (a.fullText ? 1 : 0));

    const done = state.settled >= state.total;
    if (!state.books.length && !done) return; // still waiting for first results

    if (!state.books.length) {
      statusEl().hidden = false;
      statusEl().className = state.failed.size ? "search-status error" : "search-status muted";
      statusEl().textContent = state.failed.size ? LIB.i18n.t("search.failed") : LIB.i18n.t("search.none");
      resultsEl().innerHTML = state.failed.size
        ? `<button class="btn btn-primary search-retry" id="searchRetry">${U.escapeHtml(LIB.i18n.t("search.retry"))}</button>`
        : "";
      const retry = document.getElementById("searchRetry");
      if (retry) retry.addEventListener("click", runSearch);
      return;
    }

    statusEl().hidden = state.failed.size === 0;
    if (state.failed.size) {
      statusEl().className = "search-status warn";
      statusEl().textContent = LIB.i18n.t("search.partial");
    }

    // Preserve rendered cards; only append new ones
    const existing = new Set(Array.from(resultsEl().children).map((c) => c.dataset.bookKey));
    const fresh = state.books.filter((b) => !existing.has(b.key));
    resultsEl().querySelectorAll(".skeleton-card").forEach((s) => s.remove());
    fresh.slice(0, 48).forEach((b) => resultsEl().appendChild(LIB.ui.bookCard(b, { dirAware: true })));

    if (fresh.length && window.gsap && !LIB.ui.prefersReducedMotion()) {
      const kids = Array.from(resultsEl().children).slice(-fresh.length);
      gsap.fromTo(kids, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.03, ease: "power2.out" });
    }
  }

  const skeletons = (n) => Array.from({ length: n }, () =>
    `<div class="skeleton-card" aria-hidden="true"><div class="skeleton-cover"></div><div class="skeleton-lines"><span></span><span></span><span></span></div></div>`
  ).join("");

  function init() {
    document.getElementById("searchClose").addEventListener("click", close);
    document.querySelector("[data-close-search]").addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !overlay().hidden) close();
    });
    input().addEventListener("input", runSearch);

    document.querySelectorAll(".search-chips .chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".search-chips .chip").forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        currentLang = chip.dataset.lang;
        runSearch();
      });
    });
  }

  return { open, close, init };
})();
