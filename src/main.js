import * as THREE from 'three';
import { AudioAnalyser }                  from './audio.js';
import { buildObjects, layoutObjects, animateObjects, PROJECTS } from './objects.js';
import { buildFishField, HAZE_COLOR }       from './fish.js';
import { buildLeaves, animateLeaves }       from './leaves.js';
import { BBoxOverlay, worldToScreenRect } from './bbox.js';

import floorVert from './shaders/floor.vert?raw';
import floorFrag from './shaders/floor.frag?raw';
import waterVert from './shaders/water.vert?raw';
import waterFrag from './shaders/water.frag?raw';

// ─── Renderer ─────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({
  canvas: document.getElementById('canvas'),
  antialias: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled   = true;
renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;   // autumn dusk — a touch under-exposed

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2c4053);
scene.fog        = new THREE.Fog(0x223342, 18, 38);

// ─── Camera ───────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 40);
camera.position.set(0, 11, 0.001);
camera.up.set(0, 0, -1);
camera.lookAt(0, 0, 0);

// ─── Lighting ─────────────────────────────────────────────────────────────────
// NOTE: the water and floor are ShaderMaterials with baked-in colour, so none
// of these lights touch them. Lighting here only shapes the floating project
// objects and the leaves — which lets the pool stay dusky while the objects
// themselves read bright and crisp.
const sun = new THREE.DirectionalLight(0xfddab8, 3.1);   // wing light — warm key
sun.position.set(2, 14, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near   =  0.5;
sun.shadow.camera.far    = 40;
sun.shadow.camera.left   = sun.shadow.camera.bottom = -10;
sun.shadow.camera.right  = sun.shadow.camera.top    =  10;
sun.shadow.bias          = -0.001;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xf0d4b4, 0.85));       // warm fill
// Sky-warm / water-cool wrap so object colours stay saturated, not muddy
scene.add(new THREE.HemisphereLight(0xfddab8, 0x3c4c5e, 1.00));
const fill = new THREE.PointLight(0xd05b00, 0.95, 24);   // monarch counter-light
fill.position.set(-4, 6, -3);
scene.add(fill);

// ─── Shared sun + object arrays (used by both floor and water shaders) ────────
const sunDir      = new THREE.Vector3(5, 12, 8).normalize();
const canHover = window.matchMedia('(hover: hover)').matches;

// Resting swell. At zero the pool only moves when something touches it — the
// cursor on desktop, a tap on touch — and when the mic hears something, which
// the shaders add on top of this rather than multiplying into it.
const SWELL = 0.0;

// Objects used to radiate a ring each, always on. That is a default ripple too,
// so it rests at zero — raise it to let them disturb the water again.
const OBJ_RIPPLE = 0.0;

const objPositions = PROJECTS.map(() => new THREE.Vector2());
const objStrengths = PROJECTS.map((p) => p.rippleStrength * OBJ_RIPPLE);


// ─── Cursor ripples ───────────────────────────────────────────────────────────
// A ring buffer of rings: the shader reads position, birth time and strength,
// and decides everything else from age, so JS never has to tick them down.
const RIPPLE_COUNT = 28;
const ripplePos  = Array.from({ length: RIPPLE_COUNT }, () => new THREE.Vector2());
const rippleTime = new Float32Array(RIPPLE_COUNT).fill(-999);
const rippleAmp  = new Float32Array(RIPPLE_COUNT);
let   rippleSlot = 0;

// Per-object shadow ellipse semi-axes and current rotation angles
const objShadowRx    = new Float32Array(PROJECTS.map(p => p.shadowRx));
const objShadowRz    = new Float32Array(PROJECTS.map(p => p.shadowRz));
const objShadowAngle = new Float32Array(PROJECTS.length);

// ─── Pool palette ────────────────────────────────────────────────────────────
// Vector3, not THREE.Color, on purpose. The pool shaders write gl_FragColor
// without <colorspace_fragment>, so what they output lands in the framebuffer
// unconverted — these have to reach the GPU as sRGB fractions. THREE.Color
// would convert them to linear on the way in and the pool would come out dark.
// Mutated in place so the uniforms below stay pointed at the same objects.
export const POOL = {
  // Tuned in the dev panel: tile #224877, grid 0.85, water film 0.94. The film
  // sitting below 1.0 means the surface reads a shade darker than the floor,
  // which is what keeps this blue from going bright.
  tile:  new THREE.Vector3(0.133, 0.282, 0.467),
  grout: new THREE.Vector3(0.113, 0.240, 0.397),
  tint:  new THREE.Vector3(0.125, 0.265, 0.439),
};

