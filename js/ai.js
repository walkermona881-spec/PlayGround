import { PITCH, clamp, rand, DIFFICULTY_SPEED, DIFFICULTY_REACT } from './data.js';
import { state, world, players } from './state.js';

function moveTo(p, tx, tz, speed) {
  const dx = tx - p.pos.x;
  const dz = tz - p.pos.z;
  const d = Math.hypot(dx, dz);
  if (d > 0.35) {
    p.move.set((dx / d) * speed, 0, (dz / d) * speed);
  } else {
    p.move.set(0, 0, 0);
  }
}

function shotAim() {
  if (Math.random() < 0.18) return rand(-0.9, 0.9);
  return (Math.random() < 0.5 ? -1 : 1) * rand(1.9, PITCH.goalHalf - 0.5);
}

function nearestOpponent(p) {
  let best = null;
  let bestD = Infinity;
  for (const o of players) {
    if (o.team === p.team) continue;
    const d = o.pos.distanceToSquared(p.pos);
    if (d < bestD) {
      bestD = d;
      best = o;
    }
  }
  return { player: best, dist: Math.sqrt(bestD) };
}

export function updateAI(dt, api) {
  const ball = world.ball;
  const owner = ball.owner;
  const speedMult = DIFFICULTY_SPEED[state.difficulty];
  const react = DIFFICULTY_REACT[state.difficulty];

  const sorted = { home: [], away: [] };
  for (const p of players) {
    if (p.isGK) continue;
    sorted[p.team].push(p);
  }
  for (const key of ['home', 'away']) {
    sorted[key].sort((a, b) => a.pos.distanceToSquared(ball.pos) - b.pos.distanceToSquared(ball.pos));
  }

  const chasing = { home: new Set(), away: new Set() };
  for (const key of ['home', 'away']) {
    const defending = owner ? owner.team !== key : true;
    const ownGoal = key === 'home' ? -PITCH.halfL : PITCH.halfL;
    const deep = Math.abs(ball.pos.z - ownGoal) < 32;
    const count = defending && deep ? 2 : 1;
    for (let i = 0; i < Math.min(count, sorted[key].length); i++) chasing[key].add(sorted[key][i]);
  }

  for (const p of players) {
    if (p === state.controlled) continue;
    if (p.isGK) {
      updateGoalkeeper(p, dt, api, ball);
      continue;
    }
    if (p === owner) {
      updateCarrier(p, dt, api, ball, speedMult, react);
      continue;
    }
    if (p.think > 0) p.think -= dt;

    const teamHasBall = owner && owner.team === p.team;
    if (teamHasBall) {
      updateSupport(p, ball, speedMult);
    } else {
      updateDefender(p, ball, owner, chasing[p.team].has(p), speedMult);
    }
  }
}

function updateCarrier(p, dt, api, ball, speedMult, react) {
  const attackDir = p.team === 'home' ? 1 : -1;
  const goalZ = attackDir * PITCH.halfL;
  const distGoal = Math.hypot(goalZ - p.pos.z, p.pos.x);
  const opp = nearestOpponent(p);

  p.think -= dt;
  if (p.think <= 0) {
    p.think = react + rand(0, 0.12);

    const angleOk = Math.abs(p.pos.x) < 24;
    const shootChance = distGoal < 20 ? 0.72 : distGoal < 28 ? 0.42 : 0.18;
    if (distGoal < 34 && angleOk && Math.random() < shootChance + state.difficulty * 0.04) {
      api.shoot(p, shotAim(), rand(0.68, 1));
      return;
    }
    if (opp.dist < 2.8 && Math.random() < 0.62) {
      api.pass(p);
      return;
    }
    if (Math.random() < 0.04) {
      api.pass(p);
      return;
    }

    const targetZ = clamp(p.pos.z + attackDir * (9 + Math.random() * 9), -PITCH.halfL + 2.5, PITCH.halfL - 2.5);
    let targetX = p.pos.x * 0.6 + (distGoal < 34 ? clamp(p.pos.x, -6, 6) * 0.15 : 0);
    if (opp.player && opp.dist < 5.5) {
      targetX += (p.pos.x - opp.player.pos.x) * 1.05;
      if (Math.abs(targetX) > PITCH.halfW - 3) targetX = p.pos.x * -0.5;
    }
    targetX = clamp(targetX + rand(-1.6, 1.6), -PITCH.halfW + 2.5, PITCH.halfW - 2.5);
    p.aiTarget.set(targetX, 0, targetZ);
    p.runPhase = rand(0, Math.PI * 2);
  }

  moveTo(p, p.aiTarget.x, p.aiTarget.z, p.baseSpeed * speedMult * 1.1);

  if (distGoal < 15 && Math.abs(p.pos.x) < 17 && Math.random() < dt * 2.4) {
    api.shoot(p, shotAim(), rand(0.7, 1));
  }
}

