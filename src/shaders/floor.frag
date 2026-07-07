precision highp float;

uniform float uTime;
uniform float uAudioLevel;
uniform vec3  uSunDir;
uniform vec2  uObjPos[9];
uniform float uObjRx[9];    // shadow ellipse semi-axis in object local X
uniform float uObjRz[9];    // shadow ellipse semi-axis in object local Z
uniform float uObjAngle[9]; // object rotation.y — rotates the ellipse with the object

varying vec2 vUv;
varying vec2 vWorldXZ;

// ─── 2-D Simplex Noise ────────────────────────────────────────────────────────
vec3 _p3(vec3 x) { return x - floor(x*(1.0/289.0))*289.0; }
vec2 _p2(vec2 x) { return x - floor(x*(1.0/289.0))*289.0; }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                      -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1  = (x0.x > x0.y) ? vec2(1,0) : vec2(0,1);
  vec4 x12 = x0.xyxy + C.xxzz; x12.xy -= i1;
  i = _p2(i);
  vec3 p = _p3(_p3(i.y + vec3(0.0,i1.y,1.0)) + i.x + vec3(0.0,i1.x,1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)), 0.0);
  m = m*m*m*m;
  vec3 x  = 2.0*fract(p*C.www) - 1.0;
  vec3 h  = abs(x) - 0.5;
  vec3 a0 = x - floor(x+0.5);
  m *= 1.79284291400159 - 0.85373472095314*(a0*a0+h*h);
  vec3 g = vec3(a0.x*x0.x+h.x*x0.y, a0.yz*x12.xz+h.yz*x12.yw);
  return 130.0 * dot(m, g);
}

// ─── Pool caustic ─────────────────────────────────────────────────────────────
float poolCaustic(vec2 p, float t) {
  float audioBoost = 1.0 + uAudioLevel * 1.4;
  float wx = snoise(p * 0.22 + vec2(t*0.05, 1.30));
  float wz = snoise(p * 0.22 + vec2(2.80, t*0.04));
  vec2 wp  = p + vec2(wx, wz) * 0.85;
  float n1 = snoise(wp * 0.32 + vec2( t*0.16, t*0.07));
  float n2 = snoise(wp * 0.39 + vec2(-t*0.11, t*0.21) + vec2(3.71, 1.97));
  float c   = pow(max(0.0, n1 * n2), 2.2) * 4.0;
  float env = 0.55 + 0.45 * snoise(p * 0.14 + vec2(t*0.06, t*0.04));
  return c * max(0.3, env) * audioBoost;
}

// ─── Wave height (mirrors water.vert, large waves only) ───────────────────────
float waveHeight(vec2 pos, float t, float boost) {
  float y = 0.0;
  y += 0.060 * sin( 1.16*pos.x + 0.82*pos.y - 1.40*t);
  y += 0.052 * sin(-0.88*pos.x + 1.02*pos.y - 1.20*t);
  y += 0.048 * sin( 0.56*pos.x - 1.24*pos.y - 1.10*t);
  y += 0.040 * sin(-1.30*pos.x - 0.62*pos.y - 1.55*t);
  return y * boost;
}

// ─── Wave gradient for refraction UV warp ────────────────────────────────────
vec2 waveGrad(vec2 pos, float t, float boost) {
  float gx=0.0, gz=0.0, c;
  c=cos( 1.16*pos.x+ 0.82*pos.y-1.40*t); gx+=0.060* 1.16*c; gz+=0.060* 0.82*c;
  c=cos(-0.88*pos.x+ 1.02*pos.y-1.20*t); gx+=0.052*-0.88*c; gz+=0.052* 1.02*c;
  c=cos( 0.56*pos.x-1.24*pos.y-1.10*t);  gx+=0.048* 0.56*c; gz+=0.048*-1.24*c;
  c=cos(-1.30*pos.x-0.62*pos.y-1.55*t);  gx+=0.040*-1.30*c; gz+=0.040*-0.62*c;
  c=cos( 2.82*pos.x+1.95*pos.y-2.50*t);  gx+=0.022* 2.82*c; gz+=0.022* 1.95*c;
  c=cos(-2.10*pos.x+2.80*pos.y-2.80*t);  gx+=0.018*-2.10*c; gz+=0.018* 2.80*c;
  c=cos( 1.68*pos.x-3.20*pos.y-2.30*t);  gx+=0.016* 1.68*c; gz+=0.016*-3.20*c;
  c=cos(-3.45*pos.x-1.80*pos.y-3.10*t);  gx+=0.014*-3.45*c; gz+=0.014*-1.80*c;
  return vec2(gx, gz) * boost;
}

