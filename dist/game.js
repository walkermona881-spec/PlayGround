import * as THREE from './vendor/three.module.min.js'
import { WEAPONS, SECONDARY, PERKS, BOT_NAMES, BOT_TITLES, buildWeaponModel } from './weapons.js'
import { buildWorld } from './world.js'
import { AudioEngine } from './audio.js'

const MATCH_TIME = 300
const SCORE_LIMIT = 30
const MAX_BOTS = 5
const PLAYER_RADIUS = 0.38
const EYE_HEIGHT = 1.68
const CROUCH_HEIGHT = 1.12
const GRAVITY = 17
const UP = new THREE.Vector3(0, 1, 0)
const FORWARD = new THREE.Vector3(0, 0, -1)
const RIGHT = new THREE.Vector3(1, 0, 0)

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function makeFlashTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 62)
  grad.addColorStop(0, 'rgba(255,255,245,1)')
  grad.addColorStop(0.18, 'rgba(255,220,120,1)')
  grad.addColorStop(0.45, 'rgba(255,130,30,0.7)')
  grad.addColorStop(1, 'rgba(255,80,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function makeSparkTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,220,1)')
  grad.addColorStop(0.4, 'rgba(255,170,60,0.8)')
  grad.addColorStop(1, 'rgba(255,80,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function makeSky() {
  const geometry = new THREE.SphereGeometry(240, 32, 16)
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x13253f) },
      midColor: { value: new THREE.Color(0x6f6b78) },
      bottomColor: { value: new THREE.Color(0xf0ac6f) }
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        vec3 color = mix(bottomColor, midColor, smoothstep(-0.02, 0.22, h));
        color = mix(color, topColor, smoothstep(0.16, 0.72, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  return mesh
}

function makeHealthBarTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 24
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 128, 24)
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, 4, 128, 16)
  ctx.fillStyle = '#ff4d3d'
  ctx.fillRect(2, 6, 124, 12)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return { canvas, ctx, texture }
}

function makeNameTexture(name) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 48
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 256, 48)
  ctx.font = 'bold 26px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.lineWidth = 5
  ctx.strokeStyle = 'rgba(0,0,0,0.7)'
  ctx.strokeText(name, 128, 25)
  ctx.fillStyle = '#ffdfc2'
  ctx.fillText(name, 128, 25)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function makeSunSprite() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(128, 128, 4, 128, 128, 126)
  grad.addColorStop(0, 'rgba(255,250,230,1)')
  grad.addColorStop(0.16, 'rgba(255,228,170,0.95)')
  grad.addColorStop(0.38, 'rgba(255,160,80,0.4)')
  grad.addColorStop(1, 'rgba(255,120,40,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(62, 62, 1)
  return sprite
}

class Bot {
  constructor(game, index) {
    this.game = game
    this.index = index
    this.name = BOT_NAMES[index % BOT_NAMES.length]
    this.title = BOT_TITLES[index % BOT_TITLES.length]
    this.maxHealth = 100
    this.health = 100
    this.alive = false
    this.pos = new THREE.Vector3()
    this.vel = new THREE.Vector3()
    this.yaw = 0
    this.targetYaw = 0
    this.deadTimer = 0
    this.fireTimer = 1 + Math.random()
    this.burst = 0
    this.strafeDir = Math.random() > 0.5 ? 1 : -1
    this.strafeTimer = 0
    this.reaction = 0
    this.lastSeen = -99
    this.lastShot = -99
    this.time = 0
    this.walkPhase = Math.random() * 6
    this.targetPos = new THREE.Vector3(Math.random() * 50 - 25, 0, Math.random() * 50 - 25)
    this.patrolTimer = Math.random() * 4
    this.blind = 0
    this.hitFlash = 0
    this.healthVisible = false
    this.weaponId = ['m4', 'mp5', 'ak47', 'm4', 'dlq'][index % 5]
    this.weapon = this.weaponId === 'dlq' ? WEAPONS.dlq : this.weaponId === 'mp5' ? WEAPONS.mp5 : this.weaponId === 'ak47' ? WEAPONS.ak47 : WEAPONS.m4
    this.speed = this.weaponId === 'dlq' ? 2.5 : this.weaponId === 'mp5' ? 3.6 : 3.1
    this.skill = 0.85 + Math.random() * 0.3
    this.build()
  }

