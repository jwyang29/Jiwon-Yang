import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ─── Projects (career-ranked order → pool position top to bottom) ─────────────
// Each project loads `public/models/<id>.glb`; if the file is missing a
// procedural fallback object is built instead.
export const PROJECTS = [
  {
    id: 'playground',
    name: 'PLAYGROUND',
    conf: '94',
    sub: 'touch × sand  ·  physical computing',
    rx: -2.7, rz: -2.6,
    rippleStrength: 0.8,
    shadowRx: 0.90, shadowRz: 0.62,
  },
  {
    id: 'chorus',
    name: 'CHORUS',
    conf: '88',
    sub: 'light × sound  ·  interactive installation',
    rx:  2.4, rz: -3.0,
    rippleStrength: 0.5,
    shadowRx: 0.65, shadowRz: 0.11,
  },
  {
    id: 'sendlove',
    name: 'SEND LOVE',
    conf: '96',
    sub: 'voice waveform  ·  acrylic sculpture',
    rx: -0.9, rz:  4.0,
    rippleStrength: 0.4,
    shadowRx: 0.58, shadowRz: 0.22,
  },
  {
    id: 'cocoon',
    name: 'COCOON',
    conf: '92',
    sub: 'breathing motion  ·  interactive lighting',
    rx:  2.7, rz:  2.6,
    rippleStrength: 0.6,
    shadowRx: 0.55, shadowRz: 0.55,
  },
  {
    id: 'foldit',
    name: 'FOLDIT',
    conf: '89',
    sub: 'origami × AI detection  ·  mobile game',
    rx: -2.9, rz:  6.4,
    rippleStrength: 0.5,
    shadowRx: 0.55, shadowRz: 0.55,
  },
  {
    id: 'tidepool',
    name: 'TIDEPOOL',
    conf: '90',
    sub: 'clicker diorama  ·  AR fish keeping',
    rx:  2.2, rz:  7.6,
    rippleStrength: 0.7,
    shadowRx: 0.60, shadowRz: 0.60,
  },
  {
    id: 'silhouette',
    name: 'SILHOUETTE SERIES',
    conf: '87',
    sub: 'AUD + VIB  ·  fidget puzzle toys',
    rx: -0.5, rz:  9.8,
    rippleStrength: 0.45,
    shadowRx: 0.75, shadowRz: 0.40,
  },
  {
    id: 'bubblelink',
    name: 'BUBBLELINK',
    conf: '85',
    sub: 'NFC message bubble  ·  keyring',
    rx:  2.5, rz: 11.6,
    rippleStrength: 0.4,
    shadowRx: 0.50, shadowRz: 0.45,
  },
  {
    id: 'graphics',
    name: 'GRAPHIC WORKS',
    conf: '83',
    sub: 'selected small projects  ·  print & digital',
    rx: -2.4, rz: 13.0,
    rippleStrength: 0.35,
    shadowRx: 0.60, shadowRz: 0.45,
  },
  {
    id: 'wip',
    name: 'WORK IN PROGRESS',
    conf: '···',
    sub: 'currently swimming  ·  ongoing experiments',
    rx:  1.6, rz: 15.6,
    rippleStrength: 1.0,
    shadowRx: 0.60, shadowRz: 0.60,
    spin: 0.02,            // the whirlpool spins visibly faster
  },
];

