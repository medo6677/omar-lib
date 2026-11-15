/** Collections overlay — Favorites and Recently Viewed (persisted). */
window.LIB = window.LIB || {};
LIB.collections = (function () {
  "use strict";

  const overlay = () => document.getElementById("collectionOverlay");
  const titleEl = () => document.getElementById("collectionTitle");
  const bodyEl = () => document.getElementById("collectionBody");
  let mode = "favorites";

  function open(which) {
    mode = which || "favorites";
    LIB.ui.showOverlay(overlay());
    render();
  }

  function close() { LIB.ui.hideOverlay(overlay()); }

  function render() {
    const t = LIB.i18n.t;
    const books = mode === "favorites" ? LIB.store.getFavorites() : LIB.store.getRecent();
    titleEl().textContent = t(mode === "favorites" ? "col.favorites" : "col.recent");

    if (!books.length) {
      bodyEl().innerHTML = `<div class="collection-empty">${LIB.util.escapeHtml(t(mode === "favorites" ? "col.favoritesEmpty" : "col.recentEmpty"))}</div>`;
      return;
    }

    bodyEl().innerHTML =
      `<p class="collection-count">${LIB.util.escapeHtml(t("col.count", { n: books.length }))}</p>` +
      `<div class="collection-actions"><button class="btn btn-ghost" id="clearCol">${LIB.util.escapeHtml(t("col.clear"))}</button></div>` +
      `<div class="results-grid" id="collectionGrid"></div>`;

    const grid = bodyEl().querySelector("#collectionGrid");
    books.forEach((b) => grid.appendChild(LIB.ui.bookCard(b, { dirAware: true })));
    if (window.gsap && !LIB.ui.prefersReducedMotion()) {
      gsap.fromTo(grid.children, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.025 });
    }

    bodyEl().querySelector("#clearCol").addEventListener("click", () => {
      const key = mode === "favorites" ? "favorites" : "recent";
      localStorage.setItem(LIB.config.storagePrefix + key, "[]");
      if (mode === "favorites") {
        // keep every visible heart in sync
        document.querySelectorAll(".fav-btn.is-fav").forEach((b) => {
          b.classList.remove("is-fav");
          b.setAttribute("aria-pressed", "false");
        });
      }
      render();
    });
  }

  /** Called by other modules when favorites change elsewhere. */
  function onExternalChange() {
    if (!overlay().hidden) render();
  }

  function init() {
    document.getElementById("collectionClose").addEventListener("click", close);
    document.querySelector("[data-close-collection]").addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !overlay().hidden) close(); });
  }

  return { open, close, render, onExternalChange, init };
})();
