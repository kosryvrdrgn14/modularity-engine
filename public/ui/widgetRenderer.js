// ============================================================
// WidgetRenderer (data_driven_systems_compilation.md §5, widget_ui_system_spec.md
// §2; MASTER_DESIGN §24 Step 3). The ONE widget rendering layer — inventory
// grid (§3 pilot), NPC Condition Inspector screen (§2), and the export
// favorites/memoryCheckpoint browser (§4) all render through this; no feature
// builds its own card code (the compilation's one rule).
//
// Philosophy (spec §1): structurally repetitive UI (cards/tiles/rows) = ONE
// configurable Card template + fixed layout presets + bounded tokens + a
// purely-visual skin layer. All three are data, editable without code.
//
// Contract:
//   - render(def, data) -> HTMLElement. validate() THROWS loudly on a
//     malformed definition (spec §6.1 — never a silently-broken widget).
//   - Layout presets only (§2.3): icon-left | icon-top | icon-only |
//     text-only-row. Bounded size tokens (§2.4). Slots are optional (§2.1).
//   - Bindings are dotted paths into the instance's data; missing DATA
//     renders empty (runtime condition), missing SCHEMA throws (§6.1).
//   - onClick emits a CustomEvent (bubbles) named def.onClick.emit with the
//     declared payload; '{{path}}' templates in payload values are resolved.
//   - renderRepeat(def, items) -> DocumentFragment of one card per element
//     (§2.5). repeatInto(container, def, items) rebinds a pooled set of
//     nodes in place — the §5.1 pooling rule for list-driven screens.
//   - Skins (§4): data-driven, purely visual (color/texture/ornament),
//     looked up in dataManager.uiSkins by skinId. A skin is NEVER structural
//     and never the sole information channel (§4.4 hard rule): every skin
//     applied is cosmetic class + CSS custom props only.
//   - Version tag (§6.2): definitions may carry `_v`; skin entries carry
//     `version`. Unknown/missing versions render but warn once.
//
// v1.1 (v2.13.0 — first screen migration, game-log panel):
//   - Context accent (§2.6): def-level `accent: { bind }` — a DATA-BOUND
//     accent token name resolved against a bounded palette
//     (--widget-accent-<token> in styles.css; unknown token falls back to the
//     default --widget-accent). Severity/status colors become entry data,
//     never per-screen CSS. Re-resolved on pooled rebind.
//   - `muted` def flag: bounded variation → .widget-muted class (dimmed
//     history rendering). Structure/class only, like layout presets.
//
// v1.1.1 (v2.16.0 — dialogue overlay migration, screen 4):
//   - Click-time data: interactive nodes read their CURRENT binding data at
//     click time (this._instanceData), so repeatInto rebinding updates
//     onClick payloads too. Previously a pooled card kept its creation-time
//     data (empty for pool-created nodes) — harmless while consumers
//     recreated their grids, wrong once a true pool rebinds payloads.
// ============================================================
//
// v1.2 (v2.17.0 — loadout migration, screen 5):
//   - `selected` def flag: a DATA-BOUND boolean (`selected: { bind }`) that
//     toggles the .widget-selected class on rebind — bounded variation, same
//     discipline as `muted` (v1.1). Selection state becomes card data; screens
//     no longer toggle classes by hand.
//   - Click-time DEF (completes v1.1.1): pooled nodes store their CURRENT def
//     (_instanceDef), so repeatInto with a DIFFERENT def on a warm pool swaps
//     the emitted event/payload too — a weapons card rebound as a companion
//     must not keep firing the weapons payload. Rebind also refreshes
//     layout/size classes (defs may vary per phase).
// ============================================================

class WidgetRenderer {
  static LAYOUTS = ['icon-left', 'icon-top', 'icon-only', 'text-only-row'];
  static SIZES = ['small', 'medium', 'large'];
  static SLOTS = ['icon', 'primaryText', 'secondaryText', 'badge', 'progressBar', 'statusIndicator'];

