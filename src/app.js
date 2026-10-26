import { Game } from './game.js'
import { WEAPONS, PERKS, SECONDARY, weaponIcon } from './weapons.js'

const $ = (selector, scope = document) => scope.querySelector(selector)
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector))

const STORAGE_SETTINGS = 'codm.settings.v1'
const STORAGE_LOADOUT = 'codm.loadout.v1'

const DEFAULT_SETTINGS = { sensitivity: 1, fov: 78, volume: 0.7, quality: 'high', invertY: false }
const DEFAULT_LOADOUT = { primary: 'm4', perk: 'fastHands', secondary: 'pistol' }
const PERK_NAMES = { fastHands: 'FAST HANDS', lightweight: 'LIGHTWEIGHT', toughness: 'TOUGHNESS' }
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
const STAT_LABELS = { damage: 'DAMAGE', accuracy: 'ACCURACY', fireRate: 'FIRE RATE', mobility: 'MOBILITY', range: 'RANGE' }

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { ...fallback }
    const parsed = JSON.parse(raw)
    return { ...fallback, ...parsed }
  } catch {
    return { ...fallback }
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable */
  }
}

const settings = readStorage(STORAGE_SETTINGS, DEFAULT_SETTINGS)
const loadout = readStorage(STORAGE_LOADOUT, DEFAULT_LOADOUT)
if (!WEAPONS[loadout.primary]) loadout.primary = 'm4'
if (!PERKS[loadout.perk]) loadout.perk = 'fastHands'
if (SECONDARY.id !== loadout.secondary) loadout.secondary = 'pistol'

const state = {
  booted: false,
  muted: false,
  touchAds: false,
  settingsReturnTo: 'menu',
  hitTimer: 0,
  killTimer: 0,
  toastTimer: 0,
  uavTimer: 0,
  damageTimer: 0,
  feed: [],
  raf: 0,
  frames: 0,
  fpsClock: 0
}

