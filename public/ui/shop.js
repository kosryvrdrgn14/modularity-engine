// ============================================================
// SHOP SYSTEM — Data-driven shop with multiple modes
// ============================================================

class ShopSystem {
  constructor({ gameManager, eventBus, audioManager }) {
    this.gameManager = gameManager;
    this.eventBus = eventBus;
    this.audioManager = audioManager;
    this.currentMode = null;  // 'shop', 'farming', 'sandbox'
    this.currentTab = 'combat';

    this._setupUI();
  }

  _setupUI() {
    // Main shop overlay
    this._overlay = document.getElementById('shop-overlay');
    this._header = document.getElementById('shop-header');
    this._tabs = document.getElementById('shop-tabs');
    this._items = document.getElementById('shop-items');
    this._closeBtn = document.getElementById('shop-close');

    if (this._closeBtn) {
      this._closeBtn.addEventListener('click', () => this.close());
    }
    if (this._overlay) {
      this._overlay.addEventListener('click', (e) => {
        if (e.target === this._overlay) this.close();
      });
    }

    // Tab switching
    const tabs = document.querySelectorAll('.shop-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this.renderItems();
      });
    });
  }

  // --- Shop Mode (Grand Bazaar) ---

  openShop() {
    this.currentMode = 'shop';
    this.currentTab = 'combat';
    this._showOverlay('🛒 Grand Bazaar');
    this._showTabs(true);
    this.renderItems();
  }

  // --- Farming Mode ---

  openFarming(farmingSystem) {
    this.currentMode = 'farming';
    this._farmingSystem = farmingSystem;
    this._showOverlay('📋 Auto-Clear Farming');
    this._showTabs(false);
    this.renderFarmingSlots();
  }

  // --- Sandbox Mode ---

  openSandbox(sandboxSystem) {
    this.currentMode = 'sandbox';
    this._sandboxSystem = sandboxSystem;
    this._showOverlay('🔬 Sandbox Mode');
    this._showTabs(false);
    this.renderSandboxConfig();
  }

  // --- Generic Methods ---

  _showOverlay(title) {
    if (this._overlay) this._overlay.classList.add('active');
    if (this._header) {
      const titleEl = this._header.querySelector('.shop-title');
      if (titleEl) titleEl.textContent = title;
    }
  }

  _showTabs(show) {
    if (this._tabs) {
      this._tabs.style.display = show ? '' : 'none';
    }
  }

  close() {
    if (this._overlay) this._overlay.classList.remove('active');
    this.currentMode = null;
    // Restore default state
    if (this._header) {
      const titleEl = this._header.querySelector('.shop-title');
      if (titleEl) titleEl.textContent = '🛒 Grand Bazaar';
    }
    this._showTabs(true);
    // Reset tabs
    const tabs = document.querySelectorAll('.shop-tab');
    tabs.forEach(t => t.classList.remove('active'));
    const combatTab = document.querySelector('.shop-tab[data-tab="combat"]');
    if (combatTab) combatTab.classList.add('active');
    this.currentTab = 'combat';
  }

  // --- Shop Rendering ---

  renderItems() {
    if (!this._items || this.currentMode !== 'shop') return;
    this._items.innerHTML = '';

    const items = SHOP_DATA[this.currentTab] || [];
    const gold = this.gameManager.get_currency() || 0;

    for (const item of items) {
      const canAfford = gold >= item.cost;
      const card = document.createElement('div');
      card.className = 'shop-item' + (canAfford ? '' : ' cant-afford');
      card.innerHTML = `
        <span class="item-icon">${item.icon}</span>
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-desc">${item.desc}</div>
        </div>
        <span class="item-cost">💰 ${item.cost}</span>
      `;
      if (canAfford) {
        card.addEventListener('click', () => this.buy(item));
      }
      this._items.appendChild(card);
    }
  }

  buy(item) {
    if (!this.gameManager.spend_currency(item.cost, 'shop_' + item.id)) return;
    this.eventBus.emit('shopPurchase', { item });

    // Apply effect
    this._applyEffect(item);

    // Store in inventory
    if (this.gameManager._addToInventory) {
      this.gameManager._addToInventory({ id: item.id, count: 1 });
    }

    this.renderItems();
    this.audioManager?.playMenuSound('select');
  }

  _applyEffect(item) {
    // Effects will be applied in combat via events
    // For now, just emit the event
    this.eventBus.emit('shopEffect', { effect: item.effect, item });
  }

  // --- Farming Rendering ---

  renderFarmingSlots() {
    if (!this._items || this.currentMode !== 'farming') return;
    this._items.innerHTML = '';

    const FARMING_CONFIG_DATA = {
      slotLabels: ['🐕 Companion', '⚔️ Adventurer', '🔄 Flexible'],
    };

    for (let i = 0; i < 3; i++) {
      const status = this._farmingSystem?.getSlotStatus(i + 1);
      const slotLabel = FARMING_CONFIG_DATA.slotLabels[i];
      const card = document.createElement('div');
      card.className = 'shop-item';

      if (status?.status === 'locked') {
        card.classList.add('cant-afford');
        card.innerHTML = `<span class="item-icon">\u{1f512}</span><div class="item-info"><div class="item-name">${slotLabel}</div><div class="item-desc">Complete 3\u2605 on a stage to unlock</div></div>`;
      } else if (status?.status === 'idle') {
        card.innerHTML = `<span class="item-icon">${slotLabel.split(' ')[0]}</span><div class="item-info"><div class="item-name">${slotLabel}</div><div class="item-desc">Tap to assign \u2014 Graveyard (5min)</div></div><span class="item-cost" style="color:#4FC3F7;">Assign \u25b8</span>`;
        card.addEventListener('click', () => {
          this.audioManager?.playMenuSound('select');
          this._assignFarmingSlot(i + 1);
          this.renderFarmingSlots();
        });
      } else if (status?.status === 'running') {
        const pct = Math.round(status.progress * 100);
        const mins = Math.floor(status.timeRemaining / 60);
        const secs = Math.floor(status.timeRemaining % 60);
        card.innerHTML = `<span class="item-icon">\u23f3</span><div class="item-info"><div class="item-name">${status.stageId || 'Stage'} \u2014 ${status.unitId || 'Unit'}</div><div class="item-desc">${pct}% complete \u00b7 ${mins}:${String(secs).padStart(2, '0')} remaining</div></div>`;
        card.style.borderColor = 'rgba(255, 215, 0, 0.2)';
      } else if (status?.status === 'complete') {
        card.innerHTML = `<span class="item-icon">\u2705</span><div class="item-info"><div class="item-name" style="color: #4FC3F7;">Loot Ready!</div><div class="item-desc">Tap to collect rewards</div></div><span class="item-cost" style="color:#4FC3F7;">\u{1f4b0} Collect</span>`;
        card.style.borderColor = 'rgba(79, 195, 247, 0.3)';
        card.addEventListener('click', () => {
          this.audioManager?.playMenuSound('powerup');
          this._collectFarmingSlot(i + 1);
          this.renderFarmingSlots();
        });
      }
      this._items.appendChild(card);
    }
  }

  _assignFarmingSlot(slotId) {
    const stageId = 'stage_graveyard';
    const companions = this.gameManager.get_companions();
    const slotTypes = ['companion', 'adventurer', 'flexible'];
    const slotType = slotTypes[slotId - 1];
    let unitType = slotType;
    let unitId = null;

    if (slotType === 'companion' && companions.length > 0) {
      for (const cid of companions) {
        if (this.gameManager.getCompanionDeployStatus(cid) === 'available') {
          unitId = cid;
          unitType = 'companion';
          break;
        }
      }
    } else if (slotType === 'adventurer') {
      unitType = 'adventurer';
      unitId = 'hired_' + slotId;
    } else {
      unitType = 'flexible';
      unitId = companions.find(c => this.gameManager.getCompanionDeployStatus(c) === 'available') || 'hired_flex';
    }

    if (!unitId) return;

    this._farmingSystem?.assignSlot(slotId, stageId, unitType, unitId);
  }

  _collectFarmingSlot(slotId) {
    const loot = this._farmingSystem?.collectSlot(slotId);
    if (loot) {
      this.eventBus.emit('farmingLootCollected', { slotId, loot });
    }
  }

  // --- Sandbox Rendering ---

  renderSandboxConfig() {
    if (!this._items || this.currentMode !== 'sandbox') return;
    this._items.innerHTML = '';

    const weapons = [
      { id: 'w1_projectile', name: 'Projectile', icon: '🏹' },
      { id: 'w2_orbit', name: 'Orbit', icon: '🔄' },
      { id: 'weapon_area_pulse', name: 'Area', icon: '💥' },
      { id: 'w4_flame_wave', name: 'Flame Wave', icon: '🔥' },
      { id: 'w5_arcane_bolt', name: 'Arcane Bolt', icon: '⚡' },
    ];

    // Difficulty slider
    this._items.innerHTML += `
      <div class="shop-item">
        <span class="item-icon">⚔️</span>
        <div class="item-info">
          <div class="item-name">Difficulty</div>
          <div class="item-desc">Enemy HP/Damage multiplier</div>
          <input type="range" id="sb-difficulty" min="0.5" max="3.0" step="0.1" value="1.0" style="width:100%;margin-top:6px;">
          <div id="sb-diff-val" style="color:#FFD700;font-size:0.8rem;">1.0×</div>
        </div>
      </div>`;

    // Weapon level selectors
    for (const w of weapons) {
      this._items.innerHTML += `
        <div class="shop-item">
          <span class="item-icon">${w.icon}</span>
          <div class="item-info">
            <div class="item-name">${w.name}</div>
            <div class="item-desc">Level: <span id="sb-wl-${w.id}">7</span>/7</div>
            <input type="range" id="sb-wl-${w.id}" min="0" max="7" value="7" style="width:100%;margin-top:6px;" data-weapon="${w.id}">
          </div>
        </div>`;
    }

    // Show DPS toggle
    this._items.innerHTML += `
      <div class="shop-item">
        <span class="item-icon">📊</span>
        <div class="item-info">
          <div class="item-name">Show DPS Counter</div>
          <div class="item-desc">Display real-time DPS during combat</div>
          <input type="checkbox" id="sb-show-dps" checked style="margin-top:6px;">
        </div>
      </div>`;

    // Launch button
    this._items.innerHTML += `
      <div class="shop-item" id="sb-launch" style="border-color:rgba(255,215,0,0.3);cursor:pointer;text-align:center;">
        <span class="item-icon">🚀</span>
        <div class="item-info">
          <div class="item-name" style="color:#FFD700;">Launch Sandbox</div>
          <div class="item-desc">Start with current settings</div>
        </div>
      </div>`;

    // Wire difficulty slider
    const diffSlider = document.getElementById('sb-difficulty');
    const diffVal = document.getElementById('sb-diff-val');
    if (diffSlider) diffSlider.addEventListener('input', () => {
      diffVal.textContent = parseFloat(diffSlider.value).toFixed(1) + '×';
    });

    // Wire weapon level sliders
    for (const w of weapons) {
      const slider = document.getElementById('sb-wl-' + w.id);
      const label = document.getElementById('sb-wl-' + w.id);
      if (slider) slider.addEventListener('input', () => {
        if (label) label.textContent = slider.value;
      });
    }

    // Wire launch
    const launchBtn = document.getElementById('sb-launch');
    if (launchBtn) launchBtn.addEventListener('click', () => {
      const config = {
        difficulty: parseFloat(document.getElementById('sb-difficulty')?.value || 1.0),
        enemyHpMult: parseFloat(document.getElementById('sb-difficulty')?.value || 1.0),
        enemyDamageMult: parseFloat(document.getElementById('sb-difficulty')?.value || 1.0),
        showDps: document.getElementById('sb-show-dps')?.checked ?? true,
        weaponLevels: {},
      };
      for (const w of weapons) {
        const lvl = parseInt(document.getElementById('sb-wl-' + w.id)?.value || 7);
        if (lvl > 0) config.weaponLevels[w.id] = lvl;
      }
      this._sandboxSystem?.activate(config);
      this.close();
      this.eventBus.emit('startCombat');
    });
  }
}
