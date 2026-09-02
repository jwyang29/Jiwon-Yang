import * as THREE from 'three';
import { AudioAnalyser }                  from './audio.js';
import { buildObjects, animateObjects, PROJECTS } from './objects.js';
import { buildFish, animateFish }           from './fish.js';
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
scene.background = new THREE.Color(0x1d4f58);
scene.fog        = new THREE.Fog(0x17414c, 18, 38);

// ─── Camera ───────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 40);
camera.position.set(0, 11, 0.001);
camera.up.set(0, 0, -1);
camera.lookAt(0, 0, 0);

// ─── Lighting ─────────────────────────────────────────────────────────────────
const sun = new THREE.DirectionalLight(0xffcf94, 2.5);   // low, warm autumn sun
sun.position.set(2, 14, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near   =  0.5;
sun.shadow.camera.far    = 40;
sun.shadow.camera.left   = sun.shadow.camera.bottom = -10;
sun.shadow.camera.right  = sun.shadow.camera.top    =  10;
sun.shadow.bias          = -0.001;
scene.add(sun);
scene.add(new THREE.AmbientLight(0x3d7a86, 0.95));       // cool teal bounce
const fill = new THREE.PointLight(0xe08a3c, 0.85, 22);   // warm amber counter-light
fill.position.set(-4, 6, -3);
scene.add(fill);

// ─── Shared sun + object arrays (used by both floor and water shaders) ────────
const sunDir      = new THREE.Vector3(5, 12, 8).normalize();
const objPositions = PROJECTS.map(() => new THREE.Vector2());
const objStrengths = PROJECTS.map((p) => p.rippleStrength);

// Per-object shadow ellipse semi-axes and current rotation angles
const objShadowRx    = new Float32Array(PROJECTS.map(p => p.shadowRx));
const objShadowRz    = new Float32Array(PROJECTS.map(p => p.shadowRz));
const objShadowAngle = new Float32Array(PROJECTS.length);

// ─── Pool Floor (caustic + procedural shadow shader) ─────────────────────────
const floorUniforms = {
  uTime:       { value: 0 },
  uAudioLevel: { value: 0 },
  uSunDir:     { value: sunDir },
  uObjPos:     { value: objPositions },
  uObjRx:      { value: objShadowRx },
  uObjRz:      { value: objShadowRz },
  uObjAngle:   { value: objShadowAngle },
};
// Pool is elongated along Z (22 x 48) so scrolling pans down to more objects
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(22, 48),
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
  uSunColor:    { value: new THREE.Color(0xffe0b0) },
  uWaterColor:  { value: new THREE.Color(0x1f6b70) },
  uCameraPos:   { value: camera.position },
  uObjPos:      { value: objPositions },
  uObjStrength: { value: objStrengths },
};
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(22, 48, 110, 240),
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
const fish   = buildFish(scene);
const leaves = buildLeaves(scene);

// ─── Audio ────────────────────────────────────────────────────────────────────
const audio  = new AudioAnalyser();
const micBtn = document.getElementById('mic-btn');
micBtn.addEventListener('click', async () => {
  if (audio.active) {
    // toggle off
    audio.stop();
    micBtn.textContent = '◎  MIC';
    micBtn.classList.remove('active');
    return;
  }
  await audio.start();
  if (audio.active) {
    micBtn.textContent = '◉  LISTENING — TAP TO STOP';
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

// Devices with a real hover pointer (mouse/trackpad) update selection on move
const canHover = window.matchMedia('(hover: hover)').matches;

window.addEventListener('mousemove', (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
  pointer.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
});

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
const POOL_HALF_Z  = 24;   // pool plane is 48 deep
let cameraY  = 11;
let scrollMaxZ = 10;       // how far the camera can pan down the pool

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  // Portrait (mobile): raise the camera so all floating objects stay in view.
  cameraY = camera.aspect >= 1 ? 11 : Math.min(20, 11 / Math.max(camera.aspect, 0.45));
  // Pan range: stop before the pool's far edge enters the view
  const visibleHalfZ = TAN_HALF_FOV * cameraY;
  scrollMaxZ = Math.max(0, POOL_HALF_Z - visibleHalfZ - 0.5);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// Fade the scroll hint once the user starts scrolling
const hintEl = document.getElementById('hint');
window.addEventListener('scroll', () => {
  hintEl.style.opacity = window.scrollY > 80 ? '0' : '';
}, { passive: true });

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

function frame() {
  requestAnimationFrame(frame);
  const t          = clock.getElapsedTime();
  const audioLevel = audio.update();

  // Scroll position → camera pans down the pool; name stays fixed via CSS
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const zOff = maxScroll > 0 ? (window.scrollY / maxScroll) * scrollMaxZ : 0;
  camera.position.set(0, cameraY, zOff + 0.001);
  camera.lookAt(0, 0, zOff);

  floorUniforms.uTime.value       = t;
  floorUniforms.uAudioLevel.value = audioLevel;
  waterUniforms.uTime.value       = t;
  waterUniforms.uAudioLevel.value = audioLevel;
  waterUniforms.uCameraPos.value.copy(camera.position);

  animateObjects(objects, t);
  animateFish(fish, t);
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

  renderer.render(scene, camera);
}

frame();

// debug handle for automated checks
window.__pool = {
  camera,
  get scrollMaxZ() { return scrollMaxZ; },
  fishAt: () => fish.map((f) => {
    const p = f.group.position;
    return [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3), +f.group.rotation.y.toFixed(3)];
  }),
  leafAt: () => leaves.slice(0, 3).map((l) => {
    const p = l.mesh.position;
    return [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)];
  }),
  // Drive one animation step at an arbitrary time (used to verify motion in
  // headless checks, where requestAnimationFrame is paused).
  stepTo: (t) => { animateFish(fish, t); animateLeaves(leaves, t); },
};
