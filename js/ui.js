import { clamp, css, readableOn, PITCH, TEAMS } from './data.js';
import { state, world, players, input } from './state.js';

export const DOM = {
  canvas: document.getElementById('scene'),
  loading: document.getElementById('loading'),
  hud: document.getElementById('hud'),
  startMenu: document.getElementById('startMenu'),
  teamGrid: document.getElementById('teamGrid'),
  clubRating: document.getElementById('clubRating'),
  homeBadge: document.getElementById('homeBadge'),
  awayBadge: document.getElementById('awayBadge'),
  homeName: document.getElementById('homeName'),
  awayName: document.getElementById('awayName'),
  score: document.getElementById('score'),
  clock: document.getElementById('clock'),
  halfLabel: document.getElementById('halfLabel'),
  stamina: document.getElementById('staminaFill'),
  phNum: document.getElementById('phNum'),
  phName: document.getElementById('phName'),
  phPos: document.getElementById('phPos'),
  playerHud: document.getElementById('playerHud'),
  powerWrap: document.getElementById('powerWrap'),
  powerFill: document.getElementById('powerFill'),
  commentary: document.getElementById('commentary'),
  toast: document.getElementById('toast'),
  goalOverlay: document.getElementById('goalOverlay'),
  goalSub: document.getElementById('goalSub'),
  goalScorer: document.getElementById('goalScorer'),
  minimap: document.getElementById('minimap'),
  pauseMenu: document.getElementById('pauseMenu'),
  fullTime: document.getElementById('fullTime'),
  pauseScore: document.getElementById('pauseScore'),
  ftScore: document.getElementById('ftScore'),
  ftResult: document.getElementById('ftResult'),
  ftStats: document.getElementById('ftStats'),
  controlsHint: document.getElementById('controlsHint'),
  touchUI: document.getElementById('touchUI'),
  joystick: document.getElementById('joystick'),
  stick: document.getElementById('stick'),
  soundBtn: document.getElementById('soundBtn'),
  kickoffBtn: document.getElementById('kickoffBtn'),
  demoBtn: document.getElementById('demoBtn'),
  difficultySeg: document.getElementById('difficultySeg'),
  lengthSeg: document.getElementById('lengthSeg'),
};

let toastTimer = null;
let commentaryTimer = null;
let minimapCtx = DOM.minimap.getContext('2d');

export function buildTeamCards(onSelect) {
  DOM.teamGrid.innerHTML = '';
  TEAMS.forEach((team, i) => {
    const card = document.createElement('button');
    card.className = 'team-card';
    card.type = 'button';
    card.dataset.index = String(i);
    const bg = `linear-gradient(135deg, ${css(team.primary)}, ${css(team.secondary)})`;
    card.innerHTML = `
      <div class="tc-crest" style="background:${bg};color:${readableOn(team.primary)}">${team.short}</div>
      <div class="tc-kit"><i style="background:${css(team.primary)}"></i><i style="background:${css(team.secondary)}"></i><i style="background:${css(team.accent)}"></i></div>
      <div class="tc-name">${team.name}</div>
      <div class="tc-meta">${team.city.toUpperCase()} · ${team.stars}</div>
    `;
    card.addEventListener('click', () => onSelect(i));
    DOM.teamGrid.appendChild(card);
  });
}

export function setSelectedTeam(index) {
  state.selectedTeam = index;
  [...DOM.teamGrid.children].forEach((card) => card.classList.toggle('active', Number(card.dataset.index) === index));
  DOM.clubRating.textContent = TEAMS[index].stars;
}

export function setDifficulty(value) {
  state.difficulty = value;
  [...DOM.difficultySeg.children].forEach((b) => b.classList.toggle('active', Number(b.dataset.value) === value));
}

export function setHalfLength(value) {
  state.halfLength = value;
  [...DOM.lengthSeg.children].forEach((b) => b.classList.toggle('active', Number(b.dataset.value) === value));
}

export function showMenu(show) {
  DOM.startMenu.classList.toggle('hidden', !show);
}

export function showHud(show) {
  DOM.hud.classList.toggle('hidden', !show);
}

