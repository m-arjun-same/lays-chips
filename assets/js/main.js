// Lay's — own-code scene engine: Lenis smooth scroll + GSAP ScrollTrigger reveals + counters + ON/OFF scenes + footer cube parallax.
(function () {
  'use strict';
  var pre = document.getElementById('preloader');
  function killPre() { if (pre) { pre.classList.add('done'); setTimeout(function () { if (pre) pre.remove(); }, 700); } }
  window.addEventListener('load', function () { setTimeout(killPre, 500); });
  setTimeout(killPre, 4000);

  var lenis = null;
  try {
    if (typeof Lenis !== 'undefined') {
      lenis = new Lenis({ duration: 1.15, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
      function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
    }
  } catch (e) { lenis = null; }

  // Progress bar + anchor scrolling
  var bar = document.getElementById('progressBar');
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    if (bar && max > 0) bar.style.width = (h.scrollTop / max * 100) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (ev) {
      var id = a.getAttribute('href');
      if (id.length > 1) {
        var el = document.querySelector(id);
        if (el) { ev.preventDefault(); if (lenis) lenis.scrollTo(el); else el.scrollIntoView({ behavior: 'smooth' }); }
      }
    });
  });
  var toTop = document.getElementById('toTop');
  if (toTop) toTop.addEventListener('click', function () { if (lenis) lenis.scrollTo(0); else window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // Counters
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var target = parseInt(el.getAttribute('data-count'), 10) || 0;
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        io.disconnect();
        var start = null;
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / 1400, 1);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + (target > 1 ? '+' : '');
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }
    }, { threshold: 0.4 });
    io.observe(el);
  });

  // ON / OFF toggle
  var btnOn = document.getElementById('btnOn'), btnOff = document.getElementById('btnOff');
  var gridOn = document.getElementById('gridOn'), gridOff = document.getElementById('gridOff');
  var ind = document.getElementById('sceneIndicator');
  function setMode(on) {
    btnOn.classList.toggle('is-active', on); btnOff.classList.toggle('is-active', !on);
    btnOn.setAttribute('aria-selected', on); btnOff.setAttribute('aria-selected', !on);
    gridOn.hidden = !on; gridOff.hidden = on;
    if (ind) ind.textContent = on ? 'Mode: ON — 4 scenes' : 'Mode: OFF — 4 scenes';
  }
  if (btnOn && btnOff) { btnOn.addEventListener('click', function () { setMode(true); }); btnOff.addEventListener('click', function () { setMode(false); }); }

  // GSAP reveals (guarded — page works without it)
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) lenis.on('scroll', ScrollTrigger.update);
    gsap.utils.toArray('.reveal').forEach(function (el) {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1.05, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 86%' }
      });
    });
    gsap.to('.hero-img', { scale: 1.12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  } else {
    document.querySelectorAll('.reveal').forEach(function (el) { el.style.opacity = '1'; el.style.transform = 'none'; });
  }
})();