function updateSupport(p, ball, speedMult) {
  const attackDir = p.team === 'home' ? 1 : -1;
  const advance = clamp((ball.pos.z * attackDir) / PITCH.halfL, -0.4, 1);
  const push = 20 + advance * 18;
  const rolePush = p.role === 'ST' ? 7 : p.role === 'LW' || p.role === 'RW' ? 5 : p.role === 'CM' ? 3 : p.role === 'CDM' ? 1 : -1;
  let tx = p.anchor.x * 0.82 + ball.pos.x * 0.22;
  let tz = p.anchor.z + attackDir * (push + rolePush);

  if (p.role === 'ST') {
    tx = tx * 0.5 + clamp(ball.pos.x, -8, 8) * 0.5 + rand(-2, 2);
  } else if (p.role === 'LW' || p.role === 'RW') {
    tx = clamp(tx, -PITCH.halfW + 3, PITCH.halfW - 3);
  }

  const dzBall = ball.pos.z - tz;
  if (Math.abs(dzBall) < 3 && Math.abs(ball.pos.x - tx) < 3.2) {
    tx += p.team === 'home' ? -4 : 4;
  }
  p.aiTarget.set(clamp(tx, -PITCH.halfW + 2, PITCH.halfW - 2), 0, clamp(tz, -PITCH.halfL + 3, PITCH.halfL - 3));
  moveTo(p, p.aiTarget.x, p.aiTarget.z, p.baseSpeed * speedMult * 0.93);
}

function updateDefender(p, ball, owner, isChasing, speedMult) {
  const attackDir = p.team === 'home' ? 1 : -1;
  const target = p.aiTarget;

  if (isChasing) {
    const lead = owner ? 0.18 : 0.3;
    target.set(
      clamp(ball.pos.x + ball.vel.x * lead, -PITCH.halfW + 1, PITCH.halfW - 1),
      0,
      clamp(ball.pos.z + ball.vel.z * lead, -PITCH.halfL + 1, PITCH.halfL - 1)
    );
    moveTo(p, target.x, target.z, p.baseSpeed * speedMult * 0.97);
    return;
  }

  const advance = clamp((ball.pos.z * attackDir) / PITCH.halfL, -1, 1);
  let tx = p.anchor.x * 0.95 + ball.pos.x * 0.2;
  let tz = p.anchor.z + attackDir * (-2 + advance * 8);
  if (owner && owner.team !== p.team && p.pos.distanceToSquared(owner.pos) < 90) {
    tx = tx * 0.7 + owner.pos.x * 0.3;
    tz = tz * 0.75 + owner.pos.z * 0.25;
  }
  target.set(clamp(tx, -PITCH.halfW + 2, PITCH.halfW - 2), 0, clamp(tz, -PITCH.halfL + 3, PITCH.halfL - 3));
  moveTo(p, target.x, target.z, p.baseSpeed * speedMult * 0.86);
}

function updateGoalkeeper(p, dt, api, ball) {
  const ownGoal = p.team === 'home' ? -PITCH.halfL : PITCH.halfL;
  const inward = p.team === 'home' ? 1 : -1;
  const lineZ = ownGoal + inward * 0.9;
  let tx = clamp(ball.pos.x * 0.42, -2.9, 2.9);
  let tz = lineZ;

  if (p === ball.owner) {
    p.holdTimer -= dt;
    p.move.set(0, 0, 0);
    if (p.holdTimer <= 0) api.pass(p);
    return;
  }

  const ballNear = Math.abs(ball.pos.z - ownGoal) < 17 && Math.abs(ball.pos.x) < 20;
  if (ballNear) {
    tx = clamp(ball.pos.x, -5.4, 5.4);
    tz = lineZ + inward * clamp((ball.pos.z - ownGoal) * 0.28, 0, 4.2);
  }

  const movingAtGoal = (ownGoal - ball.pos.z) * ball.vel.z > 0.5;
  if (!ball.owner && movingAtGoal && Math.abs(ball.vel.z) > 4) {
    const time = Math.abs((ownGoal - ball.pos.z) / ball.vel.z);
    if (time < 2.1) {
      const predictedX = ball.pos.x + ball.vel.x * time + rand(-0.85, 0.85) * (1.15 - state.difficulty * 0.12);
      tx = clamp(predictedX, -PITCH.goalHalf + 0.2, PITCH.goalHalf - 0.2);
      tz = lineZ;
    }
  }

  tx = clamp(tx, -5.8, 5.8);
  tz = clamp(tz, -PITCH.halfL + 0.7, PITCH.halfL - 0.7);
  moveTo(p, tx, tz, p.baseSpeed * 0.98);
}
