/**
 * API providers. Every provider normalizes into the same Book shape:
 * { key, source, id, title, authors, year, lang, cover, coverLarge,
 *   description, fullText:{txt,html,epub}|null, previewUrl, originUrl }
 */
window.LIB = window.LIB || {};
LIB.api = (function () {
  "use strict";
  const U = LIB.util;
  const cfg = LIB.config;

  /* =====================================================================
     GUTENDEX — Project Gutenberg's API. Primary source for full-text books.
     ===================================================================== */
  async function gutendexSearch({ topic, languages, search, page = 1 }, opts = {}) {
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    if (languages) params.set("languages", languages);
    if (search) params.set("search", search);
    params.set("page", page);
    const url = "https://gutendex.com/books/?" + params.toString();
    let data;
    try {
      data = await U.fetchJSON(url, "gutendex", opts);
    } catch (e) {
      throw normalizeError(e, "gutendex");
    }
    return {
      books: (data.results || []).map(normalizeGutendex),
      count: data.count || 0,
      next: data.next,
    };
  }

  function normalizeGutendex(g) {
    const f = g.formats || {};
    const pick = (test) => Object.keys(f).find(test);
    const txtKey = pick((k) => k.endsWith(".txt.utf-8")) || pick((k) => k.startsWith("text/plain") && !k.endsWith(".zip"));
    const htmlKey = pick((k) => k.startsWith("text/html"));
    const epubKey = pick((k) => k === "application/epub+zip");
    const coverKey = pick((k) => k === "image/jpeg");
    const authors = (g.authors || []).map((a) => {
      let n = a.name || "";
      // Gutenberg stores "Dostoyevsky, Fyodor" — flip for display
      const m = n.match(/^(.+),\s*(.+)$/);
      if (m) n = m[2] + " " + m[1];
      return n.replace(/,?\s*\d{1,2}\s*BC.*$/, "").trim();
    });
    const year = g.authors && g.authors[0] && g.authors[0].birth_year
      ? "b. " + g.authors[0].birth_year : null;
    return {
      key: "gut:" + g.id,
      source: "gutendex",
      id: g.id,
      title: g.title || "Untitled",
      authors: authors.length ? authors : [i18nFallback("unknownAuthor")],
      year,
      lang: (g.languages || [])[0] || "en",
      cover: coverKey ? f[coverKey] : null,
      coverLarge: coverKey ? f[coverKey] : null,
      description: (g.summaries && g.summaries[0]) || (g.subjects || []).slice(0, 6).join(" · "),
      subjects: g.subjects || [],
      fullText: (txtKey || htmlKey) ? {
        txt: txtKey ? f[txtKey] : null,
        html: htmlKey ? f[htmlKey] : null,
        epub: epubKey ? f[epubKey] : null,
      } : null,
      previewUrl: null,
      originUrl: "https://www.gutenberg.org/ebooks/" + g.id,
    };
  }

  /* =====================================================================
     OPEN LIBRARY — primary discovery/metadata provider.
     ===================================================================== */
  async function openLibrarySearch(q, lang, limit = 24) {
    const params = new URLSearchParams({
      q, limit: String(limit),
      fields: "key,title,author_name,first_publish_year,cover_i,ebook_access,language,first_sentence",
    });
    if (lang && lang !== "all") params.set("language", lang);
    const url = "https://openlibrary.org/search.json?" + params.toString();
    let data;
    try {
      data = await U.fetchJSON(url, "openlibrary");
    } catch (e) {
      throw normalizeError(e, "openlibrary");
    }
    return {
      books: (data.docs || []).map(normalizeOpenLibrary),
      count: data.numFound || 0,
    };
  }

  function normalizeOpenLibrary(d) {
    const olid = (d.key || "").replace("/works/", "");
    const ebook = d.ebook_access || "no_ebook";
    return {
      key: "ol:" + olid,
      source: "openlibrary",
      id: olid,
      title: d.title || "Untitled",
      authors: d.author_name || [i18nFallback("unknownAuthor")],
      year: d.first_publish_year || null,
      lang: (d.language || [])[0] || "en",
      cover: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg?default=false` : null,
      coverLarge: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg?default=false` : null,
      description: d.first_sentence && d.first_sentence[0] ? d.first_sentence[0] : null,
      fullText: null,
      ia: d.ia || [],
      previewUrl: ebook !== "no_ebook" ? "https://openlibrary.org" + d.key : null,
      originUrl: "https://openlibrary.org" + d.key,
      ebookAccess: ebook,
    };
  }

  /* =====================================================================
     GOOGLE BOOKS — descriptions, covers, previews. Key optional.
     ===================================================================== */
  async function googleBooksSearch(q, lang, limit = 12) {
    const params = new URLSearchParams({ q, maxResults: String(Math.min(limit, 40)) });
    if (lang === "en") params.set("langRestrict", "en");
    if (lang === "ar") params.set("langRestrict", "ar");
    if (cfg.googleBooksApiKey) params.set("key", cfg.googleBooksApiKey);
    const url = "https://www.googleapis.com/books/v1/volumes?" + params.toString();
    let data;
    try {
      data = await U.fetchJSON(url, "googlebooks");
    } catch (e) {
      throw normalizeError(e, "googlebooks");
    }
    return { books: (data.items || []).map(normalizeGoogleBooks).filter(Boolean), count: data.totalItems || 0 };
  }

  function normalizeGoogleBooks(it) {
    const v = it.volumeInfo || {};
    if (!v.title) return null;
    let thumb = v.imageLinks && (v.imageLinks.thumbnail || v.imageLinks.smallThumbnail);
    if (thumb) thumb = thumb.replace(/^http:/, "https:").replace(/zoom=\d/, "zoom=1");
    return {
      key: "gb:" + it.id,
      source: "googlebooks",
      id: it.id,
      title: v.title,
      authors: v.authors || [i18nFallback("unknownAuthor")],
      year: v.publishedDate ? String(v.publishedDate).slice(0, 4) : null,
      lang: v.language || "en",
      cover: thumb || null,
      coverLarge: thumb ? thumb.replace(/width=\d+/, "width=400") : null,
      description: v.description || null,
      fullText: null,
      previewUrl: v.previewLink || null,
      originUrl: v.infoLink || (v.previewLink || null),
    };
  }

  /** Enrich a details view with a Google Books description when we have none. */
  async function googleBooksLookup(title, author) {
    const q = `intitle:"${title.replace(/"/g, "")}"${author ? ` inauthor:"${author.replace(/"/g, "")}"` : ""}`;
    const params = new URLSearchParams({ q, maxResults: "3" });
    if (cfg.googleBooksApiKey) params.set("key", cfg.googleBooksApiKey);
    const url = "https://www.googleapis.com/books/v1/volumes?" + params.toString();
    try {
      const data = await U.fetchJSON(url, "googlebooks");
      const hit = (data.items || []).find((i) => i.volumeInfo && i.volumeInfo.description);
      if (!hit) return null;
      const v = hit.volumeInfo;
      return {
        description: v.description,
        previewUrl: v.previewLink || null,
        year: v.publishedDate ? String(v.publishedDate).slice(0, 4) : null,
      };
    } catch { return null; } // enrichment is best-effort
  }

  /* =====================================================================
     WIKIPEDIA — author biographies / context (clearly labelled supplementary).
     ===================================================================== */
  async function wikipediaAuthor(name, lang = "en") {
    if (!name || name === i18nFallback("unknownAuthor")) return null;
    const host = cfg.wikipediaHost[lang] || "en.wikipedia.org";
    const clean = name.replace(/\(.*?\)/g, "").trim();
    // 1) Try the REST summary directly
    let sum = await restSummary(host, clean);
    // 2) Fall back to full-text search, then summarize best match
    if (!sum || sum.type === "disambiguation") {
      const sUrl = `https://${host}/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(clean)}&srlimit=3&format=json&origin=*`;
      try {
        const sData = await U.fetchJSON(sUrl, "wikipedia");
        const first = sData.query && sData.query.search && sData.query.search[0];
        if (first) sum = await restSummary(host, first.title);
      } catch { return null; }
    }
    if (!sum || !sum.extract) return null;
    return {
      title: sum.title,
      extract: sum.extract,
      url: sum.content_urls && sum.content_urls.desktop ? sum.content_urls.desktop.page : `https://${host}/wiki/${encodeURIComponent(sum.title)}`,
      thumbnail: sum.thumbnail && sum.thumbnail.source,
      host,
    };
  }

  async function restSummary(host, title) {
    const url = `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}?redirect=true`;
    try {
      const data = await U.fetchJSON(url, "wikipedia");
      return data.type === "disambiguation" ? data : data; // caller checks disambiguation
    } catch { return null; }
  }

  /* =====================================================================
     OPEN LIBRARY — subject shelf fallback (used when Gutendex is degraded).
     ===================================================================== */
  async function openLibraryShelf(shelf) {
    // Keep shelf fallbacks in the public-domain era: cap first publish year.
    // (OL's bare `language=` / range params only work inside `q=`.)
    const yearCap = shelf.olLanguage ? 1935 : 1929; // Arabic publishing history needs a little more room
    const clauses = [];
    if (shelf.subject) clauses.push(`subject:(${shelf.subject})`);
    if (shelf.olLanguage) clauses.push("language:" + shelf.olLanguage);
    if (!clauses.length) clauses.push("classics");
    clauses.push(`first_publish_year:[* TO ${yearCap}]`);
    const params = new URLSearchParams({
      q: clauses.join(" AND "),
      limit: "24",
      sort: "readinglog",
      fields: "key,title,author_name,first_publish_year,cover_i,ebook_access,language",
    });
    const url = "https://openlibrary.org/search.json?" + params.toString();
    try {
      const data = await U.fetchJSON(url, "openlibrary");
      return {
        books: (data.docs || []).map(normalizeOpenLibrary),
        count: data.numFound || 0,
        via: "openlibrary",
      };
    } catch (e) {
      throw normalizeError(e, "openlibrary");
    }
  }

  /* =====================================================================
     ARCHIVE.ORG — full-text fallback.
     Project Gutenberg text files don't send CORS headers, so the reader
     resolves a readable copy through the Internet Archive (which does).
     Works for both Gutenberg-origin books and Open Library scan records.
     ===================================================================== */
  /**
   * Build a ranked list of candidate full-text URLs on archive.org.
   * Strategy:
   *   1. archive.org's Gutenberg mirror items (…gut / TitlePg{id}) carry the
   *      CLEAN Gutenberg transcription (not OCR).
   *   2. Open Library `ia` scan records for public-domain works.
   *   3. Generic title+author search; lending-restricted items fail later.
   */
  async function archiveTextCandidates(book) {
    const candidates = [];
    if (book.ia && book.ia.length) {
      candidates.push(...(await iaCandidates(book.ia))); // trust OL's own records first
      if (candidates.length >= 2) return candidates;
    }
    const title = (book.title || "").replace(/["\\]/g, "").split(/[;:\[]/)[0].trim();
    const author = (book.authors[0] || "").replace(/["\\]/g, "").trim();
    const queries = [];
    if (book.source === "gutendex" && book.id) {
      // Deterministic mirror naming: "PrideAndPrejudicePg1342" — exact edition
      const camel = title.replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean)
        .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase()).join("");
      queries.push({ direct: camel + "Pg" + book.id });
      queries.push(`title:("${title}") AND collection:(gutenberg)`);
    }
    queries.push(`title:("${title}")${author ? ` AND creator:("${author}")` : ""} AND mediatype:texts`);

    for (const q of queries) {
      try {
        if (q.direct) {
          candidates.push(...(await iaCandidates([q.direct])));
          continue;
        }
        const url = "https://archive.org/advancedsearch.php?q=" + encodeURIComponent(q) +
          "&fl%5B%5D=identifier&rows=6&output=json";
        const data = await U.fetchJSON(url, "archive");
        let ids = ((data.response && data.response.docs) || []).map((d) => d.identifier);
        // Rank mirror items whose embedded Gutenberg ID matches this edition
        if (book.id) {
          const rank = (id) => {
            const m = String(id).match(/(\d{2,6})gut$/i);
            return m && m[1] === String(book.id) ? 2 : (id.endsWith("gut") ? 1 : 0);
          };
          ids = ids.slice().sort((a, b) => rank(b) - rank(a));
        }
        candidates.push(...(await iaCandidates(ids, true)));
        if (candidates.length >= 2) break; // enough verified candidates
      } catch { continue; }
    }
    // Dedupe by URL
    const seen = new Set();
    return candidates.filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true)));
  }

  /** Resolve identifiers → downloadable text URLs (first good pick per item). */
  async function iaCandidates(ids, cleanOnly) {
    const out = [];
    for (const id of (ids || []).slice(0, 5)) {
      if (!id) continue;
      try {
        const meta = await U.fetchJSON(`https://archive.org/metadata/${id}`, "archive");
        const files = meta.files || [];
        let pick = null;
        if (cleanOnly) {
          // Gutenberg mirrors: plain transcription files like "42324.txt" / "1661-8.txt"
          pick = files.find((f) => /^\d+(-8)?\.txt$/i.test(f.name) && !/_meta/i.test(f.name));
        }
        if (!pick) pick = files.find((f) => /_djvu\.txt$/i.test(f.name));
        if (!pick) pick = files.find((f) => /\.txt$/i.test(f.name) && !/readme|index|_meta/i.test(f.name));
        if (!pick) continue;
        out.push({
          url: `https://archive.org/download/${id}/${encodeURIComponent(pick.name)}`,
          id,
          ocr: !!/_djvu\.txt$/i.test(pick.name),
        });
      } catch { continue; }
    }
    return out;
  }

  /* =====================================================================
     Unified search across providers (progressive: reports each source
     as it settles so the UI never waits for a slow provider).
     ===================================================================== */
  async function unifiedSearch(q, lang, onSettle) {
    const tasks = [
      { name: "gutendex", run: () => gutendexSearch({ search: q, languages: lang === "all" ? "" : lang }, { timeoutMs: 15000 }) },
      { name: "openlibrary", run: () => openLibrarySearch(q, lang, 20) },
      { name: "googlebooks", run: () => googleBooksSearch(q, lang, 12) },
    ];
    tasks.forEach((t) => {
      t.run()
        .then((r) => onSettle && onSettle(t.name, r.books, []))
        .catch((e) => onSettle && onSettle(t.name, [], [t.name]));
    });
    return true; // results stream in via onSettle
  }

  /* ---------- errors ---------- */
  function normalizeError(e, provider) {
    if (e instanceof U.ApiError) {
      if (e.status === 429) return { provider, code: "rate_limited" };
      if (e.status >= 500) return { provider, code: "server" };
      return { provider, code: "http" };
    }
    if (e.name === "AbortError") return { provider, code: "timeout" };
    return { provider, code: "network" }; // offline / CORS
  }

  function i18nFallback(key) {
    try { return LIB.i18n.t(key); } catch { return key; }
  }

  return {
    gutendexSearch, openLibrarySearch, openLibraryShelf, googleBooksSearch, googleBooksLookup,
    wikipediaAuthor, unifiedSearch, archiveTextCandidates, normalizeError,
  };
})();
