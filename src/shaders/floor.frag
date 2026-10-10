precision highp float;

uniform float uTime;
uniform float uAudioLevel;
uniform vec3  uSunDir;
uniform float uSwell;
uniform vec3  uTileBase;    // sRGB fractions, see the note in main()
uniform vec3  uTileGrout;
uniform vec3  uDriftCool;   // broad fields the navy drifts toward
uniform vec3  uDriftWarm;
uniform vec3  uDriftMix;    // x cool amount, y warm amount, z warm cutoff
uniform vec2  uRipPos[28];
uniform float uRipTime[28];
uniform float uRipAmp[28];
uniform vec2  uObjPos[9];
uniform float uObjRx[9];    // shadow ellipse semi-axis in object local X
uniform float uObjRz[9];    // shadow ellipse semi-axis in object local Z
uniform float uObjAngle[9]; // object rotation.y — rotates the ellipse with the object

varying vec2 vUv;
varying vec2 vWorldXZ;

// ─── Wave height (mirrors water.vert, large waves only) ───────────────────────
float waveHeight(vec2 pos, float t, float boost) {
  float y = 0.0;
  y += 0.060 * sin( 1.16*pos.x + 0.82*pos.y - 1.40*t);
  y += 0.052 * sin(-0.88*pos.x + 1.02*pos.y - 1.20*t);
  y += 0.048 * sin( 0.56*pos.x - 1.24*pos.y - 1.10*t);
  y += 0.040 * sin(-1.30*pos.x - 0.62*pos.y - 1.55*t);
  // uSwell is the resting swell; the mic adds to it rather than
  // scaling it, so silence can be perfectly still and sound still moves water
  y *= (uSwell + uAudioLevel * 0.9);

  // Cursor ripples — a ring is born where the pointer crossed the water and
  // travels outward, fading with age. `fr` is the distance ahead of the front.
  for (int i = 0; i < 28; i++) {
    if (uRipAmp[i] <= 0.0) continue;
    float age = t - uRipTime[i];
    if (age < 0.0 || age > 3.0) continue;
    float d  = length(pos - uRipPos[i]);
    float fr = d - age * 1.9;
    y += sin(fr * 7.0) * exp(-fr * fr * 2.2) * exp(-age * 1.35) * uRipAmp[i] * 0.095;
  }
  return y;
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
  // uSwell is the resting swell; the mic adds to it rather than
  // scaling it, so silence can be perfectly still and sound still moves water
  gx *= (uSwell + uAudioLevel * 0.9);
  gz *= (uSwell + uAudioLevel * 0.9);

  // Matching gradient for the cursor rings: d/dd of the height term above,
  // projected onto the radial direction.
  for (int i = 0; i < 28; i++) {
    if (uRipAmp[i] <= 0.0) continue;
    float age = t - uRipTime[i];
    if (age < 0.0 || age > 3.0) continue;
    vec2  dr = pos - uRipPos[i];
    float d  = length(dr);
    if (d < 0.001) continue;
    float fr = d - age * 1.9;
    float e  = exp(-fr * fr * 2.2) * exp(-age * 1.35) * uRipAmp[i] * 0.095;
    float df = e * (7.0 * cos(fr * 7.0) - 4.4 * fr * sin(fr * 7.0));
    gx += df * dr.x / d;
    gz += df * dr.y / d;
  }
  return vec2(gx, gz);
}

// ─── Value noise for the slow colour drift ───────────────────────────────────
// Trig-free hash, same reason as water.frag: fract(sin(dot(...))) loses its low
// bits out at the far end of a 112-unit pool and the field collapses into
// stripes, which here would read as banding across the floor.
vec2 _h2(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return -1.0 + 2.0 * fract((p3.xx + p3.yz) * p3.zy);
}
float gnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f*f*f*(f*(f*6.0-15.0)+10.0);
  return mix(mix(dot(_h2(i),f),                   dot(_h2(i+vec2(1,0)),f-vec2(1,0)),u.x),
             mix(dot(_h2(i+vec2(0,1)),f-vec2(0,1)),dot(_h2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y);
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

  // ── Pool tile ─────────────────────────────────────────────────────────────
  // uTileBase and uTileGrout arrive as sRGB fractions, not linear: this shader
  // writes gl_FragColor without <colorspace_fragment>, so what it outputs lands
  // in the framebuffer unconverted. Feeding it linear values makes the pool
  // come out near-black. Both are set from POOL in main.js.
  vec3 floorCol = mix(uTileBase, uTileGrout, tileGrid(refractW, 0.048));

  // ── Slow colour drift ─────────────────────────────────────────────────────
  // Flat navy is the thing being fixed here. Two low-frequency fields pull the
  // tile toward a cooler and a warmer blue in wide, soft patches. The scales
  // are deliberately far apart (about 18 and 26 world units per feature) so the
  // two never line up into a repeating pattern, and they crawl rather than
  // animate: at these speeds a patch takes most of a minute to cross a tile,
  // which reads as the body of water rather than as something moving on it.
  // Two octaves each. One octave alone gives a single smooth blob that fills
  // the whole frame and reads as a flat shift; the second, at a little over
  // twice the frequency and a third of the weight, breaks the edge up without
  // turning it into texture.
  vec2 dp = vWorldXZ;
  float cool = gnoise(dp * 0.105 + vec2( t * 0.013, -t * 0.009))
             + gnoise(dp * 0.240 + vec2(-t * 0.021,  t * 0.015)) * 0.34;
  float warm = gnoise(dp * 0.082 + vec2(-t * 0.011,  t * 0.016) + 31.7)
             + gnoise(dp * 0.190 + vec2( t * 0.018,  t * 0.012) + 11.3) * 0.34;
  cool /= 1.34;
  warm /= 1.34;

  // Narrow windows on purpose. Value noise is bell shaped around the middle,
  // so a wide smoothstep spends most of its range on values that never occur
  // and the field comes out as a near constant half mix. Mapping roughly the
  // middle third to the full 0 to 1 is what makes the patches actually swing.
  // The cool field is the common case and carries most of the weight; the warm
  // one starts above centre so it only surfaces at the peaks, the way the gold
  // sits in a few bands of the reference rather than everywhere.
  floorCol = mix(floorCol, uDriftCool,
                 smoothstep(0.30, 0.70, cool * 0.5 + 0.5) * uDriftMix.x);
  floorCol = mix(floorCol, uDriftWarm,
                 smoothstep(uDriftMix.z, uDriftMix.z + 0.13, warm * 0.5 + 0.5) * uDriftMix.y);

  // ── Wave-depth darkening — only a ripple reaches this now ─────────────────
  float wh = waveHeight(vWorldXZ, t, boost);
  floorCol *= 1.0 - wh * 0.30;

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
  floorCol *= poolShadow;

  // ── Edge vignette — deeper, for the dusk mood ─────────────────────────────
  float edge = 1.0 - length(vUv - 0.5) * 0.72;
  floorCol  *= 0.66 + edge * 0.34;

  gl_FragColor = vec4(clamp(floorCol, 0.0, 1.0), 1.0);
}
