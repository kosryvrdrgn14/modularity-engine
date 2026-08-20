// From 01_engine_architecture.md Section 2 — Entity System

export type EntityType = 'player' | 'enemy' | 'projectile' | 'orb' | 'pickup' | 'obstacle' | 'boss' | 'enemyProjectile';

export type BehaviorType =
  | 'player'
  | 'chase'
  | 'swarm'
  | 'tank'
  | 'wanderChase'
  | 'ranged'
  | 'bossCharge'
  | 'projectile'
  | 'orbit'
  | 'area'
  | 'enemyProjectile';

export interface Hitbox {
  shape: 'circle' | 'aabb';
  radius?: number;
  width?: number;
  height?: number;
}

export interface VisualDef {
  shape: 'square' | 'circle' | 'diamond' | 'triangle';
  color: string;
  size: number;
  borderColor?: string;
  borderWidth?: number;
  glowColor?: string;
  glowSize?: number;
  opacity?: number;
}

export interface EntityStats {
  maxHp: number;
  hp: number;
  damage: number;
  speed: number;
  armor: number;
  critChance: number;
  critMultiplier: number;
  xpValue: number;
  goldValue: number;
  goldMin: number;
  goldMax: number;
}

export interface Entity {
  id: number;
  type: EntityType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hitbox: Hitbox;
  collisionLayer: number;
  isStatic: boolean;
  stats: EntityStats;
  behavior: BehaviorType;
  visual: VisualDef;
  active: boolean;
  age: number;
  ttl: number | null;
  distanceTraveled: number;
  // Weapon-specific
  orbitAngle?: number;
  orbitRadius?: number;
  orbitSpeed?: number;
  orbitCount?: number;
  // Click-to-move
  movingToTarget?: boolean;
  targetX?: number;
  targetY?: number;
}

// Collision layers — Section 4
export const COLLISION = {
  PLAYER:      0b00001,
  ENEMY:       0b00010,
  PROJECTILE:  0b00100,
  PICKUP:      0b01000,
  OBSTACLE:    0b10000,
} as const;

// Game states — Section 7
export type GameState =
  | 'loading'
  | 'menu'
  | 'playing'
  | 'paused'
  | 'levelUp'
  | 'gameOver'
  | 'endScreen';

export type GameResult = 'victory' | 'survived' | 'defeat';

// End screen result — Section 7
export interface GameEndResult {
  result: GameResult;
  timeSurvived: number;
  levelReached: number;
  enemiesKilled: number;
  goldCollected: number;
  bossDefeated: boolean;
  weaponLoadout: string[];
}
