/* PROJECT 5 V3 — webgl.js (100% own code; Three.js vendored)
   One fixed canvas. main.js computes a target frame-state every rAF from the
   extracted scroll formulas (spec §5–§11); this engine lerps current → target
   at ~0.12/frame (reference lerps scene params at lerpSpeed .1, spec §11) and
   renders: gradient field, KV disc shader (feather uniform per spec §6),
   intro particles, per-chapter tinted photo plates, bubbles, Ch4 aurora,
   Ch6 ripple ring, ON/OFF washed plate sets. */
(function () {
  'use strict';
  var holder = document.getElementById('webgl');
  if (!holder || !window.THREE) { window.GL = { setState: function () {}, resize: function () {} }; return; }
  var canvas = document.createElement('canvas'); canvas.id = 'glcanvas'; holder.appendChild(canvas);

  var W = window.innerWidth, H = window.innerHeight;
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(W, H);
  var scene = new THREE.Scene();
  var camera = new THREE.OrthographicCamera(-5, 5, 3, -3, 0.1, 100);
  camera.position.z = 10;

  var texLoader = new THREE.TextureLoader();
  function tex(p) { var t = texLoader.load(p); t.colorSpace = THREE.SRGBColorSpace; return t; }

  /* ---- gradient field ---- */
  var bgMat = new THREE.ShaderMaterial({
    uniforms: { uTop: { value: new THREE.Color(0x000000) }, uBot: { value: new THREE.Color(0x000000) }, uGlowY: { value: 0.5 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 uTop; uniform vec3 uBot; uniform float uGlowY; varying vec2 vUv;' +
      'void main(){ vec3 c = mix(uBot, uTop, smoothstep(0.0,1.0,vUv.y));' +
      ' float g = smoothstep(0.9, 0.0, distance(vUv, vec2(0.5, uGlowY))); c += vec3(0.10,0.045,0.012)*g;' +
      ' gl_FragColor = vec4(c, 1.0); }',
    depthWrite: false
  });
  var bg = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), bgMat);
  bg.position.z = -5; scene.add(bg);

  /* ---- KV disc (spec §6: uFeatherPx behaviour mapped to uFeather fraction) ---- */
  var discMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: {
      uFeather: { value: 0.2 }, uGlow: { value: 0.0 }, uOpacity: { value: 1.0 }, uTime: { value: 0 },
      uColA: { value: new THREE.Color(0xfff3d6) }, uColB: { value: new THREE.Color(0xffc72c) }
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform float uFeather; uniform float uGlow; uniform float uOpacity; uniform float uTime;' +
      'uniform vec3 uColA; uniform vec3 uColB; varying vec2 vUv;' +
      'void main(){ float d = length(vUv-0.5)*2.0;' +
      ' float body = smoothstep(1.0, 1.0-uFeather, d);' +
      ' float core = smoothstep(0.85, 0.0, d);' +
      ' float ring = smoothstep(0.03+uFeather*0.4, 0.0, abs(d-0.86)) * 0.22;' +
      ' vec3 col = mix(uColB, uColA, core) * (0.75 + uGlow*0.9);' +
      ' float a = clamp(body*(0.28+core*0.55) + ring*(0.4+uGlow*0.4), 0.0, 1.0) * uOpacity;' +
      ' gl_FragColor = vec4(col, a); }'
  });
  var disc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), discMat);
  disc.position.z = -3; scene.add(disc);

  /* ---- ripple ring (Ch6, spec §9 mapping) ---- */
  var ringMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uP: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform float uP; uniform float uOpacity; varying vec2 vUv;' +
      'void main(){ float d = length(vUv-0.5)*2.0;' +
      ' float r = mix(0.15, 0.98, uP); float w = 0.02 + uP*0.10;' +
      ' float a = smoothstep(w, 0.0, abs(d-r)) * (1.0-uP*0.6) * uOpacity;' +
      ' gl_FragColor = vec4(vec3(1.0,0.92,0.80), a); }'
  });
  var ring = new THREE.Mesh(new THREE.PlaneGeometry(9, 5.4), ringMat);
  ring.position.z = -2.6; scene.add(ring);

  /* ---- aurora (Ch4 mint light field) ---- */
  var aurMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uMix: { value: 0 }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform float uMix; uniform float uTime; varying vec2 vUv;' +
      'float blob(vec2 p, vec2 c, float r){ return smoothstep(r, 0.0, distance(p,c)); }' +
      'void main(){ vec2 p = vUv; float t = uTime*0.05;' +
      ' float b1 = blob(p, vec2(0.30+0.10*sin(t*1.3), 0.62+0.08*cos(t)), 0.55);' +
      ' float b2 = blob(p, vec2(0.72+0.12*cos(t*0.9), 0.45+0.10*sin(t*1.1)), 0.48);' +
      ' float b3 = blob(p, vec2(0.52, 0.85+0.05*sin(t*0.7)), 0.40);' +
      ' vec3 col = vec3(1.0,0.78,0.17)*b1*0.5 + vec3(1.0,0.52,0.05)*b2*0.45 + vec3(1.0,0.86,0.38)*b3*0.4;' +
      ' float streak = smoothstep(0.012, 0.0, abs(p.y - 0.30 - 0.25*sin(p.x*4.0+t))) * 0.35;' +
      ' col += vec3(1.0,0.88,0.66)*streak;' +
      ' gl_FragColor = vec4(col, (b1+b2+b3+streak) * uMix); }'
  });
  var aurora = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), aurMat);
  aurora.position.z = -2.8; scene.add(aurora);

  /* ---- plates ---- */
  var PLATES = 'assets/images/plates/', SC = 'assets/images/scenes/', IM = 'assets/images/';
  var SETS = {
    kv:  { tint: 0x8a6a52, dim: 0.4, items: [[IM + 'hero.jpg', 0.3, -0.2, 3.2, 2.1], [PLATES + 'plate-2.jpg', -3.6, 1.4, 2.6, 1.7], [PLATES + 'plate-4.jpg', 3.7, 1.2, 2.6, 1.7]] },
    ch1: { tint: 0x8a6a52, items: [[PLATES + 'plate-1.jpg', -3.2, 1.0, 3.2, 2.1], [PLATES + 'plate-3.jpg', 3.1, 0.6, 2.9, 1.9], [IM + 'farm.jpg', -2.6, -1.6, 2.8, 1.8], [IM + 'potato.jpg', 2.9, -1.7, 2.6, 1.7]] },
    ch2: { tint: 0x9a7a5c, items: [[PLATES + 'plate-5.jpg', -3.0, -0.9, 3.1, 2.0], [IM + 'chips1.jpg', 3.2, 1.1, 2.8, 1.9], [PLATES + 'plate-2.jpg', 2.7, -1.8, 2.5, 1.6]] },
    ch3: { tint: 0x93755a, items: [[PLATES + 'plate-3.jpg', -3.3, 0.4, 3.0, 2.0], [IM + 'flavour.jpg', 3.0, -1.2, 3.0, 2.0], [PLATES + 'plate-1.jpg', 0.2, 1.9, 2.4, 1.5]] },
    ch4: { tint: 0xffd98a, items: [[IM + 'chips2.jpg', -3.1, 1.2, 2.9, 1.9], [PLATES + 'plate-4.jpg', 3.2, 0.9, 2.8, 1.8], [IM + 'hero.jpg', 2.8, -1.8, 2.5, 1.6]] },
    ch5: { tint: 0x8a6a52, items: [[PLATES + 'plate-2.jpg', -3.0, -1.3, 3.0, 2.0], [IM + 'party.jpg', 3.1, 1.0, 2.9, 1.9], [PLATES + 'plate-5.jpg', -2.7, 1.6, 2.4, 1.5]] },
    ch6: { tint: 0x80644c, items: [[IM + 'hero.jpg', -3.4, -0.6, 3.6, 2.4], [IM + 'chips1.jpg', 3.5, 1.3, 3.2, 2.1]] },
    on:  { tint: 0xffefc2, items: [[SC + 'on-1.jpg', -3.2, 1.1, 2.8, 1.8], [SC + 'on-2.jpg', -3.4, -1.5, 2.6, 1.7], [SC + 'on-3.jpg', 3.2, 1.2, 2.8, 1.8], [SC + 'on-4.jpg', 3.4, -1.4, 2.6, 1.7]] },
    off: { tint: 0xffe9b0, items: [[SC + 'off-1.jpg', -3.2, 1.1, 2.8, 1.8], [SC + 'off-2.jpg', -3.4, -1.5, 2.6, 1.7], [SC + 'off-3.jpg', 3.2, 1.2, 2.8, 1.8], [SC + 'off-4.jpg', 3.4, -1.4, 2.6, 1.7]] }
  };
  var groups = {};
  Object.keys(SETS).forEach(function (key) {
    var def = SETS[key], g = new THREE.Group();
    def.items.forEach(function (it) {
      var m = new THREE.Mesh(new THREE.PlaneGeometry(it[3], it[4]),
        new THREE.MeshBasicMaterial({ map: tex(it[0]), transparent: true, opacity: 0, color: def.tint, depthWrite: false }));
      m.position.set(it[1], it[2], -2 + Math.random() * 0.4);
      m.userData.baseY = it[2]; m.userData.seed = Math.random() * 10;
      g.add(m);
    });
    g.visible = false; scene.add(g); groups[key] = g;
  });

  /* ---- bubbles ---- */
  function dotTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.6, 'rgba(255,255,255,0.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  var bubbleGeo = new THREE.BufferGeometry();
  var BN = 170, bPos = new Float32Array(BN * 3), bSeed = new Float32Array(BN);
  for (var i = 0; i < BN; i++) { bPos[i * 3] = (Math.random() - 0.5) * 10; bPos[i * 3 + 1] = (Math.random() - 0.5) * 6; bPos[i * 3 + 2] = -1.5; bSeed[i] = Math.random(); }
  bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
  var bubbleMat = new THREE.PointsMaterial({ size: 0.14, map: dotTexture(), transparent: true, opacity: 0, depthWrite: false, color: 0xffffff });
  var bubbles = new THREE.Points(bubbleGeo, bubbleMat); scene.add(bubbles);

  /* ---- intro particles (KV, spec §5) ---- */
  var pGeo = new THREE.BufferGeometry();
  var PN = 260, pPos = new Float32Array(PN * 3);
  for (var j = 0; j < PN; j++) { var a = Math.random() * Math.PI * 2, r = .4 + Math.random() * 2.6; pPos[j * 3] = Math.cos(a) * r; pPos[j * 3 + 1] = Math.sin(a) * r * 0.62; pPos[j * 3 + 2] = -1.2; }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  var pMat = new THREE.PointsMaterial({ size: 0.09, map: dotTexture(), transparent: true, opacity: 0, depthWrite: false, color: 0xffeec9 });
  var particles = new THREE.Points(pGeo, pMat); scene.add(particles);

  /* ---- state + smoothing (spec §11: lerpSpeed .1 class) ---- */
  var target = { bgTop: [0, 0, 0], bgBot: [0, 0, 0], discDiam: 0, discFeather: 0.2, discOpacity: 0, discGlow: 0,
    particleOpacity: 0, particleScale: 0.001, aurora: 0, bubbles: 0, ringP: 0, ringOpacity: 0, weights: {} };
  var cur = JSON.parse(JSON.stringify(target)); cur.weights = {};
  ['kv', 'ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'on', 'off'].forEach(function (k) { target.weights[k] = 0; cur.weights[k] = 0; });
  var LF = 0.12;
  function lerpN(a, b) { return a + (b - a) * LF; }

  window.GL = {
    setState: function (s) {
      for (var k in s) { if (k === 'weights') { for (var w in s.weights) target.weights[w] = s.weights[w]; } else target[k] = s[k]; }
    },
    getState: function () { return cur; },
    resize: function () {
      W = window.innerWidth; H = window.innerHeight;
      renderer.setSize(W, H);
    }
  };

  var clock = new THREE.Clock();
  (function frame() {
    requestAnimationFrame(frame);
    var t = clock.getElapsedTime();
    cur.bgTop = cur.bgTop.map(function (v, i) { return lerpN(v, target.bgTop[i]); });
    cur.bgBot = cur.bgBot.map(function (v, i) { return lerpN(v, target.bgBot[i]); });
    ['discDiam', 'discFeather', 'discOpacity', 'discGlow', 'particleOpacity', 'particleScale', 'aurora', 'bubbles', 'ringP', 'ringOpacity'].forEach(function (k) { cur[k] = lerpN(cur[k], target[k]); });
    for (var w in cur.weights) cur.weights[w] = lerpN(cur.weights[w], target.weights[w] || 0);

    bgMat.uniforms.uTop.value.setRGB(cur.bgTop[0], cur.bgTop[1], cur.bgTop[2]);
    bgMat.uniforms.uBot.value.setRGB(cur.bgBot[0], cur.bgBot[1], cur.bgBot[2]);

    var diamWorld = cur.discDiam / Math.max(H, 1) * 6;
    disc.scale.set(diamWorld, diamWorld, 1);
    discMat.uniforms.uFeather.value = cur.discFeather;
    discMat.uniforms.uGlow.value = cur.discGlow;
    discMat.uniforms.uOpacity.value = cur.discOpacity;
    discMat.uniforms.uTime.value = t;
    disc.visible = cur.discOpacity > 0.01 && cur.discDiam > 2;

    ringMat.uniforms.uP.value = cur.ringP;
    ringMat.uniforms.uOpacity.value = cur.ringOpacity;
    ring.visible = cur.ringOpacity > 0.01;

    aurMat.uniforms.uMix.value = cur.aurora;
    aurMat.uniforms.uTime.value = t;
    aurora.visible = cur.aurora > 0.01;

    bubbleMat.opacity = cur.bubbles * 0.55;
    bubbles.visible = cur.bubbles > 0.02;
    if (bubbles.visible) {
      var pos = bubbleGeo.attributes.position.array;
      for (var i2 = 0; i2 < BN; i2++) { pos[i2 * 3 + 1] += 0.0016 + bSeed[i2] * 0.0022; pos[i2 * 3] += Math.sin(t * 0.6 + bSeed[i2] * 9) * 0.0009; if (pos[i2 * 3 + 1] > 3.2) pos[i2 * 3 + 1] = -3.2; }
      bubbleGeo.attributes.position.needsUpdate = true;
    }
    pMat.opacity = cur.particleOpacity;
    particles.scale.set(cur.particleScale, cur.particleScale, 1);
    particles.rotation.z = t * 0.05;
    particles.visible = cur.particleOpacity > 0.01;

    Object.keys(groups).forEach(function (key) {
      var wgt = cur.weights[key] || 0, g = groups[key];
      g.visible = wgt > 0.02;
      if (!g.visible) return;
      g.children.forEach(function (m, idx) {
        m.material.opacity = wgt * (SETS[key].dim || 0.92);
        m.position.y = m.userData.baseY + Math.sin(t * 0.35 + m.userData.seed) * 0.05;
      });
    });
    renderer.render(scene, camera);
  })();
})();
