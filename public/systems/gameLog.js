// ============================================================
// GameLogSystem — player + developer console (game_log_system_spec.md).
//
// THE ONE-RULE BOUNDARY: this is a PLAY SURFACE, not a data source. It is a
// session-scoped ring buffer of noisy feedback (purchases, day advances,
// level-ups, errors) and MUST NEVER be read by conditions, exports, or the
// memory system — the canonical NPC memory log (systems/npcSystem.js) owns
// story memory. Two logs, two purposes, never merged.
//
// Capture: central bus listeners only (§21 pattern — no per-system
// sprinkles). Timestamps: in-game day (calendar) + session clock (debug).
// ============================================================

class GameLogSystem {
  static MAX_ENTRIES = 200;

  constructor(deps = {}) {
    this.gameManager = deps.gameManager || null;
    this.eventBus = deps.eventBus || null;
    this._entries = [];
    this._sessionStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    this._listenersRegistered = false;
    this._uiOpen = false;
    this._pendingResource = null; // per-frame debounce for resources:changed
  }

  init() {
    if (this._listenersRegistered) return; // KNOWLEDGE.md double-listener rule
    this._listenersRegistered = true;
    const bus = this.eventBus;
    if (!bus) return;

    const stamp = (text, kind) => this.log(text, { kind });

    bus.on('time:dayAdvanced', (d) => {
      if (!d || !Number.isFinite(d.toDay)) return;
      if (d.toDay - d.fromDay > 1) stamp(`— timeskip: +${d.toDay - d.fromDay} days (${d.source || 'story'})`, 'event');
      else stamp(`A new day begins (Day ${d.toDay}).`, 'event');
    });
    bus.on('quest:completed', (d) => {
      if (d?.questId) stamp(`Quest completed: ${d.questId}`, 'reward');
    });
    bus.on('levelUp', (d) => {
      stamp(`Level up! Lv ${d?.level ?? '?'}`, 'reward');
    });
    bus.on('weaponLevelUp', (d) => {
      stamp(`${d?.weaponId || 'weapon'} → Lv ${d?.level ?? d?.newLevel ?? '?'}`, 'reward');
    });
    bus.on('shopPurchase', (d) => {
      const item = d?.item;
      if (item) stamp(`Purchased ${item.name || item.id}${item.cost ? ` (−${item.cost} gold)` : ''}`, 'info');
    });
    bus.on('farmingLootCollected', (d) => {
      const loot = d?.loot;
      if (loot) stamp(`Farming loot collected: ${loot.gold ?? 0} gold${Object.keys(loot.materials || {}).length ? ' + materials' : ''}`, 'reward');
    });
    // resources:changed fires per mutation; debounce to one entry per frame.
    bus.on('resources:changed', (d) => {
      if (!d || typeof d.currency !== 'number') return;
      this._pendingResource = { currency: d.currency, source: d.source };
      if (this._resourceTimer) return;
      this._resourceTimer = setTimeout(() => {
        this._resourceTimer = null;
        const p = this._pendingResource;
        this._pendingResource = null;
        if (p && typeof p.source === 'string') {
          stamp(`Wallet ${p.currency}g (${p.source})`, 'info');
        }
      }, 350);
    });

    // Error net → visible ⚠ entries (dev + player honesty).
    if (typeof window !== 'undefined') {
      if (!window.__GAMELOG_ERRNET__) {
        window.__GAMELOG_ERRNET__ = true;
        window.addEventListener('error', (e) => {
          this.log(`⚠ ${e.message || 'unknown error'}`, { kind: 'error' });
        });
      }
    }
  }

  /** Append one entry. Fire-and-forget: never throws, never blocks. */
  log(text, opts = {}) {
    const kind = typeof opts.kind === 'string' ? opts.kind : 'info';
    const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const sessionSec = Math.max(0, Math.floor((now - this._sessionStart) / 1000));
    const mm = String(Math.floor(sessionSec / 60)).padStart(2, '0');
    const ss = String(sessionSec % 60).padStart(2, '0');
    const ts = this.gameManager?.timeServiceRef || this.gameManager?._timeServiceRef || null;
    const day = ts ? ts.getCurrentDay() : null;
    this._entries.push({
      kind,
      text: String(text ?? ''),
      day,
      at: `${mm}:${ss}`,
    });
    if (this._entries.length > GameLogSystem.MAX_ENTRIES) {
      this._entries.splice(0, this._entries.length - GameLogSystem.MAX_ENTRIES);
    }
    if (this.eventBus) this.eventBus.emit('gameLog:updated', { size: this._entries.length });
    this._renderIfOpen();
  }

