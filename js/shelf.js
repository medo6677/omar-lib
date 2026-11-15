/**
 * Shelf engine — renders wooden bookshelves of real books.
 * Desktop: cinematic 3D hover interactions (GSAP, fine-pointer only).
 * Mobile: horizontal snap-scrolling carousels with tap-to-select.
 */
window.LIB = window.LIB || {};
LIB.shelf = (function () {
  "use strict";
  const U = LIB.util;
  const esc = U.escapeHtml;

  const listEl = () => document.getElementById("shelfList");
  let observer = null;
  let shelfObserver = null; // reveal-on-scroll
  let loaded = new Set();
  let mm = null; // gsap.matchMedia instance

  function init() {
    const cfg = LIB.config;
    // Build empty shelf frames; data loads when the shelf scrolls near.
    cfg.shelves.forEach((shelf) => {
      const section = document.createElement("section");
      section.className = "shelf";
      section.id = "shelf-" + shelf.id;
      section.dataset.shelfId = shelf.id;
      section.innerHTML =
        `<div class="shelf-head">` +
          `<span class="shelf-icon" aria-hidden="true"><i data-lucide="${shelf.icon || 'book-open'}"></i></span>` +
          `<div><h3 class="shelf-label" dir="auto">${esc(shelf.en.label)}</h3>` +
          `<p class="shelf-blurb" dir="auto">${esc(shelf.en.blurb)}</p></div>` +
        `</div>` +
        `<div class="shelf-viewport">` +
          `<div class="shelf-track" role="list"></div>` +
          `<div class="shelf-board" aria-hidden="true"></div>` +
        `</div>`;
      listEl().appendChild(section);
    });

    if (LIB.ui && LIB.ui.refreshIcons) LIB.ui.refreshIcons(listEl());

    // Lazy data loading
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          loadShelf(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "1200px 0px" });
    document.querySelectorAll(".shelf").forEach((s) => observer.observe(s));

    // Reveal animation + label localization + 3D interactions
    shelfObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("is-visible");
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    document.querySelectorAll(".shelf").forEach((s) => shelfObserver.observe(s));

    setupGSAP();

    LIB.i18n.onChange(localize);
    localize(LIB.i18n.lang());
  }

  function localize(lang) {
    LIB.config.shelves.forEach((shelf) => {
      const el = document.getElementById("shelf-" + shelf.id);
      if (!el) return;
      const text = lang === "ar" ? shelf.ar : shelf.en;
      const label = el.querySelector(".shelf-label");
      const blurb = el.querySelector(".shelf-blurb");
      label.textContent = text.label;
      blurb.textContent = text.blurb;
      // Shelf labels follow the book's language, not the UI language
      const isArabicShelf = shelf.id === "arabic";
      label.dir = blurb.dir = isArabicShelf || lang === "ar" ? "rtl" : "ltr";
      label.classList.toggle("font-ar", isArabicShelf);
    });
  }

  /* ================= data loading ================= */
  /**
   * Resilient shelf loading:
   *   1. Gutendex topic query (primary — genuinely full-text books).
   *   2. If it hasn't answered within 6s, race it against an Open Library
   *      subject query so the shelf is never stuck on a degraded API.
   *   3. Last resort: Open Library alone.
   */
  async function loadShelfData(shelf) {
    const gut = LIB.api.gutendexSearch(shelf.query).catch(() => null);
    const quick = await Promise.race([gut, U.sleep(6000).then(() => null)]);
    if (quick && quick.books.length) return { books: quick.books, via: "gutendex" };

    const ol = LIB.api.openLibraryShelf(shelf).catch(() => null);
    const second = await Promise.race([
      gut.then((r) => (r && r.books.length ? r : null)),
      ol,
    ]);
    if (second && second.books.length) {
      return { books: second.books, via: second.via || (second.books[0] && second.books[0].source) || "openlibrary" };
    }

    // Last chance: wait out both (gutendex may still land)
    const gutLate = await Promise.race([gut, U.sleep(24000).then(() => null)]);
    if (gutLate && gutLate.books.length) return { books: gutLate.books, via: "gutendex" };
    const olLate = await ol;
    if (olLate && olLate.books.length) return { books: olLate.books, via: "openlibrary" };
    throw new Error("all_sources_failed");
  }

  async function loadShelf(sectionEl) {
    const shelf = LIB.config.shelves.find((s) => s.id === sectionEl.dataset.shelfId);
    if (!shelf || loaded.has(shelf.id)) return;
    loaded.add(shelf.id);
    const track = sectionEl.querySelector(".shelf-track");
    if (!track.querySelector(".skeleton-book") && !track.querySelector(".shelf-error")) {
      track.innerHTML = bookSkeletons(10);
    }

    try {
      const { books, via } = await loadShelfData(shelf);
      track.innerHTML = "";
      books.forEach((b) => track.appendChild(shelfBook(b, shelf)));
      attachInteractions(sectionEl);
      localize(LIB.i18n.lang());
      if (via === "openlibrary") markFallbackSource(sectionEl);
      revealBooks(sectionEl);
    } catch (e) {
      loaded.delete(shelf.id); // allow retry
      track.innerHTML = "";
      const err = document.createElement("button");
      err.className = "shelf-error";
      err.textContent = LIB.i18n.t("toast.shelfFail") + LIB.i18n.t("toast.retry");
      err.addEventListener("click", () => { track.innerHTML = bookSkeletons(10); loadShelf(sectionEl); });
      track.appendChild(err);
    }
  }

  /** Small note when a shelf loaded via the fallback provider. */
  function markFallbackSource(sectionEl) {
    const blurb = sectionEl.querySelector(".shelf-blurb");
    if (blurb && !blurb.dataset.fallback) {
      blurb.dataset.fallback = "1";
      blurb.textContent += " — Open Library";
    }
  }

  const bookSkeletons = (n) => Array.from({ length: n }, () =>
    `<div class="shelf-book skeleton-book" aria-hidden="true"><div class="skeleton-cover"></div></div>`).join("");

  /* ================= book element ================= */
  function shelfBook(book, shelf) {
    const el = document.createElement("button");
    el.className = "shelf-book";
    el.setAttribute("role", "listitem");
    el.setAttribute("aria-label", book.title + " — " + book.authors[0]);
    el.dataset.bookKey = book.key;
    el.dir = "auto";

    el.appendChild(LIB.ui.coverImg(book));
    if (book.fullText) {
      const dot = document.createElement("span");
      dot.className = "fulltext-dot";
      dot.title = LIB.i18n.t("badge.fulltext");
      el.appendChild(dot);
    }
    const label = document.createElement("span");
    label.className = "shelf-book-label";
    label.textContent = U.truncate(book.title, 30);
    el.appendChild(label);
    return el;
  }

  function revealBooks(sectionEl) {
    if (!window.gsap || LIB.ui.prefersReducedMotion()) return;
    const books = sectionEl.querySelectorAll(".shelf-book:not(.skeleton-book)");
    gsap.fromTo(books, { autoAlpha: 0, y: 18 }, {
      autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.045, ease: "power2.out",
      overwrite: "auto",
    });
  }

  /* ================= interactions ================= */
  function attachInteractions(sectionEl) {
    const finePointer = window.matchMedia("(hover:hover) and (pointer:fine)").matches;
    sectionEl.querySelectorAll(".shelf-book:not(.skeleton-book)").forEach((el) => {
      el.addEventListener("click", () => {
        const book = findBook(el);
        if (book) LIB.details.open(book);
      });
      if (finePointer && window.gsap && !LIB.ui.prefersReducedMotion()) {
        attachHover(el);
      }
    });
  }

  // Books are re-rendered per shelf load; keep a registry so we can reopen them.
  const registry = new Map();
  function register(book) {
    if (!registry.has(book.key)) registry.set(book.key, book);
    return registry.get(book.key);
  }
  function findBook(el) {
    const key = el.dataset.bookKey;
    if (!key) return null;
    if (registry.has(key)) return registry.get(key);
    // Fall back to reading data attributes embedded at render time
    const raw = el.dataset.book;
    if (raw) { try { return register(JSON.parse(raw)); } catch { return null; } }
    return null;
  }

  // We need the full book object on click — store it on the element.
  const _origShelfBook = shelfBook;
  shelfBook = function (book, shelf) {
    const el = _origShelfBook(book, shelf);
    el.dataset.book = JSON.stringify(book);
    return el;
  };

  function attachHover(el) {
    const lift = gsap.quickTo(el, "y", { duration: 0.3, ease: "power3.out" });
    const scale = gsap.quickTo(el, "scale", { duration: 0.3, ease: "power3.out" });
    const rot = gsap.quickTo(el, "rotateY", { duration: 0.4, ease: "power3.out" });
    const shadow = gsap.quickTo(el, "boxShadow", { duration: 0.3 });

    el.addEventListener("mouseenter", () => {
      lift(-16); scale(1.07); rot(6); zBoost(el, true);
      el.style.boxShadow = "0 22px 40px rgba(0,0,0,0.55)";
    });
    el.addEventListener("mouseleave", () => {
      lift(0); scale(1); rot(0); zBoost(el, false);
      el.style.boxShadow = "";
    });
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      rot(px * 12);
    });
  }

  function zBoost(el, up) {
    el.style.zIndex = up ? "20" : "";
  }

  function setupGSAP() {
    if (!window.gsap) return;
    if (window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
    mm = gsap.matchMedia();

    mm.add({
      isDesktop: "(min-width: 1280px)",
      isTablet: "(min-width: 768px) and (max-width: 1279px)",
      isMobile: "(max-width: 767px)",
      reduce: "(prefers-reduced-motion: reduce)",
    }, (ctx) => {
      const { isDesktop, reduce } = ctx.conditions;
      if (reduce) return;

      document.querySelectorAll(".shelf").forEach((el) => {
        gsap.fromTo(el.querySelector(".shelf-head"), { autoAlpha: 0, y: 20 }, {
          autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%", once: true },
        });
        if (isDesktop) {
          gsap.fromTo(el.querySelector(".shelf-viewport"), { autoAlpha: 0, x: -40 }, {
            autoAlpha: 1, x: 0, duration: 0.8, ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 80%", once: true },
          });
        }
      });
    });
  }

  /** i18n rerun after data loads (labels already localized inside loadShelf). */
  function refreshLabels() { localize(LIB.i18n.lang()); }

  return { init, refreshLabels };
})();
