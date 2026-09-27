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
    // §23: combat pause menu overlay
    this._pauseOverlay = document.getElementById('pause-overlay');
    // ── §10 screen-2 migration (v2.14.0): pause/end buttons are WIDGET CARDS —
    // fixed card sets rendered once here, events DECLARED on each def, ids
    // preserved (trace clicks them). Widget CustomEvents bridge to the bus;
    // re-shows never stack listeners because render happens once.
    this.widgetRenderer = new WidgetRenderer({ skins: null });
    this._renderFixedActionCards();
    // Bridge: declared widget events surface on the central bus.
    document.addEventListener('widget:pauseMenuAction', (e) => this.eventBus.emit('pauseMenuAction', e.detail || {}));
    document.addEventListener('widget:restart', () => this.eventBus.emit('restart', {}));
    document.addEventListener('widget:endScreenDismiss', () => this.eventBus.emit('endScreenDismiss', {}));
  }

  /** Fixed action cards (pause menu + end screen) — data-declared, rendered
   *  once; hidden containers until their overlay activates. */
  _renderFixedActionCards() {
    const R = this.widgetRenderer;
    const mk = (hostId, defs) => {
      const host = document.getElementById(hostId);
      if (!host) return;
      host.innerHTML = '';
      for (const d of defs) {
        const el = R.render({
          template: 'card', _v: 1, layout: 'text-only-row', size: 'medium',
          slots: { primaryText: { bind: 'label' } },
          onClick: { emit: d.emit, payload: d.payload || {} },
        }, { label: d.label });
        el.id = d.id;
        if (d.cls) el.classList.add(d.cls);
        host.appendChild(el);
      }
    };
    mk('pause-actions', [
      { id: 'pause-resume', label: '[1] Resume', cls: 'primary', emit: 'widget:pauseMenuAction', payload: { action: 'resume' } },
      { id: 'pause-exit', label: '[2] Exit to Town (run is saved)', emit: 'widget:pauseMenuAction', payload: { action: 'exit' } },
      { id: 'pause-quit', label: '[3] Quit to Title (run is saved)', emit: 'widget:pauseMenuAction', payload: { action: 'quit' } },
    ]);
    mk('end-actions', [
      { id: 'end-retry', label: '⟲ Retry (R)', cls: 'primary', emit: 'widget:restart' },
      { id: 'end-town', label: '🏘 Return to Town (any key)', emit: 'widget:endScreenDismiss' },
    ]);
  }

  showLevelUp(options) {
    this.levelUpOptions = options;
    this._showLevelUpOverlay(options);
  }

  hideLevelUp() {
    this.levelUpOptions = null;
    this._hideLevelUpOverlay();
  }

  // ── §23: combat pause menu overlay ──
  showPauseMenu(snapshot) {
    if (!this._pauseOverlay) return;
    const el = this._pauseOverlay.querySelector('#pause-snapshot');
    if (el) el.textContent = snapshot;
    this._pauseOverlay.classList.add('active');
  }

  hidePauseMenu() {
    if (this._pauseOverlay) this._pauseOverlay.classList.remove('active');
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
    // §23.6: end-screen buttons are widget cards (v2.14.0) — events already
    // declared/bridged; showing is just the overlay class. Keyboard paths
    // R → retry / any-key → town are unchanged.
    const bar = document.getElementById('end-actions');
    if (bar) bar.classList.add('active');
  }

  hideEndScreen() {
    this.endScreen = null;
    const bar = document.getElementById('end-actions');
    if (bar) bar.classList.remove('active');
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
    // B24 (v2.19.31): end screen is canvas-drawn — keep it in CSS-pixel units
    // (the backing store is devicePixelRatio-scaled; raw pixels were 1/3 size
    // on phones).
    const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
    ctx.save();
    ctx.scale(dpr, dpr);
    const w = this.canvas.width / dpr;
    const h = this.canvas.height / dpr;

    // B26 (v2.19.33): the end screen is a BLOCK of centered text — on a
    // narrow phone the desktop-authored center-anchored stack runs out of
    // screen (B15/B17 class, canvas sibling) and the small stats read poorly
    // in a hand. Narrow/touch viewports get a compact BOTTOM-anchored layout
    // (title, stars, stats — leaving room for the DOM action bar above the
    // joystick zone); wide fine-pointer (desktop) stays pixel-identical to
    // v2.19.31. Touch drops the keyboard-hint lines: the big Retry/Town
    // buttons + any-key dismissal are the real affordances there.
    const coarse = typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(pointer: coarse)').matches;
    const narrow = w < 500;

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
      const stats = this.endScreen.stats;
      const compact = narrow || coarse;
      const titleSize = compact ? 20 : 16;
      ctx.font = titleSize + 'px monospace';
      ctx.fillStyle = '#CCC';
      if (compact) {
        // Bottom-anchored column: title/stars near the middle, stats read
        // downward, everything ends above the DOM action bar (bottom ~150px).
        let y = h * 0.52;
        ctx.fillText(`Time: ${stats.time || '0:00'}`, w / 2, y); y += 30;
        ctx.fillText(`Level: ${stats.level || 1}`, w / 2, y); y += 30;
        ctx.fillText(`Kills: ${stats.kills || 0}`, w / 2, y); y += 34;

        // BUG-029 breakdown — wrapped to the viewport (the desktop one-liner
        // ran off-screen on 390px with 4 enemy types).
        const killsByType = stats.kills_by_type || {};
        const typeKeys = Object.keys(killsByType).filter(k => killsByType[k] > 0);
        if (typeKeys.length > 0) {
          ctx.font = '14px monospace';
          ctx.fillStyle = '#9E9E9E';
          const parts = typeKeys.map(k => `${k}: ${killsByType[k]}`);
          const maxPx = w - 24;
          let line = '';
          for (const p of parts) {
            const next = line ? line + ' \u00b7 ' + p : p;
            if (ctx.measureText(next).width > maxPx && line) { ctx.fillText(line, w / 2, y); y += 20; line = p; }
            else line = next;
          }
          if (line) { ctx.fillText(line, w / 2, y); y += 22; }
        }
        ctx.font = titleSize + 'px monospace';
        ctx.fillStyle = '#CCC';
        ctx.fillText(`Gold: ${stats.gold || 0}`, w / 2, y); y += 30;

        // Stars
        if (stats.stars) {
          const starCount = stats.stars.three ? 3 : stats.stars.two ? 2 : stats.stars.one ? 1 : 0;
          const starY = y + 26;
          const starSize = 26;
          const starSpacing = 44;
          for (let i = 0; i < 3; i++) {
            const sx = w / 2 - starSpacing + i * starSpacing;
            const filled = i < starCount;
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
          const labels = { 0: '', 1: '★ Completed', 2: '★★ Mastered', 3: '★★★ MASTERY!' };
          ctx.fillStyle = starCount === 3 ? '#FFD700' : starCount === 2 ? '#4FC3F7' : '#CCC';
          ctx.font = 'bold 15px monospace';
          ctx.fillText(labels[starCount] || '', w / 2, starY + starSize + 2);
        }
      } else {
        // Desktop layout — unchanged since v2.19.31 (do not retune).
        ctx.fillText(`Time: ${stats.time || '0:00'}`, w / 2, h / 2 + 10);
        ctx.fillText(`Level: ${stats.level || 1}`, w / 2, h / 2 + 40);
        ctx.fillText(`Kills: ${stats.kills || 0}`, w / 2, h / 2 + 70);

        // BUG-029: per-monster-type kill breakdown — testing/verification aid
        // for type-specific features (quests, drops). Ids come from the death
        // events' enemyType (the monster definition id in enemies.json).
        const killsByType = stats.kills_by_type || {};
        const typeKeys = Object.keys(killsByType).filter(k => killsByType[k] > 0);
        if (typeKeys.length > 0) {
          ctx.font = '12px monospace';
          ctx.fillStyle = '#9E9E9E';
          ctx.fillText(typeKeys.map(k => `${k}: ${killsByType[k]}`).join('  \u00b7  '), w / 2, h / 2 + 90);
        }
        ctx.fillText(`Gold: ${stats.gold || 0}`, w / 2, h / 2 + 108);

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
    }

    // v1.9.9 (BUG-023 resolution 2): the end screen waits for the player —
    // no auto-return, no accidental restart. Any key/click → town; R → again.
    // B26: the keyboard hints are a FINE-POINTER affordance only — touch
    // users have the big Retry/Town buttons and tap-anywhere dismissal.
    if (!coarse) {
      ctx.fillStyle = '#AAA';
      ctx.font = '14px monospace';
      ctx.fillText('Press any key to continue', w / 2, h / 2 + 186);
      ctx.fillStyle = '#666';
      ctx.font = '12px monospace';
      ctx.fillText('[R] fight again', w / 2, h / 2 + 208);
    }
    ctx.restore(); // B24
  }
}

// ============================================================
// PHASE 14: AUDIO SYSTEM (Full Implementation)
// ============================================================

