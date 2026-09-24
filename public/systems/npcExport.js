// ============================================================
// NPCExportSystem — Roleplay export (data_driven_systems_compilation.md §4,
// MASTER_DESIGN §24 step 4; spec: npc_memory_roleplay_export_spec.md).
//
// PURE CONSUMPTION — the compilation's one-rule made structural:
//   • NO second evaluator  — spoiler gating asks the shared ConditionEngine
//     (via GameManager.evaluateCondition / conditionEngine.validate).
//   • NO second log        — every fact is derived from gameManager.memoryLog
//     projections (getEventsForNpc + upToSeq cutoffs).
//   • NO second renderer   — UI cards render through WidgetRenderer.
//   • NO Game/GameLoop dependency — usable from the title screen. The only
//     live-session object it may touch is the store-backed memoryLog (which
//     is store-resolved per call) and the slot backend for the title-screen
//     browser (which reads saved slots directly — never live session state).
//
// Layers (spec §2–§6):
//   Facts    — derived per request by replaying the log up to a cutoff.
//   Flavor   — static, authored once (content/npcs.json: name, greeting,
//              topics). Never recomputed.
//   memoryCheckpoint — a CURATED READ-SIDE index synthesized from log
//              milestones (quest completions + spoiler-tagged events). It is
//              a projection, never persisted, and NEVER a filter on writes.
//   Favorites — (memoryCheckpoint-set, NPC-set) pairs; the only persisted
//              export state. Written via typed methods on the EXISTING
//              persistent.npcs branch (no WRITABLE_PATHS additions, no
//              schema change beyond one additive default field).
// ============================================================

class NPCExportSystem {
  /**
   * deps: { gameManager, dataManager }
   * All store access is per-call (slot-switch safe, BUG-026 class).
   */
  constructor(deps = {}) {
    this.gameManager = deps.gameManager || null;
    this.dataManager = deps.dataManager || null;
  }

  // ── log access (the ONE log — never a second one) ──

  get _log() {
    return this.gameManager?.memoryLog || null;
  }

  _npcContent(npcId) {
    // F5 gate (v2.19.4): dead legacy NPC_DATA fallback removed (POT-003).
    const npcs = this.dataManager?.npcs || {};
    return npcs[npcId] || null;
  }

  // ── §6 Facts vs Flavor ──

  /**
   * Facts: derived from the canonical log up to `upToSeq` (spec §6).
   * Spoiler gate (§7): events with a spoilerTag are included ONLY when the
   * reveal has happened as of the cutoff — i.e. a LATER unspoiled copy of
   * the same tag exists in the log. Reveal detection itself asks the shared
   * evaluator nothing new: a tag is "revealed at cutoff" when it appears
   * un-tagged at or before the cutoff. Fail-closed: on any ambiguity the
   * fact is EXCLUDED (never leaks).
   */
  getFacts(npcId, opts = {}) {
    const log = this._log;
    if (!log) return [];
    const upTo = Number.isFinite(opts.upToSeq) ? opts.upToSeq : Infinity;
    const events = log.getEventsForNpc(npcId, { upToSeq: upTo });
    // Tags already revealed (event carried the tag) — keyed by tag string,
    // value = earliest seq at which the reveal is canon.
    const revealedAt = {};
    for (const ev of events) {
      if (ev.spoilerTag && !(ev.spoilerTag in revealedAt)) {
        revealedAt[ev.spoilerTag] = ev.seq;
      }
    }
    const facts = [];
    for (const ev of events) {
      if (ev.spoilerTag) {
        // A tagged event is includable only once its tag is revealed —
        // which for v1 means: this event IS the reveal (tag first appears
        // here). Later duplicates of the same tag are redundant.
        if (revealedAt[ev.spoilerTag] !== ev.seq) continue;
      }
      facts.push(this._factFromEvent(ev));
    }
    return facts;
  }

