// ============================================================
// TimeService — event-driven in-game calendar (calendar_time_system_spec.md).
//
// Engine is calendar-AGNOSTIC: months/seasons/biomes/modifiers all come from
// content/calendar.json; a bespoke fantasy calendar is a content edit.
//
// Locked rules (spec §0):
//   • Event-driven days, NEVER wall-clock. No offline simulation.
//   • Season resolution order: event modifiers (first-match-wins on
//     seasonOverride — same ordering convention as locationRules) → region
//     biome schedule → seasons.default.
//   • Festivals STACK (union across all passing modifiers); seasons do not.
//   • currentDay is the single source of truth (persistent.time, store v7).
//   • All writes via the typed GameManager.advanceDay() — POT-012 clean.
// ============================================================

class TimeService {
  constructor(deps = {}) {
    this.gameManager = deps.gameManager || null; // store resolved per call
    this.content = deps.content || null;         // dataManager.calendar
    this.eventBus = deps.eventBus || null;
    this._unknownRegionsLogged = new Set();      // fail-soft, but loud once
  }

  // ── state (store-resolved per call — BUG-026 class) ──

  _timeState() {
    const store = this.gameManager?.store;
    if (!store?.persistent) return null;
    if (!store.persistent.time) {
      store.persistent.time = { currentDay: 1, skipLog: [] };
    }
    return store.persistent.time;
  }

  getCurrentDay() {
    const t = this._timeState();
    return t ? (t.currentDay || 1) : 1;
  }

  // ── calendar arithmetic (all from content — no engine assumptions) ──

  _calendar() {
    return this.content?.calendar || null;
  }

  getTotalDaysPerYear() {
    const cal = this._calendar();
    if (!cal || !Array.isArray(cal.months) || cal.months.length === 0) return 360;
    return cal.months.reduce((sum, m) => sum + (Number.isFinite(m.days) ? m.days : 0), 0) || 360;
  }

  _monthForDay(day) {
    const cal = this._calendar();
    if (!cal || !Array.isArray(cal.months) || cal.months.length === 0) {
      return { id: null, index: 0, dayOfMonth: day, daysInMonth: 0 };
    }
    let d = (day - 1) % this.getTotalDaysPerYear();
    for (let i = 0; i < cal.months.length; i++) {
      const len = cal.months[i].days;
      if (d < len) {
        return { id: cal.months[i].id, index: i, dayOfMonth: d + 1, daysInMonth: len };
      }
      d -= len;
    }
    // Only reachable if every month reported <= 0 days — clamp to the last.
    const last = cal.months[cal.months.length - 1];
    return { id: last.id, index: cal.months.length - 1, dayOfMonth: 1, daysInMonth: last.days };
  }

  _weekdayForDay(day) {
    const cal = this._calendar();
    if (!cal || !Array.isArray(cal.weekdayNames) || !Number.isFinite(cal.daysPerWeek)) return null;
    const names = cal.weekdayNames;
    if (!names.length) return null;
    return names[(day - 1) % Math.min(cal.daysPerWeek, names.length)];
  }

  // ── season resolution: modifiers → biome schedule → default ──

  getSeason(regionId) {
    const region = regionId || this.gameManager?.store?.world?.currentRegion || null;

    // 1) Event modifiers — first-match-wins on the season FIELD (locked rule:
    //    scan passing modifiers in priority order; the first one that claims
    //    seasonOverride wins; later ones cannot take it back).
    const mods = this.getActiveModifiers();
    for (const m of mods) {
      if (typeof m.seasonOverride === 'string' && m.seasonOverride) return m.seasonOverride;
    }

    // 2) Region biome schedule.
    const biomes = this.content?.regionBiomes || {};
    const scheduleId = region ? (biomes[region] || biomes['region_' + region] || null) : null;
    const schedules = this.content?.seasons?.schedules || {};
    const schedule = scheduleId ? (schedules[scheduleId] || null) : null;

    // 3) Default schedule.
    const fallback = this.content?.seasons?.default || null;
    const chosen = schedule || fallback;
    if (!chosen) return null;

    if (typeof chosen.fixed === 'string') return chosen.fixed;
    if (chosen.byMonth) {
      const month = this._monthForDay(this.getCurrentDay()).id;
      const s = chosen.byMonth[month];
      if (typeof s === 'string') return s;
      // Unknown month id in byMonth: loud, fail-soft to first entry.
      console.error(`[TIME] byMonth has no entry for month "${month}" — failing soft to first season`);
      const first = Object.values(chosen.byMonth)[0];
      return typeof first === 'string' ? first : null;
    }
    return null;
  }