  constructor(options = {}) {
    this._skins = options.skins || (typeof window !== 'undefined' && window.game?.dataManager?.uiSkins) || null;
    this._logger = options.logger || ((...a) => console.error('[WIDGET]', ...a));
    this._warnedVersions = new Set();
    // Registry of the defs behind the currently-live instances (§6.4 inspector
    // groundwork + §7 occlusion audit: every interactive instance is here).
    this._instances = new Set();
    // v1.1.1 (v2.16.0): CURRENT binding data per interactive node. The click
    // handler reads THIS at click time, so pooled rebinding (repeatInto →
    // _rebind) also updates the payload — a pooled card is a fresh card.
    // Keyed by element; cleaned up in _forget.
    this._instanceData = new Map();
    // v1.2: CURRENT def per interactive node — the click handler reads this at
    // click time (with the current data), so a warm pool rebound with a
    // different def emits the NEW event/payload, never the creation one.
    this._instanceDef = new Map();
    // Class-level registry of ALL renderer instances (v2.14.0): audits and
    // inspectors enumerate every screen's widgets without knowing who owns
    // which renderer — screens are free to construct their own.
    WidgetRenderer._all.add(this);
  }

  static _all = new Set();

  // ── Schema validation — THROWS (spec §6.1: fail loudly at load/use) ──

  validate(def) {
    const problems = [];
    if (!def || typeof def !== 'object' || Array.isArray(def)) {
      throw new Error('WIDGET DEF: definition must be an object');
    }
    if (def.template !== 'card') {
      problems.push(`template must be "card" (got ${JSON.stringify(def.template)})`);
    }
    if (def.layout !== undefined && !WidgetRenderer.LAYOUTS.includes(def.layout)) {
      problems.push(`layout must be one of ${WidgetRenderer.LAYOUTS.join('|')} (got ${JSON.stringify(def.layout)})`);
    }
    if (def.size !== undefined && !WidgetRenderer.SIZES.includes(def.size)) {
      problems.push(`size must be one of ${WidgetRenderer.SIZES.join('|')} (got ${JSON.stringify(def.size)})`);
    }
    if (def.slots !== undefined && (typeof def.slots !== 'object' || def.slots === null || Array.isArray(def.slots))) {
      problems.push('slots must be an object keyed by slot name');
    }
    for (const [name, spec] of Object.entries(def.slots || {})) {
      if (!WidgetRenderer.SLOTS.includes(name)) {
        problems.push(`unknown slot "${name}" — known: ${WidgetRenderer.SLOTS.join(', ')}`);
        continue;
      }
      if (!spec || typeof spec !== 'object') {
        problems.push(`slot "${name}" must be an object`);
        continue;
      }
      if (typeof spec.bind !== 'string' || !spec.bind) {
        problems.push(`slot "${name}".bind must be a non-empty dotted path (got ${JSON.stringify(spec.bind)})`);
      }
      if (name === 'progressBar' && (typeof spec.max !== 'string' || !spec.max)) {
        problems.push('slot "progressBar" requires a "max" bound path');
      }
    }
    if (def.onClick !== undefined) {
      if (!def.onClick || typeof def.onClick !== 'object' || typeof def.onClick.emit !== 'string' || !def.onClick.emit) {
        problems.push('onClick.emit must be a non-empty event name');
      }
      if (def.onClick && def.onClick.payload !== undefined &&
          (typeof def.onClick.payload !== 'object' || def.onClick.payload === null)) {
        problems.push('onClick.payload must be an object');
      }
    }
    if (def.skinId !== undefined && (typeof def.skinId !== 'string' || !def.skinId)) {
      problems.push('skinId must be a non-empty string');
    }
    if (def.accent !== undefined) {
      if (!def.accent || typeof def.accent !== 'object' || typeof def.accent.bind !== 'string' || !def.accent.bind) {
        problems.push('accent.bind must be a non-empty dotted path');
      }
    }
    if (def.muted !== undefined && typeof def.muted !== 'boolean') {
      problems.push('muted must be a boolean');
    }
    if (problems.length) {
      throw new Error(`WIDGET DEF invalid: ${problems.join('; ')}`);
    }
    return true;
  }

  // ── Rendering ──

