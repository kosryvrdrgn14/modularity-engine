// ============================================================
// LOADOUT SCREEN — Pre-combat weapon & companion selection
// Appears between battle card click and startGame()
// ============================================================

class LoadoutScreen {
  constructor({ gameManager, dataManager, audioManager }) {
    this.gameManager = gameManager;
    this.dataManager = dataManager;
    this.audioManager = audioManager;

    // Quest system (set via setQuestSystem — gates the available list in Story Mode)
    this.questSystem = null;

    this.selectedWeapons = [null, null, null];
    this.selectedCompanions = [null, null, null];
    this.phase = 'weapons'; // 'weapons' | 'companions'
    this.stageId = null;
    this.stageTier = 'standard';
    this.onConfirm = null;
    this.onBack = null;

    this._ensureOverlay();
  }

  _ensureOverlay() {
    let overlay = document.getElementById('loadout-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loadout-overlay';
      overlay.className = 'loadout-overlay hidden';
      document.body.appendChild(overlay);
    }
    this.overlay = overlay;
  }

  // ── Widget defs (v2.17.0, §10 screen 5) ──────────────────
  // Cards + slot chips are pooled widget cards (one def each); chrome buttons
  // stay bespoke code (their enabled/disabled state toggles classes the widget
  // vocabulary does not own). Selection is DATA (renderer v1.2 `selected.bind`).

  static WEAPON_CARD_DEF = {
    template: 'card',
    layout: 'icon-top',
    size: 'small',
    slots: {
      icon: { bind: 'icon' },
      primaryText: { bind: 'name' },
      secondaryText: { bind: 'meta' },
    },
    onClick: { emit: 'widget:loadoutPick', payload: { kind: 'weapon', id: '{{id}}' } },
    selected: { bind: 'selected' },
  };

  static COMPANION_CARD_DEF = {
    template: 'card',
    layout: 'icon-top',
    size: 'small',
    slots: {
      icon: { bind: 'icon' },
      primaryText: { bind: 'name' },
      secondaryText: { bind: 'meta' },
    },
    onClick: { emit: 'widget:loadoutPick', payload: { kind: 'companion', id: '{{id}}' } },
    selected: { bind: 'selected' },
  };

  static SLOT_CHIP_DEF = {
    template: 'card',
    layout: 'text-only-row',
    size: 'small',
    slots: {
      primaryText: { bind: 'label' },
      secondaryText: { bind: 'hint' },
    },
    onClick: { emit: 'widget:loadoutClear', payload: { kind: '{{kind}}', index: '{{index}}' } },
    selected: { bind: 'filled' },
  };

  /** Shared per-item card data. `meta` mirrors the pre-migration meta line. */
  _itemData(list, id, selectedIds, kind) {
    const d = list.find(x => x.id === id) || {};
    return {
      id,
      icon: d.icon || '?',
      name: d.name || id,
      meta: kind === 'weapon'
        ? this._weaponTypeLabel(d.type) + ' \u00b7 Lv' + (d.unlockLevel || 1)
        : (d.desc || d.role || ''),
      selected: selectedIds.includes(id),
    };
  }

  /** Per-slot chip data (label/hint mirror the pre-migration slot markup). */
  _slotData(id, list, kind, index) {
    const filled = !!id;
    const d = filled ? (list.find(x => x.id === id) || {}) : {};
    return {
      kind,
      index: String(index),
      filled,
      // Slot number rides inline (old markup stacked it; text-only-row has
      // two text slots — same information, one line).
      label: 'Slot ' + (index + 1) + ' \u00b7 ' + (filled ? ((d.icon || '') + ' ' + (d.name || id)) : 'Empty'),
      hint: filled ? 'Tap to remove' : '',
    };
  }

  /** Persistent chrome skeleton: header + slot host + grid host + both action
   *  buttons, built once per show() (hide() wipes the overlay). Phase renders
   *  only re-populate hosts — no full-panel innerHTML rebuild per click. */
  _ensureChrome() {
    if (document.getElementById('loadout-next')) return; // skeleton present
    this.overlay.innerHTML =
      '<div class="loadout-panel">' +
      '<div class="loadout-header">' +
      '<button class="loadout-back" id="loadout-back">◀ Back</button>' +
      '<span class="loadout-title" id="loadout-title"></span>' +
      '<span class="loadout-subtitle" id="loadout-subtitle"></span>' +
      '</div>' +
      '<div class="loadout-slots" id="loadout-slots"></div>' +
      '<div class="loadout-grid" id="loadout-grid"></div>' +
      '<button class="loadout-confirm" id="loadout-next"></button>' +
      '<button class="loadout-confirm active" id="loadout-confirm" style="display:none"></button>' +
      '</div>';
  }

  /** Cached pool renderer + the two declared-event bridges (installed once). */
  _gridRenderer() {
    if (!this._renderer) {
      this._renderer = new WidgetRenderer({
        skins: (typeof window !== 'undefined' && window.game?.dataManager?.uiSkins) || null,
      });
      this.overlay.addEventListener('widget:loadoutPick', (e) => this._handlePick(e.detail || {}));
      this.overlay.addEventListener('widget:loadoutClear', (e) => this._handleClear(e.detail || {}));
    }
    return this._renderer;
  }

