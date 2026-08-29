class TitleMenu {
  constructor(game) {
    this.game = game;
    this.selectedIndex = 0;
    this.items = [
      { action: 'play', locked: false },
      { action: 'characters', locked: true },
      { action: 'stages', locked: true },
      { action: 'settings', locked: false },
      { action: 'test-town', locked: false },
      { action: 'dev-stage', locked: false },
    ];
    this.dom = {
      screen: document.getElementById('title-screen'),
      menu: document.getElementById('title-menu'),
      tooltip: document.getElementById('title-tooltip'),
      infoVersion: document.getElementById('info-version'),
      infoBestRun: document.getElementById('info-best-run'),
      infoTotalGold: document.getElementById('info-total-gold'),
    };
    this._tooltipTimer = null;
    this._boundKeyDown = this._handleKeyDown.bind(this);
    this._boundClick = this._handleClick.bind(this);
    this._boundMouseMove = this._handleMouseMove.bind(this);
  }

  show() {
    this.dom.screen.classList.add('active');
    this.selectedIndex = 0;
    this._updateSelection();
    this._updateInfo();
    this._bindEvents();
    this.dom.screen.addEventListener('click', this._boundClick);
    this.dom.screen.addEventListener('mousemove', this._boundMouseMove);
  }

  hide() {
    this.dom.screen.classList.remove('active');
    this._unbindEvents();
    this.dom.screen.removeEventListener('click', this._boundClick);
    this.dom.screen.removeEventListener('mousemove', this._boundMouseMove);
    this._hideTooltip();
  }

  _bindEvents() {
    document.addEventListener('keydown', this._boundKeyDown);
  }

  _unbindEvents() {
    document.removeEventListener('keydown', this._boundKeyDown);
  }

  _handleKeyDown(e) {
    if (!this.dom.screen.classList.contains('active')) return;
    if (document.getElementById('settings-screen').classList.contains('active')) return;

    switch(e.key) {
      case 'ArrowUp': case 'w': case 'W':
        e.preventDefault();
        this._moveSelection(-1);
        break;
      case 'ArrowDown': case 's': case 'S':
        e.preventDefault();
        this._moveSelection(1);
        break;
      case 'Enter': case ' ':
        e.preventDefault();
        this._select();
        break;
    }
  }

  _handleClick(e) {
    const item = e.target.closest('.menu-item');
    if (!item) return;
    const idx = parseInt(item.dataset.index);
    if (isNaN(idx)) return;
    this.selectedIndex = idx;
    this._updateSelection();
    this._select();
  }

  _handleMouseMove(e) {
    const item = e.target.closest('.menu-item');
    if (!item) return;
    const idx = parseInt(item.dataset.index);
    if (isNaN(idx) || idx === this.selectedIndex) return;
    this.selectedIndex = idx;
    this._updateSelection();
    if (this.game.audioManager) this.game.audioManager.playMenuSound('hover');
  }

  _moveSelection(dir) {
    const len = this.items.length;
    this.selectedIndex = (this.selectedIndex + dir + len) % len;
    this._updateSelection();
    if (this.game.audioManager) this.game.audioManager.playMenuSound('navigate');
  }

  _updateSelection() {
    const items = this.dom.menu.querySelectorAll('.menu-item');
    items.forEach((el, i) => {
      el.classList.toggle('selected', i === this.selectedIndex);
    });
  }

  _select() {
    const item = this.items[this.selectedIndex];
    if (item.locked) {
      if (this.game.audioManager) this.game.audioManager.playMenuSound('locked');
      this._showTooltip('Complete more runs to unlock!');
      return;
    }
    if (this.game.audioManager) this.game.audioManager.playMenuSound('select');

    switch(item.action) {
      case 'play':
        this.game._startFromTitle();
        break;
      case 'settings':
        this.game._showSettings();
        break;
      case 'test-town':
        this.game._testTown();
        break;
      case 'dev-stage':
        this._showStageSelector();
        break;
    }
  }

  _showStageSelector() {
    let overlay = document.getElementById('dev-stage-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'dev-stage-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;';
      document.body.appendChild(overlay);
    }

    // Weapon name map
    const weaponNames = { w1_projectile: 'Projectile', w2_orbit: 'Orbit', weapon_area_pulse: 'Area', w4_flame_wave: 'Flame Wave', w5_arcane_bolt: 'Arcane Bolt' };
    const tierIcons = { quick: '\u26a1', standard: '\u2694\ufe0f', highlight: '\u{1f525}' };
    const tierLabels = { quick: 'Quick', standard: 'Standard', highlight: 'Highlight' };
    const tierColors = { quick: '#4FC3F7', standard: '#FFD700', highlight: '#FF5722' };

    const stages = this.game.dataManager?.getStageList?.() || [];
    let html = '<div style="background:#1a1a2e;border:2px solid #FFD700;border-radius:12px;padding:20px;max-width:90%;width:380px;max-height:85vh;overflow-y:auto;">';
    html += '<div style="color:#FFD700;font-size:18px;font-weight:bold;margin-bottom:4px;text-align:center;">\u{1f9ea} Dev: Stage Select</div>';
    html += '<div style="color:#666;font-size:11px;text-align:center;margin-bottom:16px;">Choose stage \u2192 Choose tier</div>';

    if (stages.length === 0) {
      html += '<div style="color:#666;text-align:center;">No stages loaded</div>';
    }

    for (let si = 0; si < stages.length; si++) {
      const stage = stages[si];
      const bossEnemy = this.game.dataManager.enemies?.find(e => e.id === stage.bossConfig?.enemyId);
      const enemyCount = stage.waves?.reduce((sum, w) => sum + (w.enemyTypes?.length || 0), 0) || 0;

      html += '<div style="margin-bottom:16px;">';
      html += '<div style="color:#4FC3F7;font-size:15px;font-weight:bold;">' + (stage.name || stage.id) + '</div>';
      if (stage.description) {
        html += '<div style="color:#888;font-size:11px;margin-bottom:6px;">' + stage.description + '</div>';
      }
      // Stage info badges
      html += '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">';
      if (bossEnemy) html += '<span style="background:#3D1F4D;color:#C77DFF;font-size:10px;padding:2px 6px;border-radius:4px;">Boss: ' + bossEnemy.name + '</span>';
      html += '<span style="background:#1a3310;color:#4CAF50;font-size:10px;padding:2px 6px;border-radius:4px;">' + (stage.waves?.length || 0) + ' waves</span>';
      html += '</div>';

      for (const [tierKey, loadout] of Object.entries(stage.weaponLoadouts || {})) {
        const icon = tierIcons[tierKey] || '';
        const label = tierLabels[tierKey] || tierKey;
        const color = tierColors[tierKey] || '#e0e0e0';
        const mins = Math.floor(loadout.duration / 60);
        const secs = loadout.duration % 60;
        const timeStr = mins + ':' + String(secs).padStart(2, '0');
        const weaponNamesStr = (loadout.weapons || []).map(w => weaponNames[w] || w).join(', ');

        html += '<div class="dev-tier-btn" data-stage="' + stage.id + '" data-tier="' + tierKey + '" ';
        html += 'style="background:#0d0d1a;border:1px solid #333;border-radius:8px;padding:10px 12px;margin-bottom:6px;cursor:pointer;color:#e0e0e0;transition:border-color 0.15s;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span style="font-size:13px;font-weight:bold;color:' + color + ';">' + icon + ' ' + label + '</span>';
        html += '<span style="font-size:12px;color:#FFD700;">' + timeStr + '</span>';
        html += '</div>';
        html += '<div style="font-size:10px;color:#666;margin-top:4px;">' + weaponNamesStr + '</div>';
        html += '<div style="font-size:10px;color:#555;margin-top:2px;">' + (loadout.description || '') + '</div>';
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    overlay.innerHTML = html;

    // Wire click handlers
    overlay.querySelectorAll('.dev-tier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const stageId = btn.dataset.stage;
        const tier = btn.dataset.tier;
        this.game.gameManager.set('session.selected_stage_id', stageId);
        this.game.gameManager.set('session.current_stage_tier', tier);
        overlay.style.display = 'none';
        if (this.game.audioManager) this.game.audioManager.playMenuSound('select');
        this.game._startFromTitle();
      });
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#FFD700'; });
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = '#333'; });
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.style.display = 'none';
    });
    overlay.style.display = 'flex';
  }

  _showTooltip(text) {
    this.dom.tooltip.textContent = text;
    this.dom.tooltip.classList.add('visible');
    clearTimeout(this._tooltipTimer);
    this._tooltipTimer = setTimeout(() => this._hideTooltip(), 2000);
  }

  _hideTooltip() {
    this.dom.tooltip.classList.remove('visible');
    clearTimeout(this._tooltipTimer);
  }

  _updateInfo() {
    const gm = this.game.gameManager;
    if (!gm) return;
    const gold = gm.get_resource('gold') || gm.get_currency() || 0;
    const runs = gm.get_counter('total_runs') || 0;
    const bestTime = gm.get_counter('best_time') || 0;
    const bestLevel = gm.get_counter('best_level') || 0;
    this.dom.infoTotalGold.textContent = `Gold: ${gold}`;
    if (bestTime > 0) {
      const min = Math.floor(bestTime / 60);
      const sec = Math.floor(bestTime % 60);
      this.dom.infoBestRun.textContent = `Best: ${min}:${String(sec).padStart(2,'0')} Lv${bestLevel}`;
    } else if (runs > 0) {
      this.dom.infoBestRun.textContent = `Runs: ${runs}`;
    }
  }
}

// ============================================================
// MAIN GAME
// ============================================================



// ============================================================
// STORAGE BACKEND (Engine-agnostic storage interface)
// ============================================================
