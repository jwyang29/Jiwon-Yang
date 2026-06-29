varying vec2 vUv;
varying vec2 vWorldXZ; // world-space XZ for physics-based caustics

void main() {
  vUv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldXZ = worldPos.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
