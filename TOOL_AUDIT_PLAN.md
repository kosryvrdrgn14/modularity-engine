# Tool Reliability Audit Plan

Created September 6, 2026, after a session in which basic search/file actions
burned ~15 tool calls hunting one bug. Purpose: establish, with reproducible
probes, which tools can be trusted — so future sessions skip straight to the
reliable path instead of re-learning it the hard way.

## Verdict scale

- **TRUSTED** — no faults observed across many uses; default choice.
- **CAUTION** — works but with a known quirk; use with the documented guard.
- **UNTRUSTED** — demonstrated fault; bypass with the listed substitute.
- **UNTESTED** — no session evidence either way; run its probe before relying on it.

## Inventory and current verdicts (from session evidence, Sep 5–6 2026)

| Tool | Verdict | Evidence |
|---|---|---|
| `read_files` | **TRUSTED** | Dozens of calls incl. offset/limit windows; content, line counts, and totals always correct. |
| `list_directory` | **TRUSTED** | Both calls returned complete, correct listings. |
| `write_todos` | **TRUSTED** | State survived multiple user interruptions and session restarts. |
| `run_terminal_command` | **TRUSTED** | Correct output and exit codes. Note: git commands are platform-blocked by design ("Vly manages version control") — not a fault. |
| `str_replace` | **CAUTION** | T5 (Sep 6) confirmed mixed semantics: in a multi-replacement call, a non-matching oldString is *skipped with a report* while the others still apply — verify the report, never assume all-or-nothing. All matches must be exact incl. whitespace. |
| `write_file` | **TRUSTED** | T6 (Sep 6): exact round-trip on scratch file; `str_replace` matched its content byte-for-byte. |
| `glob` | **CAUTION** | T3 (Sep 6) passed cleanly (8/8 `.js`, 21/21 `.json`, matching `ls`/`find` exactly), but earlier the same session `archive*/**` returned 1 file for a folder holding 87 and `**/archive*/**` returned 0 for a folder holding ~117. Faults are real but intermittent; for critical enumerations use `find` via terminal. |
| `code_search` | **UNTRUSTED** | T1 (Sep 6) FAIL: pattern `"class GameState"` scoped to `public/engine` returned root config files and built-bundle content. T2 FAIL: content from gitignored `dist/` (89 files) appeared in results despite docs claiming `.gitignore` is honored. Also ignored `cwd` repeatedly during Sep 5–6 work. Substitute: `rg` via terminal with explicit `--glob`/`-g` scoping. |

Secondary tools (`web_search`, `read_url`, `ask_user`, `suggest_followups`,
`gravity_index`, `render_ui`) are out of scope for this project's daily loop;
audit only if a task starts relying on them.

## Probe recipes

Run in order in one sitting (~10 commands). Record results in the table
below and update KNOWLEDGE.md if any verdict changes.

- **T1 — code_search scope:** `pattern: "class GameState"`, `cwd: "public/engine"`.
  PASS = hits only in `public/engine/core.js`. Any hit outside that path = FAIL.
- **T2 — code_search gitignore:** search a string known to exist only in the
  built bundle (e.g. a minified `react-dom` fragment).
  PASS = zero hits under `dist/`. Any dist hit = FAIL (confirms docs lie).
- **T3 — glob recursion:** `glob public/engine/*.js` vs `ls public/engine`;
  then `glob public/**/*.json` vs `find public -name "*.json" | wc -l`.
  PASS = counts identical. Mismatch = FAIL.
- **T4 — read_files offsets:** read 10 lines at a known offset N; diff against
  `sed -n 'N,(N+9)p'` of the same file. PASS = identical.
- **T5 — str_replace semantics:** on a scratch file, one valid + one
  intentionally-invalid replacement in a single call. Expect: valid applied,
  invalid reported as skipped, file otherwise intact. Any other outcome = FAIL.
- **T6 — write_file round-trip:** write scratch file, read back, byte-compare
  (`cmp`). PASS = identical. Delete scratch file after.
- **T7 — run_terminal_command:** `echo ok` (exit 0) plus one command that must
  fail (`false`), confirming exit codes propagate. PASS = both reported honestly.
- **T8 — write_todos persistence:** write 2 items, complete 1, rewrite the list;
  confirm nothing is dropped or reordered silently.

## Results

| Probe | Date | Result |
|---|---|---|
| T1 | Sep 6, 2026 | **FAIL** — `"class GameState"` with `cwd: public/engine` returned `vite.config.ts`, `vly-toolbar-readonly.tsx`, and dist bundle content; output also truncated from context bloat. |
| T2 | Sep 6, 2026 | **FAIL** — gitignored `dist/` content observed in search output during the BUG-024 audit (same session). |
| T3 | Sep 6, 2026 | **PASS today** — 8/8 and 21/21 exactly. Earlier same-session archive-pattern failures (1 vs 87, 0 vs 117) remain unexplained → verdict stays CAUTION, not TRUSTED. |
| T4 | Sep 6, 2026 | **PASS** — `read_files` window (game.js 120-129) byte-identical to `sed` ground truth. |
| T5 | Sep 6, 2026 | **PASS** — invalid oldString skipped with explicit notice; valid replacement in the same call applied; file otherwise intact. |
| T6 | Sep 6, 2026 | **PASS** — scratch file round-tripped exactly (`cat` match); scratch deleted after. |
| T7 | Sep 6, 2026 | **PASS** — `echo ok` exit 0; `false` reported as exit 1 honestly. |
| T8 | Sep 6, 2026 | **PASS** — todo state survived multiple user interruptions and session restarts during Sep 5–6 work (verified on every resume). |

## Standing workflow rules (in effect NOW, regardless of audit outcome)

1. Scoped code lookups go to terminal `rg` first (`rg -n "pattern" public/engine`).
   `code_search` is allowed only for fuzzy, project-wide discovery where noise is tolerable.
2. File discovery/enumeration goes to `find`/`ls`; `glob` is not trusted for recursive patterns.
3. `read_files` + `list_directory` are the backbone for known paths — prefer them over any search.
4. Every search that smells wrong gets exactly one diagnosis, then switches to the
   reliable path (KNOWLEDGE.md §14). No retry loops.
5. Known pollution sources so far: `dist/` (gitignored but still leaking into search),
   root-level docs. After archives were emptied, these were the only remaining sources.
