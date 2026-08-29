class DamageSystem {
  constructor(entityManager, eventBus, renderer) {
    this.entityManager = entityManager;
    this.eventBus = eventBus;
    this.renderer = renderer;
  }

  init() {
    this.eventBus.on('contactDamage', (data) => this._handleDamage(data.target, data.source, data.damage));
    this.eventBus.on('projectileHit', (data) => this._handleProjectileHit(data));
    this.eventBus.on('areaPulse', (data) => this._handleAreaPulse(data));
    this.eventBus.on('companionDamage', (data) => this._handleCompanionDamage(data));
  }

  _handleCompanionDamage(data) {
    const { source, target, damage, position } = data;
    if (!target || !target.active) return;
    if (target.iFrames > 0) return;

    const armor = target.stats?.armor || 0;
    const finalDamage = Math.max(1, damage - armor);

    target.hp -= finalDamage;
    target.iFrames = 0.5;

    this.eventBus.emit('damage', {
      target,
      source,
      damage: finalDamage,
      isCrit: false,
      position: position || { x: target.x, y: target.y },
    });

    if (target.hp <= 0) {
      target.active = false;
      this.eventBus.emit('death', {
        entity: target,
        killer: source,
        position: { x: target.x, y: target.y },
      });
      if (target.isBoss) {
        this.eventBus.emit('bossDeath', { boss: target, killer: source });
      }
    }
  }

  _handleDamage(target, source, baseDamage) {
    if (!target || !target.active) return;
    if (target.iFrames > 0) return;

    // Apply armor
    const armor = target.stats.armor || 0;
    const afterArmor = Math.max(1, baseDamage - armor);

    // Apply crit
    const critChance = source.stats?.critChance || 0;
    const critMultiplier = source.stats?.critMultiplier || 1.5;
    const isCrit = Math.random() < critChance;
    const finalDamage = isCrit ? Math.floor(afterArmor * critMultiplier) : afterArmor;

    target.hp -= finalDamage;
    target.iFrames = 0.5;

    this.eventBus.emit('damage', {
      target,
      source,
      damage: finalDamage,
      isCrit,
      position: { x: target.x, y: target.y },
    });

    if (target.hp <= 0) {
      target.active = false;
      this.eventBus.emit('death', {
        entity: target,
        killer: source,
        position: { x: target.x, y: target.y },
      });
      // Boss death triggers victory
      if (target.isBoss) {
        this.eventBus.emit('bossDeath', { boss: target, killer: source });
      }
    }
  }

  _handleProjectileHit(data) {
    const player = this.entityManager.getActive('player')[0];
    this._handleDamage(data.target, { stats: player?.stats || {} }, data.projectile.damage);
  }

  _handleAreaPulse(data) {
    const enemies = this.entityManager.getActive('enemy');
    const player = this.entityManager.getActive('player')[0];
    for (const enemy of enemies) {
      const dx = enemy.x - data.x;
      const dy = enemy.y - data.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < data.radius) {
        this._handleDamage(enemy, { stats: player?.stats || {} }, data.damage);
      }
    }
    // Visual pulse effect
    if (this.renderer) {
      this.renderer.addPulseEffect(data.x, data.y, data.radius, '#FF9100');
    }
  }

  update(dt) {
    // Update iFrames
    const all = this.entityManager.getActive();
    for (const entity of all) {
      if (entity.iFrames > 0) {
        entity.iFrames = Math.max(0, entity.iFrames - dt);
      }
    }
  }
}

// ============================================================
// PHASE 10: PICKUP SYSTEM
// ============================================================

// --- PickupSystem ---
// Handles item drops and magnet attraction
