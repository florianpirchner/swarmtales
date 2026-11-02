# Carve round 3, team T4b (conflict): seal, standoff-tribunal, standoff

Read first:
- the round-2 section of `carve-decisions.md` (R2-D1 to R2-D24);
- the T4b part of `challenge-round2.md`.

Rules:
- Do not edit `mechanics/shared`, the core or the testkit. A gap is a request in
  `carve-requests-round3-T4b.md`.
- Line numbers are those of the review (commit `91408d5`). Standoff-tribunal and the seal changed
  in `b4ca0cf`.

## Done by the integrator (check, do not redo)

- **Must-fix 1, the core part (R2-D2).** The host hands an absent slice `{}` at version 0, so the
  real Act II base resumes when the seal's, standoff's and holdout's migrations accept `{}`.
- **Must-fix 2, the shared part (R2-D10).** `StandoffTribunalApi.taskLine` is in shared. The local
  `StandoffTribunalTaskApi` and `standoffTribunalWorkHead` are gone, and `standoffTribunalHead`
  provides it. The progression call is T3's.
- **Later item 10, the empty slot (R2-D9).** `HOOK_ORDER.minuteEnded.standoff = 500`. The
  standoff's `minuteEnded` uses it.
- **The seal's act listeners are immediate (R2-D15).** This keeps `LISTENER_ORDER.act_ended`
  meaningful next to the immediate goals. `test/mechanics/seal/support.ts` makes the goals stand-in
  immediate.
- **Later item 11 (R2-D22).** `pnpm test` excludes `.claude/`. Run the gate through `pnpm test` or
  `pnpm mutants`, not a bare vitest.
- **Must-fix 5, the seal's standing port (R2-D20).** One notion of exile is intended: a
  holdout-struck bearer gets no "expired" notice, and a `permaDeath` on it is `ALREADY_EXILED`.
  Document it in the seal's README; no fix.

## Decisions that affect T4b

| Decision | What T4b does |
|---|---|
| R2-D2 absent slices | remove the slice patches from the resume tests |
| R2-D4 fact queries | drop the cached `outstanding`, `unused`, `cityPiecePrice` and the holdout's `lackingNow`; compute them in the facts |
| R2-D17 mapping | `ultimatum` by grant; standoff's `direction` option goes; one author name; standoff-tribunal only with a gamemaker |
| R2-D23 mutants | the gate below |

## Must-fix

1. **Resume the real base without patches** (must-fix 1).
   - Remove the slice patches at `test/mechanics/seal/seal-snapshot.test.ts:59` and
     `test/mechanics/standoff/standoff-snapshot.test.ts:91`.
   - Resume `examples/cityofkeys-act1-06a-04/snapshot-L7.json` through `convertLegacySnapshot` with
     the real seal, standoff and standoff-tribunal.
   - The version-0 migrations accept `{}` as "none".
2. **The ultimatum by grant** (must-fix 3, `mechanics/standoff/src/index.ts:25-30`, `:195`).
   - Remove the `direction` option and its lock.
   - The story grants `ultimatum` to the gamemaker only at direction 10 with `rules.ultimatum`
     (old gamemaker.ts:214, :375).
   - Test that a story without the grant offers no `ultimatum` (`toolSpecs("gamemaker")`) and one
     with it does.
3. **Facts computed live** (R2-D4). Remove the minute-end caches of the standoff and the holdout and
   compute them in the facts with `view.call`. The gamemaker's sections are unchanged.
4. **Old-versus-new scenarios for the unproven paths** (must-fix 4):
   - a seal tie with a seeded draw;
   - a resident and a bearer at the gate during an auction;
   - the seal used on a gate target at `missing = 0`;
   - a holdout call exactly at `cooldownUntil`;
   - a voter who leaves mid-vote;
   - a note refusal for each of `callTribunal`, `announceTribunal` and `permaDeath`: leak, repeat
     (`as: "tribunal"`, number-sensitive), signature strip and length, with the reply text.

   The notes stand-in must stop accepting everything (`test/mechanics/standoff-tribunal/stand-ins.ts:55`).
   Use real channels' `NotesApi`, or a stand-in that runs the old `#checked`.
5. **Differentials through the old `World`** (must-fix 5). `runOld` drives the old World, not
   hand-wired classes (seal `differential.ts:66-152`, holdout `differential.ts:75-209`). Where that
   cannot be done, name the wiring the hand-built side copies and test that wiring separately.
6. **The Standoffs section in the golden** (later item 6). Render the gamemaker's "Standoffs"
   section from the facts and compare it with f10g10 seq 554, 633, 704 and 766.
7. **Holdout ids checked** (later item 8, `slice.ts:89`). Refuse an unknown resident at load, as the
   old `restore` did (holdout.ts:637-645).

## Gate

Every must-fix has a test that fails on the mutant below. Write the list as
`docs/design/mutants-round3-T4b.json` (`MutationListSchema`; `find` must occur exactly once) and run
`pnpm mutants docs/design/mutants-round3-T4b.json`. Every row must say `killed`.

| Id | Change (review line) | Must be killed by |
|---|---|---|
| T4b-1 | the stream in `ctx.rng("seal", seal)` renamed (`seal/src/index.ts:92`) | the seeded tie |
| T4b-2 | `standing === "alive"` dropped (`seal/src/index.ts:108`) | a resident at the gate during an auction |
| T4b-3 | `standing === "exiled"` changed to `"gate"` (`seal/src/index.ts:104`) | a bearer at the gate |
| T4b-4 | the `kind === "alive"` guard dropped (`seal/src/house.ts:166`) | the seal on a gate target at `missing = 0` |
| T4b-5 | `kind !== "alive"` to `kind === "exiled"` (`standoff-tribunal/src/ports.ts:96`) | the holdout status at the gate |
| T4b-6 | the cooldown `<` to `<=` (`standoff-tribunal/src/court.ts:232`) | a call at `cooldownUntil` |
| T4b-7 | the alive filter on voters dropped (`court.ts:159`) | a voter who leaves mid-vote |
| T4b-8 | the notes check skipped in `callTribunal` | the leak refusal |
| T4b-9 | the notes check skipped in `announceTribunal` | the repeat refusal |
| T4b-10 | the notes check skipped in `permaDeath` | the length refusal |
| T4b-11 | the `ultimatum` grant check inverted in the story mapping test | must-fix 2 |
| T4b-12 | the holdout's unknown-id check removed | must-fix 7 |

The mutants the review saw killed must stay killed:
- the `act_ended` order;
- the seal minute order;
- the `holdout-lot` stream label;
- the tie-break by points reversed;
- `taskLine` returning null;
- the dial's `>=`, which becomes the grant test once the dial is gone;
- the `held` part.

## Later (no gate this round)

- Item 7: the holdout golden gate on the real puzzles (`holdout-golden.test.ts:11-13`), and
  `goldenOrder` with the Whispers neighbours.
- Item 9: document in the README that standoff-tribunal needs a gamemaker (R2-D17).

## Hand-in

- `pnpm check` green.
- The mutant list, and the output of `pnpm mutants`.
- Requests, if any, in `carve-requests-round3-T4b.md`.
