import * as THREE from 'three';

// Project metadata – add more entries here as the portfolio grows
export const PROJECTS = [
  {
    id: 'playground',
    name: 'PLAYGROUND',
    conf: '94',
    sub: 'touch × sand  ·  physical computing',
    rx: -3.2, rz: -1.2,
  },
  {
    id: 'chorus',
    name: 'CHORUS',
    conf: '88',
    sub: 'light × sound  ·  interactive installation',
    rx:  2.8, rz: -2.0,
  },
  {
    id: 'sendlove',
    name: 'SEND LOVE',
    conf: '96',
    sub: 'voice waveform  ·  acrylic sculpture',
    rx: -1.0, rz:  2.2,
  },
  {
    id: 'iml',
    name: 'IML WORKSTATION',
    conf: '91',
    sub: 'sound → motion graphics  ·  WebGL + ML',
    rx:  3.4, rz:  1.6,
  },
];

// Build placeholder meshes. Replace geometry/material per project as artwork is ready.
export function buildObjects(scene) {
  const meshes = [];

  PROJECTS.forEach((p) => {
    let mesh;

    if (p.id === 'playground') {
      // Sandy oval stone
      const geo  = new THREE.SphereGeometry(0.55, 32, 16);
      geo.scale(1.6, 0.55, 1.1);
      const mat  = new THREE.MeshStandardMaterial({
        color: 0xc8a882, roughness: 0.85, metalness: 0.0,
      });
      mesh = new THREE.Mesh(geo, mat);
    }

    else if (p.id === 'chorus') {
      // Four dark rectangular pipes grouped
      const group = new THREE.Group();
      [-0.3, -0.1, 0.1, 0.3].forEach((xOff, i) => {
        const h   = 0.7 + i * 0.08;
        const geo = new THREE.BoxGeometry(0.14, h, 0.14);
        const mat = new THREE.MeshStandardMaterial({
          color: 0x1a1a22, roughness: 0.7, metalness: 0.25,
        });
        const m = new THREE.Mesh(geo, mat);
        m.position.x = xOff;
        group.add(m);
      });
      mesh = group;
    }

    else if (p.id === 'sendlove') {
      // Stacked thin acrylic slabs
      const group = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const geo = new THREE.BoxGeometry(1.1, 0.06, 0.38);
        const mat = new THREE.MeshPhysicalMaterial({
          color: 0xd0e8f0,
          transmission: 0.75,
          opacity: 0.7,
          transparent: true,
          roughness: 0.05,
          thickness: 0.3,
          ior: 1.48,
        });
        const m = new THREE.Mesh(geo, mat);
        m.position.y = i * 0.085 - 0.17;
        m.rotation.z = Math.sin(i * 0.6) * 0.08;
        group.add(m);
      }
      mesh = group;
    }

    else if (p.id === 'iml') {
      // Sphere with emissive rings
      const group = new THREE.Group();
      const geo  = new THREE.SphereGeometry(0.42, 32, 32);
      const mat  = new THREE.MeshPhysicalMaterial({
        color: 0x4a9fba, roughness: 0.15, metalness: 0.1,
        transmission: 0.4, thickness: 1.0,
      });
      group.add(new THREE.Mesh(geo, mat));

      // Orbit rings
      [0, Math.PI / 3, Math.PI * 2 / 3].forEach((rot) => {
        const rGeo = new THREE.TorusGeometry(0.55, 0.018, 8, 64);
        const rMat = new THREE.MeshStandardMaterial({ color: 0x88d4e8, roughness: 0.4 });
        const r = new THREE.Mesh(rGeo, rMat);
        r.rotation.x = Math.PI / 2;
        r.rotation.y = rot;
        group.add(r);
      });
      mesh = group;
    }

    // Enable shadow casting on every mesh/child
    mesh.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = false; } });

    mesh.position.set(p.rx, 0.18, p.rz);
    mesh.userData = { project: p, bobPhase: Math.random() * Math.PI * 2 };
    scene.add(mesh);
    meshes.push(mesh);
  });

  return meshes;
}

// Called every frame – gentle bobbing on the water surface
export function animateObjects(meshes, time) {
  meshes.forEach((m) => {
    const { bobPhase } = m.userData;
    m.position.y = 0.15 + Math.sin(time * 0.7 + bobPhase) * 0.06;
    m.rotation.y += 0.002;
  });
}