const els = {
  body: document.body,
  boot: $('#boot'),
  bootFill: $('#boot-fill'),
  bootCopy: $('#boot-copy'),
  menu: $('#menu'),
  hud: $('#hud'),
  loadoutScreen: $('#loadout-screen'),
  settingsScreen: $('#settings-screen'),
  pauseScreen: $('#pause-screen'),
  resultsScreen: $('#results-screen'),
  countdown: $('#countdown'),
  countdownValue: $('#countdown-value'),
  countdownCopy: $('#countdown-copy'),
  respawn: $('#respawn'),
  respawnValue: $('#respawn-value'),
  killerLine: $('#killer-line'),
  deploy: $('#deploy-btn'),
  loadoutBtn: $('#loadout-btn'),
  loadoutClose: $('#loadout-close'),
  loadoutBack: $('#loadout-back'),
  loadoutEquip: $('#loadout-equip'),
  settingsClose: $('#settings-close'),
  settingsBack: $('#settings-back'),
  pauseSettings: $('#pause-settings-btn'),
  resume: $('#resume-btn'),
  quit: $('#quit-btn'),
  playAgain: $('#play-again'),
  resultsMenu: $('#results-menu'),
  hudPause: $('#hud-pause'),
  weaponCards: $('#weapon-cards'),
  perkCards: $('#perk-cards'),
  detailIcon: $('#detail-icon'),
  detailCategory: $('#detail-category'),
  detailName: $('#detail-name'),
  detailStats: $('#detail-stats'),
  detailMag: $('#detail-mag'),
  detailReserve: $('#detail-reserve'),
  detailMode: $('#detail-mode'),
  detailZoom: $('#detail-zoom'),
  secondaryIcon: $('#secondary-icon'),
  previewIcon: $('#preview-icon'),
  previewName: $('#preview-name'),
  previewClass: $('#preview-class'),
  previewStats: $('#preview-stats'),
  previewPerk: $('#preview-perk'),
  scorePlayer: $('#score-player'),
  scoreEnemy: $('#score-enemy'),
  matchTimer: $('#match-timer'),
  compass: $('#compass-label'),
  killfeed: $('#killfeed'),
  uavChip: $('#uav-chip'),
  uavBanner: $('#uav-banner'),
  streakValue: $('#streak-value'),
  streakPips: $('#streak-pips'),
  perkChip: $('#perk-chip'),
  healthPanel: $('#health-panel'),
  healthValue: $('#health-value'),
  healthFill: $('#health-fill'),
  slotPrimary: $('#slot-primary'),
  slotSecondary: $('#slot-secondary'),
  slotPrimaryName: $('#slot-primary-name'),
  slotSecondaryName: $('#slot-secondary-name'),
  ammoMag: $('#ammo-mag'),
  ammoReserve: $('#ammo-reserve'),
  weaponLabel: $('#weapon-label'),
  reloadTrack: $('#reload-track'),
  reloadFill: $('#reload-fill'),
  lethalCount: $('#lethal-count'),
  tacticalCount: $('#tactical-count'),
  crosshair: $('#crosshair'),
  scope: $('#scope-overlay'),
  hitmarker: $('#hitmarker'),
  killConfirm: $('#kill-confirm'),
  streakToast: $('#streak-toast'),
  flash: $('#flash-overlay'),
  damageVignette: $('#damage-vignette'),
  damageDirection: $('#damage-direction'),
  resultsEyebrow: $('#results-eyebrow'),
  resultsTitle: $('#results-title'),
  resultsPlayerScore: $('#results-player-score'),
  resultsEnemyScore: $('#results-enemy-score'),
  resultsKills: $('#results-kills'),
  resultsDeaths: $('#results-deaths'),
  resultsKd: $('#results-kd'),
  resultsAccuracy: $('#results-accuracy'),
  resultsHeadshots: $('#results-headshots'),
  resultsStreak: $('#results-streak'),
  sensitivity: $('#sensitivity'),
  sensitivityValue: $('#sensitivity-value'),
  fov: $('#fov'),
  fovValue: $('#fov-value'),
  invertY: $('#invert-y'),
  invertYValue: $('#invert-y-value'),
  volume: $('#volume'),
  volumeValue: $('#volume-value'),
  quality: $('#quality-control'),
  fps: $('#fps-stamp'),
  touchControls: $('#touch-controls'),
  stickZone: $('#stick-zone'),
  stickKnob: $('#stick-knob'),
  lookZone: $('#look-zone'),
  touchFire: $('#touch-fire'),
  touchAds: $('#touch-ads'),
  touchReload: $('#touch-reload'),
  touchJump: $('#touch-jump'),
  touchCrouch: $('#touch-crouch'),
  touchGrenade: $('#touch-grenade'),
  touchSwap: $('#touch-swap')
}

function show(el) {
  el?.classList.remove('hidden')
}

function hide(el) {
  el?.classList.add('hidden')
}

function setText(el, value) {
  if (el && el.textContent !== String(value)) el.textContent = value
}

function formatTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function buildLoadoutUI() {
  els.weaponCards.innerHTML = Object.values(WEAPONS)
    .map(
      (weapon) => `
      <button class="weapon-card" type="button" data-weapon="${weapon.id}">
        <div class="weapon-card-icon">${weaponIcon(weapon.id)}</div>
        <h3>${weapon.name}</h3>
        <p>${weapon.category}</p>
        <div class="mini-stats">
          ${['damage', 'accuracy', 'fireRate']
            .map(
              (key) => `<div class="mini-stat"><span>${STAT_LABELS[key]}</span><i><b style="width:${weapon.stats[key]}%"></b></i></div>`
            )
            .join('')}
        </div>
      </button>`
    )
    .join('')

  els.perkCards.innerHTML = Object.values(PERKS)
    .map(
      (perk) => `
      <button class="perk-card" type="button" data-perk="${perk.id}">
        <div class="perk-icon">${perk.icon}</div>
        <div><strong>${perk.name}</strong><span>${perk.detail}</span></div>
      </button>`
    )
    .join('')

  els.secondaryIcon.innerHTML = weaponIcon('pistol')
  els.previewIcon.innerHTML = weaponIcon('m4')

  els.streakPips.innerHTML = Array.from({ length: 5 }, () => '<span></span>').join('')

  $$('.weapon-card', els.weaponCards).forEach((card) => {
    card.addEventListener('click', () => {
      loadout.primary = card.dataset.weapon
      refreshLoadoutUI()
    })
  })

  $$('.perk-card', els.perkCards).forEach((card) => {
    card.addEventListener('click', () => {
      loadout.perk = card.dataset.perk
      refreshLoadoutUI()
    })
  })
}

