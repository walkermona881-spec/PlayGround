import * as THREE from '../vendor/three.module.min.js'

export const PITCH = {
  halfWidth: 34,
  halfLength: 52.5,
  goalHalfWidth: 3.66,
  goalHeight: 2.44,
  goalDepth: 2.1,
  penaltyDepth: 16.5,
  penaltyHalfWidth: 20.15,
  sixDepth: 5.5,
  sixHalfWidth: 9.16,
  centerCircle: 9.15
}

function makeCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}

function textureFromCanvas(canvas, repeatX = 1, repeatY = 1) {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeatX, repeatY)
  texture.anisotropy = 4
  return texture
}

function grassTexture() {
  const canvas = makeCanvas(1024, 1024)
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, 1024)
  gradient.addColorStop(0, '#17452a')
  gradient.addColorStop(0.5, '#1a4d2e')
  gradient.addColorStop(1, '#123a24')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1024, 1024)
  const stripeWidth = 128
  for (let x = 0; x < 1024; x += stripeWidth) {
    if ((x / stripeWidth) % 2 === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.035)'
      ctx.fillRect(x, 0, stripeWidth, 1024)
    }
  }
  for (let index = 0; index < 9000; index += 1) {
    const x = Math.random() * 1024
    const y = Math.random() * 1024
    const shade = Math.random()
    ctx.fillStyle = shade > 0.5 ? 'rgba(210,255,190,0.045)' : 'rgba(0,20,5,0.05)'
    ctx.fillRect(x, y, 2, Math.random() * 4 + 1)
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.028)'
  ctx.lineWidth = 2
  for (let line = 0; line < 18; line += 1) {
    ctx.beginPath()
    ctx.moveTo(0, line * 58 + Math.random() * 10)
    ctx.bezierCurveTo(300, line * 58 + 30, 700, line * 58 - 30, 1024, line * 58 + 10)
    ctx.stroke()
  }
  return textureFromCanvas(canvas, 2, 3)
}

function crowdTexture() {
  const canvas = makeCanvas(512, 256)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#0b1119'
  ctx.fillRect(0, 0, 512, 256)
  const palette = ['#e9eef5', '#d8ff3e', '#42d7f5', '#ffd45e', '#ff7a2f', '#2b5cff', '#f24343', '#18d6a4', '#8a95a5']
  for (let row = 0; row < 26; row += 1) {
    const y = 8 + row * 9.5
    ctx.fillStyle = 'rgba(255,255,255,0.045)'
    ctx.fillRect(0, y + 5, 512, 1)
    for (let col = 0; col < 110; col += 1) {
      const x = 4 + col * 4.7 + Math.random() * 1.5
      ctx.fillStyle = palette[Math.floor(Math.random() * palette.length)]
      ctx.globalAlpha = 0.35 + Math.random() * 0.6
      ctx.fillRect(x, y + (Math.random() > 0.5 ? 0 : 1), 2.4, 3)
    }
  }
  ctx.globalAlpha = 1
  const glow = ctx.createLinearGradient(0, 0, 0, 256)
  glow.addColorStop(0, 'rgba(255,255,255,0.08)')
  glow.addColorStop(1, 'rgba(0,0,0,0.25)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 512, 256)
  return textureFromCanvas(canvas, 6, 1)
}

function advertTexture() {
  const canvas = makeCanvas(2048, 128)
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#07121b'
  ctx.fillRect(0, 0, 2048, 128)
  const blocks = [
    { text: 'DLS26', color: '#d8ff3e', bg: '#0b1a12' },
    { text: 'PLAY THE DREAM', color: '#e9f1f5', bg: '#111d2a' },
    { text: 'VOLT ENERGY', color: '#42d7f5', bg: '#0a2230' },
    { text: 'ATLAS AIR', color: '#ff7a2f', bg: '#1a1010' },
    { text: 'NEXT GEN FOOTBALL', color: '#ffd45e', bg: '#14120a' },
    { text: 'THE FORGE', color: '#ff9c62', bg: '#18130f' }
  ]
  const blockWidth = 2048 / blocks.length
  blocks.forEach((block, index) => {
    const x = index * blockWidth
    ctx.fillStyle = block.bg
    ctx.fillRect(x, 0, blockWidth, 128)
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 4, 4, blockWidth - 8, 120)
    ctx.fillStyle = block.color
    ctx.font = '900 46px Arial Black, Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(block.text, x + blockWidth / 2, 66)
  })
  return textureFromCanvas(canvas, 1, 1)
}