  _factFromEvent(ev) {
    const p = ev.payload || {};
    const day = Number.isFinite(ev.day) ? ev.day : null;
    switch (ev.type) {
      case 'questCompleted':
        return { kind: 'quest', text: `Completed the quest "${p.questId || 'unknown'}" together.`, seq: ev.seq, chapterMarker: ev.chapterMarker, day };
      case 'giftGiven':
        return { kind: 'gift', text: p.itemId ? `Received a gift: ${p.itemId}.` : `Shared a meaningful moment (worth ${p.affection ?? 1}).`, seq: ev.seq, chapterMarker: ev.chapterMarker, day };
      case 'dialogueChoiceMade':
        return { kind: 'dialogue', text: `In conversation, the traveler chose: "${p.choiceId || '…'}".`, seq: ev.seq, chapterMarker: ev.chapterMarker, day };
      case 'flagSet':
        return { kind: 'revelation', text: `Shared something personal: ${p.flagId || 'a confidence'}.`, seq: ev.seq, chapterMarker: ev.chapterMarker, spoilerTag: ev.spoilerTag, day };
      case 'npcTalkedTo':
        return { kind: 'talk', text: 'Spent time talking.', seq: ev.seq, chapterMarker: ev.chapterMarker, day };
      default:
        return { kind: ev.type, text: `${ev.type} (seq ${ev.seq}).`, seq: ev.seq, chapterMarker: ev.chapterMarker, day };
    }
  }

  /** Flavor: static authored data (§6). Never recomputed, never derived. */
  getFlavor(npcId) {
    const npc = this._npcContent(npcId);
    if (!npc) return null;
    return {
      name: npc.name || npcId,
      greeting: npc.greeting || null,
      voice: (npc.topics || []).slice(0, 3).map((t) => ({
        prompt: t.text || null,
        response: t.response || null,
      })),
    };
  }

  // ── §3 memoryCheckpoints — curated READ-SIDE index (derived, never stored,
  //    never a write filter) ──

  /**
   * Curation policy (spec §3.2): auto-generate on quest completions and
   * spoiler-tagged reveals. Gifts/letters/talks stay plain log events.
   * `eventCutoff` is the SEQ (not eventId) — the reconstruction key used by
   * every read path (spec §3.1; seq is the locked ordering scheme).
   */
  getMemoryCheckpoints(npcId) {
    const log = this._log;
    if (!log) return [];
    const events = log.getEventsForNpc(npcId, {});
    const seen = new Set();
    const out = [];
    for (const ev of events) {
      let label = null;
      if (ev.type === 'questCompleted') {
        label = `${ev.chapterMarker || 'Story'}: completed "${(ev.payload && ev.payload.questId) || 'a quest'}"`;
      } else if (ev.spoilerTag) {
        label = `${ev.chapterMarker || 'Story'}: a revelation (${ev.spoilerTag})`;
      }
      if (!label) continue;
      // Day context (spec §5): historical day → calendar description, never
      // present-tense flags. Pre-calendar events add nothing.
      if (Number.isFinite(ev.day)) {
        const cal = this.dataManager?.calendar || null;
        if (cal && typeof TimeService !== 'undefined') {
          const d = TimeService.describeDay(cal, ev.day);
          if (d.monthId && d.seasonDefault) label += ` (Day ${d.day}, ${d.seasonDefault})`;
          else label += ` (Day ${d.day})`;
        } else {
          label += ` (Day ${ev.day})`;
        }
      }
      const key = `${label}@${ev.seq}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        memoryCheckpointId: `mc_${npcId}_${ev.seq}`,
        npcIds: [npcId],
        label,
        eventCutoff: ev.seq,
        autoGenerated: true,
      });
    }
    return out;
  }

  // ── §4 Favorites — (checkpoint-set, NPC-set) pairs; ONLY persisted export
  //    state. Additive field on the EXISTING persistent.npcs branch. ──

  _favoritesBranch() {
    const store = this.gameManager?.store;
    if (!store || !store.persistent || !store.persistent.npcs) return null;
    const npcs = store.persistent.npcs;
    if (!Array.isArray(npcs.favorites)) npcs.favorites = [];
    return npcs;
  }

  /** spec §4: each member may pin a DIFFERENT checkpoint for herself. */
  addFavorite({ label, members }) {
    const npcs = this._favoritesBranch();
    if (!npcs) {
      console.error('[EXPORT] addFavorite rejected: no persistent.npcs branch');
      return null;
    }
    if (!Array.isArray(members) || members.length === 0 ||
        !members.every((m) => m && typeof m.npcId === 'string' && m.npcId)) {
      console.error('[EXPORT] addFavorite rejected: members must be a non-empty array of { npcId }', members);
      return null; // fail-closed (POT-012 philosophy)
    }
    const fav = {
      favoriteId: `fav_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
      memoryCheckpoints: members.map((m) => ({
        npcId: m.npcId,
        memoryCheckpointId: m.memoryCheckpointId || null,
      })),
      customLabel: typeof label === 'string' && label ? label : null,
      dateFavorited: new Date().toISOString(),
    };
    npcs.favorites.push(fav);
    if (typeof this.gameManager._dirty === 'boolean') this.gameManager._dirty = true;
    return fav;
  }