function refreshLoadoutUI() {
  const weapon = WEAPONS[loadout.primary] || WEAPONS.m4
  $$('.weapon-card', els.weaponCards).forEach((card) => {
    card.classList.toggle('selected', card.dataset.weapon === weapon.id)
  })
  $$('.perk-card', els.perkCards).forEach((card) => {
    card.classList.toggle('selected', card.dataset.perk === loadout.perk)
  })

  els.previewIcon.innerHTML = weaponIcon(weapon.id)
  setText(els.previewName, weapon.name)
  setText(els.previewClass, weapon.category)
  els.previewStats.innerHTML = ['damage', 'accuracy', 'fireRate', 'mobility']
    .map(
      (key) =>
        `<div class="stat-line"><span>${STAT_LABELS[key]}</span><div class="bar"><span style="width:${weapon.stats[key]}%"></span></div><strong>${weapon.stats[key]}</strong></div>`
    )
    .join('')
  setText(els.previewPerk, PERK_NAMES[loadout.perk])

  els.detailIcon.innerHTML = weaponIcon(weapon.id)
  setText(els.detailCategory, weapon.category)
  setText(els.detailName, weapon.name)
  els.detailStats.innerHTML = ['damage', 'accuracy', 'fireRate', 'mobility', 'range']
    .map(
      (key) =>
        `<div class="stat-line"><span>${STAT_LABELS[key]}</span><div class="bar"><span style="width:${weapon.stats[key]}%"></span></div><strong>${weapon.stats[key]}</strong></div>`
    )
    .join('')
  setText(els.detailMag, weapon.mag)
  setText(els.detailReserve, weapon.reserve)
  setText(els.detailMode, weapon.auto ? 'AUTO' : 'SEMI')
  setText(els.detailZoom, `${weapon.adsZoom.toFixed(2).replace(/0$/, '')}×`)
  setText(els.perkChip, PERK_NAMES[loadout.perk])
}

function syncSettingsUI() {
  els.sensitivity.value = settings.sensitivity
  setText(els.sensitivityValue, Number(settings.sensitivity).toFixed(2))
  els.fov.value = settings.fov
  setText(els.fovValue, settings.fov)
  els.invertY.checked = !!settings.invertY
  setText(els.invertYValue, settings.invertY ? 'ON' : 'OFF')
  els.volume.value = settings.volume
  setText(els.volumeValue, Math.round(settings.volume * 100))
  $$('button[data-quality]', els.quality).forEach((button) => {
    button.classList.toggle('active', button.dataset.quality === settings.quality)
  })
}

function setNav(name) {
  $$('.nav-item[data-nav]').forEach((item) => {
    item.classList.toggle('active', item.dataset.nav === name)
  })
}

function hideAllPanels() {
  hide(els.menu)
  hide(els.loadoutScreen)
  hide(els.settingsScreen)
  hide(els.pauseScreen)
  hide(els.resultsScreen)
}

function openMenu() {
  hideAllPanels()
  show(els.menu)
  hide(els.hud)
  hide(els.countdown)
  hide(els.respawn)
  setNav('multiplayer')
}

function openLoadout() {
  hideAllPanels()
  show(els.loadoutScreen)
  setNav('loadout')
  refreshLoadoutUI()
}

function openSettings(returnTo) {
  state.settingsReturnTo = returnTo || (game.state === 'paused' ? 'pause' : 'menu')
  hideAllPanels()
  show(els.settingsScreen)
  setNav('settings')
  syncSettingsUI()
}

function closeSettings() {
  hide(els.settingsScreen)
  if (state.settingsReturnTo === 'pause' && game.state === 'paused') {
    show(els.pauseScreen)
  } else {
    openMenu()
  }
}

function applySettings(partial, persist = true) {
  Object.assign(settings, partial)
  game.setSettings(settings)
  if (persist) writeStorage(STORAGE_SETTINGS, settings)
  syncSettingsUI()
}

function toggleMute() {
  state.muted = !state.muted
  game.audio.setVolume(state.muted ? 0 : settings.volume)
  showToast(state.muted ? 'AUDIO MUTED' : 'AUDIO ONLINE')
}

