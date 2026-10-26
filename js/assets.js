import * as THREE from '../vendor/three.module.js';
import { TAU, PITCH, GEO, css, rand, hairMats, skinMats, teamMats } from './data.js';

export function makeNumberTexture(number, team) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 160;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.fillStyle = css(team.secondary);
  ctx.font = 'italic 900 112px Arial Black, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), 64, 84);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makePlayerMesh(team, player) {
  const mats = teamMats(team);
  const main = player.isGK ? mats.gkMain : mats.main;
  const alt = player.isGK ? mats.gkAlt : mats.alt;
  const skin = skinMats[(player.number * 3 + team.short.charCodeAt(0)) % skinMats.length];
  const hair = hairMats[(player.number + team.short.charCodeAt(1)) % hairMats.length];

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = new THREE.Mesh(GEO.torso, main);
  torso.position.y = 1.2;
  body.add(torso);

  const shorts = new THREE.Mesh(GEO.shorts, alt);
  shorts.position.y = 0.81;
  body.add(shorts);

  const neck = new THREE.Mesh(GEO.thigh, skin);
  neck.scale.set(0.55, 0.16, 0.55);
  neck.position.y = 1.55;
  body.add(neck);

  const head = new THREE.Mesh(GEO.head, skin);
  head.position.y = 1.71;
  body.add(head);

  const hairMesh = new THREE.Mesh(GEO.hair, hair);
  hairMesh.position.set(0, 1.755, -0.004);
  hairMesh.scale.set(1.02, 1.03, 1.05);
  body.add(hairMesh);

  const makeArm = (side) => {
    const arm = new THREE.Group();
    arm.position.set(side * 0.335, 1.46, 0);
    arm.rotation.z = -side * 0.14;
    const sleeve = new THREE.Mesh(GEO.sleeve, main);
    sleeve.position.y = -0.14;
    arm.add(sleeve);
    const fore = new THREE.Mesh(GEO.forearm, skin);
    fore.position.y = -0.4;
    arm.add(fore);
    const hand = new THREE.Mesh(GEO.hand, player.isGK ? mats.glove : skin);
    hand.position.y = -0.55;
    arm.add(hand);
    body.add(arm);
    return arm;
  };
  const armL = makeArm(-1);
  const armR = makeArm(1);

  const makeLeg = (side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.14, 0.9, 0);
    const thigh = new THREE.Mesh(GEO.thigh, skin);
    thigh.position.y = -0.2;
    leg.add(thigh);
    const sock = new THREE.Mesh(GEO.sock, alt);
    sock.position.y = -0.56;
    leg.add(sock);
    const boot = new THREE.Mesh(GEO.boot, mats.boot);
    boot.position.set(0, -0.82, 0.055);
    leg.add(boot);
    body.add(leg);
    return leg;
  };
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  const num = new THREE.Mesh(
    new THREE.PlaneGeometry(0.32, 0.4),
    new THREE.MeshBasicMaterial({ map: makeNumberTexture(player.number, team), transparent: true, depthWrite: false, side: THREE.DoubleSide })
  );
  num.position.set(0, 1.27, -0.268);
  num.rotation.y = Math.PI;
  body.add(num);

  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = false;
    }
  });

  return { root, body, legL, legR, armL, armR };
}

