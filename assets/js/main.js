/* ============================================================
   LAY'S — THE CRUNCH · main.js (100% own code)
   Lenis smooth scroll + GSAP ScrollTrigger, all vendored.
   Systems: pack-tear loader · canvas crisp storm (mouse wind) ·
   count-ups · horizontal flavour runway (desktop) / sticky
   panels (mobile) · pinned 4-step journey · sticky moment
   stack · scroll-scrubbed finale line with velocity skew.
   ============================================================ */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof gsap !== "undefined";
  if (hasGsap && typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

  /* ---------------- loader : pack tear ---------------- */
  var loader = document.getElementById("loader");
  document.body.classList.add("is-loading");
  var loaderDone = false;
  function finishLoader() {
    if (loaderDone || !loader) return;
    loaderDone = true;
    document.body.classList.remove("is-loading");
    if (hasGsap && !reduced) {
      var tl = gsap.timeline({
        onComplete: function () { loader.remove(); heroIntro(); }
      });
      tl.to(".loader-core", { yPercent: -30, opacity: 0, duration: .38, ease: "power2.in" })
        .to(".loader-panel--left", { xPercent: -103, rotate: -2.5, duration: .85, ease: "power4.inOut" }, "-=.05")
        .to(".loader-panel--right", { xPercent: 103, rotate: 2.5, duration: .85, ease: "power4.inOut" }, "<");
    } else {
      loader.remove();
      heroIntro();
    }
  }
  window.addEventListener("load", function () { setTimeout(finishLoader, 650); });
  setTimeout(finishLoader, 2600); /* failsafe — loader can never trap the page */

  /* ---------------- smooth scroll ---------------- */
  var lenis = null;
  if (!reduced && typeof Lenis !== "undefined" && hasGsap) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToTarget(target) {
    if (lenis) lenis.scrollTo(target, { duration: 1.4 });
    else {
      var el = typeof target === "string" ? document.querySelector(target) : target;
      if (el === 0 || target === 0) window.scrollTo({ top: 0, behavior: "smooth" });
      else if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id.length > 1 && document.querySelector(id)) { e.preventDefault(); scrollToTarget(id); }
      else if (id === "#top") { e.preventDefault(); scrollToTarget(0); if (lenis) lenis.scrollTo(0, { duration: 1.4 }); }
    });
  });
  var toTop = document.getElementById("toTop");
  if (toTop) toTop.addEventListener("click", function () {
    if (lenis) lenis.scrollTo(0, { duration: 1.5 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  });

  /* ---------------- hero intro + crisp storm ---------------- */
  var heroPlayed = false;
  function heroIntro() {
    if (heroPlayed) return;
    heroPlayed = true;
    if (!hasGsap || reduced) return;
    gsap.fromTo(".hero-title .ht-inner",
      { yPercent: 112 },
      { yPercent: 0, duration: 1.15, ease: "power4.out", stagger: .09 });
    gsap.fromTo(".hero-kicker, .hero-sub",
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, duration: .9, ease: "power3.out", stagger: .12, delay: .35 });
    gsap.fromTo(".hero-sun", { scale: .6, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.4, ease: "power3.out" });
  }
  /* If GSAP failed to load, hero text must still be visible: it is —
     all initial states are set by GSAP itself (fromTo), never by CSS. */

  (function crispStorm() {
    if (reduced) return;
    var canvas = document.getElementById("crispCanvas");
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var srcs = ["cf-1.png", "cf-2.png", "cf-3.png", "cf-4.png", "cf-5.png"];
    var imgs = [], loaded = 0;
    srcs.forEach(function (s) {
      var im = new Image();
      im.onload = function () { loaded++; };
      im.src = "assets/images/v5/crisps/" + s;
      imgs.push(im);
    });
    var W, H, chips = [], running = true, mouseX = .5, wind = 0, lastMouseX = null;
    var COUNT = window.innerWidth < 820 ? 14 : 26;
    function size() {
      var r = canvas.parentElement.getBoundingClientRect();
      W = canvas.width = r.width;
      H = canvas.height = r.height;
    }
    function make(y) {
      var s = .35 + Math.random() * .95;
      return {
        x: Math.random() * (W + 200) - 100,
        y: y !== undefined ? y : Math.random() * -H,
        s: s,
        vy: .55 + Math.random() * 1.15,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: .008 + Math.random() * .02,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - .5) * .012,
        img: imgs[Math.floor(Math.random() * imgs.length)],
        flip: Math.random() > .5 ? 1 : -1
      };
    }
    size();
    for (var i = 0; i < COUNT; i++) { var c = make(); c.y = Math.random() * H; chips.push(c); }
    window.addEventListener("resize", size);
    window.addEventListener("pointermove", function (e) {
      var nx = e.clientX / window.innerWidth;
      if (lastMouseX !== null) wind += (nx - lastMouseX) * 26;
      lastMouseX = nx; mouseX = nx;
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { running = en[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
    }
    (function tick() {
      requestAnimationFrame(tick);
      if (!running || loaded === 0) return;
      ctx.clearRect(0, 0, W, H);
      wind *= .94;
      for (var i = 0; i < chips.length; i++) {
        var ch = chips[i];
        ch.sway += ch.swaySpeed;
        ch.y += ch.vy;
        ch.x += Math.sin(ch.sway) * .7 + wind * ch.s + (mouseX - .5) * .35;
        ch.rot += ch.vr;
        var wpx = 150 * ch.s, hpx = wpx * (ch.img.height / ch.img.width || .8);
        if (ch.y - hpx > H + 40) chips[i] = ch = make(-hpx - 20);
        if (ch.x > W + 190) ch.x = -180; if (ch.x < -190) ch.x = W + 180;
        ctx.save();
        ctx.translate(ch.x, ch.y);
        ctx.rotate(ch.rot);
        ctx.scale(ch.flip, 1);
        ctx.shadowColor = "rgba(26,14,8,.35)";
        ctx.shadowBlur = 18; ctx.shadowOffsetY = 12;
        ctx.drawImage(ch.img, -wpx / 2, -hpx / 2, wpx, hpx);
        ctx.restore();
      }
    })();
  })();

  if (!hasGsap) return;

  /* ---------------- scroll motion ---------------- */
  if (!reduced) {

    /* hero: sun + ribbon drift on the way out */
    gsap.to(".hero-sun", {
      yPercent: 26, scale: 1.12, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(".hero-ribbon-track", {
      xPercent: -14, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(".hero-inner", {
      yPercent: -8, opacity: .25, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 35%", scrub: true }
    });

    /* section titles: masked line rises */
    gsap.utils.toArray("[data-reveal]").forEach(function (el) {
      gsap.fromTo(el, { yPercent: 112 }, {
        yPercent: 0, duration: 1.1, ease: "power4.out",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });

    /* numbers: ghost year slides, counters count */
    gsap.fromTo(".numbers-ghost", { xPercent: 4 }, {
      xPercent: -16, ease: "none",
      scrollTrigger: { trigger: ".numbers", start: "top bottom", end: "bottom top", scrub: true }
    });
    gsap.utils.toArray("[data-count]").forEach(function (el) {
      var end = parseInt(el.getAttribute("data-count"), 10);
      var obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: 1.6, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 86%" },
        onUpdate: function () { el.textContent = String(Math.round(obj.v)); },
        onComplete: function () { el.textContent = String(end); }
      });
    });
    gsap.utils.toArray(".stat").forEach(function (el, i) {
      gsap.fromTo(el, { y: 54, opacity: 0 }, {
        y: 0, opacity: 1, duration: .9, ease: "power3.out", delay: i * .08,
        scrollTrigger: { trigger: el, start: "top 90%" }
      });
    });

    /* flavours */
    var mm = gsap.matchMedia();
    mm.add("(min-width: 821px)", function () {
      var track = document.getElementById("runwayTrack");
      var runway = document.getElementById("runway");
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tween = gsap.to(track, {
        x: function () { return -dist(); },
        ease: "none",
        scrollTrigger: {
          trigger: runway, start: "top top",
          end: function () { return "+=" + dist(); },
          pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true
        }
      });
      gsap.utils.toArray(".panel-crisp").forEach(function (img) {
        gsap.fromTo(img, { rotate: -14, y: 30 }, {
          rotate: 10, y: -18, ease: "none",
          scrollTrigger: { trigger: img.closest(".panel"), containerAnimation: tween, start: "left right", end: "right left", scrub: true }
        });
      });
      return function () {};
    });
    mm.add("(max-width: 820px)", function () {
      gsap.utils.toArray(".panel").forEach(function (p, i) {
        p.style.top = "calc(var(--head-h) + " + i * 10 + "px)";
        gsap.fromTo(p, { y: 70, opacity: .35 }, {
          y: 0, opacity: 1, duration: .7, ease: "power2.out",
          scrollTrigger: { trigger: p, start: "top 92%" }
        });
      });
      return function () { gsap.utils.toArray(".panel").forEach(function (p) { p.style.top = ""; }); };
    });

    /* journey: pinned 4-step scrub */
    var steps = gsap.utils.toArray(".step");
    var segs = gsap.utils.toArray(".jp-seg");
    steps.forEach(function (s, i) {
      if (i === 0) gsap.set(s, { clipPath: "inset(0% 0 0 0)", visibility: "visible" });
      else gsap.set(s, { clipPath: "inset(100% 0 0 0)", visibility: "visible" });
      gsap.set(s.querySelector(".step-content"), { y: 60, opacity: 0 });
      gsap.set(s.querySelector(".step-img"), { scale: 1.14 });
    });
    gsap.set(steps[0].querySelector(".step-content"), { y: 0, opacity: 1 });
    var jtl = gsap.timeline({
      scrollTrigger: {
        trigger: "#journeyPin", start: "top top",
        end: "+=" + window.innerHeight * 3.4,
        pin: ".journey", scrub: 1, anticipatePin: 1,
        onUpdate: function (self) {
          var idx = Math.min(3, Math.floor(self.progress * 4));
          segs.forEach(function (sg, i) { sg.classList.toggle("is-on", i <= idx); });
        }
      }
    });
    /* Each step: transition ~0.55 units, then a solid HOLD so the step
       reads fully settled for most of its scroll dwell. */
    jtl.to(steps[0].querySelector(".step-img"), { scale: 1.02, duration: 1.5, ease: "none" }, 0);
    steps.forEach(function (s, i) {
      if (i === 0) return;
      var t = 0.6 + (i - 1) * 1.6;
      jtl.to(steps[i - 1].querySelector(".step-content"), { y: -46, opacity: 0, duration: .28, ease: "power1.in" }, t)
         .to(s, { clipPath: "inset(0% 0 0 0)", duration: .55, ease: "power2.inOut" }, t + .05)
         .fromTo(s.querySelector(".step-img"), { scale: 1.15 }, { scale: 1.02, duration: 1.5, ease: "none" }, t + .05)
         .to(s.querySelector(".step-content"), { y: 0, opacity: 1, duration: .3, ease: "power2.out" }, t + .42);
    });
    jtl.to({}, { duration: .8 }); /* final hold on SEASONED */

    /* moments: sticky stack settle — scale down + dim overlay as the
       next card covers (filter tweens proved unreliable; overlay is not) */
    gsap.utils.toArray(".moment").forEach(function (card, i, arr) {
      var dim = document.createElement("div");
      dim.className = "moment-dim";
      card.appendChild(dim);
      if (i === arr.length - 1) return;
      gsap.to(card, {
        scale: .93, ease: "none",
        scrollTrigger: { trigger: arr[i + 1], start: "top bottom", end: "top top+=120", scrub: true }
      });
      gsap.to(dim, {
        opacity: .5, ease: "none",
        scrollTrigger: { trigger: arr[i + 1], start: "top bottom", end: "top top+=120", scrub: true }
      });
    });

    /* finale: scrub line + velocity skew */
    var scrubText = document.querySelector(".finale-scrub-text");
    gsap.fromTo(scrubText, { xPercent: 2 }, {
      xPercent: -38, ease: "none",
      scrollTrigger: { trigger: ".finale", start: "top bottom", end: "bottom top", scrub: true }
    });
    var skewSetter = gsap.quickTo(scrubText, "skewX", { duration: .45, ease: "power3" });
    ScrollTrigger.create({
      onUpdate: function (self) {
        var v = gsap.utils.clamp(-14, 14, self.getVelocity() / -320);
        skewSetter(v);
      }
    });
    gsap.fromTo(".finale-frame", { y: 90, rotate: -1.4 }, {
      y: 0, rotate: 0, duration: 1.1, ease: "power3.out",
      scrollTrigger: { trigger: ".finale-frame", start: "top 88%" }
    });
    gsap.fromTo(".footer-word", { yPercent: 34 }, {
      yPercent: 0, duration: 1.1, ease: "power4.out",
      scrollTrigger: { trigger: ".footer", start: "top 82%" }
    });
  }

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();
