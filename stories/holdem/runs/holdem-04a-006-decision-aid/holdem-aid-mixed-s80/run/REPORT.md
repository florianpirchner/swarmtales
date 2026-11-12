# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `holdem-aid-mixed` |
| Seed | 80 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 45 (referee) |
| Counted | events #6 to #5366 (4326 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 45 minutes (to the end); A02 on level 1 from minute 0 for 45 minutes (to the end); A03 on level 1 from minute 0 for 45 minutes (to the end); A04 on level 1 from minute 0 for 45 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.156 USD for this run (competitors 0.156, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0061 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 46 of 46 minutes without a submission; longest without one: minutes 0-45 (46) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A04 wins the first hand with jacks and recalls the result in its own summary.** A04 bet for value with a pair of jacks (#111) and later stated hand 1 went to it for +14 (#232). This is the first points swing of the run and shows the referee-forced pot numbers reaching the residents. (#111, #232)
- **A02 and A01 both misread the board strongly as a straight when A03's actual hand differed.** A02 reasoned it had a queen-high flush with Q-J-T-7-2 of clubs (#342) and won hand 7 with trips (#1387). Later A01 realized A03's 8h Tc on a club board was a straight, not a flush (#1939). Residents' private board reading is unreliable and the other seats never see it. (#342, #1387, #1939)
- **A01 wins a 54-chip pot with a queen-high flush after raising the turn.** A01 recognized the flush on the turn (#4390), raised to 8, and after A02's river call (#4461) and A03's overcall (#4478) took hand 2 (#4491). This is the largest pot cited in the log and shows the betting escalates to the cap. (#4390, #4461, #4478, #4491)
- **A03 wins a hand, then reports final match standings.** A03 won hand 1 with jacks over A04's threes (#4248), and later reported the match as A01 -66, A02 +33, A03 +17, A04 +16 (#4027). Standings are only available as A03's own claim; the facts table shows final standings unknown. (#4027, #4248)
- **A01 loses a big pot to A02's triple-sevens trips and accounts for it.** A02 bet and was called with three sevens (#1321, #1372) and A02 later booked hand 7 as +25 (#1387), while A01 reported finishing at -6 and A02 at +63 in hand 1's game (#1499). A01 keeps a running self-score that conflicts with nothing but is never checked by the city. (#1321, #1372, #1387, #1499)

## Problems

1. **No submissions or level-ups in 45 minutes.** All four residents are stuck on level 1 from minute 0 to 45 with zero correct or wrong submissions (#5366). The poker table consumes every turn and none reaches the level-solving loop the story is named for. (#5366)
2. **Residents repeatedly fit their action to a referee equity figure that contradicts their own math, sometimes folding for no clear reason.** A03 followed a referee 40% threshold it doubted (#3565), A02 folded 45 offsuit citing a referee 40% it did not understand (#1931), and A01 folded J7 noting the referee's 40% did not match its calculation (#5122). This suggests the referee's per-decision equity prompt is being read as a fold instruction, which shrinks action and scoring opportunities. (#1931, #3565, #5122)
3. **Residents spend many turns idling when it is not their turn.** Multiple lines are pure waits: A04 waiting on A02 (#43), A02 waiting on A04 (#158), and A04 'not my turn yet' (#2763). These turns add cost and latency without any game action, and the log shows no submission ever occurs. (#43, #158, #2763)
4. **Board reading errors are never surfaced to the other residents.** Residents gave contradictory reads of the same board in different hands (#342, #1939) and A02 accepted a result that contradicted its read (#3058). Since reasoning is private and no DMs or board posts were sent, errors persist across the whole run. (#342, #1939, #3058)
5. **One resident repeatedly reflects on the fate of the whole match using self-reported totals.** A01 and A03 report final and intermediate standings that nothing in the city verifies (#1499, #4027). The facts table records final standings as unknown, so the game's scoreboard feedback never reaches the residents in a checkable way. (#1499, #4027)

## Optimizations

- **Give residents an explicit next-step for the level/puzzle track.** All four sat on level 1 for 45 minutes with zero submissions (#5366). Add an explicit instruction and a visible level objective so the poker table is not the only thing they can do. (#5366)
- **Remove or clarify the referee's equity figure that contradicts the hidden hands.** A03 and A01 both folded mainly because of a referee percentage their own math contradicted (#3565, #5122). Either drop the number or present it as advisory so residents act on the table, not on an unexplained threshold. (#3565, #5122)
- **Shorten idle waiting turns.** A04 and A02 burned turns just to say 'waiting' (#43, #158). Let the harness auto-end turns clearly, or merge them, so residents spend their budgets on decisions and communication. (#43, #158, #2763)
- **Make standings and hand results visible to all residents.** Residents reconstructed scores privately and reported inconsistent numbers (#1499, #4027), while actual final standings were unknown. Push the official scoreboard each hand so the story's competition is concrete. (#1499, #4027)
- **Allow residents to communicate reads and results.** Zero DMs and board posts occurred, yet residents clearly used judgment about opponents (#4461) and were wrong about the board (#1939). Allowing messages would let the designed mixed/enforcer roles matter and make board-reading errors correctable. (#1939, #4461)

## Loophole candidates

1. **Residents treat private self-scoring as the real scoreboard.** (residents) A01 and A03 report running and final scores that the city never verifies (#1499, #4027). This lets a resident narrate an outcome rather than play toward the city's actual points, sidestepping the intended competition. (#1499, #4027)
2. **Referee equity threshold is used as a shortcut to decide instead of reading the table.** (residents) A03 raises and folds almost purely on the referee's percentage against its own estimate (#3565), and A01 folds J7 because the referee's 40% looks off (#5122). This short-circuits the intended skill of board and pot-odds reading. (#3565, #5122)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 2: event "hand_started" (seq 2) does not match its schema
- line 3: event "cards_dealt" (seq 3) does not match its schema
- line 4: event "action_taken" (seq 4) does not match its schema
- line 5: event "action_taken" (seq 5) does not match its schema
- line 20: event "decision_scored" (seq 20) does not match its schema
- line 21: event "action_taken" (seq 21) does not match its schema
- line 36: event "decision_scored" (seq 36) does not match its schema
- line 37: event "action_taken" (seq 37) does not match its schema
- line 56: event "decision_scored" (seq 56) does not match its schema
- line 57: event "action_taken" (seq 57) does not match its schema
- line 74: event "decision_scored" (seq 74) does not match its schema
- line 75: event "action_taken" (seq 75) does not match its schema
- line 76: event "board_dealt" (seq 76) does not match its schema
- line 86: event "decision_scored" (seq 86) does not match its schema
- line 87: event "action_taken" (seq 87) does not match its schema
- line 101: event "decision_scored" (seq 101) does not match its schema
- line 102: event "action_taken" (seq 102) does not match its schema
- line 114: event "decision_scored" (seq 114) does not match its schema
- line 115: event "action_taken" (seq 115) does not match its schema
- and 1020 more
