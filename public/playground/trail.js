// The long line under the steps comes apart into grains of sand.
// Same seed every time, so every visitor sees the same trail. Redrawn only when the column width changes.
(function () {
  var box = document.getElementById('trail');
  if (!box) return;
  var NS = 'http://www.w3.org/2000/svg';
  var X = 0.605;          // share of the column, measured from the printed caption
  var SOLID = 0.42;       // the line stays whole for this share of its length
  var BREAK = 0.60;       // then breaks into shorter and shorter dashes, then grains

  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function gauss(r) {
    var u = 1 - r(), v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  var lastW = 0;
  function draw() {
    var w = box.clientWidth, h = box.clientHeight;
    if (!w || w === lastW) return;
    lastW = w;
    var r = rng(29);
    var x0 = Math.round(w * X) + 0.5;
    var svg = el('svg', { viewBox: '0 0 ' + w + ' ' + h, 'aria-hidden': 'true', focusable: 'false' });
    var g = el('g', { fill: '#000', stroke: 'none' });

    // whole line
    svg.appendChild(el('line', { x1: x0, y1: 0, x2: x0, y2: h * SOLID, stroke: '#000', 'stroke-width': 1 }));

    // dashes that shorten while the gaps open up
    var y = h * SOLID, dash = 9, gap = 1.5;
    while (y < h * BREAK) {
      var t = (y - h * SOLID) / (h * (BREAK - SOLID));
      var dx = gauss(r) * 0.6 * t;
      var len = Math.max(1.2, dash * (1 - t));
      svg.appendChild(el('line', { x1: x0 + dx, y1: y, x2: x0 + dx, y2: y + len, stroke: '#000', 'stroke-width': 1 }));
      y += len + gap;
      gap += 0.9;
    }

    // grains: following the line at first, then drifting wider and thinner toward the bottom
    var start = h * BREAK, span = h - start;
    for (var i = 0; i < 200; i++) {
      var u = r();
      var yy = start + u * span;
      var spread = 1 + Math.pow(u, 1.3) * 38;
      var xx = x0 + gauss(r) * spread;
      var rad = (1.15 - 0.7 * u) * (0.55 + 0.45 * r());
      g.appendChild(el('circle', { cx: xx.toFixed(2), cy: yy.toFixed(2), r: rad.toFixed(2) }));
    }
    svg.appendChild(g);

    box.textContent = '';
    box.appendChild(svg);
    box.classList.add('drawn');
  }

  draw();

  // lines draw themselves in, the way the gantry draws: the title rule first, then each piece as it scrolls in
  window.linesReady = true;
  var root = document.documentElement;
  if (root.classList.contains('anim')) {
    var title = document.querySelector('.title');
    requestAnimationFrame(function () { requestAnimationFrame(function () { title.classList.add('in'); }); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('.steps li, .trail').forEach(function (n) { io.observe(n); });
  }

  var timer;
  window.addEventListener('resize', function () {
    clearTimeout(timer);
    timer = setTimeout(draw, 120);
  });
})();
