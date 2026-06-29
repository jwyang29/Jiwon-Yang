precision highp float;

uniform float uTime;
uniform float uAudioLevel;

uniform vec2  uObjPos[4];
uniform float uObjStrength[4];

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;

#define PI 3.14159265358979323846

// ── Gradient noise (Perlin-like) for breaking periodicity ─────────────────────
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
// 3-octave FBM — gives organic, non-repeating displacement
float fbm(vec2 p, float t) {
  return gnoise(p * 0.8  + t * 0.055) * 0.50
       + gnoise(p * 2.0  + t * 0.11)  * 0.30
       + gnoise(p * 4.5  + t * 0.18)  * 0.14
       + gnoise(p * 9.2  + t * 0.25)  * 0.06;
}

// ── Gerstner wave ─────────────────────────────────────────────────────────────
struct GerstnerResult { vec3 offset; vec3 tangent; vec3 binormal; };

GerstnerResult gerstner(vec2 dir, float steepness, float wavelength, vec3 p, float time) {
  float k  = 2.0 * PI / wavelength;
  float c  = sqrt(9.8 / k);
  vec2  d  = normalize(dir);
  float f  = k * (dot(d, p.xz) - c * time);
  float a  = steepness / k;
  GerstnerResult g;
  g.offset  = vec3(d.x * a * cos(f), a * sin(f), d.y * a * cos(f));
  float kA  = k * a;
  g.tangent  = vec3(-d.x * d.x * kA * sin(f),  d.x * kA * cos(f), -d.x * d.y * kA * sin(f));
  g.binormal = vec3(-d.x * d.y * kA * sin(f),  d.y * kA * cos(f), -d.y * d.y * kA * sin(f));
  return g;
}

void main() {
  vUv = uv;
  vec3 p    = position;
  vec2 orig = position.xz; // keep original XZ for noise (avoids feedback)

  float boost = 1.0 + uAudioLevel * 4.0;

  // Gerstner waves — balanced directions
  GerstnerResult g0 = gerstner(vec2( 0.7,  0.7),  0.13 * boost, 2.0, p, uTime);
  GerstnerResult g1 = gerstner(vec2(-0.5,  0.9),  0.10 * boost, 1.4, p, uTime);
  GerstnerResult g2 = gerstner(vec2(-0.8, -0.6),  0.09 * boost, 1.2, p, uTime);
  GerstnerResult g3 = gerstner(vec2( 0.4, -0.9),  0.08 * boost, 2.4, p, uTime);

  p += g0.offset + g1.offset + g2.offset + g3.offset;

  vec3 tangent  = vec3(1,0,0) + g0.tangent  + g1.tangent  + g2.tangent  + g3.tangent;
  vec3 binormal = vec3(0,0,1) + g0.binormal + g1.binormal + g2.binormal + g3.binormal;

  // ── FBM turbulence — breaks Gerstner's exact periodicity ─────────────────
  // Sampled from original XZ so noise pattern is anchored to world space
  float noiseAmp = (0.05 + uAudioLevel * 0.04) * boost;
  p.y += fbm(orig * 0.55, uTime) * noiseAmp;

  // Small XZ noise to prevent any straight-line artifacts from periodicity
  p.x += gnoise(orig * 1.1 + vec2(1.7, 4.3) + uTime * 0.06) * 0.018;
  p.z += gnoise(orig * 1.1 + vec2(7.2, 2.8) + uTime * 0.06) * 0.018;

  // ── Object-driven radial ripples ─────────────────────────────────────────
  for (int i = 0; i < 4; i++) {
    float d   = length(p.xz - uObjPos[i]);
    float env = exp(-d * d * 0.38);
    float rip = sin(d * 4.2 - uTime * 1.9 + float(i) * 1.1) * 0.06;
    p.y += rip * uObjStrength[i] * env;
  }

  vNormal   = normalize(cross(binormal, tangent));
  vWorldPos = p;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
