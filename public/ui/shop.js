// ============================================================
// SHOP SYSTEM — Data-driven shop with multiple modes
// ============================================================

class ShopSystem {
  // ── Widget defs (v2.18.0, §10 screen 6) ──────────────────
  // Tab chips: ONE pooled repeat; the active tab is DATA (renderer v1.2
  // selected.bind). Stocked item lists: ONE pooled card def; cant-afford is
  // DATA (v1.3 disabled.bind — the renderer suppresses clicks, and buy()'s
  // re-render refreshes affordability in place). Farming/sandbox modes stay
  // bespoke: slider/form UI is not card material (graduation rule §3.2).
  static SHOP_TABS = [
    { tab: 'combat', icon: '⚔️', label: 'Combat' },
    { tab: 'companion', icon: '🐕', label: 'Companion' },
    { tab: 'estate', icon: '🏗️', label: 'Estate' },
    { tab: 'gifts', icon: '💝', label: 'Gifts' },
    { tab: 'inventory', icon: '🎒', label: 'Inventory' },
  ];

  static TAB_CHIP_DEF = {
    template: 'card',
    _v: 1,
    layout: 'text-only-row',
    size: 'small',
    slots: { primaryText: { bind: 'label' } },
    onClick: { emit: 'widget:shopTab', payload: { tab: '{{tab}}' } },
    selected: { bind: 'selected' },
  };

  static SHOP_ITEM_DEF = {
    template: 'card',
    _v: 1,
    layout: 'icon-left',
    size: 'medium',
    slots: {
      icon: { bind: 'item.icon' },
      primaryText: { bind: 'item.name' },
      secondaryText: { bind: 'item.desc' },
      badge: { bind: 'item.cost' },
    },
    onClick: { emit: 'widget:shopBuy', payload: { itemId: '{{item.id}}' } },
    disabled: { bind: 'item.cantAfford' },
  };

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
    this._goldEl = document.getElementById('shop-gold');

    // POT-011: one wallet, one listener. add_currency/spend_currency emit
    // resources:changed on EVERY mutation (purchases, farming loot, quest
    // rewards), so this keeps the header live across all shop modes — and
    // costs zero writes per purchase (no per-buy DOM polling).
    if (this._goldEl && this.eventBus) {
      this._updateGold();
      this.eventBus.on('resources:changed', (data) => {
        if (data && typeof data.currency === 'number') this._updateGold(data.currency);
      });
    }

    if (this._closeBtn) {
      this._closeBtn.addEventListener('click', () => this.close());
    }
    if (this._overlay) {
      this._overlay.addEventListener('click', (e) => {
        if (e.target === this._overlay) this.close();
      });
    }

