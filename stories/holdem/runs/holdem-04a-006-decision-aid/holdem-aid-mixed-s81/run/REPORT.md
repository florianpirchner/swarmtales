# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `holdem-aid-mixed` |
| Seed | 81 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 51 (referee) |
| Counted | events #6 to #6200 (5048 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 51 minutes (to the end); A02 on level 1 from minute 0 for 51 minutes (to the end); A03 on level 1 from minute 0 for 51 minutes (to the end); A04 on level 1 from minute 0 for 51 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.207 USD for this run (competitors 0.207, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0063 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 52 of 52 minutes without a submission; longest without one: minutes 0-51 (52) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **No resident ever solved or submitted a level in 51 minutes.** All four residents (A01-A04) stayed on level 1 from minute 0 to minute 51 with 0 correct and 0 wrong submissions, and the run ended at minute 51 by referee (#6200). The whole run was spent playing hands of the poker table the residents were dealt into, never touching the level task. (#6200)
- **Residents treated the poker table as the whole game and played it competently.** Residents reasoned about pot odds, equity and bet sizing hand after hand, e.g. A01 folding K2 at #205 and A04 calling a gutshot at #343, and they tracked their own scores (A03 notes 'Hand 4 is mine (+21)' at #936, A04 notes 'Hand 2 went my way' at #458). They played a coherent poker match for the entire run. (#205, #343, #458, #936)
- **A01 and A04 won the early hands while A03 and A02 mostly folded.** A04 took hand 2 with a river straight (#371, #458) and hand 6 with kings and jacks (#1166), A01 won hand 4 with three kings (#4082), while A03 repeatedly folded on thin equity (#183, #1735, #3228). The scoreboard drifted steadily in A01's and A04's favor. (#183, #371, #458, #1166, #4082)
- **Three TOOL_LOCKED refusals hit residents mid-hand.** A03's act was refused at #427, A04's at #3240 and A02's at #4246, each with the message that the tool is 'not available to you at this level or in this phase'. These were the only mechanic-level errors in the run and each interrupted a resident trying to act on a live hand. (#427, #3240, #4246)
- **Residents spent many turns announcing they were waiting.** Large stretches of the log are residents saying 'not my turn' and ending their turn, e.g. #43, #561, #656, #729, #1650, #1717. This waiting pattern recurs every hand and accounts for much of the 5048 events. (#43, #561, #656, #729, #1650, #1717)
- **The gamemaker was silent and no messages were exchanged.** The facts record 0 DMs, 0 board posts, 0 group posts, 0 transfers and no gamemaker actions, and the log shows residents only ever talking to themselves (#43, #63, #561). No negotiation, alliance or deception ever occurred. (#43, #63, #561)

## Problems

1. **The level task was never engaged, only the poker table.** Every resident stayed on level 1 for the full 51 minutes with zero submissions (#6200), and all reasoning lines are about poker hands (#33, #100, #285). The story's level-solving intent was completely displaced by the dealt poker game. (#33, #100, #285, #6200)
2. **Residents repeatedly misread whose turn it was and burned turns waiting.** Residents end turns with 'not my turn' dozens of times (#43, #561, #1717, #2622), and A03 at #4888 explicitly says the turn order 'seems off' and A04 at #5147 says the message is 'contradictory'. The turn-state messaging is confusing enough to stall action. (#43, #561, #1717, #4888, #5147)
3. **TOOL_LOCKED errors blocked residents trying to act.** Three act attempts were refused as unavailable at this level or phase (#427, #3240, #4246), costing turns in live hands. Residents had no clear way to know which tools were usable when. (#427, #3240, #4246)
4. **Residents second-guessed the referee's equity numbers.** A01 at #205 calls the referee's 40% figure 'odd', A03 at #3498 works out 'about 29% instead' against the referee's 40%, and A03 at #2127 repeats the mismatch. The stated pot-odds guidance conflicts with the residents' own arithmetic, undermining trust in the rules. (#205, #2127, #3498)
5. **No social play happened despite a social-competition premise.** There were 0 messages, 0 transfers and no gamemaker actions, and every 'SAYS TO ITSELF' line is a private note (#63, #936, #1166). The closed-city competition for seats produced no alliances, lies or negotiation. (#63, #936, #1166)

## Optimizations

- **Make the level task the only or the primary action surface.** Because residents spent all 51 minutes on poker (#33, #6200), the next version should gate poker behind level progress or remove it so the dealt task is the level itself. Otherwise the story's solve-the-level intent is never exercised. (#33, #6200)
- **Fix turn-state messaging so residents do not waste turns waiting.** The many 'not my turn' endings (#43, #561, #1717) and explicit confusion at #4888 and #5147 show the state feed is unclear. Send each resident an explicit 'your action now' prompt with the legal tools listed. (#43, #561, #1717, #4888, #5147)
- **Align the referee's pot-odds figures with the displayed pot and bet.** A01 (#205) and A03 (#2127, #3498) both flag the referee's required-equity number as inconsistent with the pot and call size. Compute and show the pot odds from the visible numbers so residents do not argue with the rules. (#205, #2127, #3498)
- **Expose the active tool set up front instead of refusing mid-hand.** Three TOOL_LOCKED refusals (#427, #3240, #4246) interrupted live hands. Announce the active tools at the start of each phase so residents do not attempt locked actions. (#427, #3240, #4246)
- **Add a social channel and a reason to use it.** With 0 messages and 0 transfers, no alliances or deception formed (#63, #936). Give residents a board or DM tool tied to seat competition so the social premise is actually played. (#63, #936)

## Loophole candidates

None found.

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 2: event "hand_started" (seq 2) does not match its schema
- line 3: event "cards_dealt" (seq 3) does not match its schema
- line 4: event "action_taken" (seq 4) does not match its schema
- line 5: event "action_taken" (seq 5) does not match its schema
- line 19: event "decision_scored" (seq 19) does not match its schema
- line 20: event "action_taken" (seq 20) does not match its schema
- line 36: event "decision_scored" (seq 36) does not match its schema
- line 37: event "action_taken" (seq 37) does not match its schema
- line 56: event "decision_scored" (seq 56) does not match its schema
- line 57: event "action_taken" (seq 57) does not match its schema
- line 70: event "decision_scored" (seq 70) does not match its schema
- line 71: event "action_taken" (seq 71) does not match its schema
- line 83: event "decision_scored" (seq 83) does not match its schema
- line 84: event "action_taken" (seq 84) does not match its schema
- line 85: event "board_dealt" (seq 85) does not match its schema
- line 103: event "decision_scored" (seq 103) does not match its schema
- line 104: event "action_taken" (seq 104) does not match its schema
- line 118: event "decision_scored" (seq 118) does not match its schema
- line 119: event "action_taken" (seq 119) does not match its schema
- and 1132 more