export function updateTeamBadges() {
  const home = state.homeTeam;
  const away = state.awayTeam;
  DOM.homeBadge.textContent = home.short;
  DOM.awayBadge.textContent = away.short;
  DOM.homeBadge.style.background = `linear-gradient(135deg, ${css(home.primary)}, ${css(home.secondary)})`;
  DOM.homeBadge.style.color = readableOn(home.primary);
  DOM.awayBadge.style.background = `linear-gradient(135deg, ${css(away.primary)}, ${css(away.secondary)})`;
  DOM.awayBadge.style.color = readableOn(away.primary);
  DOM.homeName.textContent = home.name.toUpperCase();
  DOM.awayName.textContent = away.name.toUpperCase();
}

export function scoreMa() {
  return state.score[0] + state.score[1];
}

export function updateScorebug() {
  DOM.score.innerHTML = `${state.score[0]}<span>–</span>${state.score[1]}`;
  const totalSeconds = ((state.half - 1) + clamp(state.clock / state.halfLength, 0, 1)) * 2700;
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  DOM.clock.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  DOM.halfLabel.textContent = state.half >= 2 ? '2ND HALF' : '1ST HALF';
}

export function updateHud() {
  if (state.phase === 'menu') return;
  updateScorebug();

  const p = state.controlled;
  if (p && !state.demo) {
    DOM.playerHud.style.display = '';
    DOM.phNum.textContent = p.number;
    DOM.phName.textContent = p.name.toUpperCase();
    DOM.phPos.textContent = p.role;
    DOM.stamina.style.width = `${clamp(p.stamina, 0, 100)}%`;
    DOM.stamina.style.background =
      p.stamina < 25 ? 'linear-gradient(90deg,#ff5a6e,#ff9a5c)' : 'linear-gradient(90deg,#c6ff3d,#5fe38a)';
  } else {
    DOM.playerHud.style.display = 'none';
  }

  if (input.charge) {
    DOM.powerWrap.classList.remove('hidden');
    DOM.powerFill.style.width = `${Math.round(input.power * 100)}%`;
  } else {
    DOM.powerWrap.classList.add('hidden');
  }

  drawMinimap();

  if (world.controlledRing) {
    const show = p && !state.demo && (state.phase === 'play' || state.phase === 'kickoff');
    world.controlledRing.visible = !!show;
    if (show) {
      world.controlledRing.position.set(p.pos.x, 0.05, p.pos.z);
      world.controlledTag.visible = true;
      world.controlledTag.position.set(p.pos.x, 2.45, p.pos.z);
    } else {
      world.controlledTag.visible = false;
    }
  }
}

export function say(text, ms = 2800) {
  DOM.commentary.innerHTML = text;
  DOM.commentary.classList.add('show');
  clearTimeout(commentaryTimer);
  commentaryTimer = setTimeout(() => DOM.commentary.classList.remove('show'), ms);
}

export function showToast(main, sub = '', ms = 1800) {
  DOM.toast.innerHTML = `${main}${sub ? `<span class="small">${sub}</span>` : ''}`;
  DOM.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => DOM.toast.classList.remove('show'), ms);
}

export function hideToast() {
  DOM.toast.classList.remove('show');
}

export function showGoal(team, scorer, minute) {
  DOM.goalSub.textContent = team.name.toUpperCase();
  DOM.goalScorer.textContent = `${scorer} · ${minute}'`;
  DOM.goalOverlay.classList.remove('hidden');
}

export function hideGoal() {
  DOM.goalOverlay.classList.add('hidden');
}

export function showPause() {
  if (state.paused) return;
  state.paused = true;
  DOM.pauseScore.textContent = `${state.score[0]} – ${state.score[1]}`;
  DOM.pauseMenu.classList.remove('hidden');
}

export function hidePause() {
  state.paused = false;
  DOM.pauseMenu.classList.add('hidden');
}

export function showFullTime() {
  const [h, a] = state.score;
  const home = state.homeTeam;
  const away = state.awayTeam;
  DOM.ftResult.textContent =
    h > a ? `${home.name.toUpperCase()} WIN` : h < a ? `${away.name.toUpperCase()} WIN` : 'HONOURS EVEN';
  DOM.ftScore.textContent = `${h} – ${a}`;
  DOM.ftStats.innerHTML = buildStats();
  DOM.fullTime.classList.remove('hidden');
}

