class FloatingTextSystem {
  constructor(eventBus) {
    this.texts = [];
    eventBus.on('damage', (data) => this._onDamage(data));
    eventBus.on('pickup', (data) => this._onPickup(data));
  }

  _onDamage(data) {
    if (!data.position) return;
    const isCrit = data.isCrit;
    this.texts.push({
      x: data.position.x + (Math.random() - 0.5) * 10,
      y: data.position.y - 10,
      text: isCrit ? `${data.damage}!` : `${data.damage}`,
      color: isCrit ? '#FFD700' : '#FFF',
      fontSize: isCrit ? 16 : 12,
      age: 0,
      maxAge: 0.8,
      vy: -40,
    });
  }

  _onPickup(data) {
    if (!data.pickup?.pickupData) return;
    const pd = data.pickup.pickupData;
    let text = '', color = '#FFF';
    if (pd.id === 'exp_small') { text = `+${pd.value} XP`; color = '#4FC3F7'; }
    else if (pd.id === 'gold_coin') { text = `+${pd.value} G`; color = '#FFD700'; }
    else if (pd.id === 'pickup_weapon_level_up') { text = 'WEAPON UP!'; color = '#FF9100'; }
    else if (pd.id === 'screen_wipe') { text = 'SCREEN WIPE!'; color = '#00E676'; }
    else if (pd.id === 'magnet') { text = 'MAGNET!'; color = '#FF4081'; }
    if (text) {
      this.texts.push({
        x: data.player.x + (Math.random() - 0.5) * 20,
        y: data.player.y - 20,
        text, color,
        fontSize: pd.id.includes('wipe') || pd.id === 'magnet' ? 14 : 10,
        age: 0, maxAge: 1.0, vy: -30,
      });
    }
  }

  update(dt) {
    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.age += dt;
      t.y += t.vy * dt;
      if (t.age >= t.maxAge) {
        this.texts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const t of this.texts) {
      const alpha = Math.max(0, 1 - t.age / t.maxAge);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.fontSize}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}

// ============================================================
// PHASE 13: UI SYSTEM
// ============================================================

// --- UIManager ---
// HUD, level-up screen, end screens
