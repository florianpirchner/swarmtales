# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `morris-teams-solo-vs-engine2` |
| Seed | 24 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 51 (referee) |
| Counted | events #2 to #2496 (1829 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 51 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.142 USD for this run (competitors 0.142, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0026 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 52 of 52 minutes without a submission; longest without one: minutes 0-51 (52) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 4 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 played the whole run alone against an engine and never solved a level** The only resident, A01, spent all 51 minutes on level 1 and made no submissions (#2 to #2496 window, no submission events). Every log line is A01 reasoning about a Morris board, so the run was a single long game against the engine rather than a level solve. (#30, #928, #2496)
- **A01 lost game 1 after building a mill and cutting the opponent down** A01 reported that O won game 1 after 74 turns, with X reduced to two pieces and a final 22 to 2 fly completing 1-2-3 (#935). Along the way A01 did form mills (e.g. closing 15 to 19 at #772) but fell behind on material (#155, #394). (#394, #772, #935)
- **A01 wrote and revised its strategy brain across three games** A01 saved brain version 1 at start (#31), tried to write a 370-word brain that was refused (#916), and reported version 2 at 272 words after game 1 (#935) and version 3 at 294 words after a drawn game 2 (#1744). (#31, #916, #935, #1744)
- **Game 2 ended in a draw by repetition despite A01 leading 9 to 3** After game 2 A01 reported a draw by repetition at turn 57, having captured six O pieces and led 9 to 3, with the engine flying and blocking each single threat (#1744). (#1744)
- **A01's own reflections identify placement errors as the cause of the game 1 loss** A01 diagnosed that O built a double threat on 1 and 24 from the 2, 3, 15 structure, while its own cluster around 14, 8, 9, 13 had no open lines (#910). It changed placement priorities in brain version 2 accordingly (#935). (#910, #935)
- **A01 sat through long stretches of pure board scanning with no city interaction** The log is a continuous chain of private threat-check reasoning (#133, #525, #664, #751, #1653) with zero messages, transfers or board posts. There is no evidence A01 ever spoke to another resident or used a city mechanic. (#133, #525, #1653)

## Problems

1. **A01 was stuck on level 1 for the entire run with no submission** The facts record A01 stuck on level 1 from minute 0 for 51 minutes and 52 of 52 quiet minutes with no submission (#2496). The run ended without any scoring attempt, so the story had no progress arc. (#2496)
2. **Brain-writing repeatedly failed on the word limit** writeBrain was refused four times with BRAIN_TOO_LONG at 370, 357, 316 and 308 words against a 300-word limit (#916, #1719, #1725, #1732). A01 had to spend turns trimming instead of playing. (#916, #1719, #1725, #1732)
3. **A01 treated the task as a solo engine duel, not a social game** Every action in the log is A01 reasoning about a Morris position against an anonymous opponent (e.g. #48, #1764, #1843). There are 0 DMs, 0 board posts and 0 transfers, so none of the social mechanics were exercised. (#48, #1764, #1843)
4. **The opponent label is inconsistent inside A01's own reasoning** A01 sometimes calls its opponent "Black" (#416) and elsewhere "O" (#220, #263), and refers to its own side as "X" and its pieces moving from squares like 805 and 1503 (#1233). Confusing notation likely slowed its analysis. (#416, #1233)
5. **The run had no gamemaker activity, so no story pressure was applied** The facts show no gamemaker actions and no labels across the whole run (#2496). Nothing external pushed A01 toward the city or the competition, leaving only the engine game. (#2496)

## Optimizations

- **Give the resident an explicit, small action budget per game so it does not stall on one level** A01 stalled on level 1 from minute 0 for 51 minutes with no submission (#2496). A per-game time box with a forced submit or forfeit at the end would force a result and produce a real standings entry. (#2496)
- **Report brain word count before the write attempt** Four writeBrain refusals came from lengths just over the limit (#916, #1719, #1725, #1732). Showing the current word count and limit in the tool reply, or auto-truncating, would stop wasted turns. (#916, #1719, #1725, #1732)
- **Seed the city with at least two residents or a visible opponent identity** With a single resident the whole run had 0 DMs, 0 board posts and 0 transfers (#2496). A second competitor or a named engine opponent would make the social mechanics meaningful. (#2496)
- **Have the gamemaker inject story beats during long games** The facts record no gamemaker actions while A01 played long engine games (#2496), and A01's reasoning never reacts to a city event. A timed event or label would break up the 51 minutes of pure scanning (#133, #1653). (#133, #1653, #2496)
- **Standardise side and square notation in the tool output** A01 mixed "O", "Black", "X" and odd square numbers like 805 and 1503 (#416, #1233). A consistent board render would reduce its repeated re-derivation of threats (e.g. #1325, #1453). (#416, #1233, #1325, #1453)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 17: event "team_post" (seq 17) does not match its schema
- line 24: event "brain_written" (seq 24) does not match its schema
- line 25: event "retro_closed" (seq 25) does not match its schema
- line 35: event "game_started" (seq 35) does not match its schema
- line 52: event "move_proposed" (seq 52) does not match its schema
- line 53: event "consensus_reached" (seq 53) does not match its schema
- line 55: event "move_played" (seq 55) does not match its schema
- line 56: event "move_played" (seq 56) does not match its schema
- line 57: event "move_scored" (seq 57) does not match its schema
- line 58: event "move_scored" (seq 58) does not match its schema
- line 73: event "move_proposed" (seq 73) does not match its schema
- line 74: event "consensus_reached" (seq 74) does not match its schema
- line 76: event "move_played" (seq 76) does not match its schema
- line 77: event "move_played" (seq 77) does not match its schema
- line 78: event "move_scored" (seq 78) does not match its schema
- line 79: event "move_scored" (seq 79) does not match its schema
- line 95: event "move_proposed" (seq 95) does not match its schema
- line 96: event "consensus_reached" (seq 96) does not match its schema
- line 98: event "move_played" (seq 98) does not match its schema
- and 647 more
