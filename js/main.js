import * as THREE from '../vendor/three.module.js';
import { PITCH, clamp, damp } from './data.js';
import { state, world, players, keys, input } from './state.js';
import { addSky, addLights, addPitch, addStadium, addGoals, addBoards, addBall, addControlledIndicator, addConfetti, updateConfetti } from './world.js';
import {
  showcaseTeams, startMatch, restartMatch, goToMenu, updateGame, updatePlayerVisuals, togglePause, pauseForBlur, passBall, shootBall,
} from './match.js';
import * as ui from './ui.js';
import { sound } from './audio.js';

const camLook = new THREE.Vector3(0, 2, 0);
const desiredPos = new THREE.Vector3();
const desiredLook = new THREE.Vector3();
let ready = false;
let last = performance.now() / 1000;

function createRenderer() {
  const renderer = new THREE.WebGLRenderer({
    canvas: ui.DOM.canvas,
    antialias: true,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  return renderer;
}

function initWorld() {
  world.scene = new THREE.Scene();
  world.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 700);
  world.camera.position.set(40, 26, 48);

  try {
    world.renderer = createRenderer();
  } catch (err) {
    ui.DOM.loading.innerHTML = '<div class="loading-inner"><div class="loading-title">WEBGL REQUIRED</div><div class="loading-sub">THIS DEVICE COULD NOT START THE 3D ENGINE</div></div>';
    console.error('WebGL init failed', err);
    return false;
  }

  addSky(world.scene);
  world.sun = addLights(world.scene);
  addPitch(world.scene);
  addStadium(world.scene);
  addGoals(world.scene);
  addBoards(world.scene);
  world.ball = addBall(world.scene);

  const indicator = addControlledIndicator(world.scene);
  world.controlledRing = indicator.ring;
  world.controlledTag = indicator.tag;
  world.confetti = addConfetti(world.scene);

  showcaseTeams();
  ui.setSelectedTeam(state.selectedTeam);
  ui.setDifficulty(state.difficulty);
  ui.setHalfLength(state.halfLength);
  ui.setSoundIcon(state.muted);
  ui.showMenu(true);
  ui.showHud(false);
  return true;
}

function updateCamera(dt) {
  if (state.paused) return;
  const phase = state.phase;
  let lambda = 3.2;
  let lookLambda = 4.2;

  if (phase === 'menu') {
    state.menuAngle += dt * 0.05;
    const r = 58 + Math.sin(state.simTime * 0.12) * 2.2;
    desiredPos.set(Math.cos(state.menuAngle) * r, 26 + Math.sin(state.simTime * 0.18) * 1.3, Math.sin(state.menuAngle) * r);
    desiredLook.set(0, 2.8, 0);
    lambda = 2.1;
    lookLambda = 2.6;
  } else if (phase === 'goal') {
    state.goalAngle += dt * 0.6;
    const f = state.goalFocus;
    desiredPos.set(f.x + Math.cos(state.goalAngle) * 8.6, 5.6, f.z + Math.sin(state.goalAngle) * 8.6);
    desiredLook.set(f.x, 1.35, f.z);
    lambda = 3.4;
    lookLambda = 5;
  } else if (phase === 'halftime' || phase === 'fulltime') {
    state.goalAngle += dt * 0.075;
    const r = 63;
    desiredPos.set(Math.cos(state.goalAngle) * r, 23, Math.sin(state.goalAngle) * r);
    desiredLook.set(0, 2.4, 0);
    lambda = 2;
    lookLambda = 3;
  } else {
    const ball = world.ball;
    const focus = state.controlled ? state.controlled.pos : ball.pos;
    const mx = focus.x * 0.65 + ball.pos.x * 0.35;
    const mz = focus.z * 0.55 + ball.pos.z * 0.45;
    desiredPos.set(mx * 0.78, 8.3, clamp(mz - 11.5, -57, 57));
    desiredLook.set(mx * 0.55, 1.4 + Math.min(ball.pos.y * 0.22, 1.4), clamp(mz + 7.2, -PITCH.halfL + 2, PITCH.halfL - 2));
    lambda = 4.4;
    lookLambda = 5.6;
  }

  world.camera.position.lerp(desiredPos, 1 - Math.exp(-lambda * dt));
  camLook.lerp(desiredLook, 1 - Math.exp(-lookLambda * dt));
  world.camera.lookAt(camLook);

  let targetFov = 55;
  if (phase === 'play' || phase === 'kickoff') {
    const speed = state.controlled ? Math.hypot(state.controlled.vel.x, state.controlled.vel.z) : 0;
    targetFov = 54 + Math.min(speed, 8.5) * 0.55;
  }
  if (Math.abs(world.camera.fov - targetFov) > 0.01) {
    world.camera.fov = damp(world.camera.fov, targetFov, 3, dt);
    world.camera.updateProjectionMatrix();
  }
}

function updateMenuScene(dt) {
  if (state.phase !== 'menu') return;
  const ball = world.ball;
  if (ball) {
    ball.mesh.rotation.y += dt * 0.5;
    ball.mesh.rotation.x += dt * 0.2;
    ball.ring.position.set(ball.pos.x, 0.026, ball.pos.z);
    ball.ring.material.opacity = 0.2 + Math.sin(state.simTime * 3) * 0.08;
  }
}

function updateCharging(dt) {
  if (state.phase !== 'play') {
    input.charge = false;
    input.power = 0;
    return;
  }
  if (input.charge) {
    input.power = Math.min(1, input.power + dt / 0.85);
  }
}

function shootRelease() {
  if (!input.charge) return;
  const p = state.controlled;
  const ball = world.ball;
  if (p && state.phase === 'play' && !state.paused) {
    const close = ball.owner === p || ball.pos.distanceTo(p.pos) < 2.3;
    if (close) {
      const lateral =
        (keys.d || keys.ArrowRight ? 1 : 0) -
        (keys.a || keys.ArrowLeft ? 1 : 0) +
        input.touchX;
      const aimX = clamp(p.pos.x * 0.16 + lateral * 2.2, -PITCH.goalHalf + 0.4, PITCH.goalHalf - 0.4);
      const power = 0.35 + input.power * 0.65;
      import('./match.js').then((m) => m.shootBall(p, aimX, power));
    }
  }
  input.charge = false;
  input.power = 0;
}

function passAction() {
  const p = state.controlled;
  if (!p || state.phase !== 'play' || state.paused) return;
  const ball = world.ball;
  if (ball.owner === p || ball.pos.distanceTo(p.pos) < 2.3) {
    import('./match.js').then((m) => m.passBall(p));
  }
}

function beginCharge() {
  if (state.phase !== 'play' || state.paused) return;
  const p = state.controlled;
  if (!p) return;
  const ball = world.ball;
  if (ball.owner === p || ball.pos.distanceTo(p.pos) < 2.5) {
    input.charge = true;
    input.power = 0;
  }
}

function bindInput() {
  window.addEventListener('keydown', (e) => {
    const key = e.key;
    keys[key.toLowerCase()] = true;
    keys[key] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar'].includes(key)) e.preventDefault();

    if (state.phase === 'menu' && key === 'Enter') {
      startMatch(false);
      return;
    }
    if (key === 'p' || key === 'P' || key === 'Escape') {
      if (!e.repeat) togglePause();
      return;
    }
    if (key === ' ' || key === 'Spacebar') {
      if (!e.repeat) passAction();
      return;
    }
    if (key === 'k' || key === 'K') {
      if (!e.repeat) beginCharge();
    }
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key;
    keys[key.toLowerCase()] = false;
    keys[key] = false;
    if (key === 'k' || key === 'K') shootRelease();
  });

  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    input.charge = false;
    input.power = 0;
    input.touchX = 0;
    input.touchY = 0;
    input.touchSprint = false;
  });

  ui.DOM.canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    if (e.button !== 0) return;
    sound.init();
    beginCharge();
  });
  window.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') return;
    shootRelease();
  });
  ui.DOM.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) pauseBtn.addEventListener('click', () => togglePause());
  const soundBtn = ui.DOM.soundBtn;
  soundBtn.addEventListener('click', () => {
    state.muted = !state.muted;
    sound.init();
    sound.setMuted(state.muted);
    ui.setSoundIcon(state.muted);
  });

  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseForBlur();
  });
}

