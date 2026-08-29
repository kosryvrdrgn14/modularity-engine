class UIManager {
  constructor(canvas, eventBus) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.eventBus = eventBus;
    this.levelUpOptions = null;
    this.endScreen = null;
  }

  showLevelUp(options) {
    this.levelUpOptions = options;
  }

  hideLevelUp() {
    this.levelUpOptions = null;
  }

  showEndScreen(result, stats) {
    this.endScreen = { result, stats };
    // Ensure stars are included
    if (stats && !stats.stars && result && result.stars) {
      this.endScreen.stats.stars = result.stars;
    }
  }

  hideEndScreen() {
    this.endScreen = null;
  }

  render() {
    if (this.levelUpOptions) this._renderLevelUp();
    if (this.endScreen) this._renderEndScreen();
  }

  _renderLevelUp() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#3B82F6';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL UP!', w / 2, h / 2 - 120);

    // Cards
    const cardWidth = 160;
    const cardHeight = 200;
    const spacing = 20;
    const startX = (w - (cardWidth * 3 + spacing * 2)) / 2;

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (cardWidth + spacing);
      const y = h / 2 - 80;

      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(x, y, cardWidth, cardHeight);
      ctx.strokeStyle = '#3B82F6';
      ctx.strokeRect(x, y, cardWidth, cardHeight);

      ctx.fillStyle = '#FFF';
      ctx.font = '14px monospace';
      ctx.fillText(`[${i + 1}]`, x + cardWidth / 2, y + 30);
      ctx.fillText(this.levelUpOptions[i]?.name || 'Upgrade', x + cardWidth / 2, y + 60);
    }

    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.fillText('Press 1, 2, or 3 to select', w / 2, h / 2 + 140);
  }

  _renderEndScreen() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, w, h);

    // Title
    const titles = { victory: 'VICTORY', survived: 'SURVIVED', defeat: 'DEFEATED' };
    const colors = { victory: '#FFD700', survived: '#FFF', defeat: '#EF4444' };
    
    ctx.fillStyle = colors[this.endScreen.result] || '#FFF';
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(titles[this.endScreen.result] || 'GAME OVER', w / 2, h / 2 - 50);

    // Stats
    if (this.endScreen.stats) {
      ctx.font = '16px monospace';
      ctx.fillStyle = '#CCC';
      const stats = this.endScreen.stats;
      ctx.fillText(`Time: ${stats.time || '0:00'}`, w / 2, h / 2 + 10);
      ctx.fillText(`Level: ${stats.level || 1}`, w / 2, h / 2 + 40);
      ctx.fillText(`Kills: ${stats.kills || 0}`, w / 2, h / 2 + 70);
      ctx.fillText(`Gold: ${stats.gold || 0}`, w / 2, h / 2 + 100);

      // Display stars
      if (stats.stars) {
        const starCount = stats.stars.three ? 3 : stats.stars.two ? 2 : stats.stars.one ? 1 : 0;
        const starY = h / 2 + 140;
        const starSize = 24;
        const starSpacing = 40;
        const startX = w / 2 - (starCount * starSpacing) / 2;

        for (let i = 0; i < 3; i++) {
          const sx = w / 2 - (3 * starSpacing) / 2 + i * starSpacing + starSpacing / 2;
          const filled = i < starCount;

          // Star shape
          ctx.save();
          ctx.translate(sx, starY);
          ctx.beginPath();
          for (let j = 0; j < 5; j++) {
            const angle = (j * 4 * Math.PI) / 5 - Math.PI / 2;
            const r = filled ? starSize / 2 : starSize / 2 - 2;
            ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
          }
          ctx.closePath();
          ctx.fillStyle = filled ? '#FFD700' : '#333';
          ctx.fill();
          ctx.strokeStyle = filled ? '#FFA500' : '#555';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }

        // Star label
        const labels = { 0: '', 1: '★ Completed', 2: '★★ Mastered', 3: '★★★ MASTERY!' };
        ctx.fillStyle = starCount === 3 ? '#FFD700' : starCount === 2 ? '#4FC3F7' : '#CCC';
        ctx.font = starCount === 3 ? 'bold 18px monospace' : '14px monospace';
        ctx.fillText(labels[starCount] || '', w / 2, starY + starSize + 10);
      }
    }

    ctx.fillStyle = '#666';
    ctx.font = '14px monospace';
    ctx.fillText('Click to restart', w / 2, h / 2 + 190);
  }
}

// ============================================================
// PHASE 14: AUDIO SYSTEM (Full Implementation)
// ============================================================
