precision highp float;

uniform float uTime;
uniform float uAudioLevel;
uniform vec3  uSunDir;
uniform vec3  uSunColor;
uniform vec3  uWaterColor;
uniform vec3  uCameraPos;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;

float fresnel(vec3 viewDir, vec3 normal, float f0) {
  float cosT = clamp(dot(viewDir, normal), 0.0, 1.0);
  return f0 + (1.0 - f0) * pow(1.0 - cosT, 5.0);
}

// Micro-ripple detail noise
vec2 hash2(vec2 p) {
  p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
  return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.0-2.0*f);
  return mix(mix(dot(hash2(i),f),dot(hash2(i+vec2(1,0)),f-vec2(1,0)),u.x),
             mix(dot(hash2(i+vec2(0,1)),f-vec2(0,1)),dot(hash2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);
}

void main() {
  vec3 N       = normalize(vNormal);
  vec3 viewDir = normalize(uCameraPos - vWorldPos);

  // Micro-normal for small ripple detail
  float mn1 = noise(vUv*8.0 + uTime*0.4);
  float mn2 = noise(vUv*15.0 - uTime*0.5);
  N = normalize(N + vec3(mn1*0.03, 0.0, mn2*0.03));

  // ── Specular ─────────────────────────────────────────────────────────────
  // From top-down, specular appears on tilted wave faces
  vec3  reflDir = reflect(-uSunDir, N);
  float spec    = pow(max(dot(reflDir, viewDir), 0.0), 220.0) * 2.5;
  float spec2   = pow(max(dot(reflDir, viewDir), 0.0), 45.0)  * 0.06;
  vec3  specular = uSunColor * (spec + spec2);

  // ── Fresnel ───────────────────────────────────────────────────────────────
  // From directly above, Fresnel ≈ 0 (camera ~parallel to normal)
  // Only tilted faces (wave slopes) show significant reflection
  float F = fresnel(viewDir, N, 0.015);

  // ── Water tint ────────────────────────────────────────────────────────────
  // Thin water layer — mostly transparent, cool aqua tint
  float audioBoost = uAudioLevel * 0.25;
  vec3  waterTint = uWaterColor * (0.55 + audioBoost);

  // ── Compose ───────────────────────────────────────────────────────────────
  vec3 color = mix(waterTint, vec3(0.82, 0.91, 0.96), F * 0.4) + specular;

  // Alpha: mostly transparent from directly above.
  // Only wave slopes (high F) and specular peaks add opacity.
  float alpha = 0.12 + F * 0.35 + clamp(spec, 0.0, 0.5);
  alpha = clamp(alpha, 0.08, 0.72);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), alpha);
}
