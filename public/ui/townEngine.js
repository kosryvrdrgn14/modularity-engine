// ============================================================
// TOWN ENGINE — Generic town UI framework
// Handles panels, navigation, swipe, typewriter
// ============================================================

class TownEngine {
  constructor({ audioManager, dataManager, gameManager, onTabSwitch, onLocationSelect, onBack, onCombat, onSandbox }) {
    this.audioManager = audioManager;
    this.dataManager = dataManager || null;
    this.gameManager = gameManager || null;
    // Region → background image mapping
    this._regionBgs = {
      town: 'assets/town_refugee_camp.svg',
      graveyard: 'assets/town_graveyard.svg',
      forest: 'assets/town_forest.svg',
    };
    this.onTabSwitch = onTabSwitch;
    this.onLocationSelect = onLocationSelect;
    this.onBack = onBack;
    this.onCombat = onCombat;
    this.onSandbox = onSandbox;

    this.dom = {
      screen: document.getElementById('town-screen'),
      bg: document.getElementById('town-bg'),
      campName: document.getElementById('town-camp-name'),
      gold: document.getElementById('town-gold'),
      runStats: document.getElementById('town-run-stats'),
      npcArea: document.getElementById('town-npc-area'),
    };

    this._breadcrumb = document.getElementById('town-breadcrumb');
    this._swipeIndicator = document.getElementById('town-swipe-indicator');
    this._regionName = document.getElementById('swipe-region-name');
    this._typewriterTimer = null;
    this._activePanel = null;

    // Swipe state
    this._swipeStartX = 0;
    this._swipeStartY = 0;
    this._swipeActive = false;

    // Location manager (injected)
    this.locationManager = null;

    // Dock menu
    this.dockMenu = null;

    this._setupEvents();
  }

  setLocationManager(locationManager) {
    this.locationManager = locationManager;
  }

  setDockMenu(dockMenu) {
    this.dockMenu = dockMenu;
  }