// ─── Procedural fallbacks (used when <id>.glb is missing) ─────────────────────
function buildFallback(id) {
  const g = new THREE.Group();

  if (id === 'playground') {
    const geo = new THREE.SphereGeometry(0.55, 32, 16);
    geo.scale(1.6, 0.55, 1.1);
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: 0xc8a882, roughness: 0.85,
    })));
  }

  else if (id === 'chorus') {
    [-0.3, -0.1, 0.1, 0.3].forEach((xOff, i) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.7 + i * 0.08, 0.14),
        new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.7, metalness: 0.25 }),
      );
      m.position.x = xOff;
      g.add(m);
    });
  }

  else if (id === 'sendlove') {
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.06, 0.38),
        new THREE.MeshPhysicalMaterial({
          color: 0xd0e8f0, transmission: 0.75, opacity: 0.7, transparent: true,
          roughness: 0.05, thickness: 0.3, ior: 1.48,
        }),
      );
      m.position.y = i * 0.085 - 0.17;
      m.rotation.z = Math.sin(i * 0.6) * 0.08;
      g.add(m);
    }
  }

  else if (id === 'cocoon') {
    // ribbed translucent cocoon lamp
    const geo = new THREE.SphereGeometry(0.5, 24, 18);
    geo.scale(0.85, 1.15, 0.85);
    g.add(new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      color: 0xfff4ec, transmission: 0.35, roughness: 0.55, thickness: 0.6,
      emissive: 0xffdcc2, emissiveIntensity: 0.35,
    })));
  }

  else if (id === 'foldit') {
    // folded-paper crane silhouette (angular cones)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xf5f0ea, roughness: 0.9, flatShading: true,
    });
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.5, 4), mat);
    body.rotation.y = Math.PI / 4;
    const wingL = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.65, 3), mat);
    wingL.position.set(-0.3, 0.12, 0);
    wingL.rotation.z =  0.9;
    const wingR = wingL.clone();
    wingR.position.x = 0.3;
    wingR.rotation.z = -0.9;
    g.add(body, wingL, wingR);
  }

  else if (id === 'tidepool') {
    // glass dome diorama on a wooden base
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.55, 0.16, 24),
      new THREE.MeshStandardMaterial({ color: 0x9a7b5c, roughness: 0.8 }),
    );
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhysicalMaterial({
        color: 0xeaf6f6, transmission: 0.85, roughness: 0.05,
        thickness: 0.2, transparent: true, opacity: 0.6,
      }),
    );
    dome.position.y = 0.08;
    const fish = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 12, 8),
      new THREE.MeshStandardMaterial({ color: 0xf291ad, roughness: 0.4 }),
    );
    fish.scale.set(1.5, 1, 0.8);
    fish.position.y = 0.22;
    g.add(base, dome, fish);
  }

  else if (id === 'silhouette') {
    // two fidget pucks: speaker-grille (AUD) + maze (VIB)
    const aud = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.14, 28),
      new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.6 }),
    );
    aud.position.x = -0.38;
    const vib = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.14, 28),
      new THREE.MeshStandardMaterial({ color: 0xf1ece4, roughness: 0.7 }),
    );
    vib.position.x = 0.38;
    g.add(aud, vib);
  }

  else if (id === 'bubblelink') {
    // glossy speech-bubble charm + ring
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 24, 18),
      new THREE.MeshPhysicalMaterial({
        color: 0x7fd8d2, roughness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.1,
      }),
    );
    bubble.scale.set(1.25, 1, 0.8);
    const tail = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.22, 4),
      bubble.material,
    );
    tail.position.set(-0.22, -0.3, 0);
    tail.rotation.z = 0.6;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.02, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xd8b24a, metalness: 0.9, roughness: 0.3 }),
    );
    ring.position.set(0.32, 0.3, 0);
    g.add(bubble, tail, ring);
  }

  else if (id === 'wip') {
    // whirlpool swirl — two spiral arms descending into the water
    const pts = [];
    const turns = 2.5;
    for (let t = 0; t <= 1.001; t += 0.02) {
      const a = t * turns * Math.PI * 2;
      const r = 0.55 * (1 - t * 0.82);
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0.22 - t * 0.40, Math.sin(a) * r));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const armGeo = new THREE.TubeGeometry(curve, 120, 0.055, 10, false);
    const armA = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({
      color: 0x2ab5ab, roughness: 0.35, metalness: 0.1,
    }));
    const armB = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.5,
    }));
    armB.rotation.y = Math.PI;
    g.add(armA, armB);
  }

  else if (id === 'graphics') {
    // fanned stack of thin poster sheets
    const tones = [0xf2e9dd, 0xf291ad, 0x7fc8c8, 0xe3bc2f, 0xf5f0ea];
    tones.forEach((c, i) => {
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 0.02, 0.62),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }),
      );
      m.position.y = i * 0.035;
      m.rotation.y = (i - 2) * 0.16;
      g.add(m);
    });
  }

  else {
    g.add(new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.4, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.8 }),
    ));
  }

  return g;
}

