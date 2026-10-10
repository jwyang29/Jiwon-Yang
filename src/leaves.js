import * as THREE from 'three';

/* ─────────────────────────────────────────────────────────────────────────────
   Fallen maple leaves drifting on the pool surface.

   Leaf height and tilt are driven by the same four large swells that displace
   the water in water.vert, so they ride the surface instead of hovering on it.
   ──────────────────────────────────────────────────────────────────────────── */

// Mirrors the four dominant waves of water.vert (the fine ripples are too
// small to change how a leaf sits).
export function waveHeight(x, z, t) {
  return 0.060 * Math.sin( 1.16 * x + 0.82 * z - 1.40 * t)
       + 0.052 * Math.sin(-0.88 * x + 1.02 * z - 1.20 * t)
       + 0.048 * Math.sin( 0.56 * x - 1.24 * z - 1.10 * t)
       + 0.040 * Math.sin(-1.30 * x - 0.62 * z - 1.55 * t);
}

function waveGradient(x, z, t, out) {
  let gx = 0, gz = 0, c;
  c = Math.cos( 1.16 * x + 0.82 * z - 1.40 * t); gx += 0.060 *  1.16 * c; gz += 0.060 *  0.82 * c;
  c = Math.cos(-0.88 * x + 1.02 * z - 1.20 * t); gx += 0.052 * -0.88 * c; gz += 0.052 *  1.02 * c;
  c = Math.cos( 0.56 * x - 1.24 * z - 1.10 * t); gx += 0.048 *  0.56 * c; gz += 0.048 * -1.24 * c;
  c = Math.cos(-1.30 * x - 0.62 * z - 1.55 * t); gx += 0.040 * -1.30 * c; gz += 0.040 * -0.62 * c;
  out[0] = gx; out[1] = gz;
  return out;
}

// ─── Leaf silhouette ──────────────────────────────────────────────────────────
/**
 * Five-lobed maple outline built from polar control points, mirrored across the
 * midrib, plus a short stem.
 *
 * `jitter` is a 0..1 seed. Every leaf gets its own, so the lobes vary in reach
 * and the two halves stop being perfect mirrors. A row of identical silhouettes
 * is the thing that reads as clip art rather than as leaves.
 */
