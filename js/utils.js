/** Utilities: caching, rate limiting, resilient fetch, misc helpers. */
window.LIB = window.LIB || {};
LIB.util = (function () {
  "use strict";
  const cfg = LIB.config;
  const memoryCache = new Map(); // url -> {t, data}

  /* ---------- small helpers ---------- */
  const debounce = (fn, ms) => {
    let t;
    return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  };
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s || "");

  // Stable small hash for palettes / dedupe keys
  function hash(str) {
    let h = 5381;
    const s = String(str);
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function isArabicText(s) {
    if (!s) return false;
    const arabic = (s.match(/[\u0600-\u06FF]/g) || []).length;
    return arabic > String(s).length * 0.25;
  }

  /* ---------- storage-backed cache with TTL ---------- */
  function cacheGet(url) {
    const mem = memoryCache.get(url);
    if (mem && Date.now() - mem.t < cfg.cacheTTLMinutes * 60000) return mem.data;
    try {
      const raw = localStorage.getItem(cfg.storagePrefix + "cache:" + url);
      if (!raw) return null;
      const rec = JSON.parse(raw);
      if (Date.now() - rec.t > cfg.cacheTTLMinutes * 60000) {
        localStorage.removeItem(cfg.storagePrefix + "cache:" + url);
        return null;
      }
      memoryCache.set(url, rec);
      return rec.data;
    } catch { return null; }
  }

  function cacheSet(url, data) {
    const rec = { t: Date.now(), data };
    memoryCache.set(url, rec);
    try {
      localStorage.setItem(cfg.storagePrefix + "cache:" + url, JSON.stringify(rec));
    } catch {
      // Storage full — drop the oldest cache entries and retry once.
      try {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(cfg.storagePrefix + "cache:")) keys.push(k);
        }
        keys.sort((a, b) => (JSON.parse(localStorage.getItem(a)).t) - (JSON.parse(localStorage.getItem(b)).t));
        keys.slice(0, Math.ceil(keys.length / 2)).forEach((k) => localStorage.removeItem(k));
        localStorage.setItem(cfg.storagePrefix + "cache:" + url, JSON.stringify(rec));
      } catch { /* give up silently; memory cache still works */ }
    }
  }

  /* ---------- per-provider rate limiting ---------- */
  const limiters = new Map();
  function limiter(name, maxConcurrent, minGapMs) {
    if (!limiters.has(name)) {
      limiters.set(name, { max: maxConcurrent, gap: minGapMs, active: 0, queue: [], lastAt: 0 });
    }
    return limiters.get(name);
  }

  function pump(l) {
    while (l.active < l.max && l.queue.length) {
      const job = l.queue.shift();
      const wait = Math.max(0, l.lastAt + l.gap - Date.now());
      l.active++;
      l.lastAt = Date.now() + wait;
      setTimeout(async () => {
        try { job.resolve(await job.fn()); }
        catch (e) { job.reject(e); }
        finally { l.active--; pump(l); }
      }, wait);
    }
  }

  function throttled(name, maxConcurrent, minGapMs, fn) {
    return new Promise((resolve, reject) => {
      const l = limiter(name, maxConcurrent, minGapMs);
      l.queue.push({ fn, resolve, reject });
      pump(l);
    });
  }

  /* ---------- resilient JSON fetch ---------- */
  class ApiError extends Error {
    constructor(message, status) { super(message); this.status = status; }
  }

  // Per-provider timeouts — Gutendex can be slow under load, so it gets more room.
  const PROVIDER_TIMEOUTS = { gutendex: 30000, openlibrary: 20000, googlebooks: 15000, wikipedia: 12000 };

  async function fetchJSON(url, provider, opts = {}) {
    const cached = cacheGet(url);
    if (cached) return cached;

    const attempt = async () => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs || PROVIDER_TIMEOUTS[provider] || cfg.requestTimeoutMs);
      try {
        const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
        if (res.status === 429 || res.status >= 500) throw new ApiError("rate_limited", res.status);
        if (!res.ok) throw new ApiError("http_" + res.status, res.status);
        const data = await res.json();
        cacheSet(url, data);
        return data;
      } finally { clearTimeout(timer); }
    };

    const run = async () => {
      try {
        return await attempt();
      } catch (e) {
        // One polite retry for transient failures
        if (e.name === "AbortError" || e.status === 429 || e.status >= 500 || e.name === "TypeError") {
          await sleep(900);
          return await attempt();
        }
        throw e;
      }
    };

    const limits = {
      openlibrary: [cfg.openLibraryMaxConcurrent, cfg.openLibraryMinGapMs],
      googlebooks: [cfg.googleBooksMaxConcurrent, 60],
      gutendex: [2, 200],
      wikipedia: [3, 80],
      archive: [3, 60],
    };
    const [max, gap] = limits[provider] || [4, 60];
    return throttled(provider, max, gap, run);
  }

  async function fetchText(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new ApiError("http_" + res.status, res.status);
      return await res.text();
    } finally { clearTimeout(timer); }
  }

  return {
    debounce, clamp, sleep, escapeHtml, truncate, hash, isArabicText,
    cacheGet, cacheSet, fetchJSON, fetchText, ApiError,
  };
})();
