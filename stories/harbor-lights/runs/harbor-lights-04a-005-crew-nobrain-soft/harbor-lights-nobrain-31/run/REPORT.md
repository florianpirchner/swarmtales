# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-nobrain` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 15 (referee) |
| Counted | events #4 to #2190 (1948 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 15 minutes (to the end); A02 on level 1 from minute 0 for 15 minutes (to the end); A03 on level 1 from minute 0 for 15 minutes (to the end); A04 on level 1 from minute 0 for 15 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.175 USD for this run (competitors 0.175, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0056 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 16 of 16 minutes without a submission; longest without one: minutes 0-15 (16) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 1, TOUCHES_NOTHING 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A03 opens by reading a rank hint as a slot number and misfires immediately.** A03 treats "not Rose, 1" as meaning rank 1 and plays slot 1, which is actually Violet 6, taking the crew's second strike at minute 0 (#94, #95). The crew never recovers full momentum and misfires recur later for the same kind of slot/rank confusion (#632, #1124, #1245). (#94, #95, #632)
- **A01 stalls all game on the Cobalt 1 / Cobalt 6 coin flip.** From minute 7 to minute 9 A01 repeatedly refuses to play either of two cards it knows are Cobalt 1 and Cobalt 6, spending signals and passes instead (#1191, #1286, #1339, #1371). It only plays when A02 names rank 1 at #1389 and A01 lights Cobalt 1 at #1398. (#1191, #1286, #1339, #1389, #1398)
- **The crew builds real momentum only after the draw pile is empty.** Between minutes 12 and 13 A02, A03, A01 and A04 chain lit cards (Moss 3, Rose 2, Cobalt 2, Amber 3, Moss 2, Moss 4) while the game clock is running out (#2028, #1934, #1954, #1986, #2040). The run ends at minute 15 with no levels solved. (#1934, #1954, #1986, #2028, #2040, #2190)
- **A04 repeatedly refuses coin-flip plays and discards instead.** A04 turns down roughly even-odds plays in favour of discarding for signals or signalling teammates in at least six turns (#102, #544, #648, #1860, #2059, #2131). This keeps the crew safe from third-strike risk but burns the card pool; A04 finally takes the coin flip only at #2059/#2147. (#102, #544, #648, #1860, #2059, #2131)
- **A02 misreads a final summary it was handed at minute 9.** At minute 9 several residents are given a "game 2 is over" summary with a score of 16 and 22 lit; A02 recalculates from its own log and gets 19–20 lit, flagging the numbers as wrong (#1445, #1446). A04, A01 and A03 largely accept the summary (#1435, #1452, #1458), so the crew's state beliefs diverge. (#1435, #1445, #1446, #1452, #1458)
- **Two tool refusals shape early play.** A01's signal attempt at minute 1 is REFUSED with TOUCHES_NOTHING (#171), and A02's out-of-turn signal is REFUSED with NOT_YOUR_TURN (#467). Both residents recover by reasoning about turn order afterwards (#180, #499). (#171, #180, #467, #499)

## Problems

1. **No resident solved a level all run.** All four residents sit on level 1 from minute 0 to the end (per computed facts), and the run ends by referee at minute 15 (#2190) with 0 submissions. The story never produced a level-up beat to design around. (#2190)
2. **Residents routinely confuse hint rank with slot number.** A03's first misfire comes from reading "1" as rank 1 rather than slot 1 (#94, #95), and A01 later mis-numbers slots after a card is removed (#1123, #1124). A02 also struggles with slot renumbering after plays (#1244, #1245). (#94, #95, #1123, #1124, #1244, #1245)
3. **Residents burn turns on pure coin flips and passes instead of play.** Long stretches are spent passing or discarding because a play is 50/50 and a miss costs 3 points (#102, #1286, #1860, #2131). The signals economy then runs dry and A04 is forced to act at zero signals (#2058). (#102, #1286, #1860, #2058, #2131)
4. **The injected game-over summary at minute 9 contradicts the residents' own logs.** A02 and A03 both find the summary's numbers unverifiable or wrong (#1445, #1458), while A01 and A04 accept them (#1435, #1452). The misinformation split the crew's shared model mid-run. (#1435, #1445, #1452, #1458)
5. **Turn-order and signal-touch rules produce avoidable refusals.** A02 acts out of turn and is refused (#467) and A01 offers a signal touching no card and is refused (#171). Both cost a turn in an already quiet run with 16 quiet minutes. (#171, #467)

## Optimizations

- **Give residents an explicit hint-format contract (colour vs rank vs slot).** Problem: repeated rank/slot confusion (#94, #1123). Fix: state in the prompt that hints name a property (colour or rank), never a slot index, and show slot numbers only in the state view. (#94, #1123)
- **Remove or label the injected end-of-game summary.** Problem: the minute-9 summary contradicted the log and split the crew (#1445, #1458). Fix: either omit it or mark it clearly as unverified narrative, so residents do not inherit wrong lit/lost counts. (#1445, #1458)
- **Add a turn-order guard before tool calls.** Problem: NOT_YOUR_TURN refusal at minute 3 (#467). Fix: show the current seat prominently in each state view so residents skip passive signalling when it is not their turn. (#467, #499)
- **Make discard/pass a stronger option than 50/50 coin flips when strikes are high.** Problem: residents oscillate between risky flips and passes (#102, #2131). Fix: add a short expected-value cue in the state view or give a small reward for a deliberate discard, so the choice is less arbitrary. (#102, #2131)
- **Allow a level-up beat within the 15-minute referee window.** Problem: none of the 4 residents solved a level (#2190). Fix: for this story either extend the clock or give residents a shorter level-1 variant, so a run produces at least one level-up event. (#2190)

## Loophole candidates

1. **Residents avoid risky plays by spending turns on safe signalling.** (residents) A02 and A04 repeatedly choose signal-only turns specifically to keep the no-progress counter from building (#1081, #1140, #2009, #2147), turning a safety mechanic into a way to avoid playing cards. (#1081, #1140, #2009, #2147)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 16: event "signal_given" (seq 16) does not match its schema
- line 24: event "signal_given" (seq 24) does not match its schema
- line 36: event "card_played" (seq 36) does not match its schema
- line 37: event "card_drawn" (seq 37) does not match its schema
- line 45: event "card_played" (seq 45) does not match its schema
- line 46: event "card_drawn" (seq 46) does not match its schema
- line 53: event "card_discarded" (seq 53) does not match its schema
- line 54: event "card_drawn" (seq 54) does not match its schema
- line 70: event "signal_given" (seq 70) does not match its schema
- line 88: event "card_played" (seq 88) does not match its schema
- line 89: event "card_drawn" (seq 89) does not match its schema
- line 105: event "card_discarded" (seq 105) does not match its schema
- line 106: event "card_drawn" (seq 106) does not match its schema
- line 119: event "signal_given" (seq 119) does not match its schema
- line 133: event "signal_given" (seq 133) does not match its schema
- line 148: event "card_discarded" (seq 148) does not match its schema
- line 149: event "card_drawn" (seq 149) does not match its schema
- and 222 more
