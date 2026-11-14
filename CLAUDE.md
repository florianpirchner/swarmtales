# Working on Swarm Tales

Repository rules for every session (human or agent). `AGENTS.md` points here, so every coding agent reads the same
rules. The repository is `florianpirchner/swarmtales`; the owner is Flo.

This is the rewritten `main`. The old platform is on the branch `legacy` (tag `v0-final`), read-only, and is
removed after 1.0. Code comes back from it issue by issue; nothing is copied without an issue.

## Precedence

The rewrite is decided. Read [`docs/refactoring-before-release/DECISIONS.md`](docs/refactoring-before-release/DECISIONS.md)
before you plan anything; its section 9 (A1 to A22) holds the decisions taken while building and wins over the
sections before it. The specification of the milestone you work on (`08-m1-spec.md` for M1, `09-m2-spec.md` for
M2) is what you code against. Order of precedence: `BRIEF.md` (the owner's decisions), then `DECISIONS.md`, then
`REWRITE.md`, then the papers 01 to 06, all in that folder. This file sums them up; where it differs,
`DECISIONS.md` holds. A decision changes only through an issue that brings new evidence (a measurement, a failed
test, a licence fact). Taste is not evidence.

## Vocabulary

Use these words and no synonym. [`docs/GLOSSARY.md`](docs/GLOSSARY.md) has the full list and the retired words; a
name lint in the check rejects the retired ones.

| Term | Meaning |
|---|---|
| Game | what is played; one definition format, one runner. "Story" is only the narrative written from a run |
| Resident | a model actor that plays |
| Mechanic | a rule, packaged as a plugin |
| Director | a model actor that is not a resident |
| Referee | a silent scorer that judges moves against a reference |
| Service | what one mechanic offers to others |
| Event | a notification on the log that others may listen to; preferred over a service call for reactions |
| Tick | logical time in kernel and log; a game labels it |
| Experiment | arms, seeds and repetitions over a game |
| Human Hand | a person's interventions in a running game, each logged |

## Workflow

- **Issue-driven.** No change without an issue. An issue has an id from the specification of its milestone
  (`M1-07`; the M1 list is section 10.3 of `docs/refactoring-before-release/08-m1-spec.md`), "done when", "allowed
  paths", a "proving test" and the "variable changed" (kernel, frame, prompts or none). Stay inside the allowed
  paths; what you find outside goes into a new issue. GitHub issues mirror the list of each milestone.
- **Issue size.** At most 400 hand-written lines (source plus tests; generated and carried files do not count). A
  larger issue is split before work starts.
- **Who opens an issue.** Any agent, for work of the milestones M0 to M6 that `DECISIONS.md` or `REWRITE.md`
  covers. A new game, a new mechanic idea or anything after 1.0 needs Flo's go.
- **Branches.** Work lands on `develop`; `main` moves only at a milestone, after the milestone review. Until the
  old platform is frozen, the two branches are called `rewrite/develop` and `rewrite/root` (the future root commit
  of `main`); at the switch they become `develop` and `main` (decision A5).
- **Builder plus challenger.** A builder builds an issue on its own branch in its own git worktree, with small
  signed-off commits, and does not push to `develop`. A challenger reviews it in a separate session that did not
  see the builder's reasoning, only the specification and the result, and attacks it with failing cases; builder
  and challenger may run on the same model (decision A1).
- **One integrator merges.** Any number of issues may be built at once. One integrator merges them one at a
  time, in the wave order of the milestone's specification, and runs `pnpm check` after each merge (decision A2,
  which replaces the limit of three open pull requests). Each issue lands as **one squash commit** on `develop`
  whose subject starts with the issue id, for example `M1-07 sdk types: mechanic types, context types`
  (decision A3); the body carries the last two lines of the `pnpm check` summary. The merges have the owner's
  standing approval.
- **One variable at a time.** Kernel first (games, prompts and tool names as they are), then the game frame, then
  prompts. A ported game keeps its prompt texts and tool names byte for byte until its baseline is reproduced.
- **Check.** `pnpm check` must be green before a merge; it needs a full clone (the sign-off check reads the whole
  history). Until GitHub Actions and branch protection are switched on, the recorded result of the local
  `pnpm check` is the proof: in the squash commit, and in the body of a pull request where one is opened. While
  several agents share one machine, a builder runs the tests of what it changed and leaves the full check to the
  integrator. `pnpm install --frozen-lockfile` comes first; Node is the version in
  `.node-version`.
- **Record.** Every merged issue gets a row in [`docs/ISSUE-RECORD.md`](docs/ISSUE-RECORD.md): tokens (input,
  output, cache read, cache write), wall time, changed lines. Work without a record is not allowed; the budget and
  the kill criterion are counted from it.