// ─── Pool Floor (tile, refraction and procedural shadow shader) ──────────────
const floorUniforms = {
  uTime:       { value: 0 },
  uAudioLevel: { value: 0 },
  uSunDir:     { value: sunDir },
  uTileBase:   { value: POOL.tile },
  uTileGrout:  { value: POOL.grout },
  uObjPos:     { value: objPositions },
  uSwell:      { value: SWELL },
  uRipPos:     { value: ripplePos },
  uRipTime:    { value: rippleTime },
  uRipAmp:     { value: rippleAmp },
  uObjRx:      { value: objShadowRx },
  uObjRz:      { value: objShadowRz },
  uObjAngle:   { value: objShadowAngle },
};
// Pool is elongated along Z (22 x 112) so scrolling pans down to more objects
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(22, 112),
  new THREE.ShaderMaterial({ vertexShader: floorVert, fragmentShader: floorFrag, uniforms: floorUniforms }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.8;
scene.add(floor);

// ─── Water Surface ────────────────────────────────────────────────────────────
const waterUniforms = {
  uTime:        { value: 0 },
  uAudioLevel:  { value: 0 },
  uSunDir:      { value: sunDir },
  uSunColor:    { value: new THREE.Color(0xfddab8) },
  uWaterColor:  { value: POOL.tint },
  uCameraPos:   { value: camera.position },
  uObjPos:      { value: objPositions },
  uObjStrength: { value: objStrengths },
  uSwell:       { value: SWELL },
  uRipPos:      { value: ripplePos },
  uRipTime:     { value: rippleTime },
  uRipAmp:      { value: rippleAmp },
};
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(22, 112, 96, 300),
  new THREE.ShaderMaterial({
    vertexShader:   waterVert,
    fragmentShader: waterFrag,
    uniforms:       waterUniforms,
    transparent:    true,
    depthWrite:     false,
  }),
);
water.rotation.x  = -Math.PI / 2;
water.renderOrder = 1;
scene.add(water);

// ─── Project Objects ──────────────────────────────────────────────────────────
// Loaded GLBs report their real footprint → shadow ellipse follows the model
const objects = buildObjects(scene, (i, rx, rz) => {
  objShadowRx[i] = rx;
  objShadowRz[i] = rz;
});

// ─── Autumn life: goldfish below the surface, maple leaves on top ─────────────
// Both are decorative — deliberately excluded from the raycast set so they
// never steal a click from a project object.
const fishField = buildFishField(scene, renderer);
const leaves    = buildLeaves(scene);

// ─── Audio ────────────────────────────────────────────────────────────────────
const audio  = new AudioAnalyser();
const micBtn = document.getElementById('mic-btn');
micBtn.addEventListener('click', async () => {
  if (audio.active) {
    // toggle off
    audio.stop();
    micBtn.textContent = 'MIC';
    micBtn.classList.remove('active');
    return;
  }
  await audio.start();
  if (audio.active) {
    micBtn.textContent = 'LISTENING — TAP TO STOP';
    micBtn.classList.add('active');
  }
});

// ─── Selection (hover on desktop, tap-select on touch) ───────────────────────
// Interaction model: first tap/hover shows the bounding box (select);
// tapping/clicking the already-selected object navigates to its page.
const raycaster   = new THREE.Raycaster();
const pointer     = new THREE.Vector2(-10, -10);
const bboxOverlay = new BBoxOverlay();
let   selectedRoot = null;

window.addEventListener('mousemove', (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
  pointer.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
  spawnRipple(e.clientX, e.clientY);
});

// The ray meets the mathematical plane, not the water mesh — the mesh is
// 96 x 300 quads and raycasting it on every mousemove would not be free.
const waterPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const ripplePoint = new THREE.Vector3();
const rippleNdc   = new THREE.Vector2();
let   lastRipX = 1e9, lastRipZ = 1e9;

/** Drop a ring at a world XZ. Strength follows the same curve as the cursor's. */
function addRipple(x, z, step, scale) {
  ripplePos[rippleSlot].set(x, z);
  rippleTime[rippleSlot] = clock.getElapsedTime();
  rippleAmp[rippleSlot]  = THREE.MathUtils.clamp(step / 1.2, 0.4, 1.0) * scale;
  rippleSlot = (rippleSlot + 1) % RIPPLE_COUNT;
}


