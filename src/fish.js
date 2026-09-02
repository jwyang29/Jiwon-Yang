import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────────────────────
   Goldfish — procedural veiltail goldfish that swim beneath the water surface.

   Local space convention: +X = forward (head), +Y = up, ±Z = lateral.
   Body and fins share one travelling sine wave so the undulation stays
   continuous from the head through to the tip of the tail.
   ──────────────────────────────────────────────────────────────────────────── */

const BODY_LEN = 1.15;   // body stretched along X → x ∈ [-0.575, 0.575]
const BODY_HALF = BODY_LEN / 2;

// ─── Shaders ──────────────────────────────────────────────────────────────────
const BODY_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uSwim;
  varying vec3  vWNrm;       // world normal — lighting
  varying vec3  vVNrm;       // view normal  — silhouette softening
  varying float vU;          // 0 at tail, 1 at head

  void main() {
    vec3 p = position;
    float u = (p.x + ${BODY_HALF.toFixed(3)}) / ${BODY_LEN.toFixed(3)};
    vU = u;
    float along = 1.0 - u;                        // 0 head → 1 tail
    float amp   = uSwim * pow(along, 1.7);
    p.z += sin(uTime * 5.0 - along * 3.4 + uPhase) * amp;

    vWNrm = normalize(mat3(modelMatrix) * normal);
    vVNrm = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const BODY_FRAG = /* glsl */ `
  uniform vec3  uDeep;       // saturated back / head
  uniform vec3  uMid;        // body orange
  uniform vec3  uPale;       // belly + peduncle
  uniform vec3  uHaze;       // colour of the water the fish sits in
  uniform float uHazeAmt;    // base scattering — how far under the surface
  varying vec3  vWNrm;
  varying vec3  vVNrm;
  varying float vU;

  void main() {
    float up = clamp(vWNrm.y * 0.5 + 0.5, 0.0, 1.0);   // 1 on the back

    // Along the body: pale tail → orange middle → deep head
    vec3 base = mix(uPale, uMid,  smoothstep(0.10, 0.62, vU));
    base      = mix(base,  uDeep, smoothstep(0.55, 0.98, vU) * 0.85);
    base = mix(base * 1.05, base, up);

    // Flat, diffused key light — sunlight scattered by the water column
    vec3 col = base * (0.78 + 0.30 * up);

    // Dissolve the silhouette into the surrounding water. Grazing angles pick
    // up the most scattering, so the outline melts instead of cutting sharply.
    float facing = abs(normalize(vVNrm).z);
    float edge   = 1.0 - smoothstep(0.0, 0.62, facing);
    col = mix(col, uHaze, clamp(uHazeAmt + edge * 0.62, 0.0, 1.0));

    gl_FragColor = vec4(col, 1.0);
  }
`;

const FIN_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uSwim;
  uniform float uWave;       // how strongly this fin trails the body
  varying vec2  vST;         // x = root→tip (0..1), y = across (0..1)

  void main() {
    vec3 p = position;
    float s = uv.x;
    vST = uv;

    // Root offset matches the body's tail displacement → seamless attachment
    float root = sin(uTime * 5.0 - 3.4 + uPhase) * uSwim;
    float w    = pow(s, 1.35);
    p.z += root + sin(uTime * 5.0 - 3.4 - s * 2.2 + uPhase) * uSwim * uWave * w;
    p.y += cos(uTime * 4.2 - s * 2.0 + uPhase) * 0.045 * w;   // veil flutter

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FIN_FRAG = /* glsl */ `
  uniform vec3  uInner;
  uniform vec3  uOuter;
  uniform vec3  uHaze;
  uniform float uHazeAmt;
  uniform float uOpacity;
  varying vec2  vST;

  void main() {
    float s = vST.x, v = vST.y;

    // Radiating fin rays — kept low-contrast so they read as a soft veil
    float rays = 0.5 + 0.5 * sin(v * 46.0 + 1.7);
    vec3  col  = mix(uInner, uOuter, pow(s, 0.8));
    col *= 0.90 + rays * 0.13;
    // Fins are the thinnest tissue, so the water washes through them most
    col = mix(col, uHaze, clamp(uHazeAmt + s * 0.30, 0.0, 1.0));

    // Wide, gradual falloff at the tip and along the outer edges
    float edge = smoothstep(0.0, 0.17, min(v, 1.0 - v));
    float a = uOpacity * (1.0 - 0.50 * s) * (0.20 + 0.80 * edge);
    gl_FragColor = vec4(col, a);
  }
`;

// ─── Geometry ─────────────────────────────────────────────────────────────────
function makeBodyGeometry() {
  const g = new THREE.SphereGeometry(0.5, 30, 20);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i) * BODY_LEN;   // stretch fore–aft
    let y = pos.getY(i) * 0.78;       // deep-bodied like a fancy goldfish
    let z = pos.getZ(i) * 0.60;

    // Taper the rear third into a slim peduncle
    const u = (x + BODY_HALF) / BODY_LEN;
    if (u < 0.42) {
      const taper = 0.24 + 0.76 * Math.pow(u / 0.42, 0.85);
      y *= taper;
      z *= taper;
    }
    if (y < 0) y *= 1.14;             // fuller belly
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A fan-shaped fin. `notch` forks the trailing edge (0 = round, 0.4 = deep fork).
 * UV.x runs root→tip so the shaders can taper motion and opacity along it.
 */
function makeFanGeometry({ rootX, len, spread, notch = 0, curl = 0, segS = 14, segV = 20 }) {
  const position = [], uv = [], index = [];

  for (let i = 0; i <= segS; i++) {
    const s = i / segS;
    for (let j = 0; j <= segV; j++) {
      const vn = j / segV;
      const v  = vn * 2 - 1;
      const av = Math.abs(v);

      const lenAt = len * (1 - notch + notch * Math.pow(av, 0.55));
      const half  = 0.05 + Math.pow(s, 0.72) * spread;

      position.push(rootX - s * lenAt, curl * av * av * s, v * half);
      uv.push(s, vn);
    }
  }
  for (let i = 0; i < segS; i++) {
    for (let j = 0; j < segV; j++) {
      const a = i * (segV + 1) + j;
      const b = a + segV + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  g.setAttribute('uv',       new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

// ─── Palettes ─────────────────────────────────────────────────────────────────
// The water the fish are seen through — everything blends toward this.
const HAZE_COLOR = 0x2c5f68;

const FISH_PALETTES = [
  { deep: 0xd2451c, mid: 0xef7a2b, pale: 0xfbe2ca, finI: 0xf08a48, finO: 0xfff3e6 },
  { deep: 0xe2622a, mid: 0xf79a4e, pale: 0xfdefe0, finI: 0xf6a066, finO: 0xfff8f0 },
  { deep: 0xbf3a17, mid: 0xe06a24, pale: 0xf7d9bd, finI: 0xe87c3c, finO: 0xffeeda },
  { deep: 0xf0e6d8, mid: 0xf7d9b8, pale: 0xfffaf3, finI: 0xf3c9a2, finO: 0xfffaf4 }, // pale calico
];

// ─── Fish ─────────────────────────────────────────────────────────────────────
const TWO_PI = Math.PI * 2;

function wrapAngle(a) {
  while (a >  Math.PI) a -= TWO_PI;
  while (a < -Math.PI) a += TWO_PI;
  return a;
}

class Goldfish {
  constructor(cfg) {
    Object.assign(this, cfg);

    const pal = FISH_PALETTES[cfg.palette % FISH_PALETTES.length];
    const uniforms = {
      uTime:  { value: 0 },
      uPhase: { value: cfg.phase },
      uSwim:  { value: cfg.swim },
    };
    this.uniforms = uniforms;

    // Colour of the water column the fish swims in — everything is blended
    // toward it so the fish sits *under* the surface instead of on top of it.
    const haze = new THREE.Color(HAZE_COLOR);
    // Deeper fish are washed out more. Kept modest on purpose — the silhouette
    // dissolve in the shader does the softening, while this only takes the
    // edge off the saturation, so the fish stay orange instead of going muddy.
    const depthHaze = THREE.MathUtils.clamp(0.15 + (-cfg.cy - 0.28) * 0.45, 0.13, 0.25);

    const group = new THREE.Group();
    group.rotation.order = 'YXZ';   // yaw then roll about the fish's own axis

    // Body
    const body = new THREE.Mesh(
      makeBodyGeometry(),
      new THREE.ShaderMaterial({
        vertexShader: BODY_VERT,
        fragmentShader: BODY_FRAG,
        uniforms: {
          ...uniforms,
          uDeep:    { value: new THREE.Color(pal.deep) },
          uMid:     { value: new THREE.Color(pal.mid)  },
          uPale:    { value: new THREE.Color(pal.pale) },
          uHaze:    { value: haze },
          uHazeAmt: { value: depthHaze },
        },
      }),
    );
    group.add(body);

    const finMat = (opacity, wave) => new THREE.ShaderMaterial({
      vertexShader: FIN_VERT,
      fragmentShader: FIN_FRAG,
      uniforms: {
        ...uniforms,
        uWave:    { value: wave },
        uInner:   { value: new THREE.Color(pal.finI) },
        uOuter:   { value: new THREE.Color(pal.finO) },
        uHaze:    { value: haze },
        uHazeAmt: { value: depthHaze + 0.08 },
        uOpacity: { value: opacity },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Flowing veil tail
    const tail = new THREE.Mesh(
      makeFanGeometry({ rootX: -0.50, len: 0.95, spread: 0.54, notch: 0.38, curl: 0.10, segS: 16, segV: 24 }),
      finMat(0.62, 2.3),
    );
    group.add(tail);

    // Pectoral fins — clearly visible from directly above
    for (const side of [1, -1]) {
      const pec = new THREE.Mesh(
        makeFanGeometry({ rootX: 0.02, len: 0.46, spread: 0.20, notch: 0.12, curl: 0.05, segS: 10, segV: 12 }),
        finMat(0.50, 1.5),
      );
      pec.position.set(0.06, -0.02, side * 0.15);
      pec.rotation.y = side * -0.55;      // sweep out and back
      pec.rotation.x = side * 0.25;
      group.add(pec);
    }

    // Dorsal fin — a thin sail along the back
    const dorsal = new THREE.Mesh(
      makeFanGeometry({ rootX: 0.10, len: 0.44, spread: 0.26, notch: 0.10, curl: 0, segS: 10, segV: 12 }),
      finMat(0.46, 1.4),
    );
    dorsal.rotation.x = Math.PI / 2;      // stand it up vertically
    dorsal.position.y = 0.20;
    group.add(dorsal);

    group.scale.setScalar(cfg.scale);
    this.group = group;
    this.prevYaw = 0;
    this.roll = 0;
  }

  /** Smooth wandering path — layered sines never repeat on a short cycle. */
  pathAt(t) {
    const s = t * this.speed + this.phase;
    return {
      x: this.cx + this.rx * Math.sin(s)            + this.rx2 * Math.sin(s * 1.73 + 1.1),
      z: this.cz + this.rz * Math.cos(s * 0.86)     + this.rz2 * Math.sin(s * 2.31 + 0.4),
      y: this.cy + Math.sin(s * 1.3 + this.phase) * 0.05,
    };
  }

  update(t) {
    this.uniforms.uTime.value = t;

    const p  = this.pathAt(t);
    const pN = this.pathAt(t + 0.06);
    this.group.position.set(p.x, p.y, p.z);

    // Local +X is forward: yaw so it points along the path tangent
    const yaw = Math.atan2(-(pN.z - p.z), pN.x - p.x);
    this.group.rotation.y = yaw;

    // Bank into turns
    const dYaw = wrapAngle(yaw - this.prevYaw);
    this.prevYaw = yaw;
    const target = THREE.MathUtils.clamp(dYaw * 90, -0.42, 0.42);
    this.roll += (target - this.roll) * 0.06;
    this.group.rotation.x = this.roll;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Populate the pool with goldfish. They swim below the surface and are purely
 * decorative — deliberately kept out of the raycast set in main.js.
 */
export function buildFish(scene) {
  const specs = [
    { cx: -3.6, cz: -3.0, rx: 3.0, rx2: 1.1, rz: 2.4, rz2: 0.9, cy: -0.34, speed: 0.155, scale: 0.80, palette: 0 },
    { cx:  3.9, cz: -0.6, rx: 2.6, rx2: 0.9, rz: 2.9, rz2: 1.1, cy: -0.44, speed: 0.128, scale: 0.66, palette: 1 },
    { cx: -2.4, cz:  4.6, rx: 3.4, rx2: 1.2, rz: 2.2, rz2: 0.8, cy: -0.30, speed: 0.171, scale: 0.72, palette: 2 },
    { cx:  3.2, cz:  6.8, rx: 2.8, rx2: 1.0, rz: 2.6, rz2: 1.0, cy: -0.40, speed: 0.142, scale: 0.86, palette: 0 },
    { cx: -3.9, cz:  9.8, rx: 3.1, rx2: 1.3, rz: 2.5, rz2: 0.9, cy: -0.36, speed: 0.163, scale: 0.62, palette: 3 },
    { cx:  2.6, cz: 12.4, rx: 3.3, rx2: 1.0, rz: 2.7, rz2: 1.2, cy: -0.46, speed: 0.134, scale: 0.78, palette: 1 },
    { cx: -1.8, cz: 15.2, rx: 2.9, rx2: 1.1, rz: 2.3, rz2: 0.8, cy: -0.32, speed: 0.150, scale: 0.70, palette: 2 },
  ];

  return specs.map((s, i) => {
    const fish = new Goldfish({
      ...s,
      phase: (i * 1.97) % TWO_PI,
      swim:  0.040 + (i % 3) * 0.006,
    });
    scene.add(fish.group);
    return fish;
  });
}

export function animateFish(fish, t) {
  for (const f of fish) f.update(t);
}
