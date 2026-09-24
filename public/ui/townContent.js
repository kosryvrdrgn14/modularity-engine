// ============================================================
// TOWN CONTENT — Game-specific town features
// Handles NPCs, dialogue, farming, estate, disasters, sandbox
// ============================================================

class TownContent {
  // v2.16.0 (screen 4): ONE text-only-row def drives every dialogue choice and
  // the export entry (pooled repeat; §10 of widget_ui_system_spec.md). The
  // card's declared event routes to _handleTopicChoice via the instance-level
  // bridge installed in showChoices — data selects the action, code implements
  // it. CustomEvent payloads are strings only, so the event carries the topic
  // ID and _topicFor resolves it back to the live topic object.
  static DIALOGUE_CHOICE_DEF = {
    template: 'card',
    layout: 'text-only-row',
    size: 'medium',
    slots: { primaryText: { bind: 'topicText' } },
    onClick: { emit: 'widget:dialogueChoice', payload: { topicId: '{{topicId}}' } },
  };

  // v2.16.0: dog-variant choices (§10 screen 4). Same vocabulary, warm theme
  // via #dog-dialogue scoped CSS; behavior lives in _handleDogChoice.
  static DOG_CHOICE_DEF = {
    template: 'card',
    layout: 'text-only-row',
    size: 'medium',
    slots: { primaryText: { bind: 'label' } },
    onClick: { emit: 'widget:dogChoice', payload: { action: '{{action}}' } },
  };
  static DOG_CHOICES = [
    { action: 'pet', label: '🐕 Pet the dog' },
    { action: 'ignore', label: 'Walk away' },
  ];

  constructor({ audioManager, gameManager, eventBus, companionSystem, estateSystem, affectionSystem, farmingSystem, disasterSystem, locationManager, shopSystem, getPendingDisaster, clearPendingDisaster, onExitToTitle }) {
    this.audioManager = audioManager;
    this.gameManager = gameManager;
    this.eventBus = eventBus;
    this.companionSystem = companionSystem;
    this.estateSystem = estateSystem;
    this.affectionSystem = affectionSystem;
    this.farmingSystem = farmingSystem;
    this.disasterSystem = disasterSystem;
    this.locationManager = locationManager;
    this.shopSystem = shopSystem;
    this.getPendingDisaster = getPendingDisaster;
    this.clearPendingDisaster = clearPendingDisaster;
    this.onExitToTitle = onExitToTitle || null;

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

    // Quest system (set by TownScreen.setQuestSystem — Story Mode only)
    this.questSystem = null;
    this._questListenersRegistered = false;
  }

  setEngine(engine) {
    this._engine = engine;
  }

  setQuestSystem(questSystem) {
    this.questSystem = questSystem;
    this._registerQuestListeners();
    this._renderQuestPanel();
    this._updateQuestBadge();
  }

  // Live refresh: quest panel updates as quests start/progress/complete.
  // Registered once — TownContent lives for the whole session.
  _registerQuestListeners() {
    if (!this.eventBus || this._questListenersRegistered) return;
    this._questListenersRegistered = true;
    const refresh = () => {
      this._renderQuestPanel();
      this._updateQuestBadge();
    };
    for (const evt of ['quest:started', 'quest:objective_progress', 'quest:completed', 'quest:available']) {
      this.eventBus.on(evt, refresh);
    }
    // Time events (stranger leaves/returns) → toast
    this.eventBus.on('quest:time_event', (data) => {
      if (data && data.description) this.showToast(data.description, 'time', '⏳');
    });
    // Quest completion → reward/unlock toasts
    this.eventBus.on('quest:completed', (data) => this._onQuestCompletedToast(data));
  }

  // ── Toast Notifications ─────────────────────────────────

