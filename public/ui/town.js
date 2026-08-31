class LocationManager {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.currentRegionIndex = 0;
    this.currentLocationId = 'city_root';
    this.locationHistory = ['city_root'];
    this.onNavigate = null; // callback
  }

  getCurrentRegion() {
    return LOCATION_TREE.regions[this.currentRegionIndex] || LOCATION_TREE.regions[0];
  }

  getCurrentLocation() {
    const region = this.getCurrentRegion();
    return region.locations[this.currentLocationId] || null;
  }

  getRegions() { return LOCATION_TREE.regions; }

  getRegionCount() { return LOCATION_TREE.regions.length; }

  navigateTo(locationId) {
    const region = this.getCurrentRegion();
    const loc = region.locations[locationId];
    if (!loc) return false;
    if (loc.locked && !this.gameManager.get_flag(loc.unlockCondition)) return false;
    // If location already in history (breadcrumb click), trim to that point
    const existingIdx = this.locationHistory.indexOf(locationId);
    if (existingIdx >= 0) {
      this.locationHistory = this.locationHistory.slice(0, existingIdx + 1);
    } else {
      this.locationHistory.push(locationId);
      if (this.locationHistory.length > 10) this.locationHistory.shift();
    }
    this.currentLocationId = locationId;
    if (this.onNavigate) this.onNavigate(loc);
    return true;
  }

  goBack() {
    if (this.locationHistory.length <= 1) return false;
    this.locationHistory.pop();
    this.currentLocationId = this.locationHistory[this.locationHistory.length - 1];
    const loc = this.getCurrentLocation();
    if (this.onNavigate) this.onNavigate(loc);
    return true;
  }

  canGoBack() { return this.locationHistory.length > 1; }

  isRoot() { return this.locationHistory.length <= 1; }

  switchRegion(index) {
    if (index < 0 || index >= LOCATION_TREE.regions.length) return false;
    this.currentRegionIndex = index;
    this.currentLocationId = LOCATION_TREE.regions[index].locations[
      Object.keys(LOCATION_TREE.regions[index].locations)[0]
    ]?.id || 'city_root';
    this.locationHistory = [this.currentLocationId];
    const loc = this.getCurrentLocation();
    if (this.onNavigate) this.onNavigate(loc);
    return true;
  }

  getChildLocations(locationId) {
    const region = this.getCurrentRegion();
    const loc = region.locations[locationId];
    if (!loc || !loc.children) return [];
    return loc.children.map(cid => {
      const child = region.locations[cid];
      if (!child) return null;
      const isUnlocked = !child.locked || this.gameManager.get_flag(child.unlockCondition);
      return { ...child, locked: !isUnlocked };
    }).filter(Boolean);
  }

  getNPCsAtLocation(locationId) {
    // Filter NPCs by their assigned location (default: city_root)
    const npcs = [];
    for (const key in NPC_DATA) {
      const npc = NPC_DATA[key];
      const loc = npc.location || 'city_root';
      if (loc === locationId && npc.unlocked) npcs.push(npc);
    }
    return npcs;
  }
}

// ============================================================
// SHOP SYSTEM — Grand Bazaar (D3)
// ============================================================

// SHOP_DATA moved to data/shopData.js (loaded via <script> tag before this one)


class ShopSystem {
  constructor(gameManager, eventBus) {
    this.gameManager = gameManager;
    this.eventBus = eventBus;
    this.currentTab = 'combat';
    this._setupUI();
  }

  _setupUI() {
    const overlay = document.getElementById('shop-overlay');
    const closeBtn = document.getElementById('shop-close');
    const tabs = document.querySelectorAll('.shop-tab');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    // Tap outside shop content to close
    if (overlay) overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this.renderItems();
      });
    });
  }

  open() {
    document.getElementById('shop-overlay').classList.add('active');
    this.renderItems();
  }

  close() {
    document.getElementById('shop-overlay').classList.remove('active');
  }

  renderItems() {
    const container = document.getElementById('shop-items');
    if (!container) return;
    container.innerHTML = '';
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
      container.appendChild(card);
    }
  }

  buy(item) {
    if (!this.gameManager.spend_currency(item.cost, 'shop_' + item.id)) return;
    this.eventBus.emit('shopPurchase', { item });
    // Apply effect
    if (item.effect === 'heal_30' || item.effect?.startsWith('heal_')) {
      // Will be applied in combat via event
    } else if (item.effect === 'xp_50') {
      this.gameManager.add_xp(50);
    }
    // Store in inventory
    this.gameManager._addToInventory({ id: item.id, count: 1 });
    this.renderItems();
  }
}



// ============================================================
// DISASTER SYSTEM — Simplified gold sink (D5)
// ============================================================

// DISASTER_EVENTS moved to data/disasterEvents.js (loaded via <script> tag before this one)


