import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────────────────────
   Goldfish — slender comet goldfish drifting under the surface.

   They are rendered into their own low-resolution target and Gaussian-blurred
   before being composited back at swimming depth, so they read as soft shapes
   glimpsed through moving water rather than crisp sprites laid over it.

   Local space: +X = forward (head), +Y = up, ±Z = lateral.
   ──────────────────────────────────────────────────────────────────────────── */

const BODY_LEN  = 1.15;
const BODY_HALF = BODY_LEN / 2;
const FISH_Y    = -0.34;       // depth the composite plane sits at
const RT_SCALE  = 0.34;        // render fish small → cheap, and blurry by itself
const BLUR_PASSES = 2;

// The water the fish are seen through.
const HAZE_COLOR = 0x1d4560;

// ─── Fish shaders ─────────────────────────────────────────────────────────────
const BODY_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uSwim;
  varying vec3  vWNrm;
  varying vec3  vVNrm;
  varying float vU;

  void main() {
    vec3 p = position;
    float u = (p.x + ${BODY_HALF.toFixed(3)}) / ${BODY_LEN.toFixed(3)};
    vU = u;
    float along = 1.0 - u;
    p.z += sin(uTime * 5.0 - along * 3.4 + uPhase) * uSwim * pow(along, 1.7);

    vWNrm = normalize(mat3(modelMatrix) * normal);
    vVNrm = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const BODY_FRAG = /* glsl */ `
  uniform vec3  uDeep;
  uniform vec3  uMid;
  uniform vec3  uPale;
  uniform vec3  uHaze;
  uniform float uHazeAmt;
  varying vec3  vWNrm;
  varying vec3  vVNrm;
  varying float vU;

  void main() {
    float up = clamp(vWNrm.y * 0.5 + 0.5, 0.0, 1.0);

    // Pale peduncle → vivid flank → deep red-orange head
    vec3 base = mix(uPale, uMid,  smoothstep(0.06, 0.55, vU));
    base      = mix(base,  uDeep, smoothstep(0.48, 0.95, vU) * 0.80);
    base = mix(base * 1.04, base, up);

    // Flat, diffused underwater light
    vec3 col = base * (0.80 + 0.28 * up);

    // Let the silhouette fall away into the water at grazing angles
    float facing = abs(normalize(vVNrm).z);
    float edge   = 1.0 - smoothstep(0.0, 0.55, facing);
    col = mix(col, uHaze, clamp(uHazeAmt + edge * 0.45, 0.0, 1.0));

    float a = 1.0 - edge * 0.35;              // outline feathers out
    gl_FragColor = vec4(col * a, a);          // premultiplied
  }
`;

const FIN_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPhase;
  uniform float uSwim;
  uniform float uWave;
  varying vec2  vST;

  void main() {
    vec3 p = position;
    float s = uv.x;
    vST = uv;

    float root = sin(uTime * 5.0 - 3.4 + uPhase) * uSwim;
    float w    = pow(s, 1.35);
    p.z += root + sin(uTime * 5.0 - 3.4 - s * 2.2 + uPhase) * uSwim * uWave * w;
    p.y += cos(uTime * 4.2 - s * 2.0 + uPhase) * 0.045 * w;

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

    float rays = 0.5 + 0.5 * sin(v * 46.0 + 1.7);
    vec3  col  = mix(uInner, uOuter, pow(s, 0.7));   // orange root → white tip
    col *= 0.90 + rays * 0.16;
    col = mix(col, uHaze, uHazeAmt * 0.8);

    float edge = smoothstep(0.0, 0.12, min(v, 1.0 - v));
    float a = uOpacity * (1.0 - 0.30 * s) * (0.30 + 0.70 * edge);
    gl_FragColor = vec4(col * a, a);                 // premultiplied
  }
`;

// ─── Blur + composite shaders ─────────────────────────────────────────────────
const QUAD_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const BLUR_FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uDir;                 // one texel step along the blur axis
  varying vec2 vUv;
  void main() {
    // 9-tap Gaussian, linear-sampled
    vec4 c  = texture2D(uTex, vUv) * 0.227027;
    c += (texture2D(uTex, vUv + uDir * 1.3846) + texture2D(uTex, vUv - uDir * 1.3846)) * 0.316216;
    c += (texture2D(uTex, vUv + uDir * 3.2308) + texture2D(uTex, vUv - uDir * 3.2308)) * 0.070270;
    gl_FragColor = c;
  }
`;

const COMPOSITE_FRAG = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2  uRes;
  uniform float uStrength;
  void main() {
    vec4 c = texture2D(uTex, gl_FragCoord.xy / uRes);   // premultiplied
    if (c.a < 0.003) discard;
    gl_FragColor = c * uStrength;
  }
`;

// ─── Geometry ─────────────────────────────────────────────────────────────────
function makeBodyGeometry() {
  const g = new THREE.SphereGeometry(0.5, 30, 20);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i) * BODY_LEN;
    let y = pos.getY(i) * 0.50;      // slender comet build, not a fat fancy type
    let z = pos.getZ(i) * 0.40;

    const u = (x + BODY_HALF) / BODY_LEN;   // 0 tail → 1 head

    // Long, gradual taper into the tail wrist
    if (u < 0.50) {
      const taper = 0.16 + 0.84 * Math.pow(u / 0.50, 0.90);
      y *= taper; z *= taper;
    }
    // Slightly pointed snout
    if (u > 0.80) {
      const t = (u - 0.80) / 0.20;
      const nose = 1.0 - 0.38 * t * t;
      y *= nose; z *= nose;
    }
    if (y < 0) y *= 1.10;            // a little belly

    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

/** Fan-shaped fin; `notch` forks the trailing edge. UV.x runs root→tip. */
function makeFanGeometry({ rootX, len, spread, notch = 0, curl = 0, segS = 14, segV = 20 }) {
  const position = [], uv = [], index = [];
  for (let i = 0; i <= segS; i++) {
    const s = i / segS;
    for (let j = 0; j <= segV; j++) {
      const vn = j / segV;
      const v  = vn * 2 - 1;
      const av = Math.abs(v);
      const lenAt = len * (1 - notch + notch * Math.pow(av, 0.55));
      const half  = 0.04 + Math.pow(s, 0.72) * spread;
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

// ─── Palettes — vivid red-orange with white fin tips, as in the reference ─────
const FISH_PALETTES = [
  { deep: 0xd23a10, mid: 0xef5c1e, pale: 0xf6a874, finI: 0xf07a3c, finO: 0xfff2e4 },
  { deep: 0xe2551a, mid: 0xf87a2c, pale: 0xfac89a, finI: 0xf59456, finO: 0xfff8ee },
  { deep: 0xbf300c, mid: 0xdf4a16, pale: 0xef9a60, finI: 0xe86c2c, finO: 0xffeeda },
];

const TWO_PI = Math.PI * 2;
const wrapAngle = (a) => {
  while (a >  Math.PI) a -= TWO_PI;
  while (a < -Math.PI) a += TWO_PI;
  return a;
};

class Goldfish {
  constructor(cfg) {
    Object.assign(this, cfg);

    const pal  = FISH_PALETTES[cfg.palette % FISH_PALETTES.length];
    const haze = new THREE.Color(HAZE_COLOR);
    const hazeAmt = 0.16;

    const uniforms = {
      uTime:  { value: 0 },
      uPhase: { value: cfg.phase },
      uSwim:  { value: cfg.swim },
    };
    this.uniforms = uniforms;

    const group = new THREE.Group();
    group.rotation.order = 'YXZ';

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
          uHazeAmt: { value: hazeAmt },
        },
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
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
        uHazeAmt: { value: hazeAmt },
        uOpacity: { value: opacity },
      },
      transparent: true,
      premultipliedAlpha: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // Deeply forked comet tail
    const tail = new THREE.Mesh(
      makeFanGeometry({ rootX: -0.50, len: 0.88, spread: 0.42, notch: 0.46, curl: 0.06, segS: 16, segV: 24 }),
      finMat(0.95, 2.3),
    );
    group.add(tail);

    // Pectoral fins — the pale flecks either side of the body from above
    for (const side of [1, -1]) {
      const pec = new THREE.Mesh(
        makeFanGeometry({ rootX: 0.04, len: 0.34, spread: 0.14, notch: 0.14, curl: 0.04, segS: 10, segV: 12 }),
        finMat(0.72, 1.5),
      );
      pec.position.set(0.06, -0.02, side * 0.11);
      pec.rotation.y = side * -0.55;
      pec.rotation.x = side * 0.25;
      group.add(pec);
    }

    // Dorsal sail
    const dorsal = new THREE.Mesh(
      makeFanGeometry({ rootX: 0.14, len: 0.40, spread: 0.20, notch: 0.10, curl: 0, segS: 10, segV: 12 }),
      finMat(0.68, 1.4),
    );
    dorsal.rotation.x = Math.PI / 2;
    dorsal.position.y = 0.13;
    group.add(dorsal);

    group.scale.setScalar(cfg.scale);
    this.group = group;
    this.prevYaw = 0;
    this.roll = 0;
  }

  pathAt(t) {
    const s = t * this.speed + this.phase;
    return {
      x: this.cx + this.rx * Math.sin(s)        + this.rx2 * Math.sin(s * 1.73 + 1.1),
      z: this.cz + this.rz * Math.cos(s * 0.86) + this.rz2 * Math.sin(s * 2.31 + 0.4),
      y: this.cy + Math.sin(s * 1.3 + this.phase) * 0.05,
    };
  }

  update(t) {
    this.uniforms.uTime.value = t;

    const p  = this.pathAt(t);
    const pN = this.pathAt(t + 0.06);
    this.group.position.set(p.x, p.y, p.z);

    const yaw = Math.atan2(-(pN.z - p.z), pN.x - p.x);
    this.group.rotation.y = yaw;

    const dYaw = wrapAngle(yaw - this.prevYaw);
    this.prevYaw = yaw;
    const target = THREE.MathUtils.clamp(dYaw * 90, -0.42, 0.42);
    this.roll += (target - this.roll) * 0.06;
    this.group.rotation.x = this.roll;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Builds the blurred goldfish layer.
 *
 * The fish live in their own scene so they can be rendered small, blurred, and
 * composited onto a plane sitting at swimming depth — which means the floating
 * project objects still occlude them through ordinary depth testing.
 */
export function buildFishField(scene, renderer) {
  const specs = [
    { cx: -3.4, cz: -2.4, rx: 3.1, rx2: 1.1, rz: 2.5, rz2: 0.9, cy: FISH_Y,        speed: 0.150, scale: 0.82, palette: 0 },
    { cx:  3.6, cz:  0.6, rx: 2.7, rx2: 0.9, rz: 2.9, rz2: 1.1, cy: FISH_Y - 0.06, speed: 0.126, scale: 0.70, palette: 1 },
    { cx: -2.6, cz:  5.6, rx: 3.3, rx2: 1.2, rz: 2.3, rz2: 0.8, cy: FISH_Y + 0.03, speed: 0.168, scale: 0.76, palette: 2 },
    { cx:  3.0, cz:  9.4, rx: 2.9, rx2: 1.0, rz: 2.6, rz2: 1.0, cy: FISH_Y - 0.04, speed: 0.140, scale: 0.88, palette: 0 },
    { cx: -2.2, cz: 13.6, rx: 3.2, rx2: 1.1, rz: 2.5, rz2: 0.9, cy: FISH_Y + 0.02, speed: 0.158, scale: 0.72, palette: 1 },
  ];

  const fishScene = new THREE.Scene();
  const fish = specs.map((s, i) => {
    const f = new Goldfish({ ...s, phase: (i * 1.97) % TWO_PI, swim: 0.040 + (i % 3) * 0.006 });
    fishScene.add(f.group);
    return f;
  });

  // ── Offscreen targets ──
  const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  const rtA = new THREE.WebGLRenderTarget(2, 2, rtOpts);
  const rtB = new THREE.WebGLRenderTarget(2, 2, rtOpts);

  const blurMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: BLUR_FRAG,
    uniforms: { uTex: { value: null }, uDir: { value: new THREE.Vector2() } },
    depthTest: false, depthWrite: false,
  });
  const quadScene = new THREE.Scene();
  quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blurMat));
  const quadCam = new THREE.Camera();

  // ── Composite plane, parked at swimming depth ──
  const compositeMat = new THREE.ShaderMaterial({
    fragmentShader: COMPOSITE_FRAG,
    uniforms: {
      uTex:      { value: rtA.texture },
      uRes:      { value: new THREE.Vector2(1, 1) },
      uStrength: { value: 0.92 },
    },
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
  });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), compositeMat);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = FISH_Y;
  plane.renderOrder = 0;          // under the water (1) and the leaves (2)
  scene.add(plane);

  const size = new THREE.Vector2();

  return {
    fish,

    setSize() {
      renderer.getDrawingBufferSize(size);
      compositeMat.uniforms.uRes.value.copy(size);
      const w = Math.max(2, Math.floor(size.x * RT_SCALE));
      const h = Math.max(2, Math.floor(size.y * RT_SCALE));
      rtA.setSize(w, h);
      rtB.setSize(w, h);
    },

    update(t) {
      for (const f of fish) f.update(t);
    },

    /** Renders the fish offscreen and blurs them. Call before the main render. */
    renderPass(camera) {
      // Follow the camera so the plane always spans the view
      plane.position.x = camera.position.x;
      plane.position.z = camera.position.z;

      const prevTarget = renderer.getRenderTarget();
      const prevAlpha  = renderer.getClearAlpha();
      const prevColor  = new THREE.Color();
      renderer.getClearColor(prevColor);

      renderer.setClearColor(0x000000, 0);
      renderer.setRenderTarget(rtA);
      renderer.clear();
      renderer.render(fishScene, camera);

      for (let i = 0; i < BLUR_PASSES; i++) {
        blurMat.uniforms.uTex.value = rtA.texture;
        blurMat.uniforms.uDir.value.set(1 / rtA.width, 0);
        renderer.setRenderTarget(rtB);
        renderer.clear();
        renderer.render(quadScene, quadCam);

        blurMat.uniforms.uTex.value = rtB.texture;
        blurMat.uniforms.uDir.value.set(0, 1 / rtA.height);
        renderer.setRenderTarget(rtA);
        renderer.clear();
        renderer.render(quadScene, quadCam);
      }

      renderer.setRenderTarget(prevTarget);
      renderer.setClearColor(prevColor, prevAlpha);
    },
  };
}
