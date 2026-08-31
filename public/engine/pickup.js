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
class LevelingSystem {
  constructor(entityManager, dataManager, eventBus) {
    this.entityManager = entityManager;
    this.dataManager = dataManager;
    this.eventBus = eventBus;
    this.level = 1;
    this.xp = 0;
    this.queue = [];
  }

  init() {
    this.eventBus.on('pickup', (data) => this._onPickup(data));
    this.eventBus.on('death', (data) => this._onEnemyDeath(data));
  }

  _onPickup(data) {
    if (data.pickup.pickupData?.id === 'exp_small') {
      this.addXP(data.pickup.pickupData.value);
    } else if (data.pickup.pickupData?.id === 'gold_coin') {
      // Gold is tracked separately (not implemented yet)
    }
  }

  _onEnemyDeath(data) {
    // XP from kills is handled via pickups
  }

  addXP(amount) {
    this.xp += amount;
    
    while (this.xp >= this._getXpToNext(this.level) && this.queue.length < 3) {
      const xpNeeded = this._getXpToNext(this.level);
      this.xp -= xpNeeded;
      this.level++;
      this.queue.push(this.level);
      this.eventBus.emit('levelUp', { level: this.level });
    }
  }

  _getXpToNext(level) {
    const curve = this.dataManager.leveling.xpCurve;
    const entry = curve.find(e => e.level === level);
    if (entry) return entry.xpToNext;
    // Formula for level 14+
    return Math.floor(375 * Math.pow(1.3, level - 14));
  }

  hasPendingLevelUp() {
    return this.queue.length > 0;
  }

  getNextLevel() {
    return this.queue[0];
  }

  consumeLevelUp() {
    return this.queue.shift();
  }

  reset() {
    this.level = 1;
    this.xp = 0;
    this.queue = [];
  }

  update(dt) {
    // Leveling system is event-driven, no per-frame updates needed
    // This method exists for consistency with other systems
  }
}

// ============================================================
// PHASE 12: RENDERING
// ============================================================

// --- Renderer ---
// Canvas 2D rendering
// ─── ASSET MANAGER ─── Preloads SVGs as Image objects
// ASSET_MAP moved to data/assetMap.js (loaded via <script> tag before this one)


async function preloadAssets(onProgress) {
  const cache = {};
  const entries = Object.entries(ASSET_MAP);
  let loaded = 0;
  for (const [key, path] of entries) {
    const img = new Image();
    img.src = path;
    cache[key] = img;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });
    loaded++;
    if (onProgress) onProgress(loaded / entries.length);
  }
  return cache;
}

// ============================================================
// TELEGRAPH SYSTEM
// Data-driven attack warnings and environmental hazard telegraphs
// ============================================================

class TelegraphSystem {
  constructor(entityManager, eventBus) {
    this.entityManager = entityManager;
    this.eventBus = eventBus;
    this.telegraphs = [];
    this.hazards = [];
    this.maxTelegraphs = 10;
    this._nextId = 0;
  }

  spawn(config) {
    if (this.telegraphs.length >= this.maxTelegraphs) {
      this.telegraphs.shift();
    }
    const t = {
      id: 'tg_' + (this._nextId++),
      shapeType: config.shapeType || 'rectangle',
      source: config.source || 'unknown',
      sourceEntity: config.sourceEntity || null,
      x: config.x || 0, y: config.y || 0,
      width: config.width || 120, height: config.height || 400,
      radius: config.radius || 80, innerRadius: config.innerRadius || 40,
      angle: config.angle || 0, arcDegrees: config.arcDegrees || 90,
      x1: config.x1 || 0, y1: config.y1 || 0,
      x2: config.x2 || 100, y2: config.y2 || 200,
      lineWidth: config.lineWidth || 30,
      createdAt: 0, windupDuration: config.windupDuration || 1.0, elapsed: 0,
      resolveDamage: config.resolveDamage !== false,
      damage: config.damage || 0, knockback: config.knockback || 0,
      visual: Object.assign({
        fillColor: 'rgba(255, 145, 0, 0.25)', strokeColor: 'rgba(255, 145, 0, 0.55)',
        strokeWidth: 2, flickerRate: 6, flickerMin: 0.15, flickerMax: 0.35,
        chevrons: true, chevronCount: 5, chevronColor: 'rgba(255, 200, 0, 0.7)',
        pulseScale: false, pulseScaleFrom: 0.8, outlineOnly: false, dangerIcon: null,
      }, config.visual || {}),
      windupSound: config.windupSound || null,
      resolveSound: config.resolveSound || null,
      onResolve: config.onResolve || null,
    };
    this.telegraphs.push(t);
    this.eventBus.emit('telegraphSpawn', { telegraph: t });
    return t;
  }

