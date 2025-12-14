export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 800;

export const PLAYER_SPEED = 6;
export const PLAYER_JUMP_FORCE = 14;
export const GRAVITY = 0.8;
export const FRICTION = 0.85;
export const GROUND_LEVEL = 0;

export const PUNCH_DURATION = 15; // frames
export const PUNCH_COOLDOWN = 30; // frames
export const PUNCH_RANGE = 60;

export const ENEMY_SPAWN_RATE = 120; // frames
export const MAX_ENEMIES = 10;

export const KEYS = {
  UP: ['ArrowUp', 'w', 'W'],
  DOWN: ['ArrowDown', 's', 'S'],
  LEFT: ['ArrowLeft', 'a', 'A'],
  RIGHT: ['ArrowRight', 'd', 'D'],
  A: ['k', 'K', ' '], // Jump
  B: ['j', 'J', 'Enter'] // Punch
};