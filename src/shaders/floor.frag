precision highp float;

uniform float uTime;
uniform float uAudioLevel;

varying vec2 vUv;
varying vec2 vWorldXZ;

#define PI 3.14159265358979

// ── Pool tile grid ─────────────────────────────────────────────────────────────
float tileGrid(vec2 uv, float size, float lineWidth) {
  vec2 p  = fract(uv * size);
  vec2 d  = min(p, 1.0 - p);
  return 1.0 - smoothstep(0.0, lineWidth, min(d.x, d.y));
}

// ── Gerstner wave height (mirrors water.vert — keep params in sync) ─────────
// Returns the Y displacement of the water surface above world point xz
float gerstnerHeight(vec2 xz, float t) {
  float boost = 1.0 + uAudioLevel * 3.5;
  float h = 0.0;

  // Wave 0
  { float k=2.0*PI/4.8; vec2 d=normalize(vec2(1.0,0.4));
    h += (0.09*boost/k)*sin(k*(dot(d,xz)-sqrt(9.8/k)*t)); }
  // Wave 1
  { float k=2.0*PI/3.5; vec2 d=normalize(vec2(0.3,1.0));
    h += (0.07*boost/k)*sin(k*(dot(d,xz)-sqrt(9.8/k)*t)); }
  // Wave 2
  { float k=2.0*PI/3.0; vec2 d=normalize(vec2(-0.6,0.7));
    h += (0.06*boost/k)*sin(k*(dot(d,xz)-sqrt(9.8/k)*t)); }
  // Wave 3
  { float k=2.0*PI/5.8; vec2 d=normalize(vec2(0.8,-0.4));
    h += (0.04*boost/k)*sin(k*(dot(d,xz)-sqrt(9.8/k)*t)); }

  return h;
}

// ── Physics-based caustic ─────────────────────────────────────────────────────
// Pool caustics = light focusing at concave water surface patches.
// The discrete Laplacian of wave height approximates surface curvature:
//   positive Laplacian → concave → light converges → bright spot
//   negative Laplacian → convex  → light diverges → dark region
//
// We sample at 2 scales: primary (main wave pattern) + secondary (finer detail).
float waveCausticAt(vec2 xz, float t) {
  const float eps = 0.09;
  float h00 = gerstnerHeight(xz, t);
  float hpx = gerstnerHeight(xz + vec2(eps, 0.0), t);
  float hmx = gerstnerHeight(xz - vec2(eps, 0.0), t);
  float hpz = gerstnerHeight(xz + vec2(0.0, eps), t);
  float hmz = gerstnerHeight(xz - vec2(0.0, eps), t);
  float laplacian = (hpx + hmx + hpz + hmz - 4.0*h00) / (eps*eps);
  float cv = clamp(laplacian * 3.5 + 0.28, 0.0, 1.0);
  return pow(cv, 2.2);
}

float waveCaustic(vec2 xz, float t) {
  // Primary scale — matches wave periodicity
  float c1 = waveCausticAt(xz, t);
  // Secondary scale — ~2x higher frequency, offset in time for shimmer
  float c2 = waveCausticAt(xz * 2.1 + vec2(3.7, 1.3), t * 0.85);
  // Blend: primary drives overall shape, secondary adds fine grain
  return mix(c1, c1 * c2, 0.55);
}

void main() {
  // ── Tile floor ────────────────────────────────────────────────────────
  vec3 tileBase  = vec3(0.68, 0.83, 0.91);
  vec3 tileGrout = vec3(0.26, 0.42, 0.57);
  float grid = tileGrid(vUv, 10.0, 0.07);
  vec3 floorColor = mix(tileBase, tileGrout, grid);

  // ── Wave-linked caustic ───────────────────────────────────────────────
  float cv = waveCaustic(vWorldXZ, uTime);
  // Warm sunlight color for the bright patches
  vec3 causticColor = vec3(1.0, 0.95, 0.80) * cv * 0.52;

  // ── Depth vignette (centre of pool slightly brighter) ────────────────
  float depth = 1.0 - length(vUv - 0.5) * 0.48;
  floorColor *= 0.86 + depth * 0.20;

  gl_FragColor = vec4(clamp(floorColor + causticColor, 0.0, 1.0), 1.0);
}