  /** Render one card instance. `data` is the binding root for this instance. */
  render(def, data = {}) {
    this.validate(def);
    if (def._v !== undefined && def._v !== 1 && !this._warnedVersions.has(def._v)) {
      this._warnedVersions.add(def._v);
      console.warn(`[WIDGET] def _v=${def._v} — renderer vocabulary is v1; update the definition (spec §6.2)`);
    }

    const el = document.createElement('div');
    el.className = 'widget-card';
    el.classList.add(`layout-${def.layout || 'icon-left'}`);
    el.classList.add(`size-${def.size || 'medium'}`);
    el.dataset.widgetTemplate = 'card';
    if (def.muted) el.classList.add('widget-muted');
    // v1.2 — selection resolves from DATA at render (rebind re-resolves below)
    if (def.selected) {
      const sel = this._resolve(def.selected.bind, data);
      if (sel) el.classList.add('widget-selected');
    }

    // Skin layer (§4): purely visual — classes + CSS custom props only.
    this._applySkin(el, def.skinId);
    // Context accent (§2.6): data-bound bounded token.
    this._applyAccent(el, def.accent, data);

    // Slots (§2.1 — optional; only declared slots exist).
    for (const [name, spec] of Object.entries(def.slots || {})) {
      const slotEl = this._renderSlot(name, spec, data);
      if (slotEl) el.appendChild(slotEl);
    }

    // Interaction (§2.2): emit the DECLARED event — nothing hard-coded.
    if (def.onClick) {
      el.classList.add('interactive');
      el.addEventListener('click', () => {
        // v1.1.1/v1.2: resolve against the CURRENT def + data (repeatInto
        // rebinds may have replaced either since this node was created).
        const d = this._instanceDef.get(el) || def;
        const current = this._instanceData.get(el) || data;
        const payload = {};
        for (const [k, tpl] of Object.entries(d.onClick.payload || {})) {
          payload[k] = typeof tpl === 'string' ? this._resolveTemplate(tpl, current) : tpl;
        }
        el.dispatchEvent(new CustomEvent(d.onClick.emit, { detail: payload, bubbles: true }));
      });
      this._instanceData.set(el, data);
      this._instanceDef.set(el, def);
      // §7 groundwork: register the live interactive instance.
      this._instances.add({ el, def, data });
      el.addEventListener('widget-detach', () => this._forget(el), { once: true });
    }

    return el;
  }

  /** Repeat-over-array (§2.5): one card per element, returned as a fragment. */
  renderRepeat(def, items = []) {
    this.validate(def); // validate once — every instance shares the schema
    const frag = document.createDocumentFragment();
    for (const item of items) frag.appendChild(this.render(def, item));
    return frag;
  }

  /** Pooled repeat (§5.1): rebind into `container`, reusing its existing
   *  widget nodes instead of destroying/recreating DOM. Extra old nodes are
   *  hidden (kept in the pool), missing nodes are created. */
  repeatInto(container, def, items = []) {
    this.validate(def);
    if (!container._widgetPool) container._widgetPool = [];
    const pool = container._widgetPool;
    while (pool.length < items.length) {
      const el = this.render(def, {});
      container.appendChild(el);
      pool.push(el);
    }
    pool.forEach((el, i) => {
      if (i < items.length) {
        this._rebind(el, def, items[i]);
        this._instanceData.set(el, items[i]); // v1.1.1: payloads rebind too
        this._instanceDef.set(el, def);        // v1.2: interaction def rebinds too
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });
    return pool.length;
  }

  // ── Internals ──

  _renderSlot(name, spec, data) {
    const value = this._resolve(spec.bind, data);
    if (name === 'progressBar') {
      const max = this._resolve(spec.max, data);
      const el = document.createElement('div');
      el.className = 'widget-slot slot-progress';
      el.dataset.slot = name;
      const fill = document.createElement('div');
      fill.className = 'widget-progress-fill';
      const pct = (typeof value === 'number' && typeof max === 'number' && max > 0)
        ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
      fill.style.width = `${pct}%`;
      el.appendChild(fill);
      return el;
    }
    if (name === 'statusIndicator') {
      const el = document.createElement('span');
      el.className = 'widget-slot slot-status';
      el.dataset.slot = name;
      const variant = spec.variant || (value ? 'active' : 'locked');
      el.classList.add(`status-${variant}`);
      el.textContent = value === '' ? '' : String(value);
      return el.textContent === '' && variant === 'active' ? null : el;
    }
    if (name === 'icon') {
      const el = document.createElement('span');
      el.className = 'widget-slot slot-icon';
      el.dataset.slot = name;
      el.textContent = String(value ?? '');
      return el; // :empty CSS hides it — text reflow (§2.7)
    }
    const el = document.createElement('div');
    el.className = `widget-slot slot-${name}`;
    el.dataset.slot = name;
    el.textContent = String(value ?? '');
    return el;
  }

  /** Dotted-path resolver. Missing DATA → '' (render-empty); a malformed
   *  BIND path is a schema problem and validate() already threw. */
  _resolve(path, data) {
    if (typeof path !== 'string' || !path) return '';
    const v = path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);
    return v === undefined || v === null ? '' : v;
  }

