class CompanionSystem {
  constructor(entityManager, eventBus) {
    this.entityManager = entityManager;
    this.eventBus = eventBus;
    this._activeCount = 0;
    this.companions = [];
  }

  init(companionIds, player, weaponSystem) {
    this.companions = [];
    this.weaponSystem = weaponSystem;
    // Build slot map: slot index -> companion id
    this.slotMap = {};
    for (const id of companionIds) {
      const data = COMPANION_DATA[id];
      if (!data) continue;
      this.slotMap[data.slot] = id;
    }
    for (const id of companionIds) {
      const data = COMPANION_DATA[id];
      if (!data) continue;
      const level = 1; // Start at level 1
      const levelStats = data.statsPerLevel[level - 1];
      // C1: Get weapon buff from paired weapon
      const weaponBuff = this._getWeaponBuff(data.pairedWeapon);
      const companion = this.entityManager.create('companion', {
        x: player.x,
        y: player.y + data.followDistance,
        size: data.size,
        visual: { ...data.visual },
        companionId: id,
        companionState: 'follow',
        attackCooldown: 0,
        target: null,
        coneAngle: data.coneAngle,
        coneRange: data.coneRange,
        primaryDamage: Math.round(levelStats.primaryDamage * weaponBuff),
        secondaryDamage: Math.round(levelStats.secondaryDamage * weaponBuff),
        pairedWeapon: data.pairedWeapon,
        weaponBuff: weaponBuff,
        detectionRange: data.detectionRange,
        maxChaseRange: data.maxChaseRange,
        followDistance: data.followDistance,
        followSpeedMultiplier: data.followSpeedMultiplier,
        attackSpeedMultiplier: data.attackSpeedMultiplier,
        hitCooldown: data.hitCooldown,
        lootRadius: data.lootRadius,
        companionLevel: 1,
        _growlTimer: 0,
        _growlEffect: null,
        _attackRunTimer: 0,
        _hitCooldowns: {},  // entityId -> time remaining
        facing: 0,
      });
      this.companions.push(companion);
      this.eventBus.emit('companionSpawn', { companionId: id });
    }
  }

  update(dt, player, enemies) {
    if (!player || !player.active) return;

    for (const c of this.companions) {
      if (!c.active) continue;

      // Tick attack cooldown
      if (c.attackCooldown > 0) c.attackCooldown -= dt;

      // Tick per-enemy hit cooldowns
      for (const eid in c._hitCooldowns) {
        c._hitCooldowns[eid] -= dt;
        if (c._hitCooldowns[eid] <= 0) delete c._hitCooldowns[eid];
      }

      // Tick growl effect
      if (c._growlEffect) {
        c._growlEffect.elapsed += dt;
        if (c._growlEffect.elapsed >= c._growlEffect.duration) {
          c._growlEffect = null;
        }
      }

      switch (c.companionState) {
        case 'follow':
          this._updateFollow(c, player, dt);
          if (c.attackCooldown <= 0) {
            const target = this._findNearestEnemy(c, enemies);
            if (target && distBetween(c, target) <= c.detectionRange) {
              c.companionState = 'attackRun';
              c.target = target;
              c._attackRunTimer = 0;
            }
          }
          break;

        case 'attackRun':
          c._attackRunTimer += dt;
          this._updateAttackRun(c, player, dt);
          // Safety: if stuck for 3s, return
          if (c._attackRunTimer > 3.0) {
            c.companionState = 'return';
            c.target = null;
            c._attackRunTimer = 0;
            break;
          }
          // If target died, find new or return
          if (!c.target || !c.target.active) {
            const newTarget = this._findNearestEnemy(c, enemies);
            if (newTarget && distBetween(c, newTarget) <= c.maxChaseRange) {
              c.target = newTarget;
            } else {
              c.companionState = 'return';
              c.target = null;
            }
            break;
          }
          // If reached target
          if (distBetween(c, c.target) < 20) {
            c.companionState = 'growl';
            c._growlTimer = 0.1;
            // Face the target
            c.facing = Math.atan2(c.target.y - c.y, c.target.x - c.x);
          }
          break;

        case 'growl':
          c._growlTimer -= dt;
          if (c._growlTimer <= 0) {
            this._performGrowl(c, enemies);
            c.attackCooldown = this._getCooldown(c);
            c.companionState = 'return';
          }
          break;

        case 'return':
          this._updateFollow(c, player, dt);
          const followPos = this._getFollowPos(c, player);
          if (distBetween(c, followPos) < 20) {
            c.companionState = 'follow';
          }
          break;
      }

      // Passive loot collection
      this._collectNearbyLoot(c, player);
    }
  }

