precision highp float;

uniform float uTime;
uniform float uAudioLevel;
uniform vec2  uObjPos[9];
uniform float uObjStrength[9];

varying vec3 vWorldPos;
varying vec2 vUv;

// Y-only displacement — no XZ movement, so vertices never bunch or cross.
void addWaveY(
  inout float y,
  float kx, float kz, float A, float spd, float t, vec2 pos
) {
  y += A * sin(kx * pos.x + kz * pos.y - spd * t);
}

void main() {
  vUv = uv;
  vec2 pos    = position.xz;
  float t     = uTime;
  float boost = 1.0 + uAudioLevel * 3.5;

  float y = 0.0;
  addWaveY(y,  1.16,  0.82, 0.060, 1.40, t, pos);
  addWaveY(y, -0.88,  1.02, 0.052, 1.20, t, pos);
  addWaveY(y,  0.56, -1.24, 0.048, 1.10, t, pos);
  addWaveY(y, -1.30, -0.62, 0.040, 1.55, t, pos);
  addWaveY(y,  2.82,  1.95, 0.022, 2.50, t, pos);
  addWaveY(y, -2.10,  2.80, 0.018, 2.80, t, pos);
  addWaveY(y,  1.68, -3.20, 0.016, 2.30, t, pos);
  addWaveY(y, -3.45, -1.80, 0.014, 3.10, t, pos);
  addWaveY(y,  5.20,  3.80, 0.009, 4.20, t, pos);
  addWaveY(y, -4.60,  5.10, 0.007, 4.80, t, pos);
  addWaveY(y,  6.30, -4.40, 0.006, 5.50, t, pos);
  addWaveY(y, -5.80, -6.20, 0.005, 6.10, t, pos);
  y *= boost;

  // Object-driven radial ripples (Y-only)
  for (int i = 0; i < 9; i++) {
    float d   = length(pos - uObjPos[i]);
    float env = exp(-d * d * 0.45);
    float rip = sin(d * 3.8 - t * 1.8 + float(i) * 1.3) * 0.055;
    y += rip * uObjStrength[i] * env;
  }

  vec3 p = position;
  p.y += y;
  vWorldPos = p;

  // Normal is NOT interpolated from vertices — computed per-pixel in water.frag
  // to eliminate triangle-edge interpolation artifacts (tearing).
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
