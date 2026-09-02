class EntityManager {
  constructor() {
    this.entities = [];
    this.nextId = 1;
    this.pools = {
      enemy: [],
      projectile: [],
      pickup: [],
      orb: [],
      companion: [],
    };
    this.poolLimits = {
      enemy: 200,
      projectile: 500,
      pickup: 500,
      orb: 50,
      companion: 3,
    };
  }

  create(type, data) {
    const entity = {
      ...data,
      id: this.nextId++,
      type,
      active: true,
      x: data.x || 0,
      y: data.y || 0,
      vx: data.vx || 0,
      vy: data.vy || 0,
      hp: data.hp || 0,
      maxHp: data.hp || 0,
      damage: data.damage || 0,
      speed: data.speed || 0,
      size: data.size || 10,
      stats: data.stats || {},
      behavior: data.behavior || null,
      weaponData: data.weaponData || null,
      pickupData: data.pickupData || null,
      visual: data.visual || {},
      iFrames: 0,
      age: 0,
    };
    this.entities.push(entity);
    return entity;
  }

  destroy(entity) {
    entity.active = false;
  }

  clearAll() {
    this.entities = [];
    this.nextId = 1;
  }

  getActive(type) {
    if (type) {
      return this.entities.filter(e => e.active && e.type === type);
    }
    return this.entities.filter(e => e.active);
  }

  getCount(type) {
    return this.entities.filter(e => e.active && e.type === type).length;
  }

  cleanup() {
    // Remove inactive entities (safeguard P6 - separate cleanup phase)
    this.entities = this.entities.filter(e => e.active);
  }

  getPoolCount(type) {
    return this.pools[type] ? this.pools[type].length : 0;
  }
}

// ============================================================
// COMPANION SYSTEM — Foundation
// ============================================================

/**
 * Check if a target is within a cone from a source.
 * @param {Object} source - { x, y, facing } where facing is angle in radians
 * @param {Object} target - { x, y }
 * @param {number} coneAngle - Total cone angle in radians (e.g., PI/3 for 60°)
 * @param {number} coneRange - Max distance in pixels
 * @returns {boolean}
 */
function isInCone(source, target, coneAngle, coneRange) {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > coneRange || dist < 1) return false;
  const angleToTarget = Math.atan2(dy, dx);
  let angleDiff = angleToTarget - source.facing;
  while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
  while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
  return Math.abs(angleDiff) <= coneAngle / 2;
}

/** Distance between two entities */
function distBetween(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Companion data — Dog (Slot 1, paired with W1)
// COMPANION_DATA moved to data/companionData.js (loaded via <script> tag before this one)


// ============================================================
// COMPANION SYSTEM — AI, Movement, Attack
// ============================================================

class SpawnSystem {
  constructor(entityManager, dataManager, eventBus) {
    this.entityManager = entityManager;
    this.dataManager = dataManager;
    this.eventBus = eventBus;
    this.spawnTimer = 0;
    this.gameTime = 0;
    this.currentWave = 0;
    this.bossSpawned = false;
  }

  update(dt) {
    this.gameTime += dt;
    if (this.gameManager) this.gameManager.update(dt);
    
    const stage = this.dataManager.stages;
    const wave = this._getCurrentWave(stage.waves);
    
    if (!wave || !wave.spawnRate || wave.spawnRate <= 0) return;
    
    // Check spawn cap
    const enemyCount = this.entityManager.getCount('enemy') + this.entityManager.getCount('boss');
    if (enemyCount >= wave.maxEnemies) return;
    
    // Spawn rate with accumulator pattern
    this.spawnTimer += dt;
    const spawnInterval = 1 / wave.spawnRate;
    
    while (this.spawnTimer >= spawnInterval) {
      this.spawnTimer -= spawnInterval;
      this._spawnEnemy(wave);
    }
    
    // Boss spawn — read from stage data (default 240s / 4:00)
    const bossTime = this._bossSpawnTime || 240;
    if (!this.bossSpawned && this.gameTime >= bossTime) {
      this._spawnBoss();
      this.bossSpawned = true;
    }
  }

  _getCurrentWave(waves) {
    for (let i = waves.length - 1; i >= 0; i--) {
      const parts = waves[i].time.split('-');
      const start = this._parseTime(parts[0]);
      if (this.gameTime >= start) {
        return waves[i];
      }
    }
    return waves[0];
  }

  _parseTime(str) {
    const [min, sec] = str.split(':').map(Number);
    return min * 60 + sec;
  }

  _spawnEnemy(wave) {
    const enemies = this.dataManager.enemies.filter(e => e.type === 'normal');
    const weights = wave.compositionWeights;
    
    // Weighted random selection
    let totalWeight = 0;
    for (const enemy of enemies) {
      totalWeight += (weights[enemy.id] || 0);
    }
    
    if (totalWeight <= 0) return;
    
    let roll = Math.random() * totalWeight;
    let selected = enemies[0];
    
    for (const enemy of enemies) {
      roll -= (weights[enemy.id] || 0);
      if (roll <= 0) {
        selected = enemy;
        break;
      }
    }
    
    // Spawn at random position around player
    const angle = Math.random() * Math.PI * 2;
    const dist = 400 + Math.random() * 200;
    const player = this.entityManager.getActive('player')[0];
    const px = player ? player.x : 0;
    const py = player ? player.y : 0;
    
    this.entityManager.create('enemy', {
      x: px + Math.cos(angle) * dist,
      y: py + Math.sin(angle) * dist,
      hp: Math.round(selected.stats.hp * (this._tierHpMult || 1.0)),
      damage: Math.round(selected.stats.damage * (this._tierHpMult || 1.0)),
      speed: selected.stats.speed,
      size: selected.stats.size,
      enemyData: selected,
      visual: selected.visual || { shape: 'circle', color: '#555' },
    });
  }

  _spawnBoss() {
    const stage = this.dataManager.stages;
    let boss;
    if (stage?.bossConfig?.enemyId) {
      boss = this.dataManager.enemies.find(e => e.id === stage.bossConfig.enemyId);
    }
    if (!boss) {
      boss = this.dataManager.enemies.find(e => e.type === 'boss');
    }
    if (!boss) return;
    
    const angle = Math.random() * Math.PI * 2;
    const dist = 500;
    const player = this.entityManager.getActive('player')[0];
    const px = player ? player.x : 0;
    const py = player ? player.y : 0;
    
    const entity = this.entityManager.create('enemy', {
      x: px + Math.cos(angle) * dist,
      y: py + Math.sin(angle) * dist,
      hp: boss.stats.hp,
      damage: boss.stats.damage,
      speed: boss.stats.speed,
      size: boss.stats.size,
      enemyData: boss,
      isBoss: true,
      visual: boss.visual || { shape: 'circle', color: '#4A0000' },
    });
    
    this.eventBus.emit('bossSpawn', { boss, entity });
  }



  reset(bossSpawnTime) {
    this.spawnTimer = 0;
    this.gameTime = 0;
    this.currentWave = 0;
    this.bossSpawned = false;
    this._bossSpawnTime = bossSpawnTime || 240;
  }
}

// ============================================================
// PHASE 6: MOVEMENT SYSTEM
// ============================================================

// --- MovementSystem ---
// Handles player pathfinding and enemy movement
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