// ─── Tile grid (world-space so tiles stay square on any plane size) ──────────
float tileGrid(vec2 world, float lw) {
  vec2 p = fract(world * 0.9545);   // ≈1.05 world units per tile
  return 1.0 - smoothstep(0.0, lw, min(min(p.x, 1.0-p.x), min(p.y, 1.0-p.y)));
}

void main() {
  float t     = uTime;
  float boost = 1.0 + uAudioLevel * 3.5;

  // ── Refraction: tile wobble through 0.8m of water (world units) ──────────
  // 1.4 world units ≈ 0.065 in old UV space — clear pool-water distortion.
  vec2 refractW = vWorldXZ + waveGrad(vWorldXZ, t, boost) * 1.4;

  // ── Pool tile — pink tiles seen THROUGH teal pool water ──────────────────
  vec3 tileBase  = vec3(0.62, 0.80, 0.80);
  vec3 tileGrout = vec3(0.44, 0.62, 0.65);
  vec3 floorCol  = mix(tileBase, tileGrout, tileGrid(refractW, 0.048));

  // ── Caustic light blobs — white-pink shimmer ──────────────────────────────
  float cv = poolCaustic(vWorldXZ, t);
  vec3 causticCol = vec3(1.00, 0.92, 0.94) * clamp(cv, 0.0, 1.0) * 0.60;

  // ── Wave-depth darkening ───────────────────────────────────────────────────
  float wh          = waveHeight(vWorldXZ, t, boost);
  float depthShadow = 1.0 - wh * 0.30;
  floorCol   *= depthShadow;
  causticCol *= depthShadow;

  // ── Per-object elliptical shadows (shape-correct, rotate with object) ──────
  // Sun at (2,14,3); object height ≈ 0.18, floor at -0.80 → depth 0.98
  float poolShadow = 1.0;
  {
    vec3 sun = normalize(vec3(2.0, 14.0, 3.0));
    vec2 off = -vec2(sun.x, sun.z) / sun.y * 0.98;
    for (int i = 0; i < 9; i++) {
      vec2  sc  = uObjPos[i] + off;          // shadow centre on floor
      vec2  rel = vWorldXZ - sc;

      // Rotate rel into object's local XZ frame (inverse of rotation.y)
      float ca = cos(uObjAngle[i]);
      float sa = sin(uObjAngle[i]);
      float lx =  rel.x * ca + rel.y * sa;
      float lz = -rel.x * sa + rel.y * ca;

      // Elliptical distance: 1.0 at the shadow edge
      float rx = uObjRx[i];
      float rz = uObjRz[i];
      float d  = sqrt((lx/rx)*(lx/rx) + (lz/rz)*(lz/rz));

      // Soft penumbra from d=0.7 (full shadow) to d=1.6 (no shadow)
      float s  = 1.0 - smoothstep(0.7, 1.6, d);
      poolShadow = min(poolShadow, 1.0 - s * 0.32);
    }
  }
  floorCol   *= poolShadow;
  causticCol *= (poolShadow * 0.55 + 0.45);

  // ── Edge vignette ─────────────────────────────────────────────────────────
  float edge  = 1.0 - length(vUv - 0.5) * 0.50;
  floorCol   *= 0.82 + edge * 0.25;

  gl_FragColor = vec4(clamp(floorCol + causticCol, 0.0, 1.0), 1.0);
}