  build() {
    const group = new THREE.Group()
    const armor = new THREE.MeshStandardMaterial({ color: 0x39443c, roughness: 0.82, metalness: 0.08 })
    const armorDark = new THREE.MeshStandardMaterial({ color: 0x1e2523, roughness: 0.88, metalness: 0.05 })
    const skin = new THREE.MeshStandardMaterial({ color: 0x8f6247, roughness: 0.85, metalness: 0 })
    const accent = new THREE.MeshStandardMaterial({ color: 0xd8452f, roughness: 0.6, metalness: 0.2, emissive: 0x6b1008, emissiveIntensity: 0.4 })
    const steel = new THREE.MeshStandardMaterial({ color: 0x22272b, roughness: 0.45, metalness: 0.6 })

    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 0.72, 4, 10), armor)
    body.position.y = 1.12
    body.castShadow = true
    body.receiveShadow = true
    body.userData = { bot: this, part: 'body' }
    group.add(body)

    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.48, 0.4), armorDark)
    vest.position.set(0, 1.18, 0.02)
    vest.castShadow = true
    group.add(vest)

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.36), accent)
    belt.position.set(0, 0.92, 0.02)
    group.add(belt)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.225, 12, 10), skin)
    head.position.y = 1.92
    head.castShadow = true
    head.userData = { bot: this, part: 'head' }
    group.add(head)

    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.255, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.58), armorDark)
    helmet.position.y = 1.98
    helmet.castShadow = true
    group.add(helmet)

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.1), accent)
    visor.position.set(0, 1.94, -0.19)
    visor.rotation.x = -0.12
    group.add(visor)

    this.legs = []
    for (const side of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.72, 0.22), armorDark)
      leg.position.set(0.16 * side, 0.38, 0)
      leg.castShadow = true
      group.add(leg)
      this.legs.push(leg)
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.32), steel)
      boot.position.set(0.16 * side, 0.08, -0.04)
      group.add(boot)
    }

    this.arms = []
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.18), armor)
      arm.position.set(0.34 * side, 1.28, -0.02)
      arm.rotation.x = -0.9
      arm.rotation.z = 0.18 * side
      arm.castShadow = true
      group.add(arm)
      this.arms.push(arm)
    }

    const gun = buildWeaponModel(this.weaponId, { hands: false, scale: 0.9 })
    gun.group.position.set(0.27, 1.22, -0.42)
    gun.group.rotation.set(0.02, -0.06, 0)
    group.add(gun.group)
    this.gun = gun.group
    this.muzzle = gun.muzzle

    const bar = makeHealthBarTexture()
    this.barCanvas = bar.canvas
    this.barCtx = bar.ctx
    this.barTexture = bar.texture
    this.healthBar = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.barTexture, transparent: true, depthWrite: false }))
    this.healthBar.scale.set(1.35, 0.25, 1)
    this.healthBar.position.set(0, 2.4, 0)
    this.healthBar.visible = false
    group.add(this.healthBar)

    this.nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeNameTexture(this.name), transparent: true, depthWrite: false }))
    this.nameSprite.scale.set(1.75, 0.33, 1)
    this.nameSprite.position.set(0, 2.66, 0)
    this.nameSprite.visible = false
    group.add(this.nameSprite)

    this.hitMeshes = [body, head]
    this.group = group
    this.bodyMesh = body
    this.headMesh = head
    this.materials = [armor, armorDark, accent, skin]
    group.visible = false
    this.game.scene.add(group)
  }

  drawHealthBar() {
    const ratio = clamp(this.health / this.maxHealth, 0, 1)
    const ctx = this.barCtx
    ctx.clearRect(0, 0, 128, 24)
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 4, 128, 16)
    ctx.fillStyle = ratio > 0.55 ? '#67d36a' : ratio > 0.25 ? '#ffb02e' : '#ff4d3d'
    ctx.fillRect(2, 6, Math.max(0, 124 * ratio), 12)
    this.barTexture.needsUpdate = true
  }

  spawn(avoid = null) {
    const points = this.game.world.spawnPoints
    let best = points[0]
    let bestScore = -1
    for (const point of points) {
      let score = 999
      if (avoid) score = Math.min(score, Math.hypot(point.x - avoid.x, point.z - avoid.z))
      for (const other of this.game.bots) {
        if (other === this || !other.alive) continue
        score = Math.min(score, Math.hypot(point.x - other.pos.x, point.z - other.pos.z))
      }
      score += Math.random() * 4
      if (score > bestScore) {
        bestScore = score
        best = point
      }
    }
    this.pos.set(best.x + (Math.random() - 0.5) * 3, 0, best.z + (Math.random() - 0.5) * 3)
    this.vel.set(0, 0, 0)
    this.yaw = Math.atan2(this.pos.x, this.pos.z)
    this.targetYaw = this.yaw
    this.health = this.maxHealth
    this.alive = true
    this.deadTimer = 0
    this.blind = 0
    this.reaction = 0
    this.lastSeen = -99
    this.group.visible = true
    this.group.position.set(this.pos.x, 0, this.pos.z)
    this.group.rotation.y = this.yaw
    this.targetPos.set((Math.random() - 0.5) * 60, 0, (Math.random() - 0.5) * 60)
    this.patrolTimer = Math.random() * 3
    this.drawHealthBar()
    this.healthBar.visible = false
    this.nameSprite.visible = false
    this.hitFlash = 0
    for (const material of this.materials) material.emissive.setHex(0x000000)
  }

  damage(amount, info = {}) {
    if (!this.alive) return false
    this.health -= amount
    this.hitFlash = 0.12
    this.drawHealthBar()
    this.healthBar.visible = true
    this.game.alertBot(this)
    if (this.health <= 0) {
      this.die(info)
      return true
    }
    return false
  }

  die(info = {}) {
    if (!this.alive) return
    this.alive = false
    this.group.visible = false
    this.deadTimer = 3.4
    this.game.effects.deathBurst(this.pos, 0x9fd0ff)
    if (info.byPlayer) {
      this.game.registerPlayerKill(this, info)
    }
  }

  canSeePlayer() {
    const player = this.game.player
    if (!player.alive) return false
    const eye = new THREE.Vector3(this.pos.x, 1.7, this.pos.z)
    const target = new THREE.Vector3(player.pos.x, player.pos.y + 1.35, player.pos.z)
    if (eye.distanceTo(target) > 62) return false
    return this.game.hasLineOfSight(eye, target)
  }

  move(dt, dir, speed) {
    if (dir.lengthSq() < 0.0001) return
    dir.normalize()
    this.pos.x += dir.x * speed * dt
    this.pos.z += dir.z * speed * dt
    this.game.resolveCircle(this.pos, 0.34, 1.95)
    for (const other of this.game.bots) {
      if (other === this || !other.alive) continue
      const dx = this.pos.x - other.pos.x
      const dz = this.pos.z - other.pos.z
      const d = Math.hypot(dx, dz)
      if (d > 0.001 && d < 0.9) {
        this.pos.x += (dx / d) * (0.9 - d) * 0.5
        this.pos.z += (dz / d) * (0.9 - d) * 0.5
      }
    }
    this.walkPhase += dt * speed * 3.4
  }

  update(dt) {
    const game = this.game
    this.time += dt
    if (!this.alive) {
      this.deadTimer -= dt
      if (this.deadTimer <= 0 && game.state !== 'over' && game.state !== 'menu') this.spawn(game.player.pos)
      return
    }
    if (game.state !== 'playing') return
    if (this.blind > 0) this.blind -= dt
    this.reaction -= dt
    this.strafeTimer -= dt
    this.fireTimer -= dt
    if (this.strafeTimer <= 0) {
      this.strafeTimer = 1.2 + Math.random() * 1.8
      this.strafeDir *= -1
    }

    const player = game.player
    const toPlayer = new THREE.Vector3(player.pos.x - this.pos.x, 0, player.pos.z - this.pos.z)
    const dist = toPlayer.length()
    const sees = this.blind <= 0 && this.canSeePlayer()
    if (sees) {
      if (this.time - this.lastSeen > 0.4) this.reaction = 0.32 + Math.random() * 0.35
      this.lastSeen = this.time
    }

    let desired = new THREE.Vector3()
    let speed = this.speed
    const engage = sees || (this.time - this.lastSeen < 2.4 && dist < 55)
    if (engage && player.alive) {
      const preferred = this.weaponId === 'dlq' ? 24 : this.weaponId === 'mp5' ? 7 : 14
      if (dist > preferred + 3) {
        desired.copy(toPlayer).normalize()
      } else if (dist < preferred - 3) {
        desired.copy(toPlayer).normalize().multiplyScalar(-1)
      } else {
        desired.set(-toPlayer.z, 0, toPlayer.x).normalize().multiplyScalar(this.strafeDir)
      }
      if (sees) {
        desired.add(new THREE.Vector3((Math.random() - 0.5) * 0.28, 0, (Math.random() - 0.5) * 0.28))
        if (this.reaction <= 0) speed *= 0.65
      }
      this.targetYaw = Math.atan2(-toPlayer.x, -toPlayer.z)
    } else if (this.time - this.lastSeen < 4) {
      desired.set(player.pos.x - this.pos.x, 0, player.pos.z - this.pos.z)
      if (desired.lengthSq() < 0.5) desired.set(0, 0, 0)
      this.targetYaw = Math.atan2(-desired.x, -desired.z)
    } else {
      this.patrolTimer -= dt
      const toTarget = new THREE.Vector3(this.targetPos.x - this.pos.x, 0, this.targetPos.z - this.pos.z)
      if (toTarget.length() < 2 || this.patrolTimer <= 0) {
        this.targetPos.set((Math.random() - 0.5) * 74, 0, (Math.random() - 0.5) * 74)
        this.patrolTimer = 4 + Math.random() * 5
      }
      desired.copy(toTarget)
      if (desired.lengthSq() > 0.01) this.targetYaw = Math.atan2(-desired.x, -desired.z)
    }

    if (desired.lengthSq() > 0.01) {
      this.move(dt, desired, speed)
    }

    let yawDiff = this.targetYaw - this.yaw
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2
    this.yaw += yawDiff * Math.min(1, dt * 8)
    this.group.position.set(this.pos.x, this.pos.y || 0, this.pos.z)
    this.group.rotation.y = this.yaw

    const moving = desired.lengthSq() > 0.01
    const swing = moving ? Math.sin(this.walkPhase) * 0.55 : 0
    this.legs[0].rotation.x = swing
    this.legs[1].rotation.x = -swing
    this.group.position.y = moving ? Math.abs(Math.sin(this.walkPhase * 2)) * 0.035 : 0

    if (this.hitFlash > 0) {
      this.hitFlash -= dt
      const intensity = this.hitFlash > 0 ? 0.9 : 0
      for (const material of this.materials) material.emissive.setRGB(intensity * 0.7, 0, 0)
    } else {
      for (const material of this.materials) material.emissive.setHex(0x000000)
      this.materials[2].emissive.setHex(0x6b1008)
      this.materials[2].emissiveIntensity = 0.4
    }

    const showBar = this.health < this.maxHealth || dist < 16
    this.healthBar.visible = showBar
    this.nameSprite.visible = dist < 32 && sees

    if (sees && player.alive && this.reaction <= 0 && this.fireTimer <= 0 && this.blind <= 0) {
      this.shootAtPlayer(dist)
    }
  }

  shootAtPlayer(dist) {
    const game = this.game
    const player = game.player
    this.lastShot = this.time
    const pan = clamp((this.pos.x - player.pos.x) / 30, -1, 1)
    game.audio.shot('enemy', pan)
    const muzzleWorld = new THREE.Vector3(0.27, 1.22, -1.2).applyMatrix4(this.group.matrixWorld)
    game.effects.muzzleFlash(muzzleWorld, 0.7)
    this.gun.position.z += 0.06
    this.gun.rotation.x -= 0.05
    setTimeout(() => {
      if (this.gun) {
        this.gun.position.z -= 0.06
        this.gun.rotation.x += 0.05
      }
    }, 45)
    if (this.blind > 0) return
    const accuracy = clamp(0.82 - dist * 0.011 - (this.weaponId === 'mp5' ? 0.03 : 0), 0.22, 0.82)
    const hit = Math.random() < accuracy * this.skill
    const target = new THREE.Vector3(player.pos.x, player.pos.y + 1.25, player.pos.z)
    const miss = new THREE.Vector3((Math.random() - 0.5) * 2.2, Math.random() * 1.1, (Math.random() - 0.5) * 2.2)
    const end = hit ? target : target.clone().add(miss)
    game.effects.tracer(muzzleWorld, end, 0xff7c3c, 0.05)
    if (hit) {
      const base = this.weaponId === 'dlq' ? 34 : this.weaponId === 'mp5' ? 7 : this.weaponId === 'ak47' ? 12 : 10
      const falloff = clamp(1 - dist / 90, 0.55, 1)
      game.damagePlayer(base * falloff, this)
    }
    this.burst -= 1
    this.fireTimer = this.burst > 0 ? 0.14 + Math.random() * 0.06 : 0.75 + Math.random() * 0.75
    if (this.burst <= 0) this.burst = 2 + Math.floor(Math.random() * 3)
  }
}