function spawnRipple(clientX, clientY) {
  const r = renderer.domElement.getBoundingClientRect();
  rippleNdc.set(
     ((clientX - r.left) / r.width)  * 2 - 1,
    -((clientY - r.top)  / r.height) * 2 + 1,
  );
  raycaster.setFromCamera(rippleNdc, camera);
  if (!raycaster.ray.intersectPlane(waterPlane, ripplePoint)) return;

  // Spawn by distance travelled, not by event — a fast mouse fires far more
  // mousemoves than a slow one, and the trail should not thin out because of it
  const step = Math.hypot(ripplePoint.x - lastRipX, ripplePoint.z - lastRipZ);
  if (step < 0.38) return;
  lastRipX = ripplePoint.x;
  lastRipZ = ripplePoint.z;

  // A longer step means the pointer was moving faster — let it hit harder
  addRipple(ripplePoint.x, ripplePoint.z, step, 1.0);
}

// ─── Fish wakes ───────────────────────────────────────────────────────────────
// Each fish lays the same rings the cursor does, at half strength. They spawn by
// distance swum, and only while the fish is in frame: a ring the camera can't
// see still costs every pixel a loop iteration.
const FISH_RIPPLE_SCALE = 0.5;
const FISH_RIPPLE_STEP  = 0.9;
const fishLast = fishField.fish.map(() => ({ x: 1e9, z: 1e9 }));

function spawnFishWakes(camZ, halfZ) {
  fishField.fish.forEach((f, i) => {
    const p = f.group.position;
    if (Math.abs(p.z - camZ) > halfZ + 2.0) return;
    const last = fishLast[i];
    const step = Math.hypot(p.x - last.x, p.z - last.z);
    if (step < FISH_RIPPLE_STEP) return;
    last.x = p.x; last.z = p.z;
    addRipple(p.x, p.z, step, FISH_RIPPLE_SCALE);
  });
}

// Touch has no hover, so a tap is the only way to disturb the water there
window.addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse') { lastRipX = 1e9; spawnRipple(e.clientX, e.clientY); }
}, { passive: true });

function raycastRootAt(clientX, clientY) {
  const r = renderer.domElement.getBoundingClientRect();
  const p = new THREE.Vector2(
     ((clientX - r.left) / r.width)  * 2 - 1,
    -((clientY - r.top)  / r.height) * 2 + 1,
  );
  raycaster.setFromCamera(p, camera);
  const hits = raycaster.intersectObjects(objects, true);
  if (hits.length === 0) return null;
  let root = hits[0].object;
  while (root.parent && root.parent !== scene) root = root.parent;
  return root;
}

// Tap detection via pointer events — `click` is unreliable on iOS once the
// page scrolls (small finger movements get eaten as scroll gestures).
let downX = 0, downY = 0, downT = 0;
window.addEventListener('pointerdown', (e) => {
  downX = e.clientX; downY = e.clientY; downT = performance.now();
});
window.addEventListener('pointerup', (e) => {
  // UI elements handle their own clicks — don't raycast through them
  if (e.target.closest && e.target.closest('#mic-btn, #floating-name, #pool-btn, #pool-modal')) return;
  if (Math.hypot(e.clientX - downX, e.clientY - downY) > 12) return; // scroll/drag
  if (performance.now() - downT > 600) return;                       // long press

  const root = raycastRootAt(e.clientX, e.clientY);
  if (root) {
    if (root === selectedRoot) {
      window.location.href = `./projects/${root.userData.project.id}.html`;
    } else {
      selectedRoot = root;                 // first tap: select + show bbox
    }
  } else {
    selectedRoot = null;                   // tap on water: deselect
  }
});

// ─── Resize + scroll-driven camera pan ────────────────────────────────────────
const TAN_HALF_FOV = Math.tan(THREE.MathUtils.degToRad(52 / 2));
const POOL_HALF_Z  = 56;   // pool plane is 112 deep
// Scroll distance is derived from the pan distance rather than a fixed vh, so a
// tall phone — which sees more of the pool at once — doesn't end up racing past
// the objects in the same 300vh a desktop gets.
const SCROLL_PX_PER_UNIT = 90;
// The opening stretch, before the pool starts panning at full rate: the name
// clears, the water sits empty for a beat, then the statement reads. Measured
// in viewport heights so the beats land the same on a laptop and a phone. The
// camera still creeps forward a little across it, so the water is never frozen.
const INTRO_H       = 3.80;
const INTRO_CREEP_Z = 2.2;
// Statement beats, also in viewport heights. It is on screen for 2.4 of them,
// most of that at full opacity, so the slow rise in onScroll() is what keeps
// it from reading as a banner pinned to the middle of the window.
const ST_IN   = 1.40;   // starts surfacing, a full screen after the name has gone
const ST_FULL = 1.85;
const ST_OUT  = 3.30;   // starts leaving; gone by INTRO_H
let cameraY  = 11;
let scrollMaxZ = 10;       // how far the camera can pan down the pool
let halfZ      = 5.4;      // half the pool depth currently in frame
let introPx    = 0;        // scroll length of that opening stretch

const scrollSpace = document.getElementById('scroll-space');

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  // Portrait (mobile): lift the camera enough to keep the pool's full width in
  // frame, but no further — every extra unit of height pulls more objects into
  // one screen and leaves each of them less room.
  cameraY = camera.aspect >= 1 ? 11 : Math.min(17, 11 / Math.max(camera.aspect, 0.45));
  // Pan range: stop before the pool's far edge enters the view
  const visibleHalfZ = TAN_HALF_FOV * cameraY;
  halfZ = visibleHalfZ;
  scrollMaxZ = Math.max(0, POOL_HALF_Z - visibleHalfZ - 0.5);
  // The pan is shortened by the creep the intro already spends, so the camera
  // still stops exactly at scrollMaxZ.
  introPx = Math.round(h * INTRO_H);
  const panPx = Math.max(0, scrollMaxZ - INTRO_CREEP_Z) * SCROLL_PX_PER_UNIT;
  scrollSpace.style.height = `${Math.round(h + introPx + panPx)}px`;
  // Opening frame is open water — leaves and fish only. The objects start just
  // past its bottom edge, spread down the pool, and stop short of the far end so
  // the last one isn't pinned to the bottom of the final frame.
  // 5.0 rather than 3.0 leaves a beat of empty water after the statement has
  // gone, so the first object doesn't crest while it is still on screen. It has
  // to clear INTRO_CREEP_Z by enough to cover that beat.
  // 1.35 ≈ an object's half-width plus its drift, so its outer edge stays inside
  const xLimit = visibleHalfZ * camera.aspect - 1.35;
  layoutObjects(objects, visibleHalfZ + 5.0, POOL_HALF_Z - 5.0, xLimit);
  camera.updateProjectionMatrix();
  fishField.setSize();
}
window.addEventListener('resize', resize);
resize();

// Scroll position → how far the camera has panned down the pool. A slow creep
// across the intro, then the full-rate pan once the statement has cleared.
function cameraZOffset(y) {
  const panZ   = Math.max(0, scrollMaxZ - INTRO_CREEP_Z);
  const panPx  = panZ * SCROLL_PX_PER_UNIT;
  const introT = introPx > 0 ? THREE.MathUtils.clamp(y / introPx, 0, 1) : 1;
  const panT   = panPx   > 0 ? THREE.MathUtils.clamp((y - introPx) / panPx, 0, 1) : 0;
  return introT * INTRO_CREEP_Z + panT * panZ;
}

// The opening runs name → open water → statement → objects, one after another
// rather than on top of each other. Every beat below is in viewport heights.
const hintEl = document.getElementById('hint');
const nameEl = document.getElementById('floating-name');
const stEl   = document.getElementById('statement');
function onScroll() {
  const y = window.scrollY;
  const v = y / (window.innerHeight || 1);
  hintEl.style.opacity = y > 80 ? '0' : '';

  const nameO = 1 - THREE.MathUtils.smoothstep(v, 0.10, 0.45);
  nameEl.style.opacity       = nameO.toFixed(3);
  nameEl.style.pointerEvents = nameO < 0.15 ? 'none' : 'auto';

  // Holds off a full screen past the name so the pool is empty for a beat
  // first, and clears again before the first object crests the bottom edge.
  const stO = THREE.MathUtils.smoothstep(v, ST_IN, ST_FULL)
            * (1 - THREE.MathUtils.smoothstep(v, ST_OUT, INTRO_H));
  stEl.style.opacity = stO.toFixed(3);
  // Rides upward across its life, so it reads as drifting with the water
  // rather than being pinned to the middle of the screen.
  const rise = THREE.MathUtils.clamp((v - ST_IN) / (INTRO_H - ST_IN), 0, 1);
  stEl.style.transform = `translateY(${(50 - rise * 100).toFixed(1)}px)`;
}
window.addEventListener('scroll', onScroll, { passive: true });
// introPx is derived from the viewport, so the timeline shifts under a resize.
window.addEventListener('resize', onScroll);
// Browsers restore scroll position on reload, so settle the overlays once now.
onScroll();

