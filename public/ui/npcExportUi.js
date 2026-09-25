// ============================================================
// NPCExportUI — Favorites / memoryCheckpoint browser (§4.1 title screen)
// + §10 in-game entry point (dialogue topic).
//
// PURE CONSUMPTION of the export system + WidgetRenderer: no second
// renderer, no second log, no evaluator. Title-screen safe — reads saved
// slots through NPCExportSystem.getFavoriteSummaries(), never a live
// session (spec §1 hard boundary).
// ============================================================

class NPCExportUI {
  /**
   * deps: { gameManager, exportSystem, widgetRenderer, audioManager }
   * Constructed in engine/game.js; constructed BEFORE any session starts —
   * the title-screen browser must work with no live session at all.
   */
  constructor(deps = {}) {
    this.gameManager = deps.gameManager || null;
    this.exportSystem = deps.exportSystem || null;
    this.renderer = deps.widgetRenderer || null;
    this.audioManager = deps.audioManager || null;
    this._overlayEl = null;
  }

  _ensureOverlay() {
    if (this._overlayEl) return this._overlayEl;
    let overlay = document.getElementById('export-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'export-overlay';
      document.body.appendChild(overlay);
    }
    this._overlayEl = overlay;
    return overlay;
  }

  // ── §4.1 Title-screen entry: favorites list (recency-first) ──

  openBrowser() {
    const overlay = this._ensureOverlay();
    if (!this.exportSystem) return;
    const summaries = this.exportSystem.getFavoriteSummaries();
    const R = this.renderer || new WidgetRenderer({});

    let html = '<div id="export-panel">';
    html += '<div class="slot-picker-title">📖 Favorite Memories</div>';

    if (summaries.length === 0) {
      // §4.2 empty state — intentional and friendly, never broken-looking.
      html += '<div class="export-empty">';
      html += '<div class="export-empty-icon">🕯️</div>';
      html += '<div class="export-empty-title">No memories saved yet</div>';
      html += '<div class="export-empty-desc">Play the story, meet people, and favorite a moment from a character\'s memory screen — your saved snapshots will appear here, ready to take with you.</div>';
      html += '</div>';
    } else {
      // Rendered through the widget system (§5): one Card per favorite.
      html += '<div class="export-list" id="export-list"></div>';
    }
    html += '<button class="slot-close" id="export-close">✕ Close</button>';
    html += '</div>';
    overlay.innerHTML = html;
    overlay.classList.add('active');

    if (summaries.length > 0) {
      const host = document.getElementById('export-list');
      // §5 Card, same configured-data pattern as the shop pilot. Pooled path
      // (§5.1): repeatInto rebinds in place when the list re-renders.
      const cardDef = {
        template: 'card',
        _v: 1,
        layout: 'icon-left',
        size: 'medium',
        slots: {
          icon: { bind: 'fav.icon' },
          primaryText: { bind: 'fav.label' },
          secondaryText: { bind: 'fav.meta' },
        },
        // v2.19.11 fix: onClick is a TOP-LEVEL def key (§2.2) — it sat inside
        // `slots`, the validator rejected the whole def, and openBrowser()
        // threw on any save with favorites (the empty state never renders the
        // list, which is why the battery never saw it).
        onClick: { emit: 'exportFavoriteOpened', payload: { slot: '{{fav.slot}}', favoriteId: '{{fav.favoriteId}}' } },
      };
      const data = summaries.map((s) => ({
        fav: {
          icon: '📖',
          label: s.label,
          meta: `Slot ${s.slot} · ${s.members.join(' + ')}`,
          slot: s.slot,
          favoriteId: s.favoriteId,
        },
      }));
      R.repeatInto(host, cardDef, data); // creates host._widgetPool (suite probe)
      host.addEventListener('exportFavoriteOpened', (e) => {
        this._openFavorite(e.detail.slot, e.detail.favoriteId);
      });
    }

    const closeBtn = document.getElementById('export-close');
    if (closeBtn) closeBtn.addEventListener('click', () => {
      this.audioManager?.playMenuSound('back');
      this.closeBrowser();
    });
  }

  closeBrowser() {
    const overlay = this._ensureOverlay();
    overlay.classList.remove('active');
    overlay.innerHTML = '';
  }

