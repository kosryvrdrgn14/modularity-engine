class PickupSystem {
  constructor(entityManager, dataManager, eventBus) {
    this.entityManager = entityManager;
    this.dataManager = dataManager;
    this.eventBus = eventBus;
    this.magnetActive = false;
    this.magnetTimer = 0;
  }

  setGameManager(gm) { this._gameManager = gm; }

  init() {
    this.eventBus.on('death', (data) => this._onEnemyDeath(data));
    this.eventBus.on('magnetActivate', (data) => this._onMagnetActivate(data));
  }

  _onEnemyDeath(data) {
    const enemy = data.entity;
    if (!enemy.enemyData) return;

    // Drop XP gem
    this.entityManager.create('pickup', {
      x: data.position.x + (Math.random() - 0.5) * 20,
      y: data.position.y + (Math.random() - 0.5) * 20,
      pickupData: { id: 'exp_small', value: enemy.enemyData.stats.xpValue },
      visual: { shape: 'diamond', color: '#4FC3F7', size: 8 },
    });

    // Drop gold coins
    const goldCoins = enemy.enemyData.stats.goldCoins;
    if (goldCoins) {
      const count = goldCoins.min + Math.floor(Math.random() * (goldCoins.max - goldCoins.min + 1));
      for (let i = 0; i < count; i++) {
        this.entityManager.create('pickup', {
          x: data.position.x + (Math.random() - 0.5) * 60,
          y: data.position.y + (Math.random() - 0.5) * 60,
          pickupData: { id: 'gold_coin', value: 1 },
          visual: { shape: 'circle', color: '#FFD700', size: 10 },
        });
      }
    }

    // Drop power-ups (with gacha protection)
    const drops = enemy.enemyData.drops.powerUpTable;
    for (const drop of drops) {
      // Gacha protection: ramp chance based on clears without this drop type
      let dropChance = drop.chance;
      if (this.gameManager && drop.chance < 1.0) {
        const stageId = 'stage_graveyard'; // current stage
        const pityKey = 'gacha_' + drop.type;
        const pityCounters = this.gameManager.store?.farming?.pityCounters || {};
        const pityCount = pityCounters[pityKey] || 0;

        // Gacha ramp: 1% → 5% → 15% → 25% → 50% → 75% → 99%
        const gachaRamp = [0.01, 0.05, 0.15, 0.25, 0.50, 0.75, 0.99];
        const rampIndex = Math.min(pityCount, gachaRamp.length - 1);
        const gachaBonus = gachaRamp[rampIndex];

        // Use higher of base chance or gacha ramp
        dropChance = Math.max(drop.chance, gachaBonus);
      }

      if (Math.random() < dropChance) {
        this.entityManager.create('pickup', {
          x: data.position.x,
          y: data.position.y,
          pickupData: { id: drop.type },
          visual: this._getPowerUpVisual(drop.type),
          isPowerUp: true,
        });
        // Reset pity counter on successful drop
        if (this.gameManager) {
          const pityKey = 'gacha_' + drop.type;
          if (!this.gameManager.store.farming) this.gameManager.store.farming = { pityCounters: {} };
          if (!this.gameManager.store.farming.pityCounters) this.gameManager.store.farming.pityCounters = {};
          this.gameManager.store.farming.pityCounters[pityKey] = 0;
        }
        break;
      } else {
        // Increment pity counter on failed drop
        if (this.gameManager && drop.chance < 1.0) {
          const pityKey = 'gacha_' + drop.type;
          if (!this.gameManager.store.farming) this.gameManager.store.farming = { pityCounters: {} };
          if (!this.gameManager.store.farming.pityCounters) this.gameManager.store.farming.pityCounters = {};
          this.gameManager.store.farming.pityCounters[pityKey] = (this.gameManager.store.farming.pityCounters[pityKey] || 0) + 1;
        }
      }
    }
  }

  _getPowerUpVisual(type) {
    const visuals = {
      screen_wipe: { shape: 'star', color: '#00E676', size: 16 },
      magnet: { shape: 'circle', color: '#FF4081', size: 14 },
      weapon_levelup: { shape: 'triangle', color: '#FF9100', size: 16 },
    };
    return visuals[type] || { shape: 'circle', color: '#FFF', size: 12 };
  }

  _onMagnetActivate(data) {
    this.magnetActive = true;
    this.magnetTimer = 10; // 10 seconds
  }

  update(dt) {
    if (!this.magnetActive) return;

    this.magnetTimer -= dt;
    if (this.magnetTimer <= 0) {
      this.magnetActive = false;
      return;
    }

    // Attract pickups
    const player = this.entityManager.getActive('player')[0];
    if (!player) return;

    const pickups = this.entityManager.getActive('pickup');
    for (const pickup of pickups) {
      const dx = player.x - pickup.x;
      const dy = player.y - pickup.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 350 && dist > 0) {
        const speed = 400;
        pickup.x += (dx / dist) * speed * dt;
        pickup.y += (dy / dist) * speed * dt;
      }
    }
  }

  reset() {
    this.magnetActive = false;
    this.magnetTimer = 0;
  }
}

// ============================================================
// PHASE 11: LEVELING SYSTEM
// ============================================================

// --- LevelingSystem ---
// Tracks XP and triggers level-ups
