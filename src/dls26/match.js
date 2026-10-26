import * as THREE from '../vendor/three.module.min.js'
import { PITCH, buildStadium } from './pitch.js'
import { MatchAudio } from './audio.js'
import { TEAMS, DIFFICULTIES, FORMATIONS, getTeam, makeSquad } from './teams.js'

const BALL_RADIUS = 0.16
const GRAVITY = 15.5
const PLAYER_RADIUS = 0.46
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const SKIN_TONES = [0xf0c7a5, 0xd9a06f, 0xb9754a, 0x8b5736, 0x5f3a25]
const HAIR_COLORS = [0x191512, 0x2d1d12, 0x4b2d18, 0x0c0c0e, 0x7c5a35]

function colorDistance(a, b) {
  const parse = (hex) => {
    const value = hex.replace('#', '')
    return [
      parseInt(value.slice(0, 2), 16),
      parseInt(value.slice(2, 4), 16),
      parseInt(value.slice(4, 6), 16)
    ]
  }
  const [r1, g1, b1] = parse(a)
  const [r2, g2, b2] = parse(b)
  return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2)
}

function ballTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#f4f4ef'
  ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = '#101418'
  const spots = [[64, 52], [190, 48], [124, 128], [32, 196], [214, 200]]
  spots.forEach(([x, y]) => {
    ctx.beginPath()
    for (let point = 0; point < 5; point += 1) {
      const angle = (point / 5) * Math.PI * 2 - Math.PI / 2
      const px = x + Math.cos(angle) * 31
      const py = y + Math.sin(angle) * 31
      if (point === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = '#b9bebc'
    ctx.lineWidth = 3
    ctx.stroke()
  })
  ctx.strokeStyle = 'rgba(20,24,28,0.35)'
  ctx.lineWidth = 4
  for (let index = 0; index < 8; index += 1) {
    ctx.beginPath()
    ctx.arc(128, 128, 40 + index * 15, 0, Math.PI * 2)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

function numberTexture(number, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 128, 128)
  ctx.fillStyle = color
  ctx.font = '900 74px Arial Black, Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(number), 64, 68)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export class MatchGame {
  constructor(canvas, minimapCanvas, callbacks = {}) {
    this.canvas = canvas
    this.minimapCanvas = minimapCanvas
    this.callbacks = callbacks
    this.audio = new MatchAudio()
    this.settings = {
      quality: 'high',
      cameraMode: 'broadcast',
      difficulty: 'pro',
      halfSeconds: 90,
      volume: 0.7
    }
    this.state = 'menu'
    this.elapsed = 0
    this.match = null
    this.players = []
    this.lastConfig = null
    this.controlled = null
    this.cameraYaw = Math.PI
    this.menuAngle = 0.4
    this.menuHeight = 20
    this.keys = new Set()
    this.touchMove = { x: 0, z: 0 }
    this.input = { sprint: false, charging: false, charge: 0 }
    this.hudTimer = 0
    this.minimapTimer = 0
    this.pendingSwitch = null
    this.kickoffTaker = null
    this.goalCamera = 0
    this.tempVector = new THREE.Vector3()
    this.tempVector2 = new THREE.Vector3()

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.02
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 320)
    this.camera.position.set(0, 22, 58)
    this.stadium = buildStadium(this.scene, this.renderer)

    this.ball = this.buildBall()
    this.scene.add(this.ball.mesh)
    this.ball.mesh.visible = false

    this.controlledRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.045, 8, 40),
      new THREE.MeshBasicMaterial({ color: 0xd8ff3e, transparent: true, opacity: 0.9 })
    )
    this.controlledRing.rotation.x = -Math.PI / 2
    this.controlledRing.visible = false
    this.scene.add(this.controlledRing)

    this.aimLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineDashedMaterial({ color: 0xd8ff3e, dashSize: 0.4, gapSize: 0.25, transparent: true, opacity: 0.45 })
    )
    this.aimLine.visible = false
    this.scene.add(this.aimLine)

    this.bindEvents()
    this.clock = new THREE.Clock()
    this.loop = this.loop.bind(this)
    requestAnimationFrame(this.loop)
  }

  buildBall() {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 24, 16),
      new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.42, metalness: 0.05 })
    )
    mesh.castShadow = true
    const pos = new THREE.Vector3(0, BALL_RADIUS, 0)
    const vel = new THREE.Vector3()
    return { mesh, pos, vel, owner: null, lastTouch: null, lastTouchSide: 'home', lastPass: null, noPickup: 0, spin: new THREE.Vector3() }
  }

  buildPlayerModel(teamInfo, player, isHome) {
    const group = new THREE.Group()
    const skin = SKIN_TONES[Number(player.id.split('-')[1] || 0) % SKIN_TONES.length]
    const hair = HAIR_COLORS[Number(player.id.split('-')[1] || 0) % HAIR_COLORS.length]
    const clash = colorDistance(teamInfo.primary, (isHome ? '#d8ff3e' : '#2b5cff')) < 80
    const jersey = player.isGK ? (isHome ? '#f3c94b' : '#7be0ff') : clash ? teamInfo.secondary : teamInfo.primary
    const shorts = player.isGK ? '#121418' : teamInfo.shorts
    const socks = player.isGK ? jersey : teamInfo.socks
    const accent = teamInfo.accent

    const skinMaterial = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.82 })
    const jerseyMaterial = new THREE.MeshStandardMaterial({ color: jersey, roughness: 0.72 })
    const shortsMaterial = new THREE.MeshStandardMaterial({ color: shorts, roughness: 0.8 })
    const socksMaterial = new THREE.MeshStandardMaterial({ color: socks, roughness: 0.78 })
    const bootMaterial = new THREE.MeshStandardMaterial({ color: 0x0a0c0f, roughness: 0.55 })
    const hairMaterial = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.9 })
    const accentMaterial = new THREE.MeshStandardMaterial({ color: accent, roughness: 0.5, emissive: accent, emissiveIntensity: 0.08 })

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 0.26), jerseyMaterial)
    torso.position.y = 1.18
    torso.castShadow = true
    group.add(torso)

    const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.27), accentMaterial)
    shoulders.position.y = 1.42
    group.add(shoulders)

    const shorts = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.23, 0.26), shortsMaterial)
    shorts.position.y = 0.9
    shorts.castShadow = true
    group.add(shorts)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 12), skinMaterial)
    head.position.y = 1.62
    head.castShadow = true
    group.add(head)

    const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.158, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMaterial)
    hairMesh.position.y = 1.645
    group.add(hairMesh)

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.1, 8), skinMaterial)
    neck.position.y = 1.5
    group.add(neck)

    const numberPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.27, 0.27),
      new THREE.MeshBasicMaterial({ map: numberTexture(player.number, '#0b1114'), transparent: true, side: THREE.DoubleSide })
    )
    numberPlane.position.set(0, 1.2, -0.135)
    numberPlane.rotation.y = Math.PI
    group.add(numberPlane)

    const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.09), new THREE.MeshBasicMaterial({ color: accent }))
    badge.position.set(0.13, 1.3, 0.132)
    badge.rotation.y = 0
    group.add(badge)

    const buildLeg = (side) => {
      const pivot = new THREE.Group()
      pivot.position.set(side * 0.13, 0.9, 0)
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.56, 8), skinMaterial)
      leg.position.y = -0.3
      leg.castShadow = true
      pivot.add(leg)
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.075, 0.24, 8), socksMaterial)
      sock.position.y = -0.68
      pivot.add(sock)
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.3), bootMaterial)
      boot.position.set(0, -0.84, 0.06)
      boot.castShadow = true
      pivot.add(boot)
      group.add(pivot)
      return pivot
    }

    const buildArm = (side) => {
      const pivot = new THREE.Group()
      pivot.position.set(side * 0.28, 1.39, 0)
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.5, 8), skinMaterial)
      arm.position.y = -0.24
      arm.castShadow = true
      pivot.add(arm)
      const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.068, 0.2, 8), jerseyMaterial)
      sleeve.position.y = -0.1
      pivot.add(sleeve)
      if (player.isGK) {
        const glove = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.1), accentMaterial)
        glove.position.y = -0.53
        pivot.add(glove)
      }
      group.add(pivot)
      return pivot
    }

    const leftLeg = buildLeg(-1)
    const rightLeg = buildLeg(1)
    const leftArm = buildArm(-1)
    const rightArm = buildArm(1)

    group.scale.setScalar(player.isGK ? 1.04 : 1)
    return { group, leftLeg, rightLeg, leftArm, rightArm, torso, runPhase: 0 }
  }

  createEntity(team, player, index) {
    const model = this.buildPlayerModel(team.info, player, team.side === 'home')
    this.scene.add(model.group)
    return {
      data: player,
      team,
      index,
      pos: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      target: new THREE.Vector3(),
      facing: team.attackSign > 0 ? 0 : Math.PI,
      stamina: 1,
      cooldown: 0,
      tackleTimer: 0,
      tackleCooldown: 0,
      kickTimer: 0,
      diveTimer: 0,
      diveSide: 0,
      aiTimer: Math.random() * 0.3,
      model,
      goals: 0,
      assists: 0,
      saves: 0,
      tackles: 0,
      ownGoals: 0
    }
  }

  startMatch(config) {
    this.audio.ensure()
    this.lastConfig = { ...config }
    this.clearTeams()
    const homeInfo = getTeam(config.home)
    const awayInfo = getTeam(config.away)
    const difficulty = DIFFICULTIES[config.difficulty] || DIFFICULTIES.pro
    const homeFormation = config.formation || homeInfo.formation
    this.settings.difficulty = difficulty.id
    this.settings.halfSeconds = config.halfSeconds || this.settings.halfSeconds
    this.settings.cameraMode = config.cameraMode || this.settings.cameraMode

    this.match = {
      home: {
        side: 'home',
        info: homeInfo,
        attackSign: 1,
        score: 0,
        formation: homeFormation,
        stats: { possession: 0, shots: 0, onTarget: 0, passes: 0, tackles: 0, saves: 0 }
      },
      away: {
        side: 'away',
        info: awayInfo,
        attackSign: -1,
        score: 0,
        formation: awayInfo.formation,
        stats: { possession: 0, shots: 0, onTarget: 0, passes: 0, tackles: 0, saves: 0 }
      },
      half: 1,
      time: this.settings.halfSeconds,
      elapsed: 0,
      difficulty,
      firstKickoff: 'home',
      lastScorer: null
    }

    for (const side of ['home', 'away']) {
      const team = this.match[side]
      const squad = makeSquad(team.info, team.formation)
      team.squad = squad
      team.entities = squad.map((player, index) => this.createEntity(team, player, index))
      this.players.push(...team.entities)
    }

    this.match.away.entities.forEach((entity) => {
      if (colorDistance(this.match.home.info.primary, this.match.away.info.primary) < 80) {
        entity.model.torso.material.color.set(this.match.away.info.secondary)
      }
    })

    this.ball.mesh.visible = true
    this.controlledRing.visible = true
    this.players.forEach((player) => { player.model.group.visible = true })

    this.state = 'kickoff'
    this.setupKickoff('home', 2.4)
    this.audio.startCrowd()
    this.audio.whistle(false)
    this.callbacks.onState?.(this.state)
    this.callbacks.onMatchStart?.()
    this.updateHud(0)
  }

  restartMatch() {
    if (this.lastConfig) this.startMatch(this.lastConfig)
  }

  clearTeams() {
    for (const player of this.players) {
      this.scene.remove(player.model.group)
      player.model.group.traverse((object) => {
        if (object.geometry) object.geometry.dispose()
        if (object.material) {
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose?.())
          else object.material.dispose?.()
        }
      })
    }
    this.players = []
    this.ball.owner = null
    this.ball.lastTouch = null
    this.controlled = null
  }

  setupKickoff(side, delay = 2.2) {
    if (!this.match) return
    this.state = 'kickoff'
    this.kickoffTimer = delay
    this.kickoffSide = side
    this.kickoffCount = Math.ceil(delay)
    this.ball.owner = null
    this.ball.noPickup = 0.2
    this.ball.lastPass = null
    this.ball.pos.set(0, BALL_RADIUS, 0)
    this.ball.vel.set(0, 0, 0)
    this.ball.mesh.position.copy(this.ball.pos)
    this.ball.mesh.visible = true
    this.resetPositions(side)
    const team = this.match[side]
    this.kickoffTaker = team.entities.find((player) => player.data.role === 'ST') || team.entities[9]
    this.controlled = this.match.home.entities
      .filter((player) => !player.data.isGK)
      .sort((a, b) => a.pos.distanceToSquared(this.ball.pos) - b.pos.distanceToSquared(this.ball.pos))[0]
    this.callbacks.onKickoff?.({ side, team: team.info, delay })
    this.callbacks.onState?.(this.state)
  }

  resetPositions(kickoffSide) {
    for (const side of ['home', 'away']) {
      const team = this.match[side]
      const isKicking = side === kickoffSide
      team.entities.forEach((entity) => {
        const slot = entity.data.slot
        let x = slot.x * 30.5
        let z = slot.z * 45 * team.attackSign
        if (entity.data.isGK) {
          z = -team.attackSign * (PITCH.halfLength - 1.2)
        } else {
          z = team.attackSign > 0 ? Math.min(z, -2.5) : Math.max(z, 2.5)
        }
        if (isKicking && entity.data.role === 'ST') {
          x = 0
          z = -team.attackSign * 1.1
        }
        if (isKicking && entity.data.role === 'CM' && Math.abs(entity.data.slot.x) < 0.2) {
          x = 1.8 * (entity.data.slot.x >= 0 ? 1 : -1)
          z = -team.attackSign * 3.2
        }
        entity.pos.set(x, 0, z)
        entity.vel.set(0, 0, 0)
        entity.facing = team.attackSign > 0 ? Math.PI : 0
        entity.model.group.position.set(x, 0, z)
        entity.model.group.rotation.set(0, entity.facing, 0)
      })
    }
    this.ball.pos.set(0, BALL_RADIUS, 0)
    this.ball.vel.set(0, 0, 0)
    this.ball.mesh.position.copy(this.ball.pos)
    this.controlledRing.position.set(0, 0.04, 0)
  }

  beginPlay() {
    const team = this.match[this.kickoffSide]
    const taker = this.kickoffTaker
    if (taker) {
      taker.pos.set(0, 0, -team.attackSign * 0.9)
      taker.model.group.position.copy(taker.pos)
      this.ball.owner = taker
      this.ball.lastTouch = taker
      this.ball.lastTouchSide = team.side
      this.ball.pos.set(0, BALL_RADIUS, 0)
      this.ball.vel.set(0, 0, 0)
      if (team.side === 'home') {
        this.controlled = taker
        this.audio.kick()
      }
    }
    this.state = 'playing'
    this.callbacks.onState?.(this.state)
  }

  pause() {
    if (this.state !== 'playing' && this.state !== 'kickoff') return
    this.pausedFrom = this.state
    this.state = 'paused'
    this.callbacks.onState?.(this.state)
  }

  resume() {
    if (this.state !== 'paused') return
    this.state = this.pausedFrom || 'playing'
    this.callbacks.onState?.(this.state)
    this.audio.ensure()
  }

  quitToMenu() {
    this.state = 'menu'
    this.players.forEach((player) => { player.model.group.visible = false })
    this.ball.mesh.visible = false
    this.controlledRing.visible = false
    this.aimLine.visible = false
    this.audio.stopCrowd()
    this.callbacks.onState?.(this.state)
  }

  setSettings(settings) {
    Object.assign(this.settings, settings)
    this.audio.setVolume(this.settings.volume)
    this.applyQuality(this.settings.quality)
    if (this.match && settings.halfSeconds) {
      this.match.time = Math.min(this.match.time, settings.halfSeconds)
    }
  }

  applyQuality(quality) {
    this.settings.quality = quality
    const low = quality === 'low'
    this.renderer.shadowMap.enabled = !low
    this.stadium.sun.castShadow = !low
    this.renderer.setPixelRatio(low ? 1 : Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.stadium.sun.shadow.mapSize.set(low ? 1024 : 2048, low ? 1024 : 2048)
    if (this.stadium.sun.shadow.map) {
      this.stadium.sun.shadow.map.dispose()
      this.stadium.sun.shadow.map = null
    }
  }

  setMove(x, z) {
    this.touchMove.x = clamp(x, -1, 1)
    this.touchMove.z = clamp(z, -1, 1)
  }

  setSprint(value) {
    this.input.sprint = !!value
  }

  beginShoot() {
    if (this.state !== 'playing') return
    if (!this.ball.owner || this.ball.owner !== this.controlled) return
    this.input.charging = true
    this.input.charge = 0
  }

  releaseShoot() {
    if (!this.input.charging) return
    const power = clamp(0.6 + this.input.charge * 0.9, 0.6, 1.4)
    this.input.charging = false
    this.input.charge = 0
    this.shoot(power)
  }

  shoot(power = 1) {
    if (this.state !== 'playing' || !this.controlled || this.ball.owner !== this.controlled) return
    const player = this.controlled
    const team = player.team
    const goalZ = team.attackSign * PITCH.halfLength
    const accuracy = team.side === 'home' ? 0.93 : this.match.difficulty.accuracy
    const spread = (1 - accuracy) * 5
    const aimX = clamp(
      player.pos.x * 0.12 + clamp(player.vel.x * 0.18, -1.2, 1.2) + (Math.random() - 0.5) * spread,
      -3.9,
      3.9
    )
    const target = new THREE.Vector3(aimX, 1.05, goalZ + team.attackSign * 0.8)
    const direction = target.clone().sub(this.ball.pos)
    const horizontal = Math.hypot(direction.x, direction.z)
    const speed = 22 + power * 11 + (player.data.shooting / 100) * 5
    this.ball.vel.set(
      (direction.x / horizontal) * speed,
      1.5 + power * 2.4,
      (direction.z / horizontal) * speed
    )
    this.releaseBall(player)
    this.ball.noPickup = 0.34
    player.kickTimer = 0.24
    team.stats.shots += 1
    if (Math.abs(aimX) < PITCH.goalHalfWidth + 0.4) team.stats.onTarget += 1
    this.audio.kick()
  }

  releaseBall(player) {
    this.ball.owner = null
    this.ball.lastTouch = player
    this.ball.lastTouchSide = player.team.side
    this.ball.noPickup = 0.16
  }

  pass() {
    if (this.state !== 'playing') return
    if (!this.controlled) return
    if (this.ball.owner !== this.controlled) {
      this.switchPlayer()
      return
    }
    const player = this.controlled
    const mates = player.team.entities.filter((mate) => mate !== player && !mate.data.isGK)
    if (!mates.length) return
    const opponents = this.otherTeam(player.team).entities
    let best = null
    let bestScore = -Infinity
    for (const mate of mates) {
      const distance = mate.pos.distanceTo(player.pos)
      if (distance < 3 || distance > 42) continue
      const forward = (mate.pos.z - player.pos.z) * player.team.attackSign
      const nearestOpponent = opponents.reduce((min, opponent) => Math.min(min, opponent.pos.distanceTo(mate.pos)), 99)
      const score = forward * 0.45 + nearestOpponent * 1.25 - Math.abs(distance - 18) * 0.35
      if (score > bestScore) {
        bestScore = score
        best = mate
      }
    }
    if (!best) best = mates.find((mate) => mate.data.role === 'ST') || mates[0]
    this.passTo(player, best)
    this.pendingSwitch = best
  }

  passTo(player, mate) {
    const lead = mate.vel.clone().multiplyScalar(0.28)
    const target = mate.pos.clone().add(lead)
    const direction = target.sub(player.pos)
    direction.y = 0
    const distance = Math.max(0.1, direction.length())
    let speed = clamp(11 + distance * 0.72, 12, 29)
    if (mate.data.isGK) speed = clamp(speed, 12, 22)
    direction.normalize()
    this.ball.vel.set(direction.x * speed, 0.55, direction.z * speed)
    this.releaseBall(player)
    this.ball.lastPass = { player, time: this.elapsed }
    this.ball.noPickup = 0.2
    player.team.stats.passes += 1
    player.kickTimer = 0.16
    this.audio.pass()
  }

  switchPlayer() {
    if (!this.match || this.state !== 'playing') return
    const field = this.match.home.entities.filter((player) => !player.data.isGK)
    if (!field.length) return
    const sorted = [...field].sort((a, b) => a.pos.distanceToSquared(this.ball.pos) - b.pos.distanceToSquared(this.ball.pos))
    const currentIndex = sorted.indexOf(this.controlled)
    this.controlled = sorted[(currentIndex + 1) % sorted.length]
    this.controlledRing.position.set(this.controlled.pos.x, 0.04, this.controlled.pos.z)
  }

  tackle() {
    if (this.state !== 'playing' || !this.controlled) return
    this.attemptTackle(this.controlled, true)
  }

  attemptTackle(player, manual) {
    if (player.cooldown > 0 || player.tackleTimer > 0) return
    player.tackleTimer = 0.4
    player.cooldown = manual ? 0.65 : 1.1
    const owner = this.ball.owner
    if (owner && owner.team !== player.team && owner.pos.distanceTo(player.pos) < 1.8) {
      const chance = 0.48 + player.data.defending / 240 + (manual ? 0.14 : 0) - owner.data.pace / 520
      if (Math.random() < chance) {
        this.ball.owner = player
        this.ball.lastTouch = player
        this.ball.lastTouchSide = player.team.side
        this.ball.noPickup = 0.1
        player.team.stats.tackles += 1
        player.tackles += 1
        owner.kickTimer = 0.2
        this.audio.tackle()
        if (player.team.side === 'home') {
          this.controlled = player
          this.callbacks.onEvent?.({ text: 'TACKLE WON', type: 'good' })
        }
      }
      return
    }
    if (!owner && this.ball.pos.distanceTo(player.pos) < 1.5) {
      this.ball.owner = player
      this.ball.lastTouch = player
      this.ball.lastTouchSide = player.team.side
    }
  }

  otherTeam(team) {
    return team.side === 'home' ? this.match.away : this.match.home
  }

  bindEvents() {
    window.addEventListener('resize', () => this.resize())
    window.addEventListener('keydown', (event) => {
      if (event.code === 'KeyP' || (event.code === 'Escape' && (this.state === 'playing' || this.state === 'paused'))) {
        event.preventDefault()
        this.callbacks.onPauseToggle?.()
        return
      }
      if (event.code === 'KeyM') {
        this.callbacks.onMuteToggle?.()
        return
      }
      if (this.state !== 'playing') return
      if (['Space', 'ShiftLeft', 'ShiftRight', 'KeyK'].includes(event.code)) event.preventDefault()
      this.keys.add(event.code)
      if (event.code === 'Space') this.pass()
      if (event.code === 'KeyK') this.beginShoot()
      if (event.code === 'KeyE') this.tackle()
      if (event.code === 'KeyQ') this.switchPlayer()
    })
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code)
      if (event.code === 'KeyK') this.releaseShoot()
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') this.input.sprint = false
    })
    this.canvas.addEventListener('mousedown', (event) => {
      if (this.state !== 'playing') return
      if (event.button === 0) this.beginShoot()
      if (event.button === 2) this.pass()
    })
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.releaseShoot()
    })
    this.canvas.addEventListener('contextmenu', (event) => {
      if (this.state === 'playing') event.preventDefault()
    })
  }

  loop() {
    const dt = Math.min(this.clock.getDelta(), 0.05)
    this.elapsed += dt
    this.stadium.update(this.elapsed)

    if (this.state === 'menu') {
      this.updateMenuCamera(dt)
      this.renderer.render(this.scene, this.camera)
      requestAnimationFrame(this.loop)
      return
    }

    if (this.state === 'paused' || this.state === 'over') {
      this.renderer.render(this.scene, this.camera)
      requestAnimationFrame(this.loop)
      return
    }

    if (this.state === 'kickoff') {
      this.kickoffTimer -= dt
      const count = Math.ceil(this.kickoffTimer)
      if (count !== this.kickoffCount && count > 0) {
        this.kickoffCount = count
        this.callbacks.onKickoff?.({ side: this.kickoffSide, team: this.match[this.kickoffSide].info, count })
      }
      this.updatePlayerModels(dt)
      this.updateCamera(dt)
      if (this.kickoffTimer <= 0) this.beginPlay()
      this.updateHud(dt)
      this.renderer.render(this.scene, this.camera)
      requestAnimationFrame(this.loop)
      return
    }

    if (this.state === 'goal') {
      this.goalTimer -= dt
      this.updatePlayerModels(dt)
      this.updateCamera(dt)
      if (this.goalTimer <= 0) this.setupKickoff(this.goalConcededSide, 1.8)
      this.updateHud(dt)
      this.renderer.render(this.scene, this.camera)
      requestAnimationFrame(this.loop)
      return
    }

    if (this.state === 'halftime') {
      this.halftimeTimer -= dt
      this.updatePlayerModels(dt)
      this.updateCamera(dt)
      if (this.halftimeTimer <= 0) this.beginSecondHalf()
      this.updateHud(dt)
      this.renderer.render(this.scene, this.camera)
      requestAnimationFrame(this.loop)
      return
    }

    this.updateMatchClock(dt)
    if (this.state !== 'playing') {
      this.renderer.render(this.scene, this.camera)
      requestAnimationFrame(this.loop)
      return
    }

    if (this.input.charging) this.input.charge = Math.min(1, this.input.charge + dt * 0.9)

    this.updateControlled(dt)
    this.updateAI(dt)
    this.updateBall(dt)
    this.updatePlayerModels(dt)
    this.resolveCollisions()
    this.updateCamera(dt)
    this.aimLine.visible = this.input.charging
    this.updateMinimap(dt)
    this.updateHud(dt)
    this.renderer.render(this.scene, this.camera)
    requestAnimationFrame(this.loop)
  }

  updateMatchClock(dt) {
    this.match.time -= dt
    this.match.elapsed += dt
    const owner = this.ball.owner
    const possessionSide = owner ? owner.team.side : this.ball.lastTouchSide
    this.match[possessionSide].stats.possession += dt
    if (this.match.time <= 0) {
      this.match.time = 0
      if (this.match.half === 1) this.endHalf()
      else this.endMatch()
    }
  }

  endHalf() {
    this.state = 'halftime'
    this.halftimeTimer = 3.6
    this.audio.whistle(true)
    this.callbacks.onHalfTime?.({
      score: [this.match.home.score, this.match.away.score],
      stats: this.statsSnapshot(),
      half: 1
    })
    this.callbacks.onState?.(this.state)
  }

  beginSecondHalf() {
    this.match.half = 2
    this.match.time = this.settings.halfSeconds
    this.match.home.attackSign *= -1
    this.match.away.attackSign *= -1
    const side = this.match.firstKickoff === 'home' ? 'away' : 'home'
    this.setupKickoff(side, 2.2)
    this.audio.whistle(false)
  }

  endMatch() {
    this.state = 'over'
    this.audio.fullTime()
    this.callbacks.onFullTime?.(this.resultSnapshot())
    this.callbacks.onState?.(this.state)
  }

  statsSnapshot() {
    const totalPossession = this.match.home.stats.possession + this.match.away.stats.possession
    const homePossession = totalPossession > 0 ? Math.round((this.match.home.stats.possession / totalPossession) * 100) : 50
    return {
      possession: [homePossession, 100 - homePossession],
      shots: [this.match.home.stats.shots, this.match.away.stats.shots],
      onTarget: [this.match.home.stats.onTarget, this.match.away.stats.onTarget],
      passes: [this.match.home.stats.passes, this.match.away.stats.passes],
      tackles: [this.match.home.stats.tackles, this.match.away.stats.tackles],
      saves: [this.match.home.stats.saves, this.match.away.stats.saves]
    }
  }

  resultSnapshot() {
    const home = this.match.home
    const away = this.match.away
    const candidates = this.players.map((player) => ({
      player,
      value:
        player.goals * 30 +
        player.assists * 14 +
        player.tackles * 1.2 +
        player.saves * 2.5 -
        player.ownGoals * 20 +
        player.data.rating * 0.12
    }))
    candidates.sort((a, b) => b.value - a.value)
    return {
      home: home.info,
      away: away.info,
      score: [home.score, away.score],
      stats: this.statsSnapshot(),
      possession: this.statsSnapshot().possession,
      mvp: candidates[0]?.player
        ? {
            name: candidates[0].player.data.name,
            team: candidates[0].player.team.info.name,
            rating: candidates[0].player.data.rating,
            goals: candidates[0].player.goals,
            assists: candidates[0].player.assists,
            role: candidates[0].player.data.role
          }
        : null,
      halfSeconds: this.settings.halfSeconds
    }
  }

  updateControlled(dt) {
    const player = this.controlled
    if (!player) return
    player.cooldown = Math.max(0, player.cooldown - dt)
    player.tackleCooldown = Math.max(0, player.tackleCooldown - dt)
    player.kickTimer = Math.max(0, player.kickTimer - dt)

    const forwardInput = (this.keys.has('KeyW') ? 1 : 0) - (this.keys.has('KeyS') ? 1 : 0) + this.touchMove.z
    const rightInput = (this.keys.has('KeyD') ? 1 : 0) - (this.keys.has('KeyA') ? 1 : 0) + this.touchMove.x
    const yaw = this.match.home.attackSign > 0 ? Math.PI : 0
    const forwardX = -Math.sin(yaw)
    const forwardZ = -Math.cos(yaw)
    const rightX = Math.cos(yaw)
    const rightZ = -Math.sin(yaw)
    let moveX = forwardX * forwardInput + rightX * rightInput
    let moveZ = forwardZ * forwardInput + rightZ * rightInput
    const magnitude = Math.hypot(moveX, moveZ)
    if (magnitude > 1) {
      moveX /= magnitude
      moveZ /= magnitude
    }

    const sprinting = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.input.sprint) && magnitude > 0.1
    const staminaFactor = player.stamina > 0.18 ? 1 : 0.78
    const baseSpeed = 4.35 + player.data.pace * 0.032
    const speed = baseSpeed * (sprinting ? 1.44 : 1) * staminaFactor * (player.data.isGK ? 0.86 : 1)
    if (sprinting) player.stamina = Math.max(0, player.stamina - dt * 0.24)
    else player.stamina = Math.min(1, player.stamina + dt * 0.15)

    const accel = 1 - Math.exp(-9 * dt)
    player.vel.x += (moveX * speed - player.vel.x) * accel
    player.vel.z += (moveZ * speed - player.vel.z) * accel
    player.vel.multiplyScalar(magnitude > 0.05 ? 1 : Math.pow(0.0025, dt))
    player.pos.addScaledVector(player.vel, dt)
    this.clampPlayer(player)

    if (magnitude > 0.08) {
      player.facing = Math.atan2(moveX, moveZ)
    } else if (this.ball.owner === player) {
      player.facing = Math.atan2(-player.pos.x * 0.02, player.team.attackSign)
    }
    if (player.tackleTimer > 0) player.tackleTimer = Math.max(0, player.tackleTimer - dt)

    if (this.pendingSwitch) {
      this.pendingSwitchTimer = (this.pendingSwitchTimer || 0) + dt
      if (this.pendingSwitchTimer > 0.22) {
        if (this.pendingSwitch.team.side === 'home') this.controlled = this.pendingSwitch
        this.pendingSwitch = null
        this.pendingSwitchTimer = 0
      }
    }

    if (this.ball.owner && this.ball.owner.team.side === 'home' && this.ball.owner !== this.controlled) {
      this.controlled = this.ball.owner
    }
  }

  clampPlayer(player) {
    player.pos.x = clamp(player.pos.x, -PITCH.halfWidth - 1.6, PITCH.halfWidth + 1.6)
    player.pos.z = clamp(player.pos.z, -PITCH.halfLength - 1.2, PITCH.halfLength + 1.2)
  }

  updateAI(dt) {
    for (const team of [this.match.home, this.match.away]) {
      const nearest = this.findNearest(team)
      for (const player of team.entities) {
        if (player === this.controlled) continue
        player.cooldown = Math.max(0, player.cooldown - dt)
        player.kickTimer = Math.max(0, player.kickTimer - dt)
        player.tackleTimer = Math.max(0, player.tackleTimer - dt)
        player.aiTimer -= dt
        if (player.data.isGK) {
          this.updateGoalkeeper(player, dt)
          continue
        }
        this.updateFieldAI(player, nearest, dt)
      }
    }
  }

  findNearest(team) {
    let nearest = null
    let bestDistance = Infinity
    for (const player of team.entities) {
      if (player.data.isGK) continue
      const distance = player.pos.distanceToSquared(this.ball.pos)
      if (distance < bestDistance) {
        bestDistance = distance
        nearest = player
      }
    }
    return nearest
  }

  formationTarget(player, ballWeight = 0.12) {
    const team = player.team
    const slot = player.data.slot
    const baseZ = player.data.isGK
      ? -team.attackSign * (PITCH.halfLength - 1.2)
      : slot.z * 44 * team.attackSign
    let x = slot.x * 30
    let z = baseZ
    if (!player.data.isGK) {
      x += this.ball.pos.x * 0.12
      z += this.ball.pos.z * ballWeight
      const behind = (this.ball.pos.z - player.pos.z) * team.attackSign
      if (behind > 8) z += team.attackSign * 5
      if (behind < -15) z -= team.attackSign * 3
    }
    return new THREE.Vector3(clamp(x, -31, 31), 0, clamp(z, -50, 50))
  }

  updateFieldAI(player, nearest, dt) {
    const team = player.team
    const owner = this.ball.owner
    const difficulty = this.match.difficulty
    let target = this.formationTarget(player)
    let speed = 4.1 + player.data.pace * 0.027

    if (owner === player) {
      target = this.dribbleTarget(player)
      speed = 4.4 + player.data.pace * 0.028
      if (player.aiTimer <= 0) {
        player.aiTimer = 0.24 + Math.random() * 0.18
        this.aiDecision(player)
      }
    } else if (owner && owner.team === team) {
      const support = this.formationTarget(player, 0.18)
      const ahead = (player.pos.z - owner.pos.z) * team.attackSign
      if (ahead > 0 && ahead < 25) {
        support.z += team.attackSign * 4
        support.x += (player.pos.x - owner.pos.x) * 0.15
      }
      target = support
      speed *= 0.92
    } else if (owner && owner.team !== team) {
      if (player === nearest) {
        target = owner.pos.clone()
        speed *= 1.12
        if (owner.pos.distanceTo(player.pos) < 1.3 && player.cooldown <= 0 && Math.random() < dt * 1.8) {
          this.attemptTackle(player, false)
        }
      } else {
        target = this.formationTarget(player, 0.16)
        target.z -= team.attackSign * 2.5
        speed *= 0.94
      }
    } else if (player === nearest) {
      target = this.ball.pos.clone()
      speed *= 1.14
    }

    if (!player.data.isGK) {
      if (player.data.isGK) target.z = -team.attackSign * (PITCH.halfLength - 1.2)
      speed += difficulty.speed * 0.28
      if (player.data.isStar) speed *= 1.04
    }
    const distance = player.pos.distanceTo(target)
    if (distance > 26) speed *= 1.06
    if (distance < 1.2) speed *= Math.max(0, distance / 1.2)

    this.steer(player, target, dt, speed)
    if (owner === player && player.kickTimer <= 0) {
      this.ball.pos.set(
        player.pos.x + Math.sin(player.facing) * 0.62,
        BALL_RADIUS,
        player.pos.z + Math.cos(player.facing) * 0.62
      )
      this.ball.vel.copy(player.vel)
    }
  }

  dribbleTarget(player) {
    const team = player.team
    const goalZ = team.attackSign * PITCH.halfLength
    let lateral = player.pos.x * 0.55
    const opponents = this.otherTeam(team).entities
    for (const opponent of opponents) {
      const dx = opponent.pos.x - player.pos.x
      const dz = opponent.pos.z - player.pos.z
      if (Math.abs(dz) < 3.5 && Math.abs(dx) < 2.3) {
        lateral -= Math.sign(dx || 1) * 2.4
      }
    }
    lateral = clamp(lateral, -27, 27)
    return new THREE.Vector3(lateral, 0, goalZ - team.attackSign * 2)
  }

  aiDecision(player) {
    const team = player.team
    const goalZ = team.attackSign * PITCH.halfLength
    const distanceGoal = Math.hypot(player.pos.x, goalZ - player.pos.z)
    const owner = this.ball.owner
    const opponents = this.otherTeam(team).entities
    const pressure = opponents.reduce((min, opponent) => Math.min(min, opponent.pos.distanceTo(player.pos)), 99)
    const accuracy = this.match.difficulty.accuracy + (player.data.shooting - 70) * 0.002

    if (distanceGoal < 24 && pressure > 1.4 && Math.random() < 0.45 * accuracy) {
      const aimX = clamp((Math.random() - 0.5) * (1 - accuracy) * 9 + player.pos.x * 0.08, -3.6, 3.6)
      const target = new THREE.Vector3(aimX, 1, goalZ + team.attackSign)
      const direction = target.clone().sub(this.ball.pos)
      const horizontal = Math.hypot(direction.x, direction.z)
      const shotSpeed = 21 + player.data.shooting * 0.08
      this.ball.vel.set(
        (direction.x / horizontal) * shotSpeed,
        1.4 + Math.random() * 2,
        (direction.z / horizontal) * shotSpeed
      )
      this.releaseBall(player)
      player.kickTimer = 0.22
      team.stats.shots += 1
      if (Math.abs(aimX) < PITCH.goalHalfWidth + 0.3) team.stats.onTarget += 1
      this.audio.kick()
      return
    }

    if (pressure < 2.6 || Math.random() < 0.24) {
      const mates = team.entities.filter((mate) => mate !== player && !mate.data.isGK)
      let best = null
      let bestScore = -Infinity
      for (const mate of mates) {
        const distance = mate.pos.distanceTo(player.pos)
        if (distance < 3 || distance > 34) continue
        const forward = (mate.pos.z - player.pos.z) * team.attackSign
        const nearestOpponent = opponents.reduce((min, opponent) => Math.min(min, opponent.pos.distanceTo(mate.pos)), 99)
        const score = forward * 0.5 + nearestOpponent * 1.3 - Math.abs(distance - 16) * 0.2
        if (score > bestScore) {
          bestScore = score
          best = mate
        }
      }
      if (best && bestScore > 4) {
        this.passTo(player, best)
      }
    }
  }

  updateGoalkeeper(player, dt) {
    const team = player.team
    const goalZ = -team.attackSign * PITCH.halfLength
    const distanceToBall = player.pos.distanceTo(this.ball.pos)
    let targetX = clamp(this.ball.pos.x * 0.34, -3.35, 3.35)
    let targetZ = goalZ + team.attackSign * 0.9
    if (distanceToBall < 10 && (!this.ball.owner || this.ball.owner.team !== team)) {
      targetZ = goalZ + team.attackSign * clamp(4 - distanceToBall * 0.25, 0.4, 3.6)
    }
    if (player.diveTimer > 0) {
      player.diveTimer = Math.max(0, player.diveTimer - dt)
      targetX += player.diveSide * 1.4
      targetZ = goalZ + team.attackSign * 0.4
    }
    this.steer(player, new THREE.Vector3(targetX, 0, targetZ), dt, 4.5)
    if (this.ball.pos.distanceTo(player.pos) < 1.55 && this.ball.pos.y < 2.2 && this.ball.owner !== player) {
      const incoming = this.ball.vel.z * team.attackSign > 0
      if (incoming || this.ball.vel.length() < 10) {
        const saveChance = 0.58 + player.data.rating / 300 - this.ball.vel.length() / 90
        if (Math.random() < saveChance) {
          player.saves += 1
          player.team.stats.saves += 1
          this.ball.vel.z *= -0.35
          this.ball.vel.x = (this.ball.pos.x - player.pos.x) * 7 + (Math.random() - 0.5) * 4
          this.ball.vel.y = 2.5 + Math.random() * 2
          this.ball.owner = null
          this.ball.noPickup = 0.3
          player.diveTimer = 0.4
          player.diveSide = Math.sign(this.ball.pos.x - player.pos.x) || 1
          this.audio.save()
          this.callbacks.onEvent?.({ text: 'SAVE!', type: 'save' })
        }
      }
    }
  }

  steer(player, target, dt, speed) {
    const dx = target.x - player.pos.x
    const dz = target.z - player.pos.z
    const distance = Math.hypot(dx, dz)
    if (distance < 0.05) {
      player.vel.multiplyScalar(0.9)
      return
    }
    const desiredX = (dx / distance) * speed
    const desiredZ = (dz / distance) * speed
    const accel = 1 - Math.exp(-7 * dt)
    player.vel.x += (desiredX - player.vel.x) * accel
    player.vel.z += (desiredZ - player.vel.z) * accel
    player.pos.x += player.vel.x * dt
    player.pos.z += player.vel.z * dt
    this.clampPlayer(player)
    if (Math.hypot(player.vel.x, player.vel.z) > 0.5) {
      player.facing = Math.atan2(player.vel.x, player.vel.z)
    }
  }

  updateBall(dt) {
    const ball = this.ball
    if (ball.owner) {
      const owner = ball.owner
      const forward = 0.64
      ball.pos.x = owner.pos.x + Math.sin(owner.facing) * forward
      ball.pos.z = owner.pos.z + Math.cos(owner.facing) * forward
      ball.pos.y = BALL_RADIUS
      ball.vel.copy(owner.vel)
      ball.mesh.position.copy(ball.pos)
      ball.spin.set(owner.vel.z, 0, -owner.vel.x).multiplyScalar(0.6)
      ball.mesh.rotation.x += ball.spin.x * dt
      ball.mesh.rotation.z += ball.spin.z * dt
      return
    }

    ball.noPickup = Math.max(0, ball.noPickup - dt)
    ball.vel.y -= GRAVITY * dt
    ball.pos.addScaledVector(ball.vel, dt)
    const speed = ball.vel.length()
    if (ball.pos.y <= BALL_RADIUS) {
      ball.pos.y = BALL_RADIUS
      if (ball.vel.y < -1.2) {
        ball.vel.y = -ball.vel.y * 0.42
        this.audio.pass()
      } else {
        ball.vel.y = 0
      }
      const friction = Math.pow(0.985, dt * 60)
      ball.vel.x *= friction
      ball.vel.z *= friction
      if (Math.hypot(ball.vel.x, ball.vel.z) < 0.18) {
        ball.vel.x = 0
        ball.vel.z = 0
      }
    } else {
      ball.vel.x *= Math.pow(0.998, dt * 60)
      ball.vel.z *= Math.pow(0.998, dt * 60)
    }

    ball.mesh.position.copy(ball.pos)
    if (speed > 0.2) {
      ball.mesh.rotation.x += (ball.vel.z / BALL_RADIUS) * dt
      ball.mesh.rotation.z -= (ball.vel.x / BALL_RADIUS) * dt
    }

    if (ball.pos.z > PITCH.halfLength + BALL_RADIUS || ball.pos.z < -PITCH.halfLength - BALL_RADIUS) {
      if (this.isGoal()) {
        this.scoreGoal()
        return
      }
      this.handleEndLine()
      return
    }
    if (Math.abs(ball.pos.x) > PITCH.halfWidth + BALL_RADIUS) {
      this.handleThrowIn()
      return
    }

    if (ball.noPickup <= 0) {
      let nearest = null
      let best = Infinity
      for (const player of this.players) {
        if (player.kickTimer > 0) continue
        const distance = Math.hypot(player.pos.x - ball.pos.x, player.pos.z - ball.pos.z)
        const reach = player.data.isGK ? 1.35 : 0.95
        if (distance < reach && ball.pos.y < 1.45 && distance < best) {
          best = distance
          nearest = player
        }
      }
      if (nearest && speed < 27) {
        ball.owner = nearest
        ball.lastTouch = nearest
        ball.lastTouchSide = nearest.team.side
        ball.noPickup = 0.08
        ball.vel.set(0, 0, 0)
        if (nearest.team.side === 'home') this.controlled = nearest
      }
    }
  }

  isGoal() {
    const ball = this.ball
    if (Math.abs(ball.pos.x) >= PITCH.goalHalfWidth - BALL_RADIUS * 0.4) return false
    if (ball.pos.y >= PITCH.goalHeight) return false
    return Math.abs(ball.pos.z) > PITCH.halfLength + BALL_RADIUS * 0.6
  }

  scoreGoal() {
    const ball = this.ball
    if (this.state !== 'playing') return
    const scoringSide = this.match.home.attackSign === Math.sign(ball.pos.z) ? 'home' : 'away'
    const concedingSide = scoringSide === 'home' ? 'away' : 'home'
    const scoringTeam = this.match[scoringSide]
    const lastTouch = ball.lastTouch
    const ownGoal = lastTouch && lastTouch.team.side !== scoringSide
    let scorer = lastTouch
    if (!scorer || (!ownGoal && scorer.team.side !== scoringSide)) {
      scorer = scoringTeam.entities
        .filter((player) => !player.data.isGK)
        .sort((a, b) => a.pos.distanceToSquared(ball.pos) - b.pos.distanceToSquared(ball.pos))[0]
    }
    if (ownGoal && scorer) scorer.ownGoals += 1
    else if (scorer) scorer.goals += 1

    let assist = null
    if (!ownGoal && ball.lastPass && ball.lastPass.player.team.side === scoringSide && ball.lastPass.player !== scorer && this.elapsed - ball.lastPass.time < 7) {
      assist = ball.lastPass.player
      assist.assists += 1
    }

    scoringTeam.score += 1
    ball.vel.set(0, 0, 0)
    ball.owner = null
    ball.pos.z = Math.sign(ball.pos.z) * (PITCH.halfLength + 0.6)
    ball.mesh.position.copy(ball.pos)
    this.goalTimer = 3.5
    this.goalConcededSide = concedingSide
    this.state = 'goal'
    this.goalCamera = 0
    this.audio.goal()
    this.match.lastScorer = scorer
    this.callbacks.onGoal?.({
      side: scoringSide,
      team: scoringTeam.info,
      scorer: scorer?.data.name || 'UNKNOWN',
      scorerNumber: scorer?.data.number || 9,
      assist: assist?.data.name || null,
      ownGoal,
      minute: this.currentMinute(),
      score: [this.match.home.score, this.match.away.score]
    })
    this.callbacks.onState?.(this.state)
  }

  currentMinute() {
    const progress = 1 - this.match.time / this.settings.halfSeconds
    return Math.max(1, Math.min(90, Math.round((this.match.half === 1 ? 0 : 45) + progress * 45)))
  }

  handleThrowIn() {
    const ball = this.ball
    const lastSide = ball.lastTouchSide
    const awardedSide = lastSide === 'home' ? 'away' : 'home'
    const team = this.match[awardedSide]
    const z = clamp(ball.pos.z, -PITCH.halfLength + 2, PITCH.halfLength - 2)
    const x = Math.sign(ball.pos.x) * (PITCH.halfWidth - 0.7)
    this.restartPossession(team, new THREE.Vector3(x, BALL_RADIUS, z))
    this.callbacks.onEvent?.({ text: 'THROW-IN', type: 'info' })
  }

  handleEndLine() {
    const ball = this.ball
    const endSign = Math.sign(ball.pos.z)
    const scoringSide = this.match.home.attackSign === endSign ? 'home' : 'away'
    const defendingSide = scoringSide === 'home' ? 'away' : 'home'
    const lastSide = ball.lastTouchSide
    const defendingTeam = this.match[defendingSide]
    if (lastSide === defendingSide) {
      const attackSide = scoringSide
      const team = this.match[attackSide]
      const x = Math.sign(ball.pos.x || 1) * (PITCH.halfWidth - 1)
      const z = endSign * (PITCH.halfLength - 1)
      this.restartPossession(team, new THREE.Vector3(x, BALL_RADIUS, z))
      this.callbacks.onEvent?.({ text: 'CORNER', type: 'info' })
    } else {
      const gk = defendingTeam.entities.find((player) => player.data.isGK) || defendingTeam.entities[0]
      const z = endSign * (PITCH.halfLength - 6)
      this.restartPossession(defendingTeam, new THREE.Vector3(0, BALL_RADIUS, z), gk)
      this.callbacks.onEvent?.({ text: 'GOAL KICK', type: 'info' })
    }
  }

  restartPossession(team, position, preferred) {
    let player = preferred
    if (!player) {
      player = [...team.entities]
        .filter((entity) => !entity.data.isGK)
        .sort((a, b) => a.pos.distanceToSquared(position) - b.pos.distanceToSquared(position))[0]
    }
    if (!player) return
    player.pos.set(position.x, 0, position.z)
    player.vel.set(0, 0, 0)
    this.clampPlayer(player)
    this.ball.pos.copy(position)
    this.ball.pos.y = BALL_RADIUS
    this.ball.vel.set(0, 0, 0)
    this.ball.mesh.position.copy(this.ball.pos)
    this.ball.owner = player
    this.ball.lastTouch = player
    this.ball.lastTouchSide = team.side
    this.ball.noPickup = 0.1
    if (team.side === 'home') this.controlled = player
    this.updateCamera(0.016)
  }

  updatePlayerModels(dt) {
    for (const player of this.players) {
      const model = player.model
      const speed = Math.hypot(player.vel.x, player.vel.z)
      const moving = Math.min(1, speed / 4.5)
      model.runPhase += dt * (4.5 + speed * 1.25)
      const swing = Math.sin(model.runPhase) * 0.62 * moving
      const armSwing = Math.sin(model.runPhase + Math.PI) * 0.55 * moving
      model.leftLeg.rotation.x = swing
      model.rightLeg.rotation.x = -swing
      model.leftArm.rotation.x = armSwing
      model.rightArm.rotation.x = -armSwing

      let bob = Math.abs(Math.sin(model.runPhase * 2)) * 0.035 * moving
      model.group.position.set(player.pos.x, player.pos.y + bob, player.pos.z)
      model.group.rotation.y = player.facing
      model.group.rotation.x = 0
      model.group.rotation.z = 0

      if (player.tackleTimer > 0) {
        model.group.rotation.x = -0.38
        model.leftLeg.rotation.x = -0.9
        model.rightLeg.rotation.x = 0.5
      }
      if (player.diveTimer > 0) {
        model.group.rotation.z = player.diveSide * 0.9
        model.group.position.y = 0.45 + (0.4 - player.diveTimer) * 0.2
      }
      if (player.kickTimer > 0) {
        model.rightLeg.rotation.x = -0.95
        model.leftArm.rotation.x = 0.5
      }
      if (this.state === 'goal' && this.match?.lastScorer === player) {
        model.leftArm.rotation.x = -2.7
        model.rightArm.rotation.x = -2.7
        model.group.position.y = player.pos.y + Math.abs(Math.sin(this.elapsed * 4)) * 0.18
      }
    }

    if (this.controlled) {
      this.controlledRing.position.set(this.controlled.pos.x, 0.04, this.controlled.pos.z)
      this.controlledRing.material.color.set(this.ball.owner === this.controlled ? 0xffffff : 0xd8ff3e)
    }
  }

  resolveCollisions() {
    for (let first = 0; first < this.players.length; first += 1) {
      for (let second = first + 1; second < this.players.length; second += 1) {
        const a = this.players[first]
        const b = this.players[second]
        const dx = b.pos.x - a.pos.x
        const dz = b.pos.z - a.pos.z
        const distance = Math.hypot(dx, dz)
        if (distance > 0.001 && distance < PLAYER_RADIUS * 2) {
          const overlap = (PLAYER_RADIUS * 2 - distance) * 0.5
          const nx = dx / distance
          const nz = dz / distance
          a.pos.x -= nx * overlap
          a.pos.z -= nz * overlap
          b.pos.x += nx * overlap
          b.pos.z += nz * overlap
          this.clampPlayer(a)
          this.clampPlayer(b)
        }
      }
    }
  }

  updateCamera(dt) {
    if (this.state === 'menu') {
      this.updateMenuCamera(dt)
      return
    }
    const attackSign = this.match.home.attackSign
    this.cameraYaw = attackSign > 0 ? Math.PI : 0
    const focus = this.ball.pos.clone().lerp(this.controlled ? this.controlled.pos : this.ball.pos, 0.42)
    let desired
    let lookAt

    if (this.state === 'goal' && this.match.lastScorer) {
      this.goalCamera += dt * 0.55
      const scorer = this.match.lastScorer
      desired = new THREE.Vector3(
        scorer.pos.x + Math.sin(this.goalCamera) * 7.5,
        3.4,
        scorer.pos.z + Math.cos(this.goalCamera) * 7.5
      )
      lookAt = new THREE.Vector3(scorer.pos.x, 1.1, scorer.pos.z)
    } else if (this.settings.cameraMode === 'close' && this.controlled) {
      desired = new THREE.Vector3(
        this.controlled.pos.x * 0.82,
        4.9,
        this.controlled.pos.z - attackSign * 8.2
      )
      lookAt = new THREE.Vector3(focus.x * 0.7, 0.8, focus.z + attackSign * 4)
    } else {
      desired = new THREE.Vector3(
        focus.x * 0.62,
        16.8,
        focus.z - attackSign * 22
      )
      lookAt = new THREE.Vector3(focus.x * 0.55, 0.6, focus.z + attackSign * 5)
    }

    desired.x = clamp(desired.x, -38, 38)
    desired.z = clamp(desired.z, -108, 108)
    desired.y = clamp(desired.y, 3.4, 22)
    lookAt.x = clamp(lookAt.x, -30, 30)
    lookAt.z = clamp(lookAt.z, -60, 60)

    const ease = 1 - Math.exp(-3.8 * dt)
    this.camera.position.lerp(desired, this.state === 'goal' ? 1 - Math.exp(-2 * dt) : ease)
    this.camera.lookAt(lookAt)

    if (this.aimLine.visible && this.controlled) {
      const goalZ = this.controlled.team.attackSign * PITCH.halfLength
      const positions = this.aimLine.geometry.attributes.position
      positions.setXYZ(0, this.ball.pos.x, 0.12, this.ball.pos.z)
      positions.setXYZ(1, 0, 0.12, goalZ)
      positions.needsUpdate = true
      this.aimLine.computeLineDistances()
    }
  }

  updateMenuCamera(dt) {
    this.menuAngle += dt * 0.07
    const radius = 66
    this.camera.position.set(
      Math.sin(this.menuAngle) * radius,
      25 + Math.sin(this.menuAngle * 0.7) * 2,
      Math.cos(this.menuAngle) * radius
    )
    this.camera.lookAt(0, 3, 0)
  }

  updateMinimap(dt) {
    this.minimapTimer -= dt
    if (this.minimapTimer > 0) return
    this.minimapTimer = 0.08
    if (!this.minimapCanvas || !this.match) return
    const canvas = this.minimapCanvas
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = 'rgba(6,17,24,0.9)'
    ctx.fillRect(0, 0, width, height)
    const pad = 10
    const pitchWidth = width - pad * 2
    const pitchHeight = height - pad * 2
    ctx.strokeStyle = 'rgba(165,210,190,0.45)'
    ctx.lineWidth = 1
    ctx.strokeRect(pad, pad, pitchWidth, pitchHeight)
    ctx.beginPath()
    ctx.moveTo(pad, pad + pitchHeight / 2)
    ctx.lineTo(pad + pitchWidth, pad + pitchHeight / 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(width / 2, height / 2, 14, 0, Math.PI * 2)
    ctx.stroke()
    const toX = (x) => pad + ((x + PITCH.halfWidth) / (PITCH.halfWidth * 2)) * pitchWidth
    const toY = (z) => pad + ((z + PITCH.halfLength) / (PITCH.halfLength * 2)) * pitchHeight
    for (const player of this.players) {
      ctx.fillStyle = player.team.side === 'home' ? '#d8ff3e' : '#ff7a2f'
      ctx.beginPath()
      ctx.arc(toX(player.pos.x), toY(player.pos.z), player.data.isGK ? 3 : 2.4, 0, Math.PI * 2)
      ctx.fill()
      if (player === this.controlled) {
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1.2
        ctx.beginPath()
        ctx.arc(toX(player.pos.x), toY(player.pos.z), 4.6, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(toX(this.ball.pos.x), toY(this.ball.pos.z), 2.2, 0, Math.PI * 2)
    ctx.fill()
  }

  updateHud(dt) {
    this.hudTimer -= dt
    if (this.hudTimer > 0) return
    this.hudTimer = 0.08
    if (!this.match) return
    const totalPossession = this.match.home.stats.possession + this.match.away.stats.possession
    const homePossession = totalPossession > 0 ? Math.round((this.match.home.stats.possession / totalPossession) * 100) : 50
    const controlled = this.controlled
    this.callbacks.onHud?.({
      state: this.state,
      time: this.match.time,
      half: this.match.half,
      score: [this.match.home.score, this.match.away.score],
      home: this.match.home.info,
      away: this.match.away.info,
      possession: [homePossession, 100 - homePossession],
      shots: [this.match.home.stats.shots, this.match.away.stats.shots],
      passes: [this.match.home.stats.passes, this.match.away.stats.passes],
      controlled: controlled
        ? {
            name: controlled.data.name,
            number: controlled.data.number,
            role: controlled.data.role,
            rating: controlled.data.rating,
            stamina: controlled.stamina
          }
        : null,
      charging: this.input.charging,
      charge: this.input.charge,
      kickoff: this.state === 'kickoff' ? clamp(Math.ceil(this.kickoffTimer), 1, 3) : 0,
      goal: this.match.lastScorer && this.state === 'goal' ? this.match.lastScorer.data.name : null
    })
  }

  resize() {
    const width = window.innerWidth
    const height = window.innerHeight
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  debugState() {
    return {
      state: this.state,
      score: this.match ? [this.match.home.score, this.match.away.score] : [0, 0],
      time: this.match?.time ?? 0,
      half: this.match?.half ?? 1,
      ball: this.ball ? [this.ball.pos.x, this.ball.pos.y, this.ball.pos.z] : null,
      owner: this.ball?.owner ? this.ball.owner.data.name : null,
      controlled: this.controlled?.data.name || null,
      players: this.players.length,
      cameraMode: this.settings.cameraMode
    }
  }
}
