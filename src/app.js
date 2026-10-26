const W = 1000
const H = 640
const FIELD = { left: 46, right: 954, top: 46, bottom: 594 }
const GOAL_TOP = H / 2 - 75
const GOAL_BOTTOM = H / 2 + 75
const BALL_R = 8.5
const MATCH_SECONDS = 120

const TACTICS = {
  defensive: { push: -22, press: 35, note: 'Protect the lead', label: 'Defensive' },
  balanced: { push: 0, press: 60, note: 'Hold shape', label: 'Balanced' },
  attacking: { push: 28, press: 85, note: 'Push the line', label: 'Attacking' }
}

const HOME_SQUAD = [
  {
    number: 1, name: 'Milo Vance', pos: 'GK', rating: 84,
    attrs: { PAC: 58, SHO: 22, PAS: 71, DRI: 49, DEF: 78, PHY: 84 },
    note: 'A commanding shot-stopper who owns his six-yard box and starts attacks quickly.',
    x: 0.055, y: 0.5
  },
  {
    number: 3, name: 'Theo Marsh', pos: 'LB', rating: 79,
    attrs: { PAC: 83, SHO: 48, PAS: 76, DRI: 73, DEF: 77, PHY: 74 },
    note: 'An overlapping full-back with the engine to repeat sprints on the left flank.',
    x: 0.19, y: 0.14
  },
  {
    number: 4, name: 'Rafael Costa', pos: 'CB', rating: 86,
    attrs: { PAC: 70, SHO: 42, PAS: 74, DRI: 66, DEF: 88, PHY: 86 },
    note: 'Reads the game a beat early and defends the front post like a specialist.',
    x: 0.15, y: 0.38
  },
  {
    number: 5, name: 'Kian Okafor', pos: 'CB', rating: 82,
    attrs: { PAC: 74, SHO: 46, PAS: 72, DRI: 68, DEF: 84, PHY: 88 },
    note: 'A physical, front-foot centre-back who turns defence into first-phase possession.',
    x: 0.15, y: 0.62
  },
  {
    number: 2, name: 'Diego Serra', pos: 'RB', rating: 80,
    attrs: { PAC: 86, SHO: 51, PAS: 75, DRI: 76, DEF: 75, PHY: 72 },
    note: 'A flying right-back who arrives in the final third with real intent.',
    x: 0.19, y: 0.86
  },
  {
    number: 8, name: 'Luca Bennett', pos: 'CM', rating: 87,
    attrs: { PAC: 75, SHO: 78, PAS: 88, DRI: 86, DEF: 70, PHY: 76 },
    note: 'The tempo-setter. Receives on the half-turn and breaks lines with one pass.',
    x: 0.34, y: 0.3
  },
  {
    number: 6, name: 'Omar Haddad', pos: 'DM', rating: 83,
    attrs: { PAC: 68, SHO: 62, PAS: 82, DRI: 74, DEF: 84, PHY: 82 },
    note: 'A screen in front of the back four who never lets a second ball go uncontested.',
    x: 0.28, y: 0.5
  },
  {
    number: 10, name: 'Noah Reyes', pos: 'CM', rating: 88,
    attrs: { PAC: 80, SHO: 80, PAS: 87, DRI: 89, DEF: 64, PHY: 72 },
    note: 'Drifts into pockets, turns under pressure, and threads the final pass.',
    x: 0.34, y: 0.7
  },
  {
    number: 11, name: 'Elias Storm', pos: 'LW', rating: 89,
    attrs: { PAC: 92, SHO: 84, PAS: 80, DRI: 90, DEF: 42, PHY: 68 },
    note: 'A one-v-one winger with the acceleration to turn a quiet match into a highlight reel.',
    x: 0.47, y: 0.16
  },
  {
    number: 9, name: 'Marco Silva', pos: 'ST', rating: 91,
    attrs: { PAC: 86, SHO: 93, PAS: 78, DRI: 87, DEF: 38, PHY: 84 },
    note: 'A ruthless penalty-box finisher with the first touch to open a defence. Club captain.',
    x: 0.47, y: 0.5
  },
  {
    number: 7, name: 'Jaden Cole', pos: 'RW', rating: 85,
    attrs: { PAC: 89, SHO: 82, PAS: 78, DRI: 86, DEF: 44, PHY: 70 },
    note: 'Direct, fearless, and always looking to attack the far post from the right.',
    x: 0.47, y: 0.84
  }
]

const AWAY_SQUAD = [
  { number: 1, name: 'Ivan Petrov', pos: 'GK', rating: 86, x: 0.055, y: 0.5 },
  { number: 12, name: 'Samir Khan', pos: 'LB', rating: 79, x: 0.19, y: 0.14 },
  { number: 4, name: 'Victor Lang', pos: 'CB', rating: 84, x: 0.15, y: 0.38 },
  { number: 5, name: 'Aaron Pike', pos: 'CB', rating: 81, x: 0.15, y: 0.62 },
  { number: 2, name: 'Nico Ferrer', pos: 'RB', rating: 80, x: 0.19, y: 0.86 },
  { number: 8, name: 'Tomas Vela', pos: 'CM', rating: 84, x: 0.34, y: 0.3 },
  { number: 6, name: 'Erik Holm', pos: 'DM', rating: 82, x: 0.28, y: 0.5 },
  { number: 10, name: 'Ren Ito', pos: 'CM', rating: 86, x: 0.34, y: 0.7 },
  { number: 11, name: 'Malik Ross', pos: 'LW', rating: 84, x: 0.47, y: 0.16 },
  { number: 9, name: 'Dario Voss', pos: 'ST', rating: 87, x: 0.47, y: 0.5 },
  { number: 7, name: 'Benji Cruz', pos: 'RW', rating: 83, x: 0.47, y: 0.84 }
]

const FORMATION_POSITIONS = [
  { x: 50, y: 92 }, { x: 13, y: 73 }, { x: 36, y: 79 }, { x: 64, y: 79 },
  { x: 87, y: 73 }, { x: 27, y: 52 }, { x: 50, y: 58 }, { x: 73, y: 52 },
  { x: 20, y: 27 }, { x: 50, y: 17 }, { x: 80, y: 27 }
]

const PACKS = {
  gold: { cost: 7500, currency: 'coins', min: 78, max: 84, label: 'Gold Scout' },
  elite: { cost: 60, currency: 'gems', min: 85, max: 89, label: 'Elite Scout' },
  legend: { cost: 250, currency: 'gems', min: 90, max: 94, label: 'Legend Scout' }
}