- **Sign-off.** Every commit carries the `Signed-off-by` line of a person, who certifies the Developer
  Certificate of Origin with it ([`CONTRIBUTING.md`](CONTRIBUTING.md)). A person commits with `git commit -s`.
  An agent session keeps the git identity of its environment (for example `Claude <noreply@anthropic.com>`), so
  the history shows which commits an agent made, and does **not** use `-s`: that would sign off as the agent, and
  a program certifies nothing. The session adds the line of the person who operates it. In Flo's sessions, by his
  standing instruction (decision D15):
  `git commit -m "<message>" --trailer "Signed-off-by: Florian Pirchner <872809+florianpirchner@users.noreply.github.com>"`.
  `pnpm check:signoff` refuses a commit that only an agent identity signed off, and a person's commit that its
  author did not sign off. Never sign off in the name of a person who does not operate your session.
- **Model roles for development.** One model family builds and reviews, by the owner's instruction of
  2026-11-14 (decision A1); it replaces the split of roles by model in `BRIEF.md`. Independence comes from the
  separate session of the challenger. Never name a model that is used for development (to build or to review the
  platform) in the repository: not in a commit message, in code or in a doc. The one exception is the
  `Co-Authored-By` trailer that a commit must carry. The rule is not about the models that play: the alias table of
  the models package holds a provider's model id, and games, manifests and run reports name the model of a run,
  because that is run configuration.
- **Runtime revision.** A change of how a run plays (when a resident is woken, what stays in its context, how tool
  notices and answers arrive) raises the kernel's revision in the same pull request, adds a row to
  `docs/RUNTIME-REVISIONS.md` and sets the tag `runtime-rN` at the merge commit. The new kernel starts at
  revision 3.

## Limits

Machines enforce them; a limit is never met by moving code next door.

- **Files and functions** (ESLint, in code lines: blank and comment lines do not count): a file has at most 300
  lines, with a warning from 250; a function at most 50; complexity at most 10; a test file at most 600 and a
  function in a test at most 100 (the callback of `describe` is left out).
- **Exceptions** only as a disable comment that names the rule, with a reason and a linked issue:
  `// eslint-disable-next-line <rule> -- <reason>, see #<issue>`. A comment never configures the linter
  (`/* eslint rule: off */`), `@ts-ignore` and `@ts-nocheck` are forbidden, and `@ts-expect-error` outside a test
  needs an issue too. A gate test reads the comments of every file, so an exception cannot switch its own check off.
- **Kernel** at most 1500 code lines; **engine total** (kernel, authoring, turn scheduler, run assembly) at most
  4100. The kernel knows no role word and no game word, in identifiers and in string literals. A pull request that raises the kernel's line count needs an
  issue that names the extension point that was missing.
- **Packages:** at most twelve library packages under `packages/` until three games run (the umbrella package
  `swarmtales` does not count); a folder becomes a package when a second consumer needs it alone. Every package under `packages/` has a row in the layer table; a new package needs an
  issue and a row. The import rules are in [`docs/LAYERS.md`](docs/LAYERS.md): a mechanic never imports the
  kernel, and imports another mechanic only through `/contract` and `/rules`; a relative import never leaves its
  package; code never imports a test file.
- **Workspace shape:** packages live in `packages/`, `mechanics/`, `games/`, `samples/` and `apps/`, with source
  under `src/` and tests in `*.test.ts` files or under `test/`. A new package is referenced in the root
  `tsconfig.json`; a package under `packages/` or `mechanics/` has a `build` and an `api` script and a committed
  API report.
- **A gate never passes on nothing.** A check that reads files fails when it finds none where some must be; a
  new gate comes with a test that shows it failing.
- **Check budget:** `pnpm check` takes at most 10 minutes and 6 GB; lint runs in a 4 GB heap.
- **README:** the README is the landing page: at most 120 lines, its code block is an include of sample 1,
  findings only when reproduced on this platform. A new game adds a card to `GAMES.md`, never a line to the README.

## Conventions

- Everything in the repository is in English.
- Strict TypeScript: no `any`, no type assertion except `as const`, no double cast. Untrusted input (model
  answers, files, command output) is parsed with Typebox; every Typebox schema carries a `description`.
- Every export has TSDoc (`@param`, `@returns`, `@throws`; `@example` for key APIs). A package's API report
  (`*.api.md`) is committed; `pnpm api:update` rewrites it.
- An error for a developer is an `SwtError` with a code, where, why and fix. No bare `throw new Error` in a package.
- Tests live inside their package and run offline. Never call a live model in a test.
- Every source file starts with `// SPDX-License-Identifier: Apache-2.0`.
- Environment names start with `SWT_`.
- Deep technical docs go under `docs/`. Ideas that are not approved go under `docs/ideas/`.

## Licence

