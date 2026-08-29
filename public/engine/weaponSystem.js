class WeaponSystem {
  constructor(entityManager, dataManager, eventBus) {
    this.entityManager = entityManager;
    this.dataManager = dataManager;
    this.eventBus = eventBus;
    this.weaponLevels = {};
    this.cooldowns = {};
  }

  init(player) {
    // Do NOT hardcode any weapons here. Weapon initialization is handled by
    // Game.startGame() calling unlockWeapon() for each weapon in _activeWeapons.
    // This method is only used for player-reference setup if needed.
  }

  update(dt) {
    const player = this.entityManager.getActive('player')[0];
    if (!player) return;

    // Update cooldowns
    for (const weaponId in this.cooldowns) {
      this.cooldowns[weaponId] = Math.max(0, this.cooldowns[weaponId] - dt);
    }

    // Fire weapons
    this._fireW1(player, dt);
    this._fireW2(player, dt);
    this._fireW3(player, dt);
    this._fireW4(player, dt);
    this._fireW5(player, dt);
    this._fireW6(player, dt);
    this._fireW7(player, dt);
    this._fireW8(player, dt);
    this._updateW3Pulses(dt);
    this._updateW5Chains(dt);
    this._updateW7Combos(dt);
    this._updateW8Explosions(dt);
  }

  _fireW1(player, dt) {
    const level = this.weaponLevels['w1_projectile'];
    if (!level) return;

    if (this.cooldowns['w1_projectile'] > 0) return;

    const weapon = this.dataManager.weapons[0];
    const stats = weapon.statsPerLevel[level - 1];
    this.cooldowns['w1_projectile'] = stats.cooldown;

    // Find nearest enemy
    const enemies = this.entityManager.getActive('enemy');
    if (enemies.length === 0) return;

    let nearest = null;
    let minDist = Infinity;
    for (const enemy of enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) {
        minDist = dist;
        nearest = enemy;
      }
    }

    if (!nearest) return;

    // Fire projectile
    const dx = nearest.x - player.x;
    const dy = nearest.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;  // Guard: enemy on top of player
    const speed = 400;

    const finalDamage = Math.floor(stats.damage * (player.damageMultiplier || 1));
    const projCount = stats.projectileCount || 1;
    const baseAngle = Math.atan2(dy, dx);
    const spreadAngle = 0.25;
    for (let i = 0; i < projCount; i++) {
      const angle = projCount === 1 ? baseAngle : baseAngle + (i - (projCount - 1) / 2) * spreadAngle;
      this.entityManager.create('projectile', {
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: finalDamage,
        size: 4,
        visual: { shape: 'square', color: '#FFD700' },
      });
    }
    // GAP 1 FIX: Emit weaponFire so AudioManager can play w1_fire
    this.eventBus.emit('weaponFire', { weaponId: 'w1_projectile' });
  }

  _fireW2(player, dt) {
    const level = this.weaponLevels['w2_orbit'];
    if (!level) return;

    const weapon = this.dataManager.weapons[1];
    const stats = weapon.statsPerLevel[level - 1];
    const orbCount = stats.orbitCount;

    // Maintain orbs
    const existingOrbs = this.entityManager.getActive('orb').filter(o => o.ownerId === player.id);
    
    // Remove excess orbs
    while (existingOrbs.length > orbCount) {
      this.entityManager.destroy(existingOrbs.pop());
    }

    // Create missing orbs
    while (existingOrbs.length < orbCount) {
      const orbDmg = Math.floor(stats.damage * (player.damageMultiplier || 1));
      const orb = this.entityManager.create('orb', {
        ownerId: player.id,
        x: player.x,
        y: player.y,
        damage: orbDmg,
        size: 6,
        orbitAngle: (existingOrbs.length / orbCount) * Math.PI * 2,
        orbitRadius: stats.orbitRadius,
        orbitSpeed: stats.orbitSpeed,
        visual: { shape: 'circle', color: '#4FC3F7' },
      });
      existingOrbs.push(orb);
    }

    // Update orb positions
    for (const orb of existingOrbs) {
      orb.orbitAngle += dt * (Math.PI * 2 / orb.orbitSpeed);
      orb.x = player.x + Math.cos(orb.orbitAngle) * orb.orbitRadius;
      orb.y = player.y + Math.sin(orb.orbitAngle) * orb.orbitRadius;
    }
  }

  _fireW3(player, dt) {
    const level = this.weaponLevels['weapon_area_pulse'];
    if (!level) return;
    // W3 is active — this line only prints once per fire cycle after cooldown

    this.cooldowns['weapon_area_pulse'] = (this.cooldowns['weapon_area_pulse'] || 0) - dt;
    if (this.cooldowns['weapon_area_pulse'] > 0) return;

    const weapon = this.dataManager.weapons[2];
    if (!weapon || !weapon.statsPerLevel) {
      console.error('[W3] Weapon data missing!', weapon);
      return;
    }
    const stats = weapon.statsPerLevel[level - 1];
    if (!stats) {
      console.error('[W3] Stats missing for level', level);
      return;
    }
    this.cooldowns['weapon_area_pulse'] = stats.cooldown;

    // Emit area pulse event(s) — queue-based (respects pause/game over)
    const pulseDmg = Math.floor(stats.damage * (player.damageMultiplier || 1));
    const pulseCount = stats.pulseCount || 1;
    for (let i = 0; i < pulseCount; i++) {
      this._w3PulseQueue.push({ delay: i * 0.25, elapsed: 0, dmg: pulseDmg, radius: stats.pulseRadius, pulseCount, fired: false });
    }
  }

  _updateW3Pulses(dt) {
    if (!this._w3PulseQueue || this._w3PulseQueue.length === 0) return;
    const player = this.entityManager.getActive('player')[0];
    for (let i = this._w3PulseQueue.length - 1; i >= 0; i--) {
      const q = this._w3PulseQueue[i];
      q.elapsed += dt;
      if (q.elapsed >= q.delay && !q.fired) {
        q.fired = true;
        if (player) {
          this.eventBus.emit('areaPulse', {
            x: player.x, y: player.y,
            damage: q.dmg, radius: q.radius,
            pulseCount: q.pulseCount,
          });
        }
      }
      if (q.fired) this._w3PulseQueue.splice(i, 1);
    }
  }

  _fireW4(player, dt) {
    // W4: Flame Wave — short-range cone attack (frontloaded weapon)
    const level = this.weaponLevels['w4_flame_wave'];
    if (!level) return;

    this.cooldowns['w4_flame_wave'] = (this.cooldowns['w4_flame_wave'] || 0) - dt;
    if (this.cooldowns['w4_flame_wave'] > 0) return;

    const weapon = this.dataManager.weapons.find(w => w.id === 'w4_flame_wave');
    if (!weapon) return;
    const stats = weapon.statsPerLevel[level - 1];
    if (!stats) return;
    this.cooldowns['w4_flame_wave'] = stats.cooldown;

    // Find nearest enemy for direction
    const enemies = this.entityManager.getActive('enemy');
    if (enemies.length === 0) return;

    let nearest = null;
    let minDist = Infinity;
    for (const enemy of enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) { minDist = dist; nearest = enemy; }
    }
    if (!nearest) return;

    const angle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    const coneAngle = (stats.coneAngle || 60) * Math.PI / 180;
    const range = stats.coneRange || 60;
    const damage = Math.floor(stats.damage * (player.damageMultiplier || 1));

    // Damage all enemies in cone
    for (const enemy of enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > range) continue;

      const enemyAngle = Math.atan2(dy, dx);
      let angleDiff = enemyAngle - angle;
      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      if (Math.abs(angleDiff) <= coneAngle / 2) {
        this.eventBus.emit('damageEntity', { entity: enemy, damage, source: player });

        // L4+ Burn effect
        if (level >= 4 && weapon.powerSpikes?.level4) {
          const burnDmg = weapon.powerSpikes.level4.statModifiers.burnDamage || 5;
          const burnDur = weapon.powerSpikes.level4.statModifiers.burnDuration || 3;
          enemy.burnTimer = burnDur;
          enemy.burnDamage = burnDmg;
        }
      }
    }

    // Emit visual effect and weapon fire
    this.eventBus.emit('weaponFire', { weaponId: 'w4_flame_wave' });
    this.eventBus.emit('coneAttack', {
      x: player.x, y: player.y, angle, range, coneAngle,
      damage, color: '#FF4500', level,
    });
  }

  _fireW5(player, dt) {
    // W5: Arcane Bolt — slow bolt that chains on kill (scaling weapon)
    const level = this.weaponLevels['w5_arcane_bolt'];
    if (!level) return;

    this.cooldowns['w5_arcane_bolt'] = (this.cooldowns['w5_arcane_bolt'] || 0) - dt;
    if (this.cooldowns['w5_arcane_bolt'] > 0) return;

    const weapon = this.dataManager.weapons.find(w => w.id === 'w5_arcane_bolt');
    if (!weapon) return;
    const stats = weapon.statsPerLevel[level - 1];
    if (!stats) return;
    this.cooldowns['w5_arcane_bolt'] = stats.cooldown;

    // Find nearest enemy
    const enemies = this.entityManager.getActive('enemy');
    if (enemies.length === 0) return;

    let nearest = null;
    let minDist = Infinity;
    for (const enemy of enemies) {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist) { minDist = dist; nearest = enemy; }
    }
    if (!nearest) return;

    const damage = Math.floor(stats.damage * (player.damageMultiplier || 1));
    const chainCount = stats.chainCount || 0;
    const chainRange = stats.chainRange || 80;

    // Fire bolt at nearest enemy
    const dx = nearest.x - player.x;
    const dy = nearest.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;

    const speed = 300;
    const angle = Math.atan2(dy, dx);

    // Spawn projectile with chain data
    const proj = this.entityManager.create('projectile', {
      x: player.x, y: player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage, size: 6,
      color: '#9C27B0',
      piercing: false,
      chainCount, chainRange,
      slowAmount: weapon.powerSpikes?.level7?.statModifiers?.slowAmount || 0,
      slowDuration: weapon.powerSpikes?.level7?.statModifiers?.slowDuration || 0,
      age: 0, sourceWeapon: 'w5_arcane_bolt',
    });

    // Visual effect
    this.eventBus.emit('arcaneShot', {
      x: player.x, y: player.y, angle, damage, color: '#9C27B0',
    });
  }

  // Handle chain reaction when W5 bolt kills an enemy
  _handleW5Chain(killer, victim) {
    if (!killer?.sourceWeapon || killer.sourceWeapon !== 'w5_arcane_bolt') return;
    if (killer.chainCount <= 0) return;

    const enemies = this.entityManager.getActive('enemy');
    const chainRange = killer.chainRange || 80;
    let nearest = null;
    let minDist = Infinity;

    for (const enemy of enemies) {
      if (enemy === victim || !enemy.active) continue;
      const dx = enemy.x - victim.x;
      const dy = enemy.y - victim.y;
      const dist = dx * dx + dy * dy;
      if (dist < minDist && dist < chainRange * chainRange) {
        minDist = dist;
        nearest = enemy;
      }
    }

    if (nearest) {
      // Chain to next enemy with reduced damage
      const chainDamage = Math.floor(killer.damage * 0.7);
      this.eventBus.emit('damageEntity', {
        entity: nearest, damage: chainDamage, source: killer.sourceEntity || null,
      });

      // Spawn chain visual
      this.eventBus.emit('chainLightning', {
        x1: victim.x, y1: victim.y,
        x2: nearest.x, y2: nearest.y,
        color: '#9C27B0',
      });

      // Continue chain with reduced count (frame-based, not setTimeout)
      killer.chainCount--;
      killer.x = nearest.x;
      killer.y = nearest.y;
      if (killer.chainCount > 0 && nearest.hp <= 0) {
        if (!this._w5ChainQueue) this._w5ChainQueue = [];
        this._w5ChainQueue.push({ killer: {...killer}, victim: nearest, timer: 0.05 });
      }
    }
  }

  // Called from update() to process pending W5 chain reactions
  _updateW5Chains(dt) {
    if (!this._w5ChainQueue) return;
    for (let i = this._w5ChainQueue.length - 1; i >= 0; i--) {
      const q = this._w5ChainQueue[i];
      q.timer -= dt;
      if (q.timer <= 0) {
        this._w5ChainQueue.splice(i, 1);
        if (q.victim && q.victim.active && q.victim.hp <= 0) {
          this._handleW5Chain(q.killer, q.victim);
        }
      }
    }
  }

  // === W6: Shadow Dagger (melee cone) ===
  _fireW6(player, dt) {
    const id = 'w6_dagger';
    const level = this.weaponLevels[id] || 0;
    if (level <= 0) return;
    this.cooldowns[id] = (this.cooldowns[id] || 0) - dt;
    if (this.cooldowns[id] > 0) return;
    const stats = this._getWeaponStats(id, level);
    if (!stats) return;
    this.cooldowns[id] = stats.cooldown;

    const hitCount = stats.hitCount || 1;
    const range = stats.range || 50;
    const coneWidth = stats.coneWidth || 30;
    const damage = stats.damage;
    const enemies = this.entityManager.getActive('enemy');

    // Find player facing direction (toward nearest enemy or movement direction)
    let facingAngle = 0;
    if (enemies.length > 0) {
      let nearest = null, minDist = Infinity;
      for (const e of enemies) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < minDist) { minDist = d; nearest = e; }
      }
      if (nearest) facingAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    }

    // Hit enemies in cone
    const hitEnemies = [];
    for (const e of enemies) {
      const dx = e.x - player.x, dy = e.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > range + e.size) continue;
      const angle = Math.atan2(dy, dx);
      let diff = angle - facingAngle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      if (Math.abs(diff) < coneWidth * Math.PI / 180) {
        hitEnemies.push(e);
      }
    }

    // Apply damage (homming at Lv7)
    if (stats.homing && hitCount > 1) {
      // Homming daggers: create projectile entities that seek enemies
      for (let i = 0; i < hitCount; i++) {
        const spreadAngle = facingAngle + (i - Math.floor(hitCount / 2)) * 0.2;
        this.entityManager.create('projectile', {
          x: player.x, y: player.y,
          vx: Math.cos(spreadAngle) * 300,
          vy: Math.sin(spreadAngle) * 300,
          damage: damage,
          size: 4,
          age: 0,
          maxAge: 1.0,
          pierceCount: 0,
          color: '#9B59B6',
          shape: 'triangle',
          homing: true,
          homingTurnRate: stats.homingTurnRate || 200,
          damageOwner: true,
        });
      }
      this.eventBus.emit('weaponFire', { weaponId: id });
    } else {
      // Standard cone hits
      const hitsToApply = Math.min(hitCount, hitEnemies.length || 1);
      for (let i = 0; i < hitsToApply; i++) {
        for (const e of hitEnemies) {
          this.eventBus.emit('damageEntity', { entity: e, damage, source: player });
        }
      }
      this.eventBus.emit('weaponFire', { weaponId: id });
    }
  }

  // === W7: Soul Whip (melee combo) ===
  _fireW7(player, dt) {
    const id = 'w7_sword';
    const level = this.weaponLevels[id] || 0;
    if (level <= 0) return;
    this.cooldowns[id] = (this.cooldowns[id] || 0) - dt;
    if (this.cooldowns[id] > 0) return;
    const stats = this._getWeaponStats(id, level);
    if (!stats) return;
    this.cooldowns[id] = stats.cooldown;

    const range = stats.range || 140;
    const arcWidth = stats.arcWidth || 80;
    const damage = stats.damage;

    // Triple-hit combo: front, back, both sides — use queue instead of setTimeout
    // to avoid stale closures when game pauses (level-up, game over)
    if (!this._w7ComboQueue) this._w7ComboQueue = [];
    this._w7ComboQueue.push({
      combos: [
        { angleOffset: 0 },
        { angleOffset: Math.PI },
        { angleOffset: null },
      ],
      nextHit: 0,
      range, arcWidth, damage,
      playerRef: player,
    });
    // Process first hit immediately
    this._processW7Combo();
  }

  _processW7Combo() {
    if (!this._w7ComboQueue || this._w7ComboQueue.length === 0) return;
    const combo = this._w7ComboQueue[0];
    if (!combo || !combo.playerRef || !combo.playerRef.active) {
      this._w7ComboQueue.shift();
      return;
    }
    if (combo.nextHit >= combo.combos.length) {
      this._w7ComboQueue.shift();
      this._processW7Combo();
      return;
    }
    const hit = combo.combos[combo.nextHit];
    const enemies = this.entityManager.getActive('enemy');
    const player = combo.playerRef;
    for (const e of enemies) {
      if (!e.active) continue;
      const dx = e.x - player.x, dy = e.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > combo.range + e.size) continue;
      if (hit.angleOffset === null) {
        this.eventBus.emit('damageEntity', { entity: e, damage: combo.damage, source: player });
      } else {
        const angle = Math.atan2(dy, dx);
        let diff = angle - hit.angleOffset;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        if (Math.abs(diff) < (combo.arcWidth / 2) * Math.PI / 180) {
          this.eventBus.emit('damageEntity', { entity: e, damage: combo.damage, source: player });
        }
      }
    }
    if (combo.nextHit === 0) this.eventBus.emit('weaponFire', { weaponId: 'w7_sword' });
    combo.nextHit++;
    if (combo.nextHit < combo.combos.length) {
      // Schedule next hit via game update (checked in update loop)
      combo._nextHitTime = (combo._nextHitTime || 0) + 0.25;
    }
  }

  // Called from update() to process pending W7 combo hits
  _updateW7Combos(dt) {
    if (!this._w7ComboQueue) return;
    for (let i = this._w7ComboQueue.length - 1; i >= 0; i--) {
      const combo = this._w7ComboQueue[i];
      if (!combo || !combo.playerRef || !combo.playerRef.active) {
        this._w7ComboQueue.splice(i, 1);
        continue;
      }
      if (combo._nextHitTime !== undefined) {
        combo._nextHitTime -= dt;
        if (combo._nextHitTime <= 0) {
          combo._nextHitTime = undefined;
          this._processW7Combo();
        }
      }
    }
  }

  // === W8: Grave Claymore (melee slam) ===
  _fireW8(player, dt) {
    const id = 'w8_claymore';
    const level = this.weaponLevels[id] || 0;
    if (level <= 0) return;
    this.cooldowns[id] = (this.cooldowns[id] || 0) - dt;
    if (this.cooldowns[id] > 0) return;
    const stats = this._getWeaponStats(id, level);
    if (!stats) return;
    this.cooldowns[id] = stats.cooldown;

    const range = stats.range || 100;
    const aoeWidth = stats.aoeWidth || 120;
    const damage = stats.damage;
    const enemies = this.entityManager.getActive('enemy');

    // Find nearest enemy direction
    let facingAngle = 0;
    if (enemies.length > 0) {
      let nearest = null, minDist = Infinity;
      for (const e of enemies) {
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < minDist) { minDist = d; nearest = e; }
      }
      if (nearest) facingAngle = Math.atan2(nearest.y - player.y, nearest.x - player.x);
    }

    // Hit enemies in rectangular area in front
    const hitEnemies = [];
    for (const e of enemies) {
      const dx = e.x - player.x, dy = e.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > range + e.size) continue;
      const angle = Math.atan2(dy, dx);
      let diff = angle - facingAngle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      if (Math.abs(diff) < (aoeWidth / 2) * Math.PI / 180) {
        hitEnemies.push(e);
      }
    }

    // Apply main damage
    for (const e of hitEnemies) {
      this.eventBus.emit('damageEntity', { entity: e, damage, source: player });
    }
    this.eventBus.emit('weaponFire', { weaponId: id });

    // Explosion at Lv4+ — use queue instead of setTimeout
    if (stats.explosionDmgPct && hitEnemies.length > 0) {
      if (!this._w8ExplosionQueue) this._w8ExplosionQueue = [];
      this._w8ExplosionQueue.push({
        damage: Math.round(damage * stats.explosionDmgPct),
        radius: stats.explosionRadius || 100,
        cx: player.x + Math.cos(facingAngle) * (range * 0.7),
        cy: player.y + Math.sin(facingAngle) * (range * 0.7),
        timer: 0.2,
        playerRef: player,
      });
    }
  }

  _updateW8Explosions(dt) {
    if (!this._w8ExplosionQueue) return;
    for (let i = this._w8ExplosionQueue.length - 1; i >= 0; i--) {
      const exp = this._w8ExplosionQueue[i];
      exp.timer -= dt;
      if (exp.timer <= 0) {
        if (exp.playerRef && exp.playerRef.active) {
          const enemies = this.entityManager.getActive('enemy');
          for (const e of enemies) {
            if (!e.active) continue;
            const dist = Math.hypot(e.x - exp.cx, e.y - exp.cy);
            if (dist < exp.radius) {
              this.eventBus.emit('damageEntity', { entity: e, damage: exp.damage, source: exp.playerRef });
            }
          }
          this.eventBus.emit('areaPulse', { x: exp.cx, y: exp.cy, radius: exp.radius, color: '#FF6B35' });
        }
        this._w8ExplosionQueue.splice(i, 1);
      }
    }
  }

  _getWeaponStats(weaponId, level) {
    const weapon = this.dataManager.weapons?.find(w => w.id === weaponId);
    if (!weapon || !weapon.statsPerLevel) return null;
    return weapon.statsPerLevel[level - 1] || weapon.statsPerLevel[0];
  }

  levelUp(weaponId) {
    const current = this.weaponLevels[weaponId] || 0;
    if (current < 7) {
      this.weaponLevels[weaponId] = current + 1;
      this.eventBus.emit('weaponLevelUp', { weaponId, newLevel: current + 1 });
    }
  }

  unlockWeapon(weaponId) {
    if (!this.weaponLevels[weaponId]) {
      this.weaponLevels[weaponId] = 1;
      this.cooldowns[weaponId] = 0;
    }
  }

  getWeaponLevel(weaponId) {
    return this.weaponLevels[weaponId] || 0;
  }

  reset() {
    this.weaponLevels = {};
    this._w3PulseQueue = [];
    this._w5ChainQueue = [];
    this._w7ComboQueue = [];
    this._w8ExplosionQueue = [];
    this.cooldowns = {};
  }
}

// ============================================================
// PHASE 9: DAMAGE SYSTEM
// ============================================================

// --- DamageSystem ---
// Applies damage, crits, knockback, invincibility
