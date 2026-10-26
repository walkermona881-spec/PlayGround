import * as THREE from '../vendor/three.module.js';
import { TAU, PITCH, CROWD_COLORS, GEO, rand } from './data.js';
import { createBallTexture, makePitchTexture, makeAdTexture, makeNetTexture, makeScreenTexture, makeGlowTexture, makeCloudTexture } from './assets.js';

export function addSky(scene) {
  const uniforms = {
    top: { value: new THREE.Color(0x0a2647) },
    mid: { value: new THREE.Color(0x4d8fc7) },
    bottom: { value: new THREE.Color(0xf7c98b) },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(340, 32, 20),
    new THREE.ShaderMaterial({
      uniforms,
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader:
        'uniform vec3 top; uniform vec3 mid; uniform vec3 bottom; varying vec3 vPos;' +
        'void main(){ float h = normalize(vPos).y * 0.5 + 0.5;' +
        'vec3 col = mix(bottom, mid, smoothstep(0.02, 0.42, h));' +
        'col = mix(col, top, smoothstep(0.42, 0.98, h));' +
        'gl_FragColor = vec4(col, 1.0); }',
    })
  );
  scene.add(sky);

  const sunSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: makeGlowTexture(), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false })
  );
  sunSprite.position.set(165, 74, -215);
  sunSprite.scale.set(130, 130, 1);
  scene.add(sunSprite);

  const cloudTex = makeCloudTexture();
  for (let i = 0; i < 4; i++) {
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.55, depthWrite: false, fog: false }));
    const a = (i / 4) * TAU + 0.4;
    spr.position.set(Math.cos(a) * 240, rand(60, 105), Math.sin(a) * 240);
    spr.scale.set(rand(160, 240), rand(60, 90), 1);
    scene.add(spr);
  }
}

export function addLights(scene) {
  scene.add(new THREE.HemisphereLight(0xbfe0ff, 0x27452a, 0.72));
  scene.add(new THREE.AmbientLight(0x8fb4d0, 0.28));

  const sun = new THREE.DirectionalLight(0xffe1b3, 2.7);
  sun.position.set(74, 88, -58);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -82;
  sun.shadow.camera.right = 82;
  sun.shadow.camera.top = 88;
  sun.shadow.camera.bottom = -88;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 260;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.025;
  scene.add(sun);
  scene.add(sun.target);

  const rim = new THREE.DirectionalLight(0x9fc8ff, 0.5);
  rim.position.set(-60, 50, 70);
  scene.add(rim);

  const warm = new THREE.PointLight(0xfff0cf, 320, 150, 2);
  warm.position.set(-34, 27, 52);
  scene.add(warm);
  const warm2 = new THREE.PointLight(0xfff0cf, 320, 150, 2);
  warm2.position.set(34, 27, -52);
  scene.add(warm2);
  return sun;
}

export function addPitch(scene) {
  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH.halfW * 2 + 6, PITCH.halfL * 2 + 6),
    new THREE.MeshStandardMaterial({ map: makePitchTexture(), roughness: 0.96, metalness: 0 })
  );
  pitch.rotation.x = -Math.PI / 2;
  pitch.position.y = 0.02;
  pitch.receiveShadow = true;
  scene.add(pitch);

  const surround = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 320),
    new THREE.MeshStandardMaterial({ color: 0x173a23, roughness: 1 })
  );
  surround.rotation.x = -Math.PI / 2;
  surround.receiveShadow = true;
  scene.add(surround);

  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(98, 140),
    new THREE.MeshStandardMaterial({ color: 0x1b2c33, roughness: 1 })
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = 0.008;
  scene.add(apron);
}