function showToast(text, duration = 1500) {
  els.streakToast.textContent = text
  els.streakToast.classList.remove('show')
  void els.streakToast.offsetWidth
  els.streakToast.classList.add('show')
  clearTimeout(state.toastTimer)
  state.toastTimer = window.setTimeout(() => els.streakToast.classList.remove('show'), duration)
}

function showKillConfirm(text, headshot) {
  els.killConfirm.textContent = text
  els.killConfirm.classList.toggle('headshot', !!headshot)
  els.killConfirm.classList.remove('show')
  void els.killConfirm.offsetWidth
  els.killConfirm.classList.add('show')
  clearTimeout(state.killTimer)
  state.killTimer = window.setTimeout(() => els.killConfirm.classList.remove('show'), 1100)
}

function pulseHitmarker(headshot, kill) {
  els.hitmarker.classList.toggle('headshot', !!headshot)
  els.hitmarker.classList.toggle('kill', !!kill)
  els.hitmarker.classList.remove('show')
  void els.hitmarker.offsetWidth
  els.hitmarker.classList.add('show')
  clearTimeout(state.hitTimer)
  state.hitTimer = window.setTimeout(() => els.hitmarker.classList.remove('show'), 230)
}

function addFeed(entry) {
  const item = document.createElement('div')
  item.className = `feed-item ${entry.byPlayer ? 'friendly' : 'enemy'}`
  const killer = document.createElement('strong')
  killer.textContent = entry.killer
  const weapon = document.createElement('span')
  weapon.textContent = entry.weapon
  const arrow = document.createElement('span')
  arrow.textContent = entry.headshot ? '⌖' : '›'
  arrow.className = entry.headshot ? 'headshot' : ''
  const victim = document.createElement('span')
  victim.textContent = entry.victim
  item.append(killer, weapon, arrow, victim)
  els.killfeed.appendChild(item)
  while (els.killfeed.children.length > 5) els.killfeed.firstElementChild.remove()
  window.setTimeout(() => item.remove(), 5200)
}

function showUavBanner() {
  show(els.uavBanner)
  clearTimeout(state.uavTimer)
  state.uavTimer = window.setTimeout(() => hide(els.uavBanner), 3200)
}

function updateCompass(yaw) {
  const degrees = ((-yaw * 180) / Math.PI % 360 + 360) % 360
  const index = Math.round(degrees / 45) % 8
  setText(els.compass, `${COMPASS[index]} ${String(Math.round(degrees)).padStart(3, '0')}`)
}

function updateHud(data) {
  const health = Math.max(0, Math.round(data.health))
  setText(els.healthValue, health)
  els.healthFill.style.width = `${Math.max(0, Math.min(100, (data.health / data.maxHealth) * 100))}%`
  els.healthPanel.classList.toggle('low', health <= 35)

  setText(els.ammoMag, data.ammo)
  setText(els.ammoReserve, data.reserve)
  els.ammoMag.classList.toggle('low', data.ammo <= Math.max(2, Math.round(data.ammo * 0.2)))
  els.weaponLabel.innerHTML = `${data.weapon} <em>${data.category}</em>`

  els.slotPrimary.classList.toggle('active', data.activeIndex === 0)
  els.slotSecondary.classList.toggle('active', data.activeIndex === 1)
  setText(els.slotPrimaryName, data.primary)
  setText(els.slotSecondaryName, data.secondary)

  els.reloadTrack.classList.toggle('active', data.reloading)
  els.reloadFill.style.width = `${Math.round((data.reloadProgress || 0) * 100)}%`

  setText(els.lethalCount, data.grenades.lethal)
  setText(els.tacticalCount, data.grenades.tactical)
  setText(els.scorePlayer, data.scorePlayer)
  setText(els.scoreEnemy, data.scoreEnemy)
  setText(els.matchTimer, formatTime(data.time))
  setText(els.streakValue, data.streak)
  updateCompass(data.yaw)

  const pips = data.streak > 0 ? data.streak % 5 || 5 : 0
  $$('span', els.streakPips).forEach((pip, index) => pip.classList.toggle('on', index < pips))
  els.uavChip.classList.toggle('hidden', !(data.uav > 0))

  els.crosshair.style.setProperty('--gap', `${Math.round(data.crosshair)}px`)
  els.crosshair.classList.toggle('ads', data.ads > 0.4)
  els.crosshair.classList.toggle('hidden', !!data.scope || !data.alive)
  els.scope.classList.toggle('show', !!data.scope)
  els.flash.style.opacity = String(Math.min(0.95, data.flash * 0.95))

  if (!data.alive && game.state === 'playing') {
    show(els.respawn)
    setText(els.respawnValue, Math.max(0, Math.ceil(data.respawn)))
  } else if (data.alive) {
    hide(els.respawn)
  }
}

