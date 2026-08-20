// From 01_engine_architecture.md Section 8 — Damage System

import type { Entity } from './types';
import { EventBus } from './eventBus';

export function applyDamage(
  attacker: Entity,
  defender: Entity,
  eventBus: EventBus,
): void {
  // Check invincibility frames
  if (defender.stats.armor !== undefined && defender.age > 0) {
    // i-frames check: if defender has been damaged recently
    // The spec says "if defender.stats.iFrames > 0" but iFrames isn't on EntityStats
    // GAP: iFrames timer is not defined in the Entity interface
    // Need to add: defender.iFrames?: number to Entity
    // For now, we skip the i-frame check — this is a spec gap
  }

  const baseDamage = attacker.stats.damage;
  const isCrit = Math.random() < attacker.stats.critChance;
  const rawDamage = isCrit ? baseDamage * attacker.stats.critMultiplier : baseDamage;
  const finalDamage = Math.max(1, rawDamage - defender.stats.armor);

  defender.stats.hp -= finalDamage;

  // Knockback
  const dx = defender.x - attacker.x;
  const dy = defender.y - attacker.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) {
    const knockbackForce = finalDamage * 2;
    defender.vx += (dx / len) * knockbackForce;
    defender.vy += (dy / len) * knockbackForce;
  }

  // Emit damage event
  eventBus.emit('damage', {
    attacker,
    defender,
    damage: finalDamage,
    isCrit,
    isPlayerDamage: defender.type === 'player',
  });

  // Check death
  if (defender.stats.hp <= 0) {
    eventBus.emit('death', {
      entity: defender,
      killer: attacker,
      position: { x: defender.x, y: defender.y },
    });
  }
}
