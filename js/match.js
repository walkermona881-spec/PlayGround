import * as THREE from '../vendor/three.module.js';
import {
  PITCH, TEAMS, LAYOUT, rosterFor, roleSpeed, clamp, damp, rand, TAU,
  DIFFICULTY_SPEED, css,
} from './data.js';
import { state, world, players, keys, input, resetStats } from './state.js';
import { makePlayerMesh, makeTagTexture } from './assets.js';
import { updateAI } from './ai.js';
import * as ui from './ui.js';
import { sound } from './audio.js';

const UP = new THREE.Vector3(0, 1, 0);
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();

const aiApi = {
  pass: (p) => passBall(p),
  shoot: (p, aimX, power) => shootBall(p, aimX, power, true),
  kick: (p, dir, speed, loft) => kickBall(p, dir, speed, loft, false),
  chooseTarget: (p) => choosePassTarget(p),
};

function teamPlayers(key) {
  return players.filter((p) => p.team === key);
}

export function buildTeams() {
  clearTeams();
  for (const key of ['home', 'away']) {
    const team = key === 'home' ? state.homeTeam : state.awayTeam;
    const teamIndex = TEAMS.indexOf(team);
    const roster = rosterFor(teamIndex);
    roster.forEach((slot, i) => {
      const mx = key === 'home' ? slot.x : slot.x;
      const mz = key === 'home' ? slot.z : -slot.z;
      const player = {
        team: key,
        teamData: team,
        role: slot.role,
        number: slot.num,
        name: slot.name,
        isGK: slot.isGK,
        anchor: new THREE.Vector3(mx, 0, mz),
        pos: new THREE.Vector3(mx, 0, mz),
        vel: new THREE.Vector3(),
        move: new THREE.Vector3(),
        aiTarget: new THREE.Vector3(mx, 0, mz),
        facing: key === 'home' ? 0 : Math.PI,
        phase: rand(0, TAU),
        stamina: 100,
        think: rand(0, 0.2),
        kickTimer: 0,
        diveTimer: 0,
        holdTimer: 0,
        baseSpeed: roleSpeed(slot.role),
        tackleCd: 0,
        runPhase: rand(0, TAU),
      };
      const mesh = makePlayerMesh(team, player);
      player.root = mesh.root;
      player.parts = mesh;
      player.root.position.copy(player.pos);
      player.root.rotation.y = player.facing;
      world.scene.add(player.root);
      players.push(player);
    });
  }
}

export function clearTeams() {
  for (const p of players) {
    if (p.root) world.scene.remove(p.root);
  }
  players.length = 0;
  state.controlled = null;
  if (world.ball) {
    world.ball.owner = null;
    world.ball.lastTouch = null;
    world.ball.vel.set(0, 0, 0);
    world.ball.pos.set(0, PITCH.ballR, 0);
    world.ball.noTouchUntil = 0;
  }
  if (world.controlledRing) world.controlledRing.visible = false;
  if (world.controlledTag) world.controlledTag.visible = false;
}

export function showcaseTeams() {
  state.homeTeam = TEAMS[state.selectedTeam];
  state.awayTeam = TEAMS[(state.selectedTeam + 1) % TEAMS.length];
  buildTeams();
  placeFormation();
  state.phase = 'menu';
  state.controlled = null;
  state.demo = false;
  if (world.ball) {
    world.ball.owner = null;
    world.ball.vel.set(0, 0, 0);
    world.ball.pos.set(0, PITCH.ballR, 0);
    world.ball.lastTouch = null;
  }
}

function placeFormation() {
  for (const p of players) {
    p.pos.copy(p.anchor);
    p.vel.set(0, 0, 0);
    p.move.set(0, 0, 0);
    p.facing = p.team === 'home' ? 0 : Math.PI;
    p.root.position.copy(p.pos);
    p.root.rotation.y = p.facing;
    p.stamina = 100;
  }
}

