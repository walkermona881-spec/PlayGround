import * as THREE from './vendor/three.module.min.js'

const MAP_HALF = 46
const UP = new THREE.Vector3(0, 1, 0)

function canvasTexture(size, draw, repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  draw(ctx, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  texture.anisotropy = 4
  return texture
}

function makeGroundTexture() {
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#a8845b'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 3200; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const r = Math.random() * 2.2 + 0.3
      const shade = Math.random()
      ctx.fillStyle = shade > 0.55 ? 'rgba(70,48,30,0.16)' : 'rgba(235,206,158,0.12)'
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = 'rgba(72,52,32,0.12)'
      ctx.lineWidth = 1 + Math.random() * 2
      ctx.beginPath()
      const x = Math.random() * size
      const y = Math.random() * size
      ctx.moveTo(x, y)
      ctx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40)
      ctx.stroke()
    }
  }, 26, 26)
}

function makeConcreteTexture() {
  return canvasTexture(256, (ctx, size) => {
    ctx.fillStyle = '#8a8173'
    ctx.fillRect(0, 0, size, size)
    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(45,42,38,0.12)' : 'rgba(240,235,220,0.1)'
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2)
    }
    ctx.strokeStyle = 'rgba(45,42,38,0.33)'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, size, size)
    ctx.strokeStyle = 'rgba(45,42,38,0.18)'
    ctx.lineWidth = 1
    for (let i = 1; i < 4; i++) {
      ctx.beginPath()
      ctx.moveTo((size / 4) * i, 0)
      ctx.lineTo((size / 4) * i, size)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, (size / 4) * i)
      ctx.lineTo(size, (size / 4) * i)
      ctx.stroke()
    }
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = 'rgba(30,28,24,0.2)'
      ctx.beginPath()
      let x = Math.random() * size
      let y = Math.random() * size
      ctx.moveTo(x, y)
      for (let j = 0; j < 4; j++) {
        x += (Math.random() - 0.5) * 26
        y += (Math.random() - 0.2) * 26
        ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
  }, 2, 2)
}