  spawnHazard(config) {
    const h = {
      id: 'hz_' + (this._nextId++),
      shapeType: config.shapeType || 'circle',
      x: config.x || 0, y: config.y || 0,
      radius: config.radius || 60,
      damage: config.damage || 3, tickInterval: config.tickInterval || 0.5,
      duration: config.duration || 5.0, elapsed: 0, lastDamageTime: 0,
      visual: Object.assign({
        fillColor: 'rgba(255, 80, 0, 0.30)', strokeColor: 'rgba(255, 120, 0, 0.50)',
        strokeWidth: 2,
      }, config.visual || {}),
    };
    this.hazards.push(h);
    return h;
  }

  update(dt) {
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i];
      t.elapsed += dt;
      if (t.elapsed >= t.windupDuration) {
        if (t.resolveDamage && t.damage > 0) this._resolveDamage(t);
        if (t.onResolve) t.onResolve(t, this.entityManager);
        if (t.resolveSound) this.eventBus.emit('playSound', { sound: t.resolveSound });
        this.eventBus.emit('telegraphResolve', { telegraph: t });
        this.telegraphs.splice(i, 1);
      }
    }
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.elapsed += dt;
      if (h.elapsed - h.lastDamageTime >= h.tickInterval) {
        h.lastDamageTime = h.elapsed;
        this._resolveHazardDamage(h);
      }
      if (h.elapsed >= h.duration) this.hazards.splice(i, 1);
    }
  }

  _resolveDamage(t) {
    const players = this.entityManager.getActive('player');
    for (const player of players) {
      if (this._isPointInTelegraph(player.x, player.y, t)) {
        if (player.iFrames > 0) continue;
        player.hp -= t.damage;
        player.iFrames = 0.5;
        this.eventBus.emit('damage', {
          entity: player, damage: t.damage, source: t.source,
          position: { x: player.x, y: player.y },
        });
        if (t.knockback > 0 && t.sourceEntity) {
          const dx = player.x - t.sourceEntity.x;
          const dy = player.y - t.sourceEntity.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          player.x += (dx / dist) * t.knockback;
          player.y += (dy / dist) * t.knockback;
        }
      }
    }
  }

  _resolveHazardDamage(h) {
    const players = this.entityManager.getActive('player');
    for (const player of players) {
      if (this._isPointInHazard(player.x, player.y, h)) {
        if (player.iFrames > 0) continue;
        player.hp -= h.damage;
        player.iFrames = 0.3;
        this.eventBus.emit('damage', {
          entity: player, damage: h.damage, source: 'hazard',
          position: { x: player.x, y: player.y },
        });
      }
    }
  }

  _isPointInTelegraph(px, py, t) {
    switch (t.shapeType) {
      case 'rectangle': {
        const dx = px - t.x, dy = py - t.y;
        const cos = Math.cos(-t.angle), sin = Math.sin(-t.angle);
        const lx = dx * cos - dy * sin, ly = dx * sin + dy * cos;
        return Math.abs(lx) <= t.width / 2 && Math.abs(ly) <= t.height / 2;
      }
      case 'circle': {
        const dx = px - t.x, dy = py - t.y;
        return Math.sqrt(dx * dx + dy * dy) <= t.radius;
      }
      case 'ring': {
        const dx = px - t.x, dy = py - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist >= t.innerRadius && dist <= t.radius;
      }
      case 'cone': {
        const dx = px - t.x, dy = py - t.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > t.radius) return false;
        const angle = Math.atan2(dy, dx);
        const halfArc = (t.arcDegrees * Math.PI / 180) / 2;
        let diff = angle - t.angle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return Math.abs(diff) <= halfArc;
      }
      case 'line': {
        const dx = t.x2 - t.x1, dy = t.y2 - t.y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.sqrt((px - t.x1) ** 2 + (py - t.y1) ** 2) <= t.lineWidth / 2;
        let t2 = ((px - t.x1) * dx + (py - t.y1) * dy) / lenSq;
        t2 = Math.max(0, Math.min(1, t2));
        const cx = t.x1 + t2 * dx, cy = t.y1 + t2 * dy;
        return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) <= t.lineWidth / 2;
      }
      case 'cross': {
        const armHalf = (t.width || 20) / 2, armLen = t.height || 100;
        if (Math.abs(px - t.x) <= armLen / 2 && Math.abs(py - t.y) <= armHalf) return true;
        if (Math.abs(px - t.x) <= armHalf && Math.abs(py - t.y) <= armLen / 2) return true;
        return false;
      }
      default: return false;
    }
  }

  _isPointInHazard(px, py, h) {
    if (h.shapeType === 'circle') {
      const dx = px - h.x, dy = py - h.y;
      return Math.sqrt(dx * dx + dy * dy) <= h.radius;
    }
    return false;
  }

  render(ctx) {
    for (const h of this.hazards) this._drawHazard(ctx, h);
    for (const t of this.telegraphs) this._drawTelegraph(ctx, t);
  }

  _drawTelegraph(ctx, t) {
    const v = t.visual;
    const progress = t.elapsed / t.windupDuration;
    const flicker = v.flickerMin + (v.flickerMax - v.flickerMin) *
      (0.5 + 0.5 * Math.sin(Date.now() * 0.001 * v.flickerRate * Math.PI * 2));
    let scale = 1;
    if (v.pulseScale) scale = v.pulseScaleFrom + (1 - v.pulseScaleFrom) * progress;

    ctx.save();
    switch (t.shapeType) {
      case 'rectangle': {
        ctx.translate(t.x, t.y); ctx.rotate(t.angle);
        const w = t.width * scale, h = t.height * scale;
        // Rect extends from origin forward along local X-axis (charge direction)
        if (!v.outlineOnly) {
          ctx.fillStyle = v.fillColor.replace(/[\d.]+\)$/, flicker + ')');
          ctx.fillRect(0, -w/2, h, w);
        }
        ctx.strokeStyle = v.strokeColor; ctx.lineWidth = v.strokeWidth;
        ctx.strokeRect(0, -w/2, h, w);
        // Chevrons point forward (right = charge direction)
        if (v.chevrons && v.chevronCount > 0) {
          ctx.strokeStyle = v.chevronColor || v.strokeColor; ctx.lineWidth = 2.5;
          const spacing = h / (v.chevronCount + 1);
          for (let i = 1; i <= v.chevronCount; i++) {
            const cx = i * spacing;
            ctx.beginPath(); ctx.moveTo(cx - 6, -6); ctx.lineTo(cx, 0); ctx.lineTo(cx - 6, 6); ctx.stroke();
          }
        }
        break;
      }
      case 'circle': {
        const r = t.radius * scale;
        if (!v.outlineOnly) {
          ctx.fillStyle = v.fillColor.replace(/[\d.]+\)$/, flicker + ')');
          ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = v.strokeColor; ctx.lineWidth = v.strokeWidth;
        ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.stroke();
        if (v.dangerIcon) {
          ctx.font = '20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#FFF'; ctx.fillText(v.dangerIcon, t.x, t.y);
        }
        break;
      }
      case 'ring': {
        const outerR = t.radius * scale, innerR = t.innerRadius * scale;
        if (!v.outlineOnly) {
          ctx.fillStyle = v.fillColor.replace(/[\d.]+\)$/, flicker + ')');
          ctx.beginPath(); ctx.arc(t.x, t.y, outerR, 0, Math.PI * 2);
          ctx.arc(t.x, t.y, innerR, 0, Math.PI * 2, true); ctx.fill();
        }
        ctx.strokeStyle = v.strokeColor; ctx.lineWidth = v.strokeWidth;
        ctx.beginPath(); ctx.arc(t.x, t.y, outerR, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(t.x, t.y, innerR, 0, Math.PI * 2); ctx.stroke();
        break;
      }
      case 'cone': {
        const r = t.radius * scale;
        const halfArc = (t.arcDegrees * Math.PI / 180) / 2;
        ctx.beginPath(); ctx.moveTo(t.x, t.y);
        ctx.arc(t.x, t.y, r, t.angle - halfArc, t.angle + halfArc); ctx.closePath();
        if (!v.outlineOnly) {
          ctx.fillStyle = v.fillColor.replace(/[\d.]+\)$/, flicker + ')'); ctx.fill();
        }
        ctx.strokeStyle = v.strokeColor; ctx.lineWidth = v.strokeWidth; ctx.stroke();
        break;
      }
      case 'line': {
        ctx.strokeStyle = v.fillColor.replace(/[\d.]+\)$/, flicker + ')');
        ctx.lineWidth = t.lineWidth * scale; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke();
        ctx.strokeStyle = v.strokeColor; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke();
        break;
      }
      case 'cross': {
        const armHalf = (t.width || 20) / 2 * scale, armLen = (t.height || 100) * scale;
        if (!v.outlineOnly) {
          ctx.fillStyle = v.fillColor.replace(/[\d.]+\)$/, flicker + ')');
          ctx.fillRect(t.x - armLen/2, t.y - armHalf, armLen, armHalf*2);
          ctx.fillRect(t.x - armHalf, t.y - armLen/2, armHalf*2, armLen);
        }
        ctx.strokeStyle = v.strokeColor; ctx.lineWidth = v.strokeWidth;
        ctx.strokeRect(t.x - armLen/2, t.y - armHalf, armLen, armHalf*2);
        ctx.strokeRect(t.x - armHalf, t.y - armLen/2, armHalf*2, armLen);
        break;
      }
    }
    ctx.restore();
  }

  _drawHazard(ctx, h) {
    const v = h.visual;
    ctx.save();
    ctx.globalAlpha = 0.6 + 0.2 * Math.sin(Date.now() * 0.005);
    if (h.shapeType === 'circle') {
      ctx.fillStyle = v.fillColor;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = v.strokeColor; ctx.lineWidth = v.strokeWidth; ctx.stroke();
    }
    ctx.restore();
  }

  clearAll() { this.telegraphs = []; this.hazards = []; }

  getActiveAt(x, y) {
    const results = [];
    for (const t of this.telegraphs) {
      if (this._isPointInTelegraph(x, y, t)) results.push(t);
    }
    for (const h of this.hazards) {
      if (this._isPointInHazard(x, y, h)) results.push(h);
    }
    return results;
  }
}