export function startMatch(demo = false) {
  state.demo = demo;
  state.homeTeam = TEAMS[state.selectedTeam];
  state.awayTeam = TEAMS[(state.selectedTeam + (demo ? 2 : 1)) % TEAMS.length];
  state.score = [0, 0];
  state.half = 1;
  state.clock = 0;
  state.simTime = 0;
  state.paused = false;
  state.phase = 'kickoff';
  state.lastPasser = null;
  state.result = null;
  resetStats();
  ui.hideGoal();
  ui.hideFullTime();
  ui.hidePause();
  ui.showMenu(false);
  ui.showHud(true);
  ui.updateTeamBadges();
  ui.updateScorebug();
  buildTeams();
  ui.setSoundIcon(state.muted);
  sound.init();
  sound.crowdLift(0.055);
  startKickoff('home');
}

export function restartMatch() {
  ui.hidePause();
  ui.hideFullTime();
  startMatch(state.demo);
}

export function goToMenu() {
  ui.hidePause();
  ui.hideFullTime();
  ui.hideGoal();
  ui.showHud(false);
  ui.showMenu(true);
  ui.hideToast();
  state.paused = false;
  state.demo = false;
  state.phase = 'menu';
  state.score = [0, 0];
  state.clock = 0;
  state.half = 1;
  showcaseTeams();
  sound.crowdLift(0.03);
}

function startKickoff(teamKey) {
  state.kickoffTeam = teamKey;
  state.phase = 'kickoff';
  state.phaseTimer = 1.5;
  state.controlled = null;
  placeFormation();

  const kickTeam = teamPlayers(teamKey);
  const striker = kickTeam.find((p) => p.role === 'ST') || kickTeam.find((p) => !p.isGK);
  const mid = kickTeam.find((p) => p.role === 'CDM') || kickTeam.find((p) => !p.isGK && p !== striker);
  const dir = teamKey === 'home' ? 1 : -1;
  if (striker) {
    striker.pos.set(0, 0, dir * 0.55);
    striker.facing = dir > 0 ? 0 : Math.PI;
    striker.root.position.copy(striker.pos);
    striker.root.rotation.y = striker.facing;
  }
  if (mid) {
    mid.pos.set(-1.3, 0, dir * 2.5);
    mid.root.position.copy(mid.pos);
  }
  const team = teamKey === 'home' ? 'away' : 'home';
  for (const p of teamPlayers(team)) {
    if (p.pos.length() < 10.5) p.pos.set(p.pos.x, 0, (team === 'home' ? -1 : 1) * 10.8);
    p.root.position.copy(p.pos);
  }

  const ball = world.ball;
  ball.owner = striker || null;
  ball.lastTouch = striker || null;
  ball.vel.set(0, 0, 0);
  ball.pos.set(0, PITCH.ballR, 0);
  ball.noTouchUntil = state.simTime + 0.2;

  if (!state.demo) {
    const ownTeam = teamKey === 'home' ? 'home' : 'away';
    if (ownTeam === 'home' && striker) setControlled(striker);
    else setControlled(nearestHomeField());
  }
  ui.updateScorebug();
  ui.showToast('KICK OFF', `${state.homeTeam.short}  ${state.score[0]} – ${state.score[1]}  ${state.awayTeam.short}`, 1300);
  sound.whistle(false);
}