// ─── "The Pool" concept popup ─────────────────────────────────────────────────
const poolBtn   = document.getElementById('pool-btn');
const poolModal = document.getElementById('pool-modal');
const poolClose = document.getElementById('pool-close');

poolBtn.addEventListener('click', () => poolModal.classList.add('open'));
poolClose.addEventListener('click', () => poolModal.classList.remove('open'));
poolModal.addEventListener('click', (e) => {
  if (e.target === poolModal) poolModal.classList.remove('open'); // click outside card
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') poolModal.classList.remove('open');
});

// ─── Render Loop ──────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let prevT = 0;

function frame() {
  requestAnimationFrame(frame);
  const t          = clock.getElapsedTime();
  const dt         = Math.min(t - prevT, 0.1);   // clamped: a hidden tab returns a huge delta
  prevT = t;
  const audioLevel = audio.update();

  // Scroll position → camera pans down the pool; overlays stay fixed via CSS
  const zOff = cameraZOffset(window.scrollY);
  camera.position.set(0, cameraY, zOff + 0.001);
  camera.lookAt(0, 0, zOff);

  floorUniforms.uTime.value       = t;
  floorUniforms.uAudioLevel.value = audioLevel;
  waterUniforms.uTime.value       = t;
  waterUniforms.uAudioLevel.value = audioLevel;
  waterUniforms.uCameraPos.value.copy(camera.position);

  animateObjects(objects, t);
  fishField.update(t);
  spawnFishWakes(camera.position.z, halfZ);
  animateLeaves(leaves, t);

  // Sync object XZ positions and rotation angles into shader uniforms
  objects.forEach((obj, i) => {
    objPositions[i].set(obj.position.x, obj.position.z);
    objShadowAngle[i] = obj.rotation.y;
  });

  // Desktop hover drives selection continuously; on touch devices selection
  // only changes via taps (otherwise the stale pointer would clear it).
  if (canHover) {
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(objects, true);
    if (hits.length > 0) {
      let root = hits[0].object;
      while (root.parent && root.parent !== scene) root = root.parent;
      selectedRoot = root;
      document.body.style.cursor = 'pointer';
    } else {
      selectedRoot = null;
      document.body.style.cursor = 'default';
    }
  }

  // BBox follows the selected object (it drifts on the water)
  if (selectedRoot) {
    bboxOverlay.show(
      selectedRoot.userData.project,
      worldToScreenRect(selectedRoot, camera, renderer.domElement),
    );
  } else {
    bboxOverlay.hide();
  }

  fishField.renderPass(camera);
  renderer.render(scene, camera);
}

frame();

// debug handle for automated checks
window.__pool = {
  camera,
  scene,
  water,
  objects,
  get scrollMaxZ() { return scrollMaxZ; },
  fishAt: () => fishField.fish.map((f) => {
    const p = f.group.position;
    return [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3), +f.group.rotation.y.toFixed(3)];
  }),
  leafAt: () => leaves.slice(0, 3).map((l) => {
    const p = l.mesh.position;
    return [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)];
  }),
  // Drive one animation step at an arbitrary time (used to verify motion in
  // headless checks, where requestAnimationFrame is paused).
  stepTo: (t) => { fishField.update(t); animateLeaves(leaves, t); },
};

// ─── Dev-only colour panel ────────────────────────────────────────────────────
// Guarded by import.meta.env.DEV and loaded dynamically, so Vite drops both the
// branch and the module from the production bundle.
if (import.meta.env.DEV) {
  import('./colorpanel.js').then(({ mountColorPanel }) =>
    mountColorPanel({ scene, POOL, fishHaze: HAZE_COLOR }));
}
