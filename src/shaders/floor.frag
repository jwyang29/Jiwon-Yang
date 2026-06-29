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

// ── Gerstner wave height (must mirror water.vert exactly) ─────────────────────
float gerstnerHeight(vec2 xz, float t) {
  float boost = 1.0 + uAudioLevel * 3.5;
  float h = 0.0;

  // Wavelengths halved vs. old version → finer ripple pattern
  { float k=2.0*PI/2.0; vec2 d=normalize(vec2(1.0,0.4));
    h += (0.26*boost/k)*sin(k*(dot(d,xz)-sqrt(9.8/k)*t)); }
  { float k=2.0*PI/1.4; vec2 d=normalize(vec2(0.3,1.0));
    h += (0.20*boost/k)*sin(k*(dot(d,xz)-sqrt(9.8/k)*t)); }
  { float k=2.0*PI/1.2; vec2 d=normalize(vec2(-0.6,0.7));
    h += (0.18*boost/k)*sin(k*(dot(d,xz)-sqrt(9.8/k)*t)); }
  { float k=2.0*PI/2.4; vec2 d=normalize(vec2(0.8,-0.4));
    h += (0.16*boost/k)*sin(k*(dot(d,xz)-sqrt(9.8/k)*t)); }

  return h;
}

// ── Physics-based caustic ─────────────────────────────────────────────────────
// Discrete Laplacian of wave height → light convergence (bright) / divergence (dark)
float waveCausticAt(vec2 xz, float t) {
  const float eps = 0.05;
  float h00 = gerstnerHeight(xz, t);
  float hpx = gerstnerHeight(xz + vec2(eps, 0.0), t);
  float hmx = gerstnerHeight(xz - vec2(eps, 0.0), t);
  float hpz = gerstnerHeight(xz + vec2(0.0, eps), t);
  float hmz = gerstnerHeight(xz - vec2(0.0, eps), t);
  float laplacian = (hpx + hmx + hpz + hmz - 4.0*h00) / (eps*eps);
  float cv = clamp(laplacian * 3.2 + 0.25, 0.0, 1.0);
  return pow(cv, 2.2);
}

float waveCaustic(vec2 xz, float t) {
  float c1 = waveCausticAt(xz, t);
  float c2 = waveCausticAt(xz * 1.8 + vec2(2.5, 0.9), t * 0.85);
  return mix(c1, c1 * c2, 0.5);
}

void main() {
  // ── Tile floor ────────────────────────────────────────────────────────
  vec3 tileBase  = vec3(0.68, 0.83, 0.91);
  vec3 tileGrout = vec3(0.50, 0.65, 0.74); // lighter than before
  float grid = tileGrid(vUv, 20.0, 0.05);  // 20 tiles (was 10), thinner line
  vec3 floorColor = mix(tileBase, tileGrout, grid);

  // ── Wave-linked caustic ───────────────────────────────────────────────
  float cv = waveCaustic(vWorldXZ, uTime);
  vec3 causticColor = vec3(1.0, 0.95, 0.80) * cv * 0.50;

  // ── Depth vignette ────────────────────────────────────────────────────
  float depth = 1.0 - length(vUv - 0.5) * 0.48;
  floorColor *= 0.86 + depth * 0.20;

  gl_FragColor = vec4(clamp(floorColor + causticColor, 0.0, 1.0), 1.0);
}
