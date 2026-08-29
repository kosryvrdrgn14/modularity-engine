class Renderer {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = camera;
    this.pulseEffects = [];
    this.bossEntity = null;
    this._telegraphSystem = null;
    this._announcements = [];
    this._announcementTimer = 0;
    this._dimOverlay = null;
    this.imageCache = null;
  }

  addPulseEffect(x, y, radius, color) {
    this.pulseEffects.push({ x, y, radius, color, age: 0, maxAge: 0.5 });
  }

  _updateAndDrawPulses(dt) {
    for (let i = this.pulseEffects.length - 1; i >= 0; i--) {
      const p = this.pulseEffects[i];
      p.age += dt || 1/60;
      if (p.age >= p.maxAge) {
        this.pulseEffects.splice(i, 1);
        continue;
      }
      const progress = p.age / p.maxAge;
      const currentRadius = p.radius * progress;
      const ctx = this.ctx;
      
      // Semi-transparent fill (shockwave body)
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.25 * (1 - progress);
      ctx.fill();
      
      // Bright stroke (shockwave edge)
      ctx.beginPath();
      ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = 0.7 * (1 - progress);
      ctx.lineWidth = 5;
      ctx.stroke();
      
      ctx.globalAlpha = 1;
    }
  }

  clear() {
    this.ctx.fillStyle = '#1A1A2E';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  render(entities, player) {
    this.clear();
    this.ctx.save();
    this.camera.apply(this.ctx);

    // Draw grid
    this._drawGrid();

    // Draw telegraphs and hazards (under entities)
    if (this._telegraphSystem) this._telegraphSystem.render(this.ctx);

    // Draw entities (y-sorted, filter active first to avoid NaN from dead entities)
    const sorted = entities.filter(e => e.active).sort((a, b) => a.y - b.y);
    for (const entity of sorted) {
      this._drawEntity(entity);
    }

    // Draw pulse effects (after entities, before camera restore)
    this._updateAndDrawPulses(1/60);

    this.ctx.restore();

    // Draw UI overlay (not affected by camera)
    this._drawUI(player);
  }

  _drawGrid() {
    const gridSize = 50;
    const startX = Math.floor(this.camera.x / gridSize) * gridSize;
    const startY = Math.floor(this.camera.y / gridSize) * gridSize;
    
    this.ctx.strokeStyle = '#16213E';
    this.ctx.lineWidth = 1;
    
    for (let x = startX; x < this.camera.x + this.canvas.width + gridSize; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, this.camera.y);
      this.ctx.lineTo(x, this.camera.y + this.canvas.height);
      this.ctx.stroke();
    }
    for (let y = startY; y < this.camera.y + this.canvas.height + gridSize; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.camera.x, y);
      this.ctx.lineTo(this.camera.x + this.canvas.width, y);
      this.ctx.stroke();
    }
  }

  _drawEntity(entity) {
    const ctx = this.ctx;
    ctx.save();
    
    // iFrame blink
    if (entity.iFrames > 0 && Math.floor(entity.iFrames * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const x = Math.round(entity.x);
    const y = Math.round(entity.y);
    const size = entity.size;
    const color = entity.visual?.color || '#FFF';
    const shape = entity.visual?.shape || 'square';

    // SVG REPLACEMENT: check image cache first, fall back to shapes
    const cacheKey = (entity.type || 'unknown') + '_' + shape + '_' + color;
    const svgImage = this.imageCache && this.imageCache[cacheKey];
    if (svgImage && svgImage.complete && svgImage.naturalWidth > 0) {
      const drawSize = size * 2;
      ctx.drawImage(svgImage, x - size, y - size, drawSize, drawSize);
    } else {
      ctx.fillStyle = color;
      if (shape === 'square') {
        ctx.fillRect(x - size, y - size, size * 2, size * 2);
      } else if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      } else if (shape === 'diamond') {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
      } else if (shape === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(x, y - size);
        ctx.lineTo(x + size, y + size);
        ctx.lineTo(x - size, y + size);
        ctx.closePath();
        ctx.fill();
      } else if (shape === 'star') {
        this._drawStar(x, y, size, 5);
      }
    }

    ctx.restore();
  }

  _drawStar(x, y, radius, points) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? radius : radius * 0.5;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      if (i === 0) ctx.moveTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
      else ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
  }

  showAnnouncement(text, styling) {
    this._announcements.push({
      text: text,
      elapsed: 0,
      duration: styling.holdDuration || 3.0,
      fontSize: styling.fontSize || 24,
      color: styling.color || '#FFFFFF',
      position: styling.position || 'center',
      animation: styling.animation || 'fadeInHoldFadeOut',
    });
  }

  startDimming(brightness) {
    this._dimOverlay = {
      brightness: brightness,
      elapsed: 0,
      duration: 2.0,
    };
  }

  renderAnnouncements(dt) {
    // Update announcements
    for (let i = this._announcements.length - 1; i >= 0; i--) {
      const a = this._announcements[i];
      a.elapsed += dt;
      if (a.elapsed >= a.duration) {
        this._announcements.splice(i, 1);
      }
    }
    // Update dim overlay
    if (this._dimOverlay) {
      this._dimOverlay.elapsed += dt;
      if (this._dimOverlay.elapsed >= this._dimOverlay.duration) {
        this._dimOverlay = null;
      }
    }
  }

  _drawAnnouncements() {
    if (this._announcements.length === 0 && !this._dimOverlay) return;
    
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Dim overlay
    if (this._dimOverlay) {
      const alpha = this._dimOverlay.elapsed < 1.0
        ? this._dimOverlay.elapsed * (1 - this._dimOverlay.brightness)
        : (1 - this._dimOverlay.brightness);
      ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(0, 0, w, h);
    }
    
    // Announcement text
    for (const a of this._announcements) {
      const progress = a.elapsed / a.duration;
      let alpha = 1;
      if (a.animation === 'fadeInHoldFadeOut') {
        if (progress < 0.15) alpha = progress / 0.15;
        else if (progress > 0.8) alpha = (1 - progress) / 0.2;
      } else if (a.animation === 'slam') {
        if (progress < 0.1) alpha = progress / 0.1;
        else if (progress > 0.85) alpha = (1 - progress) / 0.15;
      }
      alpha = Math.max(0, Math.min(1, alpha));
      
      const scale = a.animation === 'slam' && progress < 0.15
        ? 1 + (1 - progress / 0.15) * 0.5 : 1;
      
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${a.fontSize * scale}px "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Text shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillText(a.text, w / 2 + 2, h / 2 + 2);
      
      // Main text
      ctx.fillStyle = a.color;
      ctx.fillText(a.text, w / 2, h / 2);
      ctx.restore();
    }
  }

  _drawBossIntro(overlay) {
    if (!overlay) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const progress = overlay.elapsed / overlay.totalDuration;
    
    // Dark overlay
    let dimAlpha = 0;
    if (progress < 0.15) dimAlpha = progress / 0.15;
    else if (progress > 0.85) dimAlpha = (1 - progress) / 0.15;
    else dimAlpha = 1;
    dimAlpha = Math.max(0, Math.min(1, dimAlpha));
    
    ctx.save();
    ctx.fillStyle = overlay.dimColor.replace(/[\d.]+\)$/, (dimAlpha * 0.75) + ')');
    ctx.fillRect(0, 0, w, h);
    
    // Boss name
    let nameAlpha = 0;
    if (progress >= 0.1 && progress < 0.25) nameAlpha = (progress - 0.1) / 0.15;
    else if (progress > 0.85) nameAlpha = (1 - progress) / 0.15;
    else if (progress >= 0.25) nameAlpha = 1;
    nameAlpha = Math.max(0, Math.min(1, nameAlpha));
    
    const nameScale = progress < 0.2 ? 1 + (1 - (progress - 0.1) / 0.1) * 0.3 : 1;
    
    ctx.globalAlpha = nameAlpha;
    ctx.font = `bold ${overlay.nameFontSize * nameScale}px "Segoe UI", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillText(overlay.bossName, w / 2 + 3, h / 2 - 10 + 3);
    ctx.fillStyle = overlay.nameColor;
    ctx.fillText(overlay.bossName, w / 2, h / 2 - 10);
    
    // Subtitle
    let subAlpha = 0;
    if (progress >= 0.2 && progress < 0.35) subAlpha = (progress - 0.2) / 0.15;
    else if (progress > 0.85) subAlpha = (1 - progress) / 0.15;
    else if (progress >= 0.35) subAlpha = 1;
    subAlpha = Math.max(0, Math.min(1, subAlpha));
    
    ctx.globalAlpha = subAlpha;
    ctx.font = `${overlay.subtitleFontSize}px "Segoe UI", Arial, sans-serif`;
    ctx.fillStyle = overlay.subtitleColor;
    ctx.fillText(overlay.bossSubtitle, w / 2, h / 2 + 25);
    
    // Skip hint
    if (overlay.allowSkip && progress > 0.3 && progress < 0.85) {
      ctx.globalAlpha = 0.5;
      ctx.font = '14px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = '#AAA';
      ctx.fillText('Tap or press Space to skip', w / 2, h - 60);
    }
    
    ctx.restore();
  }

  _drawUI(player) {
    if (!player) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // HP Bar
    const hpPercent = player.hp / player.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(10, 10, 200, 16);
    ctx.fillStyle = hpPercent > 0.25 ? '#EF4444' : '#FF0000';
    ctx.fillRect(10, 10, 200 * hpPercent, 16);
    ctx.strokeStyle = '#FFF';
    ctx.strokeRect(10, 10, 200, 16);

    // Level
    ctx.fillStyle = '#3B82F6';
    ctx.beginPath();
    ctx.arc(w - 30, 18, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.level || 1, w - 30, 22);

    // Boss Health Bar (if boss is alive)
    if (this.bossEntity && this.bossEntity.active) {
      const bossHp = this.bossEntity.hp / this.bossEntity.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(w/2 - 120, 40, 240, 14);
      ctx.fillStyle = bossHp > 0.25 ? '#C0392B' : '#FF0000';
      ctx.fillRect(w/2 - 120, 40, 240 * bossHp, 14);
      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 1;
      ctx.strokeRect(w/2 - 120, 40, 240, 14);
      ctx.fillStyle = '#FFF';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('THE GRAVEKEEPER', w/2, 51);
    }

    // EXP Bar
    ctx.fillStyle = '#333';
    ctx.fillRect(0, h - 20, w, 20);
    ctx.fillStyle = '#4FC3F7';
    ctx.fillRect(0, h - 20, w * (this.xpPercent || 0), 20);
  }
}

// ============================================================
// PHASE 12b: FLOATING TEXT SYSTEM
// ============================================================