const SIGNING_NAMES = [
  'Adrian Wolfe', 'Kaito Mori', 'Sami Alvar', 'Tobias Reed', 'Lucas Neves',
  'Idris Bello', 'Emil Sorensen', 'Rui Tavares', 'Andre Silva', 'Marek Nowak',
  'Yusuf Demir', 'Thiago Rocha', 'Finn Mercer', 'Iker Solano', 'Nabil Amari',
  'Gustavo Lima', 'Owen Hart', 'Dani Ferrer', 'Leo Castel', 'Ayo Balogun'
]

const PROFILE_KEY = 'dls-football-profile-v1'
const DEFAULT_PROFILE = {
  coins: 24850,
  gems: 320,
  played: 18,
  wins: 14,
  goals: 42,
  rank: 3,
  form: ['W', 'W', 'D', 'W', 'L'],
  dailyDate: null,
  shortlist: []
}

const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector))

const canvas = $('#pitch')
const ctx = canvas.getContext('2d')
const refs = {
  scoreHome: $('#score-home'),
  scoreAway: $('#score-away'),
  clock: $('#match-clock'),
  overlay: $('#pitch-overlay'),
  goalBurst: $('#goal-burst'),
  goalTeam: $('#goal-team'),
  possession: $('#possession-label'),
  tacticLabel: $('#tactic-label'),
  tacticNote: $('#tactic-note'),
  pressBar: $('#press-bar'),
  pressValue: $('#press-value'),
  feedMinute: $('#feed-minute'),
  commentary: $('#commentary'),
  touch: $('#touch-controls'),
  toast: $('#toast'),
  walletCoins: $('#wallet-coins'),
  walletGems: $('#wallet-gems'),
  statWins: $('#stat-wins'),
  statGoals: $('#stat-goals'),
  statRank: $('#stat-rank'),
  statForm: $('#stat-form'),
  formationChips: $('#formation-chips'),
  detailRating: $('#detail-rating'),
  detailName: $('#detail-name'),
  detailRole: $('#detail-role'),
  detailNumber: $('#detail-number'),
  attributeList: $('#attribute-list'),
  playerNote: $('#player-note')
}

let profile = loadProfile()
let selectedPlayer = 9
let state

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function fieldX(normalized) {
  return FIELD.left + normalized * (FIELD.right - FIELD.left)
}

function fieldY(normalized) {
  return FIELD.top + normalized * (FIELD.bottom - FIELD.top)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROFILE_KEY) || 'null')
    return { ...DEFAULT_PROFILE, ...(saved && typeof saved === 'object' ? saved : {}) }
  } catch {
    return { ...DEFAULT_PROFILE }
  }
}

function saveProfile() {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // Storage can be unavailable in private or sandboxed pages.
  }
}

function formatNumber(value) {
  return Math.round(value).toLocaleString('en-US')
}

function updateWallet() {
  refs.walletCoins.textContent = formatNumber(profile.coins)
  refs.walletGems.textContent = formatNumber(profile.gems)
}

function updateSeasonStats() {
  refs.statWins.textContent = profile.wins
  refs.statGoals.textContent = profile.goals
  refs.statRank.textContent = `#${profile.rank}`
  refs.statForm.textContent = profile.form.slice(-5).join('-')
}

function showToast(message) {
  refs.toast.textContent = message
  refs.toast.classList.add('is-visible')
  window.clearTimeout(showToast.timer)
  showToast.timer = window.setTimeout(() => {
    refs.toast.classList.remove('is-visible')
  }, 3200)
}