function nearestHomeField(from = world.ball.pos) {
  let best = null;
  let bestD = Infinity;
  for (const p of players) {
    if (p.team !== 'home' || p.isGK) continue;
    const d = p.pos.distanceToSquared(from);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best || players.find((p) => p.team === 'home');
}

export function setControlled(player) {
  if (!player || player.team !== 'home' || state.demo) {
    state.controlled = null;
    return;
  }
  if (state.controlled === player) return;
  state.controlled = player;
  if (world.controlledTag) {
    const tex = makeTagTexture(player.name, player.number);
    world.controlledTag.material.map = tex;
    world.controlledTag.material.needsUpdate = true;
    if (world.tagTex) world.tagTex.dispose();
    world.tagTex = tex;
    world.tagName = player.number + player.name;
  }
}

export function updatePlayerVisuals(dt) {
  const sim = state.simTime;
  for (const p of players) {
    const speed = p.vel.length();
    const amp = clamp(speed / 7, 0, 1) * 0.82;
    p.phase += dt * (2.4 + speed * 1.55);
    const swing = Math.sin(p.phase) * amp;
    p.parts.legL.rotation.x = swing;
    p.parts.legR.rotation.x = -swing;
    p.parts.armL.rotation.x = -swing * 0.72;
    p.parts.armR.rotation.x = swing * 0.72;
    p.parts.body.position.y = Math.abs(Math.sin(p.phase)) * 0.05 * amp + Math.sin(sim * 1.8 + p.phase) * 0.006;
    p.parts.body.rotation.x = amp * 0.06;
    p.parts.body.rotation.z = 0;

    if (p.kickTimer > 0) {
      p.kickTimer = Math.max(0, p.kickTimer - dt);
      const t = 1 - p.kickTimer / 0.34;
      p.parts.legR.rotation.x = -Math.sin(clamp(t, 0, 1) * Math.PI) * 2.1;
      p.parts.armL.rotation.x = -Math.sin(clamp(t, 0, 1) * Math.PI) * 0.9;
    }
    if (p.diveTimer > 0) {
      p.diveTimer = Math.max(0, p.diveTimer - dt);
      const t = p.diveTimer / 0.65;
      p.parts.body.rotation.z = p.diveSide * Math.sin(t * Math.PI) * 0.75;
      p.parts.body.position.y = Math.sin(t * Math.PI) * 0.5;
    }
    p.root.position.set(p.pos.x, 0, p.pos.z);
    p.root.rotation.y = dampAngle(p.root.rotation.y, p.facing, 13, dt);

    if (p.isGK) {
      const t = sim * 1.4 + p.phase;
      p.parts.armL.rotation.z = 0.55 + Math.sin(t) * 0.08;
      p.parts.armR.rotation.z = -0.55 - Math.sin(t + 0.6) * 0.08;
    }
  }
}

function dampAngle(current, target, lambda, dt) {
  let d = ((target - current + Math.PI) % TAU + TAU) % TAU - Math.PI;
  return current + d * (1 - Math.exp(-lambda * dt));
}

export function updateGame(dt) {
  switch (state.phase) {
    case 'play':
      updatePlay(dt);
      break;
    case 'kickoff':
      state.phaseTimer -= dt;
      if (state.phaseTimer <= 0) {
        state.phase = 'play';
        ui.hideToast();
        if (state.half === 1 && state.clock < 1) ui.say('We are underway at the OMG Arena. Dream League Soccer 2026!', 2800);
      }
      break;
    case 'goal':
      state.phaseTimer -= dt;
      if (state.phaseTimer <= 0) {
        ui.hideGoal();
        const conceding = state.lastGoalTeam === 'home' ? 'away' : 'home';
        startKickoff(conceding);
      }
      break;
    case 'halftime':
      state.phaseTimer -= dt;
      if (state.phaseTimer <= 0) {
        state.half = 2;
        state.clock = 0;
        sound.crowdLift(0.06);
        startKickoff('away');
      }
      break;
    default:
      break;
  }
}

function updatePlay(dt) {
  state.clock += dt;
  const ball = world.ball;
  const st = state.stats;
  if (ball.owner) st.possession[ball.owner.team] += dt;
  else if (ball.lastTouch) st.possession[ball.lastTouch.team] += dt * 0.6;

  if (!state.demo) updateHumanControl(dt);
  updateAI(dt, aiApi);
  integratePlayers(dt);
  updateBall(dt);
  pickupBall();
  handleTackles(dt);
  handleGoalkeepers(dt);
  checkGoalAndBounds();
  updateControlTarget();
  updateStamina(dt);

  if (state.clock >= state.halfLength) endHalf();
}

function updateHumanControl(dt) {
  const p = state.controlled;
  if (!p) return;
  const cam = world.camera;
  const fwd = tmpA;
  cam.getWorldDirection(fwd);
  fwd.y = 0;
  if (fwd.lengthSq() < 0.0001) fwd.set(0, 0, 1);
  fwd.normalize();
  const right = tmpB.crossVectors(fwd, UP).normalize();

  let forward = 0;
  let side = 0;
  if (keys.w || keys.ArrowUp) forward += 1;
  if (keys.s || keys.ArrowDown) forward -= 1;
  if (keys.d || keys.ArrowRight) side += 1;
  if (keys.a || keys.ArrowLeft) side -= 1;
  forward += input.touchY;
  side += input.touchX;

  const dir = tmpC.set(0, 0, 0).addScaledVector(fwd, forward).addScaledVector(right, side);
  if (dir.lengthSq() > 1) dir.normalize();

  const sprint = (keys.Shift || input.touchSprint) && p.stamina > 2;
  const speed = p.baseSpeed * 1.035 * (sprint ? 1.33 : 1) * (input.charge ? 0.74 : 1);
  p.move.copy(dir).multiplyScalar(speed);

  if (sprint && dir.lengthSq() > 0.1) p.stamina = Math.max(0, p.stamina - dt * 16);
  else p.stamina = Math.min(100, p.stamina + dt * 7);
}

function integratePlayers(dt) {
  for (const p of players) {
    p.vel.x = damp(p.vel.x, p.move.x, 9, dt);
    p.vel.z = damp(p.vel.z, p.move.z, 9, dt);
    p.pos.x += p.vel.x * dt;
    p.pos.z += p.vel.z * dt;
    p.pos.x = clamp(p.pos.x, -PITCH.halfW - 2.2, PITCH.halfW + 2.2);
    p.pos.z = clamp(p.pos.z, -PITCH.halfL + 0.4, PITCH.halfL - 0.4);
    const speed = Math.hypot(p.vel.x, p.vel.z);
    if (speed > 0.55) {
      const target = Math.atan2(p.vel.x, p.vel.z);
      p.facing = dampAngle(p.facing, target, 10, dt);
    }
    if (p.tackleCd > 0) p.tackleCd -= dt;
  }

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const a = players[i];
      const b = players[j];
      const dx = b.pos.x - a.pos.x;
      const dz = b.pos.z - a.pos.z;
      const d2 = dx * dx + dz * dz;
      if (d2 > 0.0001 && d2 < 0.8) {
        const d = Math.sqrt(d2);
        const push = (0.9 - d) * 0.5;
        const nx = dx / d;
        const nz = dz / d;
        a.pos.x -= nx * push;
        a.pos.z -= nz * push;
        b.pos.x += nx * push;
        b.pos.z += nz * push;
      }
    }
  }
}

