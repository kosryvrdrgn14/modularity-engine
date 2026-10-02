# Modularity Engine

A gothic-survival game with a town-hub / combat-run loop: timed expeditions, weapon + companion
builds, drops, and a persistent town where NPCs remember what you did.

**Start with the wiki:** **[`docs/WIKI.md`](docs/WIKI.md)** (agent-friendly map of architecture,
verification, rules and roadmap) — or the rendered site **[`docs/index.html`](docs/index.html)**
(publishable to GitHub Pages from the `docs/` folder). It covers current and future state and is
written to be usable without cloning this repository.

```bash
npm run docs:wiki   # regenerate docs/index.html from docs/WIKI.md (canonical source)
npm run verify      # fast static gate: syntax, content, map contracts, F1/F5/F2, mirrors
npm test            # headless battery (15 suites) — skip-safe
npm run release:check   # release gate: verify + strict battery + changelog hygiene
```

The game itself is plain classic-script JS under `public/`, booted by `public/game2.html`;
`src/` is the Vite/React/Convex shell that hosts it in an iframe.

Authoritative docs: `PROJECT_MAP.md` (file contracts) · `KNOWLEDGE.md` (rules) ·
`WORKFLOW.md` (process + backlog) · `TOOLING_MAP.md` (tools) · `TESTING_PLAN.md` (tests) ·
`MASTER_DESIGN.md` (design) · `CHANGELOG.md` (history).