function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`
}

function updateDailyButton() {
  const button = $('#daily-reward')
  if (!button) return
  if (profile.dailyDate === todayKey()) {
    button.disabled = true
    button.textContent = 'Claimed today'
  } else {
    button.disabled = false
    button.textContent = 'Claim 1,000 coins'
  }
}

function renderSquad() {
  refs.formationChips.innerHTML = HOME_SQUAD.map((player, index) => {
    const position = FORMATION_POSITIONS[index]
    const shortName = player.name.split(' ').slice(-1)[0]
    return `
      <button class="formation-chip${player.pos === 'GK' ? ' gk' : ''}${index === selectedPlayer ? ' selected' : ''}"
        type="button" data-index="${index}" style="left:${position.x}%;top:${position.y}%"
        aria-label="${escapeHtml(player.name)}, ${player.pos}, rating ${player.rating}">
        <span class="chip-shirt">${player.number}<span class="chip-rating">${player.rating}</span></span>
        <span class="chip-name">${escapeHtml(shortName)}</span>
      </button>
    `
  }).join('')
}

function selectPlayer(index) {
  const player = HOME_SQUAD[index]
  if (!player) return
  selectedPlayer = index
  $$('.formation-chip', refs.formationChips).forEach((chip) => {
    chip.classList.toggle('selected', Number(chip.dataset.index) === index)
  })

  refs.detailRating.textContent = player.rating
  refs.detailName.textContent = player.name
  refs.detailRole.textContent = `${player.pos} \u00b7 ${index === 9 ? 'Captain' : 'First team'}`
  refs.detailNumber.textContent = player.number
  refs.playerNote.textContent = player.note
  refs.attributeList.innerHTML = Object.entries(player.attrs).map(([label, value]) => `
    <div class="attribute">
      <div class="attribute-top"><span>${label}</span><strong>${value}</strong></div>
      <div class="attribute-bar"><i data-value="${value}"></i></div>
    </div>
  `).join('')

  requestAnimationFrame(() => {
    $$('.attribute-bar i', refs.attributeList).forEach((bar) => {
      bar.style.width = `${bar.dataset.value}%`
    })
  })
}

function buildPlayers(squad, team) {
  return squad.map((player, index) => {
    const attackDirection = team === 'home' ? 1 : -1
    return {
      id: `${team}-${index}`,
      team,
      number: player.number,
      name: player.name,
      role: player.pos === 'GK' ? 'GK' : player.pos,
      rating: player.rating,
      baseX: team === 'home' ? player.x : 1 - player.x,
      baseY: player.y,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      fx: attackDirection,
      fy: 0,
      r: 13,
      speed: player.pos === 'GK' ? 185 : player.pos.includes('B') ? 160 : player.pos === 'DM' ? 165 : player.pos.includes('W') ? 180 : player.pos === 'ST' ? 182 : 168,
      decisionTimer: Math.random() * 0.4
    }
  })
}

function createState() {
  return {
    running: false,
    paused: true,
    over: false,
    time: 0,
    score: { home: 0, away: 0 },
    players: [...buildPlayers(HOME_SQUAD, 'home'), ...buildPlayers(AWAY_SQUAD, 'away')],
    ball: { x: W / 2, y: H / 2, vx: 0, vy: 0, owner: null, noPickup: 0, lastTouch: null },
    activeId: null,
    keys: new Set(),
    tactic: 'balanced',
    goalTimer: 0,
    pendingKickoff: 'home',
    possession: { home: 0, away: 0 },
    commentary: [],
    lastManualAt: 0,
    frame: 0,
    hudTimer: 0
  }
}

function playerById(id) {
  return state.players.find((player) => player.id === id) || null
}

function activePlayer() {
  return playerById(state.activeId)
}

function resetPositions(kickoffTeam = null) {
  for (const player of state.players) {
    player.x = fieldX(player.baseX)
    player.y = fieldY(player.baseY)
    player.vx = 0
    player.vy = 0
    player.fx = player.team === 'home' ? 1 : -1
    player.fy = 0
    player.decisionTimer = Math.random() * 0.4
  }

  const ball = state.ball
  ball.x = W / 2
  ball.y = H / 2
  ball.vx = 0
  ball.vy = 0
  ball.owner = null
  ball.noPickup = 0
  ball.lastTouch = null

  if (kickoffTeam) {
    const taker = state.players.find((player) => player.team === kickoffTeam && player.role === 'ST')
    if (taker) {
      ball.owner = taker
      taker.fx = kickoffTeam === 'home' ? 1 : -1
      taker.fy = 0
      ball.x = taker.x + taker.fx * (taker.r + BALL_R + 2)
      ball.y = taker.y
    }
  }

  updateActiveSelection()
}

function updateActiveSelection() {
  const ball = state.ball
  let target = null

  if (ball.owner && ball.owner.team === 'home') {
    target = ball.owner
  } else {
    let best = Infinity
    for (const player of state.players) {
      if (player.team !== 'home' || player.role === 'GK') continue
      const d = distance(player, ball)
      if (d < best) {
        best = d
        target = player
      }
    }
  }

  if (target) state.activeId = target.id
}

function startMatch() {
  state.running = true
  state.paused = false
  state.over = false
  state.time = 0
  state.score = { home: 0, away: 0 }
  state.goalTimer = 0
  state.possession = { home: 0, away: 0 }
  state.pendingKickoff = 'home'
  state.commentary = []
  resetPositions('home')
  hideGoalBurst()
  hideOverlay()
  updateScoreboard()
  updateClock(true)
  addCommentary('Kick off! Northgate get us underway at a packed Northgate Stadium.', '')
  showToast('Matchday live \u2014 90 minutes on the clock.')
}

function endMatch() {
  state.running = false
  state.paused = true
  state.over = true
  state.goalTimer = 0
  hideGoalBurst()

  const home = state.score.home
  const away = state.score.away
  const result = home > away ? 'win' : home < away ? 'loss' : 'draw'
  recordResult(result, home, away)

  const title = result === 'win' ? 'Northgate take the points' : result === 'loss' ? 'Ironvale edge it' : 'Honours even'
  const summary = result === 'win'
    ? 'The press held, the finishing landed, and the Northgate end is on its feet.'
    : result === 'loss'
      ? 'A lesson in the final third. Reset, recover, and go again.'
      : 'A point apiece. The league table stays tight.'

  showOverlay(`
    <span class="overlay-badge">Full time</span>
    <strong>${title} \u00b7 ${home}\u2013${away}</strong>
    <p>${summary}</p>
    <button class="btn btn-primary btn-sm" id="overlay-action" type="button">Play again</button>
  `)
  addCommentary(`Full time. Northgate ${home}\u2013${away} Ironvale.`, result === 'win' ? 'goal' : '')
}

function recordResult(result, home, away) {
  profile.played += 1
  profile.goals += home
  if (result === 'win') {
    profile.wins += 1
    profile.rank = Math.max(1, profile.rank - 1)
  } else if (result === 'loss') {
    profile.rank = Math.min(20, profile.rank + 1)
  }
  const letter = result === 'win' ? 'W' : result === 'loss' ? 'L' : 'D'
  profile.form = [...profile.form, letter].slice(-5)
  saveProfile()
  updateSeasonStats()
}

function showOverlay(html) {
  refs.overlay.innerHTML = html
  refs.overlay.classList.remove('is-hidden')
}

function hideOverlay() {
  refs.overlay.classList.add('is-hidden')
}

function updateScoreboard() {
  refs.scoreHome.textContent = state.score.home
  refs.scoreAway.textContent = state.score.away
}

function gameClockSeconds() {
  return Math.min(90 * 60, Math.round((state.time / MATCH_SECONDS) * 90 * 60))
}

function updateClock(force = false) {
  const total = gameClockSeconds()
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  refs.clock.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  refs.feedMinute.textContent = `${minutes}'`
  if (force) refs.feedMinute.textContent = `${minutes}'`
}

function addCommentary(text, kind = '') {
  state.commentary.push({ minute: Math.floor(gameClockSeconds() / 60), text, kind })
  if (state.commentary.length > 16) state.commentary.shift()
  renderCommentary()
}

function renderCommentary() {
  refs.commentary.innerHTML = state.commentary.map((item) => {
    const className = item.kind ? ` class="${item.kind}"` : ''
    return `<li${className}><span>${item.minute}'</span>${escapeHtml(item.text)}</li>`
  }).join('')
  refs.commentary.scrollTop = refs.commentary.scrollHeight
}

function updateTacticDisplay() {
  const tactic = TACTICS[state.tactic]
  refs.tacticLabel.textContent = tactic.label
  refs.tacticNote.textContent = tactic.note
  refs.pressBar.style.width = `${tactic.press}%`
  refs.pressValue.textContent = `${tactic.press}%`
  $$('.tactic-buttons button').forEach((button) => {
    button.classList.toggle('active', button.dataset.tactic === state.tactic)
  })
}

