# Working on Swarm Tales

Repository rules for every session (human or agent). `AGENTS.md` points here, so every coding agent
reads the same rules. See "Coding rules" in `docs/HOW-IT-WORKS.md` and `docs/ARCHITECTURE.md` for
code conventions.

The repository is `florianpirchner/swarmtales` (it started as `agent-arena`; that repository is no
longer worked on). The owner is Flo.

## Conventions

- Everything in the repository is in English.
- The README is the overview of the platform for a first-time reader: what it is, the building
  blocks (mechanics, overseers, residents), the shipped stories as references only, how to install
  and run, the honest limits. Deep technical docs go under `docs/` and are linked from its "For
  builders" section. Ideas that are not approved yet go under `docs/ideas/`.
- Strict TypeScript: no `any`, no double casts. Untrusted input (model answers, files) is parsed
  with Typebox.
- Before designing a new story or mechanic, read the design checklist in `docs/LESSONS-LEARNED.md`.
- Stories are written in the TypeScript builder DSL (`packages/sdk/src/`) or as YAML or JSON files; both
  are checked against the story schema (`story.schema.json`, `docs/STORY-FORMAT.md`). A registered story
  lives in its own folder `stories/<name>/` (`story.ts` plus a short `README.md`) and is listed in
  `stories/index.ts`; a YAML story is played by path (`swt run --story <file>`). After a change of
  `packages/contracts/src/story-schema.ts`, run `swt story schema` and commit `story.schema.json`.
- `pnpm check` (typecheck, lint, package rules, knip, test, validate, build, smoke) must be green before a push. Tests run offline;
  never call live models in tests.
- Big refactors: a builder agent writes, a challenger agent reviews.

## Working with Flo

- Flo writes German. Answer him in German; the repository stays English.
- **Brainstorm before building.** For story or game-mechanic ideas, lay out options, trade-offs and
  open questions, and build only after an explicit go ("leg los", "bau das", "implementiere das").
  A design reply is not a go. Engineering chores (reporter, docs, merges, fixes) do not need one.
- **Merging:** every change goes through a PR; never push straight to `main`. GitHub Actions is
  disabled, so run `pnpm check` locally, say in the PR body that CI did not run, then squash-merge
  yourself (standing approval) and report.
- Actions that cannot be undone outside the repository (deleting, publishing, sending messages,
  spending beyond a normal run) still need Flo's go.

## Models, keys and money

- Competitors in cityofkeys: Claude Haiku via Anthropic (`--provider anthropic`). Gamemaker and
  reporter: DeepSeek V4.1 Flash via OpenRouter. Classifier and blame judge: Haiku via Anthropic.
  GLM runs via OpenRouter.
- Keys come from the environment: `ARENA_ANTHROPIC_API_KEY` (the cloud runtime strips
  `ANTHROPIC_API_KEY`) and `OPENROUTER_API_KEY`. Never print, log or commit a key, and never ask for
  one in chat.
- Any live test run uses Haiku via Anthropic (Flo has promo credit there); keep OpenRouter spending
  small. A 6-agent Act II run costs about 0.3-0.5 USD.
- No large runs (12, 48 or 96 agents) until Act II works with 6 agents. Planned scale: a fresh
  Act I with 48 or 96 agents (a multiple of 6), checkpoints after Act I and Act II, about half left
  for Acts III and IV.

## After every live run

Every live run of every story is recorded, also a short or stopped one: it goes into the
repository under `stories/<name>/runs/<run>/` (or the `examples/` place below) with a `README.md`
that lists the run's **loopholes**, **problems** and **solutions** (what was proposed, what was
built, or "open"), and a row in that story's runs index (`stories/<name>/runs/README.md`). Nothing
from a run is deleted unrecorded.

1. The run reporter writes a first-draft `<run>/REPORT.md` automatically (header and result
   table computed in code; **digest highlights**, **problems**, **optimizations** and loophole
   candidates written by a model, each citing `#seq` evidence; `pnpm report:run <run-dir>` rewrites
   it). A human or agent reviews the draft, verifies suspicious claims against `events.jsonl`,
   corrects it and turns it into the run report.
2. **Lessons:** every problem and every new way around the story's intent (check the draft's
   loophole candidates) goes into the log in `docs/LESSONS-LEARNED.md`, as a `P` (problem) or `LH`
   (loophole) row: what happened, the run it was seen in, its effect, what was proposed, what was
   actually built (even when it differs from the proposal) and its status. Update the rows when a
   fix lands, and add a line to the design checklist when a lesson holds beyond one story. Do this
   in the same PR as the run data or the fix, without being asked.
3. Act II runs resume from the Act I checkpoint of their agent count (the 6-agent base is
   `examples/cityofkeys-act1-06a-04/snapshot-L7.json`, with names and the first cast; v01-v04 used `examples/cityofkeys-act1-06a-01/`, v05-v07 `examples/cityofkeys-act1-06a-02/`, v08-v11 `examples/nexus-act1-06a-03/`; old runs and bases not used any more were removed on 2026-10-30 and stay readable at commit `d13350b`) and
   go into `examples/cityofkeys-act2-<NN>a/` (NN = agent count, e.g. `cityofkeys-act2-06a/`, `cityofkeys-act2-12a/`)
   as the next version `vNN-<short-name>/`, with a README in the shape of v01 and a row in the series
   index. A checkpointed act goes into `examples/cityofkeys-act<k>-<NN>a-<run>/`. Replace local absolute
   paths with repository paths.
4. Send Flo a short German summary: result, cost, the drama, new loopholes, proposals for the next
   version (proposals only, see "Brainstorm before building").
