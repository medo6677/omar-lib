/**
 * Book details — desktop: centered modal. Mobile (<640px): bottom sheet.
 * Enriches the record with Google Books descriptions and a clearly-labelled
 * Wikipedia author extract.
 */
window.LIB = window.LIB || {};
LIB.details = (function () {
  "use strict";
  const U = LIB.util;
  const esc = U.escapeHtml;

  const overlay = () => document.getElementById("detailsOverlay");
  const sheet = () => document.getElementById("detailsSheet");
  const body = () => document.getElementById("detailsBody");
  let lastFocus = null;
  let currentBook = null;

  function open(book) {
    currentBook = book;
    lastFocus = document.activeElement;
    LIB.store.pushRecent(book);
    LIB.ui.showOverlay(overlay());
    render(book);
    document.getElementById("detailsClose").focus({ preventScroll: true });
  }

  function close() {
    LIB.ui.hideOverlay(overlay());
    currentBook = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  const SOURCE_NAMES = { gutendex: "Project Gutenberg", openlibrary: "Open Library", googlebooks: "Google Books" };
  // MARC language codes → display names for the details meta row
  const LANG_NAMES = { eng: "English", fre: "French", ger: "German", spa: "Spanish", ita: "Italian", por: "Portuguese", dut: "Dutch", rus: "Russian", rum: "Romanian", ara: "Arabic", heb: "Hebrew", grc: "Greek", lat: "Latin", chi: "Chinese", jpn: "Japanese", kor: "Korean", fin: "Finnish", swe: "Swedish", dan: "Danish", nor: "Norwegian", cze: "Czech", pol: "Polish", tur: "Turkish", per: "Persian", hin: "Hindi", urd: "Urdu", mul: "Multiple" };
  const langName = (code) => LANG_NAMES[(code || "").toLowerCase()] || String(code || "").toUpperCase();

  function render(book) {
    const t = LIB.i18n.t;
    const rtlTitle = U.isArabicText(book.title);
    const fav = LIB.store.isFavorite(book.key);
    const progress = LIB.store.getProgress(book.key);

    body().innerHTML =
      `<div class="details-grid">` +
        `<div class="details-cover" aria-hidden="true"></div>` +
        `<div class="details-info">` +
          `<div class="details-badges">${LIB.ui.badge(book)}<span class="badge badge-source">${esc(SOURCE_NAMES[book.source] || book.source)}</span></div>` +
          `<h2 id="detailsTitle" class="details-title" dir="auto">${esc(book.title)}</h2>` +
          `<p class="details-authors" dir="auto">${esc(book.authors.join(", "))}</p>` +
          `<dl class="details-meta">` +
            (book.year ? `<div><dt>${esc(t("details.published"))}</dt><dd>${esc(book.year)}</dd></div>` : "") +
            `<div><dt>${esc(t("details.language"))}</dt><dd>${esc(langName(book.lang))}</dd></div>` +
            `<div><dt>${esc(t("details.source"))}</dt><dd>${esc(SOURCE_NAMES[book.source] || book.source)}</dd></div>` +
          `</dl>` +
          `<div class="details-actions">` +
            (book.fullText
              ? `<button class="btn btn-primary" id="dRead"><i data-lucide="book-open" class="btn-icon"></i> ${progress && progress.page > 1 ? esc(t("details.continue")) : esc(t("details.read"))}</button>`
              : "") +
            (!book.fullText && book.ia && book.ia.length
              ? `<button class="btn btn-primary" id="dRead"><i data-lucide="file-text" class="btn-icon"></i> ${esc(t("details.readScan"))}</button>`
              : "") +
            (book.previewUrl ? `<a class="btn btn-ghost" href="${esc(book.previewUrl)}" target="_blank" rel="noopener"><i data-lucide="external-link" class="btn-icon"></i> ${esc(t("details.preview"))}</a>` : "") +
            (book.originUrl ? `<a class="btn btn-ghost" href="${esc(book.originUrl)}" target="_blank" rel="noopener"><i data-lucide="external-link" class="btn-icon"></i> ${esc(t("details.origin", { source: SOURCE_NAMES[book.source] || book.source }))}</a>` : "") +
            `<button class="fav-btn fav-btn-lg ${fav ? "is-fav" : ""}" id="dFav" aria-pressed="${fav}"><i data-lucide="heart" class="fav-icon"></i> <span>${esc(t(fav ? "details.saved" : "details.save"))}</span></button>` +
          `</div>` +
        `</div>` +
        `</div>` +
        `<div class="details-sections">` +
        `<div class="details-section" id="dDesc">` +
          `<h3>${esc(t("details.about"))}</h3>` +
          `<div class="details-skeleton" aria-hidden="true"><span></span><span></span><span></span></div>` +
        `</div>` +
        `<div class="details-section" id="dAuthor">` +
          `<h3>${esc(t("details.authorHeading"))}</h3>` +
          `<div class="details-skeleton" aria-hidden="true"><span></span><span></span></div>` +
        `</div>` +
      `</div>`;

    body().querySelector(".details-cover").appendChild(LIB.ui.coverImg(book, "large"));

    const readBtn = body().querySelector("#dRead");
    if (readBtn) readBtn.addEventListener("click", () => { close(); LIB.reader.open(book); });
    body().querySelector("#dFav").addEventListener("click", (e) => {
      const added = LIB.store.toggleFavorite(book);
      const btn = e.currentTarget;
      btn.classList.toggle("is-fav", added);
      btn.setAttribute("aria-pressed", String(added));
      btn.innerHTML = `<i data-lucide="heart" class="fav-icon"></i> <span>${esc(t(added ? "details.saved" : "details.save"))}</span>`;
      if (LIB.ui && LIB.ui.refreshIcons) LIB.ui.refreshIcons(btn);
      LIB.ui.toast(t(added ? "toast.favAdded" : "toast.favRemoved"));
      LIB.collections.onExternalChange();
    });

    if (LIB.ui && LIB.ui.refreshIcons) LIB.ui.refreshIcons(body());

    enrichDescription(book);
    enrichAuthor(book);
  }

  /* ---------- description: current data or Google Books lookup ---------- */
  async function enrichDescription(book) {
    const t = LIB.i18n.t;
    const el = document.getElementById("dDesc");
    if (!el || currentBook !== book) return;
    let desc = book.description;
    if (!desc) {
      const hit = await LIB.api.googleBooksLookup(book.title, book.authors[0]);
      if (hit) {
        desc = hit.description;
        if (!book.year && hit.year && el && currentBook === book) {
          book.year = hit.year;
        }
      }
    }
    if (!el || currentBook !== book) return;
    const div = document.createElement("div");
    div.className = "details-prose";
    div.dir = "auto";
    div.textContent = desc || t("details.noDescription");
    el.querySelector(".details-skeleton").replaceWith(div);
  }

  /* ---------- author: Wikipedia (clearly labelled supplementary) ---------- */
  async function enrichAuthor(book) {
    const t = LIB.i18n.t;
    const el = document.getElementById("dAuthor");
    if (!el || currentBook !== book) return;
    const author = book.authors[0];
    const wiki = await LIB.api.wikipediaAuthor(author, LIB.i18n.lang());
    if (!el || currentBook !== book) return;
    el.innerHTML = "";

    if (!wiki) {
      const p = document.createElement("p");
      p.className = "details-prose muted";
      p.textContent = "—";
      el.appendChild(p);
      return;
    }

    const art = document.createElement("div");
    art.className = "wiki-card";
    art.dir = "auto";
    art.innerHTML =
      (wiki.thumbnail ? `<img class="wiki-thumb" src="${esc(wiki.thumbnail)}" alt="" loading="lazy" />` : "") +
      `<div class="wiki-body">` +
        `<h4 class="wiki-title">${esc(wiki.title)}</h4>` +
        `<p class="wiki-extract">${esc(U.truncate(wiki.extract, 480))}</p>` +
        `<p class="wiki-note">${esc(t("details.wikipediaNote"))}</p>` +
        `<a class="wiki-link" href="${esc(wiki.url)}" target="_blank" rel="noopener">Wikipedia ↗</a>` +
      `</div>`;
    el.innerHTML = `<h3>${esc(t("details.author", { name: author }))}</h3>`;
    el.appendChild(art);
  }

  /** Keep shelf/cards favourites in sync with the modal. */
  function syncFavButtons(bookKey, added) {
    document.querySelectorAll(`[data-book-key="${CSS.escape(bookKey)}"] .fav-btn`)
      .forEach((b) => { b.classList.toggle("is-fav", added); b.setAttribute("aria-pressed", String(added)); });
  }

  function init() {
    document.getElementById("detailsClose").addEventListener("click", close);
    document.querySelector("[data-close-details]").addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !overlay().hidden) close();
    });

    // Bottom-sheet swipe-to-dismiss on mobile
    const grab = document.getElementById("detailsGrabber");
    let startY = null;
    grab.addEventListener("touchstart", (e) => { startY = e.touches[0].clientY; }, { passive: true });
    grab.addEventListener("touchmove", (e) => {
      if (startY == null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 0) sheet().style.transform = `translateY(${dy}px)`;
    }, { passive: true });
    grab.addEventListener("touchend", (e) => {
      if (startY == null) return;
      const dy = e.changedTouches[0].clientY - startY;
      sheet().style.transform = "";
      if (dy > 110) close();
      startY = null;
    });
  }

  return { open, close, init, syncFavButtons };
})();