export class Game {
  constructor(canvas, minimapCanvas, callbacks = {}) {
    this.canvas = canvas
    this.minimapCanvas = minimapCanvas
    this.callbacks = callbacks
    this.audio = new AudioEngine()
    this.settings = { sensitivity: 1, fov: 78, volume: 0.7, quality: 'high', invertY: false }
    this.loadout = { primary: 'm4', perk: 'fastHands', secondary: 'pistol' }
    this.state = 'menu'
    this.elapsed = 0
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
    this.menuAngle = 0.4

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(0xc79462, 42, 165)
    this.scene.add(makeSky())
    const sun = makeSunSprite()
    sun.position.set(-105, 44, -140)
    this.scene.add(sun)

    const hemi = new THREE.HemisphereLight(0xb9d2ff, 0x8f5b34, 0.9)
    this.scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffd1a0, 3.1)
    dir.position.set(38, 58, 24)
    dir.castShadow = true
    dir.shadow.mapSize.set(2048, 2048)
    dir.shadow.camera.left = -58
    dir.shadow.camera.right = 58
    dir.shadow.camera.top = 58
    dir.shadow.camera.bottom = -58
    dir.shadow.camera.near = 1
    dir.shadow.camera.far = 160
    dir.shadow.bias = -0.0004
    dir.shadow.normalBias = 0.03
    this.scene.add(dir)
    this.sunLight = dir
    const fill = new THREE.DirectionalLight(0x7f9fce, 0.55)
    fill.position.set(-30, 22, -24)
    this.scene.add(fill)

    this.camera = new THREE.PerspectiveCamera(this.settings.fov, window.innerWidth / window.innerHeight, 0.06, 360)
    this.camera.rotation.order = 'YXZ'
    this.camera.position.set(0, EYE_HEIGHT, 10)
    this.scene.add(this.camera)

