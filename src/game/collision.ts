// From 01_engine_architecture.md Section 4 — Collision System

import type { Entity } from './types';
import { COLLISION } from './types';

// AABB overlap check
function aabbOverlap(a: Entity, b: Entity): boolean {
  const aHalfW = a.hitbox.shape === 'circle' ? a.hitbox.radius! : a.hitbox.width! / 2;
  const aHalfH = a.hitbox.shape === 'circle' ? a.hitbox.radius! : a.hitbox.height! / 2;
  const bHalfW = b.hitbox.shape === 'circle' ? b.hitbox.radius! : b.hitbox.width! / 2;
  const bHalfH = b.hitbox.shape === 'circle' ? b.hitbox.radius! : b.hitbox.height! / 2;

  return (
    a.x - aHalfW < b.x + bHalfW &&
    a.x + aHalfW > b.x - bHalfW &&
    a.y - aHalfH < b.y + bHalfH &&
    a.y + aHalfH > b.y - bHalfH
  );
}

// Which collision pairs are valid
// From spec Section 4: Enemy↔Player, Projectile↔Enemy, Player↔Pickup, Player↔Obstacle, Enemy↔Obstacle
const VALID_PAIRS: [number, number][] = [
  [COLLISION.ENEMY | COLLISION.PLAYER, COLLISION.ENEMY | COLLISION.PLAYER],
  [COLLISION.PROJECTILE | COLLISION.ENEMY, COLLISION.PROJECTILE | COLLISION.ENEMY],
  [COLLISION.PLAYER | COLLISION.PICKUP, COLLISION.PLAYER | COLLISION.PICKUP],
  [COLLISION.PLAYER | COLLISION.OBSTACLE, COLLISION.PLAYER | COLLISION.OBSTACLE],
  [COLLISION.ENEMY | COLLISION.OBSTACLE, COLLISION.ENEMY | COLLISION.OBSTACLE],
];

function canCollide(a: Entity, b: Entity): boolean {
  const combined = a.collisionLayer | b.collisionLayer;
  for (const [mask] of VALID_PAIRS) {
    if ((combined & mask) === mask) return true;
  }
  return false;
}

// Collision response — push entity out of obstacle
export function resolveObstacleCollision(entity: Entity, obstacle: Entity): void {
  // Calculate overlap
  const eHalfW = entity.hitbox.shape === 'circle' ? entity.hitbox.radius! : entity.hitbox.width! / 2;
  const eHalfH = entity.hitbox.shape === 'circle' ? entity.hitbox.radius! : entity.hitbox.height! / 2;

  // Obstacles are AABB
  const oHalfW = obstacle.hitbox.width! / 2;
  const oHalfH = obstacle.hitbox.height! / 2;

  const overlapX = (eHalfW + oHalfW) - Math.abs(entity.x - obstacle.x);
  const overlapY = (eHalfH + oHalfH) - Math.abs(entity.y - obstacle.y);

  if (overlapX <= 0 || overlapY <= 0) return; // No collision

  // Push out along axis of least penetration
  if (overlapX < overlapY) {
    entity.x += entity.x < obstacle.x ? -overlapX : overlapX;
    entity.vx = 0;
  } else {
    entity.y += entity.y < obstacle.y ? -overlapY : overlapY;
    entity.vy = 0;
  }
}

export interface CollisionResult {
  type: 'damage' | 'pickup' | 'obstacle';
  a: Entity;
  b: Entity;
}

export function checkCollisions(
  entities: Entity[],
  obstacles: Entity[],
): CollisionResult[] {
  const results: CollisionResult[] = [];

  // Check each active entity against all others (brute force per spec recommendation)
  for (let i = 0; i < entities.length; i++) {
    const a = entities[i];
    if (!a.active) continue;

    // Check against other entities
    for (let j = i + 1; j < entities.length; j++) {
      const b = entities[j];
      if (!b.active) continue;
      if (!canCollide(a, b)) continue;
      if (!aabbOverlap(a, b)) continue;

      // Determine collision type
      if (a.collisionLayer & COLLISION.OBSTACLE || b.collisionLayer & COLLISION.OBSTACLE) {
        // Obstacle collision — resolve immediately
        const entity = a.collisionLayer & COLLISION.OBSTACLE ? b : a;
        const obstacle = a.collisionLayer & COLLISION.OBSTACLE ? a : b;
        resolveObstacleCollision(entity, obstacle);
      } else if (
        (a.collisionLayer & COLLISION.ENEMY && b.collisionLayer & COLLISION.PLAYER) ||
        (a.collisionLayer & COLLISION.PLAYER && b.collisionLayer & COLLISION.ENEMY)
      ) {
        results.push({ type: 'damage', a, b });
      } else if (
        (a.collisionLayer & COLLISION.PROJECTILE && b.collisionLayer & COLLISION.ENEMY) ||
        (a.collisionLayer & COLLISION.ENEMY && b.collisionLayer & COLLISION.PROJECTILE)
      ) {
        results.push({ type: 'damage', a, b });
      } else if (
        (a.collisionLayer & COLLISION.PLAYER && b.collisionLayer & COLLISION.PICKUP) ||
        (a.collisionLayer & COLLISION.PICKUP && b.collisionLayer & COLLISION.PLAYER)
      ) {
        results.push({ type: 'pickup', a, b });
      }
    }

    // Check against obstacles (separate pass for clarity)
    for (const obstacle of obstacles) {
      if (!obstacle.active) continue;
      if (!(obstacle.collisionLayer & COLLISION.OBSTACLE)) continue;
      if (!canCollide(a, obstacle)) continue;
      if (!aabbOverlap(a, obstacle)) continue;
      resolveObstacleCollision(a, obstacle);
    }
  }

  return results;
}