function updateStamina(dt) {
  for (const p of players) {
    if (p !== state.controlled) p.stamina = Math.min(100, p.stamina + dt * 5);
  }
}

function updateBall(dt) {
  const ball = world.ball;
  ball.ring.position.set(ball.pos.x, 0.026, ball.pos.z);
  ball.ring.material.opacity = 0.2 + Math.sin(state.simTime * 4) * 0.08;

  if (ball.owner) {
    const p = ball.owner;
    const fx = Math.sin(p.facing);
    const fz = Math.cos(p.facing);
    ball.pos.set(p.pos.x + fx * 0.44, 0.18, p.pos.z + fz * 0.44);
    ball.vel.set(p.vel.x, 0, p.vel.z);
    ball.mesh.rotation.y += p.vel.length() * dt * 1.3;
    ball.mesh.rotation.x += p.vel.length() * dt * 0.5;
    return;
  }

  ball.vel.y -= 18 * dt;
  ball.pos.addScaledVector(ball.vel, dt);
  const ground = PITCH.ballR;
  if (ball.pos.y <= ground) {
    ball.pos.y = ground;
    if (ball.vel.y < -1.2) ball.vel.y *= -0.52;
    else ball.vel.y = 0;
    const f = Math.exp(-1.15 * dt);
    ball.vel.x *= f;
    ball.vel.z *= f;
  } else {
    ball.vel.x *= Math.exp(-0.1 * dt);
    ball.vel.z *= Math.exp(-0.1 * dt);
  }
  const spin = Math.hypot(ball.vel.x, ball.vel.z) * dt * 0.6;
  ball.mesh.rotation.x += ball.vel.z * dt * 1.1;
  ball.mesh.rotation.z -= ball.vel.x * dt * 1.1;
  ball.mesh.rotation.y += spin * 0.15;
}