export function createBallTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(190, 170, 30, 256, 256, 330);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.7, '#eef3f6');
  g.addColorStop(1, '#c9d4db');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  const pent = (cx, cy, r, rot, color) => {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = rot + (i * TAU) / 5;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  };
  pent(256, 256, 66, -Math.PI / 2, '#14181c');
  const ring = [[256, 78], [420, 188], [390, 390], [122, 390], [92, 188]];
  ring.forEach(([x, y]) => pent(x, y, 46, -Math.PI / 2, '#1a1f24'));
  ctx.strokeStyle = 'rgba(40,50,58,0.35)';
  ctx.lineWidth = 5;
  ring.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(256, 256);
    ctx.lineTo(x, y);
    ctx.stroke();
  });
  ctx.strokeStyle = 'rgba(30,40,48,0.18)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath();
    ctx.arc(256, 256, 100 + i * 17, 0.3 + i, 2.4 + i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function makePitchTexture() {
  const W = 2048;
  const H = 3072;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  const base = ctx.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#2b7a3c');
  base.addColorStop(0.5, '#2f8442');
  base.addColorStop(1, '#276f38');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  const stripes = 22;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.048)' : 'rgba(0,20,0,0.06)';
    ctx.fillRect(0, (i / stripes) * H, W, H / stripes);
  }

  for (let i = 0; i < 24000; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(190,255,190,0.05)' : 'rgba(0,40,0,0.05)';
    const s = Math.random() * 3 + 1;
    ctx.fillRect(x, y, s, s);
  }
  for (let i = 0; i < 36; i++) {
    const x = Math.random() * W;
    const y = Math.random() * H;
    const r = Math.random() * 160 + 40;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(30,90,40,0.08)');
    grd.addColorStop(1, 'rgba(30,90,40,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  const sx = W / (PITCH.halfW * 2 + 6);
  const sy = H / (PITCH.halfL * 2 + 6);
  const X = (x) => W / 2 + x * sx;
  const Z = (z) => H / 2 + z * sy;


  const line = (x1, z1, x2, z2) => {
    ctx.beginPath();
    ctx.moveTo(X(x1), Z(z1));
    ctx.lineTo(X(x2), Z(z2));
    ctx.stroke();
  };

  ctx.strokeStyle = 'rgba(244,255,248,0.93)';
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.rect(X(-PITCH.halfW), Z(-PITCH.halfL), X(PITCH.halfW) - X(-PITCH.halfW), Z(PITCH.halfL) - Z(-PITCH.halfL));
  ctx.stroke();

  line(-PITCH.halfW, 0, PITCH.halfW, 0);

  ctx.beginPath();
  ctx.arc(X(0), Z(0), PITCH.circleR * sx, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(X(0), Z(0), 0.28 * sx, 0, TAU);
  ctx.fillStyle = 'rgba(244,255,248,0.93)';
  ctx.fill();

  for (const end of [-1, 1]) {
    const goalZ = end * PITCH.halfL;
    const boxBack = goalZ - end * PITCH.boxDepth;
    ctx.beginPath();
    ctx.rect(X(-PITCH.boxHalfW), Z(Math.min(goalZ, boxBack)), X(PITCH.boxHalfW) - X(-PITCH.boxHalfW), Math.abs(Z(boxBack) - Z(goalZ)));
    ctx.stroke();

    const sixBack = goalZ - end * PITCH.sixDepth;
    ctx.beginPath();
    ctx.rect(X(-PITCH.sixHalfW), Z(Math.min(goalZ, sixBack)), X(PITCH.sixHalfW) - X(-PITCH.sixHalfW), Math.abs(Z(sixBack) - Z(goalZ)));
    ctx.stroke();

    const spotZ = goalZ - end * 11;
    ctx.beginPath();
    ctx.arc(X(0), Z(spotZ), 0.2 * sx, 0, TAU);
    ctx.fill();

    ctx.beginPath();
    if (end === -1) ctx.arc(X(0), Z(spotZ), PITCH.circleR * sx, 0.96, Math.PI - 0.96);
    else ctx.arc(X(0), Z(spotZ), PITCH.circleR * sx, Math.PI + 0.96, TAU - 0.96);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(X(-PITCH.halfW), Z(goalZ), 1.0 * sx, end === -1 ? 0 : Math.PI, end === -1 ? Math.PI / 2 : Math.PI * 1.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(X(PITCH.halfW), Z(goalZ), 1.0 * sx, end === -1 ? Math.PI / 2 : Math.PI, end === -1 ? Math.PI : -Math.PI / 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function makeAdTexture(variant) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 192;
  const ctx = c.getContext('2d');
  const themes = [
    ['#07131f', '#c6ff3d', 'DREAM LEAGUE 2026', 'THE BEAUTIFUL GAME'],
    ['#101a2b', '#4fd7ff', 'OMG SPORTS', 'PLAY. DREAM. REPEAT.'],
    ['#0c2233', '#ffcf5c', 'OMG ARENA', '62,480 STRONG'],
    ['#111827', '#ff6b81', 'KICK OFF', 'SEASON 2026'],
  ];
  const t = themes[variant % themes.length];
  const grad = ctx.createLinearGradient(0, 0, 1024, 0);
  grad.addColorStop(0, t[0]);
  grad.addColorStop(0.5, '#132c3f');
  grad.addColorStop(1, t[0]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 192);
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 1018, 186);
  ctx.fillStyle = t[1];
  ctx.font = 'italic 900 82px Arial Black, Arial';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(t[2], 46, 86);
  ctx.fillStyle = 'rgba(235,248,255,0.72)';
  ctx.font = '700 27px Segoe UI, Arial';
  ctx.fillText(t[3], 50, 146);
  ctx.fillStyle = t[1];
  ctx.beginPath();
  ctx.arc(958, 96, 34, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#07131f';
  ctx.font = 'italic 900 34px Arial Black, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('26', 958, 96);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeNetTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 128; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6, 3);
  tex.anisotropy = 4;
  return tex;
}

export function makeScreenTexture() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 1024, 512);
  grad.addColorStop(0, '#07131f');
  grad.addColorStop(0.55, '#0f2c42');
  grad.addColorStop(1, '#07131f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.strokeStyle = 'rgba(120,220,255,0.35)';
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, 992, 480);
  ctx.fillStyle = '#c6ff3d';
  ctx.font = 'italic 900 38px Arial Black, Arial';
  ctx.textAlign = 'center';
  ctx.fillText('DREAM LEAGUE', 512, 112);
  ctx.fillStyle = '#eef8ff';
  ctx.font = 'italic 900 128px Arial Black, Arial';
  ctx.fillText('SOCCER', 512, 240);
  ctx.fillStyle = '#c6ff3d';
  ctx.font = 'italic 900 108px Arial Black, Arial';
  ctx.fillText('2026', 512, 356);
  ctx.fillStyle = 'rgba(200,240,255,0.7)';
  ctx.font = '700 26px Segoe UI, Arial';
  ctx.fillText('LIVE FROM THE OMG ARENA', 512, 440);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 2, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,245,205,1)');
  g.addColorStop(0.18, 'rgba(255,224,150,0.85)');
  g.addColorStop(0.5, 'rgba(255,180,90,0.28)');
  g.addColorStop(1, 'rgba(255,160,70,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeCloudTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 46; i++) {
    const x = rand(40, 470);
    const y = rand(80, 200);
    const r = rand(16, 54);
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,240,225,0.2)');
    grd.addColorStop(1, 'rgba(255,240,225,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeTagTexture(name, number) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 96;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 512, 96);
  ctx.fillStyle = 'rgba(5,18,28,0.82)';
  const w = 402;
  const x = (512 - w) / 2;
  ctx.beginPath();
  ctx.roundRect(x, 8, w, 62, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(198,255,61,0.75)';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#c6ff3d';
  ctx.font = 'italic 900 30px Arial Black, Arial';
  ctx.textAlign = 'left';
  ctx.fillText(String(number).padStart(2, '0'), x + 20, 50);
  ctx.fillStyle = '#f2fbff';
  ctx.font = '800 27px Segoe UI, Arial';
  ctx.fillText(name.toUpperCase(), x + 82, 49);
  ctx.fillStyle = 'rgba(198,255,61,0.95)';
  ctx.beginPath();
  ctx.moveTo(246, 70);
  ctx.lineTo(266, 70);
  ctx.lineTo(256, 88);
  ctx.closePath();
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
