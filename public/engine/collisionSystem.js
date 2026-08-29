class CollisionSystem {
  constructor(entityManager, eventBus) {
    this.entityManager = entityManager;
    this.eventBus = eventBus;
  }

  update() {
    const player = this.entityManager.getActive('player')[0];
    if (!player) return;

    const enemies = this.entityManager.getActive('enemy');
    const projectiles = this.entityManager.getActive('projectile');
    const pickups = this.entityManager.getActive('pickup');

    // Player vs Enemy (contact damage)
    for (const enemy of enemies) {
      if (this._checkAABB(player, enemy)) {
        this.eventBus.emit('contactDamage', { target: player, source: enemy, damage: enemy.damage });
      }
    }

    // Projectile vs Enemy
    for (const proj of projectiles) {
      for (const enemy of enemies) {
        if (this._checkAABB(proj, enemy)) {
          this.eventBus.emit('projectileHit', { projectile: proj, target: enemy, damage: proj.damage });
          this.entityManager.destroy(proj);
          break;
        }
      }
    }

    // Orb vs Enemy
    const orbs = this.entityManager.getActive('orb');
    for (const orb of orbs) {
      for (const enemy of enemies) {
        if (this._checkAABB(orb, enemy)) {
          // Check damage cooldown per enemy for this orb
          if (!orb._hitEnemies) orb._hitEnemies = {};
          const hitKey = enemy.id;
          if (!orb._hitEnemies[hitKey] || orb._hitEnemies[hitKey] <= 0) {
            this.eventBus.emit('projectileHit', { projectile: orb, target: enemy, damage: orb.damage });
            orb._hitEnemies[hitKey] = 0.5; // 0.5s cooldown per enemy
          }
        }
      }
      // Decay hit cooldowns
      if (orb._hitEnemies) {
        for (const key in orb._hitEnemies) {
          orb._hitEnemies[key] = Math.max(0, orb._hitEnemies[key] - 1/60);
        }
      }
    }

    // Player vs Pickup (proximity collection)
    const collectRange = (player.stats.pickupRange || 50);
    for (const pickup of pickups) {
      const dx = pickup.x - player.x;
      const dy = pickup.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < collectRange) {
        this.eventBus.emit('pickup', { player, pickup });
        this.entityManager.destroy(pickup);
      }
    }
  }

  _checkAABB(a, b) {
    return a.x - a.size < b.x + b.size &&
           a.x + a.size > b.x - b.size &&
           a.y - a.size < b.y + b.size &&
           a.y + a.size > b.y - b.size;
  }
}

// ============================================================
// PHASE 8: WEAPON SYSTEM
// ============================================================

// --- WeaponSystem ---
// Handles weapon cooldowns, targeting, and firing
