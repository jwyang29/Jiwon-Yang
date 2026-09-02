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
 */
function makeMapleShape() {
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

  const toXY = (deg, r, sign) => {
    const a = THREE.MathUtils.degToRad(deg);
    return [sign * Math.sin(a) * r, Math.cos(a) * r];
  };

  const shape = new THREE.Shape();
  const [tx, ty] = toXY(0, 1, 1);
  shape.moveTo(tx, ty);

  for (let i = 1; i < spec.length; i++) {          // right half, tip → base
    const [x, y] = toXY(spec[i][0], spec[i][1], 1);
    shape.lineTo(x, y);
  }
  shape.lineTo(0.045, -0.30);                      // stem, right edge
  shape.lineTo(0.030, -0.72);                      // stem tip
  shape.lineTo(-0.030, -0.72);
  shape.lineTo(-0.045, -0.30);                     // stem, left edge
  for (let i = spec.length - 1; i >= 1; i--) {     // left half, base → tip
    const [x, y] = toXY(spec[i][0], spec[i][1], -1);
    shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

// Autumn leaf colours sampled from the moodboard — rust through amber
const LEAF_COLORS = [
  0x9c4a1e, 0xb35a20, 0xc86a26, 0xd98a33,
  0xe0a341, 0x8a3d1c, 0xbf7a2c, 0xa8551f,
];

// ─── Public API ───────────────────────────────────────────────────────────────
export function buildLeaves(scene, count = 18) {
  const shape = makeMapleShape();
  const geo = new THREE.ShapeGeometry(shape, 6);
  geo.rotateX(-Math.PI / 2);        // lay flat on the XZ plane
  geo.center();

  const leaves = [];
  for (let i = 0; i < count; i++) {
    // Deterministic scatter so the layout is stable between reloads
    const r1 = Math.sin(i * 12.9898) * 43758.5453;
    const r2 = Math.sin(i * 78.233)  * 12345.6789;
    const r3 = Math.sin(i * 39.425)  * 24634.1234;
    const f  = (v) => v - Math.floor(v);

    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: LEAF_COLORS[i % LEAF_COLORS.length],
        roughness: 0.86,
        metalness: 0.0,
        side: THREE.DoubleSide,
        transparent: true,          // draw after the water surface
        opacity: 0.97,
      }),
    );

    const scale = 0.30 + f(r3) * 0.26;
    mesh.scale.setScalar(scale);
    mesh.renderOrder = 2;           // above the water (renderOrder 1)

    const leaf = {
      mesh,
      x: -9.5 + f(r1) * 19.0,
      z: -7.0 + f(r2) * 25.0,
      spin: (f(r3) - 0.5) * 0.10,           // slow rotation
      angle: f(r1) * Math.PI * 2,
      driftX: (f(r2) - 0.5) * 0.055,        // gentle surface drift
      driftZ: (f(r3) - 0.5) * 0.040 + 0.02,
    };

    mesh.position.set(leaf.x, 0, leaf.z);
    scene.add(mesh);
    leaves.push(leaf);
  }
  return leaves;
}

const _grad = [0, 0];

export function animateLeaves(leaves, t) {
  for (const leaf of leaves) {
    // Drift, wrapping around the pool so the surface never empties out
    const x = leaf.x + leaf.driftX * t;
    const z = leaf.z + leaf.driftZ * t;
    const wx = ((x + 11) % 22 + 22) % 22 - 11;
    const wz = ((z + 10) % 32 + 32) % 32 - 10;

    const g = waveGradient(wx, wz, t, _grad);
    leaf.mesh.position.set(wx, waveHeight(wx, wz, t) + 0.02, wz);

    // Lie along the local water slope, with a slow spin about the vertical
    leaf.mesh.rotation.set(g[1] * 1.6, leaf.angle + leaf.spin * t, -g[0] * 1.6, 'YXZ');
  }
}