  // ── Selecting a favorite: regenerate + display/copy card(s) per member ──

  _openFavorite(slot, favoriteId) {
    this.audioManager?.playMenuSound('select');
    const result = this.exportSystem.regenerateFromSlot(Number(slot), favoriteId);
    const overlay = this._ensureOverlay();
    let html = '<div id="export-panel">';
    html += `<div class="slot-picker-title">📖 ${this._esc(result?.label || 'Memory')}</div>`;
    if (!result || !result.cards || result.cards.length === 0) {
      html += '<div class="export-empty"><div class="export-empty-title">This memory could not be loaded.</div><div class="export-empty-desc">The save may have been wiped or modified.</div></div>';
    } else {
      html += '<div class="export-cards">';
      for (const c of result.cards) {
        const safe = this._esc(c.text || '');
        html += `<div class="export-card-block" data-npc="${this._esc(c.npcId)}">`;
        html += `<div class="export-card-head">${this._esc(c.npcId)}${c.empty ? ' <span class="menu-lock">no history yet</span>' : ''}</div>`;
        html += `<pre class="export-card-text">${c.empty ? '— nothing to export yet —' : safe}</pre>`;
        if (!c.empty) {
          html += `<button class="slot-btn play" data-copy="${this._esc(c.npcId)}">📋 Copy card</button>`;
        }
        html += '</div>';
      }
      html += '</div>';
    }
    html += '<button class="slot-close" id="export-back">◀ Back</button>';
    html += '</div>';
    overlay.innerHTML = html;

    overlay.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const block = btn.closest('.export-card-block');
        const pre = block?.querySelector('.export-card-text');
        if (pre) NPCExportSystem.copyText(pre.textContent);
        btn.textContent = '✓ Copied';
        setTimeout(() => { btn.textContent = '📋 Copy card'; }, 1200);
      });
    });
    const back = document.getElementById('export-back');
    if (back) back.addEventListener('click', () => {
      this.audioManager?.playMenuSound('back');
      this.openBrowser(); // re-render list (favorites unchanged)
    });
  }

  // ── §10 In-game entry: scroll/book topic added to a character's dialogue ──

  /**
   * Returns an export topic for npcId, or null when there is no interaction
   * history (spec §10: no export option for a stranger).
   * TownContent appends this to the winning dialogueSet's topics.
   */
  exportTopicFor(npcId) {
    if (!this.exportSystem || typeof npcId !== 'string') return null;
    const facts = this.exportSystem.getFacts(npcId, {});
    if (facts.length === 0) return null;
    return {
      id: '__export_memory__',
      text: '📖 Let me preserve our memories…',
      _export: true,
    };
  }

  /** Called by TownContent when the export topic is chosen. */
  openPreview(npcId) {
    if (!this.exportSystem) return;
    this.audioManager?.playMenuSound('select');
    const card = this.exportSystem.generateCard(npcId, { allowEmpty: true });
    const text = this.exportSystem.renderText(card);
    const overlay = this._ensureOverlay();
    let html = '<div id="export-panel">';
    html += `<div class="slot-picker-title">📖 Memory of ${this._esc(card?.flavor?.name || npcId)}</div>`;
    html += '<div class="export-card-block">';
    html += `<pre class="export-card-text">${this._esc(text || '— nothing to export yet —')}</pre>`;
    if (text) html += '<button class="slot-btn play" id="export-copy-current">📋 Copy card</button>';
    html += '</div>';
    html += '<button class="slot-close" id="export-back">◀ Back</button>';
    html += '</div>';
    overlay.innerHTML = html;
    overlay.classList.add('active');

    const copy = document.getElementById('export-copy-current');
    if (copy) copy.addEventListener('click', () => {
      NPCExportSystem.copyText(text);
      copy.textContent = '✓ Copied';
      setTimeout(() => { copy.textContent = '📋 Copy card'; }, 1200);
    });
    const back = document.getElementById('export-back');
    if (back) back.addEventListener('click', () => {
      this.audioManager?.playMenuSound('back');
      this.closeBrowser();
    });
  }

  _esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

// Environment bridges — same dual-world pattern as the other systems files.
if (typeof globalThis !== 'undefined') {
  globalThis.NPCExportUI = NPCExportUI;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NPCExportUI };
}