function addStandStructure(scene, side, isEnd) {
  const group = new THREE.Group();
  const concrete = new THREE.MeshStandardMaterial({ color: 0x263744, roughness: 0.92 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15232d, roughness: 0.9 });
  const rows = isEnd ? 12 : 14;

  for (let r = 0; r < rows; r++) {
    const h = 1.1 + r * 0.56;
    if (isEnd) {
      const z = side * (60 + r * 1.15);
      const step = new THREE.Mesh(new THREE.BoxGeometry(74, h, 1.15), concrete);
      step.position.set(0, h / 2, z);
      step.receiveShadow = true;
      group.add(step);
    } else {
      const x = side * (43 + r * 1.15);
      const step = new THREE.Mesh(new THREE.BoxGeometry(1.15, h, 112), concrete);
      step.position.set(x, h / 2, 0);
      step.receiveShadow = true;
      group.add(step);
    }
  }

  const wall = new THREE.Mesh(
    isEnd ? new THREE.BoxGeometry(76, 1.5, 0.6) : new THREE.BoxGeometry(0.6, 1.5, 114),
    dark
  );
  if (isEnd) wall.position.set(0, 0.75, side * 59.2);
  else wall.position.set(side * 42.2, 0.75, 0);
  group.add(wall);

  const roof = new THREE.Mesh(
    isEnd ? new THREE.BoxGeometry(112, 0.6, 23) : new THREE.BoxGeometry(24, 0.6, 128),
    dark
  );
  if (isEnd) roof.position.set(0, 15.4, side * 68.5);
  else roof.position.set(side * 54.5, 15.4, 0);
  roof.castShadow = true;
  group.add(roof);

  const roofBand = new THREE.Mesh(
    isEnd ? new THREE.BoxGeometry(112, 0.16, 0.5) : new THREE.BoxGeometry(0.5, 0.16, 128),
    new THREE.MeshStandardMaterial({ color: 0xc6ff3d, emissive: 0xc6ff3d, emissiveIntensity: 1.6 })
  );
  if (isEnd) roofBand.position.set(0, 15.2, side * 57.2);
  else roofBand.position.set(side * 42.7, 15.2, 0);
  group.add(roofBand);

  const columns = isEnd ? [-34, -11, 11, 34] : [-52, -26, 0, 26, 52];
  for (const cPos of columns) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 15.2, 8), dark);
    if (isEnd) col.position.set(cPos, 7.6, side * 56.5);
    else col.position.set(side * 55.5, 7.6, cPos);
    col.castShadow = true;
    group.add(col);
  }

  scene.add(group);
}

function addCrowd(scene) {
  const pieces = [];
  const dummy = new THREE.Object3D();
  const rowsSide = 14;
  const rowsEnd = 12;

  for (const side of [-1, 1]) {
    for (let r = 0; r < rowsSide; r++) {
      const x = side * (43 + r * 1.15);
      const y = 1.1 + r * 0.56 + 0.27;
      for (let z = -53; z <= 53; z += 1.55) {
        pieces.push([x + rand(-0.22, 0.22), y + rand(0, 0.16), z + rand(-0.3, 0.3), rand(0.75, 1.18), rand(0, TAU)]);
      }
    }
  }
  for (const side of [-1, 1]) {
    for (let r = 0; r < rowsEnd; r++) {
      const z = side * (60 + r * 1.15);
      const y = 1.1 + r * 0.56 + 0.27;
      for (let x = -35; x <= 35; x += 1.65) {
        pieces.push([x + rand(-0.3, 0.3), y + rand(0, 0.16), z + rand(-0.22, 0.22), rand(0.75, 1.18), rand(0, TAU)]);
      }
    }
  }

  const crowd = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.4, 0.56, 0.36),
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    pieces.length
  );
  const color = new THREE.Color();
  pieces.forEach((p, i) => {
    dummy.position.set(p[0], p[1], p[2]);
    dummy.rotation.set(0, p[4], 0);
    dummy.scale.setScalar(p[3]);
    dummy.updateMatrix();
    crowd.setMatrixAt(i, dummy.matrix);
    color.set(CROWD_COLORS[i % CROWD_COLORS.length]).multiplyScalar(rand(0.6, 1.05));
    crowd.setColorAt(i, color);
  });
  crowd.instanceMatrix.needsUpdate = true;
  if (crowd.instanceColor) crowd.instanceColor.needsUpdate = true;
  crowd.receiveShadow = true;
  scene.add(crowd);
}

