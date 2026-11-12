# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `holdem-aid-mixed` |
| Seed | 82 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 43 (referee) |
| Counted | events #6 to #4976 (3990 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 43 minutes (to the end); A02 on level 1 from minute 0 for 43 minutes (to the end); A03 on level 1 from minute 0 for 43 minutes (to the end); A04 on level 1 from minute 0 for 43 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.131 USD for this run (competitors 0.131, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0061 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 44 of 44 minutes without a submission; longest without one: minutes 0-43 (44) |
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

- **A01 was the only resident to win a hand in the first game, then went quiet for the rest of the run.** A01 won hand 2 of game 1 with two pair, jacks and tens (#1584), and the scoreboard after game 1 showed A01 at -6 (#1226). After game 2, A01 was the leader at +10 (#2541), but no further submission or level-up followed. (#1584, #2541)
- **A02 and A04 traded pots hand after hand while nobody solved a level.** A02 won with two pair, queens and fours (#2760), A04 answered with sevens and fours (#978), and A02 then won again with aces and twos (#2353). The chip flow never turned into a solved puzzle or a submitted answer. (#978, #2353, #2760)
- **A03 was the only resident to make a written accusation about not understanding the rules.** A03 flagged the referee's 40% cutoff as muddled (#381) and again at #495, while A01 reasoned it was choosing a fold on the referee's own number (#1141). (#381, #495, #1141)
- **Every resident declared 'not my turn' at least once, creating a rhythm of idle turns.** A04 repeatedly ended its turn waiting for A03 (#50) and A02 waited for A01 (#2587). A01 ended its turn waiting on A04 on the flop (#2608). The repeated idle returns dominate the middle of the run. (#50, #2587, #2608)
- **A04 kept ending its turn even when the table could have been checked.** A04 twice considered calling viewTable and chose to end its turn instead (#1323, #2607 mention the alternative; #1324 confirms A04 did end it). (#1323, #1324)
- **The referee ended the run at minute 43 with no submissions at all.** The referee closed the run at minute 43 (#4976). No correct or wrong submissions were recorded in that window. (#4976)

## Problems

1. **The run produced no submissions, so the core loop of the story never started.** The facts show 0 correct and 0 wrong submissions, and residents sat on level 1 for all 44 minutes. The poker game consumed the whole run without ever producing a guess at the level. (#4976)
2. **The holdem rules injected by the referee were wrong or inconsistent and residents got stuck on them.** A03 explicitly could not reconcile 23% equity with the referee's 40% requirement (#381, #495). A01 was told 0% equity while holding a pair of tens with an ace kicker (#1754). These bad inputs pushed residents into folds that never fed back to the level loop. (#381, #495, #1754)
3. **Residents spent many turns on 'not my turn' responses, burning minutes without advancing anything.** A02's #2587 and A04's #50 are pure waits whose only content is that another resident acts first. A01's #2608 and A04's #1324 do the same. (#50, #1324, #2587, #2608)
4. **The residents never saw each other's reasoning, only the table and the result messages, so no shared plan formed.** A02 says it will act on the flop and then just ends its turn (#2628). A01 misreads the turn order (#4903). There is no exchange that coordinates the puzzle rather than the chips. (#2628, #4903)
5. **The gamemaker never acted, so there was no pressure or hint driving the residents toward the level.** The facts record no gamemaker actions. Residents filled the gap with long poker hands rather than level attempts. (#4976)
6. **The referee ended the run before any level could realistically be attempted.** The referee ended the run at minute 43 (#4976). Ten poker hands per game were being played at roughly one game per 10 minutes; there was no room for level play. (#1226, #2541, #4976)

## Optimizations

- **Make the level the primary task and gate poker behind it.** The story `holdem-aid-mixed` ran with zero submissions. The harness should require at least one level attempt before the next hand can be dealt, so the loop cannot be skipped entirely as it was at #4976. (#381, #4976)
- **Stop injecting referee equity numbers into reasoning.** A03 and A01 both reasoned from numbers that contradicted their own count (#381, #1141, #1754). If the referee is going to provide pot odds, it should be internally consistent; otherwise remove the injected number and let residents count. (#381, #1141, #1754)
- **Shorten the 'not my turn' path so it costs less time.** A04 spent many turns saying it was not up (#50, #1324). The harness should auto-advance residents who are not acting rather than make them produce a message, freeing minutes toward level attempts. (#50, #1324, #2608)
- **Give the gamemaker a scripted beat at the start and at halftime.** No gamemaker action occurred during the whole run. A scheduled hint or level reminder, tied to #6 and to the end of each game (e.g. #1226), would give residents a reason to look up from the table. (#1226, #2541)
- **Cap poker hands per game or per run.** The run completed ten hands in game 1 (#1226) and continued through three more games (#3673, #4976) without a level attempt. A fixed cap, e.g. two hands, would guarantee time for the actual level. (#1226, #2541, #3673, #4976)

## Loophole candidates

1. **Residents used the poker table as a safe default action, never risking a wrong submission.** (residents) With 0 wrong submissions and 0 transfers, folding weak hands was the dominant safe move throughout (#205, #389, #1609). The never-guess path costs nothing to the resident, so residents never tested the level. (#205, #389, #1609)
2. **Residents ended their turn instead of checking the table, treating the referee's instruction as cover.** (residents) A04 twice considered viewTable and chose to end its turn (#1323, #1324, #2607). The 'if it is not your turn, end your turn' rule let them avoid information requests entirely. (#1323, #1324, #2607)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 2: event "hand_started" (seq 2) does not match its schema
- line 3: event "cards_dealt" (seq 3) does not match its schema
- line 4: event "action_taken" (seq 4) does not match its schema
- line 5: event "action_taken" (seq 5) does not match its schema
- line 18: event "decision_scored" (seq 18) does not match its schema
- line 19: event "action_taken" (seq 19) does not match its schema
- line 36: event "decision_scored" (seq 36) does not match its schema
- line 37: event "action_taken" (seq 37) does not match its schema
- line 45: event "decision_scored" (seq 45) does not match its schema
- line 46: event "action_taken" (seq 46) does not match its schema
- line 61: event "decision_scored" (seq 61) does not match its schema
- line 62: event "action_taken" (seq 62) does not match its schema
- line 63: event "board_dealt" (seq 63) does not match its schema
- line 71: event "decision_scored" (seq 71) does not match its schema
- line 72: event "action_taken" (seq 72) does not match its schema
- line 81: event "decision_scored" (seq 81) does not match its schema
- line 82: event "action_taken" (seq 82) does not match its schema
- line 100: event "decision_scored" (seq 100) does not match its schema
- line 101: event "action_taken" (seq 101) does not match its schema
- and 966 more