function makeContainerTexture(color, label) {
  const texCanvas = document.createElement('canvas')
  texCanvas.width = 512
  texCanvas.height = 256
  const ctx = texCanvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 512, 256)
  const grad = ctx.createLinearGradient(0, 0, 0, 256)
  grad.addColorStop(0, 'rgba(255,255,255,0.14)')
  grad.addColorStop(0.45, 'rgba(255,255,255,0)')
  grad.addColorStop(1, 'rgba(0,0,0,0.26)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 256)
  for (let x = 8; x < 512; x += 18) {
    const rib = ctx.createLinearGradient(x, 0, x + 12, 0)
    rib.addColorStop(0, 'rgba(0,0,0,0.16)')
    rib.addColorStop(0.5, 'rgba(255,255,255,0.12)')
    rib.addColorStop(1, 'rgba(0,0,0,0.16)')
    ctx.fillStyle = rib
    ctx.fillRect(x, 0, 12, 256)
  }
  ctx.fillStyle = 'rgba(0,0,0,0.32)'
  ctx.fillRect(0, 232, 512, 24)
  ctx.fillRect(0, 0, 512, 10)
  ctx.font = 'bold 64px Arial Black, Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(255,255,255,0.62)'
  ctx.fillText(label, 256, 120)
  ctx.font = 'bold 22px Arial, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fillText('CODM // CLONE  ·  STANDOFF', 256, 178)
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(25,18,12,${Math.random() * 0.18})`
    ctx.fillRect(Math.random() * 512, Math.random() * 256, Math.random() * 8 + 2, Math.random() * 4 + 1)
  }
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = 'rgba(110,60,28,0.18)'
    ctx.fillRect(Math.random() * 512, Math.random() * 256, Math.random() * 18 + 4, Math.random() * 5 + 1)
  }
  const texture = new THREE.CanvasTexture(texCanvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function makeWoodTexture() {
  return canvasTexture(128, (ctx, size) => {
    ctx.fillStyle = '#8a5a32'
    ctx.fillRect(0, 0, size, size)
    for (let y = 0; y < size; y += 16) {
      ctx.fillStyle = y % 32 === 0 ? 'rgba(0,0,0,0.15)' : 'rgba(255,220,170,0.08)'
      ctx.fillRect(0, y, size, 15)
      ctx.fillStyle = 'rgba(35,20,10,0.5)'
      ctx.fillRect(0, y + 15, size, 2)
    }
    for (let i = 0; i < 120; i++) {
      ctx.strokeStyle = `rgba(45,26,12,${Math.random() * 0.18})`
      ctx.beginPath()
      const y = Math.random() * size
      ctx.moveTo(0, y)
      ctx.lineTo(size, y + (Math.random() - 0.5) * 3)
      ctx.stroke()
    }
  }, 1, 1)
}

function makeSandbagTexture() {
  return canvasTexture(128, (ctx, size) => {
    ctx.fillStyle = '#9d8153'
    ctx.fillRect(0, 0, size, size)
    for (let y = 0; y < size; y += 22) {
      for (let x = (y / 22) % 2 ? 12 : 0; x < size; x += 26) {
        ctx.fillStyle = `rgba(58,46,30,${0.32 + Math.random() * 0.15})`
        ctx.beginPath()
        ctx.ellipse(x + 13, y + 11, 14, 10, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(230,204,152,0.2)'
        ctx.beginPath()
        ctx.ellipse(x + 11, y + 8, 9, 5, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }, 2, 1)
}

export function buildWorld(scene) {
  const colliders = []
  const raycastMeshes = []
  const spawnPoints = []
  const animated = []
  const clock = new THREE.Clock()

  const groundTexture = makeGroundTexture()
  const concreteTexture = makeConcreteTexture()
  const woodTexture = makeWoodTexture()
  const sandbagTexture = makeSandbagTexture()

  const groundMaterial = new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 1, metalness: 0 })
  const concreteMaterial = new THREE.MeshStandardMaterial({ map: concreteTexture, roughness: 0.95, metalness: 0.02 })
  const concreteDark = new THREE.MeshStandardMaterial({ color: 0x5d5a52, roughness: 0.96, metalness: 0.03 })
  const woodMaterial = new THREE.MeshStandardMaterial({ map: woodTexture, roughness: 0.92, metalness: 0.02 })
  const sandbagMaterial = new THREE.MeshStandardMaterial({ map: sandbagTexture, roughness: 1, metalness: 0 })
  const metalDark = new THREE.MeshStandardMaterial({ color: 0x2e3539, roughness: 0.55, metalness: 0.65 })
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x3b3a37, roughness: 1, metalness: 0.02 })
  const orange = new THREE.MeshStandardMaterial({ color: 0xd97423, roughness: 0.72, metalness: 0.2 })

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  scene.add(ground)
  raycastMeshes.push(ground)

  const road = new THREE.Mesh(new THREE.PlaneGeometry(13, 92), asphalt)
  road.rotation.x = -Math.PI / 2
  road.position.set(0, 0.012, 0)
  road.receiveShadow = true
  scene.add(road)
  const crossRoad = new THREE.Mesh(new THREE.PlaneGeometry(92, 11), asphalt)
  crossRoad.rotation.x = -Math.PI / 2
  crossRoad.position.set(0, 0.014, 10)
  crossRoad.receiveShadow = true
  scene.add(crossRoad)

  for (let i = -40; i <= 40; i += 11) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 4.2),
      new THREE.MeshBasicMaterial({ color: 0xd8b26a, transparent: true, opacity: 0.55 })
    )
    stripe.rotation.x = -Math.PI / 2
    stripe.position.set(0, 0.02, i)
    scene.add(stripe)
  }

  function addSolid(mesh, collider = true, raycast = true) {
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    if (raycast) raycastMeshes.push(mesh)
    if (collider) {
      mesh.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(mesh)
      colliders.push({ minX: box.min.x, maxX: box.max.x, minY: box.min.y, maxY: box.max.y, minZ: box.min.z, maxZ: box.max.z, top: box.max.y })
    }
    return mesh
  }

  function box({ x, y = 0, z, w, h, d, material, ry = 0, collide = true, raycast = true }) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material)
    mesh.position.set(x, y + h / 2, z)
    mesh.rotation.y = ry
    return addSolid(mesh, collide, raycast)
  }

  function cylinder({ x, y = 0, z, radius, height, material, collide = true, raycast = true, segments = 12 }) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material)
    mesh.position.set(x, y + height / 2, z)
    return addSolid(mesh, collide, raycast)
  }

  const perimeter = [
    { x: 0, z: -MAP_HALF, w: MAP_HALF * 2 + 2, d: 1.2 },
    { x: 0, z: MAP_HALF, w: MAP_HALF * 2 + 2, d: 1.2 },
    { x: -MAP_HALF, z: 0, w: 1.2, d: MAP_HALF * 2 + 2 },
    { x: MAP_HALF, z: 0, w: 1.2, d: MAP_HALF * 2 + 2 }
  ]
  for (const wall of perimeter) {
    box({ x: wall.x, z: wall.z, w: wall.w, h: 5.4, d: wall.d, material: concreteMaterial })
  }
  for (const wall of perimeter) {
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(wall.w - 2, 1), 0.28, Math.max(wall.d - 0.3, 0.3)),
      orange
    )
    stripe.position.set(wall.x, 3.5, wall.z)
    stripe.castShadow = false
    scene.add(stripe)
  }

  function warehouse({ x, z, w, d, h, door = 4.2, label = 'SUPPLY', lightColor = 0xffb46a }) {
    const t = 0.7
    box({ x, z: z - d / 2, w, h, d: t, material: concreteMaterial })
    box({ x: x - w / 2, z, w: t, h, d, material: concreteMaterial })
    box({ x: x + w / 2, z, w: t, h, d, material: concreteMaterial })
    const frontZ = z + d / 2
    const sideWidth = (w - door) / 2
    box({ x: x - (door / 2 + sideWidth / 2), z: frontZ, w: sideWidth, h, d: t, material: concreteMaterial })
    box({ x: x + (door / 2 + sideWidth / 2), z: frontZ, w: sideWidth, h, d: t, material: concreteMaterial })
    box({ x, y: 2.9, z: frontZ, w: door, h: h - 2.9, d: t, material: concreteMaterial })
    box({ x, y: h, z, w: w + 0.6, h: 0.42, d: d + 0.6, material: concreteDark })
    box({ x, y: h - 0.1, z: frontZ + 0.2, w: 3.2, h: 0.45, d: 1.8, material: orange })
    const light = new THREE.PointLight(lightColor, 24, 18, 1.8)
    light.position.set(x, h - 0.7, z)
    scene.add(light)
    animated.push({ kind: 'light', light, base: 24, phase: Math.random() * 6 })

    const sign = makeSignTexture(label)
    const signMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 1.7),
      new THREE.MeshBasicMaterial({ map: sign, transparent: true })
    )
    signMesh.position.set(x, 3.1, frontZ + 0.72)
    scene.add(signMesh)
  }

  function makeSignTexture(label) {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 136
    const ctx = c.getContext('2d')
    ctx.fillStyle = 'rgba(14,16,18,0.86)'
    ctx.fillRect(0, 0, 512, 136)
    ctx.strokeStyle = '#ff8a1e'
    ctx.lineWidth = 5
    ctx.strokeRect(5, 5, 502, 126)
    ctx.fillStyle = '#ff8a1e'
    ctx.fillRect(24, 92, 130, 8)
    ctx.font = 'bold 58px Arial Black, Arial, sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#f5efe4'
    ctx.fillText(label, 26, 54)
    ctx.font = 'bold 20px Arial, sans-serif'
    ctx.fillStyle = 'rgba(245,239,228,0.55)'
    ctx.fillText('TACTICAL STORAGE // AUTHORIZED ONLY', 28, 112)
    const tex = new THREE.CanvasTexture(c)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }

  warehouse({ x: -20, z: -18, w: 21, d: 14, h: 6.8, label: 'ARMORY' })
  warehouse({ x: 19, z: 18, w: 17, d: 12, h: 6.2, label: 'DEPOT', lightColor: 0x8fc9ff })

  box({ x: 0, z: 0, w: 3.4, h: 2.5, d: 7.6, material: metalDark, ry: 0.08 })
  box({ x: 0.2, y: 1.2, z: 4.9, w: 2.3, h: 1.7, d: 2.4, material: metalDark })
  box({ x: 0.4, y: 1.6, z: -4.2, w: 1.2, h: 1.2, d: 2.7, material: metalDark })
  box({ x: 0.4, y: 2.2, z: -6.2, w: 0.5, h: 0.5, d: 4.3, material: metalDark })
  const rotor = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.08, 24), metalDark)
  rotor.position.set(0.4, 3.35, -6.4)
  rotor.rotation.z = 0.04
  rotor.castShadow = true
  scene.add(rotor)
  cylinder({ x: 0.4, y: 2.6, z: -6.4, radius: 0.13, height: 0.85, material: metalDark, collide: false, raycast: false })
  box({ x: -1.6, y: 0.02, z: 0, w: 0.35, h: 0.16, d: 5.6, material: metalDark })
  box({ x: 1.6, y: 0.02, z: 0, w: 0.35, h: 0.16, d: 5.6, material: metalDark })
  const fire = new THREE.PointLight(0xff6a1e, 32, 16, 2)
  fire.position.set(0, 1.5, -1.2)
  scene.add(fire)
  animated.push({ kind: 'fire', light: fire, base: 32, phase: 0 })

  const containerData = [
    { x: 11, z: -27, ry: 0.24, color: '#2c6a8f', label: 'CARGO 06' },
    { x: 18, z: -25, ry: -0.18, color: '#8a3b31', label: 'CARGO 12' },
    { x: -31, z: 6, ry: 0.52, color: '#3f6b48', label: 'CARGO 03' },
    { x: 29, z: 27, ry: 0.88, color: '#b06428', label: 'CARGO 09' },
    { x: 34, z: -4, ry: 0.02, color: '#355c78', label: 'CARGO 21' },
    { x: -12, z: 33, ry: 0.42, color: '#7a3d34', label: 'CARGO 17' },
    { x: 7, z: 35, ry: -0.35, color: '#4c6b41', label: 'CARGO 08' },
    { x: -36, z: -30, ry: 0.7, color: '#9b6a2d', label: 'CARGO 02' }
  ]
  for (const c of containerData) {
    const tex = makeContainerTexture(c.color, c.label)
    const material = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72, metalness: 0.35 })
    box({ x: c.x, z: c.z, w: 6.2, h: 2.6, d: 2.5, material, ry: c.ry })
  }

  function crateStack(x, z, count = 3, ry = 0) {
    for (let i = 0; i < count; i++) {
      const s = 1.15 + Math.random() * 0.25
      box({
        x: x + (i % 2 ? 0.7 : -0.55),
        y: i > 1 ? 1.15 : 0,
        z: z + (i > 1 ? -0.2 : 0),
        w: s,
        h: 1.1,
        d: s,
        material: woodMaterial,
        ry: ry + (Math.random() - 0.5) * 0.3
      })
    }
  }

  const crateSpots = [
    [-26, -10], [-14, -12], [24, 10], [13, 12], [-8, 24], [3, -20],
    [26, -16], [-34, -6], [12, 24], [-22, 30], [32, 12], [-4, -32]
  ]
  for (const [x, z] of crateSpots) crateStack(x, z, 2 + Math.floor(Math.random() * 3), Math.random())

  function barrier(x, z, ry = 0) {
    box({ x, z, w: 3.2, h: 1.05, d: 0.7, material: concreteMaterial, ry })
    box({ x, y: 1.05, z, w: 3.3, h: 0.14, d: 0.8, material: orange, ry })
  }
  const barrierSpots = [
    [0, 14, 0], [7, 14, 0.12], [-7, 14, -0.1], [21, 1, 1.57], [-21, -3, 1.57],
    [12, -13, 0.2], [-12, 5, -0.25], [30, 20, 0.8], [-30, 22, 0.4], [8, -8, 1.45],
    [-8, -6, 1.4], [24, 32, 0.2], [-24, -26, 1.2]
  ]
  for (const [x, z, ry] of barrierSpots) barrier(x, z, ry)

  function sandbags(x, z, ry = 0) {
    box({ x, z, w: 4.2, h: 1.15, d: 1.0, material: sandbagMaterial, ry })
    box({ x: x + 0.2, y: 1.15, z: z - 0.18, w: 3.2, h: 0.8, d: 0.9, material: sandbagMaterial, ry })
  }
  sandbags(15, 9, 0.1)
  sandbags(-15, -10, -0.3)
  sandbags(5, -19, 0.3)
  sandbags(-6, 21, -0.5)
  sandbags(27, 4, 1.5)
  sandbags(-28, -14, 1.3)

  function barrels(x, z, count = 4) {
    for (let i = 0; i < count; i++) {
      const ox = (Math.random() - 0.5) * 2.8
      const oz = (Math.random() - 0.5) * 2.8
      const barrelMat = i % 2 ? orange : new THREE.MeshStandardMaterial({ color: 0x5a4b3a, roughness: 0.8, metalness: 0.35 })
      cylinder({ x: x + ox, z: z + oz, radius: 0.38, height: 1.05, material: barrelMat })
    }
  }
  barrels(22, -10)
  barrels(-30, 14)
  barrels(16, 30)
  barrels(-6, -26)

  box({ x: -33, y: 3.8, z: 30, w: 4.2, h: 0.3, d: 4.2, material: metalDark, collide: false })
  box({ x: -33, y: 7.15, z: 30, w: 5.0, h: 0.3, d: 5.0, material: metalDark, collide: false })
  for (const [dx, dz] of [[-1.7, -1.7], [1.7, -1.7], [-1.7, 1.7], [1.7, 1.7]]) {
    box({ x: -33 + dx, z: 30 + dz, w: 0.24, h: 7.3, d: 0.24, material: metalDark })
  }
  box({ x: -33, y: 7.45, z: 30, w: 0.3, h: 0.2, d: 5.2, material: orange, collide: false })
  box({ x: -33, z: 30, w: 0.3, h: 0.2, d: 5.2, material: orange, collide: false })
  for (let i = 0; i < 6; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 1.2), metalDark)
    step.position.set(-35.1 - i * 0.45, 0.4 + i * 0.55, 30)
    step.castShadow = true
    scene.add(step)
  }

  function lamp(x, z) {
    cylinder({ x, z, radius: 0.12, height: 5.4, material: metalDark })
    box({ x, y: 5.1, z, w: 1.5, h: 0.16, d: 0.16, material: metalDark, collide: false })
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.35), new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffc35f, emissiveIntensity: 2.2 }))
    head.position.set(x + 0.62, 5.0, z)
    scene.add(head)
    const light = new THREE.PointLight(0xffc35f, 20, 14, 2)
    light.position.set(x + 0.62, 4.8, z)
    scene.add(light)
  }
  lamp(9, 11)
  lamp(-9, -4)
  lamp(24, -20)
  lamp(-24, 18)

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x6e6658, roughness: 1, metalness: 0 })
  for (let i = 0; i < 46; i++) {
    const a = Math.random() * Math.PI * 2
    const r = 14 + Math.random() * 39
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (Math.abs(x) < 4 && Math.abs(z) < 5) continue
    const size = 0.15 + Math.random() * 0.55
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), rockMat)
    rock.position.set(x, size * 0.4, z)
    rock.rotation.set(Math.random(), Math.random(), Math.random())
    rock.castShadow = true
    rock.receiveShadow = true
    scene.add(rock)
  }

  const hillMat = new THREE.MeshStandardMaterial({ color: 0x4a4c48, roughness: 1, metalness: 0 })
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + Math.random() * 0.2
    const r = 88 + Math.random() * 18
    const hill = new THREE.Mesh(new THREE.ConeGeometry(12 + Math.random() * 12, 9 + Math.random() * 12, 7), hillMat)
    hill.position.set(Math.cos(a) * r, 4, Math.sin(a) * r)
    hill.rotation.y = Math.random() * Math.PI
    scene.add(hill)
  }

  const debriMat = new THREE.MeshStandardMaterial({ color: 0x4b453c, roughness: 1 })
  for (let i = 0; i < 38; i++) {
    const a = Math.random() * Math.PI * 2
    const r = 3 + Math.random() * 10
    const piece = new THREE.Mesh(new THREE.BoxGeometry(Math.random() * 1.2 + 0.2, 0.12, Math.random() * 0.8 + 0.2), debriMat)
    piece.position.set(Math.cos(a) * r, 0.06, Math.sin(a) * r)
    piece.rotation.y = Math.random() * Math.PI
    piece.receiveShadow = true
    scene.add(piece)
  }

  spawnPoints.push(
    { x: -40, z: 40 }, { x: 40, z: 40 }, { x: -40, z: -40 }, { x: 40, z: -40 },
    { x: 0, z: 41 }, { x: 0, z: -41 }, { x: 41, z: 0 }, { x: -41, z: 0 }
  )
  for (const point of spawnPoints) point.yaw = Math.atan2(point.x, point.z)

  function update(time) {
    for (const item of animated) {
      if (item.kind === 'fire') {
        item.light.intensity = item.base * (0.72 + Math.sin(time * 14 + item.phase) * 0.16 + Math.sin(time * 31) * 0.1)
      } else {
        item.light.intensity = item.base * (0.92 + Math.sin(time * 2.4 + item.phase) * 0.08)
      }
    }
  }

  return {
    colliders,
    raycastMeshes,
    spawnPoints,
    mapHalf: MAP_HALF,
    update,
    center: new THREE.Vector3(0, 0, 0)
  }
}
