/** Shared UI primitives: toasts, resilient covers, book cards, overlay control. */
window.LIB = window.LIB || {};
LIB.ui = (function () {
  "use strict";
  const U = LIB.util;
  const esc = U.escapeHtml;

  /* ---------- toasts ---------- */
  function toast(message, opts = {}) {
    const stack = document.getElementById("toastStack");
    const el = document.createElement("div");
    el.className = "toast" + (opts.tone ? " toast-" + opts.tone : "");
    el.textContent = message;
    if (opts.onClick) {
      el.style.cursor = "pointer";
      el.addEventListener("click", () => { opts.onClick(); el.remove(); });
    }
    stack.appendChild(el);
    if (window.gsap && !prefersReducedMotion()) {
      gsap.fromTo(el, { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.3 });
      gsap.to(el, { autoAlpha: 0, y: -8, delay: opts.duration || 3, duration: 0.4, onComplete: () => el.remove() });
    } else {
      setTimeout(() => el.remove(), (opts.duration || 3) * 1000);
    }
    return el;
  }

  const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- CSS fallback cover (used when remote images fail) ---------- */
  const COVER_PALETTES = [
    ["#5d4037", "#3e2723"], ["#37474f", "#1c262c"], ["#4e342e", "#281a15"],
    ["#35564a", "#1d332b"], ["#5c3a4a", "#33202b"], ["#3a4a6b", "#20293d"],
    ["#5a4a2f", "#31291a"], ["#4a3a5c", "#2a2038"],
  ];

  function fallbackCover(book) {
    const pal = COVER_PALETTES[U.hash(book.key) % COVER_PALETTES.length];
    const author = esc(U.truncate(book.authors[0] || "", 30));
    const title = esc(U.truncate(book.title || "", 90));
    const el = document.createElement("div");
    el.className = "cover-fallback";
    el.style.setProperty("--cv-a", pal[0]);
    el.style.setProperty("--cv-b", pal[1]);
    el.dir = "auto";
    el.innerHTML =
      `<span class="cf-rule" aria-hidden="true"></span>` +
      `<span class="cf-title">${title}</span>` +
      `<span class="cf-author">${author}</span>` +
      `<span class="cf-rule" aria-hidden="true"></span>`;
    return el;
  }

  /** <img> that swaps itself for a CSS cover on error / missing src. */
  function coverImg(book, size) {
    const src = size === "large" ? (book.coverLarge || book.cover) : book.cover;
    const img = document.createElement("img");
    img.className = "book-cover-img";
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    if (src) img.src = src;
    const wrapFail = () => {
      const fb = fallbackCover(book);
      if (img.parentNode) img.parentNode.replaceChild(fb, img);
    };
    img.addEventListener("error", wrapFail);
    if (!src) wrapFail();
    return img;
  }

  /* ---------- availability badge ---------- */
  function badge(book) {
    if (book.fullText) return `<span class="badge badge-full">${esc(LIB.i18n.t("badge.fulltext"))}</span>`;
    if (book.previewUrl) return `<span class="badge badge-preview">${esc(LIB.i18n.t("badge.preview"))}</span>`;
    return `<span class="badge badge-meta">${esc(LIB.i18n.t("badge.metadata"))}</span>`;
  }

  /* ---------- book card (search results / collections) ---------- */
  function bookCard(book, opts = {}) {
    const card = document.createElement("article");
    card.className = "book-card" + (opts.dirAware && U.isArabicText(book.title) ? " is-rtl" : "");
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", book.title + " — " + book.authors[0]);
    card.dataset.bookKey = book.key;

    const fav = LIB.store.isFavorite(book.key);
    card.innerHTML =
      `<div class="book-card-cover" aria-hidden="true"></div>` +
      `<div class="book-card-body">` +
        `<h3 class="book-card-title" dir="auto">${esc(U.truncate(book.title, 70))}</h3>` +
        `<p class="book-card-author" dir="auto">${esc(U.truncate(book.authors.join(", "), 40))}</p>` +
        badge(book) +
      `</div>` +
      `<button class="fav-btn ${fav ? "is-fav" : ""}" aria-label="Favorite" aria-pressed="${fav}"><i data-lucide="heart" class="fav-icon" aria-hidden="true"></i></button>`;

    card.querySelector(".book-card-cover").appendChild(coverImg(book));
    card.querySelector(".fav-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFav(book, e.currentTarget);
    });
    card.addEventListener("click", () => LIB.details.open(book));
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); LIB.details.open(book); } });
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons({ root: card });
    }
    return card;
  }

  function refreshIcons(container) {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons({
        attrs: { "stroke-width": "2" },
        ...(container && container !== document.body ? { root: container } : {}),
      });
    }
  }

  function toggleFav(book, btn) {
    const added = LIB.store.toggleFavorite(book);
    if (btn) {
      btn.classList.toggle("is-fav", added);
      btn.setAttribute("aria-pressed", String(added));
    }
    LIB.ui.toast(LIB.i18n.t(added ? "toast.favAdded" : "toast.favRemoved"));
    LIB.details.syncFavButtons(book.key, added);
    LIB.collections.onExternalChange();
  }

  /* ---------- overlay helpers (open/close, scroll lock, ESC) ---------- */
  function showOverlay(el) {
    el.hidden = false;
    el.setAttribute("aria-hidden", "false");
    document.body.classList.add("no-scroll");
    if (window.gsap && !prefersReducedMotion()) {
      gsap.fromTo(el.querySelector(".overlay-scrim"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 });
      const panel = el.querySelector("[role='dialog']");
      if (panel) gsap.fromTo(panel, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power3.out" });
    }
  }

  function hideOverlay(el) {
    const finish = () => {
      el.hidden = true;
      el.setAttribute("aria-hidden", "true");
      const anyOpen = Array.from(document.querySelectorAll(".overlay")).some((o) => !o.hidden);
      const readerOpen = !document.getElementById("reader").hidden;
      if (!anyOpen && !readerOpen) document.body.classList.remove("no-scroll");
    };
    if (window.gsap && !prefersReducedMotion()) {
      gsap.to(el.querySelector(".overlay-scrim"), { autoAlpha: 0, duration: 0.2 });
      const panel = el.querySelector("[role='dialog']");
      if (panel) gsap.to(panel, { autoAlpha: 0, y: 16, duration: 0.2, onComplete: finish });
      else finish();
    } else finish();
  }

  return { toast, coverImg, fallbackCover, badge, bookCard, toggleFav, showOverlay, hideOverlay, prefersReducedMotion, refreshIcons };
})();
