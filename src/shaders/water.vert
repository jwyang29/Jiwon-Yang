precision highp float;

uniform float uTime;
uniform float uAudioLevel;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;

#define PI 3.14159265358979323846

// Returns position offset + tangent/binormal contribution for normal
// Based on Tessendorf (2004) Gerstner wave formulation
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

  float boost = 1.0 + uAudioLevel * 3.5;

  // Four Gerstner waves in different directions
  GerstnerResult g0 = gerstner(vec2( 1.0,  0.4),  0.09 * boost, 4.8, p, uTime);
  GerstnerResult g1 = gerstner(vec2( 0.3,  1.0),  0.07 * boost, 3.5, p, uTime);
  GerstnerResult g2 = gerstner(vec2(-0.6,  0.7),  0.06 * boost, 3.0, p, uTime);
  GerstnerResult g3 = gerstner(vec2( 0.8, -0.4),  0.04 * boost, 5.8, p, uTime);

  p += g0.offset + g1.offset + g2.offset + g3.offset;

  // Accumulate tangent/binormal for normal reconstruction
  vec3 tangent  = vec3(1.0, 0.0, 0.0)
    + g0.tangent + g1.tangent + g2.tangent + g3.tangent;
  vec3 binormal = vec3(0.0, 0.0, 1.0)
    + g0.binormal + g1.binormal + g2.binormal + g3.binormal;

  vNormal   = normalize(cross(binormal, tangent));
  vWorldPos = p;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
