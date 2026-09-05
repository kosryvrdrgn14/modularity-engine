// ============================================================
// TOWN CONTENT — Game-specific town features
// Handles NPCs, dialogue, farming, estate, disasters, sandbox
// ============================================================

class TownContent {
  constructor({ audioManager, gameManager, eventBus, companionSystem, estateSystem, affectionSystem, farmingSystem, disasterSystem, sandboxSystem, locationManager, shopSystem, getPendingDisaster, clearPendingDisaster }) {
    this.audioManager = audioManager;
    this.gameManager = gameManager;
    this.eventBus = eventBus;
    this.companionSystem = companionSystem;
    this.estateSystem = estateSystem;
    this.affectionSystem = affectionSystem;
    this.farmingSystem = farmingSystem;
    this.disasterSystem = disasterSystem;
    this.sandboxSystem = sandboxSystem;
    this.locationManager = locationManager;
    this.shopSystem = shopSystem;
    this.getPendingDisaster = getPendingDisaster;
    this.clearPendingDisaster = clearPendingDisaster;

    this._lastRunStats = null;
    this._lastDialogueNpcId = null;
    this._dogDialoguePending = false;

    this.dom = {
      dialogueOverlay: document.getElementById('dialogue-overlay'),
      dialoguePortrait: document.getElementById('dialogue-portrait'),
      dialogueName: document.getElementById('dialogue-name'),
      dialogueText: document.getElementById('dialogue-text'),
      dialogueChoices: document.getElementById('dialogue-choices'),
      dialogueContinue: document.getElementById('dialogue-continue'),
    };

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

    // Engine reference (set later)
    this._engine = null;
  }

  setEngine(engine) {
    this._engine = engine;
  }

  // --- Display Updates ---

  updateDisplay() {
    const gm = this.gameManager;
    const phase = gm.get('persistent.town.phase') || 1;
    const gold = gm.get_currency() || 0;
    const campName = phase >= 2 ? 'Refugee Camp (Upgraded)' : 'Refugee Camp';

    const campNameEl = document.getElementById('town-camp-name');
    const goldEl = document.getElementById('town-gold');
    const bgEl = document.getElementById('town-bg');
    const runStatsEl = document.getElementById('town-run-stats');

    if (campNameEl) campNameEl.textContent = campName;
    if (goldEl) goldEl.textContent = `💰 ${gold}`;
    if (bgEl) bgEl.src = phase >= 2 ? 'assets/town_wooden_shacks.svg' : 'assets/town_refugee_camp.svg';

    if (this._lastRunStats && runStatsEl) {
      runStatsEl.textContent = `⏱ ${this._lastRunStats.time}  Lv${this._lastRunStats.level}  ☠ ${this._lastRunStats.kills}`;
    }

    // Update unlocked NPCs
    const _npcsData = this.locationManager?._getNPCsData() || (typeof NPC_DATA !== 'undefined' ? NPC_DATA : {});
    for (const key in _npcsData) {
      const npc = _npcsData[key];
      if (npc.unlockCondition) {
        npc.unlocked = !!gm.get_flag(npc.unlockCondition);
      }
    }

    // Update background from current location
    if (this.locationManager) {
      const curLoc = this.locationManager.getCurrentLocation();
      if (curLoc && curLoc.background && bgEl) {
        bgEl.src = curLoc.background;
      }
      if (curLoc && campNameEl) {
        campNameEl.textContent = curLoc.name;
      }
    }

    // Show pending disaster notification
    const pendingDisaster = this.getPendingDisaster ? this.getPendingDisaster() : null;
    if (pendingDisaster) {
      this.showDisasterNotification(pendingDisaster);
      if (this.clearPendingDisaster) this.clearPendingDisaster();
    }

    // Auto-collect estate production on town visit
    if (this.estateSystem) {
      const estates = this.estateSystem.getEstates();
      for (const estate of estates) {
        const produced = this.estateSystem.collectProduction(estate.wifeId);
        if (produced && Object.values(produced).some(v => v > 0)) {
          this.showEstateProduction(estate, produced);
        }
      }
    }
  }

  // --- Panel Rendering (Left & Right) ---

