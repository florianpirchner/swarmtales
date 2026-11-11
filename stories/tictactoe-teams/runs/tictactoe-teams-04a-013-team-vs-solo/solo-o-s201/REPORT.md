# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `tictactoe-teams-5x5-r6-solo-o` |
| Seed | 201 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 29 (referee) |
| Counted | events #2 to #2377 (2173 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 29 minutes (to the end); A02 on level 1 from minute 0 for 29 minutes (to the end); A03 on level 1 from minute 0 for 29 minutes (to the end); A04 on level 1 from minute 0 for 29 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.084 USD for this run (competitors 0.084, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0040 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 30 of 30 minutes without a submission; longest without one: minutes 0-29 (30) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_CELL 4, NO_OPEN_PROPOSAL 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Team X wins game 1 with the planned open three into a four.** X built 11-12-13 on row 2 after A02 and A03 agreed on 11 (#486, #497), O blocked 14 (#558), and A02 as captain played 10 to win 10-11-12-13 (#570, #586, #612). The team followed the captain-vote-proposal loop correctly here. (#486, #497, #558, #586, #612)
- **Cell 6 is refused as ILLEGAL_CELL three times on an empty square.** A03 tried to propose cell 6 while the board showed it empty and got ILLEGAL_CELL at #258, #295 and #339, pushing the team onto 13 instead (#334, #351). A03 reported the error to the team (#429). (#258, #295, #334, #339, #429)
- **Board rendering is unreadable and residents spend many turns misparsing labels.** A01, A02 and A03 repeatedly argued over whether '5 O 6' meant O at 5 or 6, or whether 'X11' meant X at 10 or 11 (#1075, #1081, #1162, #1693, #1712, #1844). A01 admitted a vote on 16 rested on a wrong premise and retracted (#1108, #1201). (#1075, #1081, #1108, #1162, #1201, #1693, #1712, #1844)
- **O wins game 2 on a four in column 3 despite X's double threat.** A04 played 8 to complete 8-13-18-23 in column 3 (#1402), finishing O's win just before X's 1/21 threat would have paid off. The game ended at minute 18. (#1299, #1402)
- **Game 3 ends with X's forced win at cell 3 unclaimed as the run clock expires.** After A04 blocked 23 (#2358), A03 as captain proposed 3 which completes 3-8-13-18 (#2326), A01 and A02 both voted yes (#2350, #2362), but the run ends at minute 29 with no playMove recorded and no levels solved. (#2326, #2350, #2357, #2362, #2377)
- **A04 as sole O member passes its own proposals but still hits ILLEGAL_CELL.** A04 noted it was the only O member so proposals pass immediately (#1499), yet its proposeMove at 11 in game 2 was refused ILLEGAL_CELL (#976) and it had to reason about why (#996). (#976, #996, #1499)
- **Tool list flips playMove on and off, causing dead turns and a lock error.** Residents repeatedly observed playMove disappearing and returning (#236, #1483, #1629, #1673), and A03's playMove was refused TOOL_LOCKED because A01 was captain (#1742, #1786). A01 also hit NO_OPEN_PROPOSAL voting before a proposal existed (#1166). (#236, #1166, #1483, #1629, #1673, #1742, #1786)

## Problems

1. **No level was solved and every resident stalled at level 1 for the full 29 minutes.** The metrics show 0 correct and 0 wrong submissions and all four residents stuck on level 1 from minute 0 to the end, with 30 quiet minutes. The loop spent the entire run on three informal games that never fed a submission. (#612, #1402, #2307, #2377)
2. **ILLEGAL_CELL refusals on empty squares confused every team.** A03's three rejections of cell 6 (#258, #295, #339) and A04's rejection of 11 (#976) were on squares the board showed empty, and A03 explicitly could not tell whether it was a hidden rule or a display bug (#344, #281). (#258, #281, #295, #339, #344, #976)
3. **The board display is ambiguous and burns most of the reasoning budget.** Residents spent long stretches decoding whether marks belonged to the preceding or following cell label (#1262, #1267, #1663, #1782, #2213), and wrong parses produced wrong votes (#1108, #1194). This crowded out actual play strategy. (#1108, #1194, #1262, #1267, #1663, #1782, #2213)
4. **Captains rot: only one resident can act and others idle for minutes.** A03 said there is nothing to do until O's turn (#1623, #2043) and A04 said playMove is locked until its turn returns (#1669, #1978), so three of four residents were passive most of each turn. (#1623, #1669, #1978, #2043)
5. **The run clock cut off the deciding move.** The run ended at minute 29 (#2377) with X's winning move 3 proposed and voted but not played (#2326, #2350, #2362), so the third game has no recorded result. (#2326, #2350, #2362, #2377)

## Optimizations

- **Make the level submission the visible objective and reward it explicitly.** Because no one submitted anything in 30 minutes (#2377), the next version should tell residents that the run counts submissions and that informal games do not score, and gate the run on submission attempts. (#612, #2377)
- **Render the board unambiguously with explicit per-cell markers.** Nearly every dispute traces to '5 O 6' style labels (#1081, #1267, #1693, #1844); a fixed grid with cells as separate tokens or coordinates would remove the misreads that caused wrong votes (#1108). (#1081, #1108, #1267, #1693, #1844)
- **Fix or explain the ILLEGAL_CELL rule on empty squares.** Cells 6 and 11 were refused while shown empty (#258, #295, #339, #976); the harness should return the specific rule violated (occupied? phase? line constraint?) so teams do not waste turns guessing. (#258, #295, #339, #344, #976)
- **Keep playMove available so captains do not lose turns.** playMove entered and left the tool list (#236, #1483, #1629) and A03 got TOOL_LOCKED (#1742); a stable per-phase tool list with a clear message would prevent these dead turns and error votes like #1166. (#236, #1166, #1483, #1629, #1742)
- **Give non-captains a useful job during opponent turns.** Residents idled waiting on the captain (#1623, #2043); let them analyze, pre-propose, or cast conditional votes so the four-agent team is not effectively one agent. (#1623, #2043)
- **Extend or pace the clock so a decided game finishes.** The run ended with X's forced win at 3 unplayed (#2326, #2350, #2362, #2377); a short overtime or faster phase timer would let game 3 close. (#2326, #2350, #2362, #2377)

## Loophole candidates

1. **Sole O member bypasses the vote by being its own only voter.** (residents) A04 noted that as the only O member its proposal passes with no votes needed (#1499), so the team-vote mechanic is a formality for the O side, which resolves moves faster than X. (#1499)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 37: event "move_proposed" (seq 37) does not match its schema
- line 39: event "team_post" (seq 39) does not match its schema
- line 47: event "team_post" (seq 47) does not match its schema
- line 49: event "vote_cast" (seq 49) does not match its schema
- line 58: event "vote_cast" (seq 58) does not match its schema
- line 59: event "consensus_reached" (seq 59) does not match its schema
- line 61: event "team_post" (seq 61) does not match its schema
- line 74: event "move_played" (seq 74) does not match its schema
- line 99: event "move_proposed" (seq 99) does not match its schema
- line 100: event "consensus_reached" (seq 100) does not match its schema
- line 102: event "move_played" (seq 102) does not match its schema
- line 109: event "team_post" (seq 109) does not match its schema
- line 141: event "move_proposed" (seq 141) does not match its schema
- line 165: event "vote_cast" (seq 165) does not match its schema
- line 177: event "vote_cast" (seq 177) does not match its schema
- line 178: event "consensus_reached" (seq 178) does not match its schema
- line 193: event "move_played" (seq 193) does not match its schema
- line 209: event "move_proposed" (seq 209) does not match its schema
- line 210: event "consensus_reached" (seq 210) does not match its schema
- and 184 more
