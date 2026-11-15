/** Boot: loader, entrance animation, navigation, language switching. */
window.LIB = window.LIB || {};
(function () {
  "use strict";
  const cfg = LIB.config;
  const U = LIB.util;
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", boot);

  function boot() {
    LIB.i18n.init();
    LIB.i18n.onChange(retranslateDynamic);
    LIB.store.setLang(LIB.i18n.lang());

    wireNav();
    wireLangToggle();
    LIB.details.init();
    LIB.reader.init();
    LIB.search.init();
    LIB.collections.init();
    LIB.shelf.init();

    // Render Lucide icons for all static HTML elements
    if (window.lucide && window.lucide.createIcons) {
      window.lucide.createIcons();
    }

    entrance();
  }

  /* ================= ambient dust particles ================= */
  function createDust() {
    const wrap = document.getElementById("heroDust");
    if (!wrap) return;
    // Fewer particles on small screens / low-power devices
    const isSmall = window.matchMedia("(max-width: 767px)").matches;
    const count = isSmall ? 12 : 32;
    for (let i = 0; i < count; i++) {
      const d = document.createElement("i");
      d.style.left = Math.random() * 100 + "%";
      d.style.top = Math.random() * 100 + "%";
      const isSparkle = i % 4 === 0;
      if (isSparkle) {
        d.classList.add("is-sparkle");
        d.style.animationDelay = (Math.random() * 3).toFixed(2) + "s";
      }
      d.style.opacity = (0.15 + Math.random() * 0.55).toFixed(2);
      const s = isSparkle ? (2 + Math.random() * 2) : (1.5 + Math.random() * 2);
      d.style.width = d.style.height = s + "px";
      wrap.appendChild(d);
      if (window.gsap && !reduced()) {
        gsap.to(d, {
          y: -14 - Math.random() * 30, x: "+=" + (Math.random() * 20 - 10),
          duration: 5 + Math.random() * 7,
          repeat: -1, yoyo: true, ease: "sine.inOut", delay: Math.random() * 5,
        });
      }
    }
  }

  /* ================= navigation ================= */
  function wireNav() {
    const search = () => LIB.search.open();
    const favs = () => LIB.collections.open("favorites");
    const recent = () => LIB.collections.open("recent");

    document.getElementById("navSearch").addEventListener("click", search);
    document.getElementById("navFavorites").addEventListener("click", favs);
    document.getElementById("navRecent").addEventListener("click", recent);
    document.getElementById("heroSearch").addEventListener("click", search);

    // Mobile menu
    const menu = document.getElementById("mobileMenu");
    const btn = document.getElementById("menuBtn");
    const openMenu = () => {
      menu.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      document.body.classList.add("no-scroll");
      if (window.gsap && !reduced()) {
        gsap.fromTo(menu, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 });
        gsap.fromTo(menu.querySelector(".mobile-menu-panel"), { x: "-100%" }, { x: "0%", duration: 0.35, ease: "power3.out" });
      }
    };
    const closeMenu = () => {
      btn.setAttribute("aria-expanded", "false");
      const done = () => { menu.hidden = true; document.body.classList.remove("no-scroll"); };
      if (window.gsap && !reduced()) {
        gsap.to(menu.querySelector(".mobile-menu-panel"), { x: "-100%", duration: 0.25, onComplete: done });
        gsap.to(menu, { autoAlpha: 0, duration: 0.2 });
      } else done();
    };
    btn.addEventListener("click", openMenu);
    document.getElementById("mobileMenuClose").addEventListener("click", closeMenu);
    document.getElementById("mNavSearch").addEventListener("click", () => { closeMenu(); search(); });
    document.getElementById("mNavFavorites").addEventListener("click", () => { closeMenu(); favs(); });
    document.getElementById("mNavRecent").addEventListener("click", () => { closeMenu(); recent(); });
    menu.querySelectorAll("a[href]").forEach((a) => a.addEventListener("click", closeMenu));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) closeMenu(); });

    // Smooth in-page anchor scroll
    document.querySelectorAll('a[href="#shelves"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById("shelves");
        if (window.gsap && window.ScrollTrigger && !reduced()) {
          gsap.to(window, { scrollTo: { y: target, offsetY: 70 }, duration: 0.8, ease: "power3.inOut" });
        } else {
          target.scrollIntoView({ behavior: reduced() ? "auto" : "smooth" });
        }
      });
    });
  }

  /* ================= language toggle ================= */
  function wireLangToggle() {
    document.getElementById("langToggle").addEventListener("click", () => {
      LIB.i18n.apply(LIB.i18n.lang() === "en" ? "ar" : "en");
    });
  }

  /** Retranslate content rendered in JS (labels keep their own language). */
  function retranslateDynamic(lang) {
    LIB.shelf.refreshLabels();
    if (LIB.ui && LIB.ui.refreshIcons) LIB.ui.refreshIcons();
  }

  /* ================= cinematic entrance ================= */
  function entrance() {
    const loader = document.getElementById("loader");
    const bar = document.getElementById("loaderBar");
    const status = document.getElementById("loaderStatus");

    if (reduced() || !window.gsap) {
      loader.remove();
      document.body.classList.add("is-ready");
      return;
    }

    gsap.set([
      "#topbar", ".hero-eyebrow", ".hero-title", ".hero-sub",
      ".hero-actions .btn", ".hero-note",
      "#heroAstrolabe", "#heroBookLeft", "#heroBookRight",
      ".hero-floating-glyph", "#heroScroll"
    ], { autoAlpha: 0 });

    const tl = gsap.timeline();

    // Safety net: never let a throttled tab hold the loader hostage.
    let revealed = false;
    const forceReveal = () => {
      if (revealed) return;
      revealed = true;
      tl.kill();
      loader.remove();
      reveal();
    };
    const safety = setTimeout(forceReveal, 7000);

    tl.to(bar, { width: "70%", duration: 0.9, ease: "power1.inOut" })
      .to(status, { autoAlpha: 1, duration: 0.3 }, 0)
      // Preload the first two shelves so the reveal shows real books
      .call(() => { status.textContent = LIB.i18n.t("loader.loading"); prefetchFirstShelves(); })
      .to(bar, { width: "100%", duration: 1.4, ease: "power2.out" }, "<0.2")
      .to(loader.querySelector(".loader-inner"), { autoAlpha: 0, y: -18, duration: 0.5, ease: "power2.in" }, "+=0.35")
      .to(loader, {
        autoAlpha: 0, duration: 0.45,
        onComplete: () => { revealed = true; clearTimeout(safety); loader.remove(); reveal(); },
      });
  }

  function prefetchFirstShelves() {
    // Warm the caches for the first two shelves during the loader
    LIB.config.shelves.slice(0, 2).forEach((shelf) => {
      LIB.api.gutendexSearch(shelf.query).catch(() => {});
    });
  }

  function reveal() {
    document.body.classList.add("is-ready");
    createDust();
    const tl = gsap.timeline();
    tl.to("#topbar", { autoAlpha: 1, y: 0, duration: 0.6, ease: "power3.out" })
      .fromTo("#heroAstrolabe", { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 0.65, scale: 1, duration: 1.2, ease: "power2.out" }, "-=0.4")
      .fromTo(".hero-eyebrow", { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.5 }, "-=0.6")
      .fromTo(".hero-title", { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" }, "-=0.35")
      .fromTo(".hero-sub", { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.6 }, "-=0.45")
      .fromTo(".hero-actions .btn", { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08 }, "-=0.35")
      .fromTo(".hero-note", { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, "-=0.2")
      .fromTo("#heroBookLeft", { autoAlpha: 0, x: -35, scale: 0.85 }, { autoAlpha: 1, x: 0, scale: 1, duration: 1, ease: "back.out(1.2)" }, "-=0.7")
      .fromTo("#heroBookRight", { autoAlpha: 0, x: 35, scale: 0.85 }, { autoAlpha: 1, x: 0, scale: 1, duration: 1, ease: "back.out(1.2)" }, "-=0.85")
      .fromTo(".hero-floating-glyph", { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 0.45, scale: 1, duration: 0.8, stagger: 0.1 }, "-=0.5")
      .fromTo("#heroScroll", { autoAlpha: 0, y: -10 }, { autoAlpha: 0.75, y: 0, duration: 0.6 }, "-=0.3");

    wireHeroParallax();

    // First shelf book cascade (desktop only)
    gsap.matchMedia().add("(min-width: 1280px) and (prefers-reduced-motion: no-preference)", () => {
      const firstBooks = document.querySelector("#shelf-classics .shelf-book:not(.skeleton-book)");
      if (firstBooks) {
        gsap.fromTo("#shelf-classics .shelf-book", { autoAlpha: 0, y: 24, rotateZ: -2 }, {
          autoAlpha: 1, y: 0, rotateZ: 0, duration: 0.6, stagger: 0.05, ease: "power2.out", delay: 0.2,
        });
      }
    });
  }

  /* ================= interactive hero mouse parallax ================= */
  function wireHeroParallax() {
    if (reduced() || !window.gsap) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const hero = document.getElementById("hero");
    const bookLeft = document.getElementById("heroBookLeft");
    const bookRight = document.getElementById("heroBookRight");
    const astrolabe = document.getElementById("heroAstrolabe");
    const lantern = document.getElementById("heroLantern");
    const content = document.getElementById("heroContent");

    if (!hero) return;

    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    let rafId = null;

    function onMouseMove(e) {
      const rect = hero.getBoundingClientRect();
      if (e.clientY < 0 || e.clientY > rect.bottom + 60) return;

      const normX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const normY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      targetX = Math.max(-1, Math.min(1, normX));
      targetY = Math.max(-1, Math.min(1, normY));

      if (lantern) {
        gsap.to(lantern, {
          x: (e.clientX - rect.left) - rect.width / 2,
          y: (e.clientY - rect.top) - rect.height / 2,
          duration: 0.7,
          ease: "power2.out",
          overwrite: "auto",
        });
      }

      if (!rafId) {
        rafId = requestAnimationFrame(updateParallax);
      }
    }

    function updateParallax() {
      currentX += (targetX - currentX) * 0.07;
      currentY += (targetY - currentY) * 0.07;

      if (bookLeft) {
        bookLeft.style.transform = `translate3d(${currentX * -18}px, ${currentY * -14}px, 0)`;
      }
      if (bookRight) {
        bookRight.style.transform = `translate3d(${currentX * 22}px, ${currentY * 18}px, 0)`;
      }
      if (astrolabe) {
        astrolabe.style.transform = `translate(-50%, -50%) translate3d(${currentX * -8}px, ${currentY * -6}px, 0)`;
      }
      if (content) {
        content.style.transform = `translate3d(${currentX * 6}px, ${currentY * 4}px, 0)`;
      }

      const diff = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
      if (diff > 0.001) {
        rafId = requestAnimationFrame(updateParallax);
      } else {
        rafId = null;
      }
    }

    function onMouseLeave() {
      targetX = 0;
      targetY = 0;
      if (lantern) {
        gsap.to(lantern, { x: 0, y: 0, duration: 1.2, ease: "power2.out", overwrite: "auto" });
      }
      if (!rafId) {
        rafId = requestAnimationFrame(updateParallax);
      }
    }

    hero.addEventListener("mousemove", onMouseMove, { passive: true });
    hero.addEventListener("mouseleave", onMouseLeave);
  }
})();
