/* Lay's V2 — main choreography (own code)
   Lenis smooth scroll + GSAP ScrollTrigger scene engine.
   Scroll drives: sticky stages, text-block cycling, the WebGL state
   (window.__sceneState), header / scene-navi / scene-indicator chrome. */
(function () {
  'use strict';
  gsap.registerPlugin(ScrollTrigger);

  var S = window.__sceneState; // webgl state (may be undefined if WebGL failed)
  function setGL(patch) { if (S) Object.assign(S, patch); }
  function col(hex) { return S ? new THREE.Color(hex) : null; }

  /* ---------------- Lenis ---------------- */
  var lenis = null;
  try {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  } catch (e) { lenis = null; }
  function scrollTo(target) {
    var el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.6 });
    else el.scrollIntoView({ behavior: 'smooth' });
  }

  /* ---------------- split hero letters ---------------- */
  document.querySelectorAll('.split').forEach(function (el) {
    var text = el.textContent;
    el.textContent = '';
    text.split('').forEach(function (c) {
      var s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c === ' ' ? ' ' : c;
      el.appendChild(s);
    });
  });

  /* ---------------- loader ---------------- */
  var loader = document.getElementById('loader');
  var pctEl = document.getElementById('loaderPct');
  var wordEl = document.querySelector('.loader-word');
  var plateImgs = Array.prototype.slice.call(document.querySelectorAll('.loader-imgs img'));
  var plateIdx = 0;
  var plateTimer = setInterval(function () {
    plateImgs.forEach(function (im, i) { im.classList.toggle('on', i === plateIdx % plateImgs.length); });
    plateIdx++;
  }, 420);
  var assets = ['assets/images/plates/plate-1.jpg', 'assets/images/plates/plate-2.jpg', 'assets/images/plates/plate-3.jpg',
    'assets/images/plates/plate-4.jpg', 'assets/images/plates/plate-5.jpg', 'assets/video/card-concept.jpg',
    'assets/video/card-craft.jpg', 'assets/video/card-product.jpg', 'assets/video/card-voices.jpg'];
  var loadedCount = 0, loaderDone = false;
  function loaderProgress() {
    var p = Math.round((loadedCount / assets.length) * 100);
    if (pctEl) pctEl.textContent = p + '%';
    if (wordEl) wordEl.style.setProperty('--fill', p + '%');
    if (loadedCount >= assets.length) finishLoader();
  }
  assets.forEach(function (src) {
    var im = new Image();
    im.onload = im.onerror = function () { loadedCount++; loaderProgress(); };
    im.src = src;
  });
  setTimeout(finishLoader, 5000);
  function finishLoader() {
    if (loaderDone) return;
    loaderDone = true;
    clearInterval(plateTimer);
    if (pctEl) pctEl.textContent = '100%';
    if (wordEl) wordEl.style.setProperty('--fill', '100%');
    setTimeout(function () {
      if (loader) { loader.classList.add('done'); setTimeout(function () { loader.remove(); }, 900); }
      document.body.classList.add('is-loaded');
      kvIntro();
    }, 350);
  }

  /* ---------------- KV intro + scroll ---------------- */
  var kvChars = document.querySelectorAll('.kv-line .ch');
  gsap.set(kvChars, { yPercent: 115, opacity: 0 });
  gsap.set('.kv-bracket span', { opacity: 0 });
  gsap.set('.kv-sub', { opacity: 0, y: 16 });
  gsap.set('.kv-keyword-left, .kv-keyword-right, .circle-arrow', { opacity: 0 });
  var introTl = null;
  function kvIntro() {
    if (window.scrollY > 40) return; // user already scrolling: scrub state wins
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    introTl = tl;
    tl.to(kvChars, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.035 })
      .to('.bracket-left', { opacity: 1, duration: 0.5 }, '-=0.5')
      .to('.bracket-right', { opacity: 1, duration: 0.5 }, '<')
      .to('.kv-sub', { opacity: 1, y: 0, duration: 0.7 }, '-=0.3')
      .to('.kv-keyword-left, .kv-keyword-right, .circle-arrow', { opacity: 1, duration: 0.7 }, '-=0.4');
  }
  // KV scroll: disc grows between the brackets, brackets spread, copy leaves
  gsap.timeline({
    scrollTrigger: { trigger: '#kv', start: 'top top', end: 'bottom bottom', scrub: 0.6,
      onUpdate: function (self) {
        if (self.progress > 0.02 && introTl) { introTl.kill(); introTl = null; }
        setGL({ disc: Math.min(1, self.progress * 1.5) });
      } },
    defaults: { ease: 'none' }
  })
    .to('.bracket-left', { x: function () { return -window.innerWidth * 0.17; }, opacity: 0.25 }, 0)
    .to('.bracket-right', { x: function () { return window.innerWidth * 0.17; }, opacity: 0.25 }, 0)
    .to('.copy-group-top', { y: -70, opacity: 0 }, 0.35)
    .to('.copy-group-bottom', { y: 70, opacity: 0 }, 0.35)
    .to('.kv-keyword-left, .kv-keyword-right, .circle-arrow', { opacity: 0 }, 0.1);

  /* ---------------- chrome (header / navi / indicator) ---------------- */
  var header = document.getElementById('siteHeader');
  var navi = document.getElementById('sceneNavi');
  var indicator = document.getElementById('sceneIndicator');
  var indBtn = document.getElementById('indicatorBtn');
  var indA = document.getElementById('indLabelA');
  var indB = document.getElementById('indLabelB');
  var indFlipped = false;
  var SCENE_LABELS = ['About / Concept', 'About / Potato & Craft', 'Science & Technology', 'Product', 'Interview', "Lay's"];
  var SCENE_TARGETS = ['#chapter1', '#chapter2', '#chapter3', '#chapter4', '#chapter5', '#product'];
  var currentNav = -1;
  function setIndicator(label) {
    if (!indBtn) return;
    var visible = indFlipped ? indB : indA;
    var hidden = indFlipped ? indA : indB;
    if (visible.textContent === label) return;
    hidden.textContent = label;
    indBtn.classList.toggle('flip');
    indFlipped = !indFlipped;
  }
  function setScene(idx) {
    // idx = data-scene number
    var navIdx = idx - 2; // chapters start at data-scene 2
    if (idx >= 7) navIdx = 5;
    if (navIdx >= 0 && navIdx <= 5 && navIdx !== currentNav) {
      currentNav = navIdx;
      setIndicator(SCENE_LABELS[navIdx]);
      navi.querySelectorAll('button').forEach(function (b, i) { b.classList.toggle('active', i === navIdx); });
    }
    var showChrome = idx >= 2;
    navi.classList.toggle('view', showChrome);
    indicator.classList.toggle('view', showChrome);
    header.classList.toggle('view', idx >= 8);
  }
  if (indBtn) indBtn.addEventListener('click', function () {
    var next = Math.min(5, (currentNav < 0 ? 0 : currentNav + 1));
    scrollTo(SCENE_TARGETS[next]);
  });

  /* ---------------- WebGL scene states per section ---------------- */
  var GL_STATES = {
    0: { bg: 0x060a09, planes: 0, particles: 0.12, aurora: 0, tint: 0x1d4a3a },
    1: { bg: 0x133221, planes: 0, particles: 0.35, aurora: 0, tint: 0x1d4a3a },
    2: { bg: 0x133221, planes: 0.18, particles: 0.55, aurora: 0.05, tint: 0x1d4a3a },
    3: { bg: 0x00a852, planes: 0.9, particles: 1, aurora: 0.25, tint: 0x14402f },
    4: { bg: 0x00a852, planes: 1, particles: 1, aurora: 0.3, tint: 0x14402f },
    5: { bg: 0x00a852, planes: 0.15, particles: 0.35, aurora: 1, tint: 0x9fd8bd },
    6: { bg: 0x00a852, planes: 0.9, particles: 1, aurora: 0.15, tint: 0x14402f },
    7: { bg: 0x00a852, planes: 0.8, particles: 0.8, aurora: 0.2, tint: 0x14402f },
    8: { bg: 0xe8f6f1, planes: 0.55, particles: 0.2, aurora: 0, tint: 0xffffff },
    9: { bg: 0xe8f6f1, planes: 0, particles: 0, aurora: 0, tint: 0xffffff }
  };
  document.querySelectorAll('[data-scene]').forEach(function (sec) {
    var idx = +sec.getAttribute('data-scene');
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 55%',
      onToggle: function (self) {
        if (!self.isActive) return;
        setScene(idx);
        var st = GL_STATES[idx];
        if (st && S) {
          setGL({ planes: st.planes, particles: st.particles, aurora: st.aurora });
          S.bg.setHex(st.bg);
          S.planeTint.setHex(st.tint);
          if (idx !== 0) setGL({ disc: 0 });
        }
        header.classList.toggle('on-light', idx >= 8);
        navi.classList.toggle('on-light', idx >= 8);
      }
    });
  });
  // footer: header turns green-on-green safe (white) and navi hides
  ScrollTrigger.create({
    trigger: '#siteFooter', start: 'top 70%',
    onEnter: function () { navi.classList.remove('view'); indicator.classList.remove('view'); header.classList.remove('view'); },
    onLeaveBack: function () { navi.classList.add('view'); indicator.classList.add('view'); header.classList.add('view'); }
  });

  /* ---------------- summary ---------------- */
  gsap.timeline({
    scrollTrigger: { trigger: '#summary', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
    defaults: { ease: 'none' }
  })
    .fromTo('.summary-statement', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1 })
    .to('.summary-block', { opacity: 1, duration: 0.8, stagger: 0.7 }, 0.8)
    .fromTo('.summary-logo', { opacity: 0 }, { opacity: 1, duration: 0.8 }, 3.2)
    .to('.summary-stage', { opacity: 0, duration: 0.8 }, 4.4);

  /* ---------------- chapters ---------------- */
  document.querySelectorAll('.chapter').forEach(function (ch) {
    var blocks = ch.querySelectorAll('.text-block');
    ch.style.setProperty('--blocks', blocks.length);
    var tl = gsap.timeline({
      scrollTrigger: { trigger: ch, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
      defaults: { ease: 'none' }
    });
    tl.fromTo(ch.querySelector('.chapter-stage'), { opacity: 0 }, { opacity: 1, duration: 0.7 })
      .fromTo(ch.querySelectorAll('.chapter-no, .chapter-heading, .chapter-kicker'),
        { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.8, stagger: 0.15 }, 0.1);
    blocks.forEach(function (b, i) {
      tl.to(b, { opacity: 1, duration: 0.9 }, 1 + i * 1.1);
      if (i < blocks.length - 1) tl.to(b, { opacity: 0.35, duration: 0.7 }, 1.9 + i * 1.1);
    });
    tl.to(ch.querySelector('.chapter-stage'), { opacity: 0, duration: 0.7 }, '+=0.6');
  });

  /* ---------------- product reveal ---------------- */
  gsap.fromTo('.product-stage > *',
    { opacity: 0, y: 44 },
    { opacity: 1, y: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: '#product', start: 'top 65%' } });

  /* ---------------- ON / OFF ---------------- */
  var offMix = { v: 0 };
  var onoffActive = false;
  function applyOffMix() {
    if (!S || !onoffActive) return;
    var v = offMix.v;
    S.bg.setHex(0xe8f6f1).lerp(new THREE.Color(0xddeae5), v);
    S.planeTint.setHex(0xffffff);
    S.planes = 0.55 - v * 0.1;
  }
  gsap.set('.onoff-heading', { xPercent: -50 });
  gsap.timeline({
    scrollTrigger: { trigger: '#onoff', start: 'top top', end: 'bottom bottom', scrub: 0.6,
      onToggle: function (self) { onoffActive = self.isActive; if (self.isActive) applyOffMix(); } },
    defaults: { ease: 'none' }
  })
    .fromTo('.onoff-heading', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8 })
    .fromTo('#contentOn', { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.4)
    .to('#contentOn li', { opacity: 1, duration: 0.7, stagger: 0.55 }, 0.8)
    .to(offMix, { v: 1, duration: 1.6, onUpdate: applyOffMix }, 3.2)
    .to('#contentOn', { opacity: 0, x: -50, duration: 0.8 }, 3.4)
    .fromTo('#contentOff', { clipPath: 'inset(0 0 0 100%)' }, { clipPath: 'inset(0 0 0 0%)', duration: 1.0 }, 3.8)
    .to('#contentOff li', { opacity: 1, duration: 0.7, stagger: 0.55 }, 4.4)
    .to('.onoff-stage', { opacity: 0, duration: 0.7 }, 7.2);

  /* ---------------- cards reveal ---------------- */
  gsap.fromTo('.video-card',
    { opacity: 0, y: 60 },
    { opacity: 1, y: 0, duration: 0.9, stagger: 0.13, ease: 'power3.out',
      scrollTrigger: { trigger: '#cards', start: 'top 60%' } });

  /* ---------------- video modal ---------------- */
  var modal = document.getElementById('videoModal');
  var modalVideo = document.getElementById('modalVideo');
  var modalTitle = document.getElementById('modalTitle');
  document.querySelectorAll('.video-card').forEach(function (card) {
    card.addEventListener('click', function () {
      modalTitle.innerHTML = card.getAttribute('data-title');
      modalVideo.src = card.getAttribute('data-video');
      modalVideo.load();
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      if (lenis) lenis.stop();
      modalVideo.play().catch(function () {});
    });
  });
  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.load();
    if (lenis) lenis.start();
  }
  document.getElementById('modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });

  /* ---------------- goto links / back to top ---------------- */
  document.querySelectorAll('[data-goto]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      scrollTo('#' + a.getAttribute('data-goto'));
    });
  });
  document.getElementById('toTop').addEventListener('click', function () {
    if (lenis) lenis.scrollTo(0, { duration: 1.8 });
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
