class LocationManager {
  constructor(gameManager) {
    this.gameManager = gameManager;
    this.currentRegionIndex = 0;
    this.currentLocationId = 'city_root';
    this.locationHistory = ['city_root'];
    this.onNavigate = null; // callback
  }

  /** Get locations data from DataManager (JSON) or fallback to global LOCATION_TREE */
  _getLocationsData() {
    const dm = this.gameManager?.dataManager;
    if (dm?.locations) return dm.locations;
    // Fallback for legacy JS global (during migration)
    if (typeof LOCATION_TREE !== 'undefined') return LOCATION_TREE;
    return { regions: [] };
  }

  getCurrentRegion() {
    const data = this._getLocationsData();
    return data.regions[this.currentRegionIndex] || data.regions[0];
  }

  getCurrentLocation() {
    const region = this.getCurrentRegion();
    return region.locations[this.currentLocationId] || null;
  }

  getRegions() { return this._getLocationsData().regions; }

  getRegionCount() { return this._getLocationsData().regions.length; }

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
    const data = this._getLocationsData();
    if (index < 0 || index >= data.regions.length) return false;
    this.currentRegionIndex = index;
    this.currentLocationId = data.regions[index].locations[
      Object.keys(data.regions[index].locations)[0]
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

  /** Get NPCs data from DataManager (JSON) or fallback to global NPC_DATA */
  _getNPCsData() {
    const dm = this.gameManager?.dataManager;
    if (dm?.npcs) return dm.npcs;
    // Fallback for legacy JS global (during migration)
    if (typeof NPC_DATA !== 'undefined') return NPC_DATA;
    return {};
  }

  getNPCsAtLocation(locationId) {
    // Filter NPCs by their assigned location (default: city_root)
    const npcsData = this._getNPCsData();
    const npcs = [];
    for (const key in npcsData) {
      const npc = npcsData[key];
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
