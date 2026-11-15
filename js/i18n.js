/** i18n: English / Arabic strings, RTL layout switching, Arabic typography. */
window.LIB = window.LIB || {};
LIB.i18n = (function () {
  "use strict";

  const strings = {
    en: {
      "app.title": "The Grand Library",
      "app.tagline": "A living archive of human thought",
      "loader.warming": "Warming the reading lamps…",
      "loader.loading": "Fetching books from the archives…",
      "nav.library": "Library",
      "nav.search": "Search",
      "nav.favorites": "Favorites",
      "nav.recent": "Recently Viewed",
      "hero.eyebrow": "EST. FOR EVERY READER",
      "hero.title": "Step into the stacks",
      "hero.sub": "Thousands of public-domain books, live from Open Library, Project Gutenberg & Google Books. Tap a spine to open it.",
      "hero.browse": "Browse the shelves",
      "hero.search": "Search the catalog",
      "hero.note": "Full-text reading for out-of-copyright works · Metadata & previews for everything else",
      "hero.scroll": "Explore",
      "shelves.title": "The Collections",
      "shelves.sub": "Curated by subject — loaded live from Project Gutenberg.",
      "search.placeholder": "Search titles, authors, subjects…",
      "search.all": "All languages",
      "search.initial": "Search across Project Gutenberg, Open Library and Google Books.",
      "search.searching": "Consulting the catalogs…",
      "search.none": "No books matched that search. Try different words, or another language.",
      "search.partial": "Some sources are unreachable right now — showing what we could load.",
      "search.failed": "The catalogs could not be reached. Check your connection and try again.",
      "search.retry": "Try again",
      "badge.fulltext": "Full text",
      "badge.preview": "Preview only",
      "badge.metadata": "Catalog record",
      "details.read": "Read now",
      "details.preview": "Open preview",
      "details.readScan": "Read (archive scan)",
      "details.origin": "View on {source}",
      "details.save": "Save to favorites",
      "details.saved": "Saved ✓",
      "details.about": "About this book",
      "details.author": "About {name}",
      "details.authorHeading": "About the author",
      "details.wikipediaNote": "Supplementary information from Wikipedia — not official catalog metadata.",
      "details.published": "First published",
      "details.language": "Language",
      "details.source": "Source",
      "details.noDescription": "No description is available for this record yet.",
      "details.continue": "Continue reading",
      "col.favorites": "Your Favorites",
      "col.favoritesEmpty": "Nothing saved yet. Tap the heart on any book to keep it here.",
      "col.recent": "Recently Viewed",
      "col.recentEmpty": "Books you open will appear here.",
      "col.clear": "Clear all",
      "col.count": "{n} book(s)",
      "reader.theme": "Theme",
      "reader.sourceGut": "Text: Project Gutenberg",
      "reader.sourceArchive": "Text: Internet Archive (OCR)",
      "reader.prev": "Previous",
      "reader.next": "Next",
      "reader.loading": "Opening the book…",
      "reader.loadfail": "The full text could not be loaded (network or access issue).",
      "reader.openexternal": "Open full text in a new tab",
      "reader.end": "The end — thank you for reading.",
      "unknownAuthor": "Unknown author",
      "toast.favAdded": "Saved to favorites",
      "toast.favRemoved": "Removed from favorites",
      "toast.network": "Network trouble — retrying…",
      "toast.shelfFail": "Couldn't load this shelf. ",
      "toast.retry": "Tap to retry.",
      "menu.open": "Menu",
      "footer.data": "Book data & covers: Open Library · Google Books · Project Gutenberg (Gutendex) · Author context: Wikipedia",
      "footer.license": "Full texts are public-domain works from Project Gutenberg. Author extracts are supplementary Wikipedia content, not official catalog metadata.",
    },
    ar: {
      "app.title": "المكتبة الكبرى",
      "app.tagline": "أرشيف حيّ للفكر الإنساني",
      "loader.warming": "نُشعل مصابيح القراءة…",
      "loader.loading": "نجلب الكتب من الأرشيف…",
      "nav.library": "المكتبة",
      "nav.search": "البحث",
      "nav.favorites": "المفضلة",
      "nav.recent": "شوهدت مؤخرًا",
      "hero.eyebrow": "لكلّ قارئ",
      "hero.title": "ادخل إلى الرفوف",
      "hero.sub": "آلاف الكتب الملحقة بالملك العام، مباشرة من Open Library وGutenberg وGoogle Books. المس ظهر الكتاب لفتحه.",
      "hero.browse": "تصفّح الرفوف",
      "hero.search": "ابحث في الفهرس",
      "hero.note": "قراءة كاملة للأعمال الخالية من الحقوق · بيانات ومعاينات لغير ذلك",
      "hero.scroll": "استكشف",
      "shelves.title": "المجموعات",
      "shelves.sub": "منتقاة بحسب الموضوع — تُحمّل مباشرة من مشروع Gutenberg.",
      "search.placeholder": "ابحث في العناوين والمؤلفين والموضوعات…",
      "search.all": "كل اللغات",
      "search.initial": "ابحث عبر Gutenberg وOpen Library وGoogle Books معًا.",
      "search.searching": "نراجع الفهارس…",
      "search.none": "لا نتائج مطابقة. جرّب كلمات أخرى أو لغة أخرى.",
      "search.partial": "بعض المصادر غير متاحة حاليًا — نعرض ما استطعنا تحميله.",
      "search.failed": "تعذّر الوصول إلى الفهارس. تحقق من الاتصال وحاول مجددًا.",
      "search.retry": "حاول مجددًا",
      "badge.fulltext": "نص كامل",
      "badge.preview": "معاينة فقط",
      "badge.metadata": "سجلّ فهرسي",
      "details.read": "اقرأ الآن",
      "details.preview": "افتح المعاينة",
      "details.readScan": "اقرأ (نسخة ممسوحة)",
      "details.origin": "عرض على {source}",
      "details.save": "أضف إلى المفضلة",
      "details.saved": "محفوظ ✓",
      "details.about": "عن هذا الكتاب",
      "details.author": "عن {name}",
      "details.authorHeading": "عن المؤلف",
      "details.wikipediaNote": "معلومات مكمّلة من ويكيبيديا — ليست بيانات فهرسية رسمية.",
      "details.published": "نُشر أول مرة",
      "details.language": "اللغة",
      "details.source": "المصدر",
      "details.noDescription": "لا يوجد وصف متاح لهذا السجل بعد.",
      "details.continue": "متابعة القراءة",
      "col.favorites": "مفضلتك",
      "col.favoritesEmpty": "لا شيء محفوظ بعد. المس القلب على أي كتاب لتحفظه هنا.",
      "col.recent": "شوهدت مؤخرًا",
      "col.recentEmpty": "الكتب التي تفتحها ستظهر هنا.",
      "col.clear": "مسح الكل",
      "col.count": "{n} كتاب",
      "reader.theme": "المظهر",
      "reader.sourceGut": "النص: مشروع Gutenberg",
      "reader.sourceArchive": "النص: Internet Archive (تعرّف ضوئي)",
      "reader.prev": "السابق",
      "reader.next": "التالي",
      "reader.loading": "نفتح الكتاب…",
      "reader.loadfail": "تعذّر تحميل النص الكامل (مشكلة شبكة أو وصول).",
      "reader.openexternal": "افتح النص الكامل في تبويب جديد",
      "reader.end": "النهاية — شكرًا لقراءتك.",
      "unknownAuthor": "مؤلف مجهول",
      "toast.favAdded": "أُضيف إلى المفضلة",
      "toast.favRemoved": "أُزيل من المفضلة",
      "toast.network": "مشكلة شبكة — نعيد المحاولة…",
      "toast.shelfFail": "تعذّر تحميل هذا الرف. ",
      "toast.retry": "المس لإعادة المحاولة.",
      "menu.open": "القائمة",
      "footer.data": "بيانات وغلاف الكتب: Open Library · Google Books · مشروع Gutenberg (Gutendex) · عن المؤلفين: ويكيبيديا",
      "footer.license": "النصوص الكاملة أعمال خالصة للملك العام من مشروع Gutenberg. مقتطفات المؤلفين مكمّلة من ويكيبيديا وليست بيانات رسمية.",
    },
  };

  let current = "en";
  const listeners = [];

  function t(key, vars) {
    let s = (strings[current] && strings[current][key]) || strings.en[key] || key;
    if (vars) Object.keys(vars).forEach((k) => { s = s.replace("{" + k + "}", vars[k]); });
    return s;
  }

  function apply(lang, opts) {
    current = lang === "ar" ? "ar" : "en";
    const rtl = current === "ar";
    document.documentElement.lang = current;
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.body.classList.toggle("lang-ar", rtl);
    document.body.classList.toggle("lang-en", !rtl);

    // Swap all translated text nodes
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });

    LIB.store.setLang(current);
    if (!opts || !opts.silent) listeners.forEach((fn) => fn(current, rtl));
    return current;
  }

  function init() {
    const saved = LIB.store.getLang();
    if (!saved) {
      // Auto-detect from the browser on first visit
      const nav = (navigator.language || "en").toLowerCase();
      current = nav.startsWith("ar") ? "ar" : "en";
      apply(current, { silent: true });
    } else {
      apply(saved, { silent: true });
    }
    current = document.body.classList.contains("lang-ar") ? "ar" : "en";
    return current;
  }

  const onChange = (fn) => listeners.push(fn);
  const lang = () => current;
  const isRTL = () => current === "ar";

  return { t, apply, init, onChange, lang, isRTL, strings };
})();
