# liars-dice-001: a stopped live smoke of liar's dice (M4-60)

| Item | Value |
|---|---|
| Game | `games/liars-dice/game.ts`, the default game (four seats, three games, four dice, talk, a brain per seat), seed 53, purpose `smoke` |
| Command | `swt run games/liars-dice/game.ts --provider anthropic --model haiku --budget 0.40 --ledger games/m4-ledger.jsonl` |
| Model | `anthropic/haiku`, resolved `claude-haiku-5-5`, thinking medium, output cap 16000, pricing `pi-ai@1.4.0` |
| Code commit | `7ea5ea107090937a4b84de02f64b96aa5c51daf8`, tree clean, runtime revision 4 |
| Cost | 0.0810 USD by the `response` lines of the log (179 answered requests; one request was in flight when the run stopped) |
| End | **none**: the process was stopped from outside after ten minutes, at the time limit of the operator's tool, at tick 17 of 192 in game 3; 2491 lines, no `run_ended` |
| Checks | `swt log verify`: `SWT-L002` (no signed head: the run did not end); no replay, no report (the log has no end); `swt scan`: clean, keys of 2 providers held |

## Why this folder is kept

Nothing from a live run is deleted unrecorded. The run was cut by the tool that started it, not by the game or the
platform; the same command was played again into `liars-dice-002`, which is the smoke of record. The ledger holds
the reservation of 0.40 USD of this run and a cost line with 0.0810 USD written by hand from the log (the CLI wrote
none, P462).

## What happened before the stop

Two games of three were played (`dice_game_ended` twice), 101 bids and 37 calls, 7 seats out. Everything seen here
is seen again in `liars-dice-002` and described there: the turns without a call before game 1, the bids that sit
in the probability baseline, the remarks.

## Loopholes

None seen.

## Problems

- **P462 seen again:** a stopped run leaves its reservation open; the cost line here is by hand.
- **P473: a live smoke of liar's dice takes longer than ten minutes**, the time limit of a foreground command of
  the operator's tool. Proposed: start long live runs in the background, and say so in the CLI reference. Built:
  nothing (the operator's mistake). Open.

## Solutions

None built.