  _setupEvents() {
    // Panel close on backdrop click
    const backdrop = document.getElementById('panel-backdrop');
    if (backdrop) backdrop.addEventListener('click', () => this._closePanels());

    // Left panel CTA: Enter Combat
    const panelCombat = document.getElementById('panel-enter-combat');
    if (panelCombat) panelCombat.addEventListener('click', () => {
      this.audioManager?.playMenuSound('select');
      this.hide();
      if (this.onCombat) this.onCombat();
    });

    // Right panel: Sandbox
    const panelSandbox = document.getElementById('panel-open-sandbox');
    if (panelSandbox) panelSandbox.addEventListener('click', () => {
      this.audioManager?.playMenuSound('select');
      if (this.onSandbox) this.onSandbox();
    });

    // Back button
    const backBtn = document.getElementById('town-back');
    if (backBtn) backBtn.addEventListener('click', () => {
      this.audioManager?.playMenuSound('back');
      if (this.locationManager) this.locationManager.goBack();
      if (this.onBack) this.onBack();
    });

    // Swipe gestures on town screen
    const screen = this.dom.screen;
    screen.addEventListener('touchstart', (e) => {
      if (this.locationManager && !this.locationManager.isRoot()) return;
      this._swipeStartX = e.touches[0].clientX;
      this._swipeStartY = e.touches[0].clientY;
      this._swipeActive = true;
    }, { passive: true });
    screen.addEventListener('touchend', (e) => {
      if (!this._swipeActive) return;
      this._swipeActive = false;
      const dx = e.changedTouches[0].clientX - this._swipeStartX;
      const dy = e.changedTouches[0].clientY - this._swipeStartY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0) this._swipePrevRegion();
        else this._swipeNextRegion();
      }
    }, { passive: true });

    // Breadcrumb click delegation
    this._breadcrumb.addEventListener('click', (e) => {
      if (e.target.classList.contains('bc-back')) {
        this.audioManager.playMenuSound('back');
        if (this.locationManager) this.locationManager.goBack();
      } else if (e.target.classList.contains('bc-item') && !e.target.classList.contains('current')) {
        this.audioManager?.playMenuSound('select');
        const locId = e.target.dataset.locId;
        if (locId && this.locationManager) this.locationManager.navigateTo(locId);
      }
    });

    // Navigation arrows
    const arrowLeft = document.getElementById('town-arrow-left');
    const arrowRight = document.getElementById('town-arrow-right');
    if (arrowLeft) arrowLeft.addEventListener('click', () => this._swipePrevRegion());
    if (arrowRight) arrowRight.addEventListener('click', () => this._swipeNextRegion());

    // Keyboard navigation (ArrowLeft/ArrowRight)
    document.addEventListener('keydown', (e) => {
      if (!this.dom.screen?.classList.contains('active')) return;
      if (!this.locationManager?.isRoot()) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); this._swipePrevRegion(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this._swipeNextRegion(); }
    });
  }

  show() {
    this.dom.screen.classList.add('active');
    if (this.locationManager) {
      this.locationManager.locationHistory = [this.locationManager.currentLocationId];
    }
    this.renderBreadcrumb();
    this.renderLocationCards();
    this.updateSwipeIndicator();
  }

  hide() {
    this.dom.screen.classList.remove('active');
    this._closePanels();
    if (this._typewriterTimer) {
      clearInterval(this._typewriterTimer);
      this._typewriterTimer = null;
    }
  }

  handleTabSwitch(tab) {
    const leftPanel = document.getElementById('town-left-panel');
    const rightPanel = document.getElementById('town-right-panel');
    const backdrop = document.getElementById('panel-backdrop');

    if (tab === 'map') {
      leftPanel?.classList.remove('open');
      rightPanel?.classList.remove('open');
      backdrop?.classList.remove('active');
      this._activePanel = null;
    } else if (tab === 'social') {
      if (this._activePanel === 'left') {
        leftPanel?.classList.remove('open');
        backdrop?.classList.remove('active');
        this._activePanel = null;
      } else {
        leftPanel?.classList.add('open');
        rightPanel?.classList.remove('open');
        backdrop?.classList.add('active');
        this._activePanel = 'left';
      }
    } else if (tab === 'systems') {
      if (this._activePanel === 'right') {
        rightPanel?.classList.remove('open');
        backdrop?.classList.remove('active');
        this._activePanel = null;
      } else {
        rightPanel?.classList.add('open');
        leftPanel?.classList.remove('open');
        backdrop?.classList.add('active');
        this._activePanel = 'right';
      }
    } else if (tab === 'shop') {
      // Shop handled by TownScreen
    } else if (tab === 'combat') {
      this.hide();
      if (this.onCombat) this.onCombat();
    }
  }

  _closePanels() {
    document.getElementById('town-left-panel')?.classList.remove('open');
    document.getElementById('town-right-panel')?.classList.remove('open');
    document.getElementById('panel-backdrop')?.classList.remove('active');
    this._activePanel = null;
    document.querySelectorAll('.dock-tab').forEach(t => t.classList.remove('active'));
    document.getElementById('dock-map')?.classList.add('active');
  }

  renderBreadcrumb() {
    if (!this._breadcrumb || !this.locationManager) return;
    this._breadcrumb.innerHTML = '';

    // Back button
    if (this.locationManager.canGoBack()) {
      const back = document.createElement('span');
      back.className = 'bc-back';
      back.textContent = '◀ ';
      this._breadcrumb.appendChild(back);
    }

    // History as breadcrumb items
    const history = this.locationManager.locationHistory;
    const region = this.locationManager.getCurrentRegion();
    for (let i = 0; i < history.length; i++) {
      const locId = history[i];
      const loc = region.locations[locId];
      if (!loc) continue;
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'bc-sep';
        sep.textContent = ' › ';
        this._breadcrumb.appendChild(sep);
      }
      const item = document.createElement('span');
      item.className = 'bc-item' + (i === history.length - 1 ? ' current' : '');
      item.textContent = loc.name;
      item.dataset.locId = locId;
      this._breadcrumb.appendChild(item);
    }
  }

  renderLocationCards() {
    const area = this.dom.npcArea;
    if (!area || !this.locationManager) return;

    // Prevent double-render within same frame
    if (this._renderLock) return;
    this._renderLock = true;
    requestAnimationFrame(() => { this._renderLock = false; });

    area.innerHTML = '';
    const curLoc = this.locationManager.getCurrentLocation();
    if (!curLoc) return;

    // Get content renderer if available
    const contentRenderer = this._contentRenderer;

    // 1. Upgrade card at city_root (delegated to content)
    if (curLoc.id === 'city_root' && contentRenderer?.renderUpgradeCard) {
      contentRenderer.renderUpgradeCard(area);
    }

    // 2. NPCs at current location
    const npcs = this.locationManager.getNPCsAtLocation(curLoc.id);
    for (const npc of npcs) {
      const card = contentRenderer?.createNPCCard
        ? contentRenderer.createNPCCard(npc, false)
        : this._createDefaultNPCCard(npc);
      area.appendChild(card);
    }

    // 2b. Battle card (if location has a stageId)
    if (curLoc.stageId && this.dataManager) {
      const stages = this.dataManager._allStages || (Array.isArray(this.dataManager.stages) ? this.dataManager.stages : [this.dataManager.stages]);
      const stage = stages?.find(s => s.id === curLoc.stageId);
      if (stage) {
        const card = document.createElement('div');
        card.className = 'battle-card';
        const tiers = curLoc.stageConfig?.tiers || ['standard'];
        const weapons = curLoc.stageConfig?.recommendedWeapons || [];
        const weaponNames = weapons.map(wid => {
          const w = this.dataManager.weapons?.find(w => w.id === wid);
          return w?.name || wid;
        });
        card.innerHTML = `
          <div class="battle-card-header">
            <span class="battle-card-icon">⚔️</span>
            <div class="battle-card-info">
              <div class="battle-card-name">${stage.name}</div>
              <div class="battle-card-desc">${stage.description || ''}</div>
            </div>
          </div>
          <div class="battle-card-tiers">
            ${tiers.map(t => `<button class="battle-tier-btn${t === 'standard' ? ' active' : ''}" data-tier="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</button>`).join('')}
          </div>
          ${weaponNames.length ? `<div class="battle-card-weapons">Recommended: ${weaponNames.join(', ')}</div>` : ''}
        `;
        // Tier button clicks
        card.querySelectorAll('.battle-tier-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            card.querySelectorAll('.battle-tier-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
          });
        });
        // Card click starts combat
        card.addEventListener('click', () => {
          this.audioManager?.playMenuSound('select');
          // Set selected tier
          const activeTier = card.querySelector('.battle-tier-btn.active')?.dataset.tier || 'standard';
          this.gameManager?.set('session.current_stage_tier', activeTier);
          this.onCombat();
        });
        area.appendChild(card);
      }
    }

    // 3. Location cards (children)
    const children = this.locationManager.getChildLocations(this.locationManager.currentLocationId);
    for (const child of children) {
      const card = document.createElement('div');
      card.className = 'location-card' + (child.locked ? ' locked' : '');
      card.innerHTML = `
        <span class="loc-icon">${child.icon}</span>
        <div class="loc-info">
          <div class="loc-name">${child.name}</div>
          <div class="loc-desc">${child.locked ? '\u{1f512} ' + (child.desc || 'Locked') : child.desc || ''}</div>
          ${child.locked ? '<div class="loc-lock">\u{1f512} Locked</div>' : ''}
        </div>
        ${!child.locked ? '<span class="loc-arrow">\u25b8</span>' : ''}
      `;
      if (!child.locked) {
        card.addEventListener('click', (e) => {
          e.stopPropagation();
          this.audioManager?.playMenuSound('select');
          this.locationManager.navigateTo(child.id);
        });
      }
      area.appendChild(card);
    }

    // 4. Empty state
    if (npcs.length === 0 && children.length === 0 && curLoc.id !== 'city_root') {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'location-card';
      emptyCard.innerHTML = '<span class="loc-icon">\u{1f3d5}\ufe0f</span><div class="loc-info"><div class="loc-name">Nothing here yet</div><div class="loc-desc">This location will be populated in future updates</div></div>';
      area.appendChild(emptyCard);
    }
  }

  _createDefaultNPCCard(npc, isLocked = false) {
    const card = document.createElement('div');
    card.className = 'npc-card' + (isLocked ? ' locked' : '');
    card.innerHTML = `
      <div class="npc-portrait" style="width:80px;height:80px;border-radius:50%;background:#333;"></div>
      <div class="npc-info">
        <div class="npc-name">${npc.name}</div>
        <div class="npc-greeting">"${(npc.greeting || '').substring(0, 60)}..."</div>
        <div class="npc-action">\u25b8 Talk</div>
      </div>
    `;
    return card;
  }

  updateSwipeIndicator() {
    if (!this._swipeIndicator || !this.locationManager) return;
    const dots = this._swipeIndicator.querySelectorAll('.swipe-dot');
    const regions = this.locationManager.getRegions();
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === this.locationManager.currentRegionIndex);
      dot.style.display = i < regions.length ? '' : 'none';
      if (regions[i]) dot.title = regions[i].name;
    });
    if (this._regionName) {
      this._regionName.textContent = regions[this.locationManager.currentRegionIndex]?.name || '';
    }
    // Update background image for current region
    const curRegion = regions[this.locationManager.currentRegionIndex];
    if (curRegion && this.dom.bg) {
      const bgUrl = this._regionBgs[curRegion.id];
      if (bgUrl && this.dom.bg.src !== new URL(bgUrl, location.href).href) {
        this.dom.bg.src = bgUrl;
      }
    }
    // Update arrow visibility
    const idx = this.locationManager.currentRegionIndex;
    const arrowLeft = document.getElementById('town-arrow-left');
    const arrowRight = document.getElementById('town-arrow-right');
    if (arrowLeft) arrowLeft.style.visibility = idx > 0 ? 'visible' : 'hidden';
    if (arrowRight) arrowRight.style.visibility = idx < regions.length - 1 ? 'visible' : 'hidden';
  }

  _swipeNextRegion() {
    if (!this.locationManager) return;
    const idx = this.locationManager.currentRegionIndex;
    if (idx < this.locationManager.getRegionCount() - 1) {
      this.audioManager.playMenuSound('select');
      this.locationManager.switchRegion(idx + 1);
      this.renderBreadcrumb();
      this.renderLocationCards();
      this.updateSwipeIndicator();
    }
  }

  _swipePrevRegion() {
    if (!this.locationManager) return;
    const idx = this.locationManager.currentRegionIndex;
    if (idx > 0) {
      this.audioManager.playMenuSound('select');
      this.locationManager.switchRegion(idx - 1);
      this.renderBreadcrumb();
      this.renderLocationCards();
      this.updateSwipeIndicator();
    }
  }

  _onLocationNavigate(loc) {
    this.renderBreadcrumb();
    this.renderLocationCards();
    this.updateSwipeIndicator();
  }

  typewriteText(text, onComplete) {
    if (this._typewriterTimer) {
      clearInterval(this._typewriterTimer);
      this._typewriterTimer = null;
    }
    if (!text) {
      if (onComplete) onComplete();
      return;
    }

    const textEl = document.getElementById('dialogue-text');
    if (!textEl) {
      if (onComplete) onComplete();
      return;
    }

    textEl.textContent = '';
    let i = 0;
    this._typewriterTimer = setInterval(() => {
      if (i < text.length) {
        textEl.textContent += text[i];
        i++;
      } else {
        clearInterval(this._typewriterTimer);
        this._typewriterTimer = null;
        if (onComplete) onComplete();
      }
    }, 25);
  }

  setContentRenderer(renderer) {
    this._contentRenderer = renderer;
  }
}
