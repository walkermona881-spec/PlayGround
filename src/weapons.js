import * as THREE from './vendor/three.module.min.js'

export const WEAPONS = {
  m4: {
    id: 'm4',
    name: 'M4A1',
    category: 'ASSAULT RIFLE',
    slot: 'primary',
    damage: 26,
    rpm: 720,
    mag: 30,
    reserve: 180,
    reload: 2.0,
    spreadHip: 0.013,
    spreadAds: 0.0026,
    recoil: 0.0125,
    recoilYaw: 0.006,
    auto: true,
    adsZoom: 1.32,
    range: 58,
    sound: 'rifle',
    stats: { damage: 66, accuracy: 78, fireRate: 72, mobility: 64, range: 76 },
    viewPos: [0.25, -0.235, -0.5],
    adsPos: [0, -0.185, -0.335],
    accent: 0xff8a1e
  },
  ak47: {
    id: 'ak47',
    name: 'AK-47',
    category: 'ASSAULT RIFLE',
    slot: 'primary',
    damage: 33,
    rpm: 590,
    mag: 30,
    reserve: 150,
    reload: 2.35,
    spreadHip: 0.016,
    spreadAds: 0.0036,
    recoil: 0.021,
    recoilYaw: 0.01,
    auto: true,
    adsZoom: 1.3,
    range: 52,
    sound: 'rifleHeavy',
    stats: { damage: 82, accuracy: 64, fireRate: 58, mobility: 58, range: 68 },
    viewPos: [0.25, -0.24, -0.5],
    adsPos: [0, -0.19, -0.33],
    accent: 0xff8a1e
  },
  mp5: {
    id: 'mp5',
    name: 'QQ9',
    category: 'SUBMACHINE GUN',
    slot: 'primary',
    damage: 22,
    rpm: 900,
    mag: 32,
    reserve: 192,
    reload: 1.75,
    spreadHip: 0.015,
    spreadAds: 0.0042,
    recoil: 0.009,
    recoilYaw: 0.007,
    auto: true,
    adsZoom: 1.24,
    range: 30,
    sound: 'smg',
    stats: { damage: 54, accuracy: 62, fireRate: 94, mobility: 88, range: 42 },
    viewPos: [0.24, -0.23, -0.45],
    adsPos: [0, -0.18, -0.3],
    accent: 0x5fd6ff
  },
  dlq: {
    id: 'dlq',
    name: 'DL Q33',
    category: 'SNIPER',
    slot: 'primary',
    damage: 118,
    rpm: 46,
    mag: 5,
    reserve: 30,
    reload: 2.9,
    spreadHip: 0.05,
    spreadAds: 0.0004,
    recoil: 0.06,
    recoilYaw: 0.015,
    auto: false,
    boltTime: 1.15,
    adsZoom: 3.6,
    scope: true,
    range: 120,
    sound: 'sniper',
    stats: { damage: 100, accuracy: 92, fireRate: 18, mobility: 34, range: 100 },
    viewPos: [0.23, -0.22, -0.46],
    adsPos: [0, -0.16, -0.3],
    accent: 0x9ad6ff
  }
}

export const SECONDARY = {
  id: 'pistol',
  name: 'M1911',
  category: 'PISTOL',
  slot: 'secondary',
  damage: 30,
  rpm: 320,
  mag: 8,
  reserve: 48,
  reload: 1.55,
  spreadHip: 0.017,
  spreadAds: 0.005,
  recoil: 0.017,
  recoilYaw: 0.008,
  auto: false,
  adsZoom: 1.2,
  range: 26,
  sound: 'pistol',
  stats: { damage: 58, accuracy: 56, fireRate: 42, mobility: 94, range: 34 },
  viewPos: [0.22, -0.21, -0.4],
  adsPos: [0, -0.165, -0.27],
  accent: 0xffc45f
}

export const PERKS = {
  fastHands: {
    id: 'fastHands',
    name: 'FAST HANDS',
    detail: 'Reload 25% faster',
    icon: '↻'
  },
  lightweight: {
    id: 'lightweight',
    name: 'LIGHTWEIGHT',
    detail: 'Move 12% faster',
    icon: '»'
  },
  toughness: {
    id: 'toughness',
    name: 'TOUGHNESS',
    detail: 'Take 15% less damage',
    icon: '✚'
  }
}

