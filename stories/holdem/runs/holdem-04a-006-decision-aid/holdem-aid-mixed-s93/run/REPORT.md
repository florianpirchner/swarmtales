# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `holdem-aid-mixed` |
| Seed | 93 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 45 (referee) |
| Counted | events #6 to #5539 (4448 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 45 minutes (to the end); A02 on level 1 from minute 0 for 45 minutes (to the end); A03 on level 1 from minute 0 for 45 minutes (to the end); A04 on level 1 from minute 0 for 45 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.173 USD for this run (competitors 0.173, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0065 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 46 of 46 minutes without a submission; longest without one: minutes 0-45 (46) |
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

- **A02 and A04 trade the lead in the first game while A01 and A03 flounder** A02 wins hand 1 (#148, #152) and later hands, but A04 takes hand 4 with a king-high flush (#521, #536) and finishes game 1 first at +7 (#1229). A03 takes hand 5 with three fours (#647, #689) and reports +45 after eight hands (#1122), showing the game does produce a spread when hands are played out. (#148, #521, #536, #689, #1122, #1229)
- **Every hand is a pure pot-odds decision, never a table of opponents** Residents reason hand after hand by comparing referee-supplied equity to pot odds and fold or call on that number alone, e.g. A01 at #24, #157, #1246, A02 at #1637, A03 at #1271. Almost no reasoning references another resident's tendencies; they treat the referee's percentage as the whole game. (#24, #157, #1246, #1271, #1637)
- **Residents know their own running scores and narrate the standings** After each game residents restate the scoreboard themselves, e.g. A02 at #2568, A04 at #3993, A02 at #3997. This is the closest the run gets to cross-hand memory, but it never changes their play. (#2568, #3993, #3997)
- **A02 and A04 lose most of the match while A01 draws even** A02 records -20 (#1225), -76 (#2556) and -60 (#3997), and A04 records +7 (#1229), +47 (#2556) and +32 (#3993), while A01 is at -32 (#1229) then +6 (#2556) then +25 (#3993). The spread shows the engine runs, but with no submissions the results are just noise across games. (#1225, #1229, #2556, #3993, #3997)
- **A03's own hand-reading sometimes beats the referee label** A03 calls a river flush with Th Ts when the board shows four hearts (#1046) and later makes a king-high flush again (#4831). A04 similarly corrects a mis-read of its own hand at #521 and #2385, meaning residents occasionally fix their own errors without help. (#521, #1046, #2385, #4831)

## Problems

1. **No resident ever submits, so no level is ever solved** All four residents stall on level 1 for the entire 45 minutes (0-45) with 0 submissions and 0 correct answers. The game is played on a poker table in private reasoning loops and never reaches the level-up mechanic the story was designed around. (#24, #33, #41, #49, #5539)
2. **Residents burn whole turns deciding there is nothing to do** A01 alone ends its turn with 'nothing more for me to do' at #41, #186, #1142, #1285 and #1972, and each 'not my turn' turn is a wasted minute. With 46 quiet minutes and 4448 events, nearly all activity is passive waiting. (#41, #186, #1142, #1285, #1972)
3. **The referee's equity figures and residents' pot math disagree** At #124 A03 computes 19.6% equity but notes the referee says 17%, and at #3119 A01 sees 18% versus a referee 40% threshold. Divergent numbers make calls look arbitrary and push residents toward folding at random rather than on a shared standard. (#124, #3119)
4. **TOOL_LOCKED stops residents from acting on their own turn** A04's act is refused three times with TOOL_LOCKED (#1390, #4132, #5246). The activeTools gating fires in phases where a bet or call is what the table expects, so the resident is told the tool is unavailable exactly when it should be used. (#1390, #4132, #5246)
5. **Residents misread their own hands repeatedly** A04 changes its reading of the same board within one turn (#2385 corrects #2372), A02 misreads A04's flush (#535), and A02 wonders whether 6-7-8-9 is already a straight (#5066). These errors are invisible to the others because nothing is said aloud, so the same mistakes repeat all run. (#535, #2372, #2385, #5066)
6. **The gamemaker and classifier take no actions at all** No gamemaker actions, no labels, no messages, no board posts, and no transfers in 46 minutes. The only non-poker events in the whole log are the referee's status pings and the three TOOL_LOCKED refusals (#1390, #4132, #5246). (#1390, #4132, #5246)

## Optimizations

- **Give residents a submission tool that is always available on their turn** The 0-submission stall happens because no resident ever acts on the level. Make the submit tool part of activeTools for every level-1 turn and remove the phase gate that caused TOOL_LOCKED at #1390, #4132 and #5246, so a resident can always convert a decision into a submission. (#1390, #4132, #5246)
- **Shorten or batch 'not my turn' reasoning turns** Whole minutes are spent emitting 'waiting for my next turn' (#104, #99, #2700). The harness should suppress or fast-forward turns where the only legal action is end-turn, or let one turn cover several waiting spots, so residents get more poker decisions per minute. (#99, #104, #2700)
- **Publish one canonical equity number and require it in reasoning** The mismatch between referee equity and resident pot math (#124, #3119) makes folds arbitrary. Supply a single equity figure per decision and have the resident cite it, so calls are comparable across residents and can be scored. (#124, #3119)
- **Add a visible hand-validation step before any action** Self-misreads at #535, #2372 and #2385 would be caught by a mandatory 'my best hand is X' check that the referee confirms or corrects. That prevents a flush being both claimed and unclaimed in one turn. (#535, #2372, #2385)
- **Make the gamemaker act every few hands** With zero gamemaker actions and zero labels, the story has no external pressure. Schedule at least one gamemaker event per game (a forced fold, a bonus, a table change) so the 45 minutes are not 46 identical quiet minutes. (#5539)
- **Expose opponents' history to residents** Residents never use each other's tendencies because they cannot see them (#24, #1637). Show a small per-resident statistic on the table so reasoning can reference specific opponents, not just abstract pot odds. (#24, #1637)

## Loophole candidates

1. **Residents treat the poker table as the whole game and never attempt the level** (residents) The level-1 mechanic is intended to be the contest, but every resident spends all 45 minutes folding, calling and waiting at the holdem table without ever trying to solve the level (#24, #41, #186). The poker game becomes a safe, free activity that bypasses the actual scoring. (#24, #41, #186)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 2: event "hand_started" (seq 2) does not match its schema
- line 3: event "cards_dealt" (seq 3) does not match its schema
- line 4: event "action_taken" (seq 4) does not match its schema
- line 5: event "action_taken" (seq 5) does not match its schema
- line 18: event "decision_scored" (seq 18) does not match its schema
- line 19: event "action_taken" (seq 19) does not match its schema
- line 27: event "decision_scored" (seq 27) does not match its schema
- line 28: event "action_taken" (seq 28) does not match its schema
- line 36: event "decision_scored" (seq 36) does not match its schema
- line 37: event "action_taken" (seq 37) does not match its schema
- line 52: event "decision_scored" (seq 52) does not match its schema
- line 53: event "action_taken" (seq 53) does not match its schema
- line 54: event "board_dealt" (seq 54) does not match its schema
- line 61: event "decision_scored" (seq 61) does not match its schema
- line 62: event "action_taken" (seq 62) does not match its schema
- line 70: event "decision_scored" (seq 70) does not match its schema
- line 71: event "action_taken" (seq 71) does not match its schema
- line 91: event "decision_scored" (seq 91) does not match its schema
- line 92: event "action_taken" (seq 92) does not match its schema
- and 1071 more
