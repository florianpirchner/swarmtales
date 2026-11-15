# liars-dice-002: live smoke of liar's dice (M4-60)

| Item | Value |
|---|---|
| Game | `games/liars-dice/game.ts`, the default game (four seats, three games, four dice, talk, a brain per seat), seed 53, purpose `smoke` |
| Command | `swt run games/liars-dice/game.ts --provider anthropic --model haiku --budget 0.40 --ledger games/m4-ledger.jsonl` |
| Model | `anthropic/haiku`, resolved `claude-haiku-5-5`, thinking medium, output cap 16000, pricing `pi-ai@1.4.0` |
| Code commit | `7ea5ea107090937a4b84de02f64b96aa5c51daf8`, tree clean, runtime revision 4 |
| Cost | 0.1088 USD of the cap 0.40 (232 requests; 876 input, 119756 output, 2267853 cache-read, 208922 cache-written tokens) |
| End | `liars-dice.match` at tick 23 ("the match is over", #3320), exit code 0; 3321 lines |
| Result | `liars-dice.scores`: A01 7, A02 7, A03 3, A04 1 (game 1 won by A01, games 2 and 3 by A02) |
| Checks | `swt log verify`: ok; `swt replay --game`: equal, 3321 lines; `swt scan`: clean, keys of 2 providers held; `REPORT.md` written with `--game` |

The second run of the same command: `liars-dice-001` was stopped from outside after ten minutes and is kept beside
it (see its README).

## What happened

The game plays live as it did on the old platform. Every seat writes a first brain before game 1 (#56 to #84):
probability rules ("expected count ... ~1/3 of unseen dice, ones wild"). 45 rounds, 149 bids, 45 calls, no missed
decision, no failed request. The seats play the baseline: 89 % of their decisions are of the baseline's kind
(`liars-dice.agreement` 0.892), only 3.4 % of the bids are under 0.5 from the own dice (`bluffShare`). The remarks
are the bid in words ("Three fives.", 148 of 149; one "Opening 2 fours.", #2087): talk is on, and nobody uses it to
lie, threaten or bargain.

The drama is the call: **the caller lost 34 of 45 calls** (`callsLost` 0.756; 10 of 15, 12 of 15, 12 of 15 by game),
yet the brains write the opposite lesson. After game 1 A02 notes "Opponents bid aggressively with 4+ dice on a
face; they often bluff and get called" (#945), A03 "Calling a 4x or 5x bid that needs 3+ unseen copies is usually
right" (#961). In the two-seat endgame of game 3 the two leaders bid certain one-die claims back and forth
(A02: "My 1 is wild, so it counts as a 6. One six is certain", #3249; A01 raises at "about 56%", #3265), and A02 wins
the game and ties the match at 7.

Three brain rewrites were refused with `BRAIN_TOO_LONG` (159, 176, 160 words against 150: #956, #1993, #2025); each
seat wrote a shorter one in the same retro (#990, #2008, #2048), so no brain was lost. 11 turns ended without a call:
after the retro of each game the seats are woken with an empty input and answer with a status line ("The first game
hasn't started yet, so there's nothing to act on", #123; #979, #2037).

Read for this review: the whole match by script (every call, bid, refusal, retro and end), and the logs around game
1's retro and game 3's endgame line by line.

## Loopholes

None seen. No seat used the remark to deceive, nobody tried a tool outside its turn, no refusal but the word limit.

## Problems

- **P474: the seats are woken with an empty input after each retro and end the turn without a call.** 11 of 232
  turns (#120 to #138 before game 1, #977 to #1007 after game 1, #2037 to #2057 after game 2); the input list of the
  activation is empty and the only tool open is `viewTable` (or `readBrain`). About 5 % of the requests buy nothing.
  Proposed: no wake on the release of the brain lock alone. Built: nothing. Open. Whether the old platform did the
  same is not checked here.
- **P446 seen again:** three brain rewrites refused for the word limit, here all rewritten in time.
- **P447 seen again** in the result line (`"run"` is a path relative to the start directory).

## Solutions

None built. A smoke reports and tunes nothing.
