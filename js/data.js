import * as THREE from '../vendor/three.module.js';

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
export const rand = (a, b) => a + Math.random() * (b - a);
export const sign = (v) => (v >= 0 ? 1 : -1);
export const css = (hex) => '#' + hex.toString(16).padStart(6, '0');
export const luminance = (hex) => {
  const r = ((hex >> 16) & 255) / 255;
  const g = ((hex >> 8) & 255) / 255;
  const b = (hex & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const readableOn = (hex) => (luminance(hex) > 0.58 ? '#06121d' : '#f4fbff');

export const PITCH = {
  halfW: 34,
  halfL: 52.5,
  goalHalf: 3.66,
  goalH: 2.44,
  boxHalfW: 20.16,
  boxDepth: 16.5,
  sixHalfW: 9.16,
  sixDepth: 5.5,
  circleR: 9.15,
  ballR: 0.13,
};

export const TEAMS = [
  { name: 'Northport United', short: 'NPT', city: 'Northport', primary: 0x1f5cff, secondary: 0xf4f8ff, accent: 0x9dff3d, rating: 4.5, stars: '★★★★☆' },
  { name: 'Redbridge FC', short: 'RBC', city: 'Redbridge', primary: 0xd72036, secondary: 0xffffff, accent: 0xffd23f, rating: 4.5, stars: '★★★★☆' },
  { name: 'Verde City', short: 'VRC', city: 'Verde', primary: 0x159a55, secondary: 0xf1ffe9, accent: 0xe9ff6a, rating: 4, stars: '★★★★' },
  { name: 'Solara Athletic', short: 'SOL', city: 'Solara', primary: 0xff7a1a, secondary: 0x121820, accent: 0xffe066, rating: 4, stars: '★★★★' },
  { name: 'Riverton Rovers', short: 'RVR', city: 'Riverton', primary: 0x7b3ff2, secondary: 0xf6f0ff, accent: 0x5ce1ff, rating: 3.5, stars: '★★★☆' },
  { name: 'Azure Albion', short: 'AZA', city: 'Azure Bay', primary: 0x00a6c9, secondary: 0x062b44, accent: 0xd7ff5c, rating: 4, stars: '★★★★' },
  { name: 'Crown City', short: 'CRC', city: 'Crown City', primary: 0xd9a521, secondary: 0x131313, accent: 0xfff1a8, rating: 3.5, stars: '★★★☆' },
  { name: 'Ironvale FC', short: 'IRV', city: 'Ironvale', primary: 0x2e3a45, secondary: 0xe23c3c, accent: 0xff8f5e, rating: 3.5, stars: '★★★☆' },
];

export const LAYOUT = [
  { role: 'GK', x: 0, z: -48.5, num: 1 },
  { role: 'LB', x: -22, z: -35, num: 3 },
  { role: 'CB', x: -7.5, z: -37, num: 4 },
  { role: 'CB', x: 7.5, z: -37, num: 5 },
  { role: 'RB', x: 22, z: -35, num: 2 },
  { role: 'CDM', x: 0, z: -23, num: 6 },
  { role: 'CM', x: -15, z: -17, num: 8 },
  { role: 'CM', x: 15, z: -17, num: 10 },
  { role: 'LW', x: -21, z: -5, num: 11 },
  { role: 'ST', x: 0, z: -3.5, num: 9 },
  { role: 'RW', x: 21, z: -5, num: 7 },
];

export const INITIALS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'V', 'Z'];
export const SURNAMES = ['Silva', 'Moreno', 'Costa', 'Vega', 'Duarte', 'Marsh', 'Keller', 'Novak', 'Reyes', 'Lind', 'Okafor', 'Haddad', 'Brandt', 'Ferreira', 'Iversen', 'Kovac', 'Romano', 'Sato', 'Bianchi', 'Hughes', 'Mendes', 'Dahl', 'Rocha', 'Pereira', 'Kane', 'Cruz', 'Berg', 'Fischer', 'Lombardi', 'Vidal', 'Neri', 'Santos', 'Voss', 'Rey', 'Moura', 'Tanaka', 'Alves', 'Storm', 'Cardoso', 'Wolfe'];

export const CROWD_COLORS = [0x2b6cff, 0xff4d5e, 0xf2f4f8, 0xffd23f, 0x17a05c, 0x7b3ff2, 0x1a2633, 0x00a6c9, 0xff7a1a, 0xbcc8d4];

export const GEO = {
  torso: new THREE.CapsuleGeometry(0.245, 0.4, 6, 14),
  head: new THREE.SphereGeometry(0.155, 18, 14),
  hair: new THREE.SphereGeometry(0.161, 18, 10, 0, TAU, 0, Math.PI * 0.56),
  shorts: new THREE.BoxGeometry(0.46, 0.3, 0.34),
  thigh: new THREE.CylinderGeometry(0.098, 0.082, 0.4, 8),
  sock: new THREE.CylinderGeometry(0.078, 0.066, 0.34, 8),
  boot: new THREE.BoxGeometry(0.15, 0.1, 0.29),
  sleeve: new THREE.CylinderGeometry(0.078, 0.066, 0.28, 8),
  forearm: new THREE.CylinderGeometry(0.062, 0.052, 0.26, 8),
  hand: new THREE.SphereGeometry(0.066, 8, 6),
  post: new THREE.CylinderGeometry(0.075, 0.075, PITCH.goalH, 12),
};

export const SKIN_TONES = [0xf1c6a5, 0xe0aa82, 0xc68b62, 0xa96c47, 0x7d4d31, 0x5e3a25];
export const HAIR_COLORS = [0x1a1310, 0x2b1b12, 0x4a2a16, 0x6b4423, 0x161616, 0x3b2c20];
export const skinMats = SKIN_TONES.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.82 }));
export const hairMats = HAIR_COLORS.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));

export function teamMats(team) {
  if (!team._mats) {
    const mk = (color, rough = 0.78) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.02 });
    team._mats = {
      main: mk(team.primary),
      alt: mk(team.secondary),
      gkMain: mk(team.accent),
      gkAlt: mk(0x101a22),
      boot: mk(0x10151b, 0.55),
      glove: mk(0xf4f8ff, 0.5),
    };
  }
  return team._mats;
}

export function rosterFor(teamIndex) {
  return LAYOUT.map((slot, i) => ({
    ...slot,
    name: `${INITIALS[(i * 3 + teamIndex * 5) % INITIALS.length]}. ${SURNAMES[(i * 7 + teamIndex * 11 + 3) % SURNAMES.length]}`,
    isGK: slot.role === 'GK',
  }));
}

export function roleSpeed(role) {
  if (role === 'GK') return 4.7;
  if (role === 'ST' || role === 'LW' || role === 'RW') return 6.15;
  if (role === 'CM' || role === 'CDM') return 5.8;
  return 5.55;
}

export const DIFFICULTY_NAMES = ['AMATEUR', 'PRO', 'WORLD CLASS', 'LEGEND'];
export const DIFFICULTY_SPEED = [0.9, 1.0, 1.045, 1.09];
export const DIFFICULTY_REACT = [0.34, 0.26, 0.21, 0.17];
