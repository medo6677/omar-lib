/**
 * Central configuration. Edit this file to customize the library.
 * Put your Google Books API key here (optional — the API also works without one
 * at lower rate limits).
 */
window.LIB = window.LIB || {};

LIB.config = {
  /* ---------- App identity ---------- */
  appName: "The Grand Library",
  appNameAr: "المكتبة الكبرى",

  /* ---------- API keys ---------- */
  googleBooksApiKey: "", // e.g. "AIza..." — leave empty to use the keyless endpoint

  /* ---------- Networking ---------- */
  cacheTTLMinutes: 360,        // how long API responses stay cached (localStorage)
  openLibraryMaxConcurrent: 3, // respect Open Library rate limits
  openLibraryMinGapMs: 120,    // minimum spacing between Open Library requests
  requestTimeoutMs: 15000,
  googleBooksMaxConcurrent: 4,
  gutendexMaxConcurrent: 4,

  /* ---------- Shelf catalog ----------
     Each shelf loads live data from Gutendex (Project Gutenberg's API).
     Full-text availability is genuine — every book here can be read. */
  shelves: [
    {
      id: "classics",
      query: { provider: "gutendex", topic: "classics,fiction", languages: "en" },
      subject: "Classic Literature",
      icon: "sparkles",
      en: { label: "Classic Fiction", blurb: "The enduring masterpieces of the novel." },
      ar: { label: "الروايات الكلاسيكية", blurb: "روايات خالدة صمدت عبر الزمن." },
    },
    {
      id: "adventure",
      query: { provider: "gutendex", topic: "adventure", languages: "en" },
      subject: "Adventure stories",
      icon: "compass",
      en: { label: "Adventure & Exploration", blurb: "Voyages, expeditions and daring journeys." },
      ar: { label: "المغامرة والاستكشاف", blurb: "رحلات بحرية وبرية وقصص بطولية." },
    },
    {
      id: "mystery",
      query: { provider: "gutendex", topic: "detective fiction", languages: "en" },
      subject: "Detective and mystery stories",
      icon: "search",
      en: { label: "Mystery & Detective", blurb: "Locked rooms, clues and cunning minds." },
      ar: { label: "الغموض والتحرّي", blurb: "جرائم وألغاز وعقول تحلّها." },
    },
    {
      id: "love",
      query: { provider: "gutendex", topic: "love", languages: "en" },
      subject: "Love stories",
      icon: "heart",
      en: { label: "Romance", blurb: "Stories of the heart, from courtly to modern." },
      ar: { label: "قصص الحب", blurb: "من الغزل القديم إلى الرواية الحديثة." },
    },
    {
      id: "poetry",
      query: { provider: "gutendex", topic: "poetry", languages: "en" },
      subject: "Poetry",
      icon: "feather",
      en: { label: "Poetry", blurb: "Verse that has echoed for centuries." },
      ar: { label: "الشعر", blurb: "قصائد ترنّم عبر القرون." },
    },
    {
      id: "philosophy",
      query: { provider: "gutendex", topic: "philosophy", languages: "en" },
      subject: "Philosophy",
      icon: "lightbulb",
      en: { label: "Philosophy", blurb: "The great questions, argued on paper." },
      ar: { label: "الفلسفة", blurb: "الأسئلة الكبرى، مُحترمة على الورق." },
    },
    {
      id: "history",
      query: { provider: "gutendex", topic: "history", languages: "en" },
      subject: "History",
      icon: "hourglass",
      en: { label: "History", blurb: "Empires, revolutions and ordinary lives." },
      ar: { label: "التاريخ", blurb: "إمبراطوريات وثورات وحياة يومية." },
    },
    {
      id: "science",
      query: { provider: "gutendex", topic: "science", languages: "en" },
      subject: "Science",
      icon: "atom",
      en: { label: "Science & Nature", blurb: "Discovery, written for curious minds." },
      ar: { label: "العلوم والطبيعة", blurb: "اكتشافات كُتبت للعقول الفضولية." },
    },
    {
      id: "arabic",
      query: { provider: "gutendex", topic: "", languages: "ar" },
      olLanguage: "ara",
      icon: "book-open",
      en: { label: "Arabic Collection", blurb: "Public-domain works in Arabic, read right-to-left." },
      ar: { label: "المؤلفات العربية", blurb: "مؤلفات مجال الملك العام بالعربية." },
    },
  ],

  /* Wikipedia host per UI language (author profiles switch with the interface) */
  wikipediaHost: { en: "en.wikipedia.org", ar: "ar.wikipedia.org" },

  /* localStorage key prefix (change to reset all user data) */
  storagePrefix: "lib:",
};
