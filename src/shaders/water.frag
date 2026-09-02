precision highp float;

uniform float uTime;
uniform float uAudioLevel;
uniform vec3  uSunDir;
uniform vec3  uSunColor;
uniform vec3  uWaterColor;
uniform vec3  uCameraPos;
uniform vec2  uObjPos[9];
uniform float uObjStrength[9];

varying vec3 vWorldPos;
varying vec2 vUv;

// Value noise for micro-ripple normal detail.
// Trig-free hash: the usual fract(sin(dot(...))) one loses its low bits out at
// the far end of a 48-unit pool and the noise collapses into parallel stripes,
// which the specular then paints across the water as straight bright lines.
vec2 _h2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return -1.0 + 2.0 * fract((p3.xx + p3.yz) * p3.zy);
}
float gnoise(vec2 p) {
  // Quintic fade, not cubic: the glint mask below rides on a high-power
  // specular, which turns cubic's second-derivative break at each lattice line
  // into a visible straight crease drawn across the pool.
  vec2 i = floor(p), f = fract(p), u = f*f*f*(f*(f*6.0-15.0)+10.0);
  return mix(mix(dot(_h2(i),f),          dot(_h2(i+vec2(1,0)),f-vec2(1,0)),u.x),
             mix(dot(_h2(i+vec2(0,1)),f-vec2(0,1)),dot(_h2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);
}

// Compute exact wave gradient at this fragment's XZ position.
// Mirrors all addWaveY() calls in water.vert so the normal is physically correct.
void waveGradient(vec2 pos, float t, float boost,
                  out float gx, out float gz) {
  gx = 0.0; gz = 0.0;
  float c;
  c=cos( 1.16*pos.x+ 0.82*pos.y-1.40*t); gx+=0.060* 1.16*c; gz+=0.060* 0.82*c;
  c=cos(-0.88*pos.x+ 1.02*pos.y-1.20*t); gx+=0.052*-0.88*c; gz+=0.052* 1.02*c;
  c=cos( 0.56*pos.x-1.24*pos.y-1.10*t);  gx+=0.048* 0.56*c; gz+=0.048*-1.24*c;
  c=cos(-1.30*pos.x-0.62*pos.y-1.55*t);  gx+=0.040*-1.30*c; gz+=0.040*-0.62*c;
  c=cos( 2.82*pos.x+1.95*pos.y-2.50*t);  gx+=0.022* 2.82*c; gz+=0.022* 1.95*c;
  c=cos(-2.10*pos.x+2.80*pos.y-2.80*t);  gx+=0.018*-2.10*c; gz+=0.018* 2.80*c;
  c=cos( 1.68*pos.x-3.20*pos.y-2.30*t);  gx+=0.016* 1.68*c; gz+=0.016*-3.20*c;
  c=cos(-3.45*pos.x-1.80*pos.y-3.10*t);  gx+=0.014*-3.45*c; gz+=0.014*-1.80*c;
  gx *= boost;
  gz *= boost;

  // Object ripple gradient: ∂/∂r [A*sin(kr-ωt)*exp(-αr²)] × (unit radial vec)
  for (int i = 0; i < 9; i++) {
    vec2  dr  = pos - uObjPos[i];
    float r   = length(dr);
    if (r < 0.01) continue;
    vec2  dn  = dr / r;
    float env = exp(-r * r * 0.45);
    float ph  = r * 3.8 - t * 1.8 + float(i) * 1.3;
    float A   = 0.055 * uObjStrength[i];
    float dfdr = A * (cos(ph) * 3.8 - sin(ph) * 0.90 * r) * env;
    gx += dfdr * dn.x;
    gz += dfdr * dn.y;
  }
}

void main() {
  vec2  pos   = vWorldPos.xz;   // original XZ (Y-only displacement, XZ unchanged)
  float t     = uTime;
  float boost = 1.0 + uAudioLevel * 3.5;

  // ── Per-pixel normal (eliminates triangle-interpolation tearing) ─────────────
  float gx, gz;
  waveGradient(pos, t, boost, gx, gz);
  vec3 N = normalize(vec3(-gx, 1.0, -gz));

  // Fine micro-ripple texture on top of coarse wave normal. Keep the frequency
  // low enough that a ripple spans several pixels — finer than that it aliases
  // against the pixel grid and the specular beats it into bands.
  float n1 = gnoise(pos * 14.0 + t * 0.52) * 0.020;
  float n2 = gnoise(pos * 22.0 - t * 0.68) * 0.011;
  N = normalize(N + vec3(n1, 0.0, n2));

  vec3 V = normalize(uCameraPos - vWorldPos);

  // Fresnel — nearly zero directly overhead, rises on wave slopes
  float cosT = max(dot(N, V), 0.0);
  float F    = 0.02 + 0.98 * pow(1.0 - cosT, 5.0);

  // Narrow Blinn-Phong specular — pool sparkle, not broad streaks
  vec3  H    = normalize(uSunDir + V);
  float spec = pow(max(dot(N, H), 0.0), 340.0) * 0.90;

  // Deep navy dusk water, warmed where the low sun catches a slope
  vec3 tint = vec3(0.10, 0.27, 0.39) * (1.0 + uAudioLevel * 0.25);
  tint = mix(tint, vec3(0.48, 0.30, 0.15), F * 0.35);   // amber glance off crests

  vec3  color = mix(tint, uSunColor * 0.80, F * 0.20) + uSunColor * spec * 0.90;
  // Slightly denser than the summer water so the pool reads as deeper
  float alpha = 0.16 + F * 0.20 + min(spec * 0.28, 0.18);
  alpha = clamp(alpha, 0.10, 0.68);

  gl_FragColor = vec4(clamp(color, 0.0, 1.0), alpha);
}