export function addGoals(scene) {
  const netMat = new THREE.MeshBasicMaterial({
    map: makeNetTexture(),
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const postMat = new THREE.MeshStandardMaterial({ color: 0xf7fbff, roughness: 0.32, metalness: 0.15, emissive: 0x1a2228, emissiveIntensity: 0.6 });

  for (const end of [-1, 1]) {
    const group = new THREE.Group();
    group.position.set(0, 0, end * PITCH.halfL);

    for (const px of [-PITCH.goalHalf, PITCH.goalHalf]) {
      const post = new THREE.Mesh(GEO.post, postMat);
      post.position.set(px, PITCH.goalH / 2, 0);
      post.castShadow = true;
      group.add(post);
    }
    const bar = new THREE.Mesh(GEO.post, postMat);
    bar.rotation.z = Math.PI / 2;
    bar.scale.y = (PITCH.goalHalf * 2 + 0.15) / PITCH.goalH;
    bar.position.set(0, PITCH.goalH, 0);
    bar.castShadow = true;
    group.add(bar);

    const depth = 2.0;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(PITCH.goalHalf * 2, PITCH.goalH), netMat);
    back.position.set(0, PITCH.goalH / 2, end * depth);
    group.add(back);

    const top = new THREE.Mesh(new THREE.PlaneGeometry(PITCH.goalHalf * 2, depth), netMat);
    top.rotation.x = Math.PI / 2;
    top.position.set(0, PITCH.goalH, end * (depth / 2));
    group.add(top);

    for (const sx of [-PITCH.goalHalf, PITCH.goalHalf]) {
      const sidePanel = new THREE.Mesh(new THREE.PlaneGeometry(depth, PITCH.goalH), netMat);
      sidePanel.rotation.y = Math.PI / 2;
      sidePanel.position.set(sx, PITCH.goalH / 2, end * (depth / 2));
      group.add(sidePanel);
    }
    scene.add(group);
  }
}

export function addBoards(scene) {
  const textures = [0, 1, 2, 3].map(makeAdTexture);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x0a1620, roughness: 0.7 });

  for (const side of [-1, 1]) {
    for (let z = -45; z <= 45; z += 6.2) {
      const idx = Math.round((z + 45) / 6.2) % 4;
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(5.8, 1.08),
        new THREE.MeshBasicMaterial({ map: textures[idx], toneMapped: false })
      );
      board.position.set(side * 39.6, 0.72, z);
      board.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      scene.add(board);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 5.98), frameMat);
      frame.position.set(side * 39.75, 0.7, z);
      scene.add(frame);
    }
  }
  for (const side of [-1, 1]) {
    for (let x = -24; x <= 24; x += 6.2) {
      const idx = Math.round((x + 24) / 6.2) % 4;
      const board = new THREE.Mesh(
        new THREE.PlaneGeometry(5.8, 1.08),
        new THREE.MeshBasicMaterial({ map: textures[idx], toneMapped: false })
      );
      board.position.set(x, 0.72, side * 56.1);
      board.rotation.y = side > 0 ? Math.PI : 0;
      scene.add(board);
    }
  }
}

function addFloodlight(scene, x, z) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1d2a34, roughness: 0.75, metalness: 0.35 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.62, 30, 8), poleMat);
  pole.position.set(x, 15, z);
  pole.castShadow = true;
  scene.add(pole);

  const rig = new THREE.Mesh(new THREE.BoxGeometry(5.4, 3.4, 0.4), poleMat);
  rig.position.set(x, 30, z);
  rig.lookAt(0, 8, 0);
  scene.add(rig);

  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff9df, emissive: 0xfff4c8, emissiveIntensity: 3, roughness: 0.25 });
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 2; j++) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.95, 0.22), lampMat);
      lamp.position.set(x + (i - 1.5) * 1.25, 30 + (j - 0.5) * 1.2, z);
      scene.add(lamp);
    }
  }
}

