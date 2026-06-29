import * as THREE from 'three';
import { AudioAnalyser }                  from './audio.js';
import { buildObjects, animateObjects, PROJECTS } from './objects.js';
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
renderer.toneMappingExposure = 1.1;

// ─── Scene ────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb8e0ee);
scene.fog        = new THREE.Fog(0xb8e0ee, 20, 36);

// ─── Camera ───────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 40);
camera.position.set(0, 11, 0.001);
camera.up.set(0, 0, -1);
camera.lookAt(0, 0, 0);

// ─── Lighting ─────────────────────────────────────────────────────────────────
const sun = new THREE.DirectionalLight(0xfff5e0, 3.2);
sun.position.set(2, 14, 3);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near   =  0.5;
sun.shadow.camera.far    = 40;
sun.shadow.camera.left   = sun.shadow.camera.bottom = -10;
sun.shadow.camera.right  = sun.shadow.camera.top    =  10;
sun.shadow.bias          = -0.001;
scene.add(sun);
scene.add(new THREE.AmbientLight(0xb8dde8, 0.9));
const fill = new THREE.PointLight(0xa0d8ef, 1.2, 20);
fill.position.set(-4, 6, -3);
scene.add(fill);

// ─── Pool Floor (caustic shader) ──────────────────────────────────────────────
const floorUniforms = {
  uTime:       { value: 0 },
  uAudioLevel: { value: 0 },
};
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(22, 22),
  new THREE.ShaderMaterial({ vertexShader: floorVert, fragmentShader: floorFrag, uniforms: floorUniforms }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.8;
scene.add(floor);

// ─── Shadow Catcher ───────────────────────────────────────────────────────────
// ShadowMaterial is transparent except where shadows fall → shows object silhouettes
// on the floor, visible through the transparent water layer above
const shadowPlane = new THREE.Mesh(
  new THREE.PlaneGeometry(22, 22),
  new THREE.ShadowMaterial({ opacity: 0.28, depthWrite: false }),
);
shadowPlane.rotation.x    = -Math.PI / 2;
shadowPlane.position.y    = -0.79;
shadowPlane.receiveShadow = true;
scene.add(shadowPlane);

// ─── Water Surface (Gerstner + Fresnel) ───────────────────────────────────────
const sunDir = new THREE.Vector3(5, 12, 8).normalize();

// Object XZ positions for ripple interaction (updated each frame)
const objPositions = PROJECTS.map(() => new THREE.Vector2());
const objStrengths = PROJECTS.map((p) => p.rippleStrength);

const waterUniforms = {
  uTime:        { value: 0 },
  uAudioLevel:  { value: 0 },
  uSunDir:      { value: sunDir },
  uSunColor:    { value: new THREE.Color(0xfff8e8) },
  uWaterColor:  { value: new THREE.Color(0x5ab8d0) },
  uCameraPos:   { value: camera.position },
  uObjPos:      { value: objPositions },
  uObjStrength: { value: objStrengths },
};
const water = new THREE.Mesh(
  new THREE.PlaneGeometry(22, 22, 120, 120),
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
const objects = buildObjects(scene);

// ─── Audio ────────────────────────────────────────────────────────────────────
const audio  = new AudioAnalyser();
const micBtn = document.getElementById('mic-btn');
micBtn.addEventListener('click', async () => {
  await audio.start();
  if (audio.active) {
    micBtn.textContent = '◉  LISTENING';
    micBtn.classList.add('active');
  }
});

// ─── Hover + BBox ─────────────────────────────────────────────────────────────
const raycaster   = new THREE.Raycaster();
const pointer     = new THREE.Vector2(-10, -10);
const bboxOverlay = new BBoxOverlay();
let   hoveredRoot = null;

window.addEventListener('mousemove', (e) => {
  const r = renderer.domElement.getBoundingClientRect();
  pointer.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
  pointer.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
});

window.addEventListener('click', () => {
  if (hoveredRoot) {
    const { project } = hoveredRoot.userData;
    window.location.href = `./projects/${project.id}.html`;
  }
});

// ─── Resize ───────────────────────────────────────────────────────────────────
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ─── Render Loop ──────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function frame() {
  requestAnimationFrame(frame);
  const t          = clock.getElapsedTime();
  const audioLevel = audio.update();

  floorUniforms.uTime.value       = t;
  floorUniforms.uAudioLevel.value = audioLevel;
  waterUniforms.uTime.value       = t;
  waterUniforms.uAudioLevel.value = audioLevel;
  waterUniforms.uCameraPos.value.copy(camera.position);

  animateObjects(objects, t);

  // Sync object XZ positions into water ripple uniforms
  objects.forEach((obj, i) => {
    objPositions[i].set(obj.position.x, obj.position.z);
  });

  // Raycast – walk up to top-level Group
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(objects, true);

  if (hits.length > 0) {
    let root = hits[0].object;
    while (root.parent && root.parent !== scene) root = root.parent;

    if (root !== hoveredRoot) {
      hoveredRoot = root;
      document.body.style.cursor = 'pointer';
    }
    bboxOverlay.show(
      hoveredRoot.userData.project,
      worldToScreenRect(hoveredRoot, camera, renderer.domElement),
    );
  } else {
    if (hoveredRoot) { hoveredRoot = null; document.body.style.cursor = 'default'; }
    bboxOverlay.hide();
  }

  renderer.render(scene, camera);
}

frame();
