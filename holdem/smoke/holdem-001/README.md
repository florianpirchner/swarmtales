# holdem-001: live smoke of hold'em (M4-61)

| Item | Value |
|---|---|
| Game | `games/holdem/game.ts`, the default game (four seats, four duplicate games of eight hands, fixed limit, a brain per seat, no aid), seed 41, purpose `smoke` |
| Command | `swt run games/holdem/game.ts --provider anthropic --model haiku --budget 0.40 --ledger games/m4-ledger.jsonl` |
| Model | `anthropic/haiku`, resolved `claude-haiku-5-5`, thinking medium, output cap 16000 (the old entry's), pricing `pi-ai@1.4.0` |
| Code commit | `7ea5ea107090937a4b84de02f64b96aa5c51daf8`, tree clean, runtime revision 4 |
| Cost | 0.1159 USD of the cap 0.40 (489 requests; 1894 input, 104293 output, 3692671 cache-read, 212712 cache-written tokens) |
| End | `holdem.match` at tick 51, exit code 0; 6568 lines |
| Result | `holdem.scores`: A01 -10, A02 -16, A03 -27, A04 53 (games: A04 +49, +37, -47, +14) |
| Checks | `swt log verify`: ok; `swt replay --game`: equal, 6568 lines; `swt scan`: clean, keys of 2 providers held; `REPORT.md` written with `--game` |

## What happened

The game plays live: 32 hands, 443 decisions by `act`, no missed decision, no failed request, no deadline forfeit.
The numbers sit where the old platform's unaided Haiku tables sat (P437: EV loss 0.26, calls without the odds
17.4 %, VPIP 0.73): EV loss per decision 0.228, calls without the pot odds 15.6 %, VPIP 0.66, 69 % of the decisions
of the baseline's kind. The duplicate deals move the seats each game, and A04 still wins three of four games; game 3
turns the table (A02 +39, A03 +27, A04 -47).

The brains are poker rules and reads of the others ("A03 and A04 call and raise with middling pairs, chase draws",
A01 after game 1, #1850). No brain holds a card or a hand number of an earlier game, so nothing of the duplicate
deals is carried by the brain (checked by script over all 16 brain versions). The seats are not told that the deals
repeat. Every game after the first starts with "Results so far" (the points of every seat per game), as in Quarry
and Econ Lab (LH19).

Five brain rewrites were refused with `BRAIN_TOO_LONG`: A04 once after game 2 (162 words, #3566), A02 four times in
a row after game 3 (156, 152, 151, 151 words, #5269 to #5318) before its 146-word text was saved (#5342). No brain
was lost. 14 turns end without a call: the empty wakes after a brain write (P474), and two seats woken off their
turn ("A01 acts first, so I'm waiting for my turn", A03 #1880; A04 #1906). The status lines get the sums wrong once:
"I finished the game at +21 points" (A01, #3636; it was +8, the match +21).

Read for this review: the whole match by script (every game score, refusal, brain version and turn text), game 1
and the retro after game 3 line by line.

## Loopholes

None seen. Candidate checked and not found: a brain that keeps the duplicate deals.

## Problems

- **P474 seen again:** empty wakes after a brain write.
- **P446 seen again:** five rewrites refused for the word limit, one seat four times in a row; all written in time.
- **LH19 seen again:** "Results so far" before each later game.
- **P447 seen again** in the result line.

## Solutions

None built. A smoke reports and tunes nothing.