function pickupBall() {
  const ball = world.ball;
  if (ball.owner) return;
  if (state.simTime < ball.noTouchUntil) return;
  if (ball.pos.y > 1.15) return;
  let best = null;
  let bestD = Infinity;
  for (const p of players) {
    const dx = p.pos.x - ball.pos.x;
    const dz = p.pos.z - ball.pos.z;
    const d2 = dx * dx + dz * dz;
    const reach = p.isGK ? 1.55 : 1.02;
    if (d2 < reach * reach && d2 < bestD) {
      bestD = d2;
      best = p;
    }
  }
  if (best) giveBallTo(best);
}

function giveBallTo(p) {
  const ball = world.ball;
  if (ball.wasShot) {
    if (p.team !== ball.shotTeam) {
      if (p.isGK) state.stats.saves[p.team] += 1;
      else state.stats.blocks[p.team] += 1;
    }
    ball.wasShot = false;
  }
  ball.owner = p;
  ball.lastTouch = p;
  ball.vel.set(0, 0, 0);
  ball.pos.set(p.pos.x, 0.18, p.pos.z);
  if (p.team === 'home' && !state.demo) {
    if (!p.isGK) setControlled(p);
  } else if (p.team === 'away' && !state.demo) {
    if (state.controlled && !state.controlled.isGK && state.controlled.pos.distanceTo(p.pos) > 7) {
      const near = nearestHomeField(ball.pos);
      if (near) setControlled(near);
    }
  }
}

function handleTackles(dt) {
  const ball = world.ball;
  const owner = ball.owner;
  if (!owner || owner.isGK) return;
  for (const p of players) {
    if (p.team === owner.team || p.tackleCd > 0) continue;
    const dx = p.pos.x - owner.pos.x;
    const dz = p.pos.z - owner.pos.z;
    if (dx * dx + dz * dz < 0.95 * 0.95) {
      const chance = dt * (0.32 + state.difficulty * 0.12);
      if (Math.random() < chance) {
        ball.owner = p;
        ball.lastTouch = p;
        ball.noTouchUntil = state.simTime + 0.18;
        ball.pos.set(p.pos.x, 0.18, p.pos.z);
        p.tackleCd = 0.9;
        owner.tackleCd = 0.6;
        state.stats.tackles[p.team] += 1;
        sound.kick(0.25);
        if (state.phase === 'play' && Math.random() < 0.25) {
          ui.say(`<b>${p.name}</b> wins the ball back for ${p.teamData.name}.`, 2200);
        }
        if (p.team === 'home' && !state.demo) setControlled(p);
        else if (p.team === 'away' && state.controlled && state.controlled.pos.distanceTo(p.pos) > 6 && !state.demo) {
          const near = nearestHomeField(p.pos);
          if (near) setControlled(near);
        }
        return;
      }
    }
  }
}

function handleGoalkeepers(dt) {
  const ball = world.ball;
  if (ball.owner && ball.owner.isGK) return;
  for (const gk of players) {
    if (!gk.isGK) continue;
    gk.saveCd = Math.max(0, (gk.saveCd || 0) - dt);
    const dx = gk.pos.x - ball.pos.x;
    const dz = gk.pos.z - ball.pos.z;
    const d = Math.hypot(dx, dz);
    const towardGoal = gk.team === 'home' ? ball.vel.z < -4 : ball.vel.z > 4;
    if (d < 1.4 && state.simTime > ball.noTouchUntil && ball.pos.y < 2.55) {
      const speed = Math.hypot(ball.vel.x, ball.vel.z);
      if (speed < 3.2) {
        giveBallTo(gk);
        gk.holdTimer = 1.1;
        gk.saveCd = 0.9;
      } else if (gk.saveCd <= 0) {
        gk.saveCd = 1.0;
        const skill = 0.44 + state.difficulty * 0.05;
        if (Math.random() < skill) {
          const away = gk.team === 'home' ? 1 : -1;
          ball.vel.set(rand(-7, 7), rand(1.5, 4.2), away * rand(6, 10));
          ball.lastTouch = gk;
          ball.noTouchUntil = state.simTime + 0.35;
          gk.diveTimer = 0.65;
          gk.diveSide = ball.pos.x >= gk.pos.x ? 1 : -1;
          state.stats.saves[gk.team] += 1;
          sound.kick(0.35);
          if (towardGoal) ui.say(`<b>${gk.name}</b> produces a stunning save for ${gk.teamData.name}!`, 2600);
        } else {
          gk.diveTimer = 0.45;
          gk.diveSide = ball.pos.x >= gk.pos.x ? -1 : 1;
          gk.pos.x += gk.diveSide * 0.5;
        }
      }
    }
  }
}