  showToast(message, kind = 'quest', icon = '📜') {
    let container = document.getElementById('town-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'town-toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `town-toast toast-${kind}`;
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${this._escapeHtml(message)}</span>`;
    container.appendChild(toast);
    // Force reflow so the transition plays
    void toast.offsetWidth;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.add('leaving');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  _onQuestCompletedToast(data) {
    if (!data || !data.questId || !this.questSystem) return;
    const quest = this.questSystem.allQuests.find(q => q.id === data.questId);
    if (!quest) return;

    this.showToast(`Quest complete: ${quest.name}`, 'quest', '🏆');

    const u = quest.unlocks_on_complete || {};
    const names = {
      weapons: 'weapon',
      companions: 'companion',
      regions: 'region',
      locations: 'location',
      stages: 'stage',
    };
    for (const [key, label] of Object.entries(names)) {
      for (const id of (u[key] || [])) {
        const pretty = this._prettyContentName(key, id);
        this.showToast(`New ${label} unlocked: ${pretty}`, 'unlock', '✨');
      }
    }
    if ((u.flags || []).length > 0 && !u.weapons?.length && !u.companions?.length && !u.regions?.length) {
      // Story-progress flag with no concrete content — show the description instead
      this.showToast(quest.description || 'The story advances...', 'quest', '📖');
    }
  }

  _prettyContentName(contentType, id) {
    // Look up display names from DataManager, falling back to the raw id
    const dm = this._engine?.dataManager || window.game?.dataManager;
    try {
      if (contentType === 'weapons') {
        const w = (dm?.weapons || []).find(x => x.id === id);
        if (w) return w.name;
      } else if (contentType === 'companions') {
        const c = dm?.companions?.[id];
        if (c) return c.name;
      } else if (contentType === 'regions' || contentType === 'locations') {
        const data = dm?.locations;
        if (data?.regions) {
          for (const r of data.regions) {
            if (contentType === 'regions' && r.id === id) return r.name;
            for (const [locId, loc] of Object.entries(r.locations || {})) {
              if (locId === id) return loc.name || id;
            }
          }
        }
      } else if (contentType === 'stages') {
        const s = (dm?.stages || []).find ? (dm.stages || []).find(x => x.id === id) : null;
        if (s) return s.name;
      }
    } catch (e) { /* fall through to raw id */ }
    return this._normalizeId(id);
  }

  _normalizeId(value) {
    return String(value).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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
    // ── §10 screen-3 migration (v2.15.0): the town-hdr-meta chips are ONE
    // pooled widget-card repeat (repeat-over-array, §2.5) — data-driven
    // values, ids preserved for all consumers. The 📖 Log chip's open behavior
    // is its DECLARED event (widget:toggleGameLog, bridged in _renderTownChips);
    // the date chip's hover-title context is re-applied per render. ──
    this._renderTownChips();

    if (campNameEl) campNameEl.textContent = campName;
    if (goldEl) goldEl.textContent = `💰 ${gold}`;
    if (bgEl) bgEl.src = phase >= 2 ? 'assets/town_wooden_shacks.svg' : 'assets/town_refugee_camp.svg';

    // Update unlocked NPCs
    const _npcsData = this.locationManager?._getNPCsData() || {}; // F5 gate v2.19.4: dead NPC_DATA fallback removed (POT-003)
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

  /** Town HUD chips (v2.15.0): one def, pooled repeat, data-driven values. */
  _renderTownChips() {
    const host = document.getElementById('town-chips');
    if (!host || typeof WidgetRenderer === 'undefined') return;
    if (!this.widgetRenderer) {
      this.widgetRenderer = new WidgetRenderer({
        skins: (typeof window !== 'undefined' && window.game?.dataManager?.uiSkins) || null,
      });
    }
    // Bridge: the log chip's declared event → open the session console
    // (replaces the old per-chip addEventListener wiring; installed once).
    if (!this._logBridgeWired && typeof document !== 'undefined') {
      this._logBridgeWired = true;
      document.addEventListener('widget:toggleGameLog', () => {
        this.audioManager?.playMenuSound('select');
        const gl = (typeof window !== 'undefined' && window.game?.gameLog) || null;
        if (gl) gl.togglePanel();
      });
    }
    const R = this.widgetRenderer;
    const def = {
      template: 'card',
      _v: 1,
      layout: 'text-only-row',
      size: 'small',
      slots: { primaryText: { bind: 'chip.text' } },
      onClick: { emit: 'widget:toggleGameLog' },
    };
    const ts = this._engine?.timeService || (typeof window !== 'undefined' && window.game?.timeService) || null;
    let dateText = '📅 —';
    let dateTitle = '';
    if (ts) {
      const day = ts.getCurrentDay();
      dateText = `📅 Day ${day}`;
      const ctx = ts.getDateContext(day);
      dateTitle = [ctx.label, ctx.season ? `${ctx.season} season` : null, ctx.festivals.length ? `festivals: ${ctx.festivals.join(', ')}` : null]
        .filter(Boolean).join(' · ');
    }
    const items = [
      { id: 'town-log-toggle', text: '📖 Log', title: 'Session log — recent events & errors' },
      { id: 'town-date', text: dateText, title: dateTitle },
    ];
    const s = this._lastRunStats;
    items.push({
      id: 'town-run-stats',
      title: '',
      text: (s && s.time !== undefined && s.level !== undefined && s.kills !== undefined)
        ? `⏱ ${s.time}  Lv${s.level}  ☠ ${s.kills}`
        : '⚔Lv1',
    });
    R.repeatInto(host, def, items.map((it) => ({ chip: it })));
    // Per-item identity + hover context (beyond the def's vocabulary).
    const pool = host._widgetPool || [];
    pool.forEach((el, i) => {
      const it = items[i];
      if (!it) return;
      el.id = it.id;
      el.title = it.title || '';
      el.classList.toggle('gamelog-chip', it.id === 'town-log-toggle');
    });
  }

  // --- Panel Rendering (Left & Right) ---

  renderLeftPanel() {
    const questArea = document.getElementById('panel-quests');
    const npcArea = document.getElementById('panel-npcs');
    const compArea = document.getElementById('panel-companions');
    if (!questArea || !npcArea) return;

    // Quests (priority)
    questArea.innerHTML = '';
    this._renderQuestPanel();

    // NPCs at current location
    npcArea.innerHTML = '';
    const curLoc = this.locationManager?.getCurrentLocation();
    let npcs = curLoc ? (this.locationManager.getNPCsAtLocation(curLoc.id) || []) : [];
    // Gate filter (Story Mode): hide NPCs the quest system has locked
    if (this.questSystem && this.questSystem._initialized) {
      npcs = npcs.filter(n => this.questSystem.isContentUnlocked('npcs', n.id));
    }
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

  // ── Quest Panel ────────────────────────────────────────

  _renderQuestPanel() {
    const questArea = document.getElementById('panel-quests');
    if (!questArea) return;
    questArea.innerHTML = '';

    if (!this.questSystem || !this.questSystem._initialized) {
      questArea.innerHTML = '<div class="panel-card locked"><span class="panel-card-icon">📜</span><div class="panel-card-info"><div class="panel-card-name">Quests</div><div class="panel-card-desc">Available in Story Mode</div></div></div>';
      return;
    }

    const available = this.questSystem.getAvailableQuests();
    const active = this.questSystem.getActiveQuests();
    const completed = this.questSystem.getCompletedQuests();

    if (available.length === 0 && active.length === 0 && completed.length === 0) {
      questArea.innerHTML = '<div class="panel-card locked"><span class="panel-card-icon">📜</span><div class="panel-card-info"><div class="panel-card-name">No quests yet</div><div class="panel-card-desc">Talk to Elder Rowan to begin</div></div></div>';
      return;
    }

    // Available quests — offer acceptance
    for (const quest of available) {
      const card = document.createElement('div');
      card.className = 'panel-card quest-available';
      card.innerHTML = `<span class="panel-card-icon">📜</span><div class="panel-card-info"><div class="panel-card-name">${this._escapeHtml(quest.name)}</div><div class="panel-card-desc">${this._escapeHtml(quest.description || '')}</div></div><button class="quest-accept-btn">Accept</button>`;
      card.querySelector('.quest-accept-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        this._acceptQuest(quest.id);
      });
      questArea.appendChild(card);
    }

    // Active quests — live objective progress
    for (const quest of active) {
      const card = document.createElement('div');
      card.className = 'panel-card quest-active';
      const prog = this.questSystem.getQuestProgress(quest.id) || [];
      const objHtml = prog.map(p => {
        const label = p.description || p.type;
        return `<div class="quest-obj ${p.complete ? 'done' : ''}">${p.complete ? '✅' : '⬜'} ${this._escapeHtml(label)} <span class="quest-obj-count">${p.current}/${p.required}</span></div>`;
      }).join('');
      card.innerHTML = `<span class="panel-card-icon">⚔️</span><div class="panel-card-info"><div class="panel-card-name">${this._escapeHtml(quest.name)}</div><div class="panel-card-desc">${objHtml}</div></div><span class="panel-card-badge gold">In Progress</span>`;
      questArea.appendChild(card);
    }

    // Recently completed — compact
    for (const quest of completed.slice(-3)) {
      const card = document.createElement('div');
      card.className = 'panel-card quest-completed';
      card.innerHTML = `<span class="panel-card-icon">🏆</span><div class="panel-card-info"><div class="panel-card-name">${this._escapeHtml(quest.name)}</div></div><span class="panel-card-badge green">Done</span>`;
      questArea.appendChild(card);
    }
  }

  _acceptQuest(questId) {
    if (!this.questSystem || !this.questSystem.startQuest(questId)) return;
    if (this.audioManager && this.audioManager.playMenuSound) {
      this.audioManager.playMenuSound('select');
    }
    this._renderQuestPanel();
    this._updateQuestBadge();
  }

  // Dock badge on the NPCs tab shows how many quests are ready to accept
  _updateQuestBadge() {
    if (!this.questSystem || !this._engine || !this._engine.dockMenu) return;
    this._engine.dockMenu.updateBadge('social', this.questSystem.getAvailableQuests().length);
  }

  _escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

    // Exit to Title (SLOT flow: lets the player return to the title screen to
    // switch save slots — saving first so progress is never lost on exit)
    if (this.onExitToTitle) {
      const exitCard = document.createElement('div');
      exitCard.className = 'panel-card exit-title';
      exitCard.innerHTML = '<span class="panel-card-icon">🚪</span><div class="panel-card-info"><div class="panel-card-name">Exit to Title</div><div class="panel-card-desc">Save & return to the main menu</div></div>';
      exitCard.addEventListener('click', () => {
        if (this.audioManager) this.audioManager.playMenuSound('back');
        if (this.gameManager) this.gameManager.save();
        this.onExitToTitle();
      });
      locArea.appendChild(exitCard);
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
    if (!npc || (!npc.topics && !npc.dialogueSets)) return;
    this._lastDialogueNpcId = npc.id;
    this._activeNpc = npc; // v2.16.0: widget-card choice events route through _handleTopicChoice(this._activeNpc, topic)

    // §24 Step 2: data-driven dialogue selection (spec:
    // npc_condition_system_spec.md §3.4). When npcSystem is live, the winning
    // dialogueSet supplies greeting + topics (first passing set wins,
    // guaranteed unconditional fallback); legacy NPCs without dialogueSets
    // resolve to their root topics exactly as before. The selected topics are
    // cached so showChoices (incl. its re-entry after a response) renders the
    // same conversation.
    const sys = this._engine?.npcSystem || (typeof window !== 'undefined' && window.game && window.game.npcSystem) || null;
    let greeting = npc.greeting || '...';
    this._activeTopics = npc.topics || [];
    this._activeConversationId = 'legacy_topics';
    if (sys) {
      const set = sys.selectDialogueSet(npc.id);
      if (set) {
        greeting = set.greeting || greeting;
        this._activeTopics = sys.selectTopics(npc.id);
        this._activeConversationId = set.id || 'legacy_topics';
      }
    }

    // Report to quest system (talk_to objectives) + memory log producer
    // (npcTalkedTo — logged once per opened conversation, spec §2.3)
    if (this.eventBus) this.eventBus.emit('npc:talked', { npcId: npc.id, conversationId: this._activeConversationId });

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
      this._engine.typewriteText(greeting, () => {
        this.showChoices(npc);
      });
    }
  }

  showChoices(npc) {
    if (!this.dom.dialogueChoices) return;
    // v2.16.0: this container is a dedicated widget pool (repeatInto hides
    // surplus cards) — no innerHTML clearing here, that would detach pooled nodes.
    this.dom.dialogueChoices.style.display = 'flex';

    // §24 Step 2: topics come from the conversation selected in openDialogue
    // (per-topic conditions already filtered there); legacy fallback intact.
    const topics = this._activeTopics || npc.topics || [];
    // §24 Step 4: in-game export entry (spec §10). Appended when the NPC has
    // interaction history; strangers get no export option. Handled by
    // npcExportUI, never by the topic machinery below.
    const exportUi = (typeof window !== 'undefined' && window.game?.npcExportUI) || null;
    const exportTopic = exportUi ? exportUi.exportTopicFor(npc.id) : null;
    // v2.16.0: choices are pooled widget cards (screen 4, widget_ui_system_spec
    // §10). ONE text-only-row def; per-topic data carries the label, the
    // declared event routes to _handleTopicChoice (behavior preserved verbatim
    // from the old inline listener), and the export entry rides the same pool.
    if (typeof WidgetRenderer === 'undefined') return; // defensive: widget system missing → no choice list rather than a broken overlay
    if (!this._topicRenderer) {
      this._topicRenderer = new WidgetRenderer({
        skins: (typeof window !== 'undefined' && window.game?.dataManager?.uiSkins) || null,
      });
    }
    const items = topics.map(t => ({ topicId: t.id || t.text || '', topicText: t.text }));
    if (exportTopic) items.push({ topicId: '__export__', topicText: exportTopic.text });
    // Instance-level bridge (installed once per renderer): declared widget
    // events → behavior. Replaces the old per-button addEventListener wiring.
    if (!this._topicRenderer._dialogueBridgeInstalled) {
      this._topicRenderer._dialogueBridgeInstalled = true;
      this._topicRenderer._hostEl = (this.dom.dialogueChoices && this.dom.dialogueChoices.closest('#dialogue-overlay')) || null;
      this._topicRenderer._hostEl?.addEventListener('widget:dialogueChoice', (e) => {
        this.audioManager?.playMenuSound('select');
        this._handleTopicChoice(e.detail?.topicId);
      });
    }
    this._topicRenderer.repeatInto(this.dom.dialogueChoices, TownContent.DIALOGUE_CHOICE_DEF, items);
    this._topicRenderer.lastItems = items; // click handlers need their topic object — see _topicFor
  }

  /** v2.16.0: choice behavior — VERBATIM from the pre-migration inline click
   *  listener (flags, affection, logging, dog hook, response cycle). The
   *  widget event carries the topic ID; this resolves it back to the live
   *  topic object so re-renders can never desync the pool from the list. */
  _topicFor(topicId) {
    const items = (this._topicRenderer && this._topicRenderer.lastItems) || [];
    const item = items.find(i => i.topicId === topicId);
    if (!item) return null;
    if (item.topicId === '__export__') return { __export__: true };
    const topics = this._activeTopics || [];
    return topics.find(t => (t.id || t.text || '') === item.topicId) || null;
  }

  /** Declared-event target for the pooled choice cards (widget_ui_system_spec
   * §2.2: data selects actions by name, code implements them). */
  _handleTopicChoice(topicId) {
    const topic = this._topicFor(topicId);
    if (!topic) return;
    const npc = this._activeNpc;
    if (!npc) return;
    // (select sound is played by the instance-level bridge — one per click)
    // §10 export entry: close the overlay and hand off to npcExportUI.
    if (topic.__export__) {
      const exportUi = (typeof window !== 'undefined' && window.game?.npcExportUI) || null;
      if (exportUi) {
        this.dom.dialogueOverlay.classList.remove('active');
        exportUi.openPreview(npc.id);
      }
      return;
    }
    // §24 Step 2: THE single choice-logging point (spec §3.5). One emit,
    // one central listener — no per-topic log writes anywhere.
    if (this.eventBus) {
      this.eventBus.emit('npc:dialogueChoice', {
        npcId: npc.id,
        conversationId: this._activeConversationId || null,
        choiceId: topic.id || topic.text || null,
      });
    }
    if (topic.close) {
      this.dom.dialogueOverlay.classList.remove('active');
      // Trigger dog dialogue after Lina's conversation
      if (this._lastDialogueNpcId === 'cute_girl' && !this.gameManager.has_companion('dog')) {
        setTimeout(() => this.showDogDialogue(), 300);
      }
      return;
    }
    // Set flag if defined (flagSet logged — curation: dialogue-authored
    // flags only, spec §2.3)
    if (topic.flag) {
      this.gameManager.set_flag(topic.flag, true);
      if (this.eventBus) {
        this.eventBus.emit('npc:dialogueFlag', {
          npcId: npc.id,
          flagId: topic.flag,
          conversationId: this._activeConversationId || null,
        });
      }
    }
    // Add affection (giftGiven logged once per choice — dedupe lives in
    // the central listener, spec §2.3 curation)
    if (topic.affection > 0 && this.affectionSystem) {
      this.affectionSystem.addAffection(npc.id, topic.affection);
      if (this.eventBus) {
        this.eventBus.emit('npc:dialogueAffection', {
          npcId: npc.id,
          affection: topic.affection,
          choiceId: topic.id || null,
          conversationId: this._activeConversationId || null,
        });
      }
    } else if (topic.affection > 0) {
      const key = `affection_${npc.id}`;
      this.gameManager.add_counter(key, topic.affection);
      if (this.eventBus) {
        this.eventBus.emit('npc:dialogueAffection', {
          npcId: npc.id,
          affection: topic.affection,
          choiceId: topic.id || null,
          conversationId: this._activeConversationId || null,
        });
      }
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
  }
  /** v2.16.0: dog-variant behavior — verbatim from the pre-migration buttons. */
  _handleDogChoice(action) {
    if (action === 'pet') {
      this.audioManager.playMenuSound('select');
      this._dogDialogue.classList.remove('active');
      this.gameManager.add_companion('dog');
      this.showCompanionNotification('Dog', 'Has joined your party!');
      this.renderCompanionSlots();
    } else {
      this.audioManager.playMenuSound('back');
      this._dogDialogue.classList.remove('active');
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
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];    this._engine.typewriteText(greeting, () => {
      if (this._dogChoices) {
        this._dogChoices.style.display = 'flex';
        // v2.16.0: dog choices are pooled widget cards (same screen, warm
        // variant — themed by scoped CSS, structure from the renderer).
        if (typeof WidgetRenderer === 'undefined') return;
        if (!this._dogRenderer) {
          this._dogRenderer = new WidgetRenderer({
            skins: (typeof window !== 'undefined' && window.game?.dataManager?.uiSkins) || null,
          });
          this._dogDialogue?.addEventListener('widget:dogChoice', (e) => {
            this._handleDogChoice(e.detail?.action);
          });
        }
        this._dogRenderer.repeatInto(this._dogChoices, TownContent.DOG_CHOICE_DEF, TownContent.DOG_CHOICES);
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
    const phase = gm.getTownLevel(); // §5.6 (v2.19.2): typed read, level canonical
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
        gm.setTownLevel(2, 'campUpgrade'); // §5.6 (v2.19.2): typed write
        const _npcsUpgrade = this.locationManager?._getNPCsData() || {}; // F5 gate v2.19.4: dead NPC_DATA fallback removed (POT-003)
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
  // v2.19.7 (§5.7 consolidation): the farming/sandbox overlay UI is single-homed
  // in ShopSystem. The town root's "Auto-Clear Farming" card opens the SAME
  // ShopSystem farming mode the shop tab uses (one code path for one feature);
  // the duplicated openFarmingMenu/openSandbox renderers that lived here are
  // deleted (their only callers were each other — audited v2.19.7).

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
      this.shopSystem?.openFarming(this.farmingSystem);
    });
    area.appendChild(btn);
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