function onState(next) {
  if (next === 'menu') {
    openMenu()
    els.scope.classList.remove('show')
    hide(els.touchControls)
    els.killfeed.innerHTML = ''
    state.touchAds = false
    return
  }

  hideAllPanels()
  show(els.hud)

  if (next === 'countdown') {
    hide(els.respawn)
    if (game.isTouch) show(els.touchControls)
  } else if (next === 'playing') {
    hide(els.countdown)
    hide(els.respawn)
    hide(els.pauseScreen)
    if (game.isTouch) show(els.touchControls)
  } else if (next === 'paused') {
    show(els.pauseScreen)
    hide(els.touchControls)
    els.scope.classList.remove('show')
    state.touchAds = false
  } else if (next === 'over') {
    hide(els.countdown)
    hide(els.respawn)
    els.scope.classList.remove('show')
    hide(els.touchControls)
    show(els.resultsScreen)
    state.touchAds = false
  }
}

function onMatchEnd(result) {
  hide(els.hud)
  hide(els.countdown)
  hide(els.respawn)
  hide(els.pauseScreen)
  els.resultsTitle.classList.toggle('victory', result.victory)
  els.resultsTitle.classList.toggle('defeat', !result.victory)
  setText(els.resultsTitle, result.victory ? 'VICTORY' : 'DEFEAT')
  setText(els.resultsEyebrow, result.victory ? 'MATCH COMPLETE // OPERATOR WIN' : 'MATCH COMPLETE // OPERATOR LOSS')
  setText(els.resultsPlayerScore, result.playerScore)
  setText(els.resultsEnemyScore, result.enemyScore)
  setText(els.resultsKills, result.kills)
  setText(els.resultsDeaths, result.deaths)
  setText(els.resultsKd, (result.deaths ? result.kills / result.deaths : result.kills).toFixed(2))
  setText(els.resultsAccuracy, `${result.accuracy.toFixed(0)}%`)
  setText(els.resultsHeadshots, result.headshots)
  setText(els.resultsStreak, result.bestStreak)
}

function onCountdown(value) {
  if (value <= 0) {
    hide(els.countdown)
    return
  }
  show(els.countdown)
  const copy = value === 3 ? 'GET READY' : value === 2 ? 'DEPLOYING' : 'MOVE OUT'
  if (els.countdownValue.textContent !== String(value)) {
    setText(els.countdownValue, value)
    els.countdownValue.style.animation = 'none'
    void els.countdownValue.offsetWidth
    els.countdownValue.style.animation = ''
  }
  setText(els.countdownCopy, copy)
}

function onDamage(payload) {
  els.damageVignette.classList.add('show')
  clearTimeout(state.damageTimer)
  state.damageTimer = window.setTimeout(() => els.damageVignette.classList.remove('show'), 420)

  els.damageDirection.style.transform = `rotate(${payload.angle}rad)`
  els.damageDirection.classList.add('show')
  window.setTimeout(() => els.damageDirection.classList.remove('show'), 620)
}

function startMatch() {
  writeStorage(STORAGE_LOADOUT, loadout)
  game.startMatch(loadout)
}

function quitToMenu() {
  game.quitToMenu()
  els.killfeed.innerHTML = ''
  hide(els.respawn)
  hide(els.countdown)
}