function makeSky(scene) {
  const geometry = new THREE.SphereGeometry(260, 32, 16)
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x06121f) },
      midColor: { value: new THREE.Color(0x0d2435) },
      bottomColor: { value: new THREE.Color(0x2a3140) }
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = normalize(world.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vWorld;
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      void main() {
        float h = clamp(vWorld.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 color = mix(bottomColor, midColor, smoothstep(0.0, 0.55, h));
        color = mix(color, topColor, smoothstep(0.5, 1.0, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `
  })
  scene.add(new THREE.Mesh(geometry, material))
}

function lineMaterial() {
  return new THREE.MeshBasicMaterial({ color: 0xe9f2e6, transparent: true, opacity: 0.82 })
}

function addBox(group, x, z, width, depth, height, material, y = 0.03) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material)
  mesh.position.set(x, y, z)
  group.add(mesh)
  return mesh
}

function addRing(group, x, z, radius, material, start = 0, length = Math.PI * 2) {
  const geometry = new THREE.RingGeometry(radius - 0.055, radius + 0.055, 96, 1, start, length)
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.set(x, 0.04, z)
  group.add(mesh)
  return mesh
}

function addGoal(scene, side, postMaterial, netMaterial) {
  const group = new THREE.Group()
  const goalZ = side * (PITCH.halfLength + 0.02)
  const backZ = side * (PITCH.halfLength + PITCH.goalDepth)
  const postGeometry = new THREE.CylinderGeometry(0.075, 0.075, PITCH.goalHeight, 10)
  const barGeometry = new THREE.CylinderGeometry(0.075, 0.075, PITCH.goalHalfWidth * 2 + 0.15, 10)

  for (const x of [-PITCH.goalHalfWidth, PITCH.goalHalfWidth]) {
    const post = new THREE.Mesh(postGeometry, postMaterial)
    post.position.set(x, PITCH.goalHeight / 2, goalZ)
    post.castShadow = true
    group.add(post)
  }
  const bar = new THREE.Mesh(barGeometry, postMaterial)
  bar.rotation.z = Math.PI / 2
  bar.position.set(0, PITCH.goalHeight, goalZ)
  bar.castShadow = true
  group.add(bar)

  const vertices = []
  const pushLine = (a, b) => {
    vertices.push(a[0], a[1], a[2], b[0], b[1], b[2])
  }
  for (let x = -PITCH.goalHalfWidth; x <= PITCH.goalHalfWidth + 0.01; x += PITCH.goalHalfWidth / 6) {
    pushLine([x, 0, backZ], [x, PITCH.goalHeight, backZ])
    pushLine([x, PITCH.goalHeight, goalZ], [x, PITCH.goalHeight, backZ])
  }
  for (let y = 0; y <= PITCH.goalHeight + 0.01; y += PITCH.goalHeight / 5) {
    pushLine([-PITCH.goalHalfWidth, y, backZ], [PITCH.goalHalfWidth, y, backZ])
    pushLine([-PITCH.goalHalfWidth, y, goalZ], [-PITCH.goalHalfWidth, y, backZ])
    pushLine([PITCH.goalHalfWidth, y, goalZ], [PITCH.goalHalfWidth, y, backZ])
    pushLine([-PITCH.goalHalfWidth, y, backZ], [PITCH.goalHalfWidth, y, backZ])
  }
  for (let step = 1; step < 8; step += 1) {
    const t = step / 8
    pushLine([-PITCH.goalHalfWidth, 0, goalZ + (backZ - goalZ) * t], [-PITCH.goalHalfWidth, PITCH.goalHeight, goalZ + (backZ - goalZ) * t])
    pushLine([PITCH.goalHalfWidth, 0, goalZ + (backZ - goalZ) * t], [PITCH.goalHalfWidth, PITCH.goalHeight, goalZ + (backZ - goalZ) * t])
  }
  const netGeometry = new THREE.BufferGeometry()
  netGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  group.add(new THREE.LineSegments(netGeometry, netMaterial))
  scene.add(group)
  return group
}

function addStand(scene, crowdMap, side, axis) {
  const group = new THREE.Group()
  const tiers = 7
  const standLength = axis === 'x' ? 112 : 76
  const crowdGeometry = new THREE.PlaneGeometry(standLength, 1.42)
  const crowdMaterial = new THREE.MeshBasicMaterial({ map: crowdMap, side: THREE.DoubleSide, toneMapped: false })
  const concreteMaterial = new THREE.MeshStandardMaterial({ color: 0x0d1720, roughness: 0.9, metalness: 0.08 })

  for (let tier = 0; tier < tiers; tier += 1) {
    const distance = 40.5 + tier * 1.55
    const height = 1.1 + tier * 0.95
    if (axis === 'x') {
      const step = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, standLength), concreteMaterial)
      step.position.set(side * distance, height, 0)
      step.receiveShadow = true
      group.add(step)
      const crowd = new THREE.Mesh(crowdGeometry, crowdMaterial)
      crowd.position.set(side * (distance - 1.12), height + 0.72, 0)
      crowd.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2
      group.add(crowd)
    } else {
      const step = new THREE.Mesh(new THREE.BoxGeometry(standLength, 1.2, 2.2), concreteMaterial)
      step.position.set(0, height, side * distance)
      step.receiveShadow = true
      group.add(step)
      const crowd = new THREE.Mesh(new THREE.PlaneGeometry(standLength, 1.42), crowdMaterial)
      crowd.position.set(0, height + 0.72, side * (distance - 1.12))
      if (side < 0) crowd.rotation.y = Math.PI
      group.add(crowd)
    }
  }

  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x0a131b, roughness: 0.8, metalness: 0.35 })
  if (axis === 'x') {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(14, 0.55, standLength + 4), roofMaterial)
    roof.position.set(side * 43.5, 15.8, 0)
    roof.rotation.z = side > 0 ? -0.12 : 0.12
    group.add(roof)
  } else {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(standLength + 4, 0.55, 14), roofMaterial)
    roof.position.set(0, 15.8, side * 43.5)
    roof.rotation.x = side > 0 ? 0.12 : -0.12
    group.add(roof)
  }
  scene.add(group)
  return group
}

function addFloodlight(scene, x, z, index) {
  const group = new THREE.Group()
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x1a2530, roughness: 0.6, metalness: 0.6 })
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 27, 10), poleMaterial)
  pole.position.y = 13.5
  group.add(pole)
  const arm = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.3, 0.3), poleMaterial)
  arm.position.y = 26.2
  group.add(arm)
  const panelMaterial = new THREE.MeshBasicMaterial({ color: 0xf6fbff, toneMapped: false })
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.7, 0.18), panelMaterial)
      panel.position.set((col - 1.5) * 1.35, 27.1 + row * 0.8, 0)
      group.add(panel)
    }
  }
  const glow = new THREE.PointLight(0xdff3ff, 90, 120, 2)
  glow.position.set(0, 27, 0)
  group.add(glow)
  group.position.set(x, 0, z)
  group.rotation.y = Math.atan2(-x, -z)
  scene.add(group)
  return { group, light: glow, index }
}

function addAdBoards(scene, texture) {
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
  const group = new THREE.Group()
  const makeBoard = (x, z, rotation) => {
    const board = new THREE.Mesh(new THREE.BoxGeometry(11.5, 0.9, 0.14), material)
    board.position.set(x, 0.45, z)
    board.rotation.y = rotation
    group.add(board)
  }
  for (let z = -38; z <= 38; z += 12.6) {
    makeBoard(-36.2, z, Math.PI / 2)
    makeBoard(36.2, z, -Math.PI / 2)
  }
  for (let x = -28; x <= 28; x += 12.6) {
    makeBoard(x, -56.2, 0)
    makeBoard(x, 56.2, Math.PI)
  }
  scene.add(group)
  return group
}

export function buildStadium(scene, renderer) {
  const grass = grassTexture()
  const crowdMap = crowdTexture()
  const adMap = advertTexture()

  scene.background = new THREE.Color(0x07111a)
  scene.fog = new THREE.Fog(0x0a1824, 120, 245)

  makeSky(scene)

  const ambient = new THREE.HemisphereLight(0xbfd8ff, 0x1f3522, 1.25)
  scene.add(ambient)
  const sun = new THREE.DirectionalLight(0xeef6ff, 2.65)
  sun.position.set(36, 58, 26)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -52
  sun.shadow.camera.right = 52
  sun.shadow.camera.top = 66
  sun.shadow.camera.bottom = -66
  sun.shadow.camera.near = 1
  sun.shadow.camera.far = 160
  sun.shadow.bias = -0.0004
  sun.shadow.normalBias = 0.02
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0x7ea8ce, 0.7)
  fill.position.set(-40, 30, -24)
  scene.add(fill)

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(220, 250),
    new THREE.MeshStandardMaterial({ color: 0x0a1417, roughness: 1 })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.05
  ground.receiveShadow = true
  scene.add(ground)

  const pitch = new THREE.Mesh(
    new THREE.PlaneGeometry(PITCH.halfWidth * 2 + 4, PITCH.halfLength * 2 + 5),
    new THREE.MeshStandardMaterial({ map: grass, roughness: 0.94, metalness: 0.02 })
  )
  pitch.rotation.x = -Math.PI / 2
  pitch.position.y = 0
  pitch.receiveShadow = true
  scene.add(pitch)

  const lineMat = lineMaterial()
  const lineGroup = new THREE.Group()
  const lineWidth = 0.12
  addBox(lineGroup, 0, -PITCH.halfLength, PITCH.halfWidth * 2, lineWidth, 0.025, lineMat)
  addBox(lineGroup, 0, PITCH.halfLength, PITCH.halfWidth * 2, lineWidth, 0.025, lineMat)
  addBox(lineGroup, -PITCH.halfWidth, 0, lineWidth, PITCH.halfLength * 2, 0.025, lineMat)
  addBox(lineGroup, PITCH.halfWidth, 0, lineWidth, PITCH.halfLength * 2, 0.025, lineMat)
  addBox(lineGroup, 0, 0, PITCH.halfWidth * 2, lineWidth, 0.025, lineMat)
  addRing(lineGroup, 0, 0, PITCH.centerCircle, lineMat)
  const centerSpot = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), lineMat)
  centerSpot.rotation.x = -Math.PI / 2
  centerSpot.position.set(0, 0.04, 0)
  lineGroup.add(centerSpot)

  for (const side of [-1, 1]) {
    const goalZ = side * PITCH.halfLength
    const boxZ = goalZ - side * PITCH.penaltyDepth
    const sixZ = goalZ - side * PITCH.sixDepth
    addBox(lineGroup, 0, boxZ, PITCH.penaltyHalfWidth * 2, lineWidth, 0.025, lineMat)
    addBox(lineGroup, -PITCH.penaltyHalfWidth, goalZ - (side * PITCH.penaltyDepth) / 2, lineWidth, PITCH.penaltyDepth, 0.025, lineMat)
    addBox(lineGroup, PITCH.penaltyHalfWidth, goalZ - (side * PITCH.penaltyDepth) / 2, lineWidth, PITCH.penaltyDepth, 0.025, lineMat)
    addBox(lineGroup, 0, sixZ, PITCH.sixHalfWidth * 2, lineWidth, 0.025, lineMat)
    addBox(lineGroup, -PITCH.sixHalfWidth, goalZ - (side * PITCH.sixDepth) / 2, lineWidth, PITCH.sixDepth, 0.025, lineMat)
    addBox(lineGroup, PITCH.sixHalfWidth, goalZ - (side * PITCH.sixDepth) / 2, lineWidth, PITCH.sixDepth, 0.025, lineMat)
    const penaltySpot = new THREE.Mesh(new THREE.CircleGeometry(0.16, 20), lineMat)
    penaltySpot.rotation.x = -Math.PI / 2
    penaltySpot.position.set(0, 0.04, goalZ - side * 11)
    lineGroup.add(penaltySpot)
    addRing(lineGroup, 0, goalZ - side * 11, 9.15, lineMat, side > 0 ? 0.22 : Math.PI + 0.22, Math.PI - 0.44)
    addRing(lineGroup, -PITCH.halfWidth, side * PITCH.halfLength, 1, lineMat, side > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI / 2)
    addRing(lineGroup, PITCH.halfWidth, side * PITCH.halfLength, 1, lineMat, side > 0 ? Math.PI : 0, Math.PI / 2)
  }
  scene.add(lineGroup)

  const postMaterial = new THREE.MeshStandardMaterial({ color: 0xf4f8f8, emissive: 0x222a2c, roughness: 0.4, metalness: 0.2 })
  const netMaterial = new THREE.LineBasicMaterial({ color: 0xdde8ea, transparent: true, opacity: 0.35 })
  addGoal(scene, 1, postMaterial, netMaterial)
  addGoal(scene, -1, postMaterial, netMaterial)

  addStand(scene, crowdMap, -1, 'x')
  addStand(scene, crowdMap, 1, 'x')
  addStand(scene, crowdMap, -1, 'z')
  addStand(scene, crowdMap, 1, 'z')

  const floodlights = []
  const corners = [
    [-45, -63], [45, -63], [-45, 63], [45, 63]
  ]
  corners.forEach(([x, z], index) => floodlights.push(addFloodlight(scene, x, z, index)))

  addAdBoards(scene, adMap)

  const tunnelMaterial = new THREE.MeshStandardMaterial({ color: 0x081019, roughness: 0.8 })
  const tunnel = new THREE.Mesh(new THREE.BoxGeometry(7.2, 4.2, 8), tunnelMaterial)
  tunnel.position.set(0, 2.1, -64.5)
  scene.add(tunnel)
  const tunnelGlow = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3), new THREE.MeshBasicMaterial({ color: 0x18364a }))
  tunnelGlow.position.set(0, 1.8, -60.4)
  scene.add(tunnelGlow)

  const benchMaterial = new THREE.MeshStandardMaterial({ color: 0x14222e, roughness: 0.75 })
  for (const side of [-1, 1]) {
    const bench = new THREE.Mesh(new THREE.BoxGeometry(9, 0.8, 1.6), benchMaterial)
    bench.position.set(side * 20, 0.45, -57.5)
    scene.add(bench)
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(9.8, 0.15, 2.4), new THREE.MeshStandardMaterial({ color: 0x0c1822 }))
    canopy.position.set(side * 20, 2.8, -57.8)
    scene.add(canopy)
  }

  const flagMaterial = new THREE.MeshStandardMaterial({ color: 0xd8ff3e, side: THREE.DoubleSide, roughness: 0.8 })
  for (const [x, z] of [[-PITCH.halfWidth, -PITCH.halfLength], [PITCH.halfWidth, -PITCH.halfLength], [-PITCH.halfWidth, PITCH.halfLength], [PITCH.halfWidth, PITCH.halfLength]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), postMaterial)
    pole.position.set(x, 0.8, z)
    scene.add(pole)
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.34), flagMaterial)
    flag.position.set(x + 0.28, 1.4, z)
    flag.rotation.y = Math.PI / 2
    scene.add(flag)
  }

  return {
    sun,
    floodlights,
    update: (elapsed) => {
      adMap.offset.x = (elapsed * 0.015) % 1
      floodlights.forEach((light, index) => {
        light.light.intensity = 86 + Math.sin(elapsed * 1.7 + index) * 4
      })
    },
    dispose: () => {
      scene.remove(lineGroup)
      lineGroup.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
        if (object.material && object.material !== lineMat) object.material.dispose?.()
      })
    }
  }
}