- The project is 100% Apache 2.0: code, prompts, game texts, docs and run data.
- **No GPL and no other copyleft licence anywhere, ever:** not in a dependency (also development, optional and
  transitive ones), not in a tool, an action, a copied file or data. The allowlist and the two exception paths are
  in [`docs/LICENCE-POLICY.md`](docs/LICENCE-POLICY.md); `pnpm check:licences` enforces them.
- A new dependency needs an issue that names its licence. Versions are exact, and every package comes from the
  registry. After a change of the lockfile run `pnpm licences:write` (it asks the registry about the packages of
  other platforms) and commit `THIRD-PARTY-LICENSES.md`. The gate judges every package of the lockfile, not only
  the installed ones.
- A workflow uses only the actions on the list in `scripts/licences/allowlist.ts`, pinned by a full commit id, and
  no container image.
- A copied file lives under `third_party/<name>/` with its licence text and a row in `third_party/manifest.json`.
- If there is doubt about a licence, the answer is no.

## Working with Flo

- Flo writes German. Answer him in German; the repository stays English.
- **Brainstorm before building.** For a new game or a new mechanic, lay out options, trade-offs and open
  questions, and build only after an explicit go. A design reply is not a go. Work that `DECISIONS.md` or
  `REWRITE.md` covers, and engineering chores (docs, merges, fixes), do not need one.
- **Actions outside the repository** that cannot be undone or that cost money need Flo's go each time: deleting,
  publishing, making the repository public, reserving names, sending messages, spending beyond the agreed budget.
  `DECISIONS.md` section 6 lists them (O1 to O13).

## Models, keys and money

- Residents in City of Keys: Claude Haiku via Anthropic. Gamemaker and reporter: DeepSeek V4.1 Flash via
  OpenRouter. Confessor (classifier) and blame judge: Haiku via Anthropic. GLM runs via OpenRouter.
- Keys come from the environment, and only the key broker of the models package holds them (decision A13). It
  reads `SWT_ANTHROPIC_API_KEY` and `SWT_OPENROUTER_API_KEY` first and falls back to the names this environment
  provides today, `ARENA_ANTHROPIC_API_KEY` and `OPENROUTER_API_KEY` (the cloud runtime strips
  `ANTHROPIC_API_KEY`). These two fallbacks are the only environment names without `SWT_`. `process.env` is read
  in one file, `apps/cli/src/env.ts`. Never print, log or commit a key, never ask for one in chat, never put one
  into a workflow secret. Keys never reach a plugin, a prompt or a log.
- Any live test run uses Haiku via Anthropic; keep OpenRouter spending small. No Sonnet or Opus runs before 1.0.
- Live budget of the rewrite: 10 USD through milestone M2, 50 USD in total. A single run stays inside its own
  budget. Each rerun series runs once at its planned seed count; the rerun plan is committed before the first run.
- No large runs (12, 48 or 96 residents) until Act II works with 6 residents.
- Development budget for M0 to M2: 76 issues (decisions A4 and A12), 300 million agent tokens, 750 USD. Twice any of
  these stops the rewrite (kill criterion, `REWRITE.md` section 7).

## After every live run

Every live run of every game is recorded, also a short or stopped one. Nothing from a run is deleted unrecorded.

1. **Run data goes to the data branch `data/runs`** of this repository (decision A15), never into `develop` or
   `main`: an orphan branch with the layout `<game>/<experiment id>/<run>/` and `smoke/` for single runs, with a
   `README.md` that lists the run's loopholes, problems and solutions (what was proposed, what was built, or
   "open"). `develop` holds the index only: a row in the game's runs index (`games/<name>/RUNS.md`) with the run's
   runtime revision. Replace local absolute paths with repository paths. An agent does not push the branch. The
   data repository `swarmtales-runs` stays the owner's open point for the release (M6); the branch then moves there.
2. **Report.** The facts table of a run report is computed in code from the metrics that mechanics export, with
   "absent" instead of zero. A model writes only the loophole candidates, in a section marked unverified. A human
   or agent reviews the draft, verifies suspicious claims against the log and corrects it.
3. **Lessons.** Every problem and every new way around a game's intent goes into the log in
   `docs/LESSONS-LEARNED.md`, as a `P` (problem) or `LH` (loophole) row: what happened, the run it was seen in, its
   effect, what was proposed, what was built and its status. Update the rows when a fix lands, and add a line to
   the design checklist when a lesson holds beyond one game. Do this in the same pull request as the fix, without
   being asked.
4. **Findings.** A finding enters the README or `GAMES.md` only when it is reproduced on this platform, with n,
   standard error and a link.
5. Send Flo a short German summary: result, cost, the drama, new loopholes, proposals for the next version
   (proposals only, see "Brainstorm before building").
