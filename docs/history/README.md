# Papers of the old platform

The design papers and idea papers of the old platform (`docs/design/` and `docs/ideas/` at the tag
[`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final)) that a kept document of this branch cites
(`13-m6-spec.md` 7.2, row 5; issue M6-19). They must outlive the branch `legacy` and the tag, which the owner deletes
after 1.0 (O6). Each was written for the old platform and is evidence, not a description of this one: it is carried
as it was at `v0-final`, with a header that says so, and is on the carry list (`scripts/lib/carried.ts`), so the name
lint does not read it.

The folder keeps the layout of the old `docs/`: the paper `docs/<folder>/<name>.md` of `v0-final` is
`docs/history/<folder>/<name>.md` here, so the links between the carried papers stay as they were written. Every
other relative link of a paper points at its path at `v0-final`. A link of a kept document to a paper at `v0-final`
(class "carried doc" of `scripts/release/links.ts`) is rewritten to this folder by issue M6-28, after O8.

## The papers

| Paper | Cited by |
|---|---|
| [`ideas/tictactoe-teams.md`](ideas/tictactoe-teams.md) | `docs/FINDINGS.md` |
| [`ideas/door-standoff.md`](ideas/door-standoff.md) | `docs/LESSONS-LEARNED.md` (P43) |
| [`ideas/game-roadmap.md`](ideas/game-roadmap.md) | the TSDoc of `mechanics/{chess,econ-lab,lanterns,quarry}` |
| [`ideas/iago.md`](ideas/iago.md) | `games/whispers/src/story.ts` |
| [`ideas/monorepo.md`](ideas/monorepo.md) | `01-architecture.md`, `05-challenge.md`, `games/whispers/src/story.ts` |
| [`ideas/overseers-and-plugins.md`](ideas/overseers-and-plugins.md) | `01-architecture.md`, `04-developer-experience.md`, `05-challenge.md` |
| [`ideas/plugin-market.md`](ideas/plugin-market.md) | `01-architecture.md`, `02-experiment-science.md` |
| [`ideas/istant.md`](ideas/istant.md) | `02-experiment-science.md` |
| [`ideas/tool-naming.md`](ideas/tool-naming.md) | `01-architecture.md`, `03-game-design.md`, `05-challenge.md`, `REWRITE.md` |
| [`design/event-log-signing.md`](design/event-log-signing.md) | `01-architecture.md`, `02-experiment-science.md`, `05-challenge.md`, `docs/ideas/readme-drafts/` |
| [`design/mechanic-api.md`](design/mechanic-api.md) | `04-developer-experience.md`, `docs/ideas/readme-drafts/` |
| [`design/viewer-build.md`](design/viewer-build.md) | `docs/ideas/readme-drafts/` |
| [`design/overseer-api.md`](design/overseer-api.md) | `01-architecture.md`, `04-developer-experience.md`, `oracles/README.md`, `oracles/mechanics/tribunal.md` |
| [`design/grants-auto.md`](design/grants-auto.md) | `04-developer-experience.md` |
| [`design/context-reset.md`](design/context-reset.md) | the TSDoc of `mechanics/strategy-brain` |
| [`design/carve-round2-T4.md`](design/carve-round2-T4.md) | `03-game-design.md` |
| [`design/carve-plan.md`](design/carve-plan.md) | `design/mechanic-api.md` (a link between carried papers) |
| [`design/carve-team-T1.md`](design/carve-team-T1.md) to [`T4`](design/carve-team-T4.md), [`design/core-review-2c.md`](design/core-review-2c.md) | `design/carve-plan.md` (links between carried papers) |

The papers `01` to `05` and `REWRITE.md` are those of `docs/refactoring-before-release/`. Two citations name a group,
not a paper: "`docs/design/carve-*`, `challenge-*`" (`01-architecture.md`, the three review rounds of the carve) and
"`docs/design/mutants-*.json`" (`05-challenge.md`); the papers of those groups that are not in the table above stay
in the bundle of `v0-final` that the owner keeps (7.2, last row).