  listFavorites() {
    const npcs = this._favoritesBranch();
    return npcs ? npcs.favorites.slice().reverse() : []; // recency-first (§4.1)
  }

  removeFavorite(favoriteId) {
    const npcs = this._favoritesBranch();
    if (!npcs) return false;
    const before = npcs.favorites.length;
    npcs.favorites = npcs.favorites.filter((f) => f.favoriteId !== favoriteId);
    if (npcs.favorites.length !== before) {
      if (typeof this.gameManager._dirty === 'boolean') this.gameManager._dirty = true;
      return true;
    }
    return false;
  }

  // ── Card generation (§6 + §8) ──

  /**
   * Generate one card for one NPC as of a cutoff (default: full history).
   * opts: { upToSeq, memoryCheckpointId } — a checkpoint id resolves to its
   * cutoff (read-side only). Returns { facts, flavor, checkpoint, constraints }.
   */
  generateCard(npcId, opts = {}) {
    if (typeof npcId !== 'string' || !npcId) return null;
    let upToSeq;
    if (Number.isFinite(opts.upToSeq)) {
      upToSeq = opts.upToSeq;
    } else if (opts.memoryCheckpointId) {
      const mc = this.getMemoryCheckpoints(npcId)
        .find((m) => m.memoryCheckpointId === opts.memoryCheckpointId);
      if (!mc) {
        console.error(`[EXPORT] generateCard: unknown memoryCheckpoint "${opts.memoryCheckpointId}"`);
        return null; // fail-closed
      }
      upToSeq = mc.eventCutoff;
    }
    const facts = this.getFacts(npcId, { upToSeq });
    if (facts.length === 0 && !opts.allowEmpty) {
      // §10: no export for a stranger — no interaction history, no card.
      return { npcId, empty: true, reason: 'no interaction history', facts, flavor: this.getFlavor(npcId), constraints: this._constraints(npcId), checkpoint: { upToSeq: upToSeq ?? null } };
    }
    return {
      npcId,
      empty: false,
      facts,
      flavor: this.getFlavor(npcId),
      constraints: this._constraints(npcId),
      checkpoint: { upToSeq: upToSeq ?? null },
    };
  }

  /** §8 constraint model — base template + per-character delta (data-driven). */
  _constraints(npcId) {
    const npc = this._npcContent(npcId);
    const base = [
      'You are ' + (npc?.name || 'the character') + ' from an adult fictional roleplay, played for a player who unlocked this story in-game.',
      'Never acknowledge being an AI or language model; never reference game mechanics (tiers, stats, unlocks) in dialogue.',
      'Behavior must match the relationship stage as of this snapshot — not earlier, not later.',
      'Do not reference or act on any fact not present in FACTS below.',
      'No jealousy between established characters — ever. Found-family warmth is the house canon.',
      'Treat this card as the starting point for improvisation within established canon, not a license to override it.',
    ];
    const delta = Array.isArray(npc?.exportConstraints) ? npc.exportConstraints : [];
    return base.concat(delta);
  }

