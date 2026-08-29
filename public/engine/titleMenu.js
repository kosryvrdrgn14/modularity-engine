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
    // Create or reuse overlay
    let overlay = document.getElementById('dev-stage-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'dev-stage-overlay';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;';
      overlay.innerHTML = `
        <div style="background:#1a1a2e;border:2px solid #FFD700;border-radius:12px;padding:24px;max-width:90%;width:340px;">
          <div style="color:#FFD700;font-size:18px;font-weight:bold;margin-bottom:16px;text-align:center;">🧪 Dev: Stage Select</div>
          <div id="dev-stage-options"></div>
          <div style="color:#666;font-size:11px;margin-top:12px;text-align:center;">Choose tier → auto-applies loadout + multipliers</div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    const optionsEl = overlay.querySelector('#dev-stage-options');
    optionsEl.innerHTML = '';

    const tiers = [
      { key: 'quick', label: '⚡ Quick (3 min)', desc: 'Frontloaded weapons, fast spawns', duration: 180 },
      { key: 'standard', label: '⚔️ Standard (5 min)', desc: 'Balanced gameplay', duration: 300 },
      { key: 'highlight', label: '🔥 Highlight (10 min)', desc: 'Scaling weapons, extended run', duration: 600 },
    ];

    for (const tier of tiers) {
      const btn = document.createElement('div');
      btn.style.cssText = 'background:#0d0d1a;border:1px solid #333;border-radius:8px;padding:12px;margin-bottom:8px;cursor:pointer;color:#e0e0e0;';
      btn.innerHTML = `<div style="font-size:15px;font-weight:bold;">${tier.label}</div><div style="font-size:11px;color:#888;margin-top:4px;">${tier.desc}</div>`;
      btn.addEventListener('click', () => {
        this.game.gameManager.set('session.current_stage_tier', tier.key);
        overlay.style.display = 'none';
        if (this.game.audioManager) this.game.audioManager.playMenuSound('select');
        this.game._startFromTitle();
      });
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#FFD700'; });
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = '#333'; });
      optionsEl.appendChild(btn);
    }

    // Close on backdrop click
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