const game = new Game($('#game-canvas'), $('#minimap'), {
  onMatchStart: () => {
    hideAllPanels()
    show(els.hud)
    hide(els.respawn)
    hide(els.killfeed)
  },
  onState,
  onCountdown,
  onHud: updateHud,
  onHitmarker: ({ headshot, kill }) => pulseHitmarker(headshot, kill),
  onKillfeed: addFeed,
  onKill: ({ victim, headshot, streak }) => {
    showKillConfirm(`${headshot ? 'HEADSHOT // ' : ''}ELIMINATED ${victim}`, headshot)
    if (streak >= 2 && streak % 5 !== 0) showToast(`${streak} KILL STREAK`)
  },
  onUav: () => {
    showUavBanner()
    showToast('UAV ONLINE')
  },
  onDamage,
  onDeath: ({ killer }) => {
    setText(els.killerLine, `ELIMINATED BY ${killer}`)
    show(els.respawn)
    state.touchAds = false
    els.touchAds.classList.remove('active')
  },
  onRespawn: () => {
    hide(els.respawn)
  },
  onMatchEnd,
  onFlash: () => {
    els.flash.style.transition = 'none'
    els.flash.style.opacity = '0.95'
    window.setTimeout(() => {
      els.flash.style.transition = 'opacity .7s ease'
    }, 30)
  },
  onPauseToggle: () => {
    if (game.state === 'playing') game.pause()
    else if (game.state === 'paused') game.resume()
  },
  onMuteToggle: toggleMute
})

game.setSettings(settings)
els.body.classList.toggle('touch-mode', game.isTouch)
buildLoadoutUI()
refreshLoadoutUI()
syncSettingsUI()
if (game.isTouch) hide(els.touchControls)

els.deploy.addEventListener('click', startMatch)
els.loadoutBtn.addEventListener('click', openLoadout)
els.loadoutClose.addEventListener('click', openMenu)
els.loadoutBack.addEventListener('click', openMenu)
els.loadoutEquip.addEventListener('click', startMatch)
els.settingsClose.addEventListener('click', closeSettings)
els.settingsBack.addEventListener('click', closeSettings)
els.pauseSettings.addEventListener('click', () => openSettings('pause'))
els.resume.addEventListener('click', () => game.resume())
els.quit.addEventListener('click', quitToMenu)
els.playAgain.addEventListener('click', () => game.restartMatch())
els.resultsMenu.addEventListener('click', quitToMenu)
els.hudPause.addEventListener('click', () => game.pause())

$$('.nav-item[data-nav]').forEach((item) => {
  item.addEventListener('click', () => {
    if (item.dataset.nav === 'loadout') openLoadout()
    else if (item.dataset.nav === 'settings') openSettings('menu')
    else openMenu()
  })
})

els.sensitivity.addEventListener('input', () => {
  applySettings({ sensitivity: Number(els.sensitivity.value) })
})
els.fov.addEventListener('input', () => {
  applySettings({ fov: Number(els.fov.value) })
})
els.volume.addEventListener('input', () => {
  applySettings({ volume: Number(els.volume.value) })
})
els.invertY.addEventListener('change', () => {
  applySettings({ invertY: els.invertY.checked })
})
$$('button[data-quality]', els.quality).forEach((button) => {
  button.addEventListener('click', () => {
    applySettings({ quality: button.dataset.quality })
  })
})

document.addEventListener('keydown', (event) => {
  if (event.code === 'Escape') {
    if (!els.settingsScreen.classList.contains('hidden')) closeSettings()
    else if (!els.loadoutScreen.classList.contains('hidden')) openMenu()
    else if (!els.resultsScreen.classList.contains('hidden')) quitToMenu()
  }
  if (event.code === 'Enter' && !els.menu.classList.contains('hidden')) startMatch()
})

const stick = { pointer: null, x: 0, y: 0, max: 46 }
const look = { pointer: null, x: 0, y: 0 }