    this.viewScene = new THREE.Scene()
    this.viewCamera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 6)
    this.viewScene.add(new THREE.HemisphereLight(0xdfe9ff, 0x4c3a2c, 1.5))
    const viewLight = new THREE.DirectionalLight(0xffd9b0, 2.4)
    viewLight.position.set(1.2, 2.4, 1.6)
    this.viewScene.add(viewLight)
    this.viewMuzzleLight = new THREE.PointLight(0xffb25a, 0, 3, 2)
    this.viewMuzzleLight.position.set(0.25, 0.1, -0.9)
    this.viewScene.add(this.viewMuzzleLight)

    this.weaponHolder = new THREE.Group()
    this.viewScene.add(this.weaponHolder)
    this.muzzleFlashSprite = null
    this.muzzleFlashTimer = 0
    this.worldMuzzleLight = new THREE.PointLight(0xffb25a, 0, 12, 2)
    this.scene.add(this.worldMuzzleLight)

    this.world = buildWorld(this.scene)
    this.effects = new Effects(this)
    this.raycaster = new THREE.Raycaster()
    this.raycaster.far = 220

    this.player = {
      pos: new THREE.Vector3(0, 0, 0),
      vel: new THREE.Vector3(),
      yaw: 0,
      pitch: 0,
      eye: EYE_HEIGHT,
      health: 100,
      maxHealth: 100,
      alive: true,
      onGround: true,
      crouch: false,
      sprint: false,
      bob: 0,
      bobPhase: 0,
      recoilPitch: 0,
      recoilYaw: 0,
      kills: 0,
      deaths: 0,
      shots: 0,
      hits: 0,
      headshots: 0,
      streak: 0,
      bestStreak: 0,
      lastDamage: -99,
      invuln: 0,
      respawnTimer: 0,
      deathAnim: 0
    }

    this.keys = new Set()
    this.input = { firing: false, ads: false, jump: false, touchMove: { x: 0, z: 0 } }
    this.firePressed = false

    this.match = {
      scorePlayer: 0,
      scoreEnemy: 0,
      time: MATCH_TIME,
      countdown: 0,
      lastCount: -1
    }
    this.slots = []
    this.activeSlotIndex = 0
    this.reloading = false
    this.reloadTimer = 0
    this.reloadDuration = 0
    this.autoReloadTimer = 0
    this.fireCooldown = 0
    this.switchTimer = 0
    this.adsAmount = 0
    this.weaponKick = 0
    this.weaponSwayX = 0
    this.weaponSwayY = 0
    this.semiQueued = false
    this.grenades = { lethal: 1, tactical: 1 }
    this.grenadeObjects = []
    this.uavTimer = 0
    this.lastHudUpdate = 0
    this.lastMinimapUpdate = 0
    this.weaponModel = null
    this.muzzle = null
    this.shake = 0
    this.menuOrbit = 0
    this.flashOverlay = 0
    this.stepTimer = 0
    this.killStreakNotice = 0
    this.stats = { damageDealt: 0, longestStreak: 0 }
    this.bots = []
    this.buildBots()
    this.setupMinimapBase()
    this.bindEvents()
    this.applyQuality(this.settings.quality)
    this.resetWeaponSlots()
    this.clock = new THREE.Clock()
    this.loop = this.loop.bind(this)
    requestAnimationFrame(this.loop)
  }

  buildBots() {
    for (let i = 0; i < MAX_BOTS; i++) this.bots.push(new Bot(this, i))
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize())
    document.addEventListener('contextmenu', (event) => {
      if (this.state === 'playing') event.preventDefault()
    })
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return
      const code = event.code
      if (code === 'KeyP' && (this.state === 'playing' || this.state === 'paused')) {
        this.callbacks.onPauseToggle?.()
        return
      }
      if (code === 'Escape' && this.state === 'playing' && this.isTouch) {
        this.callbacks.onPauseToggle?.()
        return
      }
      if (this.state !== 'playing' && this.state !== 'countdown') return
      if (['Space', 'ControlLeft', 'ShiftLeft', 'KeyC'].includes(code)) event.preventDefault()
      this.keys.add(code)
      if (code === 'KeyR') this.reload()
      if (code === 'KeyG') this.throwGrenade('lethal')
      if (code === 'KeyQ') this.throwGrenade('tactical')
      if (code === 'Digit1') this.switchWeapon(0)
      if (code === 'Digit2') this.switchWeapon(1)
      if (code === 'Space') this.jump()
      if (code === 'KeyC') this.toggleCrouch()
      if (code === 'KeyM') this.callbacks.onMuteToggle?.()
    })
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code)
    })
    this.canvas.addEventListener('mousedown', (event) => {
      if (this.state !== 'playing') return
      this.audio.resume()
      if (document.pointerLockElement !== this.canvas && !this.isTouch) {
        this.requestPointerLock()
        return
      }
      if (event.button === 0) {
        this.input.firing = true
        this.firePressed = true
        const slot = this.activeSlot
        if (slot && !slot.def.auto) this.shootOnce()
      } else if (event.button === 2) {
        this.input.ads = true
      }
    })
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) {
        this.input.firing = false
        this.firePressed = false
      } else if (event.button === 2) {
        this.input.ads = false
      }
    })
    document.addEventListener('mousemove', (event) => {
      if (this.state !== 'playing' || document.pointerLockElement !== this.canvas) return
      this.look(event.movementX, event.movementY)
    })
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== this.canvas && this.state === 'playing' && !this.isTouch) {
        this.callbacks.onPauseToggle?.()
      }
    })
    this.canvas.addEventListener('click', () => {
      if (this.state === 'playing' && document.pointerLockElement !== this.canvas && !this.isTouch) {
        this.requestPointerLock()
      }
    })
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === 'playing') this.callbacks.onPauseToggle?.()
    })
  }

  requestPointerLock() {
    if (this.isTouch) return
    this.canvas.requestPointerLock?.()
  }

  exitPointerLock() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock?.()
  }

  applyQuality(quality) {
    this.settings.quality = quality
    const low = quality === 'low'
    this.renderer.shadowMap.enabled = !low
    this.sunLight.castShadow = !low
    this.renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.sunLight.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048)
    if (this.sunLight.shadow.map) {
      this.sunLight.shadow.map.dispose()
      this.sunLight.shadow.map = null
    }
  }

  setSettings(settings) {
    Object.assign(this.settings, settings)
    this.audio.setVolume(this.settings.volume)
    this.camera.fov = this.settings.fov
    this.camera.updateProjectionMatrix()
    this.applyQuality(this.settings.quality)
  }

  setLoadout(loadout) {
    this.loadout = { ...this.loadout, ...loadout }
  }

  get activeSlot() {
    return this.slots[this.activeSlotIndex]
  }

  get reloadMultiplier() {
    return this.loadout.perk === 'fastHands' ? 0.75 : 1
  }

  get speedMultiplier() {
    return this.loadout.perk === 'lightweight' ? 1.12 : 1
  }

  resetWeaponSlots() {
    const primary = WEAPONS[this.loadout.primary] || WEAPONS.m4
    this.slots = [
      { def: primary, ammo: primary.mag, reserve: primary.reserve },
      { def: SECONDARY, ammo: SECONDARY.mag, reserve: SECONDARY.reserve }
    ]
    this.activeSlotIndex = 0
    this.reloading = false
    this.reloadTimer = 0
    this.fireCooldown = 0
    this.switchTimer = 0
    this.buildViewModel()
  }

  buildViewModel() {
    if (this.weaponModel) {
      this.weaponHolder.remove(this.weaponModel)
      this.weaponModel.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
      })
    }
    const slot = this.activeSlot
    if (!slot) return
    const built = buildWeaponModel(slot.def.id)
    this.weaponModel = built.group
    this.muzzle = built.muzzle
    this.weaponHolder.add(this.weaponModel)
    const flashTexture = makeFlashTexture()
    const spriteMaterial = new THREE.SpriteMaterial({ map: flashTexture, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending })
    this.muzzleFlashSprite = new THREE.Sprite(spriteMaterial)
    this.muzzleFlashSprite.scale.set(0.34, 0.34, 1)
    this.muzzleFlashSprite.position.copy(this.muzzle.position)
    this.muzzleFlashSprite.visible = false
    this.weaponModel.add(this.muzzleFlashSprite)
    this.weaponHolder.position.set(slot.def.viewPos[0], slot.def.viewPos[1], slot.def.viewPos[2])
  }

  setupMinimapBase() {
    this.minimapBase = document.createElement('canvas')
    this.minimapBase.width = this.minimapCanvas.width
    this.minimapBase.height = this.minimapCanvas.height
    const ctx = this.minimapBase.getContext('2d')
    const size = this.minimapBase.width
    const half = this.world.mapHalf + 2
    const scale = size / (half * 2)
    ctx.fillStyle = 'rgba(10,14,17,0.78)'
    ctx.fillRect(0, 0, size, size)
    ctx.strokeStyle = 'rgba(255,138,30,0.35)'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, size - 2, size - 2)
    ctx.fillStyle = 'rgba(126,136,140,0.55)'
    for (const collider of this.world.colliders) {
      const x = size / 2 + collider.minX * scale
      const y = size / 2 + collider.minZ * scale
      const w = Math.max(1, (collider.maxX - collider.minX) * scale)
      const h = Math.max(1, (collider.maxZ - collider.minZ) * scale)
      ctx.fillRect(x, y, w, h)
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.beginPath()
    ctx.moveTo(size / 2, 0)
    ctx.lineTo(size / 2, size)
    ctx.moveTo(0, size / 2)
    ctx.lineTo(size, size / 2)
    ctx.stroke()
    this.minimapScale = scale
  }

  startMatch(loadout = this.loadout) {
    this.setLoadout(loadout)
    this.audio.resume()
    this.state = 'countdown'
    this.match.scorePlayer = 0
    this.match.scoreEnemy = 0
    this.match.time = MATCH_TIME
    this.match.countdown = 3.4
    this.match.lastCount = -1
    this.uavTimer = 0
    this.grenades = { lethal: 1, tactical: 1 }
    this.effects.clear()
    this.player.health = this.player.maxHealth
    this.player.alive = true
    this.player.kills = 0
    this.player.deaths = 0
    this.player.shots = 0
    this.player.hits = 0
    this.player.headshots = 0
    this.player.streak = 0
    this.player.bestStreak = 0
    this.player.pitch = 0
    this.player.recoilPitch = 0
    this.player.recoilYaw = 0
    this.player.invuln = 1
    this.player.deathAnim = 0
    this.stats = { damageDealt: 0, longestStreak: 0 }
    this.resetWeaponSlots()
    this.spawnPlayer()
    for (const bot of this.bots) {
      bot.alive = false
      bot.group.visible = false
      bot.deadTimer = 0
      bot.spawn(this.player.pos)
    }
    this.flashOverlay = 0
    this.shake = 0
    this.audio.spawn()
    this.callbacks.onMatchStart?.()
    this.callbacks.onState?.(this.state)
    this.callbacks.onCountdown?.(3)
    this.updateCamera(0)
    if (!this.isTouch) this.requestPointerLock()
  }

  spawnPlayer() {
    const points = this.world.spawnPoints
    let best = points[0]
    let bestScore = -1
    for (const point of points) {
      let score = 999
      for (const bot of this.bots) {
        if (!bot.alive) continue
        score = Math.min(score, Math.hypot(point.x - bot.pos.x, point.z - bot.pos.z))
      }
      score += Math.random() * 3
      if (score > bestScore) {
        bestScore = score
        best = point
      }
    }
    this.player.pos.set(best.x + (Math.random() - 0.5) * 3, 0, best.z + (Math.random() - 0.5) * 3)
    this.player.vel.set(0, 0, 0)
    this.player.yaw = Math.atan2(-this.player.pos.x, -this.player.pos.z) + Math.PI
    this.player.pitch = 0
    this.player.eye = EYE_HEIGHT
    this.player.alive = true
    this.player.onGround = true
    this.player.health = this.player.maxHealth
    this.player.invuln = 1.2
    this.player.deathAnim = 0
    this.updateCamera(0)
  }

  pause() {
    if (this.state !== 'playing') return
    this.state = 'paused'
    this.input.firing = false
    this.input.ads = false
    this.exitPointerLock()
    this.callbacks.onState?.(this.state)
  }

  resume() {
    if (this.state !== 'paused') return
    this.state = 'playing'
    this.audio.resume()
    if (!this.isTouch) this.requestPointerLock()
    this.callbacks.onState?.(this.state)
  }

  quitToMenu() {
    this.state = 'menu'
    this.input.firing = false
    this.input.ads = false
    this.exitPointerLock()
    for (const bot of this.bots) {
      bot.alive = false
      bot.group.visible = false
    }
    this.effects.clear()
    this.clearGrenades()
    this.callbacks.onState?.(this.state)
  }

  restartMatch() {
    this.startMatch(this.loadout)
  }

  endMatch() {
    if (this.state === 'over') return
    this.state = 'over'
    this.input.firing = false
    this.input.ads = false
    this.exitPointerLock()
    const accuracy = this.player.shots > 0 ? (this.player.hits / this.player.shots) * 100 : 0
    const victory = this.match.scorePlayer >= this.match.scoreEnemy
    this.callbacks.onMatchEnd?.({
      victory,
      playerScore: this.match.scorePlayer,
      enemyScore: this.match.scoreEnemy,
      kills: this.player.kills,
      deaths: this.player.deaths,
      accuracy,
      headshots: this.player.headshots,
      bestStreak: this.player.bestStreak,
      damage: this.stats.damageDealt
    })
    this.callbacks.onState?.(this.state)
  }

  setTouchMove(x, z) {
    this.input.touchMove.x = x
    this.input.touchMove.z = z
  }

  look(dx, dy) {
    if (this.state !== 'playing' && this.state !== 'countdown') return
    const factor = 0.0021 * this.settings.sensitivity
    this.player.yaw -= dx * factor
    this.player.pitch -= dy * factor * (this.settings.invertY ? -1 : 1)
    this.player.pitch = clamp(this.player.pitch, -1.45, 1.45)
  }

  setFiring(value) {
    this.input.firing = value
    if (value) {
      this.audio.resume()
      const slot = this.activeSlot
      if (slot && !slot.def.auto) this.shootOnce()
    }
  }

  setAds(value) {
    this.input.ads = value
  }

  jump() {
    if (this.state !== 'playing' || !this.player.alive) return
    if (this.player.onGround) {
      this.player.vel.y = 5.4
      this.player.onGround = false
    }
  }

  toggleCrouch() {
    if (this.state !== 'playing' || !this.player.alive) return
    this.player.crouch = !this.player.crouch
  }

  reload() {
    if (this.state !== 'playing' || !this.player.alive) return
    const slot = this.activeSlot
    if (!slot || this.reloading || slot.ammo >= slot.def.mag || slot.reserve <= 0) return
    this.reloading = true
    this.reloadDuration = slot.def.reload * this.reloadMultiplier
    this.reloadTimer = this.reloadDuration
    this.audio.reload()
  }

  finishReload() {
    const slot = this.activeSlot
    if (!slot) return
    const needed = slot.def.mag - slot.ammo
    const take = Math.min(needed, slot.reserve)
    slot.ammo += take
    slot.reserve -= take
    this.reloading = false
    this.reloadTimer = 0
  }

  switchWeapon(index) {
    if (this.state !== 'playing' || !this.player.alive) return
    if (index === this.activeSlotIndex || this.switchTimer > 0) return
    if (this.reloading) {
      this.reloading = false
      this.reloadTimer = 0
    }
    this.activeSlotIndex = index
    this.switchTimer = 0.4
    this.audio.swap()
    this.buildViewModel()
  }

  makeSpread() {
    const slot = this.activeSlot
    const adsFactor = this.adsAmount
    const base = THREE.MathUtils.lerp(slot.def.spreadHip, slot.def.spreadAds, adsFactor)
    let factor = 1
    if (!this.player.onGround) factor *= 1.8
    if (Math.abs(this.player.vel.x) + Math.abs(this.player.vel.z) > 1) factor *= 1.35
    if (this.player.crouch) factor *= 0.8
    return base * factor
  }

  shootOnce() {
    if (this.state !== 'playing' || !this.player.alive) return
    const slot = this.activeSlot
    if (!slot || this.reloading || this.switchTimer > 0) return
    if (this.fireCooldown > 0) return
    if (slot.ammo <= 0) {
      this.audio.dryFire()
      this.autoReloadTimer = 0.25
      return
    }
    slot.ammo -= 1
    this.player.shots += 1
    this.fireCooldown = 60 / slot.def.rpm
    if (slot.def.boltTime) this.fireCooldown += slot.def.boltTime
    this.weaponKick = 1
    this.player.recoilPitch += slot.def.recoil * (this.adsAmount > 0.5 ? 0.7 : 1)
    this.player.recoilYaw += (Math.random() - 0.5) * slot.def.recoilYaw
    this.audio.shot(slot.def.sound, 0)

    const direction = new THREE.Vector3()
    this.camera.getWorldDirection(direction)
    const right = new THREE.Vector3().crossVectors(direction, UP).normalize()
    const up = new THREE.Vector3().crossVectors(right, direction).normalize()
    const spread = this.makeSpread()
    const angle = Math.random() * Math.PI * 2
    const radius = Math.sqrt(Math.random()) * spread
    direction.addScaledVector(right, Math.cos(angle) * radius).addScaledVector(up, Math.sin(angle) * radius).normalize()

    this.raycaster.set(this.camera.position, direction)
    const targets = [...this.world.raycastMeshes]
    for (const bot of this.bots) {
      if (bot.alive) targets.push(...bot.hitMeshes)
    }
    const intersections = this.raycaster.intersectObjects(targets, false)
    const hit = intersections.length ? intersections[0] : null
    const end = hit ? hit.point.clone() : this.camera.position.clone().addScaledVector(direction, 160)
    const muzzleWorld = this.camera.position.clone().addScaledVector(direction, 0.62).addScaledVector(right, 0.16).addScaledVector(up, -0.11)
    this.effects.tracer(muzzleWorld, end, slot.def.accent, 0.055)
    this.effects.muzzleFlash(muzzleWorld, 1)
    this.showMuzzleFlash()
    this.worldMuzzleLight.position.copy(muzzleWorld)
    this.worldMuzzleLight.intensity = 9
    this.shake = Math.min(0.32, this.shake + slot.def.recoil * 4)

    if (hit && hit.object.userData && hit.object.userData.bot) {
      const bot = hit.object.userData.bot
      const part = hit.object.userData.part
      const headshot = part === 'head'
      const dist = hit.distance
      const falloff = clamp(1 - (dist - 12) / slot.def.range, 0.45, 1)
      let damage = slot.def.damage * falloff * (headshot ? 2.05 : 1)
      const killed = bot.damage(damage, { byPlayer: true, headshot, weapon: slot.def.name })
      this.player.hits += 1
      if (headshot) this.player.headshots += 1
      this.stats.damageDealt += Math.round(damage)
      this.audio.hit(headshot)
      this.callbacks.onHitmarker?.({ headshot, kill: killed })
      this.effects.blood(hit.point, headshot)
      if (!killed) this.effects.hitSpark(hit.point, 0xff8a5a)
    } else if (hit) {
      this.effects.impact(hit.point, hit.face ? hit.face.normal : UP, 0xffc37a)
    }

    if (slot.ammo <= 0) this.autoReloadTimer = 0.35
  }

  showMuzzleFlash() {
    if (this.muzzleFlashSprite) {
      this.muzzleFlashSprite.visible = true
      this.muzzleFlashSprite.material.rotation = Math.random() * Math.PI * 2
      this.muzzleFlashSprite.scale.setScalar(0.28 + Math.random() * 0.18)
      this.viewMuzzleLight.intensity = 3
      this.muzzleFlashTimer = 0.045
    }
  }

  throwGrenade(type) {
    if (this.state !== 'playing' || !this.player.alive) return
    if (this.grenades[type] <= 0) return
    this.grenades[type] -= 1
    const dir = new THREE.Vector3()
    this.camera.getWorldDirection(dir)
    const pos = this.camera.position.clone().addScaledVector(dir, 0.55).add(new THREE.Vector3(0, -0.14, 0))
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.13, 10, 8),
      new THREE.MeshStandardMaterial({ color: type === 'lethal' ? 0x3b4b38 : 0x47555e, roughness: 0.55, metalness: 0.5 })
    )
    mesh.position.copy(pos)
    mesh.castShadow = true
    this.scene.add(mesh)
    this.grenadeObjects.push({
      mesh,
      vel: dir.clone().multiplyScalar(15).add(new THREE.Vector3(0, 3.4, 0)),
      timer: type === 'lethal' ? 2.3 : 1.6,
      type,
      bounces: 0
    })
    this.audio.swap()
  }

  clearGrenades() {
    for (const grenade of this.grenadeObjects) this.scene.remove(grenade.mesh)
    this.grenadeObjects.length = 0
  }

  detonateGrenade(grenade) {
    const pos = grenade.mesh.position.clone()
    this.scene.remove(grenade.mesh)
    this.audio.explosion()
    this.effects.explosion(pos, grenade.type === 'lethal' ? 8.5 : 12, grenade.type)
    this.shake = 0.9
    const isFlash = grenade.type === 'tactical'
    if (isFlash) {
      if (this.player.pos.distanceTo(pos) < 16 && this.hasLineOfSight(this.camera.position, pos)) {
        this.flashOverlay = 1
        this.callbacks.onFlash?.()
      }
      for (const bot of this.bots) {
        if (!bot.alive) continue
        if (bot.pos.distanceTo(pos) < 12 && this.hasLineOfSight(new THREE.Vector3(bot.pos.x, 1.6, bot.pos.z), pos)) {
          bot.blind = 4
          bot.reaction = 1.4
        }
      }
      this.audio.flash()
    } else {
      for (const bot of this.bots) {
        if (!bot.alive) continue
        const dist = bot.pos.distanceTo(pos)
        if (dist < 8.5 && this.hasLineOfSight(new THREE.Vector3(bot.pos.x, 1.5, bot.pos.z), pos)) {
          const damage = 130 * Math.pow(1 - dist / 8.5, 1.2)
          const killed = bot.damage(damage, { byPlayer: true, headshot: false, weapon: 'FRAG GRENADE' })
          this.stats.damageDealt += Math.round(damage)
          if (killed) this.callbacks.onHitmarker?.({ headshot: false, kill: true })
        }
      }
      const dist = this.player.pos.distanceTo(pos)
      if (dist < 8.5) {
        this.damagePlayer(85 * Math.pow(1 - dist / 8.5, 1.3), null)
      }
    }
  }

  updateGrenades(dt) {
    for (let i = this.grenadeObjects.length - 1; i >= 0; i--) {
      const grenade = this.grenadeObjects[i]
      grenade.timer -= dt
      grenade.vel.y -= GRAVITY * 1.1 * dt
      grenade.mesh.position.addScaledVector(grenade.vel, dt)
      const p = grenade.mesh.position
      if (p.y < 0.13) {
        p.y = 0.13
        grenade.vel.y *= -0.35
        grenade.vel.x *= 0.72
        grenade.vel.z *= 0.72
      }
      if (Math.abs(p.x) > this.world.mapHalf - 1) {
        p.x = clamp(p.x, -this.world.mapHalf + 1, this.world.mapHalf - 1)
        grenade.vel.x *= -0.45
      }
      if (Math.abs(p.z) > this.world.mapHalf - 1) {
        p.z = clamp(p.z, -this.world.mapHalf + 1, this.world.mapHalf - 1)
        grenade.vel.z *= -0.45
      }
      if (this.circlePushed(p, 0.13, 0.3)) {
        grenade.vel.x *= -0.42
        grenade.vel.z *= -0.42
      }
      if (grenade.timer <= 0) {
        this.detonateGrenade(grenade)
        this.grenadeObjects.splice(i, 1)
      }
    }
  }

  damagePlayer(amount, source) {
    if (!this.player.alive || this.state !== 'playing') return
    if (this.player.invuln > 0) return
    let damage = amount
    if (this.loadout.perk === 'toughness') damage *= 0.85
    this.player.health -= damage
    this.player.lastDamage = this.elapsed
    this.audio.hurt()
    let angle = 0
    if (source && source.pos) {
      const dx = source.pos.x - this.player.pos.x
      const dz = source.pos.z - this.player.pos.z
      angle = Math.atan2(dx, -dz) + this.player.yaw
    }
    this.callbacks.onDamage?.({ amount: damage, angle })
    this.shake = Math.min(0.65, this.shake + 0.14)
    if (this.player.health <= 0) this.killPlayer(source)
  }

  killPlayer(source) {
    if (!this.player.alive) return
    this.player.health = 0
    this.player.alive = false
    this.player.deaths += 1
    this.player.streak = 0
    this.player.respawnTimer = 3.2
    this.player.deathAnim = 0
    this.match.scoreEnemy += 1
    this.input.firing = false
    this.input.ads = false
    const killer = source ? `${source.name} [${source.title}]` : 'EXPLOSION'
    this.callbacks.onKillfeed?.({ killer, victim: 'YOU', weapon: source ? source.weapon.name : 'FRAG', headshot: false, byPlayer: false })
    this.callbacks.onDeath?.({ killer })
    this.audio.hurt()
    if (this.match.scoreEnemy >= SCORE_LIMIT) this.endMatch()
  }

  respawnPlayer() {
    this.spawnPlayer()
    this.resetWeaponSlots()
    this.grenades = { lethal: 1, tactical: 1 }
    this.reloading = false
    this.reloadTimer = 0
    this.player.health = this.player.maxHealth
    this.player.invuln = 1.2
    this.callbacks.onRespawn?.()
    this.audio.spawn()
  }

  registerPlayerKill(bot, info) {
    this.player.kills += 1
    this.player.streak += 1
    this.player.bestStreak = Math.max(this.player.bestStreak, this.player.streak)
    this.stats.longestStreak = Math.max(this.stats.longestStreak, this.player.streak)
    this.match.scorePlayer += 1
    this.audio.kill()
    this.callbacks.onKillfeed?.({ killer: 'YOU', victim: bot.name, weapon: info.weapon || 'M4A1', headshot: !!info.headshot, byPlayer: true })
    this.callbacks.onKill?.({ victim: bot.name, headshot: !!info.headshot, streak: this.player.streak })
    if (this.player.streak > 0 && this.player.streak % 5 === 0) {
      this.uavTimer = 20
      this.audio.uav()
      this.callbacks.onUav?.({ streak: this.player.streak })
    }
    if (this.match.scorePlayer >= SCORE_LIMIT) this.endMatch()
  }

  alertBot(bot) {
    bot.lastSeen = bot.time
    bot.reaction = Math.max(bot.reaction, 0.15)
  }

  hasLineOfSight(from, to) {
    const direction = to.clone().sub(from)
    const distance = direction.length()
    if (distance < 0.1) return true
    direction.normalize()
    this.raycaster.set(from, direction)
    this.raycaster.far = distance - 0.25
    const hits = this.raycaster.intersectObjects(this.world.raycastMeshes, false)
    this.raycaster.far = 220
    return hits.length === 0
  }

  resolveCircle(pos, radius, height = 1.9) {
    let pushed = false
    const feet = pos.y || 0
    for (const collider of this.world.colliders) {
      if ((collider.maxY ?? 99) <= feet + 0.02 || (collider.minY ?? 0) >= feet + height) continue
      const closestX = clamp(pos.x, collider.minX, collider.maxX)
      const closestZ = clamp(pos.z, collider.minZ, collider.maxZ)
      const dx = pos.x - closestX
      const dz = pos.z - closestZ
      const distSq = dx * dx + dz * dz
      if (distSq < radius * radius) {
        pushed = true
        if (distSq > 0.000001) {
          const dist = Math.sqrt(distSq)
          pos.x = closestX + (dx / dist) * radius
          pos.z = closestZ + (dz / dist) * radius
        } else {
          const toLeft = Math.abs(pos.x - collider.minX)
          const toRight = Math.abs(collider.maxX - pos.x)
          const toTop = Math.abs(pos.z - collider.minZ)
          const toBottom = Math.abs(collider.maxZ - pos.z)
          const min = Math.min(toLeft, toRight, toTop, toBottom)
          if (min === toLeft) pos.x = collider.minX - radius
          else if (min === toRight) pos.x = collider.maxX + radius
          else if (min === toTop) pos.z = collider.minZ - radius
          else pos.z = collider.maxZ + radius
        }
      }
    }
    pos.x = clamp(pos.x, -this.world.mapHalf + 1.2, this.world.mapHalf - 1.2)
    pos.z = clamp(pos.z, -this.world.mapHalf + 1.2, this.world.mapHalf - 1.2)
    return pushed
  }

  circlePushed(pos, radius, height = 0.3) {
    let pushed = false
    const feet = pos.y || 0
    for (const collider of this.world.colliders) {
      if ((collider.maxY ?? 99) <= feet + 0.02 || (collider.minY ?? 0) >= feet + height) continue
      const closestX = clamp(pos.x, collider.minX, collider.maxX)
      const closestZ = clamp(pos.z, collider.minZ, collider.maxZ)
      const dx = pos.x - closestX
      const dz = pos.z - closestZ
      if (dx * dx + dz * dz < radius * radius) {
        pushed = true
        if (dx * dx + dz * dz > 0.000001) {
          const dist = Math.hypot(dx, dz)
          pos.x = closestX + (dx / dist) * radius
          pos.z = closestZ + (dz / dist) * radius
        }
      }
    }
    return pushed
  }

  updatePlayer(dt) {
    const player = this.player
    if (!player.alive) {
      player.respawnTimer -= dt
      player.deathAnim = Math.min(1, player.deathAnim + dt * 2.2)
      if (player.respawnTimer <= 0) this.respawnPlayer()
      return
    }
    player.invuln = Math.max(0, player.invuln - dt)
    const forwardInput = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0) + this.input.touchMove.z
    const rightInput = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0) + this.input.touchMove.x
    const wish = new THREE.Vector3(rightInput, 0, forwardInput)
    if (wish.lengthSq() > 1) wish.normalize()
    const sprinting = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && forwardInput > 0.3
    player.sprint = sprinting && !this.input.ads
    let speed = 5.2
    if (player.crouch) speed = 2.7
    else if (sprinting) speed = 7.6
    if (this.input.ads) speed *= 0.72
    speed *= this.speedMultiplier
    if (!player.onGround) speed *= 0.82

    const yawForward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw))
    const yawRight = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw))
    const desired = new THREE.Vector3().addScaledVector(yawRight, wish.x).addScaledVector(yawForward, wish.z)
    if (desired.lengthSq() > 1) desired.normalize()
    desired.multiplyScalar(speed)
    const accel = player.onGround ? 14 : 4
    player.vel.x = THREE.MathUtils.damp(player.vel.x, desired.x, accel, dt)
    player.vel.z = THREE.MathUtils.damp(player.vel.z, desired.z, accel, dt)

    player.vel.y -= GRAVITY * dt
    player.pos.x += player.vel.x * dt
    player.pos.z += player.vel.z * dt
    player.pos.y += player.vel.y * dt
    if (player.pos.y <= 0) {
      player.pos.y = 0
      player.vel.y = 0
      player.onGround = true
    }
    this.resolveCircle(player.pos, PLAYER_RADIUS, this.player.crouch ? 1.35 : 1.9)

    const moving = Math.hypot(player.vel.x, player.vel.z) > 0.8 && player.onGround
    player.bobPhase += dt * (sprinting ? 12 : 8) * (moving ? 1 : 0)
    player.bob = moving ? Math.sin(player.bobPhase) * (sprinting ? 0.055 : 0.032) : 0
    const targetEye = player.crouch ? CROUCH_HEIGHT : EYE_HEIGHT
    player.eye = THREE.MathUtils.damp(player.eye, targetEye, 12, dt)
    player.recoilPitch = THREE.MathUtils.damp(player.recoilPitch, 0, 8, dt)
    player.recoilYaw = THREE.MathUtils.damp(player.recoilYaw, 0, 8, dt)
    if (this.elapsed - player.lastDamage > 4.5 && player.health < player.maxHealth) {
      player.health = Math.min(player.maxHealth, player.health + 14 * dt)
    }

    this.stepTimer -= dt
    if (moving && this.stepTimer <= 0) {
      this.audio.footsteps(sprinting)
      this.stepTimer = sprinting ? 0.32 : 0.44
    }
  }

  updateWeapons(dt) {
    if (this.fireCooldown > 0) this.fireCooldown -= dt
    if (this.switchTimer > 0) this.switchTimer -= dt
    if (this.reloading) {
      this.reloadTimer -= dt
      if (this.reloadTimer <= 0) this.finishReload()
    }
    if (this.autoReloadTimer > 0) {
      this.autoReloadTimer -= dt
      if (this.autoReloadTimer <= 0) this.reload()
    }
    const targetAds = this.input.ads && !this.reloading ? 1 : 0
    this.adsAmount = THREE.MathUtils.damp(this.adsAmount, targetAds, 13, dt)
    if (this.state === 'playing' && this.player.alive) {
      const slot = this.activeSlot
      if (slot && slot.def.auto && this.input.firing) this.shootOnce()
    }
    this.weaponKick = THREE.MathUtils.damp(this.weaponKick, 0, 10, dt)
    const slot = this.activeSlot
    if (!slot) return
    const base = new THREE.Vector3(
      THREE.MathUtils.lerp(slot.def.viewPos[0], slot.def.adsPos[0], this.adsAmount),
      THREE.MathUtils.lerp(slot.def.viewPos[1], slot.def.adsPos[1], this.adsAmount),
      THREE.MathUtils.lerp(slot.def.viewPos[2], slot.def.adsPos[2], this.adsAmount)
    )
    const moving = Math.hypot(this.player.vel.x, this.player.vel.z) > 1
    const bob = moving ? Math.sin(this.player.bobPhase) * (this.player.sprint ? 0.022 : 0.012) : 0
    const bobY = moving ? Math.abs(Math.cos(this.player.bobPhase)) * 0.012 : 0
    const reloadProgress = this.reloading ? 1 - this.reloadTimer / this.reloadDuration : 0
    const reloadDip = this.reloading ? Math.sin(reloadProgress * Math.PI) * 0.16 : 0
    const switchDip = this.switchTimer > 0 ? Math.sin((1 - this.switchTimer / 0.4) * Math.PI) * 0.18 : 0
    this.weaponHolder.position.set(
      base.x + bob,
      base.y + bobY - reloadDip - switchDip,
      base.z + this.weaponKick * 0.045
    )
    this.weaponHolder.rotation.set(
      -this.weaponKick * 0.06 + (this.reloading ? Math.sin(reloadProgress * Math.PI) * 0.5 : 0),
      bob * 0.9,
      this.reloading ? Math.sin(reloadProgress * Math.PI) * 0.3 : 0
    )
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt
      this.viewMuzzleLight.intensity = Math.max(0, this.viewMuzzleLight.intensity - dt * 70)
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashSprite.visible = false
        this.viewMuzzleLight.intensity = 0
      }
    }
    this.worldMuzzleLight.intensity = Math.max(0, this.worldMuzzleLight.intensity - dt * 120)
    const fov = THREE.MathUtils.lerp(this.settings.fov, this.settings.fov / slot.def.adsZoom, this.adsAmount)
    this.camera.fov = fov
    this.camera.updateProjectionMatrix()
    if (this.muzzleFlashSprite) this.muzzleFlashSprite.visible = this.muzzleFlashTimer > 0
  }

  updateCamera(dt) {
    const player = this.player
    const eye = player.deathAnim > 0 ? THREE.MathUtils.lerp(player.eye, 0.45, player.deathAnim) : player.eye
    this.camera.position.set(player.pos.x, player.pos.y + eye + player.bob * 0.6, player.pos.z)
    const shakeX = this.shake ? (Math.random() - 0.5) * this.shake * 0.035 : 0
    const shakeY = this.shake ? (Math.random() - 0.5) * this.shake * 0.035 : 0
    this.camera.rotation.set(
      clamp(player.pitch + player.recoilPitch, -1.5, 1.5) + shakeY,
      player.yaw + player.recoilYaw + shakeX,
      (player.deathAnim > 0 ? player.deathAnim * 0.5 : 0) + (player.bob ? -Math.cos(player.bobPhase) * 0.004 : 0)
    )
    this.shake = THREE.MathUtils.damp(this.shake, 0, 7, dt)
  }

  updateMenuCamera(dt) {
    this.menuOrbit += dt * 0.055
    const radius = 38
    this.camera.position.set(Math.sin(this.menuOrbit) * radius, 14 + Math.sin(this.menuOrbit * 0.8) * 2.2, Math.cos(this.menuOrbit) * radius)
    this.camera.lookAt(0, 2.5, 0)
    this.camera.fov = this.settings.fov
    this.camera.updateProjectionMatrix()
  }

  loop() {
    requestAnimationFrame(this.loop)
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.elapsed += dt
    this.world.update(this.elapsed)
    if (this.state === 'menu') {
      this.updateMenuCamera(dt)
      this.render()
      return
    }
    if (this.state === 'paused' || this.state === 'over') {
      this.render()
      return
    }
    if (this.state === 'countdown') {
      this.match.countdown -= dt
      const count = Math.ceil(this.match.countdown)
      if (count !== this.match.lastCount && count > 0) {
        this.match.lastCount = count
        this.audio.countdown(false)
        this.callbacks.onCountdown?.(count)
      }
      if (this.match.countdown <= 0) {
        this.state = 'playing'
        this.callbacks.onCountdown?.(0)
        this.callbacks.onState?.(this.state)
        this.audio.countdown(true)
      }
      this.updatePlayerLookOnly(dt)
      this.updateCamera(dt)
      this.updateWeapons(dt)
      this.updateHud(dt)
      this.render()
      return
    }
    if (this.state === 'playing') {
      this.updatePlayer(dt)
      this.updateWeapons(dt)
      this.updateGrenades(dt)
      for (const bot of this.bots) bot.update(dt)
      this.match.time -= dt
      if (this.uavTimer > 0) this.uavTimer -= dt
      if (this.match.time <= 0) {
        this.match.time = 0
        this.endMatch()
      }
      if (this.flashOverlay > 0) this.flashOverlay = Math.max(0, this.flashOverlay - dt * 1.4)
      this.updateCamera(dt)
      this.effects.update(dt)
      this.updateHud(dt)
      this.updateMinimap(dt)
      this.render()
    }
  }

  updatePlayerLookOnly(dt) {
    const player = this.player
    player.recoilPitch = THREE.MathUtils.damp(player.recoilPitch, 0, 8, dt)
    player.recoilYaw = THREE.MathUtils.damp(player.recoilYaw, 0, 8, dt)
  }

  updateHud(dt) {
    this.lastHudUpdate -= dt
    if (this.lastHudUpdate > 0) return
    this.lastHudUpdate = 0.05
    const slot = this.activeSlot
    if (!slot) return
    const spread = this.makeSpread()
    const crosshair = clamp(8 + spread * 700 + (this.player.sprint ? 8 : 0) + (this.player.onGround ? 0 : 6), 8, 40)
    this.callbacks.onHud?.({
      health: Math.max(0, this.player.health),
      maxHealth: this.player.maxHealth,
      ammo: slot.ammo,
      reserve: slot.reserve,
      weapon: slot.def.name,
      category: slot.def.category,
      reloading: this.reloading,
      reloadProgress: this.reloading ? 1 - this.reloadTimer / this.reloadDuration : 0,
      grenades: { ...this.grenades },
      scorePlayer: this.match.scorePlayer,
      scoreEnemy: this.match.scoreEnemy,
      time: this.match.time,
      streak: this.player.streak,
      uav: this.uavTimer,
      alive: this.player.alive,
      respawn: this.player.respawnTimer,
      ads: this.adsAmount,
      scope: this.adsAmount > 0.72 && slot.def.scope,
      crosshair,
      primary: this.slots[0]?.def.name,
      secondary: this.slots[1]?.def.name,
      activeIndex: this.activeSlotIndex,
      flash: this.flashOverlay,
      yaw: this.player.yaw
    })
  }

  updateMinimap(dt) {
    this.lastMinimapUpdate -= dt
    if (this.lastMinimapUpdate > 0) return
    this.lastMinimapUpdate = 0.09
    const ctx = this.minimapCanvas.getContext('2d')
    const size = this.minimapCanvas.width
    ctx.clearRect(0, 0, size, size)
    ctx.drawImage(this.minimapBase, 0, 0)
    const scale = this.minimapScale
    const toX = (x) => size / 2 + x * scale
    const toY = (z) => size / 2 + z * scale
    if (this.uavTimer > 0) {
      const angle = this.elapsed * 2.4
      ctx.save()
      ctx.translate(size / 2, size / 2)
      ctx.rotate(angle)
      const grad = ctx.createLinearGradient(0, 0, size / 2, 0)
      grad.addColorStop(0, 'rgba(90,220,255,0.18)')
      grad.addColorStop(1, 'rgba(90,220,255,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, size / 2, -0.4, 0.4)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
      ctx.strokeStyle = 'rgba(90,220,255,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2)
      ctx.stroke()
    }
    for (const bot of this.bots) {
      if (!bot.alive) continue
      const visible = this.uavTimer > 0 || bot.time - bot.lastShot < 1.2 || (bot.pos.distanceTo(this.player.pos) < 18 && this.hasLineOfSight(this.camera.position, new THREE.Vector3(bot.pos.x, 1.5, bot.pos.z)))
      if (!visible) continue
      ctx.fillStyle = '#ff5a45'
      ctx.beginPath()
      ctx.arc(toX(bot.pos.x), toY(bot.pos.z), 3, 0, Math.PI * 2)
      ctx.fill()
    }
    const px = toX(this.player.pos.x)
    const py = toY(this.player.pos.z)
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(-this.player.yaw)
    ctx.fillStyle = '#ffb23f'
    ctx.beginPath()
    ctx.moveTo(0, -7)
    ctx.lineTo(5, 6)
    ctx.lineTo(0, 3)
    ctx.lineTo(-5, 6)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = 'bold 10px Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('N', size / 2, 12)
  }

  render() {
    this.renderer.clear()
    this.renderer.render(this.scene, this.camera)
    if (this.state !== 'menu') {
      this.renderer.clearDepth()
      this.renderer.render(this.viewScene, this.viewCamera)
    }
  }

  resize() {
    const width = window.innerWidth
    const height = window.innerHeight
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.viewCamera.aspect = width / height
    this.viewCamera.updateProjectionMatrix()
  }

  debugState() {
    return {
      state: this.state,
      score: [this.match.scorePlayer, this.match.scoreEnemy],
      time: this.match.time,
      player: {
        health: this.player.health,
        alive: this.player.alive,
        kills: this.player.kills,
        deaths: this.player.deaths,
        pos: [this.player.pos.x, this.player.pos.y, this.player.pos.z]
      },
      bots: this.bots.map((bot) => ({ name: bot.name, alive: bot.alive, health: bot.health, pos: [bot.pos.x, bot.pos.z] })),
      weapon: this.activeSlot?.def.name,
      ammo: this.activeSlot?.ammo,
      uav: this.uavTimer
    }
  }
}