function showGoalBurst(team, scorer) {
  refs.goalTeam.textContent = team === 'home' ? 'Northgate United' : 'Ironvale'
  refs.goalBurst.classList.remove('is-live')
  void refs.goalBurst.offsetWidth
  refs.goalBurst.classList.add('is-live')
  window.clearTimeout(showGoalBurst.timer)
  showGoalBurst.timer = window.setTimeout(() => {
    refs.goalBurst.classList.remove('is-live')
  }, 2400)
  if (scorer) refs.goalBurst.dataset.scorer = scorer
}

function hideGoalBurst() {
  refs.goalBurst.classList.remove('is-live')
}

function scoreGoal(team) {
  if (state.goalTimer > 0 || state.over) return
  state.score[team] += 1
  const scorer = state.ball.lastTouch && state.ball.lastTouch.team === team
    ? state.ball.lastTouch.name
    : 'a deflection'
  const teamName = team === 'home' ? 'Northgate United' : 'Ironvale'
  addCommentary(`GOAL! ${teamName} score through ${scorer}.`, 'goal')
  showGoalBurst(team, scorer)
  updateScoreboard()
  state.paused = true
  state.goalTimer = 2.6
  state.pendingKickoff = team === 'home' ? 'away' : 'home'
  state.ball.owner = null
}

function update(dt) {
  state.frame += 1
  updateActiveSelection()
  updateActive(dt)

  const direction = inputVector()
  const manual = direction.x !== 0 || direction.y !== 0 || performance.now() - state.lastManualAt < 700
  if (direction.x !== 0 || direction.y !== 0 || state.keys.has('ShiftLeft') || state.keys.has('ShiftRight')) {
    state.lastManualAt = performance.now()
  }

  const possession = state.ball.owner ? state.ball.owner.team : null
  if (possession) state.possession[possession] += dt
  const ranks = computeRanks()

  for (const player of state.players) {
    if (player.id === state.activeId && manual) continue
    if (player.role === 'GK') {
      updateGoalkeeper(player, dt)
    } else if (state.ball.owner === player) {
      updateAiBallCarrier(player, dt)
    } else {
      updateOffBall(player, ranks[player.id] ?? 9, possession, dt)
    }
  }

  resolvePlayerCollisions()
  updateBall(dt)
  updateClock()

  state.hudTimer += dt
  if (state.hudTimer >= 0.25) {
    state.hudTimer = 0
    updatePossessionHud()
  }
}

function inputVector() {
  let x = 0
  let y = 0
  const keys = state.keys
  if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1
  if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1
  const length = Math.hypot(x, y)
  if (length > 0) {
    x /= length
    y /= length
  }
  return { x, y }
}

function updateActive(dt) {
  const player = activePlayer()
  if (!player) return
  const { x, y } = inputVector()
  const hasBall = state.ball.owner === player
  const sprinting = (state.keys.has('ShiftLeft') || state.keys.has('ShiftRight')) && !hasBall
  const speed = player.speed * 1.42 * (sprinting ? 1.26 : 1)

  if (x !== 0 || y !== 0) {
    player.vx += (x * speed - player.vx) * Math.min(1, dt * 16)
    player.vy += (y * speed - player.vy) * Math.min(1, dt * 16)
  } else {
    const drag = Math.pow(0.0005, dt)
    player.vx *= drag
    player.vy *= drag
  }

  player.x += player.vx * dt
  player.y += player.vy * dt

  if (Math.hypot(player.vx, player.vy) > 12) {
    const speedNow = Math.hypot(player.vx, player.vy)
    player.fx = player.vx / speedNow
    player.fy = player.vy / speedNow
  }

  clampPlayer(player)
}

function computeRanks() {
  const ranks = {}
  const ball = state.ball
  for (const team of ['home', 'away']) {
    const outfield = state.players
      .filter((player) => player.team === team && player.role !== 'GK')
      .sort((a, b) => distance(a, ball) - distance(b, ball))
    outfield.forEach((player, index) => {
      ranks[player.id] = index
    })
  }
  return ranks
}

function updateOffBall(player, rank, possession, dt) {
  const ball = state.ball
  const attackDirection = player.team === 'home' ? 1 : -1
  const hasPossession = possession === player.team
  const baseX = fieldX(player.baseX)
  const baseY = fieldY(player.baseY)
  const ballAdvance = clamp((ball.x - W / 2) * attackDirection * 0.16, -86, 96)
  const tacticPush = player.team === 'home' ? TACTICS[state.tactic].push : 0

  let targetX = baseX + ballAdvance * attackDirection + tacticPush * attackDirection
  let targetY = baseY + clamp((ball.y - baseY) * 0.2, -78, 78)

  if (hasPossession) {
    const rolePush = player.role === 'ST' ? 32 : player.role.includes('W') ? 22 : player.role.includes('M') ? 10 : 0
    targetX += rolePush * attackDirection
    if (rank === 1) {
      targetX = ball.x - attackDirection * 46
      targetY = ball.y + (player.baseY < 0.5 ? -34 : 34)
    }
  } else if (rank < 2) {
    targetX = ball.x
    targetY = ball.y
  }

  const pressing = !hasPossession && rank < 2
  const speed = player.speed * (pressing ? 1.08 : 0.9)
  moveTowards(player, targetX, targetY, speed, dt)
}

function updateAiBallCarrier(player, dt) {
  const ball = state.ball
  const attackDirection = player.team === 'home' ? 1 : -1
  const goalX = attackDirection > 0 ? FIELD.right + 14 : FIELD.left - 14
  const goalY = H / 2

  player.decisionTimer -= dt

  if (player.decisionTimer <= 0) {
    player.decisionTimer = 0.3 + Math.random() * 0.34
    const goalDistance = Math.hypot(goalX - player.x, goalY - player.y)
    const nearestOpponent = nearestOpponentTo(player)
    const pressure = nearestOpponent ? distance(player, nearestOpponent) : 999

    if (player.role === 'GK') {
      const targetX = W / 2 + (Math.random() - 0.5) * 260
      const targetY = H / 2 + (Math.random() - 0.5) * 300
      releaseBall(player, targetX, targetY, 790)
      addCommentary(`${player.name} launches it clear for ${teamName(player.team)}.`, 'save')
      return
    }

    if (goalDistance < 255 && Math.random() < 0.45) {
      aiShoot(player)
      return
    }

    if (pressure < 58 && Math.random() < 0.68) {
      const teammate = findAiPassTarget(player)
      if (teammate) {
        releaseBall(player, teammate.x + teammate.vx * 0.15, teammate.y + teammate.vy * 0.15, 620)
        return
      }
    }

    if (Math.random() < 0.1) {
      const teammate = findAiPassTarget(player)
      if (teammate) {
        releaseBall(player, teammate.x, teammate.y, 600)
        return
      }
    }
  }

  if (ball.owner !== player) return

  let targetX = goalX
  let targetY = goalY
  const opponent = nearestOpponentTo(player)
  if (opponent && distance(player, opponent) < 96) {
    const dx = goalX - player.x
    const dy = goalY - player.y
    const length = Math.hypot(dx, dy) || 1
    const perpX = -dy / length
    const perpY = dx / length
    const side = (opponent.x - player.x) * perpX + (opponent.y - player.y) * perpY > 0 ? -1 : 1
    targetX += perpX * side * 150
    targetY += perpY * side * 120
  }

  moveTowards(player, targetX, targetY, player.speed * 1.02, dt)
}

