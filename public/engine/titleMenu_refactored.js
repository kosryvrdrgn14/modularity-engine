// ============================================================
// TITLE MENU — Navigation and input handler
// REFACTORED: No circular dependency on Game
// ============================================================

class TitleMenu {
  constructor({ audioManager, gameManager, dataManager, onStart, onSettings, onTestTown, onStoryMode, onSlotPlay, onSlotWipe, getSlotSummaries }) {
    this.audioManager = audioManager;
    this.gameManager = gameManager;
    this.dataManager = dataManager;
    this.onStart = onStart;
    this.onSettings = onSettings;
    this.onTestTown = onTestTown;
    this.onStoryMode = onStoryMode;
    // SLOT system: optional slot-picker hooks (absent in tests → falls through
    // to direct Story Mode entry, preserving legacy behavior)
    this.onSlotPlay = onSlotPlay || null;
    this.onSlotWipe = onSlotWipe || null;
    this.getSlotSummaries = getSlotSummaries || null;

    this.selectedIndex = 0;
    this.items = [
      { action: 'play', locked: false },
      { action: 'characters', locked: true },
      { action: 'stages', locked: true },
      { action: 'settings', locked: false },
      { action: 'story-mode', locked: false },
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
    if (this.audioManager) this.audioManager.playMenuSound('hover');
  }

  _moveSelection(dir) {
    const len = this.items.length;
    this.selectedIndex = (this.selectedIndex + dir + len) % len;
    this._updateSelection();
    if (this.audioManager) this.audioManager.playMenuSound('navigate');
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
      if (this.audioManager) this.audioManager.playMenuSound('locked');
      this._showTooltip('Complete more runs to unlock!');
      return;
    }
    if (this.audioManager) this.audioManager.playMenuSound('select');

    switch(item.action) {
      case 'play':
        this.onStart();
        break;
      case 'settings':
        this.onSettings();
        break;
      case 'story-mode':
        if (this.onSlotPlay && this.getSlotSummaries) this._showSlotPicker();
        else if (this.onStoryMode) this.onStoryMode();
        break;
      case 'test-town':
        this.onTestTown();
        break;
      case 'dev-stage':
        this._showStageSelector();
        break;
    }
  }