function checkGoalAndBounds() {
  const ball = world.ball;
  if (ball.owner) return;
  const { x, y, z } = ball.pos;
  if (z > PITCH.halfL && Math.abs(x) < PITCH.goalHalf && y < PITCH.goalH) {
    scoreGoal('home', z);
    return;
  }
  if (z < -PITCH.halfL && Math.abs(x) < PITCH.goalHalf && y < PITCH.goalH) {
    scoreGoal('away', z);
    return;
  }
  if (Math.abs(x) > PITCH.halfW + 0.35 || Math.abs(z) > PITCH.halfL + 0.35) {
    restartFromOut();
  }
}

function scoreGoal(teamKey, z) {
  const ball = world.ball;
  ball.vel.set(0, 0, 0);
  ball.owner = null;
  state.score[teamKey === 'home' ? 0 : 1] += 1;
  ball.wasShot = false;
  state.phase = 'goal';
  state.phaseTimer = 3.9;
  state.lastGoalTeam = teamKey;
  const scorer = ball.lastTouch && ball.lastTouch.team === teamKey ? ball.lastTouch : null;
  const name = scorer ? scorer.name : 'OWN GOAL';
  const minute = gameMinute();
  state.goalLog.push({ team: teamKey, scorer: scorer ? scorer.name : 'OWN GOAL', role: scorer ? scorer.role : null, minute, x: Number(ball.pos.x.toFixed(2)), y: Number(ball.pos.y.toFixed(2)), z: Number(ball.pos.z.toFixed(2)), lastTouchTeam: ball.lastTouch ? ball.lastTouch.team : null });
  state.goalFocus.copy(scorer ? scorer.pos : ball.pos);
  state.goalAngle = 0;
  ui.showGoal(teamKey === 'home' ? state.homeTeam : state.awayTeam, name, minute);
  ui.updateScorebug();
  sound.goal();
  ui.say(`<b>GOAL!</b> ${name} scores for ${teamKey === 'home' ? state.homeTeam.name : state.awayTeam.name}!`, 3800);
  if (world.confetti) {
    import('./world.js').then((m) => m.burstConfetti(world.confetti, z > 0 ? 1 : -1));
  }
  const gk = players.find((p) => p.isGK && p.team === (teamKey === 'home' ? 'away' : 'home'));
  if (gk) {
    gk.diveTimer = 0;
    gk.pos.z = clamp(gk.pos.z, -PITCH.halfL + 0.5, PITCH.halfL - 0.5);
  }
}

