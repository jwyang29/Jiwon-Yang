// A pinch of sand wherever the page is tapped (phone) or clicked (desktop).
// Listens to click rather than pointerdown so that scrolling on a phone does not throw sand.
// The drawing tray has its own sand, so taps there are left alone. Nothing happens when motion is turned down.
(function () {
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cv = document.createElement('canvas');
  cv.className = 'sprinkle';
  cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  var ctx = cv.getContext('2d');
  if (!ctx) return;

  var W = 0, H = 0, dpr = 1, grains = [], raf = 0, last = 0;

  function size() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  }
  function gauss() {
    var u = 1 - Math.random(), v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function sprinkle(x, y) {
    var n = 56 + Math.floor(Math.random() * 20);
    for (var i = 0; i < n; i++) {
      var a = -Math.PI / 2 + gauss() * 1.15;          // thrown mostly up and out, then falling
      var sp = 0.05 + Math.pow(Math.random(), 1.4) * 0.36;
      grains.push({
        x: x + gauss() * 2, y: y + gauss() * 2,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        s: 0.9 + Math.pow(Math.random(), 2) * 1.9,     // mostly fine grains, a few coarse ones
        age: 0, life: 800 + Math.random() * 700
      });
    }
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  function frame(now) {
    raf = 0;
    var dt = Math.min(40, now - last); last = now;
    var dragX = Math.pow(0.995, dt), dragY = Math.pow(0.997, dt);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    var keep = [];
    for (var i = 0; i < grains.length; i++) {
      var g = grains[i];
      g.age += dt;
      if (g.age >= g.life) continue;
      g.vy += 0.0011 * dt;
      g.vx *= dragX; g.vy *= dragY;
      g.x += g.vx * dt; g.y += g.vy * dt;
      var fade = g.age < g.life * 0.55 ? 1 : 1 - (g.age - g.life * 0.55) / (g.life * 0.45);
      ctx.globalAlpha = fade;
      ctx.fillRect(g.x - g.s / 2, g.y - g.s / 2, g.s, g.s);
      keep.push(g);
    }
    ctx.globalAlpha = 1;
    grains = keep;
    if (grains.length) raf = requestAnimationFrame(frame);
  }

  document.addEventListener('click', function (e) {
    if (e.detail === 0) return;                                        // keyboard activation has no position
    if (e.target && e.target.closest && e.target.closest('#tray')) return;
    sprinkle(e.clientX, e.clientY);
  });

  size();
  window.addEventListener('resize', size);
})();
