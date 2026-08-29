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
    }
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