export function addStadium(scene) {
  addStandStructure(scene, -1, false);
  addStandStructure(scene, 1, false);
  addStandStructure(scene, -1, true);
  addStandStructure(scene, 1, true);
  addCrowd(scene);

  const screenTex = makeScreenTexture();
  for (const end of [-1, 1]) {
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(19, 9.5),
      new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false })
    );
    screen.position.set(0, 20.5, end * 76);
    screen.rotation.y = end > 0 ? Math.PI : 0;
    scene.add(screen);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(20.2, 10.6, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x0b141c, roughness: 0.7 })
    );
    frame.position.set(0, 20.5, end * 76.4);
    scene.add(frame);
  }

  for (const x of [-50, 50]) {
    for (const z of [-70, 70]) addFloodlight(scene, x, z);
  }

  const flagMat = new THREE.MeshBasicMaterial({ color: 0xc6ff3d, side: THREE.DoubleSide });
  const poleMat = new THREE.MeshStandardMaterial({ color: 0xe8f2f8, roughness: 0.5 });
  for (const x of [-PITCH.halfW, PITCH.halfW]) {
    for (const z of [-PITCH.halfL, PITCH.halfL]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.7, 6), poleMat);
      pole.position.set(x, 0.85, z);
      scene.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.4), flagMat);
      flag.position.set(x + (x > 0 ? -0.31 : 0.31), 1.58, z);
      scene.add(flag);
    }
  }
}

export function addBall(scene) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(PITCH.ballR, 28, 20),
    new THREE.MeshStandardMaterial({ map: createBallTexture(), roughness: 0.42, metalness: 0.02 })
  );
  mesh.castShadow = true;
  mesh.position.set(0, PITCH.ballR, 0);
  scene.add(mesh);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.36, 0.016, 6, 24),
    new THREE.MeshBasicMaterial({ color: 0xc6ff3d, transparent: true, opacity: 0.35 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.026;
  scene.add(ring);

  return {
    mesh,
    ring,
    pos: mesh.position,
    vel: new THREE.Vector3(),
    owner: null,
    lastTouch: null,
    noTouchUntil: 0,
    lastShotTeam: null,
  };
}

export function addControlledIndicator(scene) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.045, 8, 36),
    new THREE.MeshBasicMaterial({ color: 0xc6ff3d, transparent: true, opacity: 0.9 })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  scene.add(ring);

  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
  spr.scale.set(4.6, 0.86, 1);
  spr.visible = false;
  scene.add(spr);

  return { ring, tag: spr };
}

export function addConfetti(scene) {
  const count = 340;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const palette = [0xc6ff3d, 0x4fd7ff, 0xffffff, 0xffcf5c, 0xff5a6e, 0x9b7bff];
  const color = new THREE.Color();
  for (let i = 0; i < count; i++) {
    positions[i * 3] = rand(-12, 12);
    positions[i * 3 + 1] = rand(0, 12);
    positions[i * 3 + 2] = rand(-4, 4);
    color.set(palette[i % palette.length]);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({ size: 0.32, vertexColors: true, transparent: true, opacity: 0, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  scene.add(points);

  return {
    points,
    positions,
    count,
    velocities: Array.from({ length: count }, () => new THREE.Vector3(rand(-7, 7), rand(2, 13), rand(-7, 7))),
    life: 0,
  };
}

export function burstConfetti(confetti, zSign) {
  if (!confetti) return;
  confetti.life = 3.4;
  confetti.points.material.opacity = 1;
  for (let i = 0; i < confetti.count; i++) {
    confetti.positions[i * 3] = rand(-6, 6);
    confetti.positions[i * 3 + 1] = rand(3, 12);
    confetti.positions[i * 3 + 2] = zSign * PITCH.halfL + rand(-2, 2);
    confetti.velocities[i].set(rand(-8, 8), rand(3, 14), rand(-8, 8) - zSign * 2);
  }
  confetti.points.geometry.attributes.position.needsUpdate = true;
  confetti.points.position.set(0, 0, 0);
}

export function updateConfetti(confetti, dt) {
  if (!confetti || confetti.life <= 0) return;
  confetti.life -= dt;
  for (let i = 0; i < confetti.count; i++) {
    confetti.velocities[i].y -= 9.8 * dt;
    confetti.positions[i * 3] += confetti.velocities[i].x * dt;
    confetti.positions[i * 3 + 1] += confetti.velocities[i].y * dt;
    confetti.positions[i * 3 + 2] += confetti.velocities[i].z * dt;
  }
  confetti.points.geometry.attributes.position.needsUpdate = true;
  confetti.points.material.opacity = clamp01(confetti.life / 1.4);
  if (confetti.life <= 0) confetti.points.material.opacity = 0;
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
