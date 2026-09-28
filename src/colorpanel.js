// Pool colour panel — development only.
//
// main.js imports this behind `import.meta.env.DEV`, so it is never bundled
// into a production build and never reaches jiwon-yang.com.
//
// The pool shaders write gl_FragColor without <colorspace_fragment>, so their
// colour uniforms are plain sRGB fractions rather than THREE.Color. That is why
// the swatches here read and write Vector3 directly. scene.background and
// scene.fog are ordinary THREE.Color and stay colour-managed as usual.

const clamp01 = (c) => Math.max(0, Math.min(1, c));
const byte    = (c) => Math.round(clamp01(c) * 255);
const hex2    = (n) => ('0' + n.toString(16)).slice(-2);

const vecToHex = (v) => '#' + hex2(byte(v.x)) + hex2(byte(v.y)) + hex2(byte(v.z));
const hexToVec = (h, out) => {
  const n = parseInt(h.slice(1), 16);
  out.set(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const f3 = (c) => clamp01(c).toFixed(3);
const vecLine = (v) => `new THREE.Vector3(${f3(v.x)}, ${f3(v.y)}, ${f3(v.z)})`;

// The fish fade is the water seen from above, so it sits brighter than the
// floor tile and not by the same amount on every channel. Rather than assume a
// ratio, the panel scales the shipped value by however far each channel of the
// tile has moved. It is baked into the fish materials at build time, so the
// panel can only report the new value, not apply it live.
const scaleFishHaze = (hex, from, to) => {
  const ch = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  const f = [from.x, from.y, from.z];
  const t = [to.x, to.y, to.z];
  return '#' + ch.map((c, i) => hex2(byte((f[i] ? c / 255 * (t[i] / f[i]) : 0)))).join('');
};

const CSS = `
#pool-panel {
  position: fixed; right: 16px; bottom: 16px; z-index: 9999;
  width: 292px; padding: 0 0 10px;
  background: rgba(14, 22, 34, 0.93);
  border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 6px;
  color: #e7eef7; font: 11px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.02em; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.45);
  user-select: none;
}
#pool-panel h4 {
  margin: 0; padding: 9px 11px; font-size: 10px; font-weight: 700;
  letter-spacing: 0.16em; text-transform: uppercase; cursor: pointer;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12); color: #9fd0ff;
}
#pool-panel.min > *:not(h4) { display: none; }
#pool-panel.min { width: 190px; padding-bottom: 0; }
#pool-panel .row {
  display: flex; align-items: center; gap: 8px; padding: 7px 11px 0;
}
#pool-panel .row > label { flex: 0 0 74px; color: #b6c6d8; }
#pool-panel .row > .val { flex: 0 0 62px; text-align: right; color: #e7eef7; }
/* min-width:0 matters: range and colour inputs carry an intrinsic minimum that
   otherwise pushes the row wider than the panel and clips the value column. */
#pool-panel input[type=color] {
  flex: 1 1 auto; min-width: 0; height: 21px; padding: 0;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 3px; background: none; cursor: pointer;
}
#pool-panel input[type=range] {
  flex: 1 1 auto; min-width: 0; height: 21px; margin: 0; cursor: pointer;
}
#pool-panel .note {
  padding: 8px 11px 0; color: #7f94ab; line-height: 1.45;
}
#pool-panel .btns { display: flex; gap: 6px; padding: 10px 11px 0; }
#pool-panel button {
  flex: 1 1 auto; padding: 6px 0; font: inherit; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer;
  background: rgba(255, 255, 255, 0.1); color: #e7eef7;
  border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 3px;
}
#pool-panel button:hover { background: rgba(255, 255, 255, 0.2); }
#pool-panel hr { margin: 10px 11px 0; border: 0; border-top: 1px solid rgba(255,255,255,0.12); }
`;

export function mountColorPanel({ scene, POOL, fishHaze = 0x394e63 }) {
  if (document.getElementById('pool-panel')) return;

  const start = {
    tile: POOL.tile.clone(),
    grout: POOL.grout.clone(),
    tint: POOL.tint.clone(),
    bg: '#' + scene.background.getHexString(),
    fog: '#' + scene.fog.color.getHexString(),
  };
  // Derive the two ratios from whatever the pool currently ships with, so the
  // sliders open where the live site actually is.
  let gridRatio = start.tile.x ? start.grout.x / start.tile.x : 0.86;
  let filmRatio = start.tile.x ? start.tint.x / start.tile.x : 1.15;

  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.id = 'pool-panel';
  el.innerHTML = `
    <h4><span>Pool colour</span><span data-min>–</span></h4>
    <div class="row"><label>Tile</label><input type="color" data-tile><span class="val" data-tile-v></span></div>
    <div class="row"><label>Grid</label><input type="range" min="0.5" max="1" step="0.005" data-grid><span class="val" data-grid-v></span></div>
    <div class="row"><label>Water film</label><input type="range" min="0.8" max="1.6" step="0.005" data-film><span class="val" data-film-v></span></div>
    <hr>
    <div class="row"><label>Background</label><input type="color" data-bg><span class="val" data-bg-v></span></div>
    <div class="row"><label>Fog</label><input type="color" data-fog><span class="val" data-fog-v></span></div>
    <hr>
    <div class="row"><label>Fish fade</label><span class="val" style="flex:1 1 auto;text-align:left" data-fish></span></div>
    <div class="note">Grid and water film are multiples of the tile, so the hue stays consistent. Fish fade is derived and only applies on reload.</div>
    <div class="btns"><button data-copy>Copy values</button><button data-reset>Reset</button></div>
  `;
  document.body.appendChild(el);

  const q = (s) => el.querySelector(s);
  const tileIn = q('[data-tile]'), gridIn = q('[data-grid]'), filmIn = q('[data-film]');
  const bgIn = q('[data-bg]'), fogIn = q('[data-fog]');

  const fishHex = () => scaleFishHaze(fishHaze, start.tile, POOL.tile);

  function apply() {
    POOL.grout.copy(POOL.tile).multiplyScalar(gridRatio);
    POOL.tint.copy(POOL.tile).multiplyScalar(filmRatio);
    tileIn.value = vecToHex(POOL.tile);
    gridIn.value = gridRatio;
    filmIn.value = filmRatio;
    q('[data-tile-v]').textContent = vecToHex(POOL.tile);
    q('[data-grid-v]').textContent = gridRatio.toFixed(2) + '×';
    q('[data-film-v]').textContent = filmRatio.toFixed(2) + '×';
    q('[data-bg-v]').textContent = bgIn.value;
    q('[data-fog-v]').textContent = fogIn.value;
    q('[data-fish]').textContent = fishHex();
  }

  tileIn.addEventListener('input', () => { hexToVec(tileIn.value, POOL.tile); apply(); });
  gridIn.addEventListener('input', () => { gridRatio = +gridIn.value; apply(); });
  filmIn.addEventListener('input', () => { filmRatio = +filmIn.value; apply(); });
  bgIn.addEventListener('input', () => { scene.background.set(bgIn.value); apply(); });
  fogIn.addEventListener('input', () => { scene.fog.color.set(fogIn.value); apply(); });

  q('[data-reset]').addEventListener('click', () => {
    POOL.tile.copy(start.tile);
    gridRatio = start.tile.x ? start.grout.x / start.tile.x : 0.86;
    filmRatio = start.tile.x ? start.tint.x / start.tile.x : 1.15;
    scene.background.set(start.bg);
    scene.fog.color.set(start.fog);
    bgIn.value = start.bg; fogIn.value = start.fog;
    apply();
  });

  q('[data-copy]').addEventListener('click', async () => {
    const out =
`src/main.js — POOL
  tile:  ${vecLine(POOL.tile)},
  grout: ${vecLine(POOL.grout)},
  tint:  ${vecLine(POOL.tint)},

src/main.js — scene
scene.background = new THREE.Color(0x${bgIn.value.slice(1)});
scene.fog        = new THREE.Fog(0x${fogIn.value.slice(1)}, 18, 38);

index.html — body
  background: ${bgIn.value};

src/fish.js
const HAZE_COLOR = 0x${fishHex().slice(1)};`;
    const btn = q('[data-copy]');
    try {
      await navigator.clipboard.writeText(out);
      btn.textContent = 'Copied';
    } catch {
      btn.textContent = 'See console';
    }
    console.log(out);
    setTimeout(() => { btn.textContent = 'Copy values'; }, 1400);
  });

  q('h4').addEventListener('click', () => {
    el.classList.toggle('min');
    q('[data-min]').textContent = el.classList.contains('min') ? '+' : '–';
  });

  bgIn.value = start.bg;
  fogIn.value = start.fog;
  apply();
}
