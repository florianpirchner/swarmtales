# Rename: "core" of a character becomes "core motive"

Decided by Flo (2026-10-31). In psychology the thing the code called a character's **core** (Big Five base
plus drives) is a **core motive**. The word **core** keeps its other meaning, the kernel layer of the
rewrite (the "new core"), and that meaning does not change.

## Naming

| Kind | Old | New |
|---|---|---|
| Prose | core, cores, character core | core motive, core motives |
| Identifiers | `core`, `cores`, `Core`, `CoresSpec`, `coreOf`, `dealCores`, `renderCore`, `coreLine`, `againstCore`, `whisperer.core`, `story.cores`, `CORE_LEVELS` | `coreMotive`, `coreMotives`, `CoreMotive`, `CoreMotivesSpec`, `coreMotiveOf`, `dealCoreMotives`, `renderCoreMotive`, `coreMotiveLine`, `againstCoreMotive`, `whisperer.coreMotive`, `story.coreMotives`, `CORE_MOTIVE_LEVELS` |
| Module, mechanic, file | `mechanics/cores`, `@swarmtales/mechanic-cores`, mechanic id `cores`, `CoresApi`, `packages/engine/src/cores.ts` | `mechanics/motives`, `@swarmtales/mechanic-motives`, mechanic id `motives`, `MotivesApi`, `packages/engine/src/motives.ts` |
| CLI | `--no-cores` | `--no-core-motives` (`--no-cores` still parses) |
| Prompt id | `gamemaker/replies/private-core` | `gamemaker/replies/private-core-motive` |
| Lab variant | `C-core` | `C-motive` |

## Classification of every hit of the word "core"

### A. Renamed (character sense)

- **Old engine** (`packages/engine`): `Core` type and `cores.ts` (now `motives.ts`), `World.coreOf`, the `#cores`
  field, `CoreTrait`, `CoreDrive`, goals dealing (`againstCore`), events type declarations.
- **Contracts** (`packages/contracts/src/story.ts`): `CoresSpec`, `CoreAxis`, `CoreLevel`, `CORE_LEVELS`, story field
  `cores`, `WhispererSpec.core`, `GoalsSpec.againstCore`. The story DSL (`packages/sdk`: `defineStory`, `validate.ts`
  issue paths, `cast/figures.ts`) follows, and all stories (`stories/cityofkeys`, `stories/whispers`) use
  `coreMotives:`, `whisperer.coreMotive` and `againstCoreMotive`. Every story in the repository was migrated and
  `pnpm validate` accepts them; there is no alias for the old field names (no story outside the repository exists).
- **New mechanic** (`mechanics/motives`): package, id, exports (`motives`, `motivesHead`), options (`CoreMotivesOptions`,
  `whispererCoreMotive`), state, facts (`motives.coreMotives`, `motives.prose`, `motives.lines`), tests.
- **Shared mechanic module**: `MotivesApi` (name `motives`), `HOOK_ORDER.*.motives`. The shared fingerprint in
  `test/mechanics/shared-frozen.test.ts` was updated on purpose, with the integrator's reason: the rename.
- **Chronicle** (readers, reports): `CoreMotiveDealt` schemas, `CoreMotiveTraitSchema`, `CoreMotiveDriveSchema`,
  report and timeline headings ("Core motives"), `cast/*.md` row "Core motive", legacy owner `motives`.
- **Roles, CLI, novelist**: `PromptFacts.coreMotive`, `coreMotiveFact`, casting packs, weaver facts, `--no-core-motives`.
- **Tests, lab, docs**: tests and stand-ins (`motivesStandIn`, `motivesStub`, `twinCoreMotives`), `lab/variants/C-motive.md`
  and the lab prompts, README of the stories, `docs/SPEC.md` (section 19), `HOW-IT-WORKS.md`, `STORY-*.md`,
  `docs/ideas/{v09-drama,fate,iago,novelist}.md`, `docs/design/v09.md`, `docs/design/carve-plan.md` (mechanic names),
  the design checklist line in `docs/LESSONS.md`.

### B. Deliberately left: serialized legacy names (compatibility)

