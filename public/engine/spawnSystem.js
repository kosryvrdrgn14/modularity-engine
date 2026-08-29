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
    
    if (!wave) return;
    
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
      visual: { shape: 'square', color: this._getEnemyColor(selected.id) },
    });
  }

  _spawnBoss() {
    const boss = this.dataManager.enemies.find(e => e.type === 'boss');
    if (!boss) return;
    
    const angle = Math.random() * Math.PI * 2;
    const dist = 500;
    const player = this.entityManager.getActive('player')[0];
    const px = player ? player.x : 0;
    const py = player ? player.y : 0;
    
    this.entityManager.create('enemy', {
      x: px + Math.cos(angle) * dist,
      y: py + Math.sin(angle) * dist,
      hp: boss.stats.hp,
      damage: boss.stats.damage,
      speed: boss.stats.speed,
      size: boss.stats.size,
      enemyData: boss,
      isBoss: true,
      visual: { shape: 'square', color: '#4A0000' },
    });
    
    this.eventBus.emit('bossSpawn', { boss });
  }

  _getEnemyColor(id) {
    const colors = {
      zombie: '#3B8A30',   // Brighter green — visible against dark bg
      bat: '#6B3FA0',      // Purple — was invisible (matched bg color)
      skeleton: '#C0392B', // Bright red
      ghost: '#8E44AD',    // Light purple
      caster: '#2E86C1',   // Blue
    };
    return colors[id] || '#555';
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
