# Carve round 3, team T4a (conflict): exile, tribunal

Read first:
- the round-2 section of `carve-decisions.md` (R2-D1 to R2-D24);
- the T4a part of `challenge-round2.md`.

Rules:
- This round T4a may edit `mechanics/shared/src/conflict.ts` for R2-D18 only: moving its own local
  APIs there with the shapes they have now. Nothing else in shared, the core or the testkit.
  Recompute the fingerprint in `test/mechanics/shared-frozen.test.ts`, and give the reason in its
  comment.
- Line numbers are those of the review (commit `91408d5`).

## Done by the integrator (check, do not redo)

- **Request 4 and later item 8 (R2-D2).** The host hands an absent slice `{}` at version 0, so the
  06a-01 file (no `world.tribunal`) resumes when the migrations accept `{}`.
- **Request 5, the core part (R2-D13).** Lock handlers count in `ctx.access.open`. The
  `submitSolution` gate lock itself is T3's (round-3 T3 must-fix 2).
- **Later item 5 and request 7: one notion of exile (R2-D20).** A holdout strike is exile for the
  tribunal and the seal too. This is intended; no fix.

## Decisions that affect T4a

| Decision | What T4a does |
|---|---|
| R2-D17 mapping | `tribunal.with(story.tribunal)`; the `scheduleTribunal` offer is a lock handler on `TribunalViewApi.schedulingWindow` and a director in the city |
| R2-D18 extras | move `ExileApi.gates`, `exiled`, `ransomed`, `TribunalApi.text`, `bequestPerHeir` and `TribunalViewApi` into shared; pin the real heads |
| R2-D2 absent slices | the version-0 migrations of exile and tribunal accept `{}` |
| R2-D23 mutants | the gate below |

## Must-fix

1. **`TribunalViewApi` has a reader** (must-fix 1, `mechanics/tribunal/src/view-api.ts`).
   - Move it into shared (R2-D18).
   - Provide it with `kit.provide`, and expose its `stop` and the gamemaker's tribunal section as
     facts.
   - Prove the facts against old `arena.ts:335-338` (the stop reason) and `situation.ts:264-294`
     (the section).
   - Write the `scheduleTribunal` offer (old gamemaker.ts:281, `#mayScheduleTribunal`) as a lock
     handler and test it both ways.
   - The arena's stop rule reads `stop` in step 18. The fact must exist and match now.
   - Scenario: Act II reaches its exile target and the stop reason is "target reached".
2. **Order and payload paths with proof** (must-fix 3).
   - In `world.test.ts`, compare one merged list: events and effects in log order.
   - Keep the goals and seal stand-in records (`world.test.ts:24`, `newEffects`).
   - Add a twin scenario with a will that then closes a gate.
3. **The missing differential scenarios** (must-fix 4).
   - A gate that closes while an ultimatum is due (T4 #4), with the real standoff at minute start 500.
   - The holdout strike against the old `#onStruck` (today only `exile.test.ts:41`).
4. **Resume through the converter** (later item 8).
   - Resume `examples/cityofkeys-act1-06a-04/snapshot-L7.json` through `convertLegacySnapshot`:
     no hand-built slices in `twin.ts:300`.
   - Compare an Act II continuation of the old World and the new host for at least the minutes up to
     the first gate.
   - Resume 06a-01 (no tribunal) as well.
5. **Package pins on the real heads** (later item 10, `packages.test.ts:107`).
   - Pin `exileWorkHead` and `tribunalWorkHead` (or whatever the mechanics load), with
     `uses(exile) == ["seal", "goals", "tribunal"]`.
   - Remove heads nobody loads.

## Gate

Every must-fix has a test that fails on the mutant below. Write the list as
`docs/design/mutants-round3-T4a.json` (`MutationListSchema`; `find` must occur exactly once) and run
`pnpm mutants docs/design/mutants-round3-T4a.json`. Every row must say `killed`.

| Id | Change (review line) | Must be killed by |
|---|---|---|
| T4a-1 | `exiled` emitted after the exile's effects (`gone.ts:66`) | must-fix 2, merged list |
| T4a-2 | goals and seal `onExiled` swapped (`gone.ts:113-114`) | must-fix 2, stand-in records kept |
| T4a-3 | the ransom notice moved before `ransom_paid` (`ransom.ts:43-44`) | must-fix 2 |
| T4a-4 | `last_will` key order changed (`will.ts:89`) | must-fix 2, will scenario |
| T4a-5 | `exiled` written without `will` (`gone.ts:63`) | must-fix 2, will scenario |
| T4a-6 | the `cityCall` fallback boundary `>=` to `>` (`schedule.ts:89`) | a call exactly at the fallback minute |
| T4a-7 | the `informed` filter in `settleDraft` removed (`factions.ts:209`) | a draft with an uninformed resident |
| T4a-8 | legacy draft `cap` default changed to 99 (`slice.ts:178`) | `differential.test.ts:238` with a faction that fills |
| T4a-9 | the "draft refused" status line removed (`status.ts:29`) | a refused draft's status |
| T4a-10 | `stop` in `TribunalViewApi` always undefined | must-fix 1 |
| T4a-11 | the `scheduleTribunal` lock handler always open | must-fix 1 |

The mutants the review saw killed must stay killed:
- burn before keep;
- the `tribunal` random stream offset by one;
- goals dropped from the holdout strike;
- the will cap rounded;
- non-voters not filtered.

The review's scratch script was `t4mut.sh`. Turn its rows into list entries.

## Later (no gate this round)

- Item 6: a legacy gate without prices gets them at the first minute.
- Item 11: `ALREADY_EXILED` on a second seal strike, and duplicate votes kept by the migration.

## Hand-in

- `pnpm check` green.
- The mutant list, and the output of `pnpm mutants`.
- Requests, if any, in `carve-requests-round3-T4a.md`.
