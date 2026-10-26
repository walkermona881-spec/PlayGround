import * as THREE from '../vendor/three.module.js';
import { TEAMS } from './data.js';

export const state = {
  phase: 'menu',
  paused: false,
  demo: false,
  homeTeam: TEAMS[0],
  awayTeam: TEAMS[1],
  selectedTeam: 0,
  difficulty: 1,
  halfLength: 90,
  score: [0, 0],
  half: 1,
  clock: 0,
  simTime: 0,
  phaseTimer: 0,
  controlled: null,
  lastPasser: null,
  stats: null,
  menuAngle: 0.7,
  goalAngle: 0,
  goalFocus: new THREE.Vector3(),
  cameraPos: new THREE.Vector3(30, 26, 60),
  cameraLook: new THREE.Vector3(0, 2, 0),
  muted: false,
  lastShot: null,
  goalLog: [],
  shotLog: [],
  kickoffTeam: 'home',
  result: null,
};

export const world = {
  scene: null,
  camera: null,
  renderer: null,
  sun: null,
  ball: null,
  confetti: null,
  controlledRing: null,
  controlledTag: null,
  tagCanvas: null,
  tagTex: null,
  tagName: '',
};

export const players = [];
export const keys = {};

export const input = {
  charge: false,
  power: 0,
  touchX: 0,
  touchY: 0,
  touchSprint: false,
  joystickActive: false,
};

export function resetStats() {
  state.goalLog = [];
  state.shotLog = [];
  state.stats = {
    shots: { home: 0, away: 0 },
    onTarget: { home: 0, away: 0 },
    saves: { home: 0, away: 0 },
    passes: { home: 0, away: 0 },
    tackles: { home: 0, away: 0 },
    blocks: { home: 0, away: 0 },
    possession: { home: 0, away: 0 },
  };
}
