// A small tray of sand, a pocket version of the piece, following its exhibition code (playground_final.py).
// A translucent cloth lies over the sand. The visitor draws on the cloth: it gives under the finger, its threads
// pull toward the dent and the sand shows through where it stretches thin. A moment after the last stroke the cloth
// lifts away and the tray reads the strokes,
// says what it felt in the piece's own LCD words, retraces them as grooves, then adds three to five
// short strokes of its own in the empty sand, shaped by the feeling it read (MACHINE_FEEL).
// A phone cannot sense pressure, so every touch counts as soft: the feeling is fast_soft or slow_soft.
// "Smooth the sand" sweeps every grain back.
(function () {
  var tray = document.getElementById('tray');
  var foot = document.getElementById('trayfoot');
  if (!tray || !foot) return;
  var cv = tray.querySelector('canvas');
  var ctx = cv && cv.getContext && cv.getContext('2d');
  if (!ctx) return;
  var reading = document.getElementById('reading');
  var smoothBtn = document.getElementById('smooth');
  tray.hidden = false;
  foot.hidden = false;

  // words and settings taken from the piece
  var IDLE_MSG = "draw me something!|i'm right here :)";
  var MACHINE_INTRO = 'now let me|add to it...';
  var FINAL_MSG = 'ah, i think|i felt it :)';
  var RESET_MSG = 'that was fun!|smooth the sand~';
  var MACHINE_DONE = {
    fast_soft: "i felt your lightness|here's mine",
    slow_soft: 'i felt your calm|so i stayed soft'
  };
  var GUESS = {
    fast_soft: ['light and quick|like a breath', 'fast but gentle|barely touching', 'fluttering by|so soft, so fast',
      'a hurried whisper|on my skin', 'quick little wings|so delicate', 'soft and racing|like a giggle',
      'you brushed past|light as air', 'gentle but eager|i almost missed it', 'feathery and fast|a happy rush',
      'skimming softly|here and gone', 'playful and light|quick fingers', 'barely pressing|but full of life',
      'a soft sprint|sweet and brief', 'tender and swift|like a daydream', 'light footsteps|across my skin',
      'fast and shy|a fleeting touch'],
    slow_soft: ['slow and tender|so gentle', 'soft, unhurried|like a quiet sigh', 'barely there|drifting slowly',
      "calm and light|i'm listening close", 'a gentle pause|soft as fog', 'slow as breathing|so peaceful',
      'tender and quiet|you took your time', 'drifting softly|like falling snow', 'light and slow|a calm little hum',
      'so soft i lean in|to feel it', 'gentle ripples|slow and warm', 'gliding quietly|nothing to rush',
      'a soft daydream|drawn slowly', 'feather light|and so unhurried', 'calm hands today|soft and slow',
      'quiet and kind|i feel your calm']
  };
  var MACHINE_FEEL = {
    fast_soft: { jitter: 12, curve: true, pts: [3, 4] },
    slow_soft: { jitter: 6, curve: true, pts: [3, 4] }
  };
  var DRAW_SCALE = 0.7;         // the piece uses 0.22 (MACHINE_DRAW_SCALE); on a phone that read too short, so longer here
  var STROKES = [3, 5];         // MACHINE_STROKES
  var FIELD_MM = 240;           // INPUT_MAX minus INPUT_MIN

  // settings for this page
  var SPEED_FAST = 0.5;         // css px per ms, average finger speed above this reads as fast
  var SESSION_WAIT = 1500;      // ms after the last stroke before the tray answers
  var GAP = 3.4;                // grain spacing
  var SOFT = 0.3;               // the heap thins out over this share of its radius
  var GROOVE = 4.5;             // groove radius
  var PACE = 0.22;              // drawing pace, px per ms
  var TRAVEL = 0.6;             // pen up travel pace
  var FG = 5;                   // cloth thread spacing
  var SIGMA = 16;               // size of the dent under a fingertip
  var PULL = 40;                // how far threads are drawn toward a dent

  var W = 0, H = 0, dpr = 1, N = 0;
  var rx, ry, gx, gy, mv;      // rest and current positions, and which grains were pushed
  var session = [], drawing = null, press = null;
  var cols = 0, rows = 0, cd, cvel, fcv, fctx, small, sctx, img;
  var cloth = 1, clothTo = 1, clothDirty = true, clothMoving = false;
  var head = null, queue = [], job = null, sweep = null;
  var timers = [], chatter = 0, waitTimer = 0;
  var raf = 0, last = 0;

  function seeded(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function uni(a, b) { return a + Math.random() * (b - a); }
  function wrap(a) { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; }
  function randint(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function say(msg) { reading.textContent = msg.replace('|', '\n'); }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function quiet() {
    timers.forEach(clearTimeout); timers = [];
    clearTimeout(waitTimer); waitTimer = 0;
    clearInterval(chatter); chatter = 0;
    queue = []; job = null; head = null;
  }

  // sand
  function build() {
    var w = tray.clientWidth, h = tray.clientHeight;
    if (!w || !h || w === W) return;
    W = w; H = h;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    var r = seeded(11), xs = [], ys = [];
    for (var y = GAP / 2; y < H; y += GAP) {
      for (var x = GAP / 2; x < W; x += GAP) {
        var px = x + (r() - 0.5) * GAP * 0.9, py = y + (r() - 0.5) * GAP * 0.9;
        // a rounded heap rather than a box: superellipse, thinning toward the rim
        var ex = Math.abs(px - W / 2) / (W / 2), ey = Math.abs(py - H / 2) / (H / 2);
        var e = (1 - Math.pow(Math.pow(ex, 3) + Math.pow(ey, 3), 1 / 3)) / SOFT;
        var keep = e >= 1 ? 1 : e <= 0 ? 0 : e * e * (3 - 2 * e);
        if (r() < keep * 0.9) { xs.push(px); ys.push(py); }
      }
    }
    N = xs.length;
    rx = new Float32Array(xs); ry = new Float32Array(ys);
    gx = new Float32Array(xs); gy = new Float32Array(ys); mv = new Uint8Array(N);
    quiet(); session = []; drawing = null; press = null; sweep = null;
    buildCloth(); cloth = 1; clothTo = 1;
    say(IDLE_MSG);
    kick();
  }

  function push(px, py, rad) {
    var r2 = rad * rad;
    for (var i = 0; i < N; i++) {
      var dx = gx[i] - px; if (dx > rad || dx < -rad) continue;
      var dy = gy[i] - py; if (dy > rad || dy < -rad) continue;
      var d2 = dx * dx + dy * dy; if (d2 >= r2) continue;
      var d = Math.sqrt(d2), ux, uy;
      if (d < 0.01) { var a = Math.random() * 6.2832; ux = Math.cos(a); uy = Math.sin(a); }
      else { ux = dx / d; uy = dy / d; }
      var nd = rad + Math.random() * 1.4;
      gx[i] = px + ux * nd; gy[i] = py + uy * nd; mv[i] = 1;
    }
  }

  // cloth
  function buildCloth() {
    cols = Math.ceil(W / FG) + 1; rows = Math.ceil(H / FG) + 1;
    cd = new Float32Array(cols * rows); cvel = new Float32Array(cols * rows);
    fcv = fcv || document.createElement('canvas');
    fcv.width = cv.width; fcv.height = cv.height; fctx = fcv.getContext('2d');
    small = small || document.createElement('canvas');
    small.width = cols; small.height = rows; sctx = small.getContext('2d');
    img = sctx.createImageData(cols, rows);
    clothDirty = true;
  }
  // each point of the cloth sinks toward the dent under the finger, gives quickly, recovers slowly with a small wobble
  function stepCloth(dt) {
    var f = dt / 16.7, moving = false, s2 = 2 * SIGMA * SIGMA, reach = 9 * SIGMA * SIGMA;
    var dampIn = Math.pow(0.82, f), dampOut = Math.pow(0.86, f);
    for (var j = 1; j < rows - 1; j++) {
      for (var i = 1; i < cols - 1; i++) {
        var n = j * cols + i, t = 0;
        if (press) {
          var dx = i * FG - press.x, dy = j * FG - press.y, r2 = dx * dx + dy * dy;
          if (r2 < reach) t = Math.exp(-r2 / s2);
        }
        var giving = t > cd[n];
        cvel[n] = (cvel[n] + (t - cd[n]) * (giving ? 0.35 : 0.035) * f) * (giving ? dampIn : dampOut);
        cd[n] += cvel[n] * f;
        if (Math.abs(cd[n]) > 0.002 || Math.abs(cvel[n]) > 0.002) moving = true;
        else { cd[n] = 0; cvel[n] = 0; }
      }
    }
    return moving;
  }
  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function nodeX(i, j) { var n = j * cols + i; return i * FG + (i > 0 && i < cols - 1 && j > 0 && j < rows - 1 ? (cd[n + 1] - cd[n - 1]) * 0.5 * PULL : 0); }
  function nodeY(i, j) { var n = j * cols + i; return j * FG + (i > 0 && i < cols - 1 && j > 0 && j < rows - 1 ? (cd[n + cols] - cd[n - cols]) * 0.5 * PULL : 0); }
  function drawCloth() {
    var c = fctx, i, j;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, W, H);
    c.save();
    roundRect(c, 3, 3, W - 6, H - 6, 22); c.clip();
    c.fillStyle = 'rgba(255,255,255,0.86)'; c.fillRect(0, 0, W, H);
    // threads, drawn toward wherever the cloth is pressed down
    c.beginPath();
    for (j = 0; j < rows; j++) { c.moveTo(nodeX(0, j), nodeY(0, j)); for (i = 1; i < cols; i++) c.lineTo(nodeX(i, j), nodeY(i, j)); }
    for (i = 0; i < cols; i++) { c.moveTo(nodeX(i, 0), nodeY(i, 0)); for (j = 1; j < rows; j++) c.lineTo(nodeX(i, j), nodeY(i, j)); }
    c.strokeStyle = 'rgba(0,0,0,0.06)'; c.lineWidth = 0.5; c.stroke();
    if (press) {
      // under the fingertip: a soft shadow, and the stretched threads read darker
      var g = c.createRadialGradient(press.x, press.y, 0, press.x, press.y, SIGMA * 2.2);
      g.addColorStop(0, 'rgba(0,0,0,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(press.x - SIGMA * 3, press.y - SIGMA * 3, SIGMA * 6, SIGMA * 6);
      c.save();
      c.beginPath(); c.arc(press.x, press.y, SIGMA * 2.6, 0, 6.2832); c.clip();
      c.beginPath();
      var i0 = Math.max(0, Math.floor((press.x - SIGMA * 3) / FG)), i1 = Math.min(cols - 1, Math.ceil((press.x + SIGMA * 3) / FG));
      var j0 = Math.max(0, Math.floor((press.y - SIGMA * 3) / FG)), j1 = Math.min(rows - 1, Math.ceil((press.y + SIGMA * 3) / FG));
      for (j = j0; j <= j1; j++) { c.moveTo(nodeX(i0, j), nodeY(i0, j)); for (i = i0 + 1; i <= i1; i++) c.lineTo(nodeX(i, j), nodeY(i, j)); }
      for (i = i0; i <= i1; i++) { c.moveTo(nodeX(i, j0), nodeY(i, j0)); for (j = j0 + 1; j <= j1; j++) c.lineTo(nodeX(i, j), nodeY(i, j)); }
      c.strokeStyle = 'rgba(0,0,0,0.16)'; c.stroke();
      c.restore();
    }
    // where it is pressed the cloth stretches thin and the sand shows through
    var data = img.data;
    for (var n = 0; n < cd.length; n++) data[n * 4 + 3] = cd[n] > 0 ? Math.min(1, cd[n]) * 120 : 0;
    sctx.putImageData(img, 0, 0);
    c.globalCompositeOperation = 'destination-out';
    c.imageSmoothingEnabled = true;
    c.drawImage(small, -FG / 2, -FG / 2, cols * FG, rows * FG);
    c.restore();
    roundRect(c, 3.5, 3.5, W - 7, H - 7, 22);
    c.strokeStyle = 'rgba(0,0,0,0.14)'; c.lineWidth = 1; c.stroke();
  }

  // loop, runs only while something moves
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function frame(now) {
    raf = 0;
    var dt = Math.min(50, now - last); last = now;
    var busy = !!drawing;
    if (job) { stepJob(dt); busy = true; }
    if (press || clothMoving) { clothMoving = stepCloth(dt); clothDirty = true; busy = true; }
    if (cloth !== clothTo) {
      cloth = clothTo > cloth ? Math.min(clothTo, cloth + dt / 600) : Math.max(clothTo, cloth - dt / 700);
      busy = true;
    }
    if (sweep) { stepSweep(dt); busy = true; }
    render();
    if (busy) kick();
  }

  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#000';
    // pushed grains pile up on the rims and read a little heavier, so a groove shows as a channel
    for (var i = 0; i < N; i++) {
      if (mv[i]) ctx.fillRect(gx[i] - 0.8, gy[i] - 0.8, 1.6, 1.6);
      else ctx.fillRect(gx[i] - 0.5, gy[i] - 0.5, 1.05, 1.05);
    }
    if (cloth > 0.01) {
      if (clothDirty) { drawCloth(); clothDirty = false; }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = cloth;
      ctx.drawImage(fcv, 0, -(1 - cloth) * 10 * dpr);   // lifts a little as it goes
      ctx.globalAlpha = 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000';
    }
    if (sweep) ctx.fillRect(Math.round(sweep.x), 0, 1, H);
    if (head) {
      ctx.beginPath(); ctx.arc(head.x, head.y, GROOVE + 2.5, 0, 6.2832);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#000'; ctx.fillRect(head.x - 1, head.y - 1, 2, 2);
    }
  }

  // the gantry: a queue of moves, pen down carves, pen up only travels
  function move(pts, pen, pace, then) {
    var cum = [0];
    for (var i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
    return { pts: pts, cum: cum, total: cum[cum.length - 1], pen: pen, pace: pace, then: then, d: 0, k: 0 };
  }
  function pointAt(j, d) {
    while (j.k < j.pts.length - 2 && j.cum[j.k + 1] < d) j.k++;
    var a = j.pts[j.k], b = j.pts[j.k + 1] || a;
    var seg = (j.cum[j.k + 1] - j.cum[j.k]) || 1, t = clamp((d - j.cum[j.k]) / seg, 0, 1);
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  }
  function run(list) { queue = list; next(); kick(); }
  function next() {
    job = queue.shift() || null;
    if (job && !head) head = { x: job.pts[0].x, y: job.pts[0].y };
  }
  function stepJob(dt) {
    var target = Math.min(job.total, job.d + job.pace * dt);
    if (job.pen && job.d === 0) push(job.pts[0].x, job.pts[0].y, GROOVE);
    while (job.d < target) {
      job.d = Math.min(target, job.d + 1.2);
      head = pointAt(job, job.d);
      if (job.pen) push(head.x, head.y, GROOVE);
    }
    if (job.d >= job.total) { var then = job.then; next(); if (then) then(); }
  }
  // a path through the given points, travelling to its start with the pen up first
  function plot(list, pts, then) {
    var from = list.length ? list[list.length - 1].pts.slice(-1)[0] : (head || pts[0]);
    list.push(move([from, pts[0]], false, TRAVEL));
    list.push(move(pts, true, PACE, then));
  }

  // reading the session (analyze_feeling, without pressure)
  function feel(strokes) {
    var speeds = [];
    strokes.forEach(function (s) {
      for (var i = 1; i < s.length; i++) {
        var dt = s[i].t - s[i - 1].t;
        if (dt > 0) speeds.push(Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y) / dt);
      }
    });
    var avg = speeds.length ? speeds.reduce(function (a, b) { return a + b; }, 0) / speeds.length : 0;
    return avg >= SPEED_FAST ? 'fast_soft' : 'slow_soft';
  }

  // the heap's drawing field, standing in for the fabric's 240 mm square
  function field() {
    var span = Math.min(W, H) * 0.82;
    return { cx: W / 2, cy: H / 2, span: span, k: span / FIELD_MM, size: span * DRAW_SCALE * 0.5 };
  }
  // find_empty_spot, extended. The piece only needs a spot because its strokes are tiny; here they are longer,
  // so a start point and a heading are picked together: the lane (start, middle, end) farthest from every line
  // already in the sand, staying on the sand. Strokes then sit beside the drawing instead of crossing it.
  function emptyLane(taken, f) {
    var lim = f.span / 2 - 10 * f.k, best = null, bestS = -1;
    function clear(x, y) {
      var d = Infinity;
      for (var j = 0; j < taken.length; j++) d = Math.min(d, Math.hypot(x - taken[j].x, y - taken[j].y));
      return d;
    }
    for (var i = 0; i < 40; i++) {
      var x = f.cx + uni(-lim, lim), y = f.cy + uni(-lim, lim), a = uni(0, 2 * Math.PI);
      var ex = x + Math.cos(a) * f.size, ey = y + Math.sin(a) * f.size;
      if (Math.abs(ex - f.cx) > lim || Math.abs(ey - f.cy) > lim) continue;
      var sc = Math.min(clear(x, y), clear((x + ex) / 2, (y + ey) / 2), clear(ex, ey));
      if (sc > bestS) { bestS = sc; best = { x: x, y: y, a: a }; }
    }
    return best || { x: f.cx, y: f.cy, a: uni(0, 2 * Math.PI) };
  }
  // generate_machine_stroke
  function machineStroke(c, cfg, f) {
    var n = randint(cfg.pts[0], cfg.pts[1]);
    var ang = c.a;
    var size = f.size, lim = f.span / 2;
    var x = c.x, y = c.y, pts = [];
    for (var i = 0; i < n; i++) {
      if (cfg.curve) ang += uni(-0.5, 0.5);
      else if (Math.random() < 0.3) ang += uni(-1.2, 1.2);
      var step = size / Math.max(1, n);
      // a longer stroke can run off the sand: turn it back toward the middle instead of flattening it on the edge
      var ahead = { x: x + Math.cos(ang) * step, y: y + Math.sin(ang) * step };
      if (Math.abs(ahead.x - f.cx) > lim || Math.abs(ahead.y - f.cy) > lim) ang += clamp(wrap(Math.atan2(f.cy - y, f.cx - x) - ang), -0.8, 0.8);
      x += Math.cos(ang) * step + uni(-cfg.jitter, cfg.jitter) * 0.3 * f.k;
      y += Math.sin(ang) * step + uni(-cfg.jitter, cfg.jitter) * 0.3 * f.k;
      x = clamp(x, f.cx - lim, f.cx + lim); y = clamp(y, f.cy - lim, f.cy + lim);
      pts.push({ x: x, y: y });
    }
    return cfg.curve ? curve(pts) : pts;
  }
  // the gantry interpolates its points so curves stay curves
  function curve(p) {
    if (p.length < 3) return p;
    var out = [p[0]];
    for (var i = 0; i < p.length - 1; i++) {
      var a = p[i - 1] || p[i], b = p[i], c = p[i + 1], d = p[i + 2] || c;
      for (var s = 1; s <= 6; s++) {
        var t = s / 6, t2 = t * t, t3 = t2 * t;
        out.push({
          x: 0.5 * (2 * b.x + (c.x - a.x) * t + (2 * a.x - 5 * b.x + 4 * c.x - d.x) * t2 + (3 * b.x - a.x - 3 * c.x + d.x) * t3),
          y: 0.5 * (2 * b.y + (c.y - a.y) * t + (2 * a.y - 5 * b.y + 4 * c.y - d.y) * t2 + (3 * b.y - a.y - 3 * c.y + d.y) * t3)
        });
      }
    }
    return out;
  }

  // replay_on_gantry
  function answer() {
    var strokes = session.filter(function (s) { return s.length > 1; });
    var len = 0;
    strokes.forEach(function (s) {
      for (var i = 0; i < s.length; i++) {
        if (i) len += Math.hypot(s[i].x - s[i - 1].x, s[i].y - s[i - 1].y);
      }
    });
    if (len < 12) { session = []; return; }

    var feeling = feel(strokes), cfg = MACHINE_FEEL[feeling];
    var pool = GUESS[feeling].slice().sort(function () { return Math.random() - 0.5; }), idx = 0;
    say(pool[idx++]);
    chatter = setInterval(function () { say(pool[idx++ % pool.length]); }, 4000);
    clothTo = 0; kick();                 // the cloth lifts off the sand

    var list = [];
    strokes.forEach(function (s, i) {
      plot(list, s, i === strokes.length - 1 ? afterTrace : null);
    });
    later(function () { run(list); }, 700);

    function afterTrace() {
      clearInterval(chatter); chatter = 0;
      say(MACHINE_INTRO);
      later(function () {
        var f = field(), n = randint(STROKES[0], STROKES[1]), more = [], taken = [];
        strokes.forEach(function (st) { for (var q = 0; q < st.length; q += 4) taken.push(st[q]); });
        for (var i = 0; i < n; i++) {
          var ms = machineStroke(emptyLane(taken, f), cfg, f);
          for (var q = 0; q < ms.length; q += 3) taken.push(ms[q]);
          plot(more, ms, i === n - 1 ? done : null);
        }
        run(more);
      }, 1600);
    }
    function done() {
      head = null; kick();
      say(MACHINE_DONE[feeling]);
      later(function () { say(FINAL_MSG); }, 3500);
      later(function () { say(RESET_MSG); }, 7000);
    }
    session = [];
  }

  // the visitor
  function at(e) { var b = cv.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top, t: e.timeStamp }; }

  cv.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try { cv.setPointerCapture(e.pointerId); } catch (err) {}
    if (waitTimer) { clearTimeout(waitTimer); waitTimer = 0; }     // another stroke in the same session
    else if (job || chatter || timers.length || head) { quiet(); session = []; }   // the visitor takes over
    drawing = { id: e.pointerId, pts: [at(e)] };
    session.push(drawing.pts);
    press = drawing.pts[0];
    clothTo = 1;                         // drawing always happens on the cloth
    kick();
  });
  cv.addEventListener('pointermove', function (e) {
    if (!drawing || e.pointerId !== drawing.id) return;
    var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    if (!list.length) list = [e];
    for (var i = 0; i < list.length; i++) drawing.pts.push(at(list[i]));
    press = drawing.pts[drawing.pts.length - 1];
    kick();
  });
  function up(e) {
    if (!drawing || e.pointerId !== drawing.id) return;
    drawing = null; press = null; clothMoving = true;
    waitTimer = setTimeout(function () { waitTimer = 0; answer(); }, SESSION_WAIT);   // "lift your hand and wait a moment"
  }
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);

  smoothBtn.addEventListener('click', function () {
    quiet(); session = []; drawing = null; press = null;
    sweep = { x: -20 };
    say(IDLE_MSG);
    kick();
  });
  function stepSweep(dt) {
    sweep.x += dt * 0.6;
    for (var i = 0; i < N; i++) {
      if (rx[i] < sweep.x && (gx[i] !== rx[i] || gy[i] !== ry[i])) {
        gx[i] += (rx[i] - gx[i]) * 0.3; gy[i] += (ry[i] - gy[i]) * 0.3;
        if (Math.abs(gx[i] - rx[i]) < 0.1 && Math.abs(gy[i] - ry[i]) < 0.1) { gx[i] = rx[i]; gy[i] = ry[i]; mv[i] = 0; }
      }
    }
    if (sweep.x > W + 30) { gx.set(rx); gy.set(ry); mv.fill(0); sweep = null; clothTo = 1; }   // the cloth goes back over clean sand
  }

  build();
  var timer;
  window.addEventListener('resize', function () { clearTimeout(timer); timer = setTimeout(build, 150); });
})();