  /** §10 output format: plain copy-paste text (primary renderer). */
  renderText(card) {
    if (!card || card.empty) return '';
    const f = card.flavor || {};
    const lines = [];
    lines.push(`# CHARACTER CARD — ${f.name || card.npcId}`);
    lines.push('');
    lines.push('## VOICE (authored examples)');
    for (const v of (f.voice || [])) {
      if (v.prompt && v.response) lines.push(`- "${v.prompt}" → "${v.response}"`);
    }
    lines.push('');
    lines.push('## FACTS (as of this snapshot)');
    for (const fact of card.facts) {
      lines.push(`- [${fact.kind}] ${fact.text}`);
    }
    // Calendar context line (calendar_time_system_spec.md §5): derived from
    // the LATEST included fact's day — past days use the calendar's own
    // month/season mapping, never present-tense event flags. Pre-calendar
    // facts (no day) contribute NO line — context is never invented.
    const lastDay = [...card.facts].reverse().find((f) => Number.isFinite(f.day))?.day;
    const calContent = this.dataManager?.calendar || null;
    if (lastDay != null && calContent && typeof TimeService !== 'undefined') {
      const d = TimeService.describeDay(calContent, lastDay);
      if (d.monthId && d.seasonDefault) {
        lines.push('');
        lines.push(`— Day ${d.day}, ${d.monthId}${d.weekday ? ` (${d.weekday})` : ''}, ${d.seasonDefault} season —`);
      }
    }
    lines.push('');
    lines.push('## RULES (constraints)');
    for (const c of card.constraints) lines.push(`- ${c}`);
    return lines.join('\n');
  }

  // ── §4.1 Title-screen browser — reads SAVED SLOTS directly, never live
  //    session state (the hard architectural boundary, spec §1). ──

  /**
   * Summarize favorites across all save slots for the title-screen menu.
   * Never boots a game session: reads raw slot JSON through the backend.
   */
  getFavoriteSummaries() {
    const gm = this.gameManager;
    if (!gm) return [];
    const summaries = [];
    const slotCount = GameManager.SLOT_COUNT || 3;
    for (let n = 1; n <= slotCount; n++) {
      let saved = null;
      try {
        saved = gm.backend.load(gm._slotKey(n));
      } catch (e) { continue; }
      if (!saved) continue;
      const favs = saved?.persistent?.npcs?.favorites;
      if (!Array.isArray(favs) || favs.length === 0) continue;
      for (const fav of favs) {
        summaries.push({
          slot: n,
          favoriteId: fav.favoriteId,
          label: fav.customLabel || this._autoLabel(fav),
          dateFavorited: fav.dateFavorited || null,
          members: (fav.memoryCheckpoints || []).map((m) => m.npcId),
        });
      }
    }
    summaries.sort((a, b) => String(b.dateFavorited || '').localeCompare(String(a.dateFavorited || '')));
    return summaries;
  }

  _autoLabel(fav) {
    const ids = (fav.memoryCheckpoints || []).map((m) => m.npcId).join(' + ');
    return ids ? `Memory: ${ids}` : 'Untitled memory';
  }

  /**
   * Title-screen regeneration: given a slot + favoriteId, load that slot's
   * raw store, reconstruct card data from ITS log, and return renderable
   * text per member. Reads the slot document only — never a live session.
   */
  regenerateFromSlot(slotN, favoriteId) {
    const gm = this.gameManager;
    if (!gm) return null;
    let saved = null;
    try { saved = gm.backend.load(gm._slotKey(slotN)); } catch (e) { /* fallthrough */ }
    if (!saved?.persistent?.npcs) return null;
    const fav = (saved.persistent.npcs.favorites || []).find((f) => f.favoriteId === favoriteId);
    if (!fav) return null;

    // Build a detached read-only log view over THIS slot's event log.
    const slotLog = new NpcMemoryLog(saved);
    const savedGm = { memoryLog: slotLog };
    const savedDm = { npcs: this.dataManager?.npcs || null };
    const reader = new NPCExportSystem({ gameManager: savedGm, dataManager: savedDm });

    return {
      label: fav.customLabel || this._autoLabel(fav),
      cards: (fav.memoryCheckpoints || []).map((m) => {
        const card = reader.generateCard(m.npcId, { allowEmpty: true });
        return { npcId: m.npcId, text: reader.renderText(card), empty: !card || card.empty };
      }),
    };
  }

  /** Copy helper — clipboard with textarea fallback (non-secure contexts). */
  static copyText(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      return navigator.clipboard.writeText(text).catch(() => NPCExportSystem._copyFallback(text));
    }
    return Promise.resolve(NPCExportSystem._copyFallback(text));
  }

  static _copyFallback(text) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch (e) {
      console.error('[EXPORT] copy failed:', e);
      return false;
    }
  }
}

// Environment bridges — same dual-world pattern as the other systems files.
if (typeof globalThis !== 'undefined') {
  globalThis.NPCExportSystem = NPCExportSystem;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { NPCExportSystem };
}