function restartFromOut() {
  const ball = world.ball;
  const lastTouch = ball.lastTouch;
  if (Math.abs(ball.pos.z) > PITCH.halfL) {
    const defending = ball.pos.z > 0 ? 'away' : 'home';
    const gk = players.find((p) => p.team === defending && p.isGK);
    if (gk) {
      const dir = defending === 'home' ? -1 : 1;
      gk.pos.set(0, 0, dir * (PITCH.halfL - 3.5));
      gk.root.position.copy(gk.pos);
      giveBallTo(gk);
      gk.holdTimer = 1.2;
      ui.say(`Goal kick to ${gk.teamData.name}.`, 1600);
    }
  } else {
    const giveTeam = lastTouch ? (lastTouch.team === 'home' ? 'away' : 'home') : 'home';
    let best = null;
    let bestD = Infinity;
    for (const p of players) {
      if (p.team !== giveTeam || p.isGK) continue;
      const d = p.pos.distanceToSquared(ball.pos);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (best) {
      best.pos.set(clamp(ball.pos.x, -PITCH.halfW + 1, PITCH.halfW - 1), 0, clamp(ball.pos.z, -PITCH.halfL + 1, PITCH.halfL - 1));
      best.root.position.copy(best.pos);
      giveBallTo(best);
      ui.say(`Throw-in to ${best.teamData.name}.`, 1500);
    }
  }
  ball.vel.set(0, 0, 0);
  ball.pos.y = PITCH.ballR;
  ball.noTouchUntil = state.simTime + 0.2;
}

function updateControlTarget() {
  if (state.demo) {
    state.controlled = null;
    return;
  }
  const ball = world.ball;
  if (ball.owner && ball.owner.team === 'home' && !ball.owner.isGK) {
    setControlled(ball.owner);
    return;
  }
  if (!state.controlled || state.controlled.isGK) {
    const near = nearestHomeField(ball.pos);
    if (near) setControlled(near);
    return;
  }
  const near = nearestHomeField(ball.pos);
  if (near && state.controlled.pos.distanceTo(ball.pos) > near.pos.distanceTo(ball.pos) + 4) {
    setControlled(near);
  }
}

export function kickBall(p, dir, speed, loft, isShot) {
  const ball = world.ball;
  ball.owner = null;
  ball.lastTouch = p;
  ball.pos.set(p.pos.x + dir.x * 0.55, 0.22, p.pos.z + dir.z * 0.55);
  ball.vel.set(dir.x * speed, loft, dir.z * speed);
  ball.noTouchUntil = state.simTime + 0.32;
  p.kickTimer = 0.34;
  p.stamina = Math.max(0, p.stamina - 2.5);
  sound.kick(clamp(speed / 38, 0.2, 1));
  if (isShot) {
    state.stats.shots[p.team] += 1;
    ball.wasShot = true;
    ball.shotTeam = p.team;
    state.shotLog.push({ t: Number(state.simTime.toFixed(1)), team: p.team, name: p.name, dist: Number(Math.hypot(p.team === 'home' ? PITCH.halfL - p.pos.z : -PITCH.halfL - p.pos.z, p.pos.x).toFixed(1)), x: Number(p.pos.x.toFixed(1)), z: Number(p.pos.z.toFixed(1)) });
    const goalZ = p.team === 'home' ? PITCH.halfL : -PITCH.halfL;
    const forwards = (goalZ - ball.pos.z) * ball.vel.z > 0;
    if (forwards) {
      let bx = ball.pos.x, by = ball.pos.y, bz = ball.pos.z;
      let vx = ball.vel.x, vy = ball.vel.y, vz = ball.vel.z;
      const step = 1 / 90;
      for (let i = 0; i < 360; i++) {
        bx += vx * step; bz += vz * step; by += vy * step; vy -= 18 * step;
        if (by <= PITCH.ballR) {
          by = PITCH.ballR;
          if (vy < -1.2) vy *= -0.52;
          else vy = 0;
          const f = Math.exp(-1.15 * step);
          vx *= f; vz *= f;
        } else {
          const f = Math.exp(-0.1 * step);
          vx *= f; vz *= f;
        }
        if (ball.vel.z > 0 ? bz >= goalZ : bz <= goalZ) {
          if (Math.abs(bx) < PITCH.goalHalf + 0.2 && by < PITCH.goalH + 0.2) state.stats.onTarget[p.team] += 1;
          break;
        }
      }
    }
    if (state.phase === 'play' && Math.random() < 0.18) {
      ui.say(`<b>${p.name}</b> lets fly for ${p.teamData.name}!`, 1600);
    }
  }
}

export function shootBall(p, aimX = 0, power = 0.7, isAI = false) {
  const goalZ = p.team === 'home' ? PITCH.halfL : -PITCH.halfL;
  const targetX = clamp(aimX, -PITCH.goalHalf + 0.3, PITCH.goalHalf - 0.3);
  const dir = new THREE.Vector3(targetX - p.pos.x, 0, goalZ - p.pos.z);
  const dist = dir.length();
  dir.normalize();
  const spreadBase = isAI ? (1.1 - state.difficulty * 0.17) * 0.06 : 0.04 + (1 - power) * 0.045;
  const spread = spreadBase * (0.55 + dist / 55);
  const angle = Math.atan2(dir.x, dir.z) + rand(-spread, spread);
  dir.set(Math.sin(angle), 0, Math.cos(angle));
  const speed = 22 + power * 15 + (isAI ? state.difficulty * 1.2 : 0);
  const flight = Math.max(0.18, dist / speed);
  const loft = clamp(0.7 / flight + 9 * flight, 3.5, 13) * (0.9 + power * 0.12) + rand(-0.35, 0.55);
  kickBall(p, dir, speed, loft, true);
}

export function passBall(p) {
  const target = choosePassTarget(p);
  if (!target) {
    const dir = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
    kickBall(p, dir, 15, 1.4, false);
    return;
  }
  const lead = new THREE.Vector3(target.pos.x + target.vel.x * 0.32, 0, target.pos.z + target.vel.z * 0.32);
  const dir = new THREE.Vector3(lead.x - p.pos.x, 0, lead.z - p.pos.z);
  const dist = dir.length();
  dir.normalize();
  const speed = clamp(dist * 1.15 + 5, 12, 25);
  const loft = dist > 17 ? 2.2 : 0.35;
  kickBall(p, dir, speed, loft, false);
  state.stats.passes[p.team] += 1;
  if (target.team === 'home' && !state.demo) setControlled(target);
  target.think = 0;
  target.aiTarget.copy(lead);
}

export function choosePassTarget(p) {
  const facing = new THREE.Vector3(Math.sin(p.facing), 0, Math.cos(p.facing));
  const attackDir = p.team === 'home' ? 1 : -1;
  let best = null;
  let bestScore = -Infinity;
  for (const q of players) {
    if (q.team !== p.team || q === p) continue;
    const to = new THREE.Vector3(q.pos.x - p.pos.x, 0, q.pos.z - p.pos.z);
    const dist = to.length();
    if (dist < 2.2 || dist > 48) continue;
    to.normalize();
    const dot = to.dot(facing);
    if (dot < -0.35) continue;
    let pressure = 40;
    for (const o of players) {
      if (o.team === p.team) continue;
      const d = o.pos.distanceTo(q.pos);
      if (d < pressure) pressure = d;
    }
    const forward = to.z * attackDir;
    let score = dot * 1.3 + forward * 2.6 + (1 - dist / 48) * 1.2 + clamp(pressure / 12, 0, 1) * 1.3;
    if (q.isGK) score -= dist > 22 ? 4 : 1.2;
    if (q.role === 'ST' && forward > 0.3) score += 0.9;
    if (score > bestScore) {
      bestScore = score;
      best = q;
    }
  }
  return best;
}

function endHalf() {
  const ball = world.ball;
  ball.owner = null;
  ball.vel.set(0, 0, 0);
  sound.whistle(true);
  if (state.half === 1) {
    state.phase = 'halftime';
    state.phaseTimer = 3;
    sound.crowdHush();
    ui.showToast('HALF TIME', `${state.homeTeam.short}  ${state.score[0]} – ${state.score[1]}  ${state.awayTeam.short}`, 2600);
    ui.say('The referee blows for half time.', 2800);
  } else {
    state.phase = 'fulltime';
    state.result = state.score[0] === state.score[1] ? 'draw' : state.score[0] > state.score[1] ? 'home' : 'away';
    ui.showFullTime();
    ui.hideToast();
    sound.crowdLift(0.13);
    if (state.result === 'draw') ui.say('It ends all square. A share of the points.', 3200);
    else ui.say(`${(state.result === 'home' ? state.homeTeam : state.awayTeam).name} take the win!`, 3200);
  }
}

export function gameMinute() {
  const total = ((state.half - 1) + clamp(state.clock / state.halfLength, 0, 1)) * 90;
  return clamp(Math.floor(total) + 1, 1, 90);
}

export function togglePause() {
  if (state.phase === 'menu' || state.phase === 'fulltime') return;
  if (state.paused) {
    ui.hidePause();
    sound.crowdLift(0.055);
  } else {
    ui.showPause();
    sound.crowdHush();
  }
}

export function pauseForBlur() {
  if (state.phase === 'play' || state.phase === 'kickoff') {
    if (!state.paused) {
      ui.showPause();
      sound.crowdHush();
    }
  }
}
