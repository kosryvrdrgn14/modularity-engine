class CompanionSystem {
  constructor(entityManager, eventBus) {
    this.entityManager = entityManager;
    this.eventBus = eventBus;
    this._activeCount = 0;
    this.companions = [];
    this._projectiles = []; // For archer/spider arrows
    this._swarmEntities = []; // For rat swarm
  }

  init(companionIds, player, weaponSystem) {
    this.companions = [];
    this._projectiles = [];
    this._swarmEntities = [];
    this.weaponSystem = weaponSystem;

    for (const id of companionIds) {
      const data = COMPANION_DATA[id];
      if (!data) continue;
      const level = 1;
      const stats = data.statsPerLevel[level - 1];
      const weaponBuff = this._getWeaponBuff(data.pairedWeapon);

      const companion = this.entityManager.create('companion', {
        x: player.x,
        y: player.y + (data.followDistance || 24),
        size: data.size || 14,
        visual: { ...data.visual },
        companionId: id,
        companionState: 'follow',
        attackType: data.attackType || 'cone',
        attackCooldown: 0,
        target: null,
        // Type-specific data from COMPANION_DATA
        coneAngle: data.coneAngle,
        coneRange: data.coneRange,
        chainRange: data.chainRange || 80,
        orbitRadius: data.orbitRadius || 40,
        projectileSpeed: data.projectileSpeed || 300,
        primaryDamage: Math.round((stats.primaryDamage || 0) * weaponBuff),
        secondaryDamage: Math.round((stats.secondaryDamage || 0) * weaponBuff),
        pairedWeapon: data.pairedWeapon,
        weaponBuff: weaponBuff,
        detectionRange: data.detectionRange || 120,
        maxChaseRange: data.maxChaseRange || 200,
        followDistance: data.followDistance || 24,
        followSpeedMultiplier: data.followSpeedMultiplier || 0.8,
        attackSpeedMultiplier: data.attackSpeedMultiplier || 1.5,
        hitCooldown: data.hitCooldown || 1.0,
        lootRadius: data.lootRadius || 0,
        companionLevel: 1,
        _level: 1,
        _growlTimer: 0,
        _growlEffect: null,
        _attackRunTimer: 0,
        _hitCooldowns: {},
        facing: 0,
        // Healer
        _healThresholds: [0.8, 0.6, 0.2],
        _healsUsed: 0,
        _regenTimer: 0,
        // Shield (turtle)
        _shieldTimer: 0,
        _shieldHP: 0,
        // Debuff (owl)
        _debuffTimer: 0,
        // Swarm (rat)
        _swarmTimer: 0,
        // Leap (frog)
        _leapTimer: 0,
        _leapTarget: null,
        // Orbit (bat)
        _orbitAngle: 0,
        // Dive (hawk)
        _diveTimer: 0,
        _divePath: null,
        // Projectile (archer/spider)
        _burstCount: 0,
        _burstTimer: 0,
        _burstCD: 0,
      });
      this.companions.push(companion);
      this._activeCount++;
      this.eventBus.emit('companionSpawn', { companionId: id });
    }
  }

  update(dt, player, enemies) {
    if (!player || !player.active) return;

    for (const c of this.companions) {
      if (!c.active) continue;

      // Tick cooldowns
      if (c.attackCooldown > 0) c.attackCooldown -= dt;
      for (const eid in c._hitCooldowns) {
        c._hitCooldowns[eid] -= dt;
        if (c._hitCooldowns[eid] <= 0) delete c._hitCooldowns[eid];
      }
      if (c._growlEffect) {
        c._growlEffect.elapsed += dt;
        if (c._growlEffect.elapsed >= c._growlEffect.duration) c._growlEffect = null;
      }

      // Route to type-specific update
      switch (c.attackType) {
        case 'heal':   this._updateHealer(c, player, dt); break;
        case 'shield': this._updateShield(c, player, dt); break;
        case 'orbit':  this._updateOrbit(c, player, enemies, dt); break;
        case 'swarm':  this._updateSwarm(c, player, enemies, dt); break;
        case 'debuff': this._updateDebuff(c, player, enemies, dt); break;
        case 'chain':  this._updateChain(c, player, enemies, dt); break;
        case 'projectile': this._updateProjectile(c, player, enemies, dt); break;
        case 'leap':   this._updateLeap(c, player, enemies, dt); break;
        case 'dive':   this._updateDive(c, player, enemies, dt); break;
        case 'melee':  this._updateMelee(c, player, enemies, dt); break;
        default:       this._updateCone(c, player, enemies, dt); break; // cone = dog
      }
    }

    // Update projectiles
    this._updateProjectiles(dt, enemies);
    // Update swarm
    this._updateSwarmEntities(dt, enemies, player);
  }

  // ═══════════════════════════════════════════════
  // CONE (Dog) — original behavior
  // ═══════════════════════════════════════════════
  _updateCone(c, player, enemies, dt) {
    switch (c.companionState) {
      case 'follow':
        this._updateFollow(c, player, dt);
        if (c.attackCooldown <= 0) {
          const t = this._findNearestEnemy(c, enemies);
          if (t && distBetween(c, t) <= c.detectionRange) {
            c.companionState = 'attackRun'; c.target = t; c._attackRunTimer = 0;
          }
        }
        break;
      case 'attackRun':
        c._attackRunTimer += dt;
        this._updateAttackRun(c, player, dt);
        if (c._attackRunTimer > 3.0) { c.companionState = 'return'; c.target = null; break; }
        if (!c.target || !c.target.active) {
          const nt = this._findNearestEnemy(c, enemies);
          if (nt && distBetween(c, nt) <= c.maxChaseRange) c.target = nt;
          else { c.companionState = 'return'; c.target = null; }
          break;
        }
        if (distBetween(c, c.target) < 20) {
          c.companionState = 'growl'; c._growlTimer = 0.1;
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
        if (distBetween(c, this._getFollowPos(c, player)) < 20) c.companionState = 'follow';
        break;
    }
    this._collectNearbyLoot(c, player);
  }

  _performGrowl(c, enemies) {
    const inCone = enemies.filter(e => e.active && !c._hitCooldowns[e.id] && isInCone(c, e, c.coneAngle, c.coneRange));
    inCone.sort((a, b) => distBetween(c, a) - distBetween(c, b));
    if (inCone.length > 0) {
      this._dealCompanionDamage(c, inCone[0], c.primaryDamage);
      for (let i = 1; i < inCone.length; i++) this._dealCompanionDamage(c, inCone[i], c.secondaryDamage);
    }
    c._growlEffect = { angle: c.facing, range: c.coneRange, angleSpan: c.coneAngle, elapsed: 0, duration: 0.4 };
    this.eventBus.emit('companionGrowl', { x: c.x, y: c.y });
  }

  // ═══════════════════════════════════════════════
  // HEALER
  // ═══════════════════════════════════════════════
  _updateHealer(c, player, dt) {
    this._updateFollow(c, player, dt);
    const stats = this._getStats(c);
    if (!stats) return;

    // Passive regen
    c._regenTimer += dt;
    const regenInterval = stats.regenInterval || 5;
    if (c._regenTimer >= regenInterval) {
      c._regenTimer -= regenInterval;
      this._healPlayer(player, 1);
    }

    // Threshold heals
    if (c._healsUsed >= 3) return;
    const hpPct = player.hp / player.maxHp;
    const thresholds = c._healThresholds;
    const healIdx = c._healsUsed;
    if (healIdx < thresholds.length && hpPct <= thresholds[healIdx]) {
      const healAmount = [stats.heal1, stats.heal2, stats.heal3][healIdx] || 0;
      this._healPlayer(player, healAmount);
      c._healsUsed++;
      // Visual: brief glow effect
      c._growlEffect = { angle: 0, range: 30, angleSpan: Math.PI * 2, elapsed: 0, duration: 0.6, color: '#4CAF50' };
    }
  }

  _healPlayer(player, amount) {
    const before = player.hp;
    player.hp = Math.min(player.hp + amount, player.maxHp);
    const healed = player.hp - before;
    if (healed > 0) {
      this.eventBus.emit('floatingText', {
        x: player.x, y: player.y - 20, text: '+' + healed, color: '#4CAF50', duration: 1.0,
      });
    }
  }

  // ═══════════════════════════════════════════════
  // SHIELD (Turtle)
  // ═══════════════════════════════════════════════
  _updateShield(c, player, dt) {
    this._updateFollow(c, player, dt);
    const stats = this._getStats(c);
    if (!stats) return;

    // Grant shield on cooldown
    c._shieldTimer -= dt;
    if (c._shieldTimer <= 0 && c._shieldHP <= 0) {
      c._shieldHP = stats.shieldHP || 15;
      c._shieldTimer = this._getCooldown(c);
      player._companionShield = c._shieldHP;
      this.eventBus.emit('floatingText', {
        x: player.x, y: player.y - 25, text: '🛡️ Shield!', color: '#2196F3', duration: 1.0,
      });
    }

    // Knockback when shield absorbs damage
    if (c._shieldHP > 0 && player._companionShield > 0) {
      // Check if shield was just broken (shield went from >0 to 0)
      if (player._companionShield <= 0 && c._shieldHP > 0) {
        c._shieldHP = 0;
        const kbRange = stats.knockbackRange || 40;
        const enemies = this.entityManager.getActive('enemy');
        for (const e of enemies) {
          if (!e.active) continue;
          const d = distBetween(player, e);
          if (d <= kbRange) {
            const angle = Math.atan2(e.y - player.y, e.x - player.x);
            e.x += Math.cos(angle) * 60;
            e.y += Math.sin(angle) * 60;
            this._dealCompanionDamage(c, e, stats.primaryDamage || 5);
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════════════
  // ORBIT (Bat)
  // ═══════════════════════════════════════════════
  _updateOrbit(c, player, enemies, dt) {
    const stats = this._getStats(c);
    const radius = c.orbitRadius || 40;
    c._orbitAngle += dt * 2.5; // Orbit speed
    c.x = player.x + Math.cos(c._orbitAngle) * radius;
    c.y = player.y + Math.sin(c._orbitAngle) * radius;
    c.facing = c._orbitAngle + Math.PI / 2;

    // Attack nearest enemy on cooldown
    if (c.attackCooldown <= 0) {
      const t = this._findNearestEnemy(c, enemies);
      if (t && distBetween(c, t) <= (c.detectionRange || 80)) {
        this._dealCompanionDamage(c, t, c.primaryDamage);
        c.attackCooldown = this._getCooldown(c);
        // Heal player
        const healOnHit = stats.healOnHit || 3;
        this._healPlayer(player, healOnHit);
        // Speed boost
        const speedBoost = stats.speedBoost || 0.1;
        const speedDuration = stats.speedDuration || 2;
        player.speedMultiplier = (player.speedMultiplier || 1) + speedBoost;
        player.speed = (player.stats?.moveSpeed || 200) * player.speedMultiplier;
        setTimeout(() => {
          if (player.active) {
            player.speedMultiplier = (player.speedMultiplier || 1) - speedBoost;
            player.speed = (player.stats?.moveSpeed || 200) * player.speedMultiplier;
          }
        }, speedDuration * 1000);
        // Visual
        c._growlEffect = { angle: 0, range: 15, angleSpan: Math.PI * 2, elapsed: 0, duration: 0.2, color: '#D32F2F' };
      }
    }
  }

  // ═══════════════════════════════════════════════
  // SWARM (Rat)
  // ═══════════════════════════════════════════════
  _updateSwarm(c, player, enemies, dt) {
    this._updateFollow(c, player, dt);
    const stats = this._getStats(c);
    if (!stats) return;

    c._swarmTimer -= dt;
    if (c._swarmTimer <= 0) {
      c._swarmTimer = this._getCooldown(c);
      // Spawn mini-rats
      const count = stats.swarmCount || 3;
      for (let i = 0; i < count; i++) {
        this._swarmEntities.push({
          x: c.x + (Math.random() - 0.5) * 20,
          y: c.y + (Math.random() - 0.5) * 20,
          vx: 0, vy: 0,
          damage: stats.primaryDamage || 4,
          hp: stats.swarmHP || 3,
          maxHp: stats.swarmHP || 3,
          speed: 150,
          lifetime: 5,
          age: 0,
          active: true,
          target: null,
        });
      }
    }
  }

  _updateSwarmEntities(dt, enemies, player) {
    for (let i = this._swarmEntities.length - 1; i >= 0; i--) {
      const s = this._swarmEntities[i];
      if (!s.active) { this._swarmEntities.splice(i, 1); continue; }
      s.age += dt;
      if (s.age > s.lifetime || s.hp <= 0) { s.active = false; this._swarmEntities.splice(i, 1); continue; }

      // Find target
      if (!s.target || !s.target.active) {
        let best = null, bestD = Infinity;
        for (const e of enemies) {
          if (!e.active) continue;
          const d = Math.sqrt((e.x - s.x) ** 2 + (e.y - s.y) ** 2);
          if (d < bestD) { bestD = d; best = e; }
        }
        s.target = best;
      }

      // Move toward target
      if (s.target) {
        const dx = s.target.x - s.x;
        const dy = s.target.y - s.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 5) {
          s.x += (dx / d) * s.speed * dt;
          s.y += (dy / d) * s.speed * dt;
        } else {
          // Hit target
          this.eventBus.emit('companionDamage', {
            source: { x: s.x, y: s.y, companionId: 'rat' },
            target: s.target, damage: s.damage,
            position: { x: s.target.x, y: s.target.y },
          });
          s.active = false;
        }
      } else {
        // Wander toward player
        const dx = player.x - s.x;
        const dy = player.y - s.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 50) {
          s.x += (dx / d) * s.speed * 0.5 * dt;
          s.y += (dy / d) * s.speed * 0.5 * dt;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════
  // DEBUFF (Owl)
  // ═══════════════════════════════════════════════
  _updateDebuff(c, player, enemies, dt) {
    // Hover at medium distance
    const angle = Math.atan2(player.y - c.y, player.x - c.x);
    const targetX = player.x - Math.cos(angle) * (c.followDistance || 50);
    const targetY = player.y - Math.sin(angle) * (c.followDistance || 50);
    c.x += (targetX - c.x) * 2 * dt;
    c.y += (targetY - c.y) * 2 * dt;
    c.facing = angle;

    if (c.attackCooldown <= 0) {
      const stats = this._getStats(c);
      if (!stats) return;
      // Apply debuff to all enemies within range
      const ampRange = 100;
      let hitAny = false;
      for (const e of enemies) {
        if (!e.active) continue;
        if (distBetween(c, e) <= ampRange) {
          e._companionVulnerability = (stats.damageAmp || 0.12);
          e._companionVulnTimer = (stats.ampDuration || 4);
          hitAny = true;
        }
      }
      if (hitAny) {
        c.attackCooldown = this._getCooldown(c);
        this._dealCompanionDamage(c, { x: c.x, y: c.y, id: 'owl_aoe', active: true }, c.primaryDamage);
        c._growlEffect = { angle: 0, range: ampRange, angleSpan: Math.PI * 2, elapsed: 0, duration: 0.5, color: '#ECEFF1' };
      }
    }

    // Tick vulnerability timers on enemies
    for (const e of enemies) {
      if (e._companionVulnTimer > 0) {
        e._companionVulnTimer -= dt;
        if (e._companionVulnTimer <= 0) {
          e._companionVulnerability = 0;
          e._companionVulnTimer = 0;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════
  // CHAIN (Mage / Panther)
  // ═══════════════════════════════════════════════
  _updateChain(c, player, enemies, dt) {
    switch (c.companionState) {
      case 'follow':
        this._updateFollow(c, player, dt);
        if (c.attackCooldown <= 0) {
          const t = this._findNearestEnemy(c, enemies);
          if (t && distBetween(c, t) <= c.detectionRange) {
            c.companionState = 'cast'; c.target = t; c._growlTimer = 0.3;
          }
        }
        break;
      case 'cast':
        c._growlTimer -= dt;
        if (c._growlTimer <= 0) {
          const stats = this._getStats(c);
          if (stats) {
            const chainHits = stats.chainHits || 5;
            const chainRange = c.chainRange || 80;
            const vuln = stats.vulnerability || 0;
            const vulnDur = stats.vulnDuration || 3;
            this._performChainLightning(c, c.target, enemies, c.primaryDamage, chainHits, chainRange, vuln, vulnDur);
          }
          c.attackCooldown = this._getCooldown(c);
          c.companionState = 'return';
        }
        break;
      case 'return':
        this._updateFollow(c, player, dt);
        if (distBetween(c, this._getFollowPos(c, player)) < 20) c.companionState = 'follow';
        break;
    }
  }

  _performChainLightning(c, firstTarget, enemies, damage, maxHits, chainRange, vuln, vulnDur) {
    const hit = new Set();
    let current = firstTarget;
    for (let i = 0; i < maxHits && current; i++) {
      if (!current.active || hit.has(current.id)) break;
      hit.add(current.id);
      this._dealCompanionDamage(c, current, damage);
      // Apply vulnerability
      if (vuln > 0) {
        current._companionVulnerability = Math.max(current._companionVulnerability || 0, vuln);
        current._companionVulnTimer = Math.max(current._companionVulnTimer || 0, vulnDur);
      }
      // Find next chain target
      let next = null, nextD = Infinity;
      for (const e of enemies) {
        if (!e.active || hit.has(e.id)) continue;
        const d = distBetween(current, e);
        if (d <= chainRange && d < nextD) { nextD = d; next = e; }
      }
      current = next;
    }
    // Visual: lightning effect
    c._growlEffect = { angle: 0, range: chainRange, angleSpan: Math.PI * 2, elapsed: 0, duration: 0.3, color: '#9C27B0' };
  }

  // ═══════════════════════════════════════════════
  // PROJECTILE (Archer / Spider)
  // ═══════════════════════════════════════════════
  _updateProjectile(c, player, enemies, dt) {
    // Stay at distance
    const angle = Math.atan2(player.y - c.y, player.x - c.x);
    const targetX = player.x - Math.cos(angle) * (c.followDistance || 120);
    const targetY = player.y - Math.sin(angle) * (c.followDistance || 120);
    c.x += (targetX - c.x) * 2 * dt;
    c.y += (targetY - c.y) * 2 * dt;
    c.facing = angle;

    // Burst timer
    c._burstTimer -= dt;

    if (c.attackCooldown <= 0) {
      const stats = this._getStats(c);
      if (!stats) return;
      const t = this._findNearestEnemy(c, enemies);
      if (t && distBetween(c, t) <= (c.detectionRange || 150)) {
        // Fire single arrow
        this._fireProjectile(c, t, stats.primaryDamage, stats);
        c.attackCooldown = this._getCooldown(c);

        // Check burst
        if (c._burstTimer <= 0) {
          c._burstCount = stats.burstCount || 2;
          c._burstCD = stats.burstCD || 10;
          c._burstTimer = c._burstCD;
          c._burstCD = 0.08; // Rapid fire interval
        }
      }
    }

    // Burst fire
    if (c._burstCount > 0 && c._burstCD <= 0) {
      const stats = this._getStats(c);
      if (stats) {
        const t = this._findNearestEnemy(c, enemies);
        if (t) this._fireProjectile(c, t, stats.primaryDamage, stats);
        c._burstCount--;
        c._burstCD = 0.08;
      }
    }
    if (c._burstCD > 0) c._burstCD -= dt;
  }

  _fireProjectile(c, target, damage, stats) {
    const angle = Math.atan2(target.y - c.y, target.x - c.x);
    const speed = c.projectileSpeed || 300;
    this._projectiles.push({
      x: c.x, y: c.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      damage: damage,
      companionId: c.companionId,
      slow: stats.slow || 0,
      slowDuration: stats.slowDuration || 0,
      poisonPerTick: stats.poisonPerTick || 0,
      poisonDuration: stats.poisonDuration || 0,
      maxStacks: stats.maxStacks || 0,
      age: 0,
      maxAge: 1.5,
      active: true,
      color: c.companionId === 'spider' ? '#6A1B9A' : '#2196F3',
    });
  }

  _updateProjectiles(dt, enemies) {
    for (let i = this._projectiles.length - 1; i >= 0; i--) {
      const p = this._projectiles[i];
      if (!p.active) { this._projectiles.splice(i, 1); continue; }
      p.age += dt;
      if (p.age > p.maxAge) { p.active = false; this._projectiles.splice(i, 1); continue; }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Hit check
      for (const e of enemies) {
        if (!e.active) continue;
        const d = Math.sqrt((e.x - p.x) ** 2 + (e.y - p.y) ** 2);
        if (d < (e.size || 10) + 5) {
          this.eventBus.emit('companionDamage', {
            source: { x: p.x, y: p.y, companionId: p.companionId },
            target: e, damage: p.damage,
            position: { x: e.x, y: e.y },
          });
          // Apply slow
          if (p.slow > 0) {
            e._companionSlow = Math.max(e._companionSlow || 0, p.slow);
            e._companionSlowTimer = Math.max(e._companionSlowTimer || 0, p.slowDuration);
          }
          // Apply poison
          if (p.poisonPerTick > 0) {
            const stacks = Math.min((e._poisonStacks || 0) + 1, p.maxStacks);
            e._poisonStacks = stacks;
            e._poisonDmg = p.poisonPerTick;
            e._poisonTimer = p.poisonDuration;
          }
          p.active = false;
          break;
        }
      }
    }
  }

  // ═══════════════════════════════════════════════
  // MELEE (Knight)
  // ═══════════════════════════════════════════════
  _updateMelee(c, player, enemies, dt) {
    switch (c.companionState) {
      case 'follow':
        this._updateFollow(c, player, dt);
        if (c.attackCooldown <= 0) {
          const t = this._findNearestEnemy(c, enemies);
          if (t && distBetween(c, t) <= c.detectionRange) {
            c.companionState = 'attackRun'; c.target = t; c._attackRunTimer = 0;
          }
        }
        break;
      case 'attackRun':
        c._attackRunTimer += dt;
        this._updateAttackRun(c, player, dt);
        if (c._attackRunTimer > 3.0) { c.companionState = 'return'; c.target = null; break; }
        if (!c.target || !c.target.active) {
          const nt = this._findNearestEnemy(c, enemies);
          if (nt && distBetween(c, nt) <= c.maxChaseRange) c.target = nt;
          else { c.companionState = 'return'; c.target = null; }
          break;
        }
        if (distBetween(c, c.target) < 20) {
          c.companionState = 'growl'; c._growlTimer = 0.15;
          c.facing = Math.atan2(c.target.y - c.y, c.target.x - c.x);
        }
        break;
      case 'growl':
        c._growlTimer -= dt;
        if (c._growlTimer <= 0) {
          const stats = this._getStats(c);
          if (stats && c.target && c.target.active) {
            this._dealCompanionDamage(c, c.target, c.primaryDamage);
            // Apply armor shred
            if (stats.armorShred > 0) {
              c.target._companionArmorShred = stats.armorShred;
              c.target._companionShredTimer = stats.shredDuration || 3;
            }
          }
          c.attackCooldown = this._getCooldown(c);
          c.companionState = 'return';
        }
        break;
      case 'return':
        this._updateFollow(c, player, dt);
        if (distBetween(c, this._getFollowPos(c, player)) < 20) c.companionState = 'follow';
        break;
    }
  }

  // ═══════════════════════════════════════════════
  // LEAP (Frog)
  // ═══════════════════════════════════════════════
  _updateLeap(c, player, enemies, dt) {
    switch (c.companionState) {
      case 'follow':
        this._updateFollow(c, player, dt);
        if (c.attackCooldown <= 0) {
          const t = this._findNearestEnemy(c, enemies);
          if (t && distBetween(c, t) <= c.detectionRange) {
            c.companionState = 'leap'; c._leapTarget = t;
            c._leapTimer = 0.2; // Air time
            c._leapStartX = c.x; c._leapStartY = c.y;
          }
        }
        break;
      case 'leap':
        c._leapTimer -= dt;
        const t = c._leapTarget;
        if (t && t.active) {
          const progress = 1 - Math.max(0, c._leapTimer / 0.2);
          c.x = c._leapStartX + (t.x - c._leapStartX) * progress;
          c.y = c._leapStartY + (t.y - c._leapStartY) * progress - Math.sin(progress * Math.PI) * 40;
        }
        if (c._leapTimer <= 0) {
          if (t && t.active) {
            const stats = this._getStats(c);
            // Damage + slow + knockback
            this._dealCompanionDamage(c, t, c.primaryDamage);
            if (stats) {
              t._companionSlow = stats.slow || 0.3;
              t._companionSlowTimer = stats.slowDuration || 2;
              const kbRange = stats.knockbackRange || 50;
              const angle = Math.atan2(t.y - c.y, t.x - c.x);
              t.x += Math.cos(angle) * kbRange;
              t.y += Math.sin(angle) * kbRange;
            }
          }
          c.attackCooldown = this._getCooldown(c);
          c.companionState = 'follow';
        }
        break;
      case 'return':
        this._updateFollow(c, player, dt);
        if (distBetween(c, this._getFollowPos(c, player)) < 20) c.companionState = 'follow';
        break;
    }
  }

  // ═══════════════════════════════════════════════
  // DIVE (Hawk)
  // ═══════════════════════════════════════════════
  _updateDive(c, player, enemies, dt) {
    // Hover above player
    c.x += (player.x - c.x) * 3 * dt;
    c.y += (player.y - 60 - c.y) * 3 * dt; // Stay above
    c.facing = Math.atan2(player.y - c.y, player.x - c.x);

    switch (c.companionState) {
      case 'follow':
        if (c.attackCooldown <= 0) {
          const t = this._findNearestEnemy(c, enemies);
          if (t && distBetween(c, t) <= (c.detectionRange || 150)) {
            const stats = this._getStats(c);
            c.companionState = 'dive';
            c._diveTimer = 0.3; // Dive duration
            c._diveStartX = c.x; c._diveStartY = c.y;
            // Target: dive through densest cluster
            c._diveTargetX = t.x; c._diveTargetY = t.y;
            c._diveWidth = stats?.diveWidth || 30;
          }
        }
        break;
      case 'dive':
        c._diveTimer -= dt;
        const progress = 1 - Math.max(0, c._diveTimer / 0.3);
        c.x = c._diveStartX + (c._diveTargetX - c._diveStartX) * progress;
        c.y = c._diveStartY + (c._diveTargetY - c._diveStartY) * progress;
        c.facing = Math.atan2(c._diveTargetY - c._diveStartY, c._diveTargetX - c._diveStartX);

        // Hit enemies along path
        if (progress > 0.3 && progress < 0.8) {
          const stats = this._getStats(c);
          const width = c._diveWidth || 30;
          for (const e of enemies) {
            if (!e.active) continue;
            if (!c._hitCooldowns[e.id] && this._isNearLine(c._diveStartX, c._diveStartY, c._diveTargetX, c._diveTargetY, e.x, e.y, width)) {
              this._dealCompanionDamage(c, e, c.primaryDamage);
            }
          }
        }

        if (c._diveTimer <= 0) {
          c.attackCooldown = this._getCooldown(c);
          c.companionState = 'follow';
        }
        break;
    }
  }

  _isNearLine(x1, y1, x2, y2, px, py, width) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return false;
    const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (len * len)));
    const nearX = x1 + t * dx, nearY = y1 + t * dy;
    const dist = Math.sqrt((px - nearX) ** 2 + (py - nearY) ** 2);
    return dist <= width;
  }

  // ═══════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════
  _getWeaponBuff(weaponId) {
    if (!this.weaponSystem || !weaponId) return 1.0;
    const wl = this.weaponSystem.getWeaponLevel(weaponId);
    return 1.0 + (wl * 0.08);
  }

  refreshWeaponBuffs() {
    for (const c of this.companions) {
      if (!c.active || !c.pairedWeapon) continue;
      const buff = this._getWeaponBuff(c.pairedWeapon);
      c.weaponBuff = buff;
      const data = COMPANION_DATA[c.companionId];
      if (data) {
        const lvl = Math.min(c._level || 1, data.statsPerLevel.length);
        const base = data.statsPerLevel[lvl - 1];
        c.primaryDamage = Math.round((base.primaryDamage || 0) * buff);
        c.secondaryDamage = Math.round((base.secondaryDamage || 0) * buff);
      }
    }
  }

  _getStats(c) {
    const data = COMPANION_DATA[c.companionId];
    if (!data) return null;
    const lvl = Math.min(c._level || 1, data.statsPerLevel.length);
    return data.statsPerLevel[lvl - 1];
  }

  _getCooldown(c) {
    const stats = this._getStats(c);
    return stats?.cooldown || 10.0;
  }

  _updateFollow(c, player, dt) {
    const pos = this._getFollowPos(c, player);
    const dx = pos.x - c.x, dy = pos.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;
    const speed = player.speed * c.followSpeedMultiplier;
    c.x += (dx / dist) * speed * dt;
    c.y += (dy / dist) * speed * dt;
    c.facing = Math.atan2(dy, dx);
  }

  _updateAttackRun(c, player, dt) {
    if (!c.target) return;
    const dx = c.target.x - c.x, dy = c.target.y - c.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 2) return;
    const speed = player.speed * c.attackSpeedMultiplier;
    c.x += (dx / dist) * speed * dt;
    c.y += (dy / dist) * speed * dt;
    c.facing = Math.atan2(dy, dx);
  }

  _getFollowPos(c, player) {
    return {
      x: player.x - (player.vx !== 0 ? Math.sign(player.vx) * c.followDistance : 0),
      y: player.y + c.followDistance,
    };
  }

  _findNearestEnemy(c, enemies) {
    let nearest = null, nearestDist = Infinity;
    for (const e of enemies) {
      if (!e.active) continue;
      const d = distBetween(c, e);
      if (d < nearestDist) { nearestDist = d; nearest = e; }
    }
    return nearest;
  }

  _dealCompanionDamage(c, target, damage) {
    if (target.id) c._hitCooldowns[target.id] = c.hitCooldown;
    // Apply vulnerability
    const vuln = target._companionVulnerability || 0;
    const shred = target._companionArmorShred || 0;
    const finalDmg = Math.round(damage * (1 + vuln + shred));
    this.eventBus.emit('companionDamage', {
      source: c, target, damage: finalDmg,
      position: { x: target.x, y: target.y },
    });
  }

  _collectNearbyLoot(c, player) {
    if (!c.lootRadius) return;
    const pickups = this.entityManager.getActive('pickup');
    for (const p of pickups) {
      if (!p.active) continue;
      if (distBetween(c, p) <= c.lootRadius) {
        this.eventBus.emit('companionLootCollect', { companion: c, pickup: p, player });
      }
    }
  }

  setLevel(companionId, weaponLevel) {
    const c = this.companions.find(c => c.companionId === companionId);
    if (!c) return;
    const data = COMPANION_DATA[companionId];
    if (!data) return;
    const lvl = Math.min(weaponLevel, data.statsPerLevel.length);
    c._level = lvl;
    const stats = data.statsPerLevel[lvl - 1];
    c.primaryDamage = stats.primaryDamage || 0;
    c.secondaryDamage = stats.secondaryDamage || 0;
    c.attackCooldown = 0;
  }

  onBossIntro() {
    for (const c of this.companions) {
      c.companionState = 'follow';
      c.target = null;
      c.attackCooldown = 5;
      c._attackRunTimer = 0;
    }
  }

  getActiveCount() { return this._activeCount; }

  // ═══════════════════════════════════════════════
  // RENDERING
  // ═══════════════════════════════════════════════
  render(ctx, camera) {
    // Draw companions
    for (const c of this.companions) {
      if (!c.active) continue;
      const s = camera.worldToScreen(c.x, c.y);
      const sz = c.size;
      const color = c.visual?.color || '#888';

      ctx.save();
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + sz + 2, sz * 0.7, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, sz, 0, Math.PI * 2);
      ctx.fill();

      // Inner highlight
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.ellipse(s.x - sz * 0.2, s.y - sz * 0.2, sz * 0.4, sz * 0.3, -0.3, 0, Math.PI * 2);
      ctx.fill();

      // Eyes (direction-aware)
      const eyeDirX = Math.cos(c.facing) * 1.5;
      const eyeDirY = Math.sin(c.facing) * 1;
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(s.x - sz * 0.25 + eyeDirX, s.y - sz * 0.1 + eyeDirY, sz * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x + sz * 0.25 + eyeDirX, s.y - sz * 0.1 + eyeDirY, sz * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(s.x - sz * 0.23 + eyeDirX * 1.2, s.y - sz * 0.08 + eyeDirY, sz * 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s.x + sz * 0.27 + eyeDirX * 1.2, s.y - sz * 0.08 + eyeDirY, sz * 0.08, 0, Math.PI * 2);
      ctx.fill();

      // Shield glow for turtle
      if (c.companionId === 'turtle' && c._shieldHP > 0) {
        ctx.strokeStyle = `rgba(33, 150, 243, ${0.3 + Math.sin(Date.now() / 200) * 0.1})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, sz + 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Healer glow
      if (c.companionId === 'healer') {
        ctx.fillStyle = `rgba(76, 175, 80, ${0.1 + Math.sin(Date.now() / 500) * 0.05})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, sz + 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Attack effect
      if (c._growlEffect) {
        const ge = c._growlEffect;
        const progress = ge.elapsed / ge.duration;
        ctx.save();
        ctx.translate(s.x, s.y);
        if (ge.angleSpan >= Math.PI * 1.9) {
          // Full circle effect (debuff/chain/etc)
          const radius = ge.range * Math.min(progress * 2.5, 1);
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.strokeStyle = (ge.color || 'rgba(255, 140, 0,') + `, ${0.5 * (1 - progress)})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Cone effect (dog)
          ctx.rotate(ge.angle);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, ge.range * Math.min(progress * 2.5, 1), -ge.angleSpan / 2, ge.angleSpan / 2);
          ctx.closePath();
          ctx.fillStyle = `rgba(255, 140, 0, ${0.3 * (1 - progress)})`;
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Draw projectiles (archer/spider arrows)
    for (const p of this._projectiles) {
      if (!p.active) continue;
      const s = camera.worldToScreen(p.x, p.y);
      ctx.save();
      ctx.fillStyle = p.color || '#2196F3';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
      ctx.fill();
      // Trail
      ctx.strokeStyle = p.color || '#2196F3';
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - p.vx * 0.03, s.y - p.vy * 0.03);
      ctx.stroke();
      ctx.restore();
    }

    // Draw swarm (rat mini-rats)
    for (const sw of this._swarmEntities) {
      if (!sw.active) continue;
      const s = camera.worldToScreen(sw.x, sw.y);
      ctx.fillStyle = '#795548';
      ctx.beginPath();
      ctx.arc(s.x, s.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}


// ============================================================
// PHASE 5: SPAWN SYSTEM
// ============================================================

// --- SpawnSystem ---
// Spawns enemies based on wave timeline
