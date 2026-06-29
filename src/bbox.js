import { Box3, Vector3 } from 'three';

// Manages the HTML bounding-box overlay (YOLO-style, pink #FF6B9D)
export class BBoxOverlay {
  constructor() {
    this._el    = document.getElementById('bbox');
    this._label = document.getElementById('bbox-label');
    this._sub   = document.getElementById('bbox-sub');
  }

  show(project, screenRect) {
    if (!project) { this.hide(); return; }

    const pad = 18;
    this._el.style.left   = (screenRect.left   - pad) + 'px';
    this._el.style.top    = (screenRect.top    - pad) + 'px';
    this._el.style.width  = (screenRect.width  + pad * 2) + 'px';
    this._el.style.height = (screenRect.height + pad * 2) + 'px';

    this._label.textContent = `${project.name}  ${project.conf}%`;
    this._sub.textContent   = project.sub;
    this._el.classList.add('visible');
  }

  hide() {
    this._el.classList.remove('visible');
  }
}

// Projects 3D bounding box onto 2D screen rect (CSS pixels)
export function worldToScreenRect(mesh, camera, canvasEl) {
  const box = new Box3().setFromObject(mesh);
  const w   = canvasEl.clientWidth;
  const h   = canvasEl.clientHeight;

  const corners = [
    new Vector3(box.min.x, box.min.y, box.min.z),
    new Vector3(box.min.x, box.min.y, box.max.z),
    new Vector3(box.min.x, box.max.y, box.min.z),
    new Vector3(box.min.x, box.max.y, box.max.z),
    new Vector3(box.max.x, box.min.y, box.min.z),
    new Vector3(box.max.x, box.min.y, box.max.z),
    new Vector3(box.max.x, box.max.y, box.min.z),
    new Vector3(box.max.x, box.max.y, box.max.z),
  ];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  corners.forEach((v) => {
    v.project(camera);
    const sx =  v.x * 0.5 * w + w * 0.5;
    const sy = -v.y * 0.5 * h + h * 0.5;
    if (sx < minX) minX = sx;
    if (sx > maxX) maxX = sx;
    if (sy < minY) minY = sy;
    if (sy > maxY) maxY = sy;
  });

  return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
}