| Name | Where | Why |
|---|---|---|
| event type `core_dealt` | old event schema (`event-schema.ts`), `engine/events.ts`, readers (`chronicle`, `digest`, `sinks`, `transcripts`), `legacy-owners.ts` (`core_dealt: "motives"`), the event the new `motives` mechanic emits | golden files and 12 real run logs carry it; the legacy adapter writes it back byte-equal |
| snapshot key `cores` | `WorldSnapshot.cores` (`world.ts`), `snapshot.ts` schema, `legacy-snapshot.ts` (`cores: "motives"` maps the legacy key to the new slice), the mechanic's version-0 migration (`LegacySlice.cores`) | the five `examples/*/snapshot-L7.json` files must load and convert |
| rng label `"cores"` | `engine/motives.ts`, `mechanics/motives/src/deal.ts` | the seed stream name; renaming it would deal different core motives for the same seed |
| `examples/`, `stories/*/runs/` | run data, logs, snapshots, run READMEs | history; not rewritten |

### C. Deliberately left: model-visible strings pinned by the golden files

The golden files record the gamemaker's report, its system prompt and its token counts. Changing any of these
words changes the golden files, which must stay byte-identical, so they keep the word "core" until the step 18
cut-over (see the decision point in `docs/design/rewrite-status.md`):

- `packages/roles/src/gamemaker/situation.ts`: report line `core: ...` and "Who they are (private: use a resident's core or goal ...)"
- `library/prompts/gamemaker/sections/characters.d{0,8,10}.md` and `library/prompts/gamemaker/roles/director-when.md` (gamemaker system prompt)
- `stories/cityofkeys/story.ts` Act II text "Every resident has a core"
- the privacy regex `CHARACTER` (`cores?`) matches the word in free text written by models; it matches "core motive" as well

Changed although model-visible, because no golden file covers them: `library/prompts/gamemaker/replies/private-core-motive.md`,
`library/prompts/reporter/system.md`, `library/prompts/weaver/system.md`, the lab variants, the novelist pack line, report headings.

### D. Deliberately left: the kernel meaning of "core"

- `packages/kernel`, `packages/contracts/src/core/**`, `packages/testkit`, `packages/prompts/src/keys/core.ts`,
  `library/prompts/replies/core/**`, `test/core`, `test/host/**` (including `core-words.test.ts`)
- `packages/chronicle/src/log/legacy-events.ts`, `legacy-owners.ts` (`"core"` event source and owner, `LEGACY_CORE_TRANSLATORS`),
  `legacy-snapshot.ts` and `prompts/src/lookup.ts` comments ("the new core"), `scripts/check-packages.ts`
- identifiers `defineCoreStory`, `CoreStory*`, `CoreHost`, `CORE_EVENTS`, `CoreEvent*`, `CORE_PROMPTS`, `coreReply`, `kit.core`
- docs about the kernel: `ARCHITECTURE.md`, `design/mechanic-api.md`, `design/core-review-2c.md`, `ideas/monorepo.md` ("slim core")
- third party: `@earendil-works/pi-agent-core`; and words that only contain the letters: score, scoreboard, underscores
- history logs in `docs/design/carve-*`, `challenge-wave3.md` and `docs/LESSONS.md` problem rows keep their wording
  ("cores"); only the directory and file paths in them were updated so links do not break

## Compatibility proof

- `test/golden/**` has an empty diff against the branch point (`git diff 9aeba0e -- test/golden`).
- The five `examples/*/snapshot-L7.json` files load (`test/snapshot/legacy-snapshot.test.ts`, `test/snapshot/v09.test.ts`),
  the 12 real run logs round-trip byte-equal (`test/log/legacy-files.test.ts`), and the new mechanic migrates the
  legacy `cores` field (`test/mechanics/motives/motives.test.ts`, "migrates the dealt core motives from version 0").

## Decision point for step 18

Until the final cut-over the new core writes the legacy names through the adapter: the `motives` mechanic emits
`core_dealt`, the converted snapshot uses the legacy key `cores` as the version-0 slice. At step 18, when `world.ts`
is replaced, rename the event to `motive_dealt` (and the old snapshot key with a version-1 migration), reword the
pinned strings of section C, and update the golden files **once**, deliberately, with the reason "core becomes
core motive". Do not run `GOLDEN_UPDATE` before that.