function updateStick(clientX, clientY) {
  const rect = els.stickZone.getBoundingClientRect()
  let dx = clientX - (rect.left + rect.width / 2)
  let dy = clientY - (rect.top + rect.height / 2)
  const distance = Math.hypot(dx, dy)
  if (distance > stick.max) {
    dx = (dx / distance) * stick.max
    dy = (dy / distance) * stick.max
  }
  stick.x = dx / stick.max
  stick.y = dy / stick.max
  els.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`
  game.setTouchMove(stick.x, -stick.y)
}

function resetStick() {
  stick.pointer = null
  stick.x = 0
  stick.y = 0
  els.stickKnob.style.transform = ''
  game.setTouchMove(0, 0)
}

els.stickZone.addEventListener('pointerdown', (event) => {
  if (!game.isTouch) return
  event.preventDefault()
  stick.pointer = event.pointerId
  els.stickZone.setPointerCapture?.(event.pointerId)
  updateStick(event.clientX, event.clientY)
})

els.stickZone.addEventListener('pointermove', (event) => {
  if (stick.pointer !== event.pointerId) return
  event.preventDefault()
  updateStick(event.clientX, event.clientY)
})

els.stickZone.addEventListener('pointerup', (event) => {
  if (stick.pointer !== event.pointerId) return
  resetStick()
})

els.stickZone.addEventListener('pointercancel', resetStick)

els.lookZone.addEventListener('pointerdown', (event) => {
  if (!game.isTouch || game.state !== 'playing') return
  event.preventDefault()
  look.pointer = event.pointerId
  look.x = event.clientX
  look.y = event.clientY
  els.lookZone.setPointerCapture?.(event.pointerId)
})

els.lookZone.addEventListener('pointermove', (event) => {
  if (look.pointer !== event.pointerId) return
  event.preventDefault()
  const dx = event.clientX - look.x
  const dy = event.clientY - look.y
  look.x = event.clientX
  look.y = event.clientY
  game.look(dx * 1.35, dy * 1.35)
})

els.lookZone.addEventListener('pointerup', (event) => {
  if (look.pointer === event.pointerId) look.pointer = null
})

els.lookZone.addEventListener('pointercancel', () => {
  look.pointer = null
})

function bindTouchButton(el, handler, mode = 'tap') {
  el.addEventListener('pointerdown', (event) => {
    if (!game.isTouch) return
    event.preventDefault()
    event.stopPropagation()
    if (mode === 'hold') {
      handler(true)
      el.classList.add('active')
    } else {
      handler()
    }
  })
  if (mode === 'hold') {
    const release = (event) => {
      event?.preventDefault?.()
      handler(false)
      el.classList.remove('active')
    }
    el.addEventListener('pointerup', release)
    el.addEventListener('pointercancel', release)
    el.addEventListener('pointerleave', release)
  }
}

bindTouchButton(els.touchFire, (value) => game.setFiring(value), 'hold')
bindTouchButton(els.touchReload, () => game.reload())
bindTouchButton(els.touchJump, () => game.jump())
bindTouchButton(els.touchCrouch, () => game.toggleCrouch())
bindTouchButton(els.touchGrenade, () => game.throwGrenade('lethal'))
bindTouchButton(els.touchSwap, () => game.switchWeapon(game.activeSlotIndex === 0 ? 1 : 0))
bindTouchButton(els.touchAds, () => {
  state.touchAds = !state.touchAds
  game.setAds(state.touchAds)
  els.touchAds.classList.toggle('active', state.touchAds)
})

window.addEventListener('pointerup', (event) => {
  if (event.pointerType === 'touch') {
    game.setFiring(false)
    els.touchFire.classList.remove('active')
  }
})

function bootSequence() {
  const steps = [
    [0, 'ESTABLISHING UPLINK'],
    [34, 'LOADING STANDOFF'],
    [66, 'SYNCING OPERATORS'],
    [92, 'ARMING LOADOUT'],
    [100, 'READY']
  ]
  let progress = 0
  const timer = window.setInterval(() => {
    progress = Math.min(100, progress + 5 + Math.random() * 9)
    els.bootFill.style.width = `${progress}%`
    const step = steps.reduce((current, item) => (progress >= item[0] ? item : current), steps[0])
    setText(els.bootCopy, step[1])
    if (progress >= 100) {
      window.clearInterval(timer)
      window.setTimeout(() => {
        state.booted = true
        els.boot.classList.add('gone')
        openMenu()
        els.body.dataset.appReady = 'true'
      }, 320)
    }
  }, 90)
}

function startFpsCounter() {
  const tick = (time) => {
    state.frames += 1
    if (!state.fpsClock) state.fpsClock = time
    if (time - state.fpsClock >= 600) {
      const fps = Math.round((state.frames * 1000) / (time - state.fpsClock))
      setText(els.fps, `${fps} FPS`)
      state.frames = 0
      state.fpsClock = time
    }
    state.raf = requestAnimationFrame(tick)
  }
  state.raf = requestAnimationFrame(tick)
}

window.__CODM__ = {
  game,
  startMatch,
  openLoadout,
  openSettings,
  openMenu,
  quitToMenu,
  get loadout() {
    return { ...loadout }
  },
  get settings() {
    return { ...settings }
  },
  debugState: () => game.debugState()
}

bootSequence()
startFpsCounter()