function updateGoalkeeper(player, dt) {
  const ball = state.ball
  const ownGoalX = player.team === 'home' ? FIELD.left : FIELD.right
  const boxEdge = player.team === 'home' ? FIELD.left + 152 : FIELD.right - 152

  if (ball.owner === player) {
    player.decisionTimer -= dt
    if (player.decisionTimer <= 0) {
      player.decisionTimer = 0.5
      const targetX = W / 2 + (Math.random() - 0.5) * 280
      const targetY = H / 2 + (Math.random() - 0.5) * 300
      releaseBall(player, targetX, targetY, 800)
      addCommentary(`${player.name} sends it long.`, 'save')
    }
    return
  }

  const alignmentX = ownGoalX + (player.team === 'home' ? 17 : -17)
  const goalLine = player.team === 'home' ? FIELD.left : FIELD.right

  let predictedY = clamp(ball.y, H / 2 - 66, H / 2 + 66)
  if (!ball.owner && Math.abs(ball.vx) > 120) {
    const timeToLine = (goalLine - ball.x) / ball.vx
    if (timeToLine > 0 && timeToLine < 2.4) {
      predictedY = clamp(ball.y + ball.vy * timeToLine, GOAL_TOP + 10, GOAL_BOTTOM - 10)
    }
  }

  const alignmentY = predictedY
  const chase = distance(player, ball) < 150 && ball.x > FIELD.left - 10 && ball.x < FIELD.right + 10

  if (chase) {
    moveTowards(player, ball.x, ball.y, player.speed, dt)
    player.x = player.team === 'home'
      ? clamp(player.x, FIELD.left + player.r, boxEdge)
      : clamp(player.x, boxEdge, FIELD.right - player.r)
  } else {
    moveTowards(player, alignmentX, alignmentY, player.speed * 0.92, dt)
    player.x = player.team === 'home'
      ? clamp(player.x, FIELD.left + player.r, boxEdge)
      : clamp(player.x, boxEdge, FIELD.right - player.r)
  }
  clampPlayer(player, true)
}

function nearestOpponentTo(player) {
  let nearest = null
  let best = Infinity
  for (const other of state.players) {
    if (other.team === player.team) continue
    const d = distance(player, other)
    if (d < best) {
      best = d
      nearest = other
    }
  }
  return nearest
}

function findAiPassTarget(player) {
  const direction = player.team === 'home' ? 1 : -1
  let best = null
  let bestScore = -Infinity
  for (const teammate of state.players) {
    if (teammate.team !== player.team || teammate === player || teammate.role === 'GK') continue
    const dx = teammate.x - player.x
    const dy = teammate.y - player.y
    const d = Math.hypot(dx, dy)
    if (d < 60 || d > 560) continue
    const forward = dx * direction
    const score = forward * 0.9 - d * 0.3 - Math.abs(dy) * 0.12
    if (score > bestScore) {
      bestScore = score
      best = teammate
    }
  }
  return best
}

function aiShoot(player) {
  const attackDirection = player.team === 'home' ? 1 : -1
  const targetX = attackDirection > 0 ? FIELD.right + 12 : FIELD.left - 12
  const targetY = H / 2 + (Math.random() - 0.5) * 200
  const distanceToGoal = Math.hypot(targetX - player.x, targetY - player.y)
  const spread = 0.05 + clamp((distanceToGoal - 160) / 700, 0, 0.25)
  const angle = Math.atan2(targetY - player.y, targetX - player.x) + (Math.random() - 0.5) * spread
  releaseBallAngle(player, angle, 780)
  if (Math.random() < 0.58) addCommentary(`${player.name} lets fly for ${teamName(player.team)}.`, 'save')
}

function releaseBall(player, targetX, targetY, speed) {
  const angle = Math.atan2(targetY - player.y, targetX - player.x)
  releaseBallAngle(player, angle, speed)
}

function releaseBallAngle(player, angle, speed) {
  const ball = state.ball
  const offset = player.r + BALL_R + 2
  ball.owner = null
  ball.x = clamp(player.x + Math.cos(angle) * offset, FIELD.left + BALL_R, FIELD.right - BALL_R)
  ball.y = clamp(player.y + Math.sin(angle) * offset, FIELD.top + BALL_R, FIELD.bottom - BALL_R)
  ball.vx = Math.cos(angle) * speed
  ball.vy = Math.sin(angle) * speed
  ball.noPickup = 0.22
  ball.lastTouch = player
  player.fx = Math.cos(angle)
  player.fy = Math.sin(angle)
}

function moveTowards(player, targetX, targetY, speed, dt) {
  const dx = targetX - player.x
  const dy = targetY - player.y
  const d = Math.hypot(dx, dy)

  if (d < 2) {
    player.vx *= 0.82
    player.vy *= 0.82
  } else {
    player.vx = (dx / d) * speed
    player.vy = (dy / d) * speed
  }

  player.x += player.vx * dt
  player.y += player.vy * dt

  if (d > 2) {
    player.fx = dx / d
    player.fy = dy / d
  }

  clampPlayer(player)
}

function clampPlayer(player, goalkeeper = false) {
  player.x = clamp(player.x, FIELD.left + player.r, FIELD.right - player.r)
  player.y = clamp(player.y, FIELD.top + player.r, FIELD.bottom - player.r)
  if (goalkeeper) return
}

