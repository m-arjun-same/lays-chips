/* PROJECT 5 V3 — main.js (100% own code)
   Implements hidden/MOTION-FONT-SPEC-V3.md exactly:
   Lenis 1.3.17 config (§2), tracker At + Ke/ht (§3), loader (§4),
   KV intro p1..p5 (§5), KV scroll explode (§6), summary sequence (§7),
   chapter machine (§8), product (§9), ON/OFF wipe (§10), chrome (§12). */
(function () {
  'use strict';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var isMobile = window.matchMedia('(max-width: 767px)').matches || ('ontouchstart' in window && window.innerWidth < 1024);
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var Ke = function (x, a, b) { return clamp01((x - a) / (b - a)); };
  var ht = function (a, b, t) { return a + (b - a) * t; };
  var EZ = {
    easeInOutQuad: function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    easeOutQuad: function (t) { return 1 - (1 - t) * (1 - t); },
    easeInOutCubic: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    easeInOutQuart: function (t) { return t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; }
  };
  var vh = function () { return window.innerHeight; };

  /* ================= Lenis (spec §2) ================= */
  var lenis = null;
  if (window.Lenis) {
    var opts = isMobile
      ? { autoRaf: false, syncTouch: true, syncTouchLerp: 0.065, touchInertiaExponent: 1.6, autoResize: true }
      : { duration: 1.2, autoRaf: false, syncTouch: true, autoResize: true };
    lenis = new Lenis(opts);
    window.__lenis = lenis;
    if (window.gsap) { gsap.ticker.add(function (t) { lenis.raf(t * 1000); }); gsap.ticker.lagSmoothing(0); }
    else { var rafL = function (t) { lenis.raf(t); requestAnimationFrame(rafL); }; requestAnimationFrame(rafL); }
  }
  function scrollToTarget(target, duration) {
    if (lenis) lenis.scrollTo(target, { duration: duration || 1.2 });
    else { var el = typeof target === 'number' ? null : $(target); window.scrollTo({ top: typeof target === 'number' ? target : (el ? el.getBoundingClientRect().top + window.scrollY : 0), behavior: 'smooth' }); }
  }

  /* ================= Tracker (spec §3, At verbatim) ================= */
  function absTop(el) { var t = 0, n = el; while (n) { t += n.offsetTop || 0; n = n.offsetParent; } return t; }
  function Tracker(el) { this.el = el; this.top = 0; this.h = 0; this.refresh(); }
  Tracker.prototype.refresh = function () { this.top = absTop(this.el); this.h = this.el.offsetHeight; };
  Tracker.prototype.ratio = function (key, y) {
    var V = vh(), t = this.top - y, h = this.h, v;
    if (key === 'elT_viewB_elT_viewT') v = (V - t) / V;
    else if (key === 'elT_viewB_elB_viewT') v = (V - t) / (h + V);
    else if (key === 'elT_viewB_elB_viewB') v = (V - t) / h;
    else v = 0;
    return clamp01(v);
  };
  Tracker.prototype.near = function (y) { return y + vh() * 2 > this.top && y < this.top + this.h + vh(); };

  /* sections: tracker + segment boundaries h[seg] (spec §3/§8) */
  function Section(sel) {
    this.root = $(sel); if (!this.root) return;
    this.area = $('.scroll-area', this.root);
    this.tracker = new Tracker(this.area);
    this.segs = {}; this.order = [];
    var self = this;
    $$('[data-seg]', this.area).forEach(function (s) { self.order.push(s.getAttribute('data-seg')); });
    this.refresh();
  }
  Section.prototype.refresh = function () {
    this.tracker.refresh();
    var cum = 0, total = this.tracker.h + vh(), self = this;
    this.bounds = [0];
    $$('[data-seg]', this.area).forEach(function (s) { cum += s.offsetHeight; self.bounds.push(cum / total); });
  };
  Section.prototype.p = function (y) { return this.tracker.ratio('elT_viewB_elB_viewT', y); };
  Section.prototype.seg = function (name, y) {
    var i = this.order.indexOf(name); if (i < 0) return 0;
    return Ke(this.p(y), this.bounds[i], this.bounds[i + 1]);
  };

  /* ================= DOM refs ================= */
  var header = $('#siteHeader'), indicator = $('#sceneIndicator'), indicatorCube = $('#indicatorCube');
  var naviBtns = $$('.scene-navi button');
  var opacityItems = $$('.t-t-1,.t-t-2,.t-b-1,.t-b-2,.kv-sub,.kv-keyword__inner,.circle-arrow');
  var kvSection = new Section('[data-section="kv"]');
  var introSection = new Section('#introduction');
  var chapterSections = $$('.chapter').map(function (c) { return new Section('#' + c.id); });
  var productSection = new Section('#product');
  var onoffSection = new Section('#onoff');
  var introBlocks = $('#introBlocks'), introCopy = $('#introCopy');
  var paras = $$('.fade-paragraph', introBlocks);
  var blocksH = 0;
  function refreshAll() {
    [kvSection, introSection, productSection, onoffSection].forEach(function (s) { s.refresh(); });
    chapterSections.forEach(function (s) { s.refresh(); });
    blocksH = introBlocks.offsetHeight;
    measureExplode();
  }

  /* ================= explode letters (spec §5/§6, applyExplode verbatim) ================= */
  var letters = [];
  function splitLetters() {
    $$('[data-split]').forEach(function (line) {
      var text = line.textContent; line.textContent = '';
      text.split('').forEach(function (ch) {
        var s = document.createElement('span'); s.className = 't-wrap';
        s.textContent = ch === ' ' ? ' ' : ch; line.appendChild(s);
      });
    });
  }
  function measureExplode() {
    var copy = $('.kv-copy'); if (!copy) return;
    var cr = copy.getBoundingClientRect(), cx = cr.left + cr.width / 2, cy = cr.top + cr.height / 2;
    var wraps = $$('.kv-copy .t-wrap'), raw = [];
    wraps.forEach(function (w) {
      var r = w.getBoundingClientRect(), dx = r.left + r.width / 2 - cx, dy = r.top + r.height / 2 - cy;
      raw.push({ el: w, dx: dx, dy: dy, d: Math.hypot(dx, dy) });
    });
    var max = Math.max.apply(null, raw.map(function (o) { return o.d; }).concat([1]));
    $$('.kv-keyword-left,.kv-keyword-right').forEach(function (k) {
      var r = k.getBoundingClientRect(), d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
      if (d > max) max = d;
    });
    max *= 1.44; /* calibrated vs reference probe: ie fits 0.615 at kv-0.75 (two-equation z+opacity fit) */
    letters = raw.map(function (o) {
      var ie = o.d / max;
      return { el: o.el, px: o.dx * ie, py: o.dy * ie, ie: ie };
    });
  }
  function applyExplode(B) {
    /* raw-vector form fitted to reference probe transforms (kv-0.75: x -78, y -93, z 78):
       x = dx*ie*B*3.3, y = dy*ie*B*(3.3*0.9*vh/vw), z = 500*(1-ie)*B (z already exact) */
    var KX = 2.68, KY = KX * 0.9 * (vh() / Math.max(window.innerWidth, 1));
    letters.forEach(function (L) {
      var x = L.px * B * KX, y = L.py * B * KY, z = 500 * (1 - L.ie) * B;
      var o = clamp01(1 - B * 3.5 * (0.5 + (1 - L.ie) * 0.5));
      L.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,' + z.toFixed(1) + 'px)';
      L.el.style.opacity = o.toFixed(3);
    });
  }

  /* ================= global scroll state ================= */
  var introState = { p1: 0, p2: 0, p3: 0, p4: 0, p5: 0, done: false };
  var currentSceneId = -99;
  var sceneNames = ['Introduction', '( About / Potato & Craft )', '( About / Flavour Science )', '( About / The Craft Line )', '( About / Field Notes )'];
  var weights = { kv: 0, ch1: 0, ch2: 0, ch3: 0, ch4: 0, ch5: 0, ch6: 0, on: 0, off: 0 };
  var FIELDS = { /* sampled from reference screenshots (spec §11) */
    black: [0, 0, 0], kvTop: [0.129, 0.027, 0.031], kvBot: [0.478, 0.118, 0.043], ink: [0.09, 0.063, 0.043], ch1: [0.22, 0.035, 0.043], ch2: [0.949, 0.42, 0.039],
    ch3: [1.0, 0.475, 0.0], ch4: [0.91, 0.365, 0.016], ch5: [0.976, 0.451, 0.086], ch6: [0.918, 0.345, 0.047], pale: [1.0, 0.914, 0.69]
  };
  function mixc(a, b, t) { return [ht(a[0], b[0], t), ht(a[1], b[1], t), ht(a[2], b[2], t)]; }

  function setSceneId(id) {
    if (id === currentSceneId) return;
    currentSceneId = id;
    naviBtns.forEach(function (b) { b.classList.toggle('is-on', +b.getAttribute('data-scene-id') === id); });
    if (indicatorCube && id >= 0 && id <= 4) indicatorCube.style.transform = 'rotateY(' + (-id * 90) + 'deg)';
    if (indicator) indicator.classList.toggle('off', !(id >= 0 && id <= 4));
    var f0 = $('.ind-f0 .ind-label'); if (f0) f0.textContent = id === 4 ? 'About / Voices' : 'About / Concept';
    document.body.classList.toggle('navi-green', !(id === 1 || id === 5));
  }

  /* ================= per-section scroll drivers ================= */
  var glTarget = {};
  function driveKV(y) {
    /* H keys on the introScrollArea (ref: second KV tracker, top = kv area bottom, h = 100vh) */
    var iaTop = kvSection.tracker.top + kvSection.tracker.h, iaT = iaTop - y;
    var H = clamp01((vh() - iaT) / vh());
    var Y = kvSection.tracker.ratio('elT_viewB_elB_viewT', y);
    var ee = EZ.easeInOutQuad(Y);
    if (introState.done) {
      applyExplode(isMobile ? ee * 2 : ee);
      opacityItems.forEach(function (el) { el.style.opacity = (1 - H).toFixed(3); });
    }
    var stage = $('.kv-stage'); if (stage) stage.style.setProperty('--p', ee.toFixed(4));
    var vmin = Math.min(window.innerWidth, vh());
    glTarget.discDiam = vmin * (0.60 + ee * 0.55) * Math.max(introState.p1, 0.001);
    glTarget.discFeather = 0.2 - 0.2 * Ke(ee, 0.7, 1);
    glTarget.discOpacity = introState.p1;
    glTarget.discGlow = clamp01(introState.p3) * (1 - ee * 0.4) * (1 - introState.p5 * 0.3);
    weights.kv = clamp01(introState.p3 * 1.05) * (1 - Ke(Y, 0.55, 1));
    glTarget.bgTop = FIELDS.kvTop; glTarget.bgBot = FIELDS.kvBot;
    return { H: H, Y: Y };
  }

  function driveIntro(y) {
    var _ = introSection.p(y);
    var S = Ke(_, 0, 0.15), b = Ke(_, isMobile ? 0.1 : 0.05, 0.6), w = Ke(_, 0.5, 1), T = Ke(_, 0.45, 1);
    var O = -500 + EZ.easeOutQuad(S) * 500;
    introCopy.style.transform = 'translate(-50%,-50%) perspective(1000px) translate3d(0,0,' + O.toFixed(1) + 'px)';
    introCopy.style.opacity = (clamp01(S * 3) * (1 - clamp01((S - 0.5) / 0.5 * 1.2))).toFixed(3);
    var C = vh() + blocksH, A = vh() - b * C;
    introBlocks.style.transform = 'translate3d(-50%,' + A.toFixed(1) + 'px,0)';
    var stTop = introSection.tracker.top - y;
    var stageTopVp = stTop > 0 ? stTop : Math.min(0, introSection.tracker.top + vh() + introSection.tracker.h - vh() - y);
    var Htop = stageTopVp + A;
    var eW = isMobile ? [0.1, 0.2] : [0.3, 0.45], tW = isMobile ? [0.8, 0.9] : [0.55, 0.7];
    paras.forEach(function (p) {
      var X = (Htop + p.offsetTop) / vh();
      var o = Math.min(clamp01((X - eW[0]) / (eW[1] - eW[0])), clamp01((tW[1] - X) / (tW[1] - tW[0])));
      p.style.opacity = o.toFixed(2);
    });
    /* last logo (spec §7) */
    var Yk = Ke(w, 0, 0.3), K = Ke(w, 0.2, 0.7), ee2 = Ke(w, 0.7, 1);
    var white = $('#logoWhite'), green = $('#logoGreen');
    var Q = EZ.easeInOutQuart(clamp01(K * 1.1));
    var scale = (180 / 370 + (1 - 180 / 370) * w) + Q;
    if (white) { white.style.opacity = (clamp01(Yk) * clamp01(1 - ee2 * 1.2)).toFixed(3); white.style.transform = 'translate(-50%,-50%) scale(' + scale.toFixed(3) + ')'; }
    if (green) { green.style.opacity = Q.toFixed(3); green.style.transform = 'translate(-50%,-50%) scale(' + scale.toFixed(3) + ')'; }
    /* GL scene 1: transition kv -> ch1 (spec §7/§11) */
    var V = EZ.easeInOutQuart(T);
    weights.ch1 = V * Ke(clamp01(Yk), 0, 0.999);
    weights.kv = weights.kv * (1 - V);
    glTarget.bgTop = mixc(FIELDS.kvTop, FIELDS.ch1, Math.max(V, Ke(clamp01(Yk), 0.5, 1)));
    glTarget.bgBot = mixc(FIELDS.kvBot, FIELDS.ch1, Math.max(V, Ke(clamp01(Yk), 0.5, 1)));
    glTarget.discOpacity = introState.p1 * (1 - V);
    glTarget.bubbles = 0.25 + V * 0.5;
    return { _: _, w: w, V: V };
  }

  var chapterGL = [
    { key: 'ch1', field: 'ch1' }, { key: 'ch2', field: 'ch2' }, { key: 'ch3', field: 'ch3' },
    { key: 'ch4', field: 'ch4' }, { key: 'ch5', field: 'ch5' }
  ];
  function driveChapter(idx, y) {
    var sec = chapterSections[idx], root = sec.root;
    var gT = sec.seg('title-inout', y), gIn = sec.seg('in', y), gView = sec.seg('view', y), gOut = sec.seg('out', y);
    var group = $('.chapter-group', root), wrap = $('.text-block-wrap', root);
    var gOp = Ke(gT, 0.1, 0.7) * (1 - Ke(gT, 0.7, 1));
    group.style.opacity = gOp.toFixed(3);
    var wOp = idx === 3 ? Ke(gIn, 0.3, 1) * (1 - Ke(gOut, 0, 0.5)) : Ke(gIn, 0, 1) * (1 - Ke(gOut, 0, 0.5));
    wrap.style.opacity = wOp.toFixed(3);
    /* navi circle progress (spec §8) */
    var p = sec.p(y), bOut = sec.bounds[sec.order.indexOf('out') + 1] || 1;
    var prog = idx === 4 ? Ke(p, 0.1, bOut) : Ke(p, sec.bounds[sec.order.indexOf('margin')], idx === 3 ? 0.7 : bOut);
    var ringEl = naviBtns[idx] && naviBtns[idx].querySelector('.progress-ring circle');
    if (ringEl) { var C = 2 * Math.PI * 11.5; ringEl.style.strokeDasharray = C; ringEl.style.strokeDashoffset = (C * (1 - prog)).toFixed(2); }
    /* scene id is computed deterministically in onScrollFrame (see there) */
    /* GL */
    var key = chapterGL[idx].key;
    var wgt = Math.max(Ke(gIn, 0, 1), gView > 0 && gOut < 1 ? 1 : 0, Ke(gT, 0.3, 0.9)) * (1 - Ke(gOut, 0.6, 1));
    weights[key] = clamp01(wgt);
    if (wgt > 0.4) { glTarget.bgTop = FIELDS[chapterGL[idx].field]; glTarget.bgBot = FIELDS[chapterGL[idx].field]; glTarget.bubbles = idx === 3 ? 0.15 : 0.55; }
    if (idx === 3) glTarget.aurora = clamp01(Math.max(gIn, gView)) * (1 - Ke(gOut, 0.3, 1));
    if (idx === 1 || idx === 2) glTarget.bubbles = 0.55;
    return { gT: gT, gIn: gIn, gView: gView, gOut: gOut, gOp: gOp, wOp: wOp };
  }

  function driveProduct(y) {
    var gIn = productSection.seg('in', y), gView = productSection.seg('view', y), gOut = productSection.seg('out', y);
    var stage = $('#productStage');
    stage.style.opacity = (Ke(gIn, 0, 1) * (1 - Ke(gOut, 0, 0.5))).toFixed(3);
    $$('.flavour-list li').forEach(function (li, i) {
      var t = Ke(gView, i / 8, (i + 2.5) / 8);
      li.style.opacity = (0.25 + t * 0.75).toFixed(3);
      li.style.transform = 'translateY(' + ((1 - t) * 12).toFixed(1) + 'px)';
    });
    var pk = $('.pack-line'); if (pk) pk.style.opacity = Ke(gView, 0.6, 1).toFixed(3);

    weights.ch6 = clamp01(Math.max(gIn, gView > 0 ? 1 : 0)) * (1 - Ke(gOut, 0.5, 1));
    if (weights.ch6 > 0.4) { glTarget.bgTop = FIELDS.ch6; glTarget.bgBot = FIELDS.ch6; glTarget.bubbles = 0.35; }
    /* ripple (spec §9): in-phase progress 1->.4, out-phase to {0,.25} */
    var bAll = productSection.p(y);
    var rp = bAll < 0.75 ? ht(1, 0.4, EZ.easeInOutQuad(Ke(bAll, 0.05, 0.75))) : ht(0.4, 0, EZ.easeInOutQuad(Ke(bAll, 0.75, 1)));
    glTarget.ringP = rp; glTarget.ringOpacity = clamp01(weights.ch6) * 0.8;
    return { gIn: gIn, gView: gView, gOut: gOut };
  }

  function driveOnOff(y) {
    var vIn = onoffSection.seg('in', y), vView = onoffSection.seg('view', y), vOut = onoffSection.seg('out', y);
    var u = EZ.easeInOutCubic(vView);
    var b = Ke(vIn, 0, 0.5), w = Ke(vOut, 0, 0.5);
    $('#onoffTitle').style.opacity = (b * (1 - w)).toFixed(3);
    var on = $('.content-on'), off = $('.content-off');
    on.style.opacity = b.toFixed(3);
    off.style.opacity = '1';
    on.style.clipPath = 'inset(0 0 0 ' + (u * 100).toFixed(2) + '%)';
    off.style.clipPath = 'inset(0 ' + ((1 - u) * 100).toFixed(2) + '% 0 0)';
    $$('.content-on .list-item').forEach(function (li, i) { li.classList.toggle('active', vIn >= 0.2 + i * 0.2); });
    $$('.content-off .list-item').forEach(function (li, i) { li.classList.toggle('active', u >= 0.55 + i * 0.11); });
    weights.on = b * (1 - u) * (1 - Ke(vOut, 0, 0.25));
    weights.off = b * u * (1 - Ke(vOut, 0, 0.25));
    if (b > 0.05) { glTarget.bgTop = FIELDS.pale; glTarget.bgBot = FIELDS.pale; glTarget.bubbles = 0.12; glTarget.discOpacity = 0; }
    var light = b > 0.05 && vOut < 0.9;
    driveOnOff._light = light;
    return { vIn: vIn, vView: vView, vOut: vOut, u: u };
  }
  function inCards(y) {
    var c = $('.cards'); if (!c) return false;
    var t = absTop(c); return y + vh() > t && y < t + c.offsetHeight;
  }

  var probe = { kv: {}, intro: {}, chapters: [], product: {}, onoff: {}, sceneId: -1 };
  function onScrollFrame() {
    var y = window.scrollY || 0;
    for (var k in weights) weights[k] = 0;
    glTarget = { discDiam: 0, discFeather: 0.2, discOpacity: 0, discGlow: 0, particleOpacity: introState.p2 > 0 && !introState.done ? clamp01((introState.p2 - 0.2) / 0.85) * (1 - introState.p3) : 0,
      particleScale: 0.2 + clamp01((introState.p2 - 0.2) / 0.85) * (isMobile ? 2 : 3) * 0.5, aurora: 0, bubbles: 0.3, ringP: 0, ringOpacity: 0, bgTop: FIELDS.black, bgBot: FIELDS.black };
    probe.kv = driveKV(y);
    probe.intro = driveIntro(y);
    probe.product = driveProduct(y);
    chapterSections.forEach(function (sec, i) { probe.chapters[i] = driveChapter(i, y); });
    /* chapter scene orb: the KV disc softens into the chapters' glowing sphere
       (reference ch-view screenshots: huge soft white-green orb, feather -> 1) */
    var orb = 0;
    probe.chapters.forEach(function (c) { if (c) orb = Math.max(orb, parseFloat(c.wOp) || 0); });
    if (orb > 0.01) {
      var vmin2 = Math.min(window.innerWidth, vh());
      glTarget.discFeather = Math.max(glTarget.discFeather, orb);
      glTarget.discOpacity = Math.max(glTarget.discOpacity, orb * 0.95);
      glTarget.discGlow = Math.max(glTarget.discGlow, orb);
      glTarget.discDiam = glTarget.discDiam + (vmin2 * 2.0 - glTarget.discDiam) * orb;
    }
    if (onoffSection.tracker.near(y)) probe.onoff = driveOnOff(y);
    /* scene id (spec ADDENDUM): the reference sets it from Fi crossing events;
       the deterministic equivalent is "deepest crossed wins": the last chapter
       whose title-inout passed 0.1, overridden to 5 once the product chapter's
       in-segment passes 0.1. Level-pure, so jump-scrolls settle in one frame. */
    var sid = -1;
    probe.chapters.forEach(function (c, i) { if (c && c.gT >= 0.1) sid = i; });
    if (probe.product && probe.product.gIn >= 0.1) sid = 5;
    setSceneId(sid);
    /* header: hidden through KV/intro (id -1); from Ch1 on it is the light
       header (green logo, ink links, solid store button) — ref ch screenshots */
    var hdrLight = currentSceneId >= 0 || !!driveOnOff._light || inCards(y);
    document.body.classList.toggle('header-light', hdrLight);
    document.body.classList.toggle('header-show', hdrLight);
    document.body.classList.toggle('navi-green', !!driveOnOff._light || !(currentSceneId === 1 || currentSceneId === 5));
    probe.sceneId = currentSceneId;
    glTarget.weights = weights;
    if (window.GL) GL.setState(glTarget);
    window.__probe = probe;
  }
  var ticking = false;
  function requestTick() { if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; onScrollFrame(); }); } }
  if (lenis) lenis.on('scroll', requestTick);
  window.addEventListener('scroll', requestTick, { passive: true });

  /* ================= KV intro (spec §5) ================= */
  function bounceEase(t) { /* own approximation of CustomBounce{strength:.5}, light intensity only (spec §14) */
    var d = Math.pow(1 - t, 2); return 1 - d + Math.abs(Math.sin(t * 9.0)) * d * 0.35 * (1 - t);
  }
  function startKvIntro() {
    if (!window.gsap) { introState.done = true; opacityItems.forEach(function (el) { el.style.opacity = 1; }); applyExplode(0); if (lenis) lenis.start(); return; }
    applyExplode(0.5);
    var s = introState;
    var tl = gsap.timeline({ defaults: { ease: 'expo.inOut' }, onComplete: function () {
      s.done = true;
      if (lenis) lenis.start();
      requestTick();
    }});
    tl.to(s, { p1: 1, duration: 1, onUpdate: requestTick }, 0);
    tl.to(s, { p2: 1, duration: 1.5, onUpdate: requestTick }, 0.5);
    tl.to(s, { p3: 1, duration: 3, onUpdate: requestTick }, 1.75);
    tl.to(s, { p4: 1, duration: 1, onUpdate: function () {
      opacityItems.forEach(function (el) { el.style.opacity = s.p4.toFixed(3); });
      applyExplode(0.5 - s.p4 * 0.5);
    } }, 3.25);
    tl.to(s, { p5: 1, duration: 1, ease: bounceEase, onUpdate: requestTick }, 3.75);
  }

  /* ================= loader (spec §4) ================= */
  function runLoader() {
    var loader = $('#loader'); if (!loader) { startKvIntro(); return; }
    if (lenis) lenis.stop();
    var plates = $$('.lplate', loader), white = $('#loaderWordWhite');
    /* randomized non-overlapping positions (spec §4 algorithm) */
    var placed = [], W = window.innerWidth, Hh = window.innerHeight;
    plates.forEach(function (img, i) {
      var x, y2, tries = 0;
      do {
        x = 20 + Math.random() * Math.max(W - 300, 60); y2 = 20 + Math.random() * Math.max(Hh - 320, 60); tries++;
      } while (tries < 60 && placed.some(function (p) { return Math.hypot(p[0] - x, p[1] - y2) < 250; }));
      placed.push([x, y2]); img.style.left = x + 'px'; img.style.top = y2 + 'px';
    });
    var total = plates.length + 1, loaded = 0, revealed = 0, revealing = false;
    function revealNext() {
      if (revealing) return;
      var should = Math.floor((loaded / total) * 5);
      if (revealed >= should || revealed >= plates.length) return;
      revealing = true;
      var img = plates[revealed]; revealed++;
      if (window.gsap) gsap.to(img, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.4, ease: 'power2.out', onComplete: function () { revealing = false; revealNext(); } });
      else { img.style.clipPath = 'inset(0 0 0 0)'; revealing = false; }
    }
    function progress() {
      var p = loaded / total;
      if (white) white.style.opacity = p.toFixed(3);
      revealNext();
      if (loaded >= total) setTimeout(finish, 500);
    }
    plates.forEach(function (img) {
      if (img.complete && img.naturalWidth) { loaded++; }
      else { img.addEventListener('load', function () { loaded++; progress(); }); img.addEventListener('error', function () { loaded++; progress(); }); }
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { loaded++; progress(); });
    else { loaded++; }
    progress();
    var finished = false;
    function finish() {
      if (finished) return; finished = true;
      var outro = function () {
        loader.classList.add('done');
        setTimeout(function () { loader.style.display = 'none'; }, 550);
        startKvIntro();
      };
      if (window.gsap) {
        gsap.to(plates, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.5, ease: 'power4.inOut', stagger: { each: 0.1, from: 'end' }, onComplete: function () {
          var grey = $('.loader-word-gray'); if (grey) grey.style.display = 'none';
          gsap.to('#loaderWordWhite span', { opacity: 0, scale: 0.95, duration: 0.45, ease: 'power3.inOut', stagger: 0.05, onComplete: outro });
        }});
      } else outro();
    }
    setTimeout(finish, 9000); /* failsafe (mirrors the inline HTML one, harmless duplicate) */
  }

  /* ================= chrome interactions (spec §12) ================= */
  function bindChrome() {
    setTimeout(function () { if (indicator) indicator.classList.remove('invisible'); }, 1000);
    naviBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = +btn.getAttribute('data-scene-id');
        var delta = Math.abs(id - Math.max(currentSceneId, 0));
        var dur = 1 + 2 * Math.min(delta, 4) / 4;
        jumpToScene(id, dur);
      });
    });
    if (indicator) indicator.addEventListener('click', function () {
      var next = Math.min((currentSceneId < 0 ? 0 : currentSceneId) + 1, 5);
      jumpToScene(next, 1.5);
    });
    var ca = $('.circle-arrow');
    if (ca) ca.addEventListener('click', function () { if (lenis) lenis.scrollTo('#introduction', { offset: -300, duration: 1.2 }); else scrollToTarget('#introduction', 1.2); });
    $$('.head-nav a, .foot-nav a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (href && href.charAt(0) === '#') { e.preventDefault(); scrollToTarget(href === '#top' ? 0 : href, 1.2); }
      });
    });
    var top = $('.to-top-cube');
    if (top) top.addEventListener('click', function () { scrollToTarget(0, 1.2); });
    /* video modal */
    var modal = $('#videoModal'), video = $('#modalVideo'), mTitle = $('#modalTitle');
    $$('.video-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var src = card.getAttribute('data-video'); if (!src || !modal) return;
        mTitle.textContent = card.getAttribute('data-title') || '';
        video.src = src; modal.classList.add('open'); if (lenis) lenis.stop();
        video.play().catch(function () {});
      });
    });
    function closeModal() { if (!modal) return; modal.classList.remove('open'); video.pause(); video.removeAttribute('src'); video.load(); if (lenis) lenis.start(); }
    var mc = $('.modal-close'); if (mc) mc.addEventListener('click', closeModal);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });
  }
  function jumpToScene(id, dur) {
    var y;
    if (id >= 0 && id <= 4) {
      var sec = chapterSections[id];
      var marginH = sec.area.querySelector('[data-seg="margin"]').offsetHeight;
      var titleH = sec.area.querySelector('[data-seg="title-inout"]').offsetHeight;
      y = id === 0 ? sec.tracker.top - vh() + 0.7 * (marginH + titleH)
                   : sec.tracker.top - vh() + marginH + 0.7 * titleH;
      if (id === 4) y -= vh() * 0.1;
    } else y = productSection.tracker.top + vh() * 0.5;
    scrollToTarget(Math.max(y, 0), dur || 1.2);
  }

  /* ================= boot ================= */
  splitLetters();
  opacityItems.forEach(function (el) { el.style.opacity = '0'; });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { refreshAll(); requestTick(); });
  refreshAll(); requestTick();
  window.addEventListener('resize', function () { refreshAll(); if (window.GL) GL.resize(); requestTick(); });
  window.addEventListener('load', function () { refreshAll(); requestTick(); });
  bindChrome();
  setSceneId(-1);
  runLoader();
})();
