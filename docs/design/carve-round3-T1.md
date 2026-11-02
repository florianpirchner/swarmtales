# Carve round 3, team T1 (economy): names, ledger, marks, receipts, whispers

Read first:
- the round-2 section of `carve-decisions.md` (R2-D1 to R2-D24);
- the T1 part of `challenge-round2.md`.

Rules:
- Do not edit `mechanics/shared`, the core or the testkit. A gap is a request in
  `carve-requests-round3-T1.md`.
- Channels, petitions, cast and motives belong to T2. T1 tests use them as they are.
- Line numbers are those of the review (commit `91408d5`). Whispers moved in `b4ca0cf`.

## Done by the integrator (check, do not redo)

- Must-fix 1, the `defy` clash (R2-D5): whispers no longer has `defy`, `gamemaker_defied`, the
  `defiance` option or `defies()`. Channels owns them.
  - Later item 6 (`defies()` checked `quota`) went with it. The composition rule tests
    `whisperer.direction` (R2-D5).
- Must-fix 3, old snapshots without names (R2-D2): the host hands an absent slice `{}` at version 0.
  `test/snapshot/legacy-snapshot.test.ts` resumes `cityofkeys-act1-06a-01` with names loaded.
- Later item 7, the order rule (R2-D11): the `turnInputs` hooks of names, ledger, marks, receipts
  and whispers now use `HOOK_ORDER.turnInputs.status`.
- Later item 8, the ledger (R2-D1): `open`, `has` and `idempotencyKey` are done, and `strictAccounts`
  is on.
- Later item 12, the core part (R2-D7): the `TOOL_LOCKED` text is the old one.

## Decisions that affect T1

| Decision | What T1 does |
|---|---|
| R2-D3 roles | blame asks `ctx.roles.has("judge")` first |
| R2-D4 fact queries | `dutyNow` computed in the fact through `view.call(ChannelsApi, …)`; the cache goes |
| R2-D7 locked tools | the whispers differential grants as `storyToolNames` does; the normaliser goes |
| R2-D11 order rule | `whispers:minuteEnded` is pending; it goes with the cache (or takes a slot) |
| R2-D12 `quoteDms` | receipts keeps the option; it is the only one |
| R2-D14 DM text | "kept no delivery record" reachable; differential with an old DM without text |
| R2-D17 mapping | `names.announcement` has no default; `names.reserved` as in the table |

## Must-fix

1. **Blame without a judge** (`mechanics/receipts/src/blame-tool.ts:141-144`).
   - Before the city's checks and `reject()`, answer
     `refuse("JUDGE_ABSENT", ctx.prompt("replies/judge-absent", {}))` when
     `!ctx.roles.has("judge")`.
   - Old blame.ts:20. Scenario: `blame(77, A02, 2)` with no judge gives
     `true|JUDGE_ABSENT: the city's judge is absent`, with no burn and no board record.
2. **Differentials on real channels and exile.**
   - Replace the stand-in `test/mechanics/t1/channels.ts` in the blame and duty differentials with
     `@swarmtales/mechanic-channels`, and use real exile wherever the gate is meant.
   - Include a blame after a legacy resume (the stand-in's migration sets `dms: []`, `channels.ts:193`).
3. **`dutyNow` computed live** (`mechanics/whispers/src/duty-notice.ts:88-90`, `index.ts:94-101`).
   - The fact computes the duty from `ChannelsApi` queries (R2-D4). Drop `state.now`, the
     `turnEnded` and `minuteEnded` refreshes, and `whispers:minuteEnded` from `PENDING` in
     `test/mechanics/round2-shared.test.ts`.
   - Scenario: a holdout strike at order 800 shows in `dutyNow` in the same turn (challenge item 11).
4. **`names.announcement` without a default** (`mechanics/names/src/index.ts:35`).
   - Make the option required when names is loaded, and pass the text in every test story.
   - Pin with a test that a story without it fails at load, not silently.
5. **Locked tools in the whispers differential** (`test/mechanics/whispers/whispers-differential.test.ts:72-75`).
   - Grant what `storyToolNames` grants and drop the normaliser.
   - The old "Tool X not found" is not the host's concern (R2-D7).
6. **"Kept no delivery record"** (`mechanics/receipts/src/blame.ts:177`, `:198`).
   - Once T2 stops coercing the text, a DM without `text` must answer "kept no delivery record".
   - The `dm?.text !== undefined` fall-through must not misread a clashing board post.
   - Prove both with a differential that uses an old DM record without text. Until T2 lands, use a
     channels slice with such a record.

## Gate

Every must-fix has a test that fails on the mutant below. Write the list as
`docs/design/mutants-round3-T1.json` in the testkit format (`MutationListSchema`:
`{ id, file, find, replace, tests }`, `find` must occur exactly once) and run
`pnpm mutants docs/design/mutants-round3-T1.json`. Every row must say `killed`.

| Id | File and change (review line) | Must be killed by |
|---|---|---|
| T1-1 | `receipts/src/blame.ts:202` `claim <= deliveredAfter` to `<` | DM #5, then board #6 "never got it" posted before reading |
| T1-2 | `receipts/src/blame.ts:188` group `couldRead` check removed | a group-post claim |
| T1-3 | `receipts/src/blame.ts:180` "claim DM has not reached you yet" removed | a claim that is an undelivered DM |
| T1-4 | `receipts/src/blame-tool.ts:41-49` judge standing shifted (+7 points, rank +1) | the judge's question compared in full (drop the `toMatchObject` at `receipts-differential.test.ts:101`) |
| T1-5 | `receipts/src/issue.ts:36` `RECEIPT_CARRIES_FRAGMENT` removed | a board show of a receipt that quotes a fragment |
| T1-6 | `whispers/src/view.ts:123` `inCity` changed to standing alive | gate residents in the vote and the duty, with real exile |
| T1-7 | `whispers/src/duty-notice.ts:41` exiled-whisperer check removed | a duty notice to an exiled whisperer |
| T1-8 | `whispers/src/index.ts:164` restore minute `-1` dropped | resume of a saved popularity vote |
| T1-9 | `whispers/src/vote.ts:106` single-vote branch | resume of a closed single vote |
| T1-10 | `names/src/index.ts:144` exiled "you are" line | an exiled resident's status line |
| T1-11 | `names/src/book.ts:248` password-piece `keep` | a fragment that looks like an ID |
| T1-12 | blame's `roles.has("judge")` check removed (must-fix 1) | the no-judge scenario |
| T1-13 | the `dutyNow` fact returns the minute-start value (must-fix 3) | the strike-in-turn scenario |
| T1-14 | the "kept no delivery record" branch removed (must-fix 6) | the old DM without text |

The old T1-8 row (`duty.ts:85` `direction.defies`) moved to T2 with `defy`.

The mutants the review saw killed must stay killed. Where the review names their change, add them
to the list:
- ledger L2, L3, L5;
- marks K1-K4;
- names N1, N2, N5;
- receipts M5, M6, M8, M9;
- whispers W4.

## Hand-in

- `pnpm check` green.
- The mutant list, and the output of `pnpm mutants`.
- Requests for the integrator, if any, in `carve-requests-round3-T1.md`.