  getEntries(n) {
    const list = this._entries.slice();
    return Number.isFinite(n) ? list.slice(-n) : list;
  }

  size() { return this._entries.length; }

  clear() {
    this._entries = [];
    if (this.eventBus) this.eventBus.emit('gameLog:updated', { size: 0 });
    this._renderIfOpen();
  }

  // ── Town console UI (spec §3) ──

  togglePanel() {
    if (this._uiOpen) this.closePanel();
    else this.openPanel();
  }

  openPanel() {
    this._uiOpen = true;
    this._renderIfOpen();
    const panel = document.getElementById('gamelog-panel');
    if (panel) panel.classList.add('active');
  }

  closePanel() {
    this._uiOpen = false;
    const panel = document.getElementById('gamelog-panel');
    if (panel) panel.classList.remove('active');
  }

  _renderIfOpen() {
    if (!this._uiOpen || typeof document === 'undefined') return;
    const panel = document.getElementById('gamelog-panel');
    if (!panel) return;
    const list = panel.querySelector('#gamelog-list');
    if (!list) return;
    const entries = this.getEntries().slice().reverse(); // newest first
    list.innerHTML = entries.length === 0
      ? '<div class="gamelog-empty">Nothing logged yet this session.</div>'
      : entries.map((e) =>
          `<div class="gamelog-entry kind-${e.kind}"><span class="gamelog-ts">[Day ${e.day ?? '—'} · ${e.at}]</span> ${GameLogSystem._esc(e.text)}</div>`
        ).join('');
    const count = panel.querySelector('#gamelog-count');
    if (count) count.textContent = String(this.size());
  }

  static _esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  installPanel() {
    if (typeof document === 'undefined' || document.getElementById('gamelog-panel')) return;
    const panel = document.createElement('div');
    panel.id = 'gamelog-panel';
    panel.innerHTML = `
      <div class="gamelog-head">
        <span class="gamelog-title">📖 Session Log</span>
        <span class="gamelog-count" id="gamelog-count">0</span>
        <button class="gamelog-btn" id="gamelog-clear">Clear</button>
        <button class="gamelog-btn" id="gamelog-close">✕</button>
      </div>
      <div id="gamelog-list" class="gamelog-list"></div>
    `;
    document.body.appendChild(panel);
    panel.querySelector('#gamelog-clear')?.addEventListener('click', () => this.clear());
    panel.querySelector('#gamelog-close')?.addEventListener('click', () => this.closePanel());
    // Bus re-render when new entries arrive while open.
    if (this.eventBus && !this._uiListener) {
      this._uiListener = true;
      this.eventBus.on('gameLog:updated', () => this._renderIfOpen());
    }
  }

  // ── Dev inspector (house style) ──

  installInspector() {
    if (typeof window === 'undefined' || window.__GAMELOG_DEBUG__) return;
    const sys = this;
    window.__GAMELOG_DEBUG__ = {
      last: (n = 20) => sys.getEntries(n),
      filter: (q) => sys.getEntries().filter((e) => e.kind === q || e.text.includes(String(q))),
      dump: () => {
        const text = sys.getEntries().map((e) => `[Day ${e.day ?? '—'} · ${e.at}] (${e.kind}) ${e.text}`).join('\n');
        if (typeof NPCExportSystem !== 'undefined' && NPCExportSystem.copyText) NPCExportSystem.copyText(text);
        return text;
      },
      clear: () => sys.clear(),
    };
  }
}

// Environment bridges — same dual-world pattern as the other systems files.
if (typeof globalThis !== 'undefined') {
  globalThis.GameLogSystem = GameLogSystem;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameLogSystem };
}