function resolvePlayerCollisions() {
  const players = state.players
  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      const a = players[i]
      const b = players[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.hypot(dx, dy)
      const minDistance = a.r + b.r + 2
      if (d > 0 && d < minDistance) {
        const push = (minDistance - d) / 2
        const nx = dx / d
        const ny = dy / d
        a.x -= nx * push
        a.y -= ny * push
        b.x += nx * push
        b.y += ny * push
        clampPlayer(a)
        clampPlayer(b)
      }
    }
  }
}

function updateBall(dt) {
  const ball = state.ball

  if (ball.owner) {
    const owner = ball.owner
    const offset = owner.r + BALL_R + 2
    ball.x = owner.x + owner.fx * offset
    ball.y = owner.y + owner.fy * offset
    ball.vx = owner.vx
    ball.vy = owner.vy

    ball.x = clamp(ball.x, FIELD.left + BALL_R, FIELD.right - BALL_R)
    ball.y = clamp(ball.y, FIELD.top + BALL_R, FIELD.bottom - BALL_R)
    ball.noPickup = Math.max(0, ball.noPickup - dt)

    if (ball.noPickup <= 0) {
      for (const opponent of state.players) {
        if (opponent.team === owner.team) continue
        if (distance(opponent, ball) < opponent.r + BALL_R + 4 && Math.random() < dt * 2.5) {
          ball.owner = opponent
          ball.lastTouch = opponent
          ball.noPickup = 0.32
          opponent.fx = opponent.team === 'home' ? 1 : -1
          opponent.fy = 0
          if (Math.random() < 0.2) addCommentary(`${opponent.name} wins it back for ${teamName(opponent.team)}.`, 'foul')
          break
        }
      }
    }
    return
  }

  ball.noPickup = Math.max(0, ball.noPickup - dt)
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt

  const damping = Math.pow(0.3, dt)
  ball.vx *= damping
  ball.vy *= damping
  if (Math.abs(ball.vx) < 2) ball.vx = 0
  if (Math.abs(ball.vy) < 2) ball.vy = 0

  if (ball.y < FIELD.top + BALL_R) {
    ball.y = FIELD.top + BALL_R
    ball.vy = Math.abs(ball.vy) * 0.72
  } else if (ball.y > FIELD.bottom - BALL_R) {
    ball.y = FIELD.bottom - BALL_R
    ball.vy = -Math.abs(ball.vy) * 0.72
  }

  const inGoalMouth = ball.y > GOAL_TOP && ball.y < GOAL_BOTTOM

  if (ball.x < FIELD.left + BALL_R && !inGoalMouth) {
    ball.x = FIELD.left + BALL_R
    ball.vx = Math.abs(ball.vx) * 0.72
  } else if (ball.x > FIELD.right - BALL_R && !inGoalMouth) {
    ball.x = FIELD.right - BALL_R
    ball.vx = -Math.abs(ball.vx) * 0.72
  }

  for (const player of state.players) {
    const reach = player.r + BALL_R + (player.role === 'GK' ? 7 : 0)
    const d = distance(player, ball)
    if (d >= reach) continue

    const lockedOut = ball.noPickup > 0 && player === ball.lastTouch
    if (!lockedOut) {
      const ballSpeed = Math.hypot(ball.vx, ball.vy)
      const catchChance = player.role === 'GK' ? 0.98 : 0.86
      if (Math.random() < catchChance) {
        ball.owner = player
        ball.lastTouch = player
        ball.noPickup = 0.12
        player.fx = player.team === 'home' ? 1 : -1
        player.fy = 0
        if (player.role === 'GK' && ballSpeed > 420) {
          addCommentary(`${player.name} makes the save for ${teamName(player.team)}!`, 'save')
        }
        return
      }
    }

    const dx = ball.x - player.x
    const dy = ball.y - player.y
    const length = Math.hypot(dx, dy) || 1
    const nx = dx / length
    const ny = dy / length
    ball.x = player.x + nx * (player.r + BALL_R + 1)
    ball.y = player.y + ny * (player.r + BALL_R + 1)
    const dot = ball.vx * nx + ball.vy * ny
    ball.vx = (ball.vx - 2 * dot * nx) * 0.58
    ball.vy = (ball.vy - 2 * dot * ny) * 0.58
  }

  if (ball.x < FIELD.left && ball.y > GOAL_TOP && ball.y < GOAL_BOTTOM) {
    scoreGoal('away')
    return
  }
  if (ball.x > FIELD.right && ball.y > GOAL_TOP && ball.y < GOAL_BOTTOM) {
    scoreGoal('home')
    return
  }
}

function applyPass() {
  if (!state.running || state.paused) return
  const player = activePlayer()
  if (!player || state.ball.owner !== player) return

  const direction = inputVector()
  let best = null
  let bestScore = -Infinity

  for (const teammate of state.players) {
    if (teammate.team !== player.team || teammate === player) continue
    const dx = teammate.x - player.x
    const dy = teammate.y - player.y
    const d = Math.hypot(dx, dy)
    if (d < 42 || d > 640) continue
    const alignment = direction.x || direction.y
      ? (dx / d) * direction.x + (dy / d) * direction.y
      : 0
    const forward = dx * (player.team === 'home' ? 1 : -1)
    const score = alignment * 300 - d + forward * 0.3
    if (score > bestScore) {
      bestScore = score
      best = teammate
    }
  }

  if (!best) return
  const lead = 0.12
  const targetX = best.x + best.vx * lead
  const targetY = best.y + best.vy * lead
  const d = Math.hypot(targetX - player.x, targetY - player.y)
  releaseBall(player, targetX, targetY, clamp(520 + d * 0.24, 540, 760))
}

function applyShot() {
  if (!state.running || state.paused) return
  const player = activePlayer()
  if (!player || state.ball.owner !== player) return

  const attackDirection = player.team === 'home' ? 1 : -1
  const targetX = attackDirection > 0 ? FIELD.right + 12 : FIELD.left - 12
  const targetY = H / 2 + (Math.random() - 0.5) * 150
  const distanceToGoal = Math.hypot(targetX - player.x, targetY - player.y)
  const spread = 0.04 + clamp((distanceToGoal - 160) / 800, 0, 0.22)
  const angle = Math.atan2(targetY - player.y, targetX - player.x) + (Math.random() - 0.5) * spread
  releaseBallAngle(player, angle, 940)
  addCommentary(`${player.name} pulls the trigger for Northgate!`, 'save')
}

function updatePossessionHud() {
  const total = state.possession.home + state.possession.away
  if (total <= 0) {
    refs.possession.textContent = 'Possession 50%'
    return
  }
  const home = Math.round((state.possession.home / total) * 100)
  refs.possession.textContent = `Possession ${home}%`
}

