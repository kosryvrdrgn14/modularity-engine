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
        if (this.game.audioManager) this.game.audioManager.playMenuSound('select');
        this._showWeaponSelector(btn.dataset.stage, btn.dataset.tier);
      });
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#FFD700'; });
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = '#333'; });
    });      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.style.display = 'none';
      });
      overlay.style.display = 'flex';
    }

  _showWeaponSelector(stageId, stageTier) {
    const overlay = document.getElementById('dev-stage-overlay');
    if (!overlay) return;

    // Weapon catalog: all weapons from data
    const allWeapons = this.game.dataManager?.weapons || [];
    const allWeaponDefs = [
      { id: 'w1_projectile', name: 'Projectile', icon: '\u{1f3f9}', type: 'ranged', unlockLevel: 1 },
      { id: 'w2_orbit', name: 'Orbit', icon: '\u{1f504}', type: 'ranged', unlockLevel: 3 },
      { id: 'weapon_area_pulse', name: 'Area', icon: '\u{1f4a5}', type: 'ranged', unlockLevel: 6 },
      { id: 'w4_flame_wave', name: 'Flame Wave', icon: '\u{1f525}', type: 'ranged', unlockLevel: 4 },
      { id: 'w5_arcane_bolt', name: 'Arcane Bolt', icon: '\u26a1', type: 'ranged', unlockLevel: 5 },
      { id: 'w6_shadow_dagger', name: 'Dagger', icon: '\u{1f5e1}\ufe0f', type: 'melee', unlockLevel: 1 },
      { id: 'w7_soul_whip', name: 'Whip', icon: '\u2694\ufe0f', type: 'melee', unlockLevel: 1 },
      { id: 'w8_grave_claymore', name: 'Claymore', icon: '\u{1fa93}', type: 'melee', unlockLevel: 1 },
    ];

    // Default: stage loadout weapons pre-filled
    const stageData = this.game.dataManager?.stages;
    const stageLoadout = stageData?.weaponLoadouts?.[stageTier];
    const defaultWeapons = stageLoadout?.weapons || ['w1_projectile', 'w2_orbit', 'weapon_area_pulse'];
    const selected = [defaultWeapons[0] || null, defaultWeapons[1] || null, defaultWeapons[2] || null];

    const self = this;

    function renderWeaponGrid() {
      let html = '<div style="background:#1a1a2e;border:2px solid #FFD700;border-radius:12px;padding:20px;max-width:90%;width:380px;max-height:85vh;overflow-y:auto;">';
      html += '<div style="color:#FFD700;font-size:18px;font-weight:bold;margin-bottom:4px;text-align:center;">\u2694\ufe0f Dev: Choose Weapons</div>';
      html += '<div style="color:#666;font-size:11px;text-align:center;margin-bottom:12px;">Select exactly 3 weapons for this run</div>';

      // Selected slots
      html += '<div style="display:flex;gap:6px;margin-bottom:12px;">';
      for (let i = 0; i < 3; i++) {
        const wid = selected[i];
        const wDef = wid ? allWeaponDefs.find(w => w.id === wid) : null;
        const label = wDef ? wDef.icon + ' ' + wDef.name : 'Empty';
        const bg = wid ? '#1a3310' : '#0d0d1a';
        const border = wid ? '1px solid #4CAF50' : '1px solid #333';
        html += '<div class="dev-wslot" data-slot="' + i + '" style="flex:1;background:' + bg + ';border:' + border + ';border-radius:6px;padding:8px 4px;text-align:center;cursor:pointer;min-width:0;">';
        html += '<div style="font-size:10px;color:#666;">Slot ' + (i + 1) + '</div>';
        html += '<div style="font-size:12px;color:#e0e0e0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + label + '</div>';
        if (wid) html += '<div style="font-size:9px;color:#4CAF50;margin-top:2px;">Tap to remove</div>';
        html += '</div>';
      }
      html += '</div>';

      // Weapon grid
      html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px;">';
      for (const w of allWeaponDefs) {
        const isSelected = selected.includes(w.id);
        const isLocked = false; // Dev mode: all available
        const bg = isSelected ? 'rgba(76,175,80,0.15)' : '#0d0d1a';
        const border = isSelected ? '1px solid #4CAF50' : '1px solid #333';
        const opacity = isLocked ? '0.4' : '1';
        html += '<div class="dev-wcard" data-wid="' + w.id + '" style="background:' + bg + ';border:' + border + ';border-radius:6px;padding:8px 4px;text-align:center;cursor:pointer;opacity:' + opacity + ';">';
        html += '<div style="font-size:20px;">' + w.icon + '</div>';
        html += '<div style="font-size:11px;color:#e0e0e0;margin-top:2px;">' + w.name + '</div>';
        html += '<div style="font-size:9px;color:#666;">' + w.type + ' \u00b7 Lv' + w.unlockLevel + '</div>';
        html += '</div>';
      }
      html += '</div>';

      // Launch button
      const canLaunch = selected.filter(Boolean).length === 3;
      html += '<div class="dev-launch-btn" style="background:' + (canLaunch ? '#2d5a1e' : '#1a1a2e') + ';border:1px solid ' + (canLaunch ? '#4CAF50' : '#333') + ';border-radius:8px;padding:10px;text-align:center;cursor:' + (canLaunch ? 'pointer' : 'default') + ';">';
      html += '<span style="color:' + (canLaunch ? '#4CAF50' : '#666') + ';font-weight:bold;font-size:14px;">\u25b6 Next: Companions</span>';
      html += '</div>';

      html += '</div>';
      overlay.innerHTML = html;

      // Wire slot removal
      overlay.querySelectorAll('.dev-wslot').forEach(slot => {
        slot.addEventListener('click', () => {
          const idx = parseInt(slot.dataset.slot);
          selected[idx] = null;
          self.game.audioManager?.playMenuSound('back');
          renderWeaponGrid();
        });
      });

      // Wire weapon card clicks
      overlay.querySelectorAll('.dev-wcard').forEach(card => {
        card.addEventListener('click', () => {
          const wid = card.dataset.wid;
          if (selected.includes(wid)) return; // Already selected
          // Fill first empty slot
          const emptyIdx = selected.indexOf(null);
          if (emptyIdx >= 0) {
            selected[emptyIdx] = wid;
          } else {
            // Replace last slot
            selected[2] = wid;
          }
          self.game.audioManager?.playMenuSound('select');
          renderWeaponGrid();
        });
      });

      // Wire launch
      if (canLaunch) {
        overlay.querySelector('.dev-launch-btn').addEventListener('click', () => {
          self.game.gameManager.set('session.dev_weapons', [...selected]);
          self.game.audioManager?.playMenuSound('select');
          self._showCompanionSelector(stageId, stageTier);
        });
      }
    }

    renderWeaponGrid();
    overlay.style.display = 'flex';
  }

  _showCompanionSelector(stageId, stageTier) {
    const overlay = document.getElementById('dev-stage-overlay');
    if (!overlay) return;

    // Companion catalog
    const allCompanions = [
      { id: 'dog', name: 'Dog', icon: '\u{1f415}', desc: 'Melee AoE \u00b7 loot', available: true },
      { id: 'healer', name: 'Healer', icon: '\u{1f49a}', desc: 'Threshold heals + regen', available: true },
      { id: 'archer', name: 'Archer', icon: '\u{1f3f9}', desc: 'Ranged \u00b7 slow + poison', available: true },
      { id: 'mage', name: 'Mage', icon: '\u{1f9d9}', desc: 'Chain lightning + vuln', available: true },
      { id: 'knight', name: 'Knight', icon: '\u2694\ufe0f', desc: 'Tank \u00b7 armor shred', available: true },
      { id: 'panther', name: 'Panther', icon: '\u{1f408}', desc: 'Chain melee \u00b7 fast', available: true },
      { id: 'spider', name: 'Spider', icon: '\u{1f577}\ufe0f', desc: 'Stacking poison DoT', available: true },
      { id: 'hawk', name: 'Hawk', icon: '\u{1f985}', desc: 'Dive bomb AoE', available: true },
      { id: 'turtle', name: 'Turtle', icon: '\u{1f422}', desc: 'Shield + knockback', available: true },
      { id: 'owl', name: 'Owl', icon: '\u{1f989}', desc: 'Damage amplifier', available: true },
      { id: 'rat', name: 'Rat', icon: '\u{1f400}', desc: 'Summon swarm', available: true },
      { id: 'frog', name: 'Frog', icon: '\u{1f438}', desc: 'Leap + slow + knockback', available: true },
      { id: 'bat', name: 'Bat', icon: '\u{1f987}', desc: 'Lifesteal + speed buff', available: true },
    ];

    const selected = [null, null, null];
    // Default: dog in slot 1 if unlocked
    const savedCompanions = this.game.gameManager.get('session.dev_companions');
    if (savedCompanions && savedCompanions.length > 0) {
      for (let i = 0; i < 3; i++) selected[i] = savedCompanions[i] || null;
    } else {
      selected[0] = 'dog';
    }

    const self = this;

    function renderCompanionGrid() {
      let html = '<div style="background:#1a1a2e;border:2px solid #FFD700;border-radius:12px;padding:20px;max-width:90%;width:380px;max-height:85vh;overflow-y:auto;">';
      html += '<div style="color:#FFD700;font-size:18px;font-weight:bold;margin-bottom:4px;text-align:center;">\u{1f415} Dev: Choose Companions</div>';
      html += '<div style="color:#666;font-size:11px;text-align:center;margin-bottom:4px;">C1\u2192W1, C2\u2192W2, C3\u2192W3</div>';
      html += '<div style="color:#888;font-size:10px;text-align:center;margin-bottom:12px;">Companion upgrades sync with paired weapon</div>';

      // Selected slots
      html += '<div style="display:flex;gap:6px;margin-bottom:12px;">';
      for (let i = 0; i < 3; i++) {
        const cid = selected[i];
        const cDef = cid ? allCompanions.find(c => c.id === cid) : null;
        const label = cDef ? cDef.icon + ' ' + cDef.name : 'Empty';
        const bg = cid ? '#1a3310' : '#0d0d1a';
        const border = cid ? '1px solid #4CAF50' : '1px solid #333';
        html += '<div class="dev-cslot" data-slot="' + i + '" style="flex:1;background:' + bg + ';border:' + border + ';border-radius:6px;padding:8px 4px;text-align:center;cursor:pointer;min-width:0;">';
        html += '<div style="font-size:10px;color:#666;">Slot ' + (i + 1) + '</div>';
        html += '<div style="font-size:12px;color:#e0e0e0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + label + '</div>';
        if (cid) html += '<div style="font-size:9px;color:#4CAF50;margin-top:2px;">Tap to remove</div>';
        html += '</div>';
      }
      html += '</div>';

      // Companion grid
      for (const c of allCompanions) {
        const isSelected = selected.includes(c.id);
        const bg = !c.available ? '#0a0a12' : isSelected ? 'rgba(76,175,80,0.15)' : '#0d0d1a';
        const border = isSelected ? '1px solid #4CAF50' : c.available ? '1px solid #333' : '1px solid #1a1a2e';
        const opacity = c.available ? '1' : '0.35';
        html += '<div class="dev-ccard" data-cid="' + c.id + '" data-avail="' + (c.available ? '1' : '0') + '" style="background:' + bg + ';border:' + border + ';border-radius:6px;padding:8px 10px;margin-bottom:6px;cursor:' + (c.available ? 'pointer' : 'default') + ';opacity:' + opacity + ';display:flex;align-items:center;gap:8px;">';
        html += '<span style="font-size:20px;">' + c.icon + '</span>';
        html += '<div><div style="font-size:12px;color:#e0e0e0;">' + c.name + '</div>';
        html += '<div style="font-size:10px;color:#666;">' + c.desc + '</div></div>';
        if (isSelected) html += '<span style="margin-left:auto;color:#4CAF50;font-size:10px;">\u2713</span>';
        html += '</div>';
      }

      // Launch button
      const filledCount = selected.filter(Boolean).length;
      html += '<div class="dev-launch-btn" style="background:#2d5a1e;border:1px solid #4CAF50;border-radius:8px;padding:10px;text-align:center;cursor:pointer;margin-top:8px;">';
      html += '<span style="color:#4CAF50;font-weight:bold;font-size:14px;">\u25b6 Launch Game</span>';
      html += '</div>';

      html += '</div>';
      overlay.innerHTML = html;

      // Wire slot removal
      overlay.querySelectorAll('.dev-cslot').forEach(slot => {
        slot.addEventListener('click', () => {
          const idx = parseInt(slot.dataset.slot);
          selected[idx] = null;
          self.game.audioManager?.playMenuSound('back');
          renderCompanionGrid();
        });
      });

      // Wire companion card clicks
      overlay.querySelectorAll('.dev-ccard').forEach(card => {
        card.addEventListener('click', () => {
          if (card.dataset.avail !== '1') return;
          const cid = card.dataset.cid;
          if (selected.includes(cid)) return;
          const emptyIdx = selected.indexOf(null);
          if (emptyIdx >= 0) {
            selected[emptyIdx] = cid;
          } else {
            selected[2] = cid;
          }
          self.game.audioManager?.playMenuSound('select');
          renderCompanionGrid();
        });
      });

      // Wire launch
      overlay.querySelector('.dev-launch-btn').addEventListener('click', () => {
        self.game.gameManager.set('session.dev_companions', [...selected]);
        self.game.audioManager?.playMenuSound('select');
        overlay.style.display = 'none';
        self.game._startFromTitle();
      });
    }

    renderCompanionGrid();
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
