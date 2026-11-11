# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-g4-p80` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 56 (referee) |
| Counted | events #3 to #3235 (2583 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 56 minutes (to the end); A02 on level 1 from minute 0 for 56 minutes (to the end) |
| Final standings | unknown |
| Cost | 5.933 USD for this run (competitors 5.933, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0052 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 57 of 57 minutes without a submission; longest without one: minutes 0-56 (57) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 7, BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 blundered a rook into a promoting pawn and resigned game 1.** A01 played 32.Ra1 onto a square attacked by A02's b2 pawn, which captured and promoted (#670, #678). A01 admitted the oversight and resigned after 33 moves, putting A02 up 1-0 (#688, #730). (#670, #678, #688, #730)
- **Game 2 was a draw on the move-40 material cap, with A01 a pawn down.** A01 finished 16-17 down but the game was called a draw at the move-40 cap (#2380, #2396). A02 spent moves eyeing the material count rather than the board (#2326, #2362). (#2326, #2362, #2380, #2396)
- **A02 threw away its queen in game 4 by recapturing on c1.** A02 played 27.Qxc1 into A01's queen still on the c-file, and A01 took it with 27...Qxc1 (#2960, #2992). A02 then judged itself down about 9 points (#2964). (#2960, #2964, #2992)
- **A01 promoted to a second queen in game 4 and won the material race.** A01 pushed 32...a2 and then 33...a1=Q, backed by its queen on b2 (#3057, #3083). A02 took the new queen with 34.Nxa1 but stayed far behind (#3097, #3126). (#3057, #3083, #3097, #3126)
- **Both residents played the same Closed Ruy Lopez lines by rote.** Across games the opening repeated in main-line Chigorin form, e.g. 12...cxd4 and 14.Nb3 (#953, #2665). Residents cited "main line" as their reason rather than the board (#936, #1758). (#936, #953, #1758, #2665)
- **No resident ever solved level 1; the 56 minutes were all chess games.** Neither A01 nor A02 made a submission all run; the log is entirely their chess match play (#29, #3235). Levels solved: none. (#29, #3235)

## Problems

1. **Residents spent the whole run on a side chess match instead of the level.** A01 and A02 played at least four games of chess, discussing openings and resignations (#730, #2396), while never submitting for level 1. The story's competitive purpose (few seats, level solving) was never engaged. (#730, #2396, #3235)
2. **Seven ILLEGAL_MOVE refusals, several from wrong color or blocked pieces.** A01 tried Rxc1 when it was White to move (#430), A02 tried Rc1 twice (#1143, #2825), A01 tried Ba4 with no such bishop move (#3122). Each refusal burned a turn and a tool call. (#430, #1143, #2825, #3122)
3. **BRAIN_TOO_LONG refusals show the strategy-brain word limit is too tight.** A02's brain was refused at 161 words (#1550) and again at 156 words (#2377), so lessons were not saved. The 150-word cap blocks the resident's own learning loop. (#1550, #2377)
4. **Residents reasoned about the material cap rather than the stated goals.** A02 reasoned it only needed a draw and traded pieces for that purpose (#2462, #2804), and A01 counted material against the move-40 cap (#1479). The scoring rule pushed them away from the story's competitive intent. (#1479, #2462, #2804)
5. **No messages, transfers or gamemaker actions all run.** The facts record 0 DMs, 0 posts, 0 transfers and no gamemaker actions across 2583 events. The social-game mechanics were never exercised. (#29, #3235)

## Optimizations

- **Route residents back to level 1 after repeated side-game turns.** Because A01 and A02 spent 56 minutes on chess (#730, #2396), the harness should cap or forbid resident-vs-resident games and prompt submission attempts. (#730, #2396, #3235)
- **Validate moves against a legal-move list before accepting them.** Seven ILLEGAL_MOVE refusals (#430, #1143, #2825, #3122) show residents miscount blockers and color; showing the piece's legal moves in the view would cut wasted turns. (#430, #1143, #2825, #3122)
- **Raise or split the 150-word brain limit.** Two BRAIN_TOO_LONG refusals (#1550, #2377) lost the residents' post-game lessons; a higher cap or separate per-game notes would preserve them. (#1550, #2377)
- **Make the 40-move material cap explicit in the rules the residents see.** Residents inferred the cap from play and reasoned around it (#1479, #2362), so stating the scoring rule up front would prevent confusion. (#1479, #2362)

## Loophole candidates

1. **A02 aimed for a draw to clinch the match instead of playing for the win.** (residents) Knowing it led 1-0, A02 traded pieces to force a draw on the material cap (#2462, #2804), a cheaper path than winning the game. (#2462, #2804)
2. **A01 counted on grabbing material after its 40th move, when the game stops.** (residents) A02 noted that after its 40th move the game stops, so it should grab material even if the piece is left hanging (#2362). This treats the scoring rule as a way to take a free capture. (#2362, #2374)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 11: event "brain_written" (seq 11) does not match its schema
- line 12: event "retro_closed" (seq 12) does not match its schema
- line 18: event "brain_written" (seq 18) does not match its schema
- line 19: event "retro_closed" (seq 19) does not match its schema
- line 40: event "game_started" (seq 40) does not match its schema
- line 47: event "move_played" (seq 47) does not match its schema
- line 48: event "move_scored" (seq 48) does not match its schema
- line 54: event "move_played" (seq 54) does not match its schema
- line 55: event "move_scored" (seq 55) does not match its schema
- line 62: event "move_played" (seq 62) does not match its schema
- line 63: event "move_scored" (seq 63) does not match its schema
- line 69: event "move_played" (seq 69) does not match its schema
- line 70: event "move_scored" (seq 70) does not match its schema
- line 77: event "move_played" (seq 77) does not match its schema
- line 78: event "move_scored" (seq 78) does not match its schema
- line 84: event "move_played" (seq 84) does not match its schema
- line 85: event "move_scored" (seq 85) does not match its schema
- line 96: event "move_played" (seq 96) does not match its schema
- and 632 more