  renderLeftPanel() {
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
      const svg = SVG_PORTRAITS[npc.portraitKey || npc.id] || '<div style="width:36px;height:36px;border-radius:50%;background:#333;"></div>';
      const svgSmall = svg.replace('<svg ', '<svg style="width:36px;height:36px;" ');
      const locked = npc.locked && !this.gameManager?.get_flag(npc.unlockCondition);
      const card = document.createElement('div');
      card.className = 'panel-card' + (locked ? ' locked' : '');
      card.innerHTML = `<span class="panel-card-icon">${svgSmall}</span><div class="panel-card-info"><div class="panel-card-name">${npc.name}</div><div class="panel-card-desc">${locked ? '🔒 Locked' : '💬 Tap to talk'}</div></div>`;
      if (!locked) {
        card.addEventListener('click', () => {
          if (this._engine) this._engine._closePanels();
          this.openDialogue(npc);
        });
      }
      npcArea.appendChild(card);
    }

    // Companion status
    if (compArea) {
      compArea.innerHTML = '';
      const companions = this.companionSystem?.companions || [];
      for (const [id, comp] of Object.entries(companions)) {
        const status = this.gameManager?.getCompanionDeployStatus(id) || 'available';
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

  renderRightPanel() {
    const locArea = document.getElementById('panel-locations');
    const farmArea = document.getElementById('panel-farming');
    if (!locArea) return;

    // Locations
    locArea.innerHTML = '';
    const children = this.locationManager?.getChildLocations(this.locationManager.currentLocationId) || [];

    // Current location
    const curCard = document.createElement('div');
    curCard.className = 'panel-card current';
    curCard.innerHTML = '<span class="panel-card-icon">📍</span><div class="panel-card-info"><div class="panel-card-name">Current Location</div></div><span class="panel-card-badge">●</span>';
    locArea.appendChild(curCard);

    // Child locations
    for (const child of children) {
      const locked = child.locked && !this.gameManager?.get_flag(child.unlockCondition);
      const card = document.createElement('div');
      card.className = 'panel-card' + (locked ? ' locked' : '');
      card.innerHTML = `<span class="panel-card-icon">${child.icon || '📍'}</span><div class="panel-card-info"><div class="panel-card-name">${child.name}</div><div class="panel-card-desc">${locked ? '🔒 Locked' : child.desc || 'Tap to visit'}</div></div>`;
      if (!locked) {
        card.addEventListener('click', () => {
          this.locationManager.navigateTo(child.id);
          if (this._engine) this._engine._closePanels();
          this.updateDisplay();
          if (this._engine) {
            this._engine.renderBreadcrumb();
            this._engine.renderLocationCards();
          }
        });
      }
      locArea.appendChild(card);
    }

    // Farming
    if (farmArea) {
      farmArea.innerHTML = '';
      for (let i = 0; i < 3; i++) {
        const status = this.farmingSystem?.getSlotStatus(i + 1);
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
            this.renderRightPanel();
          });
        } else if (status?.status === 'idle') {
          card.innerHTML = `<span class="panel-card-icon">${label.split(' ')[0]}</span><div class="panel-card-info"><div class="panel-card-name">${label}</div><div class="panel-card-desc">Tap to assign</div></div>`;
          card.addEventListener('click', () => {
            this._assignFarmingSlot(i + 1);
            this.renderRightPanel();
          });
        } else {
          card.innerHTML = `<span class="panel-card-icon">🔒</span><div class="panel-card-info"><div class="panel-card-name">${label}</div><div class="panel-card-desc">Complete 3★ to unlock</div></div>`;
        }
        farmArea.appendChild(card);
      }
    }
  }

  _collectFarmingSlot(slotId) {
    const loot = this.farmingSystem?.collectSlot(slotId);
    if (loot) {
      this.eventBus.emit('farmingLootCollected', { slotId, loot });
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
    this.farmingSystem?.assignSlot(slotId, stageId, unitType, unitId);
  }

  // --- NPC System ---

  openDialogue(npc) {
    if (!npc || !npc.topics) return;
    this._lastDialogueNpcId = npc.id;

    // Report to quest system (talk_to objectives)
    if (this.eventBus) this.eventBus.emit('npc:talked', { npcId: npc.id });

    // Use inline SVG for reliable rendering
    const svgHtml = SVG_PORTRAITS[npc.portraitKey || npc.id] || '';
    if (svgHtml && this.dom.dialoguePortrait) {
      const styled = svgHtml.replace('<svg ', '<svg style="width:80px;height:80px;border-radius:50%;border:2px solid rgba(255,215,0,0.2);flex-shrink:0;" ');
      this.dom.dialoguePortrait.innerHTML = styled;
    }
    if (this.dom.dialogueName) this.dom.dialogueName.textContent = npc.name || 'Unknown';
    if (this.dom.dialogueChoices) this.dom.dialogueChoices.style.display = 'none';
    if (this.dom.dialogueContinue) this.dom.dialogueContinue.style.display = 'none';
    if (this.dom.dialogueOverlay) this.dom.dialogueOverlay.classList.add('active');

    // Show greeting with typewriter, then show choices
    if (this._engine) {
      this._engine.typewriteText(npc.greeting || '...', () => {
        this.showChoices(npc);
      });
    }
  }

  showChoices(npc) {
    if (!this.dom.dialogueChoices) return;
    this.dom.dialogueChoices.innerHTML = '';
    this.dom.dialogueChoices.style.display = 'flex';

    for (const topic of npc.topics) {
      const btn = document.createElement('button');
      btn.className = 'dialogue-choice';
      btn.textContent = topic.text;
      btn.addEventListener('click', () => {
        this.audioManager.playMenuSound('select');
        if (topic.close) {
          this.dom.dialogueOverlay.classList.remove('active');
          // Trigger dog dialogue after Lina's conversation
          if (this._lastDialogueNpcId === 'cute_girl' && !this.gameManager.has_companion('dog')) {
            setTimeout(() => this.showDogDialogue(), 300);
          }
          return;
        }
        // Set flag if defined
        if (topic.flag) {
          this.gameManager.set_flag(topic.flag, true);
        }
        // Add affection
        if (topic.affection > 0 && this.affectionSystem) {
          this.affectionSystem.addAffection(npc.id, topic.affection);
        } else if (topic.affection > 0) {
          const key = `affection_${npc.id}`;
          this.gameManager.add_counter(key, topic.affection);
        }
        // Show response
        this.dom.dialogueChoices.style.display = 'none';
        if (topic.response) {
          this._engine.typewriteText(topic.response, () => {
            this.dom.dialogueContinue.style.display = 'block';
            this.dom.dialogueContinue.onclick = () => {
              this.audioManager?.playMenuSound('select');
              this.dom.dialogueContinue.style.display = 'none';
              this.showChoices(npc);
            };
          });
        } else {
          this._engine.typewriteText('', () => {
            this.dom.dialogueContinue.style.display = 'block';
            this.dom.dialogueContinue.onclick = () => {
              this.audioManager?.playMenuSound('select');
              this.dom.dialogueContinue.style.display = 'none';
              this.showChoices(npc);
            };
          });
        }
      });
      this.dom.dialogueChoices.appendChild(btn);
    }
  }

  showDogDialogue() {
    const gm = this.gameManager;
    if (gm.has_companion('dog')) return;

    const dogSvg = SVG_PORTRAITS['dog'] || '';
    if (dogSvg && this._dogPortrait) {
      this._dogPortrait.innerHTML = dogSvg.replace('<svg ', '<svg style="width:52px;height:52px;border-radius:50%;border:2px solid rgba(139,90,43,0.4);" ');
    }

    if (this._dogDialogue) this._dogDialogue.classList.add('active');
    if (this._dogText) this._dogText.textContent = '';
    if (this._dogChoices) this._dogChoices.style.display = 'none';

    const greetings = ['Woof! *tail wag*', '*sniff sniff* ...Woof!', 'Arf! *happy dance*'];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];

    this._engine.typewriteText(greeting, () => {
      if (this._dogChoices) {
        this._dogChoices.style.display = 'flex';
        this._dogChoices.innerHTML = '';

        const petBtn = document.createElement('button');
        petBtn.className = 'dog-choice';
        petBtn.textContent = '🐕 Pet the dog';
        petBtn.addEventListener('click', () => {
          this.audioManager.playMenuSound('select');
          this._dogDialogue.classList.remove('active');
          gm.add_companion('dog');
          this.showCompanionNotification('Dog', 'Has joined your party!');
          this.renderCompanionSlots();
        });

        const ignoreBtn = document.createElement('button');
        ignoreBtn.className = 'dog-choice ignore';
        ignoreBtn.textContent = 'Walk away';
        ignoreBtn.addEventListener('click', () => {
          this.audioManager.playMenuSound('back');
          this._dogDialogue.classList.remove('active');
        });

        this._dogChoices.appendChild(petBtn);
        this._dogChoices.appendChild(ignoreBtn);
      }
    });
  }

  showCompanionNotification(name, desc) {
    if (!this._notifEl) return;
    const titleEl = this._notifEl.querySelector('.notif-title');
    const descEl = this._notifEl.querySelector('.notif-desc');
    if (titleEl) titleEl.textContent = name + ' has joined the party!';
    if (descEl) descEl.textContent = desc || '';
    this._notifEl.classList.add('active');
    this.audioManager.playMenuSound('powerup');
    setTimeout(() => this._notifEl.classList.remove('active'), 2500);
  }

  renderCompanionSlots() {
    const gm = this.gameManager;
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

  // --- NPC Card Rendering ---

  createNPCCard(npc, isLocked) {
    const card = document.createElement('div');
    card.className = 'npc-card' + (isLocked ? ' locked' : '');
    const svgHtml = SVG_PORTRAITS[npc.portraitKey || npc.id] || '<div class="npc-portrait"></div>';
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
          <div class="npc-greeting">"${(npc.greeting || '').substring(0, 60)}${(npc.greeting || '').length > 60 ? '...' : ''}"</div>
          <div class="npc-action">\u25b8 Talk</div>
        </div>
      `;
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this.audioManager?.playMenuSound('select');
        this.openDialogue(npc);
      });
    }
    return card;
  }

  // --- Upgrade Card ---

  renderUpgradeCard(area) {
    const gm = this.gameManager;
    const phase = gm.get('persistent.town.phase') || 1;
    const gold = gm.get_currency() || 0;
    if (phase > 1) return;
    const canAfford = gold >= 100;
    const upgradeCard = document.createElement('div');
    upgradeCard.className = 'upgrade-card' + (canAfford ? '' : ' disabled');
    upgradeCard.innerHTML = `
      <span class="upgrade-label">🔨 Upgrade Camp — Build Wooden Shacks</span>
      <span class="upgrade-cost">${canAfford ? '100g' : 'Need 100g'}</span>
    `;
    if (canAfford) {
      upgradeCard.addEventListener('click', () => {
        this.audioManager.playMenuSound('select');
        gm.spend_currency(100, 'camp_upgrade');
        gm.set_flag('town_camp_upgraded', true);
        gm.set('persistent.town.phase', 2);
        const _npcsUpgrade = this.locationManager?._getNPCsData() || (typeof NPC_DATA !== 'undefined' ? NPC_DATA : {});
        if (_npcsUpgrade.cute_girl) _npcsUpgrade.cute_girl.unlocked = true;
        this.updateDisplay();
        if (this._engine) this._engine.renderLocationCards();
      });
    }
    area.appendChild(upgradeCard);
  }

  // --- Disaster System ---

  showDisasterNotification(disaster) {
    const area = this.dom.npcArea || document.getElementById('town-npc-area');
    if (!area) return;
    const card = document.createElement('div');
    card.className = 'location-card';
    card.style.borderColor = 'rgba(255, 80, 50, 0.4)';
    card.style.background = 'rgba(255, 50, 30, 0.08)';
    const gold = this.gameManager.get_currency() || 0;
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
        this.audioManager.playMenuSound('select');
        const result = this.disasterSystem.resolve(disaster, gold);
        if (result.resolved) {
          card.style.borderColor = 'rgba(80, 255, 80, 0.3)';
          card.querySelector('.loc-desc').textContent = '✅ Resolved!';
          setTimeout(() => card.remove(), 1500);
        }
      });
    }
    area.insertBefore(card, area.firstChild);
  }

  // --- Farming System ---

  renderFarmingSlotsButton() {
    const area = this.dom.npcArea || document.getElementById('town-npc-area');
    if (!area || !this.locationManager) return;
    if (!this.locationManager.isRoot()) return;

    let activeCount = 0, completedCount = 0;
    for (let i = 0; i < 3; i++) {
      const s = this.farmingSystem?.getSlotStatus(i + 1);
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
      this.audioManager?.playMenuSound('select');
      this.openFarmingMenu();
    });
    area.appendChild(btn);
  }

  openFarmingMenu() {
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
      const status = this.farmingSystem?.getSlotStatus(i + 1);
      const slotLabel = FARMING_CONFIG.slotLabels[i];
      const card = document.createElement('div');
      card.className = 'shop-item';

      if (status?.status === 'locked') {
        card.classList.add('cant-afford');
        card.innerHTML = `<span class="item-icon">\u{1f512}</span><div class="item-info"><div class="item-name">${slotLabel}</div><div class="item-desc">Complete 3\u2605 on a stage to unlock</div></div>`;
      } else if (status?.status === 'idle') {
        card.innerHTML = `<span class="item-icon">${slotLabel.split(' ')[0]}</span><div class="item-info"><div class="item-name">${slotLabel}</div><div class="item-desc">Tap to assign \u2014 Graveyard (5min)</div></div><span class="item-cost" style="color:#4FC3F7;">Assign \u25b8</span>`;
        card.addEventListener('click', () => {
          this.audioManager?.playMenuSound('select');
          this.assignFarmingSlot(i + 1);
          this.openFarmingMenu();
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
          this.collectFarmingSlot(i + 1);
          this.openFarmingMenu();
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

  assignFarmingSlot(slotId) {
    const stageId = 'stage_graveyard';
    const companions = this.gameManager.get_companions();
    const slotType = FARMING_CONFIG.slotTypes[slotId - 1];
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

    const success = this.farmingSystem?.assignSlot(slotId, stageId, unitType, unitId);
    if (success) {
      this.renderFarmingSlotsButton();
      this.renderCompanionSlots();
    }
  }

  collectFarmingSlot(slotId) {
    const loot = this.farmingSystem?.collectSlot(slotId);
    if (loot) {
      const notif = this._notifEl;
      if (notif) {
        const titleEl = notif.querySelector('.notif-title');
        const descEl = notif.querySelector('.notif-desc');
        if (titleEl) titleEl.textContent = '💰 Farming Loot Collected!';
        if (descEl) descEl.textContent = `Gold: ${loot.gold} | XP: ${loot.xp} | Materials: ${Object.entries(loot.materials).map(([k,v]) => k + ':' + v).join(', ')}`;
        notif.classList.add('active');
        setTimeout(() => notif.classList.remove('active'), 3000);
      }
      this.renderFarmingSlotsButton();
      this.updateDisplay();
    }
  }

  // --- Estate System ---

  showEstateProduction(estate, produced) {
    const notif = this._notifEl;
    if (!notif) return;
    const titleEl = notif.querySelector('.notif-title');
    const descEl = notif.querySelector('.notif-desc');
    if (titleEl) titleEl.textContent = `🏠 ${estate.name} produced:`;
    if (descEl) descEl.textContent = Object.entries(produced).map(([k,v]) => `${k}: +${v}`).join(' | ');
    notif.classList.add('active');
    setTimeout(() => notif.classList.remove('active'), 3000);
  }

  // --- Sandbox System ---

  openSandbox() {
    const overlay = document.getElementById('shop-overlay');
    if (!overlay) return;
    overlay.classList.add('active');

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
      this.sandboxSystem.activate(config);
      overlay.classList.remove('active');
      if (tabs) tabs.style.display = '';
      if (header) header.querySelector('.shop-title').textContent = '🛒 Grand Bazaar';
      // Trigger combat start via callback
      if (this._engine && this._engine.onCombat) this._engine.onCombat();
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

  // --- Notification System ---

  showNotification(title, desc, duration = 3000) {
    const notif = this._notifEl;
    if (!notif) return;
    const titleEl = notif.querySelector('.notif-title');
    const descEl = notif.querySelector('.notif-desc');
    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc || '';
    notif.classList.add('active');
    setTimeout(() => notif.classList.remove('active'), duration);
  }
}