class Effects {
  constructor(game) {
    this.game = game
    this.tracers = []
    this.bursts = []
    this.decals = []
    this.explosions = []
    this.sparkTexture = makeSparkTexture()
  }

  tracer(from, to, color = 0xffb15a, life = 0.06) {
    const geometry = new THREE.BufferGeometry().setFromPoints([from, to])
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })
    const line = new THREE.Line(geometry, material)
    line.frustumCulled = false
    this.game.scene.add(line)
    this.tracers.push({ line, life, maxLife: life })
  }

  muzzleFlash(position, scale = 1) {
    const mat = new THREE.SpriteMaterial({ map: this.sparkTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    const sprite = new THREE.Sprite(mat)
    sprite.position.copy(position)
    sprite.scale.setScalar(0.45 * scale)
    this.game.scene.add(sprite)
    this.bursts.push({ mesh: sprite, life: 0.05, maxLife: 0.05, kind: 'flash', velocities: null })
  }

  impact(point, normal, color) {
    const mat = new THREE.MeshBasicMaterial({ color: 0x1b1814, transparent: true, opacity: 0.7, depthWrite: false })
    const decal = new THREE.Mesh(new THREE.CircleGeometry(0.075 + Math.random() * 0.035, 7), mat)
    decal.position.copy(point).addScaledVector(normal, 0.012)
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize())
    decal.quaternion.copy(q)
    this.game.scene.add(decal)
    this.decals.push({ mesh: decal, life: 16 })
    if (this.decals.length > 70) {
      const old = this.decals.shift()
      this.game.scene.remove(old.mesh)
      old.mesh.geometry.dispose()
      old.mesh.material.dispose()
    }
    this.hitSpark(point, color)
  }

  hitSpark(point, color = 0xffc37a) {
    const count = 7
    const positions = new Float32Array(count * 3)
    const velocities = []
    for (let i = 0; i < count; i++) {
      positions[i * 3] = point.x
      positions[i * 3 + 1] = point.y
      positions[i * 3 + 2] = point.z
      velocities.push(new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 4, (Math.random() - 0.5) * 5))
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({ color, size: 0.075, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, map: this.sparkTexture })
    const points = new THREE.Points(geometry, material)
    this.game.scene.add(points)
    this.bursts.push({ mesh: points, velocities, life: 0.28, maxLife: 0.28, kind: 'spark' })
  }

  blood(point, headshot) {
    const color = headshot ? 0xff5a3c : 0xd64a32
    this.hitSpark(point, color)
    const count = 10
    const positions = new Float32Array(count * 3)
    const velocities = []
    for (let i = 0; i < count; i++) {
      positions[i * 3] = point.x
      positions[i * 3 + 1] = point.y
      positions[i * 3 + 2] = point.z
      velocities.push(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2.5, (Math.random() - 0.5) * 3))
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({ color, size: 0.06, transparent: true, opacity: 0.9, depthWrite: false })
    const points = new THREE.Points(geometry, material)
    this.game.scene.add(points)
    this.bursts.push({ mesh: points, velocities, life: 0.4, maxLife: 0.4, kind: 'blood' })
  }

  deathBurst(pos, color) {
    const count = 22
    const positions = new Float32Array(count * 3)
    const velocities = []
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x + (Math.random() - 0.5) * 0.5
      positions[i * 3 + 1] = 1 + Math.random() * 1.2
      positions[i * 3 + 2] = pos.z + (Math.random() - 0.5) * 0.5
      velocities.push(new THREE.Vector3((Math.random() - 0.5) * 4, 1 + Math.random() * 3, (Math.random() - 0.5) * 4))
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({ color, size: 0.11, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, map: this.sparkTexture })
    const points = new THREE.Points(geometry, material)
    this.game.scene.add(points)
    this.bursts.push({ mesh: points, velocities, life: 0.65, maxLife: 0.65, kind: 'spark' })
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 24), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }))
    ring.rotation.x = -Math.PI / 2
    ring.position.set(pos.x, 0.08, pos.z)
    this.game.scene.add(ring)
    this.explosions.push({ mesh: ring, life: 0.5, maxLife: 0.5, kind: 'ring', scale: 2.4 })
  }

  explosion(pos, radius, type) {
    const color = type === 'tactical' ? 0xbfe9ff : 0xff8a2e
    const light = new THREE.PointLight(color, 60, radius * 3, 2)
    light.position.copy(pos)
    this.game.scene.add(light)
    this.explosions.push({ light, life: 0.45, maxLife: 0.45, kind: 'light', base: 60 })
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }))
    sphere.position.copy(pos)
    this.game.scene.add(sphere)
    this.explosions.push({ mesh: sphere, life: 0.35, maxLife: 0.35, kind: 'sphere', scale: radius * 1.5 })
    const count = 34
    const positions = new Float32Array(count * 3)
    const velocities = []
    for (let i = 0; i < count; i++) {
      positions[i * 3] = pos.x
      positions[i * 3 + 1] = pos.y + 0.3
      positions[i * 3 + 2] = pos.z
      const dir = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.4, (Math.random() - 0.5) * 2).normalize()
      velocities.push(dir.multiplyScalar(3 + Math.random() * 9))
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const material = new THREE.PointsMaterial({ color, size: 0.18, transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, map: this.sparkTexture })
    const points = new THREE.Points(geometry, material)
    this.game.scene.add(points)
    this.bursts.push({ mesh: points, velocities, life: 0.85, maxLife: 0.85, kind: 'spark' })
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.72, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }))
    ring.rotation.x = -Math.PI / 2
    ring.position.set(pos.x, 0.09, pos.z)
    this.game.scene.add(ring)
    this.explosions.push({ mesh: ring, life: 0.6, maxLife: 0.6, kind: 'ring', scale: radius })
  }

  update(dt) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tracer = this.tracers[i]
      tracer.life -= dt
      tracer.line.material.opacity = Math.max(0, tracer.life / tracer.maxLife)
      if (tracer.life <= 0) {
        this.game.scene.remove(tracer.line)
        tracer.line.geometry.dispose()
        tracer.line.material.dispose()
        this.tracers.splice(i, 1)
      }
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i]
      burst.life -= dt
      const t = Math.max(0, burst.life / burst.maxLife)
      if (burst.velocities && burst.mesh.geometry) {
        const positions = burst.mesh.geometry.attributes.position.array
        for (let j = 0; j < burst.velocities.length; j++) {
          const v = burst.velocities[j]
          positions[j * 3] += v.x * dt
          positions[j * 3 + 1] += v.y * dt
          positions[j * 3 + 2] += v.z * dt
          v.y -= (burst.kind === 'blood' ? 9 : 5) * dt
        }
        burst.mesh.geometry.attributes.position.needsUpdate = true
        burst.mesh.material.opacity = t
      } else {
        burst.mesh.material.opacity = t
      }
      if (burst.life <= 0) {
        this.game.scene.remove(burst.mesh)
        if (burst.mesh.geometry) burst.mesh.geometry.dispose()
        if (burst.mesh.material) burst.mesh.material.dispose()
        this.bursts.splice(i, 1)
      }
    }
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const decal = this.decals[i]
      decal.life -= dt
      if (decal.life < 2) decal.mesh.material.opacity = Math.max(0, decal.life / 2) * 0.7
      if (decal.life <= 0) {
        this.game.scene.remove(decal.mesh)
        decal.mesh.geometry.dispose()
        decal.mesh.material.dispose()
        this.decals.splice(i, 1)
      }
    }
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const effect = this.explosions[i]
      effect.life -= dt
      const t = Math.max(0, effect.life / effect.maxLife)
      if (effect.kind === 'ring') {
        const s = 1 + (1 - t) * effect.scale
        effect.mesh.scale.setScalar(s)
        effect.mesh.material.opacity = t * 0.8
      } else if (effect.kind === 'sphere') {
        effect.mesh.scale.setScalar(1 + (1 - t) * effect.scale)
        effect.mesh.material.opacity = t * 0.55
      } else if (effect.kind === 'light') {
        effect.light.intensity = effect.base * t
      }
      if (effect.life <= 0) {
        if (effect.mesh) {
          this.game.scene.remove(effect.mesh)
          effect.mesh.geometry.dispose()
          effect.mesh.material.dispose()
        }
        if (effect.light) this.game.scene.remove(effect.light)
        this.explosions.splice(i, 1)
      }
    }
  }

  clear() {
    for (const tracer of this.tracers) {
      this.game.scene.remove(tracer.line)
      tracer.line.geometry.dispose()
      tracer.line.material.dispose()
    }
    this.tracers.length = 0
    for (const burst of this.bursts) {
      this.game.scene.remove(burst.mesh)
      if (burst.mesh.geometry) burst.mesh.geometry.dispose()
      if (burst.mesh.material) burst.mesh.material.dispose()
    }
    this.bursts.length = 0
    for (const decal of this.decals) {
      this.game.scene.remove(decal.mesh)
      decal.mesh.geometry.dispose()
      decal.mesh.material.dispose()
    }
    this.decals.length = 0
    for (const effect of this.explosions) {
      if (effect.mesh) {
        this.game.scene.remove(effect.mesh)
        effect.mesh.geometry.dispose()
        effect.mesh.material.dispose()
      }
      if (effect.light) this.game.scene.remove(effect.light)
    }
    this.explosions.length = 0
  }
}