function bindMenu() {
  ui.buildTeamCards((index) => {
    ui.setSelectedTeam(index);
    sound.blip(680, 0.05, 0.08);
    clearTimeout(window.__menuRebuild);
    window.__menuRebuild = setTimeout(() => {
      if (state.phase === 'menu') showcaseTeams();
    }, 130);
  });
  ui.setSelectedTeam(state.selectedTeam);

  [...ui.DOM.difficultySeg.children].forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.setDifficulty(Number(btn.dataset.value));
      sound.blip(540, 0.05, 0.07);
    });
  });
  [...ui.DOM.lengthSeg.children].forEach((btn) => {
    btn.addEventListener('click', () => {
      ui.setHalfLength(Number(btn.dataset.value));
      sound.blip(560, 0.05, 0.07);
    });
  });

  ui.DOM.kickoffBtn.addEventListener('click', () => {
    sound.init();
    startMatch(false);
  });
  ui.DOM.demoBtn.addEventListener('click', () => {
    sound.init();
    startMatch(true);
  });
  document.getElementById('resumeBtn').addEventListener('click', () => togglePause());
  document.getElementById('restartBtn').addEventListener('click', () => restartMatch());
  document.getElementById('quitBtn').addEventListener('click', () => goToMenu());
  document.getElementById('rematchBtn').addEventListener('click', () => restartMatch());
  document.getElementById('menuBtn').addEventListener('click', () => goToMenu());

  if (window.matchMedia('(hover: none)').matches) {
    ui.DOM.controlsHint.style.display = 'none';
  }
}

