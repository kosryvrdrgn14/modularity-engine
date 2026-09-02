class UIManager {
  constructor(canvas, eventBus) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.eventBus = eventBus;
    this.levelUpOptions = null;
    this.endScreen = null;
    // HTML overlay for level-up (reliable click/touch)
    this._levelupOverlay = document.getElementById('levelup-overlay');
    this._levelupCards = document.getElementById('levelup-cards');
  }

  showLevelUp(options) {
    this.levelUpOptions = options;
    this._showLevelUpOverlay(options);
  }

  hideLevelUp() {
    this.levelUpOptions = null;
    this._hideLevelUpOverlay();
  }

  _showLevelUpOverlay(options) {
    if (!this._levelupOverlay || !this._levelupCards) return;
    // Build HTML cards
    this._levelupCards.innerHTML = '';
    options.forEach((opt, i) => {
      const card = document.createElement('div');
      card.className = 'levelup-card';
      card.innerHTML = `<div class="card-key">[${i + 1}]</div><div class="card-name">${opt.name || 'Upgrade'}</div><div class="card-desc">${opt.desc || ''}</div>`;
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.eventBus.emit('selectUpgrade', { index: i });
      });
      card.addEventListener('touchend', (e) => {
        e.stopPropagation();
        e.preventDefault();
        this.eventBus.emit('selectUpgrade', { index: i });
      });
      this._levelupCards.appendChild(card);
    });
    this._levelupOverlay.classList.add('active');
  }

  _hideLevelUpOverlay() {
    if (!this._levelupOverlay) return;
    this._levelupOverlay.classList.remove('active');
    this._levelupCards.innerHTML = '';
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
    // Level-up uses HTML overlay now, no canvas drawing needed
    if (this.endScreen) this._renderEndScreen();
  }

  _renderLevelUp() {
    // Deprecated: level-up now uses HTML overlay
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