  // ── Public API ──────────────────────────────────────────

  show({ stageId, stageTier, onConfirm, onBack }) {
    this.stageId = stageId;
    this.stageTier = stageTier || 'standard';
    this.onConfirm = onConfirm;
    this.onBack = onBack;

    // Reset selections
    this.selectedWeapons = [null, null, null];
    this.selectedCompanions = [null, null, null];
    this.phase = 'weapons';

    // Pre-fill weapons from stage recommended if available
    this._prefillFromStage();

    this._render();
    this.overlay.classList.remove('hidden');
    if (this.audioManager) this.audioManager.playMenuSound('select');
  }

  hide() {
    this.overlay.classList.add('hidden');
    this.overlay.innerHTML = '';
    // Pools lived inside the wiped overlay — drop stale references so the next
    // show() builds fresh pool nodes (reuse of detached nodes would render nothing).
    for (const id of ['loadout-slots', 'loadout-grid']) {
      const host = document.getElementById(id);
      if (host) delete host._widgetPool;
    }
  }

  // ── Data Sources (redirectable for future progression) ──

  setQuestSystem(questSystem) {
    this.questSystem = questSystem;
  }

  // In Story Mode, only gate-unlocked content is offered.
  // No quest system (dev/Test-Town) → everything available.
  getAvailableWeapons() {
    const all = this.dataManager?.weapons || [];
    if (!this.questSystem || !this.questSystem._initialized) return all;
    return all.filter(w => this.questSystem.isContentUnlocked('weapons', w.id));
  }

  getAvailableCompanions() {
    // POT-003: read via the injected DataManager only — the
    // window.COMPANION_DATA global was removed.
    const all = Object.values(this.dataManager?.companions || {});
    if (!this.questSystem || !this.questSystem._initialized) return all;
    return all.filter(c => this.questSystem.isContentUnlocked('companions', c.id));
  }

  // ── Internal ────────────────────────────────────────────

  _prefillFromStage() {
    if (!this.stageId || !this.dataManager?.stages) return;
    const stages = Array.isArray(this.dataManager.stages)
      ? this.dataManager.stages
      : [this.dataManager.stages];
    const stage = stages.find(s => s.id === this.stageId);
    if (!stage) return;

    // BUG-015 fix: gate-aware prefill. Stage 'recommendedWeapons' must never
    // auto-fill a weapon the player hasn't unlocked — a locked id in a slot
    // renders as 'Empty' but still ships on Confirm.
    const available = this.getAvailableWeapons();
    if (!available.length) return;
    const tierCfg = stage.tierConfig?.[this.stageTier];
    const recommended = tierCfg?.recommendedWeapons || [];
    for (let i = 0; i < 3 && i < recommended.length; i++) {
      const wid = recommended[i];
      if (wid && available.some(w => w.id === wid) && !this.selectedWeapons.includes(wid)) {
        this.selectedWeapons[i] = wid;
      }
    }
  }

  _render() {
    if (this.phase === 'weapons') {
      this._renderWeapons();
    } else {
      this._renderCompanions();
    }
  }

  // ── Weapon Selection ────────────────────────────────────

  _renderWeapons() {
    const weapons = this.getAvailableWeapons();
    const stageName = this._getStageName();
    const R = this._gridRenderer();

    // Persistent chrome (v2.17.0): build once per show(); phases fill hosts.
    this._ensureChrome();
    const backBtn = document.getElementById('loadout-back') || document.getElementById('loadout-back-companions');
    if (backBtn) backBtn.id = 'loadout-back';
    document.getElementById('loadout-title').textContent = '⚔️ Choose Weapons';
    document.getElementById('loadout-subtitle').textContent = stageName + ' — ' + this._tierLabel();
    backBtn.textContent = '◀ Back';
    const nextBtn = document.getElementById('loadout-next');
    const confirmBtn = document.getElementById('loadout-confirm');
    nextBtn.style.display = '';
    confirmBtn.style.display = 'none';
    backBtn.onclick = () => {
      if (this.audioManager) this.audioManager.playMenuSound('back');
      this.hide();
      if (this.onBack) this.onBack();
    };
    // BUG-015 follow-up preserved: require AT LEAST 1 weapon, not exactly 3.
    const canProceed = this.selectedWeapons.filter(Boolean).length > 0;
    // The chrome skeleton builds this button EMPTY — the label lives here, per
    // render, exactly like #loadout-confirm in _renderCompanions (v2.19.9: the
    // label was dropped in the v2.17.0 chrome migration and the button rendered
    // as a bare green bar).
    nextBtn.textContent = canProceed ? '▶ Companions' : 'Select a weapon';
    nextBtn.classList.toggle('active', canProceed);
    nextBtn.onclick = canProceed ? () => {
      this.phase = 'companions';
      if (this.audioManager) this.audioManager.playMenuSound('select');
      this._renderCompanions();
    } : null;

    // Slot chips + weapon grid — pooled repeats (§5.1); selection is data.
    R.repeatInto(document.getElementById('loadout-slots'), LoadoutScreen.SLOT_CHIP_DEF,
      this.selectedWeapons.map((wid, i) => this._slotData(wid, weapons, 'weapon', i)));
    R.repeatInto(document.getElementById('loadout-grid'), LoadoutScreen.WEAPON_CARD_DEF,
      weapons.map(w => this._itemData(weapons, w.id, this.selectedWeapons, 'weapon')));
  }