// ─── Normalize a loaded GLB: uniform scale, center, sit on the water ─────────
function normalizeModel(model, targetSize = 1.56) {   // 1.95 × 0.8 ≈ 1.56
  const box  = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  model.scale.setScalar(targetSize / maxDim);

  // re-measure after scaling, then center XZ and rest just below the surface
  box.setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y + 0.10;   // bottom sits ~0.10 under group origin

  // footprint half-extents → used for the procedural floor shadow
  return {
    rx: Math.max(0.2, (box.max.x - box.min.x) / 2 * 0.9),
    rz: Math.max(0.2, (box.max.z - box.min.z) / 2 * 0.9),
  };
}

// ─── Build all floating objects ───────────────────────────────────────────────
// onFootprint(i, rx, rz) lets main.js update shadow-ellipse uniforms once a
// GLB's real bounding box is known.
export function buildObjects(scene, onFootprint) {
  const loader = new GLTFLoader();
  const base   = import.meta.env.BASE_URL || '/';
  const meshes = [];

  PROJECTS.forEach((p, i) => {
    const group = new THREE.Group();

    // Invisible oversized hit sphere — big touch target (raycaster still
    // tests invisible meshes).
    const hitProxy = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 8, 8),
      new THREE.MeshBasicMaterial(),
    );
    hitProxy.visible = false;
    group.add(hitProxy);

    loader.load(
      `${base}models/${p.id}.glb`,
      (gltf) => {
        const model = gltf.scene;
        // Upward tilt so the object's face angles toward the camera
        // (chorus stays upright — its pipes should point straight up;
        //  playground/cocoon/foldit get a stronger tilt)
        const strongTilt = ['playground', 'cocoon', 'foldit'];
        if (p.id !== 'chorus') {
          model.rotation.x = strongTilt.includes(p.id) ? -0.85 : -0.32;
        }
        const fp = normalizeModel(model);
        model.traverse((c) => { if (c.isMesh) c.castShadow = true; });
        group.add(model);
        if (onFootprint) onFootprint(i, fp.rx, fp.rz);
      },
      undefined,
      () => {
        // GLB missing → procedural fallback (same size-up as GLBs)
        const fb = buildFallback(p.id);
        fb.scale.setScalar(1.35);   // 1.69 × 0.8
        fb.traverse((c) => { if (c.isMesh) c.castShadow = true; });
        group.add(fb);
      },
    );

    group.position.set(p.rx, 0.18, p.rz);
    group.userData = {
      project: p,
      bobPhase:    Math.random() * Math.PI * 2,
      driftFreqX:  0.10 + Math.random() * 0.05,
      driftFreqZ:  0.08 + Math.random() * 0.05,
      driftRadius: 0.35 + Math.random() * 0.20,
      rotSpeed:    p.spin ?? (Math.random() < 0.5 ? 1 : -1) * (0.0008 + Math.random() * 0.0012),
    };
    scene.add(group);
    meshes.push(group);
  });

  return meshes;
}

export function animateObjects(meshes, time) {
  meshes.forEach((m) => {
    const { bobPhase, driftFreqX, driftFreqZ, driftRadius, rotSpeed, project } = m.userData;
    m.position.x = project.rx + Math.sin(time * driftFreqX + bobPhase)        * driftRadius;
    m.position.z = project.rz + Math.cos(time * driftFreqZ + bobPhase * 1.37) * driftRadius;
    m.position.y = 0.15 + Math.sin(time * 0.7 + bobPhase) * 0.06;
    m.rotation.y += rotSpeed;
  });
}