function bindTouch() {
  const joy = ui.DOM.joystick;
  const stick = ui.DOM.stick;
  let active = false;
  let pointerId = null;

  const updateStick = (e) => {
    const rect = joy.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const max = 44;
    const d = Math.hypot(dx, dy);
    if (d > max) {
      dx = (dx / d) * max;
      dy = (dy / d) * max;
    }
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
    input.touchX = dx / max;
    input.touchY = -dy / max;
  };
  const resetStick = () => {
    active = false;
    pointerId = null;
    stick.style.transform = 'translate(0px, 0px)';
    input.touchX = 0;
    input.touchY = 0;
  };

  joy.addEventListener('pointerdown', (e) => {
    active = true;
    pointerId = e.pointerId;
    joy.setPointerCapture(pointerId);
    updateStick(e);
  });
  joy.addEventListener('pointermove', (e) => {
    if (active && e.pointerId === pointerId) updateStick(e);
  });
  joy.addEventListener('pointerup', resetStick);
  joy.addEventListener('pointercancel', resetStick);

  const btnSprint = document.getElementById('btnSprint');
  const btnPass = document.getElementById('btnPass');
  const btnShoot = document.getElementById('btnShoot');

  btnSprint.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    input.touchSprint = true;
  });
  btnSprint.addEventListener('pointerup', () => {
    input.touchSprint = false;
  });
  btnSprint.addEventListener('pointercancel', () => {
    input.touchSprint = false;
  });
  btnPass.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    passAction();
  });
  btnShoot.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    beginCharge();
  });
  btnShoot.addEventListener('pointerup', (e) => {
    e.preventDefault();
    shootRelease();
  });
  btnShoot.addEventListener('pointercancel', shootRelease);
}