function makeMapleShape(jitter = 0) {
  // [angle from +Y in degrees, radius]
  const spec = [
    [  0, 1.00],   // central lobe tip
    [ 22, 0.46],
    [ 32, 0.34],   // sinus
    [ 44, 0.62],
    [ 55, 0.92],   // upper side lobe
    [ 70, 0.44],
    [ 82, 0.28],   // sinus
    [ 96, 0.52],
    [108, 0.72],   // lower side lobe
    [126, 0.40],
    [142, 0.24],
  ];

  // Cheap deterministic hash, so a given leaf is the same shape every reload.
  const wob = (i, side) => {
    const v = Math.sin((i + 1) * 12.9898 + jitter * 78.233 + side * 37.719) * 43758.5453;
    return 1 + ((v - Math.floor(v)) - 0.5) * 0.26;
  };

  const toXY = (deg, r, sign, i) => {
    const a = THREE.MathUtils.degToRad(deg * (1 + (wob(i, sign) - 1) * 0.35));
    const rr = r * wob(i, sign);
    return [sign * Math.sin(a) * rr, Math.cos(a) * rr];
  };

  const shape = new THREE.Shape();
  const [tx, ty] = toXY(0, 1, 1, 0);
  shape.moveTo(tx, ty);

  for (let i = 1; i < spec.length; i++) {          // right half, tip → base
    const [x, y] = toXY(spec[i][0], spec[i][1], 1, i);
    shape.lineTo(x, y);
  }
  shape.lineTo(0.045, -0.30);                      // stem, right edge
  shape.lineTo(0.030, -0.72);                      // stem tip
  shape.lineTo(-0.030, -0.72);
  shape.lineTo(-0.045, -0.30);                     // stem, left edge
  for (let i = spec.length - 1; i >= 1; i--) {     // left half, base → tip
    const [x, y] = toXY(spec[i][0], spec[i][1], -1, i);
    shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

// Autumn leaf colours sampled from the moodboard — rust through amber
const LEAF_COLORS = [
  0x8f3e00, 0xa34700, 0xd05b00, 0xdc7a1e,
  0xe89a44, 0x7d3600, 0xc06412, 0xb05200,
];

/**
 * Lift the edges and drop the middle, so the leaf is a shallow dish rather than
 * a decal. Nothing here is visible as silhouette from overhead: it shows up
 * because the standard material then shades one side of the curl against the
 * other, which is most of what separates a leaf from a flat orange shape.
 *
 * The parts that end up lowest are also the parts sitting in the water, so the
 * same curve drives a wetness darkening through vertex colour.
 */
function curlAndShade(geo, baseColor, curl, seed) {
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const spanX = Math.max(bb.max.x - bb.min.x, 1e-4);
  const spanZ = Math.max(bb.max.z - bb.min.z, 1e-4);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color(baseColor);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);

  // A slight twist about the midrib as well as the cup, so the two halves of
  // the leaf do not catch the light identically.
  const tw = Math.sin(seed * 91.17) * 0.5;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const nx = (x - bb.min.x) / spanX * 2 - 1;      // -1..1 across the blade
    const nz = (z - bb.min.z) / spanZ * 2 - 1;      // -1..1 along the midrib
    const r2 = Math.min(nx * nx + nz * nz, 1);

    const y = curl * (r2 - 0.35) + tw * curl * nx * nz;
    pos.setY(i, y);

    // Dry tips run lighter and more yellow, the wet middle runs darker. The
    // range is small on purpose: this is weathering, not a gradient fill.
    const dry  = Math.min(Math.max((r2 - 0.1) / 0.9, 0), 1);
    const wet  = Math.min(Math.max(-y / Math.max(curl, 1e-4), 0), 1);
    const l = THREE.MathUtils.clamp(hsl.l * (0.80 + dry * 0.34 - wet * 0.16), 0.02, 0.95);
    const s = THREE.MathUtils.clamp(hsl.s * (1.0 - dry * 0.18), 0, 1);
    const h = hsl.h + dry * 0.012;                  // a touch toward amber
    const out = new THREE.Color().setHSL(h, s, l);
    col[i * 3] = out.r; col[i * 3 + 1] = out.g; col[i * 3 + 2] = out.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Soft round blot used for every leaf shadow. One texture, shared.
 * Drawn rather than computed in a shader because there are dozens of these and
 * they only need to be a smudge.
 */
function makeShadowTexture() {
  const S = 64;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0.00, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.72)');
  g.addColorStop(1.00, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Matches the sun the floor shader casts object shadows from, normalize(2,14,3),
// so leaf and object shadows fall the same way. Depth is leaf height to floor.
const SHADOW_OFF_X = -(2 / 14) * 0.82;
const SHADOW_OFF_Z = -(3 / 14) * 0.82;

// ─── Public API ───────────────────────────────────────────────────────────────
export function buildLeaves(scene, count = 40) {
  const shadowTex = makeShadowTexture();
  const shadowGeo = new THREE.PlaneGeometry(1, 1);
  shadowGeo.rotateX(-Math.PI / 2);

  const leaves = [];
  for (let i = 0; i < count; i++) {
    // Deterministic scatter so the layout is stable between reloads
    const r1 = Math.sin(i * 12.9898) * 43758.5453;
    const r2 = Math.sin(i * 78.233)  * 12345.6789;
    const r3 = Math.sin(i * 39.425)  * 24634.1234;
    const r4 = Math.sin(i * 57.119)  * 31415.9265;
    const f  = (v) => v - Math.floor(v);

    const geo = new THREE.ShapeGeometry(makeMapleShape(f(r4)), 6);
    geo.rotateX(-Math.PI / 2);        // lay flat on the XZ plane
    geo.center();
    curlAndShade(geo, LEAF_COLORS[i % LEAF_COLORS.length], 0.10 + f(r4) * 0.09, f(r1));

    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.70 + f(r2) * 0.22,   // some leaves still have a sheen
        metalness: 0.0,
        side: THREE.DoubleSide,
        transparent: true,          // draw after the water surface
        opacity: 0.97,
      }),
    );

    const scale = 0.30 + f(r3) * 0.26;
    mesh.scale.setScalar(scale);
    mesh.renderOrder = 2;           // above the water (renderOrder 1)

    // The shadow sits on the pool floor, under the water rather than on it.
    const shadow = new THREE.Mesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        color: 0x0d2136,            // a cold blue, not black: it is seen through water
        transparent: true,
        opacity: 0.30,
        depthWrite: false,
      }),
    );
    shadow.scale.setScalar(scale * 2.1);   // a shadow 0.8 down is wider than its leaf
    shadow.renderOrder = 0;                // under the water (1) and the leaf (2)

    const leaf = {
      mesh,
      shadow,
      x: -9.5 + f(r1) * 19.0,
      z: -8.0 + f(r2) * 66.0,
      spin: (f(r3) - 0.5) * 0.10,           // slow rotation
      angle: f(r1) * Math.PI * 2,
      driftX: (f(r2) - 0.5) * 0.055,        // gentle surface drift
      driftZ: (f(r3) - 0.5) * 0.040 + 0.02,
      rockPhase: f(r4) * Math.PI * 2,
      rockRate: 0.5 + f(r2) * 0.45,
    };

    mesh.position.set(leaf.x, 0, leaf.z);
    scene.add(mesh);
    scene.add(shadow);
    leaves.push(leaf);
  }
  return leaves;
}

const _grad = [0, 0];
const SWELL = 0.0;   // keep in step with SWELL in main.js
// With SWELL at zero there is no slope for a leaf to ride, and a leaf pinned
// perfectly flat on perfectly flat water reads as a sticker. This is a small
// idle rock of its own so the surface still looks like liquid.
const ROCK = 0.035;

export function animateLeaves(leaves, t) {
  for (const leaf of leaves) {
    // Drift, wrapping around the pool so the surface never empties out.
    // The z span covers the whole 112-deep pool; it used to stop at 46 and
    // left the far end bare once the pool was lengthened.
    const x = leaf.x + leaf.driftX * t;
    const z = leaf.z + leaf.driftZ * t;
    const wx = ((x + 11) % 22 + 22) % 22 - 11;
    const wz = ((z + 10) % 68 + 68) % 68 - 10;

    // SWELL mirrors main.js: with the surface still there is no slope to ride,
    // so the leaves keep their drift and spin but stop bobbing and tilting.
    const g = waveGradient(wx, wz, t, _grad);
    const rock = t * leaf.rockRate + leaf.rockPhase;
    const y = waveHeight(wx, wz, t) * SWELL + 0.02 + Math.sin(rock) * 0.004;
    leaf.mesh.position.set(wx, y, wz);
    leaf.mesh.rotation.set(
      g[1] * 1.6 * SWELL + Math.sin(rock) * ROCK,
      leaf.angle + leaf.spin * t,
      -g[0] * 1.6 * SWELL + Math.cos(rock * 0.83) * ROCK,
      'YXZ',
    );
    leaf.shadow.position.set(wx + SHADOW_OFF_X, -0.79, wz + SHADOW_OFF_Z);
  }
}
