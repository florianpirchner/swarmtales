# hello-game-001: live smoke of the Hello Game, the cap run of M4 (M4-60)

| Item | Value |
|---|---|
| Game | `games/hello/game.ts`, seed 1, purpose `smoke` |
| Command | `swt run games/hello/game.ts --provider anthropic --model haiku --budget 0.002 --ledger games/m4-ledger.jsonl` |
| Model | `anthropic/haiku`, resolved `claude-haiku-5-5`, thinking medium, output cap 4000, pricing `pi-ai@1.4.0`; residents `ada` (X) and `bob` (O) |
| Code commit | `7ea5ea107090937a4b84de02f64b96aa5c51daf8`, tree clean, runtime revision 4 |
| Cost | 0.0018 USD of the cap 0.002 (17 requests; 66 input, 2025 output, 20403 cache-read, 4601 cache-written tokens) |
| End | tick limit (12), exit code 0; 184 lines. **Not** `models.budget`, which this run was played for |
| Checks | `swt log verify`: ok; `swt replay --game`: equal, 184 lines; `swt scan`: clean, keys of 2 providers held; `REPORT.md` written with `--game` |

## What happened

The same as `smoke/hello-game-001` of the M2 gate (P445). Each resident spends one activation on `viewBoard` and
the next on `playMove`, so the 12 ticks hold 8 of the 9 moves: the last activation is `ada` looking at the board
before move 9 (#180, #181), then the tick limit (#184). Tally 0, 0, 0. No refusal, no failed request, no turn
without a call. The play was sound: `bob` blocks the column 1-4-7 at 7 (#126) and the row 3-4-5 at 5 (#169), the
board after move 8 is a draw for any last move. One slip of words: `bob` takes cell 5 "the center square" (#169).

The whole log was read for this review.

## Loopholes

None.

## Problems

- **P445 seen again:** the Hello Game does not finish under a live model.
- **P470: the cap run of the Hello Game does not reach its cap.** The specification (11-m4-spec section 7.1 and
  7.3) sets 0.002 USD and expects the end `models.budget`; the whole game costs 0.0015 (M2) to 0.0018 USD (here),
  so the cap is never reached. A second run at 0.001 USD (`hello-game-002`) reached it. Proposed: a cap of 0.001
  in the specification, or a cap below the cost of the first requests. Built: nothing. Open.
- **P447 seen again** in the result line: `"run"` is the run folder as a path relative to the start
  directory (the ledger line itself names `smoke/hello-game-001`).
- The run was played on Node v22.23.4 (manifest `kernel.node`), not on the version of `.node-version` (26.13.0);
  the environment provides no other Node.

## Solutions

None built. A smoke reports and tunes nothing.
