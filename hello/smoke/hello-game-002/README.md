# hello-game-002: the cap run of the Hello Game, at 0.001 USD (M4-60)

| Item | Value |
|---|---|
| Game | `games/hello/game.ts`, seed 1, purpose `smoke` |
| Command | `swt run games/hello/game.ts --provider anthropic --model haiku --budget 0.001 --ledger games/m4-ledger.jsonl` |
| Model | `anthropic/haiku`, resolved `claude-haiku-5-5`, thinking medium, output cap 4000, pricing `pi-ai@1.4.0` |
| Code commit | `7ea5ea107090937a4b84de02f64b96aa5c51daf8`, tree clean, runtime revision 4 |
| Cost | 0.00133 USD against the cap 0.001 (14 requests; 54 input, 1936 output, 15861 cache-read, 1599 cache-written tokens) |
| End | `limit_reached` with the limit `models.budget` at tick 10 (#155), exit code 5; 156 lines |
| Checks | `swt log verify`: ok; `swt replay --game`: **differs at line 155** (`SWT-C031`, see P471); `swt scan`: clean, keys of 2 providers held; `REPORT.md` written with `--game` |

## Why there is a second run

`hello-game-001` was the cap run of the specification at 0.002 USD and ended at the tick limit, because the whole
game costs less than its cap (P470). This run is the same command at 0.001 USD, so that the cap path is played
once live, as section 7.3 asks ("it must end at `models.budget`"). It is a deviation from "once", for 0.0013 USD.

## What happened

The play is the same as in run 001 up to the cap (seed 1, the same first moves 4, 0, 8). The request that passed
the cap was `bob`'s long think before move 6 (#147: 879 output tokens, 0.00047 USD), which took the sum from
0.00086 to 0.00133. The tick ended, then the kernel wrote `limit_reached` (#155, reason "cost 0.00 USD reached the
cap of 0.00 USD") and `run_ended` with reason `limit` (#156). The CLI exits with 5.

## Loopholes

None.

## Problems

- **P471: a run that ended at its cost cap does not replay equal.** `swt replay` stops at line 155: "the log has
  kernel limit_reached of kernel, the replay wrote nothing". The replay has no cost meter, so it plays on where the
  live run stopped. Proposed: the replay takes the limit from the log (or counts the recorded costs). Built:
  nothing. Open.
- **P472: the cap is passed by the last request, and the end reason rounds the money away.** The run cost 0.00133
  against a cap of 0.001 (33 % over): the meter stops the run at the next boundary after the sum passed the cap,
  not before a request that would pass it. The reason line prints "cost 0.00 USD reached the cap of 0.00 USD".
  Proposed: write the reason with enough digits; say in the CLI reference that a cap can be passed by one tick's
  requests. Built: nothing. Open.

## Solutions

None built. A smoke reports and tunes nothing.
