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
//
// v1.3 (v2.18.0 — shop tabs migration, screen 6):
//   - `disabled` def flag: DATA-BOUND boolean (`disabled: { bind }`) toggling
//     .widget-disabled — and a disabled card does NOT emit onClick. State read
//     at click time (_instanceDisabled), so pooled rebinds update it too
//     (e.g. an item becomes affordable after a purchase). Base CSS gives the
//     semantic look (opacity/no-pointer); screens may theme further.
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
    // v1.3: CURRENT disabled state per interactive node — click handler
    // suppresses emission when true (pooled rebinds update it).
    this._instanceDisabled = new Map();
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
    // v1.3 — disabled resolves from DATA at render (rebind re-resolves below)
    if (def.disabled) {
      const dis = this._resolve(def.disabled.bind, data);
      if (dis) el.classList.add('widget-disabled');
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
      // B11 (v2.19.15): interactive cards are keyboard-operable buttons —
      // role + focusability + Enter/Space activation (WCAG 2.1.1/4.1.2).
      // The disabled gate is honored on the keyboard path too: emitClick
      // reads _instanceDisabled at call time, same click-time discipline.
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      const emitClick = () => {
        // v1.3: disabled cards emit nothing (state is click-time, so a pool
        // node disabled by the latest rebind cannot fire a stale purchase).
        if (this._instanceDisabled.get(el)) return;
        // v1.1.1/v1.2: resolve against the CURRENT def + data (repeatInto
        // rebinds may have replaced either since this node was created).
        const d = this._instanceDef.get(el) || def;
        const current = this._instanceData.get(el) || data;
        const payload = {};
        for (const [k, tpl] of Object.entries(d.onClick.payload || {})) {
          payload[k] = typeof tpl === 'string' ? this._resolveTemplate(tpl, current) : tpl;
        }
        el.dispatchEvent(new CustomEvent(d.onClick.emit, { detail: payload, bubbles: true }));
      };
      el.addEventListener('click', emitClick);
      el.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        e.preventDefault(); // Space scrolls the page otherwise
        emitClick();
      });
      this._instanceData.set(el, data);
      this._instanceDef.set(el, def);
      this._instanceDisabled.set(el, !!(def.disabled && this._resolve(def.disabled.bind, data)));
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
    // v1.3 pool hygiene: an externally-wiped CONNECTED host (innerHTML='')
    // leaves the pool referencing DETACHED nodes — rebinding those renders
    // nothing. Wipe only then: a fully DETACHED host (staging fragments,
    // isolated tests) legitimately pools disconnected nodes — leave it be.
    if (pool.length && container.isConnected && !pool.some((el) => el.isConnected)) pool.length = 0;
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
        this._instanceDisabled.set(el, !!(def.disabled && this._resolve(def.disabled.bind, items[i]))); // v1.3
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
    // §6.2 version vocabulary: v1 = color-token only; v2 (B7 part 2,
    // v2.19.13) adds 9-slice border art + texture background + corner
    // ornament as IMAGE fields. Unknown future versions warn but render the
    // known fields — a mod's newer skin must not break the game silently.
    const v = skin.version === undefined ? 1 : skin.version;
    if (v !== 1 && v !== 2) {
      this._logger(`skin "${skinId}" version ${skin.version} — renderer vocabulary is v1/v2 (spec §6.2)`);
    }
    // §4.1 image fields (v2): border art is CSS-native 9-slice (border-image:
    // one asset stretches cleanly to any card size); the texture backgrounds
    // the card under the slots; the ornament sits in the top-right corner.
    // Every field is a CSS custom prop consumed by styles.css — the renderer
    // never touches structure, bindings, or events (§4.4). The asset-exists
    // rule is enforced at authoring time by the verify skin-asset gate.
    if (typeof skin.border === 'string' && skin.border.includes('/')) {
      el.style.setProperty('--widget-skin-border-image', `url(${skin.border})`);
      const slice = Number.isFinite(+skin.borderSlice) ? +skin.borderSlice : 16;
      el.style.setProperty('--widget-skin-border-slice', String(slice));
      el.style.setProperty('--widget-skin-border-width',
        typeof skin.borderWidth === 'string' ? skin.borderWidth : '16px');
    } else if (typeof skin.border === 'string') {
      this._logger(`skin "${skinId}": border without an image path — ignored (color tokens go in accentColorToken/background)`);
    }
    if (typeof skin.background === 'string' && skin.background.includes('/')) {
      el.style.setProperty('--widget-skin-bg-image', `url(${skin.background})`);
      // v2 layering: backgroundColor sits UNDER the texture (the §4.4 contrast
      // floor — a weave must never be the only thing between slots and bg).
      if (typeof skin.backgroundColor === 'string') {
        el.style.setProperty('--widget-skin-bg', skin.backgroundColor);
      }
    } else if (typeof skin.background === 'string') {
      // v1 form: a plain CSS color token — unchanged behavior.
      el.style.setProperty('--widget-skin-bg', skin.background);
    }
    if (typeof skin.cornerOrnament === 'string' && skin.cornerOrnament.includes('/')) {
      el.style.setProperty('--widget-skin-ornament', `url(${skin.cornerOrnament})`);
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
    // v1.3: the SKIN layer re-syncs on rebind too — one pool may swap between
    // skinned and unskinned defs (shop: bazaar_cloth inventory ↔ plain items).
    const curSkin = [...el.classList].find((c) => c.startsWith('skin-'));
    if ((def.skinId || '') !== (curSkin ? curSkin.slice(5) : '')) {
      if (curSkin) el.classList.remove(curSkin);
      // v2.19.13: image-skin props clean up too — a skinned→plain pool swap
      // must leave no stale border art/texture/ornament on the card.
      for (const p of ['--widget-skin-bg', '--widget-accent', '--widget-skin-border-image',
        '--widget-skin-border-slice', '--widget-skin-border-width',
        '--widget-skin-bg-image', '--widget-skin-ornament']) {
        el.style.removeProperty(p);
      }
      this._applySkin(el, def.skinId);
    }
    // B11 (v2.19.15): interaction a11y re-syncs on rebind too — a created-
    // interactive pool node swapped to a plain def must lose role/focusability
    // exactly like it keeps its stale-suppressed listener. (A node created
    // plain never gains a listener — pre-existing renderer semantics — so it
    // must never GAIN the attrs either: a focusable button with no event
    // would be an a11y lie.)
    if (def.onClick && el.classList.contains('interactive')) {
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
    } else if (!def.onClick) {
      el.removeAttribute('role');
      el.removeAttribute('tabindex');
    }
    // v1.2/v1.3 flag classes ALWAYS re-resolve — an absent flag means OFF.
    // (A conditional toggle would leave a stale widget-disabled on a pool node
    // swapped to a plain def: pointer-events:none dead-clicks the card AND
    // makes elementFromPoint report it buried — both found by the §7 audit.)
    el.classList.toggle('widget-selected', !!(def.selected && this._resolve(def.selected.bind, data)));
    el.classList.toggle('widget-disabled', !!(def.disabled && this._resolve(def.disabled.bind, data)));
    el.classList.toggle('widget-muted', !!def.muted);
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

  // ── §6.4 Widget inspector (v2.19.12, dev tool) — console bridge, no DOM ──
  // Spec: for any card currently on screen, show which layout, which skin, and
  // which data bindings produced it ("the UI equivalent of browser devtools'
  // element inspector"). Installs window.__WIDGET_DEBUG__ ONCE (idempotent, same
  // pattern as GameLogSystem.installInspector) and sweeps the CLASS-level
  // registry: screens construct their own renderers, so only WidgetRenderer
  // _all can enumerate every live card without knowing who owns which one.
  // "Live" = connected + laid out (getClientRects) — hides parked surplus pool
  // nodes and cards inside hidden overlays automatically.
  static installInspector() {
    if (typeof window === 'undefined' || window.__WIDGET_DEBUG__) return;
    const live = (el) => el.isConnected && el.getClientRects().length > 0;
    window.__WIDGET_DEBUG__ = {
      /** Every live pooled card across every renderer instance. */
      list() {
        const out = [];
        for (const R of WidgetRenderer._all) {
          for (const [el, def] of R._instanceDef) {
            if (!live(el)) continue;
            out.push({
              el,
              def: {
                template: def.template, layout: def.layout, size: def.size,
                skinId: def.skinId || null, _v: def._v || null,
                slots: Object.keys(def.slots || {}),
              },
              onClick: def.onClick ? { emit: def.onClick.emit } : null,
              data: R._instanceData.get(el),
            });
          }
        }
        return out;
      },
      /** Full introspection for one card element (the devtools-style view). */
      inspect(el) {
        let owner = null;
        let def = null;
        let data = null;
        for (const R of WidgetRenderer._all) {
          if (R._instanceDef.has(el)) {
            owner = R; def = R._instanceDef.get(el); data = R._instanceData.get(el);
            break;
          }
        }
        if (!def) return null;
        const rect = el.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return {
          def: JSON.parse(JSON.stringify(def)),
          data,
          selected: el.classList.contains('widget-selected'),
          disabled: owner._instanceDisabled.get(el) === true,
          onClick: def.onClick
            ? {
                emit: def.onClick.emit,
                payload: Object.fromEntries(Object.entries(def.onClick.payload || {}).map(([k, tpl]) => {
                  if (typeof tpl !== 'string') return [k, tpl];
                  const resolved = tpl.replace(/\{\{([^}]+)\}\}/g, (_, p) => {
                    const v = String(p).trim().split('.').reduce((o, k2) => (o == null ? undefined : o[k2]), data);
                    return v === undefined || v === null ? '' : String(v);
                  });
                  return [k, resolved];
                })),
              }
            : null,
          geometry: { rects: el.getClientRects().length, rect: live(el) ? rect.toJSON() : null },
          clickable: def.onClick ? (hit === el || (!!hit && el.contains(hit))) : undefined,
        };
      },
      /** §7.2 occlusion audit across every live interactive instance.
       *  v2.19.16: adds the `clipped` category — full-rect vs viewport edges
       *  (±1px), reporting per-edge overflow px. Center-only checks missed
       *  partial clipping, and a center-outside partially-visible card was
       *  misread as simply absent. Taxonomy now matches the occlusion suite. */
      occlusion() {
        const flagged = [];
        const clipped = [];
        let checked = 0;
        for (const R of WidgetRenderer._all) {
          for (const inst of R._instances) {
            const el = inst.el;
            if (!live(el)) continue;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) continue;
            if (r.left >= window.innerWidth || r.top >= window.innerHeight ||
                r.right <= 0 || r.bottom <= 0) continue; // fully outside = not on screen
            const over = {
              left: r.left < -1 ? Math.round(-r.left) : 0,
              top: r.top < -1 ? Math.round(-r.top) : 0,
              right: r.right > window.innerWidth + 1 ? Math.round(r.right - window.innerWidth) : 0,
              bottom: r.bottom > window.innerHeight + 1 ? Math.round(r.bottom - window.innerHeight) : 0,
            };
            if (over.left || over.top || over.right || over.bottom) {
              clipped.push({ el, emit: inst.def.onClick?.emit || null,
                overflow: Object.fromEntries(Object.entries(over).filter(([, v]) => v)) });
              continue; // clickability at an off-viewport center is meaningless
            }
            checked++;
            const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            if (hit !== el && !(hit && el.contains(hit))) {
              flagged.push({
                emit: inst.def.onClick?.emit || '(unnamed)',
                coveredBy: hit ? (hit.id ? '#' + hit.id : hit.className || hit.tagName) : '(nothing — off-viewport?)',
                rect: { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
              });
            }
          }
        }
        return { checked, flagged, clipped };
      },
    };
  }

  _forget(el) {
    this._instanceData.delete(el); // v1.1.1
    this._instanceDef.delete(el);  // v1.2
    this._instanceDisabled.delete(el); // v1.3
    for (const inst of this._instances) {
      if (inst.el === el) this._instances.delete(inst);
    }
  }
}

// Environment bridges — same dual-world pattern as conditionEngine.js/npcSystem.js.
if (typeof globalThis !== 'undefined') globalThis.WidgetRenderer = WidgetRenderer;
if (typeof module !== 'undefined' && module.exports) module.exports = WidgetRenderer;
