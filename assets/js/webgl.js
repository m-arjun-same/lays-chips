/* Lay's V2 — WebGL scene engine (own code, Three.js vendored)
   Fixed canvas behind the page. A global state object (window.__sceneState)
   is driven by main.js from scroll: { field: target bg colour mix,
   disc: 0..1 disc scale, planes: 0..1 plane visibility, particles: 0..1,
   aurora: 0..1 bright mint field, pale: 0..1 light field }            */
(function () {
  var mount = document.getElementById('webgl');
  if (!mount || !window.THREE) return;

  var state = (window.__sceneState = {
    bg: new THREE.Color(0x060a09), // near-black green (KV)
    disc: 0,          // disc scale factor 0..1
    discGlow: 0,      // disc brightness
    planes: 0,        // floating photo planes opacity
    planeTint: new THREE.Color(0x1d4a3a), // dark green multiply tint
    particles: 0,     // particle opacity
    aurora: 0,        // chapter-4 bright field
    field: 0          // generic green field strength
  });

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  mount.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060a09);
  var camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 10);
  var vf = 1; // viewport factor: shrink disc/planes on narrow (portrait) screens
  function computeVF() { vf = Math.max(0.55, Math.min(1, camera.aspect / 1.55)); }
  computeVF();

  /* ---- aurora field: big plane with a soft radial mint gradient shader ---- */
  var auroraMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uP: { value: 0 }, uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'varying vec2 vUv; uniform float uP; uniform float uTime;',
      'void main(){',
      '  vec2 c = vUv - 0.5;',
      '  float d = length(c * vec2(1.2, 1.0));',
      '  vec3 deep = vec3(0.0, 0.36, 0.20);',
      '  vec3 mid  = vec3(0.05, 0.85, 0.55);',
      '  vec3 lite = vec3(0.60, 0.96, 0.84);',
      '  float w1 = sin(vUv.x * 6.0 + uTime * 0.12) * 0.5 + 0.5;',
      '  vec3 col = mix(deep, mid, smoothstep(0.85, 0.15, d));',
      '  col = mix(col, lite, smoothstep(0.45, 0.0, d) * (0.55 + 0.25 * w1));',
      '  gl_FragColor = vec4(col, uP);',
      '}'
    ].join('\n')
  });
  var aurora = new THREE.Mesh(new THREE.PlaneGeometry(30, 18), auroraMat);
  aurora.position.z = -6;
  scene.add(aurora);

  /* ---- the disc: glowing circle that lives between the hero brackets ---- */
  function discTexture() {
    var c = document.createElement('canvas'); c.width = c.height = 512;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(256, 256, 20, 256, 256, 256);
    grad.addColorStop(0, 'rgba(235,255,246,1)');
    grad.addColorStop(0.35, 'rgba(178,246,214,0.95)');
    grad.addColorStop(0.7, 'rgba(64,199,133,0.55)');
    grad.addColorStop(1, 'rgba(0,168,82,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
    // chip-ridged edge rings (faint)
    g.strokeStyle = 'rgba(255,255,255,0.13)'; g.lineWidth = 2;
    for (var r = 130; r < 235; r += 30) { g.beginPath(); g.arc(256, 256, r, 0, Math.PI * 2); g.stroke(); }
    var t = new THREE.CanvasTexture(c);
    return t;
  }
  var discMat = new THREE.MeshBasicMaterial({ map: discTexture(), transparent: true, depthWrite: false, opacity: 0 });
  var disc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), discMat);
  disc.position.set(0, 0.1, 1);
  scene.add(disc);

  /* ---- floating texture planes (chapter photo plates) ---- */
  var planeGroup = new THREE.Group();
  scene.add(planeGroup);
  var planeDefs = [
    { src: 'assets/images/plates/plate-1.jpg', x: -3.4, y: 1.6, z: -1.5, w: 3.4, rz: 0.06 },
    { src: 'assets/images/plates/plate-2.jpg', x: 3.6, y: 1.9, z: -2.5, w: 2.6, rz: -0.05 },
    { src: 'assets/images/plates/plate-3.jpg', x: 4.6, y: -0.6, z: -1.0, w: 4.4, rz: 0.03 },
    { src: 'assets/images/plates/plate-4.jpg', x: -4.4, y: -1.8, z: -2.0, w: 2.4, rz: -0.04 },
    { src: 'assets/images/plates/plate-5.jpg', x: 0.4, y: -2.6, z: -3.0, w: 3.0, rz: 0.05 },
    { src: 'assets/images/plates/plate-1.jpg', x: -1.8, y: 2.8, z: -3.5, w: 2.2, rz: 0.02 },
    { src: 'assets/images/plates/plate-3.jpg', x: 2.2, y: -3.1, z: -2.2, w: 2.6, rz: -0.06 }
  ];
  var loader = new THREE.TextureLoader();
  var planes = [];
  planeDefs.forEach(function (d, i) {
    var mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, color: state.planeTint.clone() });
    var m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.w * 0.66), mat);
    m.position.set(d.x, d.y, d.z);
    m.rotation.z = d.rz;
    m.userData = { baseY: d.y, baseX: d.x, phase: i * 1.37, speed: 0.5 + (i % 3) * 0.17 };
    planeGroup.add(m); planes.push(m);
    loader.load(d.src, function (tex) { mat.map = tex; mat.needsUpdate = true; });
  });

  /* ---- particles (bubbles in the green field) ---- */
  var pCount = 180;
  var pGeo = new THREE.BufferGeometry();
  var pPos = new Float32Array(pCount * 3);
  for (var i = 0; i < pCount; i++) {
    pPos[i * 3] = (Math.random() - 0.5) * 18;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 11;
    pPos[i * 3 + 2] = -1 - Math.random() * 4;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  var pMat = new THREE.PointsMaterial({ color: 0xeafff3, size: 0.085, transparent: true, opacity: 0, depthWrite: false });
  var particles = new THREE.Points(pGeo, pMat);
  scene.add(particles);

  /* ---- smooth-follow current values ---- */
  var cur = { disc: 0, planes: 0, particles: 0, aurora: 0 };
  var bgCur = new THREE.Color(0x060a09);
  var tintCur = state.planeTint.clone();
  var mouseX = 0, mouseY = 0;
  window.addEventListener('pointermove', function (e) {
    mouseX = (e.clientX / window.innerWidth - 0.5);
    mouseY = (e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  var clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    var t = clock.getElapsedTime();
    var k = 0.09; // easing follow
    cur.disc += (state.disc - cur.disc) * k;
    cur.planes += (state.planes - cur.planes) * k;
    cur.particles += (state.particles - cur.particles) * k;
    cur.aurora += (state.aurora - cur.aurora) * k;
    bgCur.lerp(state.bg, k);
    tintCur.lerp(state.planeTint, k);
    scene.background.copy(bgCur);
    auroraMat.uniforms.uP.value = cur.aurora;
    auroraMat.uniforms.uTime.value = t;
    // disc: scale from a dot to a wide glow, centred between the brackets
    var s = (0.25 + cur.disc * 4.6) * vf;
    disc.scale.set(s, s, 1);
    discMat.opacity = Math.min(1, cur.disc * 1.6);
    disc.position.x = mouseX * 0.25;
    disc.position.y = 0.1 - mouseY * 0.2 + Math.sin(t * 0.6) * 0.03;
    disc.rotation.z = t * 0.02;
    // planes drift
    planes.forEach(function (m) {
      var u = m.userData;
      m.position.y = u.baseY + Math.sin(t * u.speed + u.phase) * 0.14;
      m.position.x = u.baseX + Math.cos(t * u.speed * 0.7 + u.phase) * 0.1 + mouseX * (0.2 + u.phase * 0.03);
      m.material.opacity = cur.planes * 0.6;
      m.material.color.copy(tintCur);
      m.scale.set(vf, vf, 1);
    });
    planeGroup.position.y = -mouseY * 0.15;
    // particles float upward slowly
    pMat.opacity = cur.particles * 0.75;
    particles.rotation.z = t * 0.005;
    var arr = pGeo.attributes.position.array;
    for (var j = 0; j < pCount; j++) {
      arr[j * 3 + 1] += 0.0016 + (j % 5) * 0.0003;
      if (arr[j * 3 + 1] > 5.8) arr[j * 3 + 1] = -5.8;
    }
    pGeo.attributes.position.needsUpdate = true;
    renderer.render(scene, camera);
  }
  tick();

  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    computeVF();
  });
})();
