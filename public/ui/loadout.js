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
    let all;
    // Read from DataManager (JSON) or fall back to global
    if (this.dataManager?.companions) {
      all = Object.values(this.dataManager.companions);
    } else if (typeof COMPANION_DATA !== 'undefined') {
      all = Object.values(COMPANION_DATA);
    } else {
      all = [];
    }
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

    const tierCfg = stage.tierConfig?.[this.stageTier];
    const recommended = tierCfg?.recommendedWeapons || [];
    for (let i = 0; i < 3 && i < recommended.length; i++) {
      this.selectedWeapons[i] = recommended[i];
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

    let html = '';
    html += '<div class="loadout-panel">';
    html += '<div class="loadout-header">';
    html += '<button class="loadout-back" id="loadout-back">◀ Back</button>';
    html += '<span class="loadout-title">⚔️ Choose Weapons</span>';
    html += '<span class="loadout-subtitle">' + stageName + ' — ' + this._tierLabel() + '</span>';
    html += '</div>';

    // Slot indicators
    html += '<div class="loadout-slots">';
    for (let i = 0; i < 3; i++) {
      const wid = this.selectedWeapons[i];
      const wDef = wid ? weapons.find(w => w.id === wid) : null;
      const label = wDef ? (wDef.icon || '') + ' ' + wDef.name : 'Empty';
      const active = wid ? 'filled' : '';
      html += '<div class="loadout-slot ' + active + '" data-slot="' + i + '">';
      html += '<div class="loadout-slot-label">Slot ' + (i + 1) + '</div>';
      html += '<div class="loadout-slot-value">' + label + '</div>';
      if (wid) html += '<div class="loadout-slot-hint">Tap to remove</div>';
      html += '</div>';
    }
    html += '</div>';

    // Weapon grid
    html += '<div class="loadout-grid">';
    for (const w of weapons) {
      const isSelected = this.selectedWeapons.includes(w.id);
      const classes = 'loadout-card' + (isSelected ? ' selected' : '');
      const wType = this._weaponTypeLabel(w.type);
      html += '<div class="' + classes + '" data-wid="' + w.id + '">';
      html += '<div class="loadout-card-icon">' + (w.icon || '?') + '</div>';
      html += '<div class="loadout-card-name">' + w.name + '</div>';
      html += '<div class="loadout-card-meta">' + wType + ' · Lv' + (w.unlockLevel || 1) + '</div>';
      html += '</div>';
    }
    html += '</div>';

    // Next button
    const canProceed = this.selectedWeapons.filter(Boolean).length === 3;
    html += '<button class="loadout-confirm ' + (canProceed ? 'active' : '') + '" id="loadout-next">';
    html += 'Next: Companions ▶';
    html += '</button>';

    html += '</div>';

    this.overlay.innerHTML = html;
    this._wireWeaponEvents();
  }

  _wireWeaponEvents() {
    // Back button
    const backBtn = document.getElementById('loadout-back');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.audioManager) this.audioManager.playMenuSound('back');
        this.hide();
        if (this.onBack) this.onBack();
      });
    }

    // Slot click → remove
    this.overlay.querySelectorAll('.loadout-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const idx = parseInt(slot.dataset.slot);
        this.selectedWeapons[idx] = null;
        if (this.audioManager) this.audioManager.playMenuSound('back');
        this._renderWeapons();
      });
    });

    // Card click → add
    this.overlay.querySelectorAll('.loadout-card').forEach(card => {
      card.addEventListener('click', () => {
        const wid = card.dataset.wid;
        if (this.selectedWeapons.includes(wid)) return;
        const emptyIdx = this.selectedWeapons.indexOf(null);
        if (emptyIdx >= 0) {
          this.selectedWeapons[emptyIdx] = wid;
        } else {
          this.selectedWeapons[2] = wid; // replace last
        }
        if (this.audioManager) this.audioManager.playMenuSound('select');
        this._renderWeapons();
      });
    });

    // Next button
    const nextBtn = document.getElementById('loadout-next');
    if (nextBtn && this.selectedWeapons.filter(Boolean).length === 3) {
      nextBtn.addEventListener('click', () => {
        this.phase = 'companions';
        if (this.audioManager) this.audioManager.playMenuSound('select');
        this._renderCompanions();
      });
    }
  }

  // ── Companion Selection ─────────────────────────────────

  _renderCompanions() {
    const companions = this.getAvailableCompanions();

    let html = '';
    html += '<div class="loadout-panel">';
    html += '<div class="loadout-header">';
    html += '<button class="loadout-back" id="loadout-back-companions">◀ Weapons</button>';
    html += '<span class="loadout-title">🐾 Choose Companions</span>';
    html += '<span class="loadout-subtitle">Select up to 3 companions</span>';
    html += '</div>';

    // Slot indicators
    html += '<div class="loadout-slots">';
    for (let i = 0; i < 3; i++) {
      const cid = this.selectedCompanions[i];
      const cDef = cid ? companions.find(c => c.id === cid) : null;
      const label = cDef ? (cDef.icon || '') + ' ' + cDef.name : 'Empty';
      const active = cid ? 'filled' : '';
      html += '<div class="loadout-slot ' + active + '" data-cslot="' + i + '">';
      html += '<div class="loadout-slot-label">Slot ' + (i + 1) + '</div>';
      html += '<div class="loadout-slot-value">' + label + '</div>';
      if (cid) html += '<div class="loadout-slot-hint">Tap to remove</div>';
      html += '</div>';
    }
    html += '</div>';

    // Companion grid
    html += '<div class="loadout-grid">';
    for (const c of companions) {
      const isSelected = this.selectedCompanions.includes(c.id);
      const classes = 'loadout-card' + (isSelected ? ' selected' : '');
      html += '<div class="' + classes + '" data-cid="' + c.id + '">';
      html += '<div class="loadout-card-icon">' + (c.icon || '?') + '</div>';
      html += '<div class="loadout-card-name">' + c.name + '</div>';
      html += '<div class="loadout-card-meta">' + (c.desc || c.role || '') + '</div>';
      html += '</div>';
    }
    html += '</div>';

    // Confirm button
    const hasCompanions = this.selectedCompanions.filter(Boolean).length > 0;
    html += '<button class="loadout-confirm active" id="loadout-confirm">';
    html += hasCompanions ? '⚔️ Start Combat' : '⏭️ Skip Companions';
    html += '</button>';

    html += '</div>';

    this.overlay.innerHTML = html;
    this._wireCompanionEvents();
  }

  _wireCompanionEvents() {
    // Back to weapons
    const backBtn = document.getElementById('loadout-back-companions');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.phase = 'weapons';
        if (this.audioManager) this.audioManager.playMenuSound('back');
        this._renderWeapons();
      });
    }

    // Slot click → remove
    this.overlay.querySelectorAll('.loadout-slot').forEach(slot => {
      slot.addEventListener('click', () => {
        const idx = parseInt(slot.dataset.cslot);
        this.selectedCompanions[idx] = null;
        if (this.audioManager) this.audioManager.playMenuSound('back');
        this._renderCompanions();
      });
    });

    // Card click → add
    this.overlay.querySelectorAll('.loadout-card').forEach(card => {
      card.addEventListener('click', () => {
        const cid = card.dataset.cid;
        if (this.selectedCompanions.includes(cid)) return;
        const emptyIdx = this.selectedCompanions.indexOf(null);
        if (emptyIdx >= 0) {
          this.selectedCompanions[emptyIdx] = cid;
        } else {
          this.selectedCompanions[2] = cid;
        }
        if (this.audioManager) this.audioManager.playMenuSound('select');
        this._renderCompanions();
      });
    });

    // Confirm
    const confirmBtn = document.getElementById('loadout-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => {
        if (this.audioManager) this.audioManager.playMenuSound('select');
        const loadout = {
          weapons: this.selectedWeapons.filter(Boolean),
          companions: this.selectedCompanions.filter(Boolean),
        };
        this.hide();
        if (this.onConfirm) this.onConfirm(loadout);
      });
    }
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