    // Tab switching (v2.18.0: chips are pooled widget cards — the declared
    // widget:shopTab event routes here; selected moves via data, not classes)
    this._renderTabs();
  }

  /** Cached renderer + the two declared-event bridges (installed once). */
  _renderer() {
    if (!this.widgetRenderer) {
      this.widgetRenderer = new WidgetRenderer({
        skins: (typeof window !== 'undefined' && window.game?.dataManager?.uiSkins) || null,
      });
      this._tabs?.addEventListener('widget:shopTab', (e) => {
        const tab = e.detail?.tab;
        if (!tab || tab === this.currentTab) return;
        this.currentTab = tab;
        this.renderItems();
        this._renderTabs(); // selection moves — pooled rebind, cheap
      });
      this._items?.addEventListener('widget:shopBuy', (e) => {
        const item = (SHOP_DATA[this.currentTab] || []).find((it) => it.id === e.detail?.itemId);
        if (item) this.buy(item); // buy() re-renders — affordability refreshes everywhere
      });
    }
    return this.widgetRenderer;
  }

  /** Tab strip: pooled repeat; active chip comes from currentTab (data). */
  _renderTabs() {
    if (!this._tabs || typeof WidgetRenderer === 'undefined') return;
    this._renderer().repeatInto(this._tabs, ShopSystem.TAB_CHIP_DEF,
      ShopSystem.SHOP_TABS.map((t) => ({
        tab: t.tab,
        label: `${t.icon} ${t.label}`,
        selected: this.currentTab === t.tab,
      })));
  }

  // --- Shop Mode (Grand Bazaar) ---

  openShop() {
    this.currentMode = 'shop';
    this.currentTab = 'combat';
    this._showOverlay('🛒 Grand Bazaar');
    this._showTabs(true);
    this._renderTabs(); // v2.18.0: selection is data — strip rebinds on open
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

  _updateGold(value) {
    if (!this._goldEl) return;
    const gold = typeof value === 'number' ? value : (this.gameManager?.get_currency?.() || 0);
    this._goldEl.textContent = `💰 ${gold.toLocaleString()}`;
  }

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
    // Reset tabs (v2.18.0: chips are pooled widget cards — rebind moves selection)
    this._renderTabs();
    this.currentTab = 'combat';
  }

  // --- Shop Rendering ---

  renderItems() {
    if (!this._items || this.currentMode !== 'shop') return;
    // §24 Step 3: the Inventory tab is the widget-system pilot screen
    // (widget_ui_system_spec.md §8) — rendered ENTIRELY through WidgetRenderer.
    if (this.currentTab === 'inventory') return this._renderInventory();
    // v2.18.0: stocked tabs are pooled widget cards (§10 screen 6). The host
    // pool alternates between SHOP_ITEM_DEF and the inventory cardDef — the
    // v1.3 rebind swaps events/payloads/skins with the def. NOTE: no
    // innerHTML wipe — the pool owns this host (v1.3 hygiene guards
    // externally-wiped hosts anyway).
    const items = SHOP_DATA[this.currentTab] || [];
    const gold = this.gameManager.get_currency() || 0;
    this._renderer().repeatInto(this._items, ShopSystem.SHOP_ITEM_DEF,
      items.map((item) => ({
        item: {
          id: item.id,
          icon: item.icon,
          name: item.name,
          desc: item.desc,
          cost: `💰 ${item.cost}`,
          cantAfford: gold < item.cost,
        },
      })));
  }

  // ── Widget-system pilot: the inventory grid (§24 Step 3) ──
  // Every card is a WidgetRenderer instance driven by a declarative def +
  // bound data. The def below is the reference "Card as configured data"
  // example — same template as the future §2 inspector screen and §4 export
  // browser will use. Clicks emit the DECLARED event (inventoryItemSelected);
  // the grid rebinds through the pooled path (§5.1). Item display names come
  // from SHOP_DATA when the id matches a stocked item, else the raw id.
  _renderInventory() {
    // v2.18.0: pool owns this host — NO innerHTML wipe. The old wipe detached
    // pool nodes while _widgetPool kept referencing them: the first tab
    // round-trip Combat→Inventory→Combat→Inventory would rebind DETACHED nodes
    // and render NOTHING. Latent pilot bug, found during this migration; the
    // v1.3 hygiene guard now protects every host against external wipes.
    const R = this._renderer();
    const items = this.gameManager.getInventoryItems();
    const defs = SHOP_DATA.combat || [];
    const nameFor = (id) => (defs.find((d) => d.id === id) || {}).name || String(id).replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const descFor = (id) => (defs.find((d) => d.id === id) || {}).desc || (String(id).startsWith('probe') ? 'Purchased from the Grand Bazaar.' : '');
    const cardDef = {
      template: 'card',
      _v: 1,
      layout: 'icon-left',
      size: 'medium',
      skinId: 'bazaar_cloth',
      slots: {
        icon: { bind: 'item.icon' },
        primaryText: { bind: 'item.name' },
        secondaryText: { bind: 'item.desc' },
        badge: { bind: 'item.count' },
      },
      onClick: { emit: 'inventoryItemSelected', payload: { itemId: '{{item.id}}' } },
    };
    const data = items.map((it) => ({
      item: {
        id: it.id,
        icon: it.icon || '🎒',
        name: nameFor(it.id) + (it.category ? ` · ${it.category}` : ''),
        desc: it.desc || descFor(it.id),
        count: `×${it.count || 1}`,
        tags: it.tags || null,
      },
    }));
    if (data.length === 0) {
      // v2.18.0: hide stale pool cards first (the host pool may still hold the
      // previous tab's nodes), then append the empty-state notice.
      R.repeatInto(this._items, cardDef, []);
      const stale = this._items.querySelector('#shop-empty-notice');
      if (stale) stale.remove();
      const empty = document.createElement('div');
      empty.className = 'shop-item';
      empty.id = 'shop-empty-notice';
      empty.innerHTML = '<span class="item-icon">🎒</span><div class="item-info"><div class="item-name">Inventory empty</div><div class="item-desc">Buy something from the tabs above — purchases land here.</div></div>';
      this._items.appendChild(empty);
      return;
    }
    // Pooled path (§5.1): rebinds existing card nodes when re-rendered.
    R.repeatInto(this._items, cardDef, data);
    // Interactive instances bubble their DECLARED event; select sound + log
    // line demonstrate the payload contract for the §7 occlusion audit later.
    if (!this._inventoryListener) {
      this._inventoryListener = true;
      this._items.addEventListener('inventoryItemSelected', (e) => {
        this.audioManager?.playMenuSound('select');
        console.log('[INVENTORY] item selected:', e.detail);
      });
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
