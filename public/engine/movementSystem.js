class MovementSystem {
  constructor(entityManager, inputManager) {
    this.entityManager = entityManager;
    this.inputManager = inputManager;
  }

  update(dt) {
    const player = this.entityManager.getActive('player')[0];
    if (!player) return;

    // Player movement
    this._movePlayer(player, dt);
    
    // Enemy movement
    this._moveEnemies(player, dt);
    
    // Projectile movement
    this._moveProjectiles(dt);
    
    // Pickup floating
    this._updatePickups(dt);
  }

  _movePlayer(player, dt) {
    const kb = this.inputManager.getMovement();
    
    if (kb.dx !== 0 || kb.dy !== 0) {
      // WASD movement
      player.x += kb.dx * player.speed * dt;
      player.y += kb.dy * player.speed * dt;
      this.inputManager.clearTarget();
    } else if (this.inputManager.hasTarget) {
      // Click/tap movement
      const dx = this.inputManager.targetX - player.x;
      const dy = this.inputManager.targetY - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 5) {
        const speed = Math.min(player.speed * dt, dist);
        player.x += (dx / dist) * speed;
        player.y += (dy / dist) * speed;
      } else {
        this.inputManager.clearTarget();
      }
    }
  }

  _moveEnemies(player, dt) {
    const enemies = this.entityManager.getActive('enemy');
    
    for (const enemy of enemies) {
      if (enemy.isBoss) {
        this._moveBoss(enemy, player, dt);
        continue;
      }
      
      const behavior = enemy.enemyData?.behavior?.pattern || 'chase';
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (behavior === 'swarm') {
        // Bat: fast with erratic movement
        if (dist > 1) {
          const erraticX = (Math.random() - 0.5) * 60;
          const erraticY = (Math.random() - 0.5) * 60;
          enemy.x += ((dx + erraticX) / dist) * enemy.speed * dt;
          enemy.y += ((dy + erraticY) / dist) * enemy.speed * dt;
        }
      } else if (behavior === 'wander_chase') {
        // Ghost: wander sometimes, chase other times
        if (!enemy._wanderTimer) enemy._wanderTimer = 0;
        if (!enemy._isChasing) enemy._isChasing = false;
        enemy._wanderTimer -= dt;
        if (enemy._wanderTimer <= 0) {
          enemy._isChasing = !enemy._isChasing;
          enemy._wanderTimer = enemy._isChasing ? 4 : 2;
        }
        if (enemy._isChasing && dist > 1) {
          enemy.x += (dx / dist) * enemy.speed * dt;
          enemy.y += (dy / dist) * enemy.speed * dt;
        } else {
          // Wander
          if (!enemy._wanderDx) {
            enemy._wanderDx = (Math.random() - 0.5) * 2;
            enemy._wanderDy = (Math.random() - 0.5) * 2;
          }
          enemy.x += enemy._wanderDx * enemy.speed * 0.5 * dt;
          enemy.y += enemy._wanderDy * enemy.speed * 0.5 * dt;
        }
      } else if (behavior === 'ranged') {
        // Caster: maintain distance
        const preferredDist = 150;
        if (dist < preferredDist - 30 && dist > 1) {
          // Too close, back away
          enemy.x -= (dx / dist) * enemy.speed * dt;
          enemy.y -= (dy / dist) * enemy.speed * dt;
        } else if (dist > preferredDist + 30 && dist > 1) {
          // Too far, approach
          enemy.x += (dx / dist) * enemy.speed * dt;
          enemy.y += (dy / dist) * enemy.speed * dt;
        }
        // Stand still if in range (ranged attackers don't chase)
      } else {
        // Default chase (zombie, skeleton)
        if (dist > 1) {
          enemy.x += (dx / dist) * enemy.speed * dt;
          enemy.y += (dy / dist) * enemy.speed * dt;
        } else {
          enemy.x -= dt * 10;
        }
      }
    }
  }

  _moveBoss(boss, player, dt) {
    // Boss charge behavior
    if (!boss._bossState) {
      boss._bossState = 'chase';
      boss._stateTimer = 3;
      boss._chargeDir = { x: 0, y: 0 };
    }
    
    boss._stateTimer -= dt;
    const dx = player.x - boss.x;
    const dy = player.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (boss._bossState === 'chase') {
      // Move toward player
      if (dist > 1) {
        boss.x += (dx / dist) * boss.speed * dt;
        boss.y += (dy / dist) * boss.speed * dt;
      }
      if (boss._stateTimer <= 0) {
        // Start charge windup
        boss._bossState = 'windup';
        boss._stateTimer = 1.2;
        if (dist > 1) {
          boss._chargeDir = { x: dx / dist, y: dy / dist };
        }
        // Spawn telegraph for charge warning zone
        if (this.telegraphSystem) {
          boss._activeTelegraph = this.telegraphSystem.spawn({
            shapeType: 'rectangle',
            source: 'boss_charge',
            sourceEntity: boss,
            x: boss.x,
            y: boss.y,
            width: boss.size * 4,
            height: 600,
            angle: Math.atan2(boss._chargeDir.y, boss._chargeDir.x),
            windupDuration: 1.2,
            resolveDamage: false,
            visual: {
              fillColor: 'rgba(255, 145, 0, 0.25)',
              strokeColor: 'rgba(255, 145, 0, 0.55)',
              strokeWidth: 2,
              flickerRate: 6,
              chevrons: true,
              chevronCount: 5,
            },
            windupSound: 'boss_charge_warn',
          });
        }

      }
    } else if (boss._bossState === 'windup') {
      // Freeze boss — telegraph is the truth
      // Lock chargeDir to telegraph's final direction at windup end
      if (boss._stateTimer <= 0) {
        if (boss._activeTelegraph) {
          const ta = boss._activeTelegraph.angle;
          boss._chargeDir = { x: Math.cos(ta), y: Math.sin(ta) };
          boss._activeTelegraph = null;
        }
        boss._bossState = 'charge';
        boss._stateTimer = 1.5;
      }
    } else if (boss._bossState === 'charge') {
      // Rush toward player's position at high speed
      boss.x += boss._chargeDir.x * boss.speed * 3 * dt;
      boss.y += boss._chargeDir.y * boss.speed * 3 * dt;
      if (boss._stateTimer <= 0) {
        boss._bossState = 'pause';
        boss._stateTimer = 1.0;
      }
    } else if (boss._bossState === 'pause') {
      // Pause after charge
      if (boss._stateTimer <= 0) {
        boss._bossState = 'chase';
        boss._stateTimer = 3;
      }
    }
  }

  _moveProjectiles(dt) {
    const projectiles = this.entityManager.getActive('projectile');
    
    for (const proj of projectiles) {
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.age = (proj.age || 0) + dt;
      proj.distanceTraveled = (proj.distanceTraveled || 0) + Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy) * dt;
      
      // Despawn after 3 seconds or 600px traveled
      if (proj.age > 3 || proj.distanceTraveled > 600) {
        this.entityManager.destroy(proj);
      }
    }
  }

  _updatePickups(dt) {
    const pickups = this.entityManager.getActive('pickup');
    for (const pickup of pickups) {
      pickup.age = (pickup.age || 0) + dt;
      // Float animation
      pickup.floatOffset = Math.sin(pickup.age * 3) * 2;
    }
  }
}

// ============================================================
// PHASE 7: COLLISION SYSTEM
// ============================================================

// --- CollisionSystem ---
// AABB collision detection
