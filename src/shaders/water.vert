precision highp float;

uniform float uTime;
uniform float uAudioLevel;
uniform float uSwell;
uniform vec2  uRipPos[28];
uniform vec2  uRipDir[28];
uniform float uRipTime[28];
uniform float uRipAmp[28];
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
  // The plane is rotated into the XZ plane on the mesh, so its local Z is 0 for
  // every vertex: sampling the waves in local space would make them a function
  // of X alone, and the surface would come out as ridges running down the pool.
  vec4 wpos   = modelMatrix * vec4(position, 1.0);
  vec2 pos    = wpos.xz;
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
  // Eight overlapping swells; more than this and the surface reads as busy noise.
  // uSwell is the resting swell; the mic adds to it rather than
  // scaling it, so silence can be perfectly still and sound still moves water
  y *= (uSwell + uAudioLevel * 0.9);

  // Object-driven radial ripples (Y-only)
  for (int i = 0; i < 9; i++) {
    float d   = length(pos - uObjPos[i]);
    float env = exp(-d * d * 0.45);
    float rip = sin(d * 3.8 - t * 1.8 + float(i) * 1.3) * 0.055;
    y += rip * uObjStrength[i] * env;
  }


  // Cursor ripples — a ring is born where the pointer crossed the water and
  // travels outward, fading with age. `fr` is the distance ahead of the front.
  for (int i = 0; i < 28; i++) {
    if (uRipAmp[i] <= 0.0) continue;
    float age = t - uRipTime[i];
    if (age < 0.0 || age > 3.0) continue;
    // sh runs 0..1 with the speed the ring was born at and carries wavelength,
    // packing, lifetime and depth together: broad, shallow and slow to fade when
    // the cursor crawls; tight, deep and short-lived when it flicks.
    // Kept identical in floor.frag's waveHeight and waveGrad.
    float amp = uRipAmp[i];
    float sh  = clamp(amp / 1.6, 0.0, 1.0);
    // Measuring the radius in a frame stretched along the direction of travel
    // turns the ring into an ellipse pointing the way the cursor went, and the
    // per-slot phase lumps its edge. Without these every ripple is the same
    // perfect circle and the pool looks stamped rather than disturbed.
    vec2  dr   = pos - uRipPos[i];
    vec2  dir  = uRipDir[i];
    vec2  perp = vec2(-dir.y, dir.x);
    float st   = mix(1.25, 1.95, sh);
    vec2  q    = vec2(dot(dr, dir) / st, dot(dr, perp));
    float d    = length(q);
    if (d < 0.001) continue;
    vec2  nd   = q / d;
    float ph   = float(i) * 2.399;
    float wob  = sin(nd.x * 3.1 + ph) + sin(nd.y * 2.6 - ph * 1.7);
    float fr   = d - age * 1.9 + wob * 0.085;
    float k   = mix(4.2, 10.5, sh);
    float w   = mix(1.1,  3.6, sh);
    float dec = mix(1.05, 1.70, sh);
    y += sin(fr * k) * exp(-fr * fr * w) * exp(-age * dec) * amp * 0.105;
  }

  wpos.y   += y;                 // displace in world Y, whatever the mesh rotation
  vWorldPos = wpos.xyz;

  // Normal is NOT interpolated from vertices — computed per-pixel in water.frag
  // to eliminate triangle-edge interpolation artifacts (tearing).
  gl_Position = projectionMatrix * viewMatrix * wpos;
}