function teamName(team) {
  return team === 'home' ? 'Northgate' : 'Ironvale'
}

function draw() {
  ctx.clearRect(0, 0, W, H)
  drawStadium()
  drawPitch()
  drawGoals()

  for (const player of state.players) drawPlayer(player)
  drawBall()

  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.82)
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
  vignette.addColorStop(1, 'rgba(1, 7, 4, 0.32)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, W, H)
}

function drawStadium() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H)
  gradient.addColorStop(0, '#06150d')
  gradient.addColorStop(0.5, '#040f09')
  gradient.addColorStop(1, '#030b06')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, W, H)

  ctx.save()
  ctx.globalAlpha = 0.22
  for (let i = 0; i < 34; i += 1) {
    const x = (i * 137.5) % W
    const y = i % 2 === 0 ? 10 + (i * 7) % 26 : H - 14 - (i * 5) % 26
    ctx.fillStyle = i % 3 === 0 ? '#c8ff4a' : '#7dd3fc'
    ctx.beginPath()
    ctx.arc(x, y, 1.2, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawPitch() {
  const width = FIELD.right - FIELD.left
  const height = FIELD.bottom - FIELD.top
  const stripes = 14
  const stripeWidth = width / stripes

  ctx.save()
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
  ctx.shadowBlur = 30
  ctx.shadowOffsetY = 10
  ctx.fillStyle = '#0a4c2e'
  ctx.fillRect(FIELD.left, FIELD.top, width, height)
  ctx.restore()

  for (let i = 0; i < stripes; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? '#0b5b37' : '#0a5332'
    ctx.fillRect(FIELD.left + i * stripeWidth, FIELD.top, stripeWidth + 0.5, height)
  }

  ctx.save()
  ctx.strokeStyle = 'rgba(236, 255, 242, 0.54)'
  ctx.lineWidth = 2
  ctx.strokeRect(FIELD.left, FIELD.top, width, height)

  ctx.beginPath()
  ctx.moveTo(W / 2, FIELD.top)
  ctx.lineTo(W / 2, FIELD.bottom)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(W / 2, H / 2, 70, 0, Math.PI * 2)
  ctx.stroke()

  ctx.beginPath()
  ctx.arc(W / 2, H / 2, 3, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(236, 255, 242, 0.6)'
  ctx.fill()

  const boxHeight = 328
  const boxWidth = 150
  const boxY = (H - boxHeight) / 2
  ctx.strokeRect(FIELD.left, boxY, boxWidth, boxHeight)
  ctx.strokeRect(FIELD.right - boxWidth, boxY, boxWidth, boxHeight)

  const sixHeight = 164
  const sixWidth = 62
  const sixY = (H - sixHeight) / 2
  ctx.strokeRect(FIELD.left, sixY, sixWidth, sixHeight)
  ctx.strokeRect(FIELD.right - sixWidth, sixY, sixWidth, sixHeight)

  ctx.beginPath()
  ctx.arc(FIELD.left + 108, H / 2, 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(FIELD.right - 108, H / 2, 3, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = 0.5
  const corner = 14
  ctx.beginPath()
  ctx.arc(FIELD.left, FIELD.top, corner, 0, Math.PI / 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(FIELD.right, FIELD.top, corner, Math.PI / 2, Math.PI)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(FIELD.left, FIELD.bottom, corner, -Math.PI / 2, 0)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(FIELD.right, FIELD.bottom, corner, Math.PI, Math.PI * 1.5)
  ctx.stroke()
  ctx.restore()
}

function drawGoals() {
  const depth = 24
  const goalTop = GOAL_TOP
  const goalBottom = GOAL_BOTTOM

  ctx.save()
  ctx.fillStyle = 'rgba(7, 20, 13, 0.86)'
  ctx.fillRect(FIELD.left - depth, goalTop, depth, goalBottom - goalTop)
  ctx.fillRect(FIELD.right, goalTop, depth, goalBottom - goalTop)

  ctx.strokeStyle = 'rgba(236, 255, 242, 0.5)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 6; i += 1) {
    const y = goalTop + ((goalBottom - goalTop) / 6) * i
    ctx.beginPath()
    ctx.moveTo(FIELD.left - depth, y)
    ctx.lineTo(FIELD.left, y)
    ctx.moveTo(FIELD.right, y)
    ctx.lineTo(FIELD.right + depth, y)
    ctx.stroke()
  }
  for (let i = 0; i <= 3; i += 1) {
    const offset = (depth / 3) * i
    ctx.beginPath()
    ctx.moveTo(FIELD.left - depth + offset, goalTop)
    ctx.lineTo(FIELD.left - depth + offset, goalBottom)
    ctx.moveTo(FIELD.right + offset, goalTop)
    ctx.lineTo(FIELD.right + offset, goalBottom)
    ctx.stroke()
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(FIELD.left, goalTop)
  ctx.lineTo(FIELD.left, goalBottom)
  ctx.moveTo(FIELD.right, goalTop)
  ctx.lineTo(FIELD.right, goalBottom)
  ctx.stroke()
  ctx.restore()
}

function drawPlayer(player) {
  const isHome = player.team === 'home'
  const isGoalkeeper = player.role === 'GK'
  const fill = isGoalkeeper
    ? (isHome ? '#ffcf5c' : '#b69cff')
    : (isHome ? '#c8ff4a' : '#ff5d73')
  const stroke = isGoalkeeper
    ? (isHome ? '#6a4a06' : '#3e2b70')
    : (isHome ? '#1b3208' : '#5c101c')
  const text = isHome ? '#142407' : '#fff5f6'

  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)'
  ctx.beginPath()
  ctx.ellipse(player.x + 2, player.y + 8, player.r * 0.95, player.r * 0.56, 0, 0, Math.PI * 2)
  ctx.fill()

  if (player.id === state.activeId) {
    const pulse = 2 + Math.sin(performance.now() / 180) * 1.2
    ctx.strokeStyle = 'rgba(255, 239, 168, 0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(player.x, player.y, player.r + 5 + pulse, 0, Math.PI * 2)
    ctx.stroke()
  }

  const gradient = ctx.createRadialGradient(player.x - 3, player.y - 4, 1, player.x, player.y, player.r)
  gradient.addColorStop(0, isHome ? '#e4ff9c' : '#ff98a6')
  gradient.addColorStop(1, fill)
  ctx.fillStyle = gradient
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = text
  ctx.font = '700 10.5px "Inter", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(String(player.number), player.x, player.y + 0.5)

  if (state.ball.owner === player) {
    ctx.fillStyle = 'rgba(255, 239, 168, 0.95)'
    ctx.beginPath()
    ctx.arc(player.x, player.y - player.r - 7, 2.4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function drawBall() {
  const ball = state.ball
  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)'
  ctx.beginPath()
  ctx.ellipse(ball.x + 1.5, ball.y + 5, BALL_R * 1.05, BALL_R * 0.6, 0, 0, Math.PI * 2)
  ctx.fill()

  const gradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, BALL_R)
  gradient.addColorStop(0, '#ffffff')
  gradient.addColorStop(1, '#d9e2dc')
  ctx.fillStyle = gradient
  ctx.strokeStyle = 'rgba(22, 38, 28, 0.8)'
  ctx.lineWidth = 1.1
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#203027'
  ctx.beginPath()
  for (let i = 0; i < 5; i += 1) {
    const angle = (Math.PI * 2 * i) / 5 - Math.PI / 2
    const px = ball.x + Math.cos(angle) * 2.9
    const py = ball.y + Math.sin(angle) * 2.9
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  draw()
}

function bindEvents() {
  window.addEventListener('keydown', (event) => {
    const tag = event.target instanceof HTMLElement ? event.target.tagName.toLowerCase() : ''
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault()
    }
    if (!event.repeat) {
      if (event.code === 'Space') applyPass()
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') applyShot()
    }
    state.lastManualAt = performance.now()
    state.keys.add(event.code)
  })

  window.addEventListener('keyup', (event) => {
    state.keys.delete(event.code)
  })

  window.addEventListener('blur', () => state.keys.clear())

  $('#kickoff-top').addEventListener('click', () => {
    startMatch()
    $('#match').scrollIntoView({ behavior: 'smooth', block: 'start' })
  })


  refs.overlay.addEventListener('click', (event) => {
    if (event.target.closest('#overlay-action')) startMatch()
  })

  $('#restart-match').addEventListener('click', () => {
    startMatch()
    showToast('Match restarted.')
  })

  $$('.tactic-buttons button').forEach((button) => {
    button.addEventListener('click', () => {
      state.tactic = button.dataset.tactic
      updateTacticDisplay()
    })
  })

  refs.formationChips.addEventListener('click', (event) => {
    const chip = event.target.closest('.formation-chip')
    if (chip) selectPlayer(Number(chip.dataset.index))
  })

  $$('.buy-pack').forEach((button) => {
    button.addEventListener('click', () => buyPack(button.dataset.pack))
  })

  $('#daily-reward').addEventListener('click', () => {
    if (profile.dailyDate === todayKey()) return
    profile.coins += 1000
    profile.dailyDate = todayKey()
    saveProfile()
    updateWallet()
    updateDailyButton()
    showToast('Daily reward claimed: +1,000 coins.')
  })

  refs.touch.addEventListener('pointerdown', (event) => {
    const button = event.target.closest('button')
    if (!button) return
    event.preventDefault()
    if (button.dataset.key) {
      state.keys.add(button.dataset.key)
      button.setPointerCapture?.(event.pointerId)
    }
    if (button.dataset.action === 'pass') applyPass()
    if (button.dataset.action === 'shoot') applyShot()
  })

  refs.touch.addEventListener('pointerup', (event) => {
    const button = event.target.closest('button')
    if (!button) return
    if (button.dataset.key) state.keys.delete(button.dataset.key)
  })

  refs.touch.addEventListener('pointercancel', (event) => {
    const button = event.target.closest('button')
    if (button?.dataset.key) state.keys.delete(button.dataset.key)
  })

  refs.touch.addEventListener('pointerleave', (event) => {
    const button = event.target.closest('button')
    if (button?.dataset.key) state.keys.delete(button.dataset.key)
  })

  window.addEventListener('resize', () => {
    window.clearTimeout(resizeCanvas.timer)
    resizeCanvas.timer = window.setTimeout(resizeCanvas, 160)
  })
}

function buyPack(kind) {
  const pack = PACKS[kind]
  if (!pack) return
  const balance = pack.currency === 'coins' ? profile.coins : profile.gems
  if (balance < pack.cost) {
    showToast(`Not enough ${pack.currency}. Win matches and claim rewards to keep scouting.`)
    return
  }

  if (pack.currency === 'coins') profile.coins -= pack.cost
  else profile.gems -= pack.cost

  const rating = Math.floor(pack.min + Math.random() * (pack.max - pack.min + 1))
  const name = SIGNING_NAMES[Math.floor(Math.random() * SIGNING_NAMES.length)]
  profile.shortlist = [...(profile.shortlist || []), { name, rating }].slice(-8)
  saveProfile()
  updateWallet()
  showToast(`${pack.label}: ${name} (${rating} OVR) added to the shortlist.`)
}

function setupReveal() {
  const elements = $$('.reveal')
  if (!('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-in'))
    return
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in')
        observer.unobserve(entry.target)
      }
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
  elements.forEach((element) => observer.observe(element))
}

function initialize() {
  state = createState()
  updateWallet()
  updateSeasonStats()
  updateDailyButton()
  renderSquad()
  selectPlayer(selectedPlayer)
  updateTacticDisplay()
  updatePossessionHud()
  resetPositions(null)
  resizeCanvas()
  state.commentary = [{ minute: 0, text: 'Northgate United are ready in the tunnel.', kind: '' }]
  renderCommentary()
  bindEvents()
  setupReveal()
  requestAnimationFrame(frame)
}

let lastFrame = performance.now()
function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.04)
  lastFrame = now

  if (state.running) {
    if (state.goalTimer > 0) {
      state.goalTimer -= dt
      if (state.goalTimer <= 0) {
        state.goalTimer = 0
        hideGoalBurst()
        resetPositions(state.pendingKickoff)
        state.paused = false
        addCommentary(`${teamName(state.pendingKickoff)} restart the match.`, '')
      }
    } else if (!state.paused) {
      state.time += dt
      if (state.time >= MATCH_SECONDS) {
        state.time = MATCH_SECONDS
        updateClock(true)
        endMatch()
      } else {
        update(dt)
      }
    }
  }

  draw()
  requestAnimationFrame(frame)
}

initialize()
