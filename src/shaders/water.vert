precision highp float;

uniform float uTime;
uniform float uAudioLevel;

// Floating object positions (world XZ) and ripple strengths
uniform vec2  uObjPos[4];
uniform float uObjStrength[4];

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;

#define PI 3.14159265358979323846

struct GerstnerResult {
  vec3 offset;
  vec3 tangent;
  vec3 binormal;
};

GerstnerResult gerstner(vec2 dir, float steepness, float wavelength, vec3 p, float time) {
  float k   = 2.0 * PI / wavelength;
  float c   = sqrt(9.8 / k);
  vec2  d   = normalize(dir);
  float f   = k * (dot(d, p.xz) - c * time);
  float a   = steepness / k;

  GerstnerResult g;
  g.offset  = vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));

  float kA  = k * a;
  float sinf = sin(f);
  float cosf = cos(f);

  g.tangent  = vec3(-d.x * d.x * kA * sinf,  d.x * kA * cosf, -d.x * d.y * kA * sinf);
  g.binormal = vec3(-d.x * d.y * kA * sinf,  d.y * kA * cosf, -d.y * d.y * kA * sinf);

  return g;
}

void main() {
  vUv = uv;
  vec3 p = position;

  float boost = 1.0 + uAudioLevel * 4.0;

  // Four Gerstner waves — balanced directions to prevent +X horizontal bunching
  GerstnerResult g0 = gerstner(vec2( 0.7,  0.7),  0.13 * boost, 2.0, p, uTime);
  GerstnerResult g1 = gerstner(vec2(-0.5,  0.9),  0.10 * boost, 1.4, p, uTime);
  GerstnerResult g2 = gerstner(vec2(-0.8, -0.6),  0.09 * boost, 1.2, p, uTime);
  GerstnerResult g3 = gerstner(vec2( 0.4, -0.9),  0.08 * boost, 2.4, p, uTime);

  p += g0.offset + g1.offset + g2.offset + g3.offset;

  vec3 tangent  = vec3(1.0, 0.0, 0.0)
    + g0.tangent + g1.tangent + g2.tangent + g3.tangent;
  vec3 binormal = vec3(0.0, 0.0, 1.0)
    + g0.binormal + g1.binormal + g2.binormal + g3.binormal;

  // ── Object-driven ripples ─────────────────────────────────────────────
  // Each floating object creates radial circular waves from its position
  for (int i = 0; i < 4; i++) {
    float d   = length(p.xz - uObjPos[i]);
    float env = exp(-d * d * 0.38);                      // Gaussian falloff
    float rip = sin(d * 4.2 - uTime * 1.9 + float(i) * 1.1) * 0.075;
    p.y += rip * uObjStrength[i] * env;
  }

  vNormal   = normalize(cross(binormal, tangent));
  vWorldPos = p;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