  getFestivals() {
    const out = [];
    const seen = new Set();
    for (const m of this.getActiveModifiers()) {
      if (Array.isArray(m.festivals)) {
        for (const f of m.festivals) {
          if (typeof f === 'string' && !seen.has(f)) { seen.add(f); out.push(f); }
        }
  }
    }
    return out;
  }

  // ── modifiers: stateless — active when their `when` passes ──

  getActiveModifiers() {
    const mods = Array.isArray(this.content?.eventModifiers) ? this.content.eventModifiers : [];
    const gm = this.gameManager;
    if (!gm) return [];
    const out = [];
    for (const m of mods) {
      if (!m || typeof m !== 'object' || !m.id) continue;
      if (m.when == null) { out.push(m); continue; } // unconditional modifier
      const problems = gm.conditionEngine?.validate
        ? gm.conditionEngine.validate(m.when, `calendar.eventModifiers[${m.id}]`)
        : ['no condition engine'];
      if (problems.length) {
        console.error(`[TIME] modifier "${m.id}" rejected: ${problems.join('; ')}`);
        continue; // fail-closed for THIS modifier; keep scanning
      }
      if (gm.evaluateCondition(m.when)) out.push(m);
    }
    return out;
  }

  getDateContext(day) {
    const d = Number.isFinite(day) ? day : this.getCurrentDay();
    return {
      day: d,
      season: this.getSeason(),
      festivals: this.getFestivals(),
      label: this.getDateLabel(d),
    };
  }

  /** "Day 34, Emberfall (marketday)" — year implicit via day number. */
  getDateLabel(day) {
    const d = Number.isFinite(day) ? day : this.getCurrentDay();
    const cal = this._calendar();
    const m = this._monthForDay(d);
    if (!m.id) return `Day ${d}`;
    const wd = this._weekdayForDay(d);
    return wd ? `Day ${d}, ${m.id} (${wd})` : `Day ${d}, ${m.id}`;
  }

  /** Describe an arbitrary day WITHOUT live state (no modifiers, no region):
   *  month/weekday/season from the calendar content only. Used by the export
   *  system and memoryCheckpoint labels for HISTORICAL days — a past day's
   *  season comes from the calendar, not from present-tense event flags. */
  static describeDay(content, day) {
    const ts = new TimeService({ content });
    const m = ts._monthForDay(day);
    const byMonth = content?.seasons?.default?.byMonth;
    const season = (byMonth && typeof byMonth[m.id] === 'string') ? byMonth[m.id] : null;
    return { day, monthId: m.id, dayOfMonth: m.dayOfMonth, weekday: ts._weekdayForDay(day), seasonDefault: season };
  }

  // ── advancement — THE typed write path (also mirrored on GameManager) ──

  advanceDay(days, source) {
    const t = this._timeState();
    if (!t) {
      console.error('[TIME] advanceDay rejected: no persistent.time branch');
      return null;
    }
    const n = Number(days);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      console.error(`[TIME] advanceDay rejected: days must be a non-negative integer, got`, days);
      return null;
    }
    if (typeof source !== 'string' || !source) {
      console.error('[TIME] advanceDay rejected: source required');
      return null;
    }
    const sources = this.content?.daySources || {};
    let delta;
    let isSkip = false;
    if (Object.prototype.hasOwnProperty.call(sources, source)) {
      delta = sources[source];
    } else {
      // Explicit story skip (or any non-tabulated source) — days are explicit.
      delta = n;
      isSkip = n > 0;
    }
    const from = t.currentDay || 1;
    const to = from + delta;
    t.currentDay = to;
    if (isSkip) {
      t.skipLog.push({ days: delta, source, atDay: from });
      if (t.skipLog.length > 50) t.skipLog.splice(0, t.skipLog.length - 50);
    }
    if (this.eventBus) {
      this.eventBus.emit('time:dayAdvanced', { fromDay: from, toDay: to, source });
    }
    if (this.gameManager && typeof this.gameManager._dirty === 'boolean') {
      this.gameManager._dirty = true;
    }
    return { fromDay: from, toDay: to, source };
  }
}

// Environment bridges — same dual-world pattern as the other systems files.
if (typeof globalThis !== 'undefined') {
  globalThis.TimeService = TimeService;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TimeService };
}