  /** Declared-event handler for card picks — behavior verbatim from the old
   *  per-card listeners (duplicate guard, empty-slot fill, last-slot replace). */
  _handlePick({ kind, id }) {
    if (!id) return;
    const slots = kind === 'weapon' ? this.selectedWeapons : this.selectedCompanions;
    if (slots.includes(id)) return;
    const emptyIdx = slots.indexOf(null);
    slots[emptyIdx >= 0 ? emptyIdx : 2] = id;
    if (this.audioManager) this.audioManager.playMenuSound('select');
    if (kind === 'weapon') this._renderWeapons(); else this._renderCompanions();
  }

  /** Declared-event handler for slot clears — verbatim (always allowed). */
  _handleClear({ kind, index }) {
    const i = parseInt(index);
    if (kind === 'weapon') this.selectedWeapons[i] = null;
    else this.selectedCompanions[i] = null;
    if (this.audioManager) this.audioManager.playMenuSound('back');
    if (kind === 'weapon') this._renderWeapons(); else this._renderCompanions();
  }

  // ── Companion Selection ─────────────────────────────────

  _renderCompanions() {
    const companions = this.getAvailableCompanions();
    const R = this._gridRenderer();

    // Persistent chrome reused across phases — only hosts + labels change.
    this._ensureChrome();
    document.getElementById('loadout-title').textContent = '🐾 Choose Companions';
    document.getElementById('loadout-subtitle').textContent = 'Select up to 3 companions';
    const nextBtn = document.getElementById('loadout-next');
    const confirmBtn = document.getElementById('loadout-confirm');
    nextBtn.style.display = 'none';
    confirmBtn.style.display = '';
    const backBtn = document.getElementById('loadout-back') || document.getElementById('loadout-back-companions');
    if (backBtn) backBtn.id = 'loadout-back-companions';
    backBtn.textContent = '◀ Weapons';
    backBtn.onclick = () => {
      this.phase = 'weapons';
      if (this.audioManager) this.audioManager.playMenuSound('back');
      this._renderWeapons();
    };

    // Slot chips + companion grid — pooled repeats (§5.1); selection is data.
    R.repeatInto(document.getElementById('loadout-slots'), LoadoutScreen.SLOT_CHIP_DEF,
      this.selectedCompanions.map((cid, i) => this._slotData(cid, companions, 'companion', i)));
    R.repeatInto(document.getElementById('loadout-grid'), LoadoutScreen.COMPANION_CARD_DEF,
      companions.map(c => this._itemData(companions, c.id, this.selectedCompanions, 'companion')));

    // Confirm button (chrome): label reflects whether companions are chosen;
    // behavior verbatim incl. the BUG-015 belt-and-suspenders gate.
    const hasCompanions = this.selectedCompanions.filter(Boolean).length > 0;
    confirmBtn.textContent = hasCompanions ? '⚔️ Start Combat' : '⏭️ Skip Companions';
    confirmBtn.onclick = () => {
      if (this.audioManager) this.audioManager.playMenuSound('select');
      // BUG-015 fix: belt-and-suspenders — never ship a locked weapon even
      // if one somehow reaches a slot. Mirrors getAvailableWeapons() gating.
      let confirmedWeapons = this.selectedWeapons.filter(Boolean);
      if (this.questSystem && this.questSystem._initialized) {
        confirmedWeapons = confirmedWeapons.filter(id =>
          this.questSystem.isContentUnlocked('weapons', id));
      }
      const loadout = {
        weapons: confirmedWeapons,
        companions: this.selectedCompanions.filter(Boolean),
      };
      this.hide();
      if (this.onConfirm) this.onConfirm(loadout);
    };
  }

  _wireCompanionEvents() {
    // Retired v2.17.0 — wiring lives in _renderCompanions now; kept as a
    // no-op so any stray caller degrades instead of crashing.
  }

  // ── Helpers ─────────────────────────────────────────────

  _getStageName() {
    if (!this.stageId || !this.dataManager?.stages) return '';
    const stages = Array.isArray(this.dataManager.stages)
      ? this.dataManager.stages
      : [this.dataManager.stages];
    const stage = stages.find(s => s.id === this.stageId);
    return stage?.name || this.stageId;
  }

  _tierLabel() {
    const labels = { quick: '⚡ Quick', standard: '⚔️ Standard', highlight: '🔥 Highlight' };
    return labels[this.stageTier] || this.stageTier;
  }

  _weaponTypeLabel(type) {
    const labels = {
      projectile: 'Ranged', orbit: 'Ranged', area: 'AoE', cone: 'Cone',
      chain: 'Chain', melee_cone: 'Melee', melee_combo: 'Melee', melee_slam: 'Melee',
    };
    return labels[type] || type || '';
  }
}