  // C1: Get damage multiplier from paired weapon level
  _getWeaponBuff(weaponId) {
    if (!this.weaponSystem) return 1.0;
    const wl = this.weaponSystem.getWeaponLevel(weaponId);
    // Each weapon level adds 8% damage to paired companion
    return 1.0 + (wl * 0.08);
  }

  // C1: Refresh all companion weapon buffs (call on weapon level up)
  refreshWeaponBuffs() {
    for (const c of this.companions) {
      if (!c.active || !c.pairedWeapon) continue;
      const buff = this._getWeaponBuff(c.pairedWeapon);
      c.weaponBuff = buff;
      // Reapply to damage using base stats from COMPANION_DATA
      const data = COMPANION_DATA[c.companionId];
      if (data) {
        const lvl = Math.min(c.companionLevel || 1, data.statsPerLevel.length);
        const base = data.statsPerLevel[lvl - 1];
        c.primaryDamage = Math.round(base.primaryDamage * buff);
        c.secondaryDamage = Math.round(base.secondaryDamage * buff);
      }
    }
  }

  // C2/C3: Get status of a companion
  getCompanionStatus(companionId) {
    // Check if deployed in this combat
    if (this.companions.some(c => c.companionId === companionId && c.active)) {
      return 'deployed_combat';
    }
    return 'available';
  }

  // C2: Check if companion is available for deployment
  isCompanionAvailable(companionId, gameManager) {
    // Check if already deployed in combat
    if (this.companions.some(c => c.companionId === companionId && c.active)) {
      return false; // Already in this combat
    }
    // Check if in auto-clear (from gameManager status)
    const status = gameManager?.getCompanionDeployStatus(companionId);
    if (status === 'autoclear') return false;
    // Check if locked/story unavailable
    if (status === 'locked' || status === 'story_unavailable') return false;
    return true;
  }

  _updateFollow(c, player, dt) {
    const pos = this._getFollowPos(c, player);
    const dx = pos.x - c.x;
    const dy = pos.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;

    const speed = player.speed * c.followSpeedMultiplier;
    c.x += (dx / dist) * speed * dt;
    c.y += (dy / dist) * speed * dt;
    c.facing = Math.atan2(dy, dx);
  }

  _updateAttackRun(c, player, dt) {
    if (!c.target) return;
    const dx = c.target.x - c.x;
    const dy = c.target.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;

    const speed = player.speed * c.attackSpeedMultiplier;
    c.x += (dx / dist) * speed * dt;
    c.y += (dy / dist) * speed * dt;
    c.facing = Math.atan2(dy, dx);
  }

  _getFollowPos(c, player) {
    // Follow behind the player (opposite of last movement direction)
    const behindX = player.x - (player.vx !== 0 ? Math.sign(player.vx) * c.followDistance : 0);
    const behindY = player.y + c.followDistance; // Default: below player
    return { x: behindX, y: behindY };
  }

