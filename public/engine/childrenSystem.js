class ChildrenSystem {
  constructor(gameManager) {
    this.gameManager = gameManager;
  }

  getChildren(wifeId) {
    const estates = this.gameManager.store.estates || [];
    const estate = estates.find(e => e.wifeId === wifeId);
    return estate?.children || [];
  }

  addChild(wifeId, name) {
    const estates = this.gameManager.store.estates || [];
    const estate = estates.find(e => e.wifeId === wifeId);
    if (!estate) return false;
    if (!estate.children) estate.children = [];

    const child = {
      name: name || 'Child',
      growthStage: 0, // index into CHILD_GROWTH_STAGES
      runsLived: 0,
      path: null, // null = undecided, 'companion' or 'manager'
      companionData: null, // set when path = companion
    };
    estate.children.push(child);
    this.gameManager._dirty = true;
    return child;
  }

  growChildren() {
    // Called after each combat run
    const estates = this.gameManager.store.estates || [];
    for (const estate of estates) {
      if (!estate.children) continue;
      for (const child of estate.children) {
        child.runsLived++;
        if (child.runsLived >= CHILD_GROWTH_THRESHOLD && child.growthStage < CHILD_GROWTH_STAGES.length - 1) {
          child.growthStage++;
          child.runsLived = 0;
        }
      }
    }
    this.gameManager._dirty = true;
  }

  getGrowthStage(child) {
    return CHILD_GROWTH_STAGES[child.growthStage] || 'Unknown';
  }

  isAdult(child) {
    return child.growthStage >= CHILD_GROWTH_STAGES.length - 1;
  }

  assignPath(child, path) {
    if (!this.isAdult(child)) return false;
    child.path = path;
    if (path === 'companion') {
      // Generate legacy companion data based on parent's mythology
      child.companionData = {
        id: 'child_' + child.name.toLowerCase(),
        name: child.name,
        slot: 0, // assigned when deployed
        pairedWeapon: null,
        isLegacy: true,
      };
    }
    this.gameManager._dirty = true;
    return true;
  }
}



// ============================================================
// SANDBOX SYSTEM — Endgame build testing (F1)
// ============================================================

// SANDBOX_DEFAULTS moved to data/sandboxDefaults.js (loaded via <script> tag before this one)
