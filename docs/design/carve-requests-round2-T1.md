# Carve round 2, team T1: requests for the integration owner

Core, `mechanics/shared` and the testkit are unchanged; each request below was met with a local
adapter that the integration owner can drop once the request lands.

## R2-1 Ledger: `LedgerApi.open` and `idempotencyKey`

The ledger mechanic keeps `strictAccounts` off (an unknown account is accepted, not refused with
`UNKNOWN_ACCOUNT`) until `LedgerApi` offers `open` and an `idempotencyKey` on `mint`/`transfer`.
Needed: the shared API gains both; the ledger turns `strictAccounts` on.

## R2-2 Converter and host: absent legacy slices

The host throws `snapshot: no slice for mechanic "X"` when a legacy file lacks the slice of a
mechanic that is in the story (a run without names, or an old snapshot without a whispers slice).
Local adapter: migration 0 of `names` and `whispers` accepts an absent or `{}` slice
(`{version: 0, data: {}}`) and maps it to "off" (names) or "pick the whisperer on resume"
(whispers, flag `fresh`). Needed: the converter/host hands such a mechanic `{version: 0, data: {}}`.

## R2-3 ToolContext: role-presence query (judge order)

The blame tool's old check order has `JUDGE_ABSENT` before the ledger checks, which needs to know
whether a judge exists in the run. A tool context has no role-presence query, so the order of this
one refusal against the others is not provable differentially. Needed: `ctx.roles.has("judge")` or
a `PlayersApi` query.

## R2-4 FactView: API queries

Facts are pure (state, options, minute, residents, log). The fact `whispers.dutyNow` needs the DMs
(channels), the exile state and the puzzles hand-over test. Local adapter: the orders are cached in
state (`now`) and refreshed in every hook that can change them (minute start, turn end, minute
end, turn inputs). Proven equal to the old `whisperDutyNow()` at the end of a full run. Needed (if
wanted): facts may call `uses` APIs, which would make the cache unnecessary.

## R2-5 `defy` ownership

Whispers declares the `defy` tool and the event `gamemaker_defied` (the old tool lives in the
whisperer's file). The options `defiance` (every resident may defy) and `direction`
(`--figure-direction`) must be wired by the CLI composition. If channels (T2) or a gamemaker
mechanic should own `defy`, move it; the tests of the whispers mechanic cover the matrix.
The core's owner table (`packages/chronicle/src/log/legacy-owners.ts`) names `channels` for the line
`gamemaker_defied`, so `test/mechanics/packages.test.ts` ("declare only shared events they own")
failed; the only file outside T1's scope that T1 touched is that test, which now lists
`whispers.gamemaker_defied` as a foreign event. Needed: either the owner table says `whispers`, or
`defy` and its event move to channels/gamemaker; then drop the exception.

## R2-6 INVALID_ARGUMENTS text and coercion

The old runner coerced `1.5` to `1` for an integer parameter; the host refuses it with
`INVALID_ARGUMENTS`. The refusal texts also differ. The differential tests avoid such arguments.

## R2-7 Not differential-tested

- `RECEIPT_CARRIES_FRAGMENT` (a receipt of a hand-over DM): needs the real puzzles mechanic; the
  stand-in covers it only by unit tests.
- The `marks` and `names` `taskLine` consumers (the competitor prompt assembly) are the
  progression/channels owners'; the lines are provided and tested against the old text.

## R2-8 `turnInputs` only run with `legacyTurns`

The status parts of the turn inputs (marks, vote, duty) run only when the turn policy is
`legacyTurns`; the default policy (onNews) may give no turns. The golden gates use
`legacyTurns({passesPerMinute, blockSize, activation: "always"})`. The old turn order is a seeded
shuffle, not A01..An, so differential tests derive it from the new run's `turn_started` events.

## Notes

- No exile listener was needed in whispers: nothing in the old exile touches the whisperer.
- Judge order beyond R2-3, ranks (as the old `ranking()`), cast DM answers and the "kept no
  delivery record" refusal are implemented and tested in receipts.