export function hideFullTime() {
  DOM.fullTime.classList.add('hidden');
}

function buildStats() {
  if (!state.stats) return '';
  const st = state.stats;
  const posTotal = st.possession.home + st.possession.away || 1;
  const posH = Math.round((st.possession.home / posTotal) * 100);
  const posA = 100 - posH;
  const rows = [
    ['POSSESSION', posH, posA, posH, posA, '%'],
    ['SHOTS', st.shots.home, st.shots.away],
    ['ON TARGET', st.onTarget.home, st.onTarget.away],
    ['SAVES', st.saves.home, st.saves.away],
    ['PASSES', st.passes.home, st.passes.away],
    ['TACKLES', st.tackles.home, st.tackles.away],
  ];
  return rows
    .map(([label, hv, av, hw, aw, suffix]) => {
      let hWidth = hw;
      let aWidth = aw;
      if (hWidth === undefined) {
        const total = Math.max(1, hv + av);
        hWidth = (hv / total) * 100;
        aWidth = (av / total) * 100;
      }
      const hw2 = Math.max(hWidth, hv > 0 ? 6 : 0);
      const aw2 = Math.max(aWidth, av > 0 ? 6 : 0);
      return `
        <div class="stat-row">
          <span style="color:#c6ff3d">${hv}${suffix || ''}</span>
          <span class="stat-track"><i class="h" style="width:${hw2}%"></i><i class="a" style="width:${aw2}%"></i></span>
          <span style="color:#ff8a8a">${av}${suffix || ''}</span>
        </div>
        <div class="stat-name">${label}</div>
      `;
    })
    .join('');
}

export function setSoundIcon(muted) {
  DOM.soundBtn.textContent = muted ? '✕' : '♪';
  DOM.soundBtn.style.opacity = muted ? '0.55' : '1';
}

export function drawMinimap() {
  const ctx = minimapCtx;
  const W = DOM.minimap.width;
  const H = DOM.minimap.height;
  const scale = Math.min((W - 18) / (PITCH.halfL * 2), (H - 18) / (PITCH.halfW * 2));
  const cx = W / 2;
  const cy = H / 2;
  const mx = (z) => cx + z * scale;
  const my = (x) => cy + x * scale;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a2418';
  ctx.fillRect(0, 0, W, H);

  const x0 = mx(-PITCH.halfL);
  const x1 = mx(PITCH.halfL);
  const y0 = my(-PITCH.halfW);
  const y1 = my(PITCH.halfW);

  ctx.fillStyle = '#144a2c';
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = 'rgba(220,255,230,0.55)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);

  ctx.beginPath();
  ctx.moveTo(mx(0), y0);
  ctx.lineTo(mx(0), y1);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(mx(0), cy, PITCH.circleR * scale, PITCH.circleR * scale, 0, 0, Math.PI * 2);
  ctx.stroke();

  for (const end of [-1, 1]) {
    const gx = mx(end * PITCH.halfL);
    const boxX = mx(end * (PITCH.halfL - PITCH.boxDepth));
    ctx.strokeRect(Math.min(gx, boxX), my(-PITCH.boxHalfW), Math.abs(gx - boxX), PITCH.boxHalfW * 2 * scale);
    ctx.fillStyle = 'rgba(235,255,240,0.7)';
    ctx.fillRect(end < 0 ? gx : gx - 2, my(-PITCH.goalHalf), 2, PITCH.goalHalf * 2 * scale);
  }

  const homeColor = css(state.homeTeam.primary);
  const awayColor = css(state.awayTeam.primary);
  for (const p of players) {
    const px = mx(p.pos.z);
    const py = my(p.pos.x);
    ctx.beginPath();
    ctx.arc(px, py, p.isGK ? 3.4 : 2.9, 0, Math.PI * 2);
    ctx.fillStyle = p.team === 'home' ? homeColor : awayColor;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }

  const ball = world.ball;
  if (ball) {
    const bx = mx(ball.pos.z);
    const by = my(ball.pos.x);
    ctx.beginPath();
    ctx.arc(bx, by, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.shadowColor = '#c6ff3d';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  if (state.controlled) {
    const px = mx(state.controlled.pos.z);
    const py = my(state.controlled.pos.x);
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.strokeStyle = '#c6ff3d';
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }
}