  // ── SLOT: story save-slot picker ──
  _showSlotPicker() {
    let overlay = document.getElementById('slot-picker-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'slot-picker-overlay';
      document.body.appendChild(overlay);
    }
    const summaries = this.getSlotSummaries();
    const active = this.gameManager.getActiveSlot();
    const regionNames = { town: ' Refugee Camp', graveyard: '🪦 Graveyard', forest: '🌲 Forest' };

    let html = '<div class="slot-picker-title">📁 Choose Save Slot</div>';
    html += '<div class="slot-picker-grid">';
    for (const s of summaries) {
      const isActive = s.slot === active;
      const exists = !!s.exists;
      html += `<div class="slot-card${isActive ? ' active' : ''}${exists ? '' : ' empty'}" data-slot="${s.slot}">`;
      html += `<div class="slot-head">Slot ${s.slot}${isActive ? ' <span class="slot-badge">CURRENT</span>' : ''}</div>`;
      if (exists) {
        html += `<div class="slot-stats">`;
        html += `<span>⚔ Lv${s.level ?? 1}</span><span>💰 ${s.gold ?? 0}</span><span>🏆 ${s.questsDone ?? 0} quests</span>`;
        html += `</div>`;
        html += `<div class="slot-loc">${regionNames[s.region] || s.region}</div>`;
      } else {
        html += `<div class="slot-loc">— Empty —</div>`;
      }
      html += `<div class="slot-actions">`;
      html += `<button class="slot-btn play" data-play="${s.slot}">${exists ? '▶ Continue' : '✦ New Game'}</button>`;
      if (exists) html += `<button class="slot-btn wipe" data-wipe="${s.slot}">🗑</button>`;
      html += `</div></div>`;
    }
    html += '</div>';
    html += '<button class="slot-close" id="slot-picker-close">✕ Cancel</button>';
    overlay.innerHTML = html;
    overlay.classList.add('active');

    overlay.querySelectorAll('[data-play]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.audioManager) this.audioManager.playMenuSound('select');
        this._hideSlotPicker();
        const n = parseInt(btn.dataset.play, 10);
        if (this.onSlotPlay) this.onSlotPlay(n);
        else if (this.onStoryMode) this.onStoryMode();
      });
    });
    overlay.querySelectorAll('[data-wipe]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const n = parseInt(btn.dataset.wipe, 10);
        if (window.confirm(`Wipe Slot ${n}? All progress in this slot will be lost.`)) {
          if (this.audioManager) this.audioManager.playMenuSound('back');
          if (this.onSlotWipe) this.onSlotWipe(n);
          this._showSlotPicker(); // re-render with fresh summaries
        }
      });
    });
    const closeBtn = document.getElementById('slot-picker-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      if (this.audioManager) this.audioManager.playMenuSound('back');
      this._hideSlotPicker();
    });
  }

  _hideSlotPicker() {
    const overlay = document.getElementById('slot-picker-overlay');
    if (overlay) {
      overlay.classList.remove('active');
      overlay.innerHTML = '';
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
    const weaponNames = { w1_projectile: 'Projectile', w2_orbit: 'Orbit', weapon_area_pulse: 'Area', w4_flame_wave: 'Flame Wave', w5_arcane_bolt: 'Arcane Bolt', w6_dagger: 'Dagger', w7_sword: 'Sword', w8_claymore: 'Claymore' };
    const tierIcons = { quick: '\u26a1', standard: '\u2694\ufe0f', highlight: '\u{1f525}' };
    const tierLabels = { quick: 'Quick', standard: 'Standard', highlight: 'Highlight' };
    const tierColors = { quick: '#4FC3F7', standard: '#FFD700', highlight: '#FF5722' };
    const stages = this.dataManager?.getStageList?.() || [];
    let html = '<div style="background:#1a1a2e;border:2px solid #FFD700;border-radius:12px;padding:20px;max-width:90%;width:380px;max-height:85vh;overflow-y:auto;">';
    html += '<div style="color:#FFD700;font-size:18px;font-weight:bold;margin-bottom:4px;text-align:center;">\u{1f9ea} Dev: Stage Select</div>';
    html += '<div style="color:#666;font-size:11px;text-align:center;margin-bottom:16px;">Choose stage \u2192 Choose tier</div>';
    if (stages.length === 0) html += '<div style="color:#666;text-align:center;">No stages loaded</div>';
    for (const stage of stages) {
      const bossEnemy = this.dataManager.enemies?.find(e => e.id === stage.bossConfig?.enemyId);
      html += '<div style="margin-bottom:16px;">';
      html += '<div style="color:#4FC3F7;font-size:15px;font-weight:bold;">' + (stage.name || stage.id) + '</div>';
      if (stage.description) html += '<div style="color:#888;font-size:11px;margin-bottom:6px;">' + stage.description + '</div>';
      html += '<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">';
      if (bossEnemy) html += '<span style="background:#3D1F4D;color:#C77DFF;font-size:10px;padding:2px 6px;border-radius:4px;">Boss: ' + bossEnemy.name + '</span>';
      html += '<span style="background:#1a3310;color:#4CAF50;font-size:10px;padding:2px 6px;border-radius:4px;">' + (stage.waves?.length || 0) + ' waves</span>';
      html += '</div>';
      for (const [tierKey, tierCfg] of Object.entries(stage.tierConfig || {})) {
        const icon = tierIcons[tierKey] || '';
        const label = tierLabels[tierKey] || tierKey;
        const color = tierColors[tierKey] || '#e0e0e0';
        const mins = Math.floor(tierCfg.duration / 60);
        const secs = tierCfg.duration % 60;
        const timeStr = mins + ':' + String(secs).padStart(2, '0');
        const wNames = (tierCfg.recommendedWeapons || []).map(w => weaponNames[w] || w).join(', ');
        html += '<div class="dev-tier-btn" data-stage="' + stage.id + '" data-tier="' + tierKey + '" style="background:#0d0d1a;border:1px solid #333;border-radius:8px;padding:10px 12px;margin-bottom:6px;cursor:pointer;color:#e0e0e0;transition:border-color 0.15s;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
        html += '<span style="font-size:13px;font-weight:bold;color:' + color + ';">' + icon + ' ' + label + '</span>';
        html += '<span style="font-size:12px;color:#FFD700;">' + timeStr + '</span>';
        html += '</div>';
        html += '<div style="font-size:10px;color:#666;margin-top:4px;">' + wNames + '</div>';
        html += '<div style="font-size:10px;color:#555;margin-top:2px;">' + (tierCfg.description || '') + '</div>';
        html += '</div>';
      }
      html += '</div>';
    }
    html += '</div>';
    overlay.innerHTML = html;
    overlay.querySelectorAll('.dev-tier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.gameManager.set('session.selected_stage_id', btn.dataset.stage);
        this.gameManager.set('session.current_stage_tier', btn.dataset.tier);
        if (this.audioManager) this.audioManager.playMenuSound('select');
        this._showWeaponSelector(btn.dataset.stage, btn.dataset.tier);
      });
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#FFD700'; });
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = '#333'; });
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.style.display = 'none'; });
    overlay.style.display = 'flex';
  }


  _showWeaponSelector(stageId, stageTier) {
    const overlay = document.getElementById('dev-stage-overlay');
    if (!overlay) return;

    // Read weapons from DataManager (data-driven, no hardcoded list)
    const allWeaponDefs = (this.dataManager?.weapons || []).map(w => ({
      id: w.id, name: w.name, icon: w.icon || '?', type: w.type || '', unlockLevel: w.unlockLevel || 1
    }));

    const stageData = this.dataManager?.stages;
    const tierCfg = stageData?.tierConfig?.[stageTier];
    const defaultWeapons = tierCfg?.recommendedWeapons || ['w1_projectile', 'w2_orbit', 'weapon_area_pulse'];
    const selected = [defaultWeapons[0] || null, defaultWeapons[1] || null, defaultWeapons[2] || null];

    const self = this;

    function renderWeaponGrid() {
      let html = '<div style="background:#1a1a2e;border:2px solid #FFD700;border-radius:12px;padding:20px;max-width:90%;width:380px;max-height:85vh;overflow-y:auto;">';
      html += '<div style="color:#FFD700;font-size:18px;font-weight:bold;margin-bottom:4px;text-align:center;">\u2694\ufe0f Dev: Choose Weapons</div>';
      html += '<div style="color:#666;font-size:11px;text-align:center;margin-bottom:12px;">Select exactly 3 weapons for this run</div>';

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

      html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px;">';
      for (const w of allWeaponDefs) {
        const isSelected = selected.includes(w.id);
        const bg = isSelected ? 'rgba(76,175,80,0.15)' : '#0d0d1a';
        const border = isSelected ? '1px solid #4CAF50' : '1px solid #333';
        html += '<div class="dev-wcard" data-wid="' + w.id + '" style="background:' + bg + ';border:' + border + ';border-radius:6px;padding:8px 4px;text-align:center;cursor:pointer;">';
        html += '<div style="font-size:20px;">' + w.icon + '</div>';
        html += '<div style="font-size:11px;color:#e0e0e0;margin-top:2px;">' + w.name + '</div>';
        html += '<div style="font-size:9px;color:#666;">' + w.type + ' \u00b7 Lv' + w.unlockLevel + '</div>';
        html += '</div>';
      }
      html += '</div>';

      const canLaunch = selected.filter(Boolean).length === 3;
      html += '<div class="dev-launch-btn" style="background:' + (canLaunch ? '#2d5a1e' : '#1a1a2e') + ';border:1px solid ' + (canLaunch ? '#4CAF50' : '#333') + ';border-radius:8px;padding:10px;text-align:center;cursor:' + (canLaunch ? 'pointer' : 'default') + ';">';
      html += '<span style="color:' + (canLaunch ? '#4CAF50' : '#666') + ';font-weight:bold;font-size:14px;">\u25b6 Next: Companions</span>';
      html += '</div></div>';
      overlay.innerHTML = html;

      overlay.querySelectorAll('.dev-wslot').forEach(slot => {
        slot.addEventListener('click', () => {
          const idx = parseInt(slot.dataset.slot);
          selected[idx] = null;
          self.audioManager?.playMenuSound('back');
          renderWeaponGrid();
        });
      });

      overlay.querySelectorAll('.dev-wcard').forEach(card => {
        card.addEventListener('click', () => {
          const wid = card.dataset.wid;
          if (selected.includes(wid)) return;
          const emptyIdx = selected.indexOf(null);
          if (emptyIdx >= 0) { selected[emptyIdx] = wid; } else { selected[2] = wid; }
          self.audioManager?.playMenuSound('select');
          renderWeaponGrid();
        });
      });

      if (canLaunch) {
        overlay.querySelector('.dev-launch-btn').addEventListener('click', () => {
          self.gameManager.set('session.loadout_weapons', [...selected]);
          self.audioManager?.playMenuSound('select');
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

    // Read companions from DataManager/COMPANION_DATA (data-driven, no hardcoded list)
    const companionSource = this.dataManager?.companions || (typeof COMPANION_DATA !== 'undefined' ? COMPANION_DATA : {});
    const allCompanions = Object.values(companionSource).map(c => ({
      id: c.id, name: c.name, icon: c.icon || '?', desc: c.desc || c.role || '', available: true
    }));

    const selected = [null, null, null];
    const savedCompanions = this.gameManager.get('session.loadout_companions');
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

      html += '<div class="dev-launch-btn" style="background:#2d5a1e;border:1px solid #4CAF50;border-radius:8px;padding:10px;text-align:center;cursor:pointer;margin-top:8px;">';
      html += '<span style="color:#4CAF50;font-weight:bold;font-size:14px;">\u25b6 Launch Game</span></div></div>';
      overlay.innerHTML = html;

      overlay.querySelectorAll('.dev-cslot').forEach(slot => {
        slot.addEventListener('click', () => {
          const idx = parseInt(slot.dataset.slot);
          selected[idx] = null;
          self.audioManager?.playMenuSound('back');
          renderCompanionGrid();
        });
      });

      overlay.querySelectorAll('.dev-ccard').forEach(card => {
        card.addEventListener('click', () => {
          if (card.dataset.avail !== '1') return;
          const cid = card.dataset.cid;
          if (selected.includes(cid)) return;
          const emptyIdx = selected.indexOf(null);
          if (emptyIdx >= 0) { selected[emptyIdx] = cid; } else { selected[2] = cid; }
          self.audioManager?.playMenuSound('select');
          renderCompanionGrid();
        });
      });

      overlay.querySelector('.dev-launch-btn').addEventListener('click', () => {
        self.gameManager.set('session.loadout_companions', [...selected]);
        self.audioManager?.playMenuSound('select');
        overlay.style.display = 'none';
        self.onStart();
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
    const gm = this.gameManager;
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