function onResize() {
  if (!world.camera || !world.renderer) return;
  world.camera.aspect = window.innerWidth / window.innerHeight;
  world.camera.updateProjectionMatrix();
  world.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  world.renderer.setSize(window.innerWidth, window.innerHeight);
}

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now() / 1000;
  let dt = now - last;
  last = now;
  if (dt > 0.05) dt = 0.05;
  if (dt < 0) dt = 0;

  if (!state.paused) {
    state.simTime += dt;
    updateGame(dt);
    updateCharging(dt);
    updatePlayerVisuals(dt);
    updateConfetti(world.confetti, dt);
    updateMenuScene(dt);
    updateCamera(dt);
  }
  ui.updateHud();
  world.renderer.render(world.scene, world.camera);

  if (!ready) {
    ready = true;
    window.__DLS_READY__ = true;
    setTimeout(() => ui.DOM.loading.classList.add('gone'), 320);
  }
}

function announce() {
  window.DLS2026 = {
    version: '1.0.0',
    start: () => startMatch(false),
    demo: () => startMatch(true),
    menu: () => goToMenu(),
    pause: () => togglePause(),
    pass: () => passAction(),
    shoot: (power = 0.85) => {
      const p = state.controlled;
      if (p && state.phase === 'play') shootBall(p, clamp(p.pos.x * 0.1, -2, 2), power);
    },
    setTeam: (i) => {
      if (typeof i === 'number' && i >= 0 && i < 8) {
        ui.setSelectedTeam(i);
        if (state.phase === 'menu') showcaseTeams();
      }
    },
    simulate: (seconds = 10) => {
      const total = Math.max(0, Math.min(1200, Number(seconds) || 0));
      const steps = Math.round(total * 60);
      for (let i = 0; i < steps; i++) {
        const dt = 1 / 60;
        state.simTime += dt;
        updateGame(dt);
        updateCharging(dt);
        updatePlayerVisuals(dt);
        updateConfetti(world.confetti, dt);
        updateCamera(dt);
      }
      ui.updateHud();
      return window.DLS2026.snapshot();
    },
    snapshot: () => ({
      phase: state.phase,
      paused: state.paused,
      demo: state.demo,
      score: [...state.score],
      stats: state.stats ? JSON.parse(JSON.stringify(state.stats)) : null,
      goalLog: state.goalLog ? JSON.parse(JSON.stringify(state.goalLog)) : null,
      shotLog: state.shotLog ? JSON.parse(JSON.stringify(state.shotLog)) : null,
      half: state.half,
      clock: Number(state.clock.toFixed(2)),
      halfLength: state.halfLength,
      teams: [state.homeTeam.name, state.awayTeam.name],
      players: players.length,
      controlled: state.controlled ? state.controlled.name : null,
      controlledPos: state.controlled ? { x: Number(state.controlled.pos.x.toFixed(2)), z: Number(state.controlled.pos.z.toFixed(2)) } : null,
      ball: {
        x: Number(world.ball.pos.x.toFixed(2)),
        y: Number(world.ball.pos.y.toFixed(2)),
        z: Number(world.ball.pos.z.toFixed(2)),
        owner: world.ball.owner ? world.ball.owner.name : null,
      },
      renderer: world.renderer ? world.renderer.info.render : null,
    }),
    scene: () => world.scene,
    camera: () => world.camera,
  };
}

function boot() {
  if (!initWorld()) return;
  bindInput();
  bindMenu();
  bindTouch();
  announce();
  onResize();
  last = performance.now() / 1000;

  const params = new URLSearchParams(window.location.search);
  const teamParam = Number(params.get('team'));
  if (!Number.isNaN(teamParam) && teamParam >= 0 && teamParam < 8) {
    ui.setSelectedTeam(teamParam);
    showcaseTeams();
  }
  const shouldDemo = params.get('demo') === '1' || params.get('autostart') === 'demo';
  const shouldStart = params.get('quick') === '1' || params.get('autostart') === '1' || params.get('play') === '1';
  if (shouldDemo) setTimeout(() => startMatch(true), 450);
  else if (shouldStart) setTimeout(() => startMatch(false), 450);

  requestAnimationFrame(loop);
}

boot();