export const BOT_NAMES = ['VIPER', 'ROOK', 'HAVOC', 'SPECTER', 'NOMAD', 'KESTREL', 'BISHOP', 'TALON']
export const BOT_TITLES = ['RAZOR', 'ATLAS', 'MARAUDER', 'GHOST', 'TALON', 'ECHO', 'JACKAL', 'ORION']

function mat(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.62,
    metalness: options.metalness ?? 0.28,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0
  })
}

function addBox(group, material, size, position, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material)
  mesh.position.set(position[0], position[1], position[2])
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2])
  mesh.castShadow = false
  mesh.receiveShadow = false
  group.add(mesh)
  return mesh
}

function addCylinder(group, material, radius, length, position, rotation = null, radialSegments = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, radialSegments), material)
  mesh.position.set(position[0], position[1], position[2])
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2])
  group.add(mesh)
  return mesh
}

export function buildWeaponModel(weaponId, options = {}) {
  const weapon = weaponId === 'pistol' ? SECONDARY : WEAPONS[weaponId] || WEAPONS.m4
  const group = new THREE.Group()
  const hands = options.hands !== false
  const gunmetal = mat(0x24282d, { roughness: 0.45, metalness: 0.55 })
  const dark = mat(0x121417, { roughness: 0.5, metalness: 0.4 })
  const accent = mat(weapon.accent, { roughness: 0.4, metalness: 0.5, emissive: weapon.accent, emissiveIntensity: 0.25 })
  const glove = mat(0x272f36, { roughness: 0.86, metalness: 0.05 })
  const skin = mat(0x9c6b4c, { roughness: 0.8, metalness: 0.02 })
  const wood = mat(0x6b4226, { roughness: 0.72, metalness: 0.08 })
  const lens = mat(0x6fe4ff, { roughness: 0.15, metalness: 0.2, emissive: 0x4fd4ff, emissiveIntensity: 1.6 })

  const muzzle = new THREE.Object3D()

  if (weaponId === 'pistol') {
    addBox(group, gunmetal, [0.075, 0.09, 0.24], [0, 0, -0.09])
    addBox(group, dark, [0.055, 0.055, 0.2], [0, 0.014, -0.24])
    addCylinder(group, dark, 0.016, 0.1, [0, 0.018, -0.34], [Math.PI / 2, 0, 0], 8)
    addBox(group, gunmetal, [0.06, 0.16, 0.075], [0, -0.12, 0.005], [-0.28, 0, 0])
    addBox(group, accent, [0.064, 0.022, 0.08], [0, -0.155, -0.015])
    addBox(group, dark, [0.036, 0.028, 0.05], [0, 0.064, -0.11])
    addCylinder(group, lens, 0.011, 0.008, [0, 0.064, -0.138], [Math.PI / 2, 0, 0], 8)
    muzzle.position.set(0, 0.018, -0.4)
    if (hands) {
      addBox(group, glove, [0.1, 0.12, 0.12], [0.005, -0.125, 0.02], [-0.25, 0, 0])
      addBox(group, glove, [0.1, 0.11, 0.11], [-0.01, -0.11, -0.02], [-0.15, 0, 0])
    }
  } else if (weaponId === 'dlq') {
    addBox(group, gunmetal, [0.08, 0.11, 0.6], [0, 0, -0.16])
    addCylinder(group, dark, 0.019, 0.72, [0, 0.025, -0.78], [Math.PI / 2, 0, 0], 10)
    addCylinder(group, accent, 0.026, 0.09, [0, 0.025, -1.13], [Math.PI / 2, 0, 0], 10)
    addBox(group, dark, [0.09, 0.13, 0.28], [0, -0.01, 0.26])
    addBox(group, gunmetal, [0.075, 0.2, 0.09], [0, -0.16, 0.03], [-0.3, 0, 0])
    addBox(group, dark, [0.065, 0.14, 0.11], [0, -0.1, -0.24], [0.15, 0, 0])
    addCylinder(group, dark, 0.045, 0.34, [0, 0.14, -0.16], [Math.PI / 2, 0, 0], 12)
    addCylinder(group, lens, 0.038, 0.02, [0, 0.14, -0.335], [Math.PI / 2, 0, 0], 12)
    addBox(group, dark, [0.045, 0.06, 0.08], [0, 0.205, -0.16])
    addBox(group, dark, [0.02, 0.18, 0.03], [0.055, 0.02, 0.0], [0, 0, 0.12])
    addBox(group, dark, [0.02, 0.18, 0.03], [-0.055, 0.02, 0.0], [0, 0, -0.12])
    muzzle.position.set(0, 0.025, -1.2)
    if (hands) {
      addBox(group, glove, [0.11, 0.12, 0.13], [0.01, -0.17, 0.03], [-0.3, 0, 0])
      addBox(group, glove, [0.1, 0.11, 0.12], [-0.02, -0.1, -0.3], [0.1, 0, 0])
    }
  } else {
    const compact = weaponId === 'mp5'
    const bodyLength = compact ? 0.34 : 0.46
    const bodyZ = compact ? -0.09 : -0.12
    const woodAccent = weaponId === 'ak47'
    addBox(group, gunmetal, [0.085, 0.115, bodyLength], [0, 0, bodyZ])
    addBox(group, dark, [0.07, 0.075, compact ? 0.32 : 0.4], [0, 0.075, -0.2])
    addBox(group, compact ? dark : gunmetal, [0.075, 0.085, compact ? 0.22 : 0.3], [0, 0.008, compact ? -0.32 : -0.4])
    addCylinder(group, dark, compact ? 0.018 : 0.021, compact ? 0.3 : 0.48, [0, 0.02, compact ? -0.54 : -0.76], [Math.PI / 2, 0, 0], 10)
    addCylinder(group, accent, compact ? 0.023 : 0.026, 0.07, [0, 0.02, compact ? -0.68 : -0.99], [Math.PI / 2, 0, 0], 10)
    addBox(group, woodAccent ? wood : dark, [0.082, 0.105, 0.24], [0, -0.005, compact ? 0.16 : 0.2])
    addBox(group, dark, [0.07, 0.18, 0.09], [0, -0.165, compact ? 0.02 : 0.045], [-0.32, 0, 0])
    addBox(group, dark, [0.055, compact ? 0.19 : 0.22, 0.1], [0, -0.15, compact ? -0.045 : -0.075], [0.2, 0, 0])
    addBox(group, dark, [0.052, compact ? 0.05 : 0.06, 0.12], [0, 0.14, compact ? -0.12 : -0.16])
    addCylinder(group, lens, 0.017, 0.008, [0, 0.14, compact ? -0.19 : -0.23], [Math.PI / 2, 0, 0], 8)
    addBox(group, dark, [0.03, 0.05, 0.05], [0, 0.2, compact ? -0.08 : -0.1])
    addBox(group, accent, [0.088, 0.012, 0.1], [0, 0.058, compact ? -0.04 : -0.06])
    muzzle.position.set(0, 0.02, compact ? -0.75 : -1.06)
    if (hands) {
      addBox(group, glove, [0.1, 0.12, 0.13], [0.012, -0.17, compact ? 0.04 : 0.065], [-0.3, 0, 0])
      addBox(group, glove, [0.1, 0.11, 0.13], [-0.018, -0.075, compact ? -0.3 : -0.38], [0.15, 0, 0])
      addBox(group, skin, [0.075, 0.075, 0.04], [0.012, -0.205, compact ? 0.07 : 0.095], [-0.3, 0, 0])
    }
  }

  group.add(muzzle)
  group.scale.setScalar(options.scale ?? 1)
  group.traverse((child) => {
    if (child.isMesh) {
      child.frustumCulled = false
    }
  })
  return { group, muzzle }
}

export function weaponIcon(kind) {
  if (kind === 'dlq') {
    return '<svg viewBox="0 0 120 48" aria-hidden="true"><path d="M8 25h60l16-6h10v-6h8v6h10l6 4v6l-12 4H74l-8 9H54l6-13H32l-6 9H14l6-9H8z" fill="currentColor"/></svg>'
  }
  if (kind === 'mp5') {
    return '<svg viewBox="0 0 120 48" aria-hidden="true"><path d="M10 24h30l6-9h36l6 6h18v10H76l-8 10H57l5-12H40l-6 8H20l5-8H10z" fill="currentColor"/></svg>'
  }
  if (kind === 'pistol') {
    return '<svg viewBox="0 0 120 48" aria-hidden="true"><path d="M25 12h57l10 6v9H60l-7 10H37l8-14H25z" fill="currentColor"/></svg>'
  }
  return '<svg viewBox="0 0 120 48" aria-hidden="true"><path d="M10 24h28l8-8h38l8 5h18v10H84l-8 9H62l4-11H42l-7 8H21l6-8H10z" fill="currentColor"/></svg>'
}
