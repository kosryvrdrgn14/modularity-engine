// From 01_engine_architecture.md — InputManager + MovementSystem

import type { Entity } from './types';
import { EntityPool } from './entityPool';

const PLAYER_ARRIVAL_THRESHOLD = 4; // px — from 02_character_spec.md

export interface InputState {
  // WASD / Arrow keys
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  // Click/tap target
  clickTargetX: number | null;
  clickTargetY: number | null;
}

export function updatePlayerMovement(
  player: Entity,
  input: InputState,
  dt: number,
  obstacles: Entity[],
): void {
  // WASD overrides click-to-move
  const hasWASD = input.up || input.down || input.left || input.right;

  if (hasWASD) {
    // 8-directional movement with diagonal normalization
    let dx = 0;
    let dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    // Normalize diagonal
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      dx /= len;
      dy /= len;
    }

    player.vx = dx * player.stats.speed;
    player.vy = dy * player.stats.speed;
    player.movingToTarget = false;
  } else if (player.movingToTarget && player.targetX != null && player.targetY != null) {
    // Click/tap-to-move pathfinding
    const tdx = player.targetX - player.x;
    const tdy = player.targetY - player.y;
    const dist = Math.sqrt(tdx * tdx + tdy * tdy);

    if (dist < PLAYER_ARRIVAL_THRESHOLD) {
      player.movingToTarget = false;
      player.vx = 0;
      player.vy = 0;
    } else {
      // Simple steering — move toward target
      const dirX = tdx / dist;
      const dirY = tdy / dist;
      player.vx = dirX * player.stats.speed;
      player.vy = dirY * player.stats.speed;
    }
  } else {
    // No input — decelerate
    player.vx *= 0.85; // Friction
    player.vy *= 0.85;
    if (Math.abs(player.vx) < 0.5) player.vx = 0;
    if (Math.abs(player.vy) < 0.5) player.vy = 0;
  }

  // Apply velocity
  const newX = player.x + player.vx * dt;
  const newY = player.y + player.vy * dt;

  // GAP: Obstacle collision during movement
  // The spec says "simple steering — move toward target, if blocked by obstacle, slide along it"
  // But the actual implementation needs to check collision at the NEXT position
  // and decide whether to slide along X or Y axis
  // This is partially handled by the collision system, but the pathfinding
  // logic here doesn't proactively avoid obstacles — it relies on post-movement resolution

  player.x = newX;
  player.y = newY;
}

export function updateEnemyMovement(
  enemy: Entity,
  player: Entity,
  dt: number,
  obstacles: Entity[],
): void {
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) return;

  const dirX = dx / dist;
  const dirY = dy / dist;

  switch (enemy.behavior) {
    case 'chase':
      enemy.vx = dirX * enemy.stats.speed;
      enemy.vy = dirY * enemy.stats.speed;
      break;

    case 'swarm':
      // Fast, direct chase
      enemy.vx = dirX * enemy.stats.speed;
      enemy.vy = dirY * enemy.stats.speed;
      break;

    case 'tank':
      // Slow, direct chase
      enemy.vx = dirX * enemy.stats.speed;
      enemy.vy = dirY * enemy.stats.speed;
      break;

    case 'wanderChase':
      // GAP: The spec says "drift randomly, then lock onto player"
      // But doesn't define:
      //   - How long to wander before chasing
      //   - What "drift randomly" means (random direction? random target?)
      //   - What triggers the transition from wander to chase
      // For now: always chase (simplified)
      enemy.vx = dirX * enemy.stats.speed;
      enemy.vy = dirY * enemy.stats.speed;
      break;

    case 'ranged':
      // GAP: The spec says "maintains distance, fires slow projectiles"
      // But doesn't define:
      //   - Preferred distance (300-400px?)
      //   - When to move closer vs retreat
      //   - How to circle/strafe
      // For now: move toward player (simplified)
      enemy.vx = dirX * enemy.stats.speed;
      enemy.vy = dirY * enemy.stats.speed;
      break;

    case 'bossCharge':
      // GAP: Boss movement is complex (charge + minion spawn + ground pound)
      // The spec describes phases but not the actual movement algorithm
      // For now: chase player
      enemy.vx = dirX * enemy.stats.speed;
      enemy.vy = dirY * enemy.stats.speed;
      break;

    default:
      enemy.vx = dirX * enemy.stats.speed;
      enemy.vy = dirY * enemy.stats.speed;
  }

  // Apply velocity
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;

  // Track distance for projectile lifetime
  enemy.distanceTraveled += Math.sqrt(
    (enemy.vx * dt) ** 2 + (enemy.vy * dt) ** 2
  );
}
