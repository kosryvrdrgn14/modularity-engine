class TownScreen {
  constructor(game) {
    this.game = game;
    this.dom = {
      screen: document.getElementById('town-screen'),
      bg: document.getElementById('town-bg'),
      campName: document.getElementById('town-camp-name'),
      gold: document.getElementById('town-gold'),
      runStats: document.getElementById('town-run-stats'),
      npcArea: document.getElementById('town-npc-area'),
      fightBtn: document.getElementById('town-fight'),
      titleBtn: document.getElementById('town-title'),
      dialogueOverlay: document.getElementById('dialogue-overlay'),
      dialoguePortrait: document.getElementById('dialogue-portrait'),
      dialogueName: document.getElementById('dialogue-name'),
      dialogueText: document.getElementById('dialogue-text'),
      dialogueChoices: document.getElementById('dialogue-choices'),
      dialogueContinue: document.getElementById('dialogue-continue'),
    };
    this._typewriterTimer = null;
    this._lastRunStats = null;
    this._dogDialoguePending = false;
    this._lastDialogueNpcId = null;
    this._companionSlots = [
      document.getElementById('companion-slot-0'),
      document.getElementById('companion-slot-1'),
      document.getElementById('companion-slot-2'),
    ];
    this._dogDialogue = document.getElementById('dog-dialogue');
    this._dogPortrait = document.getElementById('dog-dialogue-portrait');
    this._dogText = document.getElementById('dog-dialogue-text');
    this._dogChoices = document.getElementById('dog-dialogue-choices');
    this._notifEl = document.getElementById('companion-notification');
    this._breadcrumb = document.getElementById('town-breadcrumb');
    this._swipeIndicator = document.getElementById('town-swipe-indicator');
    this._regionName = document.getElementById('swipe-region-name');
    
    // D1: Location Manager
    this.locationManager = new LocationManager(this.game.gameManager);
    this.locationManager.onNavigate = (loc) => this._onLocationNavigate(loc);
    
    // D3: Shop System
    this.shopSystem = new ShopSystem(this.game.gameManager, this.game.eventBus);
    
    // D2: Swipe state
    this._swipeStartX = 0;
    this._swipeStartY = 0;
    this._swipeActive = false;
    
    this._setupEvents();
  }

  _setupEvents() {
    // Bottom dock tab switching
    this._activePanel = null;
    const dockTabs = ['map', 'social', 'systems', 'shop', 'combat'];
    for (const key of dockTabs) {
      const btn = document.getElementById('dock-' + key);
      if (btn) btn.addEventListener('click', () => this._switchDockTab(key));
    }

    // Panel close on backdrop click
    const backdrop = document.getElementById('panel-backdrop');
    if (backdrop) backdrop.addEventListener('click', () => this._closePanels());

    // Left panel CTA: Enter Combat
    const panelCombat = document.getElementById('panel-enter-combat');
    if (panelCombat) panelCombat.addEventListener('click', () => {
      this.game.audioManager?.playMenuSound('select');
      this.hide();
      this.game.startGame();
    });

    // Right panel: Sandbox
    const panelSandbox = document.getElementById('panel-open-sandbox');
    if (panelSandbox) panelSandbox.addEventListener('click', () => {
      this.game.audioManager?.playMenuSound('select');
      this._openSandbox();
    });

    // Back button
    const backBtn = document.getElementById('town-back');
    if (backBtn) backBtn.addEventListener('click', () => {
      this.game.audioManager?.playMenuSound('back');
      this.locationManager.goBack();
      this._updateDisplay();
      this._renderBreadcrumb();
      this._renderLocationCards();
    });


    // D2: Swipe gestures on town screen
    const screen = this.dom.screen;
    screen.addEventListener('touchstart', (e) => {
      if (!this.locationManager.isRoot()) return;
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

    // Breadcrumb back button delegated
    this._breadcrumb.addEventListener('click', (e) => {
      if (e.target.classList.contains('bc-back')) {
        this.game.audioManager.playMenuSound('back');
        this.locationManager.goBack();
      } else if (e.target.classList.contains('bc-item') && !e.target.classList.contains('current')) {
        this.game.audioManager?.playMenuSound('select');
        const locId = e.target.dataset.locId;
        if (locId) this.locationManager.navigateTo(locId);
      }
    });
    this.dom.dialogueOverlay.addEventListener('click', (e) => {
      // Skip typewriter on click
      if (this._typewriterTimer && e.target === this.dom.dialogueText) {
        clearInterval(this._typewriterTimer);
        this._typewriterTimer = null;
      }
    });
    // dialogueContinue click handled inline in _showChoices() per-topic
    // so it loops back to choices instead of closing the overlay.
  }

  show(runStats) {
    this._lastRunStats = runStats;
    this.dom.screen.classList.add('active');
    // Reset to current region root
    this.locationManager.locationHistory = [this.locationManager.currentLocationId];
    this._updateDisplay();
    this._renderBreadcrumb();
    this._renderLeftPanel();
    this._renderRightPanel();
    this._renderLocationCards();
    this._renderFarmingSlotsButton();
    this._renderCompanionSlots();
    this._updateSwipeIndicator();
  }

  hide() {
    this.dom.screen.classList.remove('active');
    this.dom.dialogueOverlay.classList.remove('active');
    if (this._dogDialogue) this._dogDialogue.classList.remove('active');
    if (this._notifEl) this._notifEl.classList.remove('active');
    if (this._typewriterTimer) {
      clearInterval(this._typewriterTimer);
      this._typewriterTimer = null;
    }
  }

  _updateDisplay() {
    const gm = this.game.gameManager;
    const phase = gm.get('persistent.town.phase') || 1;
    const gold = gm.get_currency() || 0;
    const campName = phase >= 2 ? 'Refugee Camp (Upgraded)' : 'Refugee Camp';

    this.dom.campName.textContent = campName;
    this.dom.gold.textContent = `💰 ${gold}`;
    this.dom.bg.src = phase >= 2 ? 'assets/town_wooden_shacks.svg' : 'assets/town_refugee_camp.svg';

    if (this._lastRunStats) {
      this.dom.runStats.textContent = `⏱ ${this._lastRunStats.time}  Lv${this._lastRunStats.level}  ☠ ${this._lastRunStats.kills}`;
    }

    // Update unlocked NPCs
    for (const key in NPC_DATA) {
      const npc = NPC_DATA[key];
      if (npc.unlockCondition) {
        npc.unlocked = !!gm.get_flag(npc.unlockCondition);
      }
    }
    // Update background from current location
    const curLoc = this.locationManager.getCurrentLocation();
    if (curLoc && curLoc.background) {
      this.dom.bg.src = curLoc.background;
    }
    // Update camp name from current location
    if (curLoc) {
      this.dom.campName.textContent = curLoc.name;
    }
    // D5: Show pending disaster notification
    if (this.game._pendingDisaster) {
      const d = this.game._pendingDisaster;
      this._showDisasterNotification(d);
      this.game._pendingDisaster = null;
    }
    // E3: Auto-collect estate production on town visit
    if (this.game.estateSystem) {
      const estates = this.game.estateSystem.getEstates();
      for (const estate of estates) {
        const produced = this.game.estateSystem.collectProduction(estate.wifeId);
        if (produced && Object.values(produced).some(v => v > 0)) {
          this._showEstateProduction(estate, produced);
        }
      }
    }
  }



  _openDialogue(npc) {
    if (!npc || !npc.topics) return;
    this._lastDialogueNpcId = npc.id;
    // Use inline SVG for reliable rendering
    const svgHtml = SVG_PORTRAITS[npc.id] || '';
    if (svgHtml) {
      const styled = svgHtml.replace('<svg ', '<svg style="width:80px;height:80px;border-radius:50%;border:2px solid rgba(255,215,0,0.2);flex-shrink:0;" ');
      this.dom.dialoguePortrait.innerHTML = styled;
    }
    this.dom.dialogueName.textContent = npc.name || 'Unknown';
    this.dom.dialogueChoices.style.display = 'none';
    this.dom.dialogueContinue.style.display = 'none';
    this.dom.dialogueOverlay.classList.add('active');

    // Show greeting with typewriter, then show choices
    this._typewriteText(npc.greeting || '...', () => {
      this._showChoices(npc);
    });
  }

  _showChoices(npc) {
    this.dom.dialogueChoices.innerHTML = '';
    this.dom.dialogueChoices.style.display = 'flex';

    for (const topic of npc.topics) {
      const btn = document.createElement('button');
      btn.className = 'dialogue-choice';
      btn.textContent = topic.text;
      btn.addEventListener('click', () => {
        this.game.audioManager.playMenuSound('select');
        if (topic.close) {
          this.dom.dialogueOverlay.classList.remove('active');
          // Trigger dog dialogue after Lina's conversation
          if (this._lastDialogueNpcId === 'cute_girl' && !this.game.gameManager.has_companion('dog')) {
            setTimeout(() => this._showDogDialogue(), 300);
          }
          return;
        }
        // Set flag if defined
        if (topic.flag) {
          this.game.gameManager.set_flag(topic.flag, true);
        }
        // E2: Add affection via AffectionSystem
        if (topic.affection > 0 && this.game.affectionSystem) {
          this.game.affectionSystem.addAffection(npc.id, topic.affection);
        } else if (topic.affection > 0) {
          const key = `affection_${npc.id}`;
          this.game.gameManager.add_counter(key, topic.affection);
        }
        // Show response
        this.dom.dialogueChoices.style.display = 'none';
        if (topic.response) {
          this._typewriteText(topic.response, () => {
            this.dom.dialogueContinue.style.display = 'block';
            this.dom.dialogueContinue.onclick = () => {
              this.game.audioManager?.playMenuSound('select');
              this.dom.dialogueContinue.style.display = 'none';
              this._showChoices(npc);
            };
          });
        } else {
          // Null response — just show continue or close
          this._typewriteText('', () => {
            this.dom.dialogueContinue.style.display = 'block';
            this.dom.dialogueContinue.onclick = () => {
              this.game.audioManager?.playMenuSound('select');
              this.dom.dialogueContinue.style.display = 'none';
              this._showChoices(npc);
            };
          });
        }
      });
      this.dom.dialogueChoices.appendChild(btn);
    }
  }


  // ---- Dog dialogue (triggered after Lina) ----
  _showDogDialogue() {
    const gm = this.game.gameManager;
    if (gm.has_companion('dog')) return; // already have the dog

    const dogSvg = SVG_PORTRAITS['dog'] || '';
    if (dogSvg) {
      this._dogPortrait.innerHTML = dogSvg.replace('<svg ', '<svg style="width:52px;height:52px;border-radius:50%;border:2px solid rgba(139,90,43,0.4);" ');
    }

    this._dogDialogue.classList.add('active');
    this._dogText.textContent = '';
    this._dogChoices.style.display = 'none';

    // Typewriter the bark
    const greetings = ['Woof! *tail wag*', '*sniff sniff* ...Woof!', 'Arf! *happy dance*'];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    this._typewriteText(greeting, () => {
      this._dogChoices.style.display = 'flex';
      this._dogChoices.innerHTML = '';

      const petBtn = document.createElement('button');
      petBtn.className = 'dog-choice';
      petBtn.textContent = '🐕 Pet the dog';
      petBtn.addEventListener('click', () => {
        this.game.audioManager.playMenuSound('select');
        this._dogDialogue.classList.remove('active');
        gm.add_companion('dog');
        this._showCompanionNotification('Dog', 'Has joined your party!');
        this._renderCompanionSlots();
      });

      const ignoreBtn = document.createElement('button');
      ignoreBtn.className = 'dog-choice ignore';
      ignoreBtn.textContent = 'Walk away';
      ignoreBtn.addEventListener('click', () => {
        this.game.audioManager.playMenuSound('back');
        this._dogDialogue.classList.remove('active');
      });

      this._dogChoices.appendChild(petBtn);
      this._dogChoices.appendChild(ignoreBtn);
    });
  }

  _showCompanionNotification(name, desc) {
    const titleEl = this._notifEl.querySelector('.notif-title');
    const descEl = this._notifEl.querySelector('.notif-desc');
    titleEl.textContent = name + ' has joined the party!';
    descEl.textContent = desc || '';
    this._notifEl.classList.add('active');
    this.game.audioManager.playMenuSound('powerup');

    setTimeout(() => {
      this._notifEl.classList.remove('active');
    }, 2500);
  }

  _renderCompanionSlots() {
    const gm = this.game.gameManager;
    const companions = gm.get_companions();
    const companionData = {
      dog: { name: 'Dog', svg: SVG_PORTRAITS['dog'] || '' }
    };

    for (let i = 0; i < 3; i++) {
      const slot = this._companionSlots[i];
      if (!slot) continue;
      if (i < companions.length) {
        const data = companionData[companions[i]];
        slot.className = 'companion-slot filled';
        if (data && data.svg) {
          slot.innerHTML = data.svg.replace('<svg ', '<svg style="width:48px;height:48px;" ') +
            '<div class="companion-name">' + data.name + '</div>';
        } else {
          slot.innerHTML = '<span class="empty-icon">?</span><div class="companion-name">' + (data ? data.name : companions[i]) + '</div>';
        }
      } else {
        slot.className = 'companion-slot';
        slot.innerHTML = '<span class="empty-icon">+</span>';
      }
    }
  }


  // Dock tab switching
  _switchDockTab(tab) {
    this.game.audioManager?.playMenuSound('select');

    // Update active tab
    document.querySelectorAll('.dock-tab').forEach(t => t.classList.remove('active'));
    const btn = document.getElementById('dock-' + tab);
    if (btn) btn.classList.add('active');

    const leftPanel = document.getElementById('town-left-panel');
    const rightPanel = document.getElementById('town-right-panel');
    const backdrop = document.getElementById('panel-backdrop');

    if (tab === 'map') {
      // Close all panels
      leftPanel?.classList.remove('open');
      rightPanel?.classList.remove('open');
      backdrop?.classList.remove('active');
      this._activePanel = null;
    } else if (tab === 'social') {
      // Toggle left panel
      if (this._activePanel === 'left') {
        leftPanel?.classList.remove('open');
        backdrop?.classList.remove('active');
        this._activePanel = null;
      } else {
        leftPanel?.classList.add('open');
        rightPanel?.classList.remove('open');
        backdrop?.classList.add('active');
        this._activePanel = 'left';
        this._renderLeftPanel();
      }
    } else if (tab === 'systems') {
      // Toggle right panel
      if (this._activePanel === 'right') {
        rightPanel?.classList.remove('open');
        backdrop?.classList.remove('active');
        this._activePanel = null;
      } else {
        rightPanel?.classList.add('open');
        leftPanel?.classList.remove('open');
        backdrop?.classList.add('active');
        this._activePanel = 'right';
        this._renderRightPanel();
      }
    } else if (tab === 'shop') {
      // Open shop overlay
      this.game.audioManager?.playMenuSound('select');
      this._openShopOverlay();
    } else if (tab === 'combat') {
      // Start combat
      this.game.audioManager?.playMenuSound('select');
      this.game.startGame();
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

  // Render left panel content
  _renderLeftPanel() {
    const questArea = document.getElementById('panel-quests');
    const npcArea = document.getElementById('panel-npcs');
    const compArea = document.getElementById('panel-companions');
    if (!questArea || !npcArea) return;

    // Quests (priority)
    questArea.innerHTML = '';
    const pinnedQuest = '<div class="panel-card"><span class="panel-card-icon">⚔️</span><div class="panel-card-info"><div class="panel-card-name">Clear the Graveyard</div><div class="panel-card-desc">Survive and defeat the boss</div></div><span class="panel-card-badge gold">Active</span></div>';
    questArea.innerHTML = pinnedQuest;

    // NPCs at current location
    npcArea.innerHTML = '';
    const curLoc = this.locationManager?.getCurrentLocation();
    const npcs = curLoc ? (this.locationManager.getNPCsAtLocation(curLoc.id) || []) : [];
    for (const npc of npcs.slice(0, 3)) {
      const svg = SVG_PORTRAITS[npc.id] || '<div style="width:36px;height:36px;border-radius:50%;background:#333;"></div>';
      const svgSmall = svg.replace('<svg ', '<svg style="width:36px;height:36px;" ');
      const locked = npc.locked && !this.game.gameManager?.get_flag(npc.unlockCondition);
      const card = document.createElement('div');
      card.className = 'panel-card' + (locked ? ' locked' : '');
      card.innerHTML = `<span class="panel-card-icon">${svgSmall}</span><div class="panel-card-info"><div class="panel-card-name">${npc.name}</div><div class="panel-card-desc">${locked ? '🔒 Locked' : '💬 Tap to talk'}</div></div>`;
      if (!locked) {
        card.addEventListener('click', () => {
          this._closePanels();
          this._openDialogue(npc);
        });
      }
      npcArea.appendChild(card);
    }

    // Companion status
    if (compArea) {
      compArea.innerHTML = '';
      const companions = this.game.companionSystem?.companions || [];
      for (const [id, comp] of Object.entries(companions)) {
        const status = this.game.gameManager?.getCompanionDeployStatus(id) || 'available';
        const card = document.createElement('div');
        card.className = 'panel-card';
        card.innerHTML = `<span class="panel-card-icon">🐕</span><div class="panel-card-info"><div class="panel-card-name">${comp.name || id}</div><div class="panel-card-desc">Status: ${status}</div></div><span class="panel-card-badge ${status === 'deployed_combat' ? 'green' : ''}">${status}</span>`;
        compArea.appendChild(card);
      }
      if (Object.keys(companions).length === 0) {
        compArea.innerHTML = '<div class="panel-card locked"><span class="panel-card-icon">🐕</span><div class="panel-card-info"><div class="panel-card-name">No companions</div><div class="panel-card-desc">Pet the dog at camp to recruit</div></div></div>';
      }
    }
  }

  // Render right panel content
  _renderRightPanel() {
    const locArea = document.getElementById('panel-locations');
    const farmArea = document.getElementById('panel-farming');
    if (!locArea) return;

    // Locations
    locArea.innerHTML = '';
    const region = this.locationManager?.getCurrentRegion();
    const children = this.locationManager?.getChildLocations(this.locationManager.currentLocationId) || [];
    const currentId = this.locationManager?.currentLocationId;

    // Current location
    const curCard = document.createElement('div');
    curCard.className = 'panel-card current';
    curCard.innerHTML = '<span class="panel-card-icon">📍</span><div class="panel-card-info"><div class="panel-card-name">Current Location</div></div><span class="panel-card-badge">●</span>';
    locArea.appendChild(curCard);

    // Child locations
    for (const child of children) {
      const locked = child.locked && !this.game.gameManager?.get_flag(child.unlockCondition);
      const card = document.createElement('div');
      card.className = 'panel-card' + (locked ? ' locked' : '');
      card.innerHTML = `<span class="panel-card-icon">${child.icon || '📍'}</span><div class="panel-card-info"><div class="panel-card-name">${child.name}</div><div class="panel-card-desc">${locked ? '🔒 Locked' : child.desc || 'Tap to visit'}</div></div>`;
      if (!locked) {
        card.addEventListener('click', () => {
          this.locationManager.navigateTo(child.id);
          this._closePanels();
          this._updateDisplay();
          this._renderBreadcrumb();
          this._renderLocationCards();
        });
      }
      locArea.appendChild(card);
    }

    // Farming
    if (farmArea) {
      farmArea.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const status = this.game.farmingSystem?.getSlotStatus(i + 1);
        const label = ['🐕 Companion', '⚔️ Adventurer', '🔄 Flexible'][i];
        const card = document.createElement('div');
        card.className = 'panel-card' + (status?.status === 'locked' ? ' locked' : '');
        if (status?.status === 'running') {
          const pct = Math.round(status.progress * 100);
          card.innerHTML = `<span class="panel-card-icon">⏳</span><div class="panel-card-info"><div class="panel-card-name">${label}</div><div class="panel-card-desc">${pct}% complete</div></div><span class="panel-card-badge">Running</span>`;
        } else if (status?.status === 'complete') {
          card.innerHTML = `<span class="panel-card-icon">✅</span><div class="panel-card-info"><div class="panel-card-name">${label}</div><div class="panel-card-desc">Loot ready!</div></div><span class="panel-card-badge green">Collect</span>`;
          card.addEventListener('click', () => {
            this._collectFarmingSlot(i + 1);
            this._renderRightPanel();
          });
        } else if (status?.status === 'idle') {
          card.innerHTML = `<span class="panel-card-icon">${label.split(' ')[0]}</span><div class="panel-card-info"><div class="panel-card-name">${label}</div><div class="panel-card-desc">Tap to assign</div></div>`;
          card.addEventListener('click', () => {
            this._assignFarmingSlot(i + 1);
            this._renderRightPanel();
          });
        } else {
          card.innerHTML = `<span class="panel-card-icon">🔒</span><div class="panel-card-info"><div class="panel-card-name">${label}</div><div class="panel-card-desc">Complete 3★ to unlock</div></div>`;
        }
        farmArea.appendChild(card);
      }
    }
  }

  // Open shop overlay (reused)
  _openShopOverlay() {
    // Delegate to existing shop logic
    const overlay = document.getElementById('shop-overlay');
    if (overlay) {
      overlay.classList.add('active');
    }
  }

  // D1: Render breadcrumb navigation
  _renderBreadcrumb() {
    const bc = this._breadcrumb;
    if (!bc) return;
    bc.innerHTML = '';
    
    // Back button
    if (this.locationManager.canGoBack()) {
      const back = document.createElement('span');
      back.className = 'bc-back';
      back.textContent = '◀ ';
      bc.appendChild(back);
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
        bc.appendChild(sep);
      }
      const item = document.createElement('span');
      item.className = 'bc-item' + (i === history.length - 1 ? ' current' : '');
      item.textContent = loc.name;
      item.dataset.locId = locId;
      bc.appendChild(item);
    }
  }

  // D1: Render location cards for current location's children
  _renderLocationCards() {
    const area = this.dom.npcArea;
    if (!area) return;
    // Prevent double-render within same frame
    if (this._renderLock) return;
    this._renderLock = true;
    requestAnimationFrame(() => { this._renderLock = false; });
    area.innerHTML = '';
    
    const curLoc = this.locationManager.getCurrentLocation();
    if (!curLoc) return;

    // 1. Upgrade card at city_root (always show, before NPCs)
    if (curLoc.id === 'city_root') {
      this._renderUpgradeCard(area);
    }

    // 2. NPCs at current location (including locked ones with upgrade hint)
    const npcs = this.locationManager.getNPCsAtLocation(curLoc.id);
    // Also check for locked NPCs that should show as locked
    for (const key in NPC_DATA) {
      const npc = NPC_DATA[key];
      const loc = npc.location || 'city_root';
      if (loc !== curLoc.id) continue;
      if (npc.unlocked) continue; // already rendered above
      if (npcs.includes(npc)) continue;
      // Show locked NPC with greyed portrait
      const card = this._createNPCCard(npc, true);
      area.appendChild(card);
    }
    for (const npc of npcs) {
      const card = this._createNPCCard(npc, false);
      area.appendChild(card);
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
          this.game.audioManager?.playMenuSound('select');
          this.locationManager.navigateTo(child.id);
        });
      }
      area.appendChild(card);
    }

    // 4. Empty state for locations with no content
    if (npcs.length === 0 && children.length === 0 && curLoc.id !== 'city_root') {
      const emptyCard = document.createElement('div');
      emptyCard.className = 'location-card';
      emptyCard.innerHTML = '<span class="loc-icon">\u{1f3d5}\ufe0f</span><div class="loc-info"><div class="loc-name">Nothing here yet</div><div class="loc-desc">This location will be populated in future updates</div></div>';
      area.appendChild(emptyCard);
    }
  }

  // D1: Create NPC card
  _createNPCCard(npc, isLocked) {
    const card = document.createElement('div');
    card.className = 'npc-card' + (isLocked ? ' locked' : '');
    const svgHtml = SVG_PORTRAITS[npc.id] || '<div class="npc-portrait"></div>';
    const svgWithClass = isLocked
      ? svgHtml.replace('<svg ', '<svg class="npc-portrait" style="filter: grayscale(1); opacity: 0.5;" ')
      : svgHtml.replace('<svg ', '<svg class="npc-portrait" ');

    if (isLocked) {
      const condText = npc.unlockCondition === 'town_camp_upgraded'
        ? 'Upgrade the camp to unlock' : 'Locked';
      card.innerHTML = `
        ${svgWithClass}
        <div class="npc-info">
          <div class="npc-name">${npc.name}</div>
          <div class="npc-lock-text" style="color:#886644;font-size:0.8rem;">\u{1f512} ${condText}</div>
        </div>
      `;
    } else {
      card.innerHTML = `
        ${svgWithClass}
        <div class="npc-info">
          <div class="npc-name">${npc.name}</div>
          <div class="npc-greeting">\"${(npc.greeting || '').substring(0, 60)}${(npc.greeting || '').length > 60 ? '...' : ''}\"</div>
          <div class="npc-action">\u25b8 Talk</div>
        </div>
      `;
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this.game.audioManager?.playMenuSound('select');
        this._openDialogue(npc);
      });
    }
    return card;
  }


  // D1: Render upgrade card (camp upgrade)
  _renderUpgradeCard(area) {
    const gm = this.game.gameManager;
    const phase = gm.get('persistent.town.phase') || 1;
    const gold = gm.get_currency() || 0;
    if (phase > 1) return; // Already upgraded
    const canAfford = gold >= 100;
    const upgradeCard = document.createElement('div');
    upgradeCard.className = 'upgrade-card' + (canAfford ? '' : ' disabled');
    upgradeCard.innerHTML = `
      <span class="upgrade-label">🔨 Upgrade Camp — Build Wooden Shacks</span>
      <span class="upgrade-cost">${canAfford ? '100g' : 'Need 100g'}</span>
    `;
    if (canAfford) {
      upgradeCard.addEventListener('click', () => {
        this.game.audioManager.playMenuSound('select');
        gm.spend_currency(100, 'camp_upgrade');
        gm.set_flag('town_camp_upgraded', true);
        gm.set('persistent.town.phase', 2);
        NPC_DATA.cute_girl.unlocked = true;
        this._updateDisplay();
        this._renderLocationCards();
      });
    }
    area.appendChild(upgradeCard);
  }

  // D2: Swipe to next/prev region
  _swipeNextRegion() {
    const idx = this.locationManager.currentRegionIndex;
    if (idx < this.locationManager.getRegionCount() - 1) {
      this.game.audioManager.playMenuSound('select');
      this.locationManager.switchRegion(idx + 1);
      this._renderBreadcrumb();
      this._renderLocationCards();
      this._updateSwipeIndicator();
      this._updateDisplay();
    }
  }

  _swipePrevRegion() {
    const idx = this.locationManager.currentRegionIndex;
    if (idx > 0) {
      this.game.audioManager.playMenuSound('select');
      this.locationManager.switchRegion(idx - 1);
      this._renderBreadcrumb();
      this._renderLocationCards();
      this._updateSwipeIndicator();
      this._updateDisplay();
    }
  }

  // D2: Update swipe indicator dots
  _updateSwipeIndicator() {
    if (!this._swipeIndicator) return;
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
  }

  // D1: Called when location changes
  _onLocationNavigate(loc) {
    this._renderBreadcrumb();
    this._renderLocationCards();
    if (this.locationManager.isRoot()) {
      this._renderFarmingSlotsButton();
      this._renderCompanionSlots();
    }
    this._updateDisplay();
  }

  // Override _renderNPCs to use location system
  _renderNPCs() {
    this._renderLocationCards();
  }

  // D5: Show disaster notification
  _showDisasterNotification(disaster) {
    const area = this.dom.npcArea;
    const card = document.createElement('div');
    card.className = 'location-card';
    card.style.borderColor = 'rgba(255, 80, 50, 0.4)';
    card.style.background = 'rgba(255, 50, 30, 0.08)';
    const gold = this.game.gameManager.get_currency() || 0;
    const canAfford = gold >= disaster.goldCost;
    card.innerHTML = `
      <span class="loc-icon">${disaster.name.split(' ')[0]}</span>
      <div class="loc-info">
        <div class="loc-name" style="color: #FF6B4A;">${disaster.name}</div>
        <div class="loc-desc">${disaster.desc}</div>
        <div class="loc-desc" style="color: ${canAfford ? '#FFD700' : '#FF4444'};">💰 ${disaster.goldCost} gold to resolve</div>
      </div>
      ${canAfford ? '<span class="loc-arrow" style="color: #FF6B4A;">💰 Resolve</span>' : '<span class="loc-lock">Cannot afford</span>'}
    `;
    if (canAfford) {
      card.addEventListener('click', () => {
        this.game.audioManager.playMenuSound('select');
        const result = this.game.disasterSystem.resolve(disaster, gold);
        if (result.resolved) {
          card.style.borderColor = 'rgba(80, 255, 80, 0.3)';
          card.querySelector('.loc-desc').textContent = '✅ Resolved!';
          setTimeout(() => card.remove(), 1500);
        }
      });
    }
    // Insert at top
    area.insertBefore(card, area.firstChild);
  }

  // E1: Render farming slots UI
  _renderFarmingSlotsButton() {
    const area = this.dom.npcArea;
    if (!area) return;
    if (!this.locationManager.isRoot()) return;

    let activeCount = 0, completedCount = 0;
    for (let i = 0; i < 3; i++) {
      const s = this.game.farmingSystem?.getSlotStatus(i + 1);
      if (s?.status === 'running') activeCount++;
      if (s?.status === 'complete') completedCount++;
    }

    const btn = document.createElement('div');
    btn.className = 'location-card';
    btn.style.cursor = 'pointer';
    btn.innerHTML = `
      <span class="loc-icon">\u{1f4cb}</span>
      <div class="loc-info">
        <div class="loc-name">Auto-Clear Farming</div>
        <div class="loc-desc">${activeCount} active${completedCount > 0 ? ' \u00b7 ' + completedCount + ' loot ready' : ''}</div>
      </div>
      <span class="loc-arrow">\u25b8</span>`;
    btn.addEventListener('click', () => {
      this.game.audioManager?.playMenuSound('select');
      this._openFarmingMenu();
    });
    area.appendChild(btn);
  }

  _openFarmingMenu() {
    const overlay = document.getElementById('shop-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    const header = document.getElementById('shop-header');
    if (header) header.querySelector('.shop-title').textContent = '\u{1f4cb} Auto-Clear Farming';
    const tabs = document.getElementById('shop-tabs');
    if (tabs) tabs.style.display = 'none';
    const items = document.getElementById('shop-items');
    if (!items) return;
    items.innerHTML = '';

    for (let i = 0; i < 3; i++) {
      const status = this.game.farmingSystem?.getSlotStatus(i + 1);
      const slotLabel = FARMING_CONFIG.slotLabels[i];
      const card = document.createElement('div');
      card.className = 'shop-item';

      if (status?.status === 'locked') {
        card.classList.add('cant-afford');
        card.innerHTML = `<span class="item-icon">\u{1f512}</span><div class="item-info"><div class="item-name">${slotLabel}</div><div class="item-desc">Complete 3\u2605 on a stage to unlock</div></div>`;
      } else if (status?.status === 'idle') {
        card.innerHTML = `<span class="item-icon">${slotLabel.split(' ')[0]}</span><div class="item-info"><div class="item-name">${slotLabel}</div><div class="item-desc">Tap to assign \u2014 Graveyard (5min)</div></div><span class="item-cost" style="color:#4FC3F7;">Assign \u25b8</span>`;
        card.addEventListener('click', () => {
          this.game.audioManager?.playMenuSound('select');
          this._assignFarmingSlot(i + 1);
          this._openFarmingMenu();
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
          this.game.audioManager?.playMenuSound('powerup');
          this._collectFarmingSlot(i + 1);
          this._openFarmingMenu();
        });
      }
      items.appendChild(card);
    }

    const closeBtn = document.getElementById('shop-close');
    if (closeBtn) {
      closeBtn.onclick = () => {
        overlay.classList.remove('active');
        if (tabs) tabs.style.display = '';
        if (header) header.querySelector('.shop-title').textContent = '\u{1f6d2} Grand Bazaar';
      };
    }
  }


  _assignFarmingSlot(slotId) {
    // For now, auto-assign to the first available stage
    // In full implementation, show a stage picker
    const stageId = 'stage_graveyard';
    const companions = this.game.gameManager.get_companions();
    const slotType = FARMING_CONFIG.slotTypes[slotId - 1];
    let unitType = slotType;
    let unitId = null;

    if (slotType === 'companion' && companions.length > 0) {
      // Find first available companion
      for (const cid of companions) {
        if (this.game.gameManager.getCompanionDeployStatus(cid) === 'available') {
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
      unitId = companions.find(c => this.game.gameManager.getCompanionDeployStatus(c) === 'available') || 'hired_flex';
    }

    if (!unitId) {
      // No available unit — show notification
      return;
    }

    const success = this.game.farmingSystem?.assignSlot(slotId, stageId, unitType, unitId);
    if (success) {
      this._renderFarmingSlotsButton();
      this._renderCompanionSlots();
    }
  }

  _collectFarmingSlot(slotId) {
    const loot = this.game.farmingSystem?.collectSlot(slotId);
    if (loot) {
      // Show loot notification
      const notif = this._notifEl;
      if (notif) {
        const titleEl = notif.querySelector('.notif-title');
        const descEl = notif.querySelector('.notif-desc');
        titleEl.textContent = '💰 Farming Loot Collected!';
        descEl.textContent = `Gold: ${loot.gold} | XP: ${loot.xp} | Materials: ${Object.entries(loot.materials).map(([k,v]) => k + ':' + v).join(', ')}`;
        notif.classList.add('active');
        setTimeout(() => notif.classList.remove('active'), 3000);
      }
      this._renderFarmingSlotsButton();
      this._updateDisplay();
    }
  }

  // E3: Show estate production notification
  _showEstateProduction(estate, produced) {
    const notif = this._notifEl;
    if (!notif) return;
    const titleEl = notif.querySelector('.notif-title');
    const descEl = notif.querySelector('.notif-desc');
    titleEl.textContent = `🏠 ${estate.name} produced:`;
    descEl.textContent = Object.entries(produced).map(([k,v]) => `${k}: +${v}`).join(' | ');
    notif.classList.add('active');
    setTimeout(() => notif.classList.remove('active'), 3000);
  }

  // F1: Open sandbox config
  _openSandbox() {
    const overlay = document.getElementById('shop-overlay');
    if (!overlay) return;
    overlay.classList.add('active');

    // Reuse shop overlay as sandbox config
    const header = document.getElementById('shop-header');
    if (header) header.querySelector('.shop-title').textContent = '🔬 Sandbox Mode';

    const tabs = document.getElementById('shop-tabs');
    if (tabs) tabs.style.display = 'none';

    const items = document.getElementById('shop-items');
    if (!items) return;
    items.innerHTML = '';

    // Difficulty slider
    items.innerHTML += `
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
    const weapons = [
      { id: 'w1_projectile', name: 'Projectile', icon: '🏹' },
      { id: 'w2_orbit', name: 'Orbit', icon: '🔄' },
      { id: 'weapon_area_pulse', name: 'Area', icon: '💥' },
      { id: 'w4_flame_wave', name: 'Flame Wave', icon: '🔥' },
      { id: 'w5_arcane_bolt', name: 'Arcane Bolt', icon: '⚡' },
    ];
    for (const w of weapons) {
      items.innerHTML += `
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
    items.innerHTML += `
      <div class="shop-item">
        <span class="item-icon">📊</span>
        <div class="item-info">
          <div class="item-name">Show DPS Counter</div>
          <div class="item-desc">Display real-time DPS during combat</div>
          <input type="checkbox" id="sb-show-dps" checked style="margin-top:6px;">
        </div>
      </div>`;

    // Launch button
    items.innerHTML += `
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
      this.game.sandboxSystem.activate(config);
      this.hide();
      overlay.classList.remove('active');
      // Restore shop tabs
      if (tabs) tabs.style.display = '';
      if (header) header.querySelector('.shop-title').textContent = '🛒 Grand Bazaar';
      this.game.startGame();
    });

    // Close handler
    const closeBtn = document.getElementById('shop-close');
    if (closeBtn) {
      const origHandler = closeBtn.onclick;
      closeBtn.onclick = () => {
        overlay.classList.remove('active');
        if (tabs) tabs.style.display = '';
        if (header) header.querySelector('.shop-title').textContent = '🛒 Grand Bazaar';
        closeBtn.onclick = origHandler;
      };
    }
  }

  _typewriteText(text, onComplete) {
    if (this._typewriterTimer) {
      clearInterval(this._typewriterTimer);
      this._typewriterTimer = null;
    }
    // Guard: handle null/undefined text
    if (!text) {
      this.dom.dialogueText.textContent = '';
      if (onComplete) onComplete();
      return;
    }
    this.dom.dialogueText.textContent = '';
    let i = 0;
    this._typewriterTimer = setInterval(() => {
      if (i < text.length) {
        this.dom.dialogueText.textContent += text[i];
        i++;
      } else {
        clearInterval(this._typewriterTimer);
        this._typewriterTimer = null;
        if (onComplete) onComplete();
      }
    }, 25);
  }
}

// ============================================================
// START
// ============================================================