  /** '{{a.b}}' template resolution (used by onClick payload values). */
  _resolveTemplate(tpl, data) {
    return String(tpl).replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const v = this._resolve(path.trim(), data);
      return v === '' ? '' : String(v);
    });
  }

  /** Context accent (§2.6 v1.1): resolve def.accent.bind against the data and
   *  apply the bounded palette token. Unknown/missing token → default accent
   *  (fail-safe, never a raw value from data). */
  _applyAccent(el, accentSpec, data) {
    if (!accentSpec || typeof accentSpec.bind !== 'string') return;
    const v = this._resolve(accentSpec.bind, data);
    if (typeof v === 'string' && /^[a-z][a-z0-9-]*$/.test(v)) {
      el.style.setProperty('--widget-accent', `var(--widget-accent-${v}, var(--widget-accent))`);
    }
  }

  _applySkin(el, skinId) {
    if (!skinId) return;
    const skin = this._skins && typeof this._skins === 'object' ? this._skins[skinId] : null;
    el.classList.add(`skin-${skinId}`);
    if (!skin) {
      this._logger(`skin "${skinId}" not found in dataManager.uiSkins — rendering unskinned (visual only, structure intact)`);
      return;
    }
    if (skin.version !== undefined && skin.version !== 1) {
      this._logger(`skin "${skinId}" version ${skin.version} — renderer vocabulary is v1 (spec §6.2)`);
    }
    // §4.4: skin properties are CSS-only. Image paths (border/background/
    // cornerOrnament) would be url() assignments — none exist yet; when they
    // do, the asset-exists rule from the skin spec applies BEFORE rendering.
    if (typeof skin.background === 'string' && !skin.background.includes('/')) {
      el.style.setProperty('--widget-skin-bg', skin.background);
    }
    if (typeof skin.accentColorToken === 'string') {
      el.style.setProperty('--widget-accent', skin.accentColorToken);
    }
  }

  /** Pooled rebind: rewrite slot contents of an existing node (no node churn). */
  _rebind(el, def, data) {
    // v1.2: layout/size classes refresh too — a pool node may be rebound with
    // a def that differs per phase (stale classes would misrender silently).
    el.classList.remove(...WidgetRenderer.LAYOUTS.map((l) => 'layout-' + l));
    el.classList.remove(...WidgetRenderer.SIZES.map((s) => 'size-' + s));
    el.classList.add('layout-' + (def.layout || 'icon-left'), 'size-' + (def.size || 'medium'));
    // v1.2: selection is data — class re-resolves from the new binding.
    if (def.selected) {
      const sel = this._resolve(def.selected.bind, data);
      el.classList.toggle('widget-selected', !!sel);
    }
    // Context accent must re-resolve too (severity can change per item).
    if (def.accent) {
      const v = this._resolve(def.accent.bind, data);
      if (typeof v === 'string' && /^[a-z][a-z0-9-]*$/.test(v)) {
        el.style.setProperty('--widget-accent', `var(--widget-accent-${v}, var(--widget-accent))`);
      }
    }
    for (const [name, spec] of Object.entries(def.slots || {})) {
      const slotEl = el.querySelector(`[data-slot="${name}"]`);
      if (!slotEl) continue;
      const value = this._resolve(spec.bind, data);
      if (name === 'progressBar') {
        const max = this._resolve(spec.max, data);
        const pct = (typeof value === 'number' && typeof max === 'number' && max > 0)
          ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
        const fill = slotEl.querySelector('.widget-progress-fill');
        if (fill) fill.style.width = `${pct}%`;
      } else if (name === 'statusIndicator') {
        const variant = spec.variant || (value ? 'active' : 'locked');
        slotEl.classList.remove('status-active', 'status-locked');
        slotEl.classList.add(`status-${variant}`);
        slotEl.textContent = value === '' ? '' : String(value);
      } else {
        slotEl.textContent = String(value ?? '');
      }
    }
  }

  _forget(el) {
    this._instanceData.delete(el); // v1.1.1
    this._instanceDef.delete(el);  // v1.2
    for (const inst of this._instances) {
      if (inst.el === el) this._instances.delete(inst);
    }
  }
}

// Environment bridges — same dual-world pattern as conditionEngine.js/npcSystem.js.
if (typeof globalThis !== 'undefined') globalThis.WidgetRenderer = WidgetRenderer;
if (typeof module !== 'undefined' && module.exports) module.exports = WidgetRenderer;