  _findNearestEnemy(c, enemies) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const e of enemies) {
      if (!e.active) continue;
      const d = distBetween(c, e);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = e;
      }
    }
    return nearest;
  }

  _getCooldown(c) {
    // Get cooldown from companion data based on paired weapon level
    const data = COMPANION_DATA[c.companionId];
    if (!data) return 10.0;
    // Level is tracked externally; for now use level 1
    // Will be updated by weaponLevelUp listener
    return data.statsPerLevel[(c._level || 1) - 1].cooldown;
  }

  _performGrowl(c, enemies) {
    // Find all enemies in cone
    const inCone = [];
    for (const e of enemies) {
      if (!e.active) continue;
      if (isInCone(c, e, c.coneAngle, c.coneRange)) {
        // Check per-enemy hit cooldown
        if (!c._hitCooldowns[e.id]) {
          inCone.push(e);
        }
      }
    }

    // Sort by distance (closest first)
    inCone.sort((a, b) => distBetween(c, a) - distBetween(c, b));

    if (inCone.length > 0) {
      // Primary target takes full damage
      this._dealCompanionDamage(c, inCone[0], c.primaryDamage);

      // Secondary targets take reduced damage
      for (let i = 1; i < inCone.length; i++) {
        this._dealCompanionDamage(c, inCone[i], c.secondaryDamage);
      }
    }

    // Visual effect
    c._growlEffect = {
      angle: c.facing,
      range: c.coneRange,
      angleSpan: c.coneAngle,
      elapsed: 0,
      duration: 0.4,
    };

    // Audio
    this.eventBus.emit('companionGrowl', { x: c.x, y: c.y });
  }

  _dealCompanionDamage(c, target, damage) {
    // Apply hit cooldown
    c._hitCooldowns[target.id] = c.hitCooldown;

    // Emit damage event (DamageSystem will handle actual HP reduction)
    this.eventBus.emit('companionDamage', {
      source: c,
      target: target,
      damage: damage,
      position: { x: target.x, y: target.y },
    });
  }

  _collectNearbyLoot(c, player) {
    const pickups = this.entityManager.getActive('pickup');
    for (const p of pickups) {
      if (!p.active) continue;
      if (distBetween(c, p) <= c.lootRadius) {
        this.eventBus.emit('companionLootCollect', {
          companion: c,
          pickup: p,
          player: player,
        });
      }
    }
  }

  // Called by weaponLevelUp listener to sync companion level
  setLevel(companionId, weaponLevel) {
    const c = this.companions.find(c => c.companionId === companionId);
    if (!c) return;
    const data = COMPANION_DATA[companionId];
    if (!data) return;
    const lvl = Math.min(weaponLevel, data.statsPerLevel.length);
    c._level = lvl;
    const stats = data.statsPerLevel[lvl - 1];
    c.primaryDamage = stats.primaryDamage;
    c.secondaryDamage = stats.secondaryDamage;
    // Cooldown takes effect on next attack cycle
    c.attackCooldown = 0; // Reset to allow immediate benefit
  }

  // Called on boss intro to reset companion state
  onBossIntro() {
    for (const c of this.companions) {
      c.companionState = 'return';
      c.target = null;
      c.attackCooldown = 5;
      c._attackRunTimer = 0;
    }
  }

  getActiveCount() { return this._activeCount; }

  render(ctx, camera) {
    for (const c of this.companions) {
      if (!c.active) continue;
      const s = camera.worldToScreen(c.x, c.y);
      const sz = c.size;  // ~14px radius

      ctx.save();

      // Shadow underneath
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + sz + 2, sz * 0.7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // --- Ears (behind head) ---
      const earTilt = Math.cos(c.facing) * 0.2;
      // Left ear
      ctx.fillStyle = '#C4862B';
      ctx.beginPath();
      ctx.ellipse(s.x - sz * 0.55, s.y - sz * 0.7, sz * 0.3, sz * 0.5, -0.3 + earTilt, 0, Math.PI * 2);
      ctx.fill();
      // Inner ear
      ctx.fillStyle = '#E8B87A';
      ctx.beginPath();
      ctx.ellipse(s.x - sz * 0.55, s.y - sz * 0.65, sz * 0.15, sz * 0.3, -0.3 + earTilt, 0, Math.PI * 2);
      ctx.fill();
      // Right ear
      ctx.fillStyle = '#C4862B';
      ctx.beginPath();
      ctx.ellipse(s.x + sz * 0.55, s.y - sz * 0.7, sz * 0.3, sz * 0.5, 0.3 - earTilt, 0, Math.PI * 2);
      ctx.fill();
      // Inner ear
      ctx.fillStyle = '#E8B87A';
      ctx.beginPath();
      ctx.ellipse(s.x + sz * 0.55, s.y - sz * 0.65, sz * 0.15, sz * 0.3, 0.3 - earTilt, 0, Math.PI * 2);
      ctx.fill();

      // --- Body (round golden) ---
      ctx.fillStyle = '#D4A056';
      ctx.beginPath();
      ctx.arc(s.x, s.y, sz, 0, Math.PI * 2);
      ctx.fill();

      // Belly (lighter)
      ctx.fillStyle = '#F0D9A8';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + sz * 0.2, sz * 0.55, sz * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // --- Thin green collar (subtle, not frog-like) ---
      ctx.strokeStyle = '#2D8B4E';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + sz * 0.18, sz * 0.65, sz * 0.12, 0, 0.3, Math.PI - 0.3);
      ctx.stroke();
      // Small gold tag
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(s.x, s.y + sz * 0.3, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // --- Face ---
      // Eyes (big and cute, facing direction)
      const eyeDirX = Math.cos(c.facing) * 1.5;
      const eyeDirY = Math.sin(c.facing) * 1;
      // White of eyes
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.ellipse(s.x - sz * 0.28 + eyeDirX, s.y - sz * 0.15 + eyeDirY, sz * 0.22, sz * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s.x + sz * 0.28 + eyeDirX, s.y - sz * 0.15 + eyeDirY, sz * 0.22, sz * 0.25, 0, 0, Math.PI * 2);
      ctx.fill();
      // Irises (dark brown)
      ctx.fillStyle = '#3D2200';
      ctx.beginPath();
      ctx.arc(s.x - sz * 0.26 + eyeDirX * 1.2, s.y - sz * 0.13 + eyeDirY, sz * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x + sz * 0.30 + eyeDirX * 1.2, s.y - sz * 0.13 + eyeDirY, sz * 0.13, 0, Math.PI * 2);
      ctx.fill();
      // Eye highlights (sparkle)
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(s.x - sz * 0.22 + eyeDirX, s.y - sz * 0.18 + eyeDirY, sz * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x + sz * 0.34 + eyeDirX, s.y - sz * 0.18 + eyeDirY, sz * 0.06, 0, Math.PI * 2);
      ctx.fill();

      // Nose (small dark triangle)
      ctx.fillStyle = '#2A1500';
      ctx.beginPath();
      ctx.moveTo(s.x, s.y + sz * 0.02);
      ctx.lineTo(s.x - sz * 0.08, s.y + sz * 0.12);
      ctx.lineTo(s.x + sz * 0.08, s.y + sz * 0.12);
      ctx.closePath();
      ctx.fill();

      // Mouth (cute W shape)
      ctx.strokeStyle = '#8B5E3C';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(s.x - sz * 0.15, s.y + sz * 0.2);
      ctx.quadraticCurveTo(s.x - sz * 0.05, s.y + sz * 0.28, s.x, s.y + sz * 0.22);
      ctx.quadraticCurveTo(s.x + sz * 0.05, s.y + sz * 0.28, s.x + sz * 0.15, s.y + sz * 0.2);
      ctx.stroke();

      // Blush (subtle pink cheeks)
      ctx.fillStyle = 'rgba(255, 150, 150, 0.25)';
      ctx.beginPath();
      ctx.ellipse(s.x - sz * 0.4, s.y + sz * 0.05, sz * 0.12, sz * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(s.x + sz * 0.4, s.y + sz * 0.05, sz * 0.12, sz * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Draw growl cone effect
      if (c._growlEffect) {
        const ge = c._growlEffect;
        const progress = ge.elapsed / ge.duration;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(ge.angle);

        // Cone fill
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, ge.range * Math.min(progress * 2.5, 1), -ge.angleSpan / 2, ge.angleSpan / 2);
        ctx.closePath();
        const alpha = 0.3 * (1 - progress);
        ctx.fillStyle = `rgba(255, 140, 0, ${alpha})`;
        ctx.fill();

        // Cone edge
        ctx.beginPath();
        ctx.arc(0, 0, ge.range * Math.min(progress * 2.5, 1), -ge.angleSpan / 2, ge.angleSpan / 2);
        ctx.strokeStyle = `rgba(255, 100, 0, ${0.6 * (1 - progress)})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
      }
    }
  }
}


// ============================================================
// PHASE 5: SPAWN SYSTEM
// ============================================================

// --- SpawnSystem ---
// Spawns enemies based on wave timeline
