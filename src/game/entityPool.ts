// From 01_engine_architecture.md Section 2 — Entity Pools

import type { Entity, EntityType, Hitbox, VisualDef, EntityStats, BehaviorType } from './types';

const DEFAULT_STATS: EntityStats = {
  maxHp: 1, hp: 1, damage: 0, speed: 0, armor: 0,
  critChance: 0, critMultiplier: 1.5,
  xpValue: 0, goldValue: 0, goldMin: 0, goldMax: 0,
};

function createInactiveEntity(): Entity {
  return {
    id: 0,
    type: 'enemy',
    x: 0, y: 0, vx: 0, vy: 0,
    hitbox: { shape: 'circle', radius: 10 },
    collisionLayer: 0,
    isStatic: false,
    stats: { ...DEFAULT_STATS },
    behavior: 'chase',
    visual: { shape: 'square', color: '#fff', size: 10 },
    active: false,
    age: 0,
    ttl: null,
    distanceTraveled: 0,
  };
}

export class EntityPool {
  private pool: Entity[] = [];
  private nextId = 1;
  private growthStep: number;

  constructor(
    private maxSize: number,
    initialSize: number,
    growthStep: number = 25,
  ) {
    this.growthStep = growthStep;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(createInactiveEntity());
    }
  }

  acquire(): Entity | null {
    for (const entity of this.pool) {
      if (!entity.active) {
        entity.active = true;
        entity.id = this.nextId++;
        entity.age = 0;
        entity.ttl = null;
        entity.distanceTraveled = 0;
        return entity;
      }
    }
    // Pool exhausted — grow if under max
    if (this.pool.length < this.maxSize) {
      const toAdd = Math.min(this.growthStep, this.maxSize - this.pool.length);
      for (let i = 0; i < toAdd; i++) {
        this.pool.push(createInactiveEntity());
      }
      return this.acquire(); // Recursive, guaranteed to find one
    }
    return null; // Pool at max, no entities available
  }

  release(entity: Entity): void {
    entity.active = false;
    entity.age = 0;
    entity.ttl = null;
    entity.distanceTraveled = 0;
    entity.vx = 0;
    entity.vy = 0;
    entity.movingToTarget = false;
  }

  forEach(fn: (entity: Entity) => void): void {
    for (const entity of this.pool) {
      if (entity.active) fn(entity);
    }
  }

  count(): number {
    return this.pool.filter(e => e.active).length;
  }

  getActive(): Entity[] {
    return this.pool.filter(e => e.active);
  }
}
