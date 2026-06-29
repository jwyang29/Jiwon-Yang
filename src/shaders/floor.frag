precision highp float;

uniform float uTime;
uniform float uAudioLevel;

varying vec2 vUv;
varying vec2 vWorldXZ;

#define PI 3.14159265358979

// ── Pool tile grid ─────────────────────────────────────────────────────────────
float tileGrid(vec2 uv, float size, float lineWidth) {
  vec2 p = fract(uv * size);
  vec2 d = min(p, 1.0 - p);
  return 1.0 - smoothstep(0.0, lineWidth, min(d.x, d.y));
}

// ── Noise (shared with caustic sampling) ───────────────────────────────────────
vec2 _h2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}
float gnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(dot(_h2(i),           f),           dot(_h2(i + vec2(1,0)), f - vec2(1,0)), u.x),
    mix(dot(_h2(i + vec2(0,1)), f - vec2(0,1)), dot(_h2(i + vec2(1,1)), f - vec2(1,1)), u.x),
    u.y);
}

// ── Gerstner wave height (must mirror water.vert) ─────────────────────────────
float gerstnerHeight(vec2 xz, float t) {
  float boost = 1.0 + uAudioLevel * 4.0;
  float h = 0.0;
  { float k=2.0*PI/2.0; vec2 d=normalize(vec2( 0.7, 0.7));
    h += (0.13*boost/k)*sin(k*(dot(d,xz)-sqrt(9.8/k)*t)); }
  { float k=2.0*PI/1.4; vec2 d=normalize(vec2(-0.5, 0.9));
    h += (0.10*boost/k)*sin(k*(dot(d,xz)-sqrt(9.8/k)*t)); }
  { float k=2.0*PI/1.2; vec2 d=normalize(vec2(-0.8,-0.6));
    h += (0.09*boost/k)*sin(k*(dot(d,xz)-sqrt(9.8/k)*t)); }
  { float k=2.0*PI/2.4; vec2 d=normalize(vec2( 0.4,-0.9));
    h += (0.08*boost/k)*sin(k*(dot(d,xz)-sqrt(9.8/k)*t)); }
  return h;
}

// ── Physics caustic (Laplacian of wave height) ─────────────────────────────────
float waveCausticAt(vec2 xz, float t) {
  const float eps = 0.05;
  float h00 = gerstnerHeight(xz, t);
  float hpx = gerstnerHeight(xz + vec2(eps, 0.0), t);
  float hmx = gerstnerHeight(xz - vec2(eps, 0.0), t);
  float hpz = gerstnerHeight(xz + vec2(0.0, eps), t);
  float hmz = gerstnerHeight(xz - vec2(0.0, eps), t);
  float laplacian = (hpx + hmx + hpz + hmz - 4.0*h00) / (eps*eps);
  float cv = clamp(laplacian * 0.38 + 0.06, 0.0, 1.0);
  return pow(cv, 1.6);
}

float waveCaustic(vec2 xz, float t) {
  float c1 = waveCausticAt(xz, t);
  float c2 = waveCausticAt(xz * 2.2 + vec2(3.1, 1.7), t * 0.82);
  return mix(c1, sqrt(c1 * c2), 0.45);
}

void main() {
  // ── Tile floor ────────────────────────────────────────────────────────────
  vec3 tileBase  = vec3(0.68, 0.83, 0.91);
  vec3 tileGrout = vec3(0.50, 0.65, 0.74);
  // 21 tiles (odd) — no grout line falls at UV=0.5 (center), avoids visual seam
  float grid = tileGrid(vUv, 21.0, 0.05);
  vec3 floorColor = mix(tileBase, tileGrout, grid);

  // ── Noise-perturbed caustic ───────────────────────────────────────────────
  // Offset the caustic sample point by smooth noise to break tiling pattern
  float t = uTime;
  vec2 noiseOff = vec2(
    gnoise(vWorldXZ * 0.65 + t * 0.045),
    gnoise(vWorldXZ * 0.65 + vec2(4.13, 2.79) + t * 0.045)
  ) * 0.40;

  float cv = waveCaustic(vWorldXZ + noiseOff, t);
  vec3 causticColor = vec3(1.0, 0.94, 0.78) * cv * 0.34;

  // ── Depth vignette ────────────────────────────────────────────────────────
  float depth = 1.0 - length(vUv - 0.5) * 0.48;
  floorColor *= 0.86 + depth * 0.20;

  gl_FragColor = vec4(clamp(floorColor + causticColor, 0.0, 1.0), 1.0);
}
