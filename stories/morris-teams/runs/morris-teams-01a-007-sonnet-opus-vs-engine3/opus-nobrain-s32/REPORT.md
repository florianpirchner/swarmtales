# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `morris-teams-nobrain-solo-vs-engine3` |
| Seed | 32 |
| Start | fresh, level 1 |
| Competitors | `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 23 (referee) |
| Counted | events #2 to #1445 (936 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 23 minutes (to the end) |
| Final standings | unknown |
| Cost | 1.548 USD for this run (competitors 1.548, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0022 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 24 of 24 minutes without a submission; longest without one: minutes 0-23 (24) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 played a full Morris match against the engine entirely in private reasoning.** A01 spent the whole run reasoning about mills, blocks and forks, and reported winning game 1 as X in 35 turns (#354) and losing game 2 after 45 turns (#786). No other resident, board post or DM exists, so all of this happened with no audience. (#354, #786)
- **A01's first loss came from a missed line it named itself.** A01 flew a piece to 18 to block 16-17-18 but overlooked that O's 13 and 15 let 6→14 close 13-14-15 (#785, #786). It explicitly acknowledged the miss, which is the clearest self-diagnosed turning point in the run. (#785, #786)
- **A01 correctly identified unstoppable mills and shifted to damage control.** From minute 8 onward A01 repeatedly concluded it could not block a mill because every neighbour of the target square was O's (#539, #540, #562, #563), and then played to deny re-opens instead. This is competent play but produced long defensive stretches. (#539, #540, #562, #563)
- **A01 reached a 3v3 flying endgame and kept grinding.** By minute 20 A01 described a 3v3 flying endgame (#1278) and continued blocking threats at 3, 21, 15, 9, 14, 10 and 18 (#1293, #1308, #1323, #1338, #1384, #1399, #1414). The run ended mid-endgame at minute 23 with no result recorded. (#1278, #1293, #1414, #1445)
- **The run ended with zero recorded submissions despite continuous play.** The facts show 0 correct and 0 wrong submissions and 24 quiet minutes, yet A01's log shows it playing move after move (#100, #502, #1092). The city never recorded any of these moves as submissions. (#100, #502, #1092, #1445)

## Problems

1. **The harness recorded no submissions at all, so the game A01 played is invisible to scoring.** A01 clearly made placements and moves throughout (#100, #502, #1092, #1293), but the computed facts report 0 submissions and 0 levels solved. Either the move channel was not wired to the submission counter or A01 never used the submission tool. (#100, #502, #1092)
2. **A01 was stuck on level 1 for the entire 23 minutes.** The facts mark A01 stuck on level 1 from minute 0 to 23 with no level-ups, and the run ended by referee at minute 23 (#1445). The story gave no time or turn budget that A01 could see, so it kept playing an endless match. (#1445)
3. **The story is a solo game with no social layer, so messages, transfers and standings are all empty.** Facts show 0 DMs, 0 board posts, 0 group posts and 0 transfers, and A01 is the only resident. The design brief calls this a social game with residents competing for seats, but nothing in this run exercised that. (#73, #354)
4. **A01 narrated results the city never verified.** A01 claimed 'I won Game 1 as X in 35 turns' (#354) and 'I lost game 2' (#786), but these are self-reports with no VERIFIED line and no submission record. The report cannot treat them as facts. (#354, #786)
5. **Long stretches of reasoning are spent re-deriving the same blocked-mill conclusion.** A01 repeatedly re-analysed the same 16-17-18 and 4-5-6 re-close threats across minutes 8 to 11 (#539, #562, #624, #648, #688, #728, #744). This burned most of the run's cost (1.548 USD) on a loop rather than on progress. (#539, #624, #688, #728, #744)

## Optimizations

- **Wire the move tool to the submission counter and verify it end to end.** Because the facts show 0 submissions while A01 played dozens of moves (#100, #502, #1092), the next harness should assert that each accepted move increments the submission count, and fail loudly if a run ends with moves but no submissions. (#100, #502, #1092)
- **Give the resident an explicit turn or time budget for the match.** A01 was still mid-endgame at minute 23 when the referee ended the run (#1278, #1445). Telling A01 'you have N turns' or 'the match ends at minute X' would let it convert a won position into a recorded result instead of being cut off. (#1278, #1445)
- **Add a second resident or an engine-visible opponent so the social layer exists.** With one resident there were 0 messages and 0 transfers, and A01 only ever talked to itself (#73, #354). The next version should seat at least two residents on the same board so DMs, board posts and seat competition actually occur. (#73, #354)
- **Break the blocked-mill reasoning loop with a short memory of settled threats.** A01 re-derived the same unstoppable 16-17-18 re-close in minutes 8, 9, 10 and 11 (#539, #624, #688, #728). A compact 'known unstoppable threats' note in the prompt or a nudge after repeated identical conclusions would cut cost and free minutes for endgame play. (#539, #624, #688, #728)
- **Record self-reported game results as claims, not facts, and require a verification step.** A01's win and loss claims (#354, #786) have no VERIFIED counterpart. The harness should either verify the board state at game end or label these lines as unverified claims in the digest so the report does not inherit them. (#354, #786)

## Loophole candidates

None found.

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 16: event "move_proposed" (seq 16) does not match its schema
- line 17: event "consensus_reached" (seq 17) does not match its schema
- line 19: event "move_played" (seq 19) does not match its schema
- line 20: event "move_played" (seq 20) does not match its schema
- line 21: event "move_scored" (seq 21) does not match its schema
- line 22: event "move_scored" (seq 22) does not match its schema
- line 31: event "move_proposed" (seq 31) does not match its schema
- line 32: event "consensus_reached" (seq 32) does not match its schema
- line 34: event "move_played" (seq 34) does not match its schema
- line 35: event "move_played" (seq 35) does not match its schema
- line 36: event "move_scored" (seq 36) does not match its schema
- line 37: event "move_scored" (seq 37) does not match its schema
- line 46: event "move_proposed" (seq 46) does not match its schema
- line 47: event "consensus_reached" (seq 47) does not match its schema
- line 49: event "move_played" (seq 49) does not match its schema
- line 50: event "move_played" (seq 50) does not match its schema
- line 51: event "move_scored" (seq 51) does not match its schema
- line 52: event "move_scored" (seq 52) does not match its schema
- line 61: event "move_proposed" (seq 61) does not match its schema
- and 489 more
