/**
 * Reader — reads genuine Project Gutenberg full texts.
 * One page at a time, vertical scroll when a page is longer than the screen,
 * sticky toolbar, font size + theme controls (persisted), automatic RTL for
 * Arabic texts, and reading progress saved per book.
 */
window.LIB = window.LIB || {};
LIB.reader = (function () {
  "use strict";
  const U = LIB.util;

  const el = () => document.getElementById("reader");
  const pageEl = () => document.getElementById("readerPage");

  const FONT_STEPS = ["17px", "19px", "21px", "24px", "27px", "31px"];
  const THEMES = ["light", "sepia", "dark"];

  let book = null;
  let currentVia = null;    // "gutendex" | "archive"
  let pages = [];          // array of arrays of paragraph indices
  let paragraphs = [];
  let current = 0;
  let firstParaOfPage = 0; // anchor for re-chunking
  let rafId = null;

  /* ================= open / close ================= */
  function open(target) {
    if (!target) return;
    const readable = target.fullText || (target.ia && target.ia.length);
    if (!readable) {
      LIB.ui.toast(LIB.i18n.t("badge.preview"), { tone: "warn" });
      if (target.previewUrl) window.open(target.previewUrl, "_blank", "noopener");
      return;
    }
    book = target;
    book.fullText = target.fullText || {};
    document.body.classList.add("no-scroll");
    const r = el();
    r.hidden = false;
    const prefs = LIB.store.getPrefs();
    applyFont(prefs.fontSize);
    applyTheme(prefs.theme);
    const saved = LIB.store.getProgress(book.key);
    current = saved && saved.para != null ? saved.para : 0;
    showLoading();
    loadText();
  }

  function close() {
    const r = el();
    if (window.gsap && !LIB.ui.prefersReducedMotion()) {
      gsap.to(r, { autoAlpha: 0, duration: 0.25, onComplete: () => { r.hidden = true; gsap.set(r, { autoAlpha: 1 }); } });
    } else {
      r.hidden = true;
    }
    book = null;
    if (!Array.from(document.querySelectorAll(".overlay")).some((o) => !o.hidden)) {
      document.body.classList.remove("no-scroll");
    }
  }

  /* ================= text loading & chunking ================= */
  function showLoading() {
    pageEl().innerHTML = `<div class="reader-loading">${LIB.util.escapeHtml(LIB.i18n.t("reader.loading"))}</div>`;
    document.getElementById("readerTitle").textContent = book.title;
    document.getElementById("readerSource").textContent = "";
    document.getElementById("readerPageNum").textContent = "…";
    document.getElementById("readerProgress").textContent = "";
  }

  async function loadText() {
    const ft = book.fullText || {};
    const candidates = [ft.txt, ft.txt && String(ft.txt).replace("/files/", "/cache/epub/").replace(/\/\d+-0\.txt$/, "/pg" + book.id + ".txt"), ft.html]
      .filter(Boolean);
    let text = null;
    let via = null;
    for (const url of candidates) {
      try { text = await U.fetchText(url); via = "gutendex"; break; }
      catch (e) { /* try the next candidate */ }
    }
    // Gutenberg files don't send CORS headers everywhere — resolve a readable
    // copy through the Internet Archive before giving up.
    if (!text) {
      try {
        const candidates = await LIB.api.archiveTextCandidates(book);
        for (const c of candidates) {
          try { text = await U.fetchText(c.url); via = "archive"; break; }
          catch (e) { /* restricted or unavailable — try the next */ }
        }
      } catch (e) { /* fall through to the friendly fallback */ }
    }
    if (!text) { showFallback(); return; }
    if (via === "archive") text = cleanOcr(text);
    currentVia = via;

    text = cleanIntro(stripGutenbergBoilerplate(text));
    paragraphs = text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter((p) => p.length > 0);
    if (!paragraphs.length) { showFallback(); return; }

    // Direction: Arabic text reads right-to-left
    const rtl = U.isArabicText(paragraphs.slice(0, 40).join(" "));
    pageEl().dir = rtl ? "rtl" : "ltr";
    pageEl().classList.toggle("reader-rtl", rtl);

    firstParaOfPage = clampToParagraph(current);
    chunkPages();
    current = pageForParagraph(firstParaOfPage);
    showPage(current, true);
  }

  function stripGutenbergBoilerplate(text) {
    const t = text.replace(/\r\n/g, "\n");
    const start = t.match(/^\s*\*{3}\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*$/im);
    const end = t.match(/^\s*\*{3}\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*$/im);
    let s = 0, e = t.length;
    if (start) s = t.indexOf(start[0]) + start[0].length;
    if (end) e = t.indexOf(end[0]);
    return t.slice(s, e).trim();
  }

  /** Archive.org scan texts are OCR — clean obvious scan artifacts. */
  function cleanOcr(text) {
    return text.replace(/\r\n/g, "\n")
      .split("\n")
      .filter((line) => !/^\s*\d{1,4}\s*$/.test(line))      // standalone page numbers
      .map((line) => line.replace(/\s{2,}/g, " ").trimEnd())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n");
  }

  /** Drop transcription credits and illustration markers common to both sources. */
  function cleanIntro(text) {
    return text
      .replace(/^\s*Produced by[\s\S]*?\n\s*\n/m, "")        // PG transcription credits
      .replace(/\[Illustration[^\]]*\]/g, "")                // OCR illustration markers
      .trim();
  }

  function charsPerPage() {
    const area = window.innerWidth * window.innerHeight;
    return U.clamp(Math.round(1500 * (area / (1280 * 800))), 700, 5200);
  }

  function chunkPages() {
    pages = [];
    let buf = [], size = 0;
    const budget = charsPerPage();
    for (let i = 0; i < paragraphs.length; i++) {
      buf.push(i);
      size += paragraphs[i].length;
      if (size >= budget) { pages.push(buf); buf = []; size = 0; }
    }
    if (buf.length) pages.push(buf);
    if (!pages.length) pages = [[0]];
  }

  const clampToParagraph = (n) => U.clamp(n, 0, Math.max(paragraphs.length - 1, 0));
  const pageForParagraph = (pi) => Math.max(0, pages.findIndex((p) => p.includes(pi)));

  /* ================= rendering ================= */
  function showPage(idx, animate) {
    idx = U.clamp(idx, 0, pages.length - 1);
    current = idx;
    firstParaOfPage = pages[idx][0];

    const frag = document.createDocumentFragment();
    pages[idx].forEach((pi) => {
      const p = document.createElement("p");
      p.textContent = paragraphs[pi];
      frag.appendChild(p);
    });
    if (idx === pages.length - 1) {
      const fin = document.createElement("p");
      fin.className = "reader-theend";
      fin.textContent = "❦ " + LIB.i18n.t("reader.end");
      frag.appendChild(fin);
    }
    pageEl().innerHTML = "";
    pageEl().appendChild(frag);

    document.getElementById("readerPageNum").textContent = `${idx + 1} / ${pages.length}`;
    document.getElementById("readerProgress").textContent = Math.round(((idx + 1) / pages.length) * 100) + "%";
    document.getElementById("readerSource").textContent = currentVia === "archive"
      ? LIB.i18n.t("reader.sourceArchive")
      : LIB.i18n.t("reader.sourceGut");
    document.getElementById("readerPrev").disabled = idx === 0;
    document.getElementById("readerNext").disabled = idx === pages.length - 1;

    if (animate && window.gsap && !LIB.ui.prefersReducedMotion()) {
      gsap.fromTo(pageEl().children, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.02, ease: "power2.out" });
    }
    LIB.store.setProgress(book.key, { para: firstParaOfPage, page: idx + 1, pages: pages.length, at: Date.now() });
    LIB.store.pushRecent(book);
  }

  function nextPage() { if (current < pages.length - 1) showPage(current + 1, true); }
  function prevPage() { if (current > 0) showPage(current - 1, true); }

  function showFallback() {
    document.getElementById("readerPage").innerHTML = "";
    const fb = document.getElementById("readerFallback");
    fb.hidden = false;
    const link = document.getElementById("readerExternal");
    const ft = book.fullText || {};
    link.href = ft.txt || ft.html || book.originUrl || "#";
  }

  /* ================= preferences ================= */
  function applyFont(step) {
    const s = U.clamp(step, 1, 6);
    el().style.setProperty("--reader-font", FONT_STEPS[s - 1]);
    document.getElementById("readerFontMinus").disabled = s <= 1;
    document.getElementById("readerFontPlus").disabled = s >= 6;
  }

  function changeFont(delta) {
    const prefs = LIB.store.getPrefs();
    const next = U.clamp((prefs.fontSize || 3) + delta, 1, 6);
    LIB.store.setPrefs({ fontSize: next });
    applyFont(next);
  }

  function applyTheme(theme) {
    THEMES.forEach((th) => el().classList.remove("theme-" + th));
    const th = THEMES.includes(theme) ? theme : "sepia";
    el().classList.add("theme-" + th);
  }

  function cycleTheme() {
    const cur = THEMES.find((th) => el().classList.contains("theme-" + th)) || "sepia";
    const next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
    LIB.store.setPrefs({ theme: next });
    applyTheme(next);
  }

  /* ================= init & events ================= */
  function init() {
    document.getElementById("readerBack").addEventListener("click", close);
    document.getElementById("readerPrev").addEventListener("click", prevPage);
    document.getElementById("readerNext").addEventListener("click", nextPage);
    document.getElementById("readerFontPlus").addEventListener("click", () => changeFont(1));
    document.getElementById("readerFontMinus").addEventListener("click", () => changeFont(-1));
    document.getElementById("readerTheme").addEventListener("click", cycleTheme);

    document.addEventListener("keydown", (e) => {
      if (el().hidden) return;
      const rtl = pageEl().dir === "rtl";
      if (e.key === "ArrowRight") rtl ? prevPage() : nextPage();
      if (e.key === "ArrowLeft") rtl ? nextPage() : prevPage();
      if (e.key === "Escape") close();
    });

    // Touch swipe between pages
    const stage = el().querySelector(".reader-stage");
    let x0 = null, y0 = null;
    stage.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        const rtl = pageEl().dir === "rtl";
        const forward = rtl ? dx > 0 : dx < 0;
        forward ? nextPage() : prevPage();
      }
      x0 = y0 = null;
    }, { passive: true });

    // Re-chunk on resize so pages stay comfortable
    window.addEventListener("resize", U.debounce(() => {
      if (!book || paragraphs.length === 0) return;
      const anchor = firstParaOfPage;
      chunkPages();
      showPage(pageForParagraph(anchor), false);
    }, 350));
  }

  return { open, close, init };
})();
