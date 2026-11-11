# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-coach-g4-p80` |
| Seed | 47 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 52 (referee) |
| Counted | events #3 to #3152 (2553 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 52 minutes (to the end); A02 on level 1 from minute 0 for 52 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.245 USD for this run (competitors 0.245, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0049 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 53 of 53 minutes without a submission; longest without one: minutes 0-52 (53) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 4, BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 grabbed a queen-for-bishop in Game 3 and won on material** A01 noted its bishop on h4 had a clear diagonal to e7 once Black's knight left f6 (#2210), and A02 admitted the Nd7 move had hung the queen (#2225). The game ended at the 40-move cap, with A02 reporting a 1-0 loss on material roughly 21 to 15 (#2723, #2736). (#2210, #2225, #2723, #2736)
- **A02 repeatedly lost material by miscalculating squares and defenders** A02's Qxc7 overlooked the Rc1 recapture (#1335, #1363), the Bd4 capture was missed after misplacing its knight (#1450, #1467), and it later lost a knight on d5 (#3066) before finally trading its queen for a rook (#3146). These blunders let A01 build decisive material edges in two games. (#1335, #1363, #1450, #1467, #3066, #3146)
- **The full match was played without a single level-up or submission** Despite many moves being played in the logs, the computed facts show zero correct submissions and both residents stuck on level 1 for all 52 minutes (no level-ups recorded). All four games ended at the 40-move cap or in draws, so no level was ever solved. (#975, #1819, #2723, #2736)
- **Both residents rewrote their strategy brains between games** A01 saved brain version 3 after Game 2 to check which defenders a move removes (#1819), and A02 saved version 4 after losing its queen in Game 3 (#2723). A02's earlier brain writes were rejected for exceeding the word limit (#966, #1814) before it succeeded. (#966, #1814, #1819, #2723)
- **Opening play was consistent Ruy Lopez across all games** Every game opened Bb5 followed by ...a6 and Ba4 (Morphy Defence) — A01 chose Ba4 at #1923, A02 played the ...a6 challenge at #113, and the pattern repeats at #2784/#2801. The residents settled into a stable but unchanging repertoire with no variation. (#96, #113, #1923, #2784, #2801)
- **The run ended with A02 far behind and considering resignation** At minute 51 A02 recognized it had traded its queen for a rook and was down 18 to 29 (#3146), after A01's Qxf4 pressure (#3117, #3132). The referee ended the run at minute 52 (#3152) before any further resolution. (#3117, #3132, #3146, #3152)

## Problems

1. **Both residents stalled on level 1 for the entire run** The computed facts show A01 and A02 stuck on level 1 from minute 0 to 52 with 53 quiet minutes and zero submissions. Whatever level-1 requirement was (submission of a correct move or answer), neither resident ever produced one. (#39, #47, #975, #2723)
2. **Repeated illegal moves from miscalculating piece geometry** The city refused four ILLEGAL_MOVE attempts: A01 tried f4d6 through a blocked diagonal (#419), A02 tried e8e7 with a piece that had no legal move (#688), and A02 tried g6h7 without checking attacked squares (#839). A02 then failed e7d7, a non-diagonal bishop move (#2066). (#419, #688, #839, #2066)
3. **Brain writes failed on word limit twice** A02's brain was rejected as BRAIN_TOO_LONG at 164 words (#966) and again at 194 words (#1814) against a 150-word limit. This wasted turns and delayed its strategy updates until later versions succeeded. (#966, #1814)
4. **Residents misread their own turn state and wasted turns** A01 concluded playMove was locked and checked the board repeatedly (#105, #1874, #2826), and A02 similarly waited or checked board rather than moving (#424, #1085, #2811). Several reasoning blocks were spent confirming whose turn it was instead of playing. (#105, #424, #1085, #1874, #2811, #2826)
5. **No messages, transfers or gamemaker actions occurred** The computed facts record 0 DMs, 0 board posts, 0 group posts, 0 transfers and no gamemaker actions. The social-competition and negotiation mechanics the story intends were entirely unused. (#54, #58, #975, #2723)

## Optimizations

- **Give an explicit level-1 win condition and surface it in the prompt** Because neither resident ever submitted anything (facts: 0 correct, 0 wrong, 53 quiet minutes), the level requirement was never visible enough. State the exact action that counts as a submission and show progress toward it each turn; evidence of the stall is #39, #47 and #975. (#39, #47, #975)
- **Auto-check move legality before submission** Four ILLEGAL_MOVE refusals (#419, #688, #839, #2066) show residents guessing geometry. A pre-move validator that lists legal moves of the intended piece would convert those wasted turns into play. (#419, #688, #839, #2066)
- **Raise or auto-trim the brain word limit** Two BRAIN_TOO_LONG refusals (#966 at 164 words, #1814 at 194 words) blocked strategy updates. Either raise the 150-word cap or have the harness summarize over-limit text so the lesson is saved. (#966, #1814)
- **Add a turn indicator to stop turn-state misreads** A01 and A02 repeatedly checked the board to determine whose turn it was (#105, #424, #1085, #1874, #2826). A visible 'your turn / opponent's turn' flag would cut these wasted reasoning cycles. (#105, #424, #1085, #1874, #2826)
- **Seed a social mechanic that the residents actually use** The facts record 0 DMs, 0 board posts, 0 transfers, so the social-competition premise never activated. Prompt residents with a concrete first social action (e.g. one message per game transition, cf. the idle #54/#58) to make messages and transfers part of the run. (#54, #58, #975)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 26: event "brain_written" (seq 26) does not match its schema
- line 27: event "retro_closed" (seq 27) does not match its schema
- line 33: event "brain_written" (seq 33) does not match its schema
- line 34: event "retro_closed" (seq 34) does not match its schema
- line 60: event "game_started" (seq 60) does not match its schema
- line 68: event "move_played" (seq 68) does not match its schema
- line 69: event "move_scored" (seq 69) does not match its schema
- line 76: event "move_played" (seq 76) does not match its schema
- line 77: event "move_scored" (seq 77) does not match its schema
- line 83: event "move_played" (seq 83) does not match its schema
- line 84: event "move_scored" (seq 84) does not match its schema
- line 91: event "move_played" (seq 91) does not match its schema
- line 92: event "move_scored" (seq 92) does not match its schema
- line 99: event "move_played" (seq 99) does not match its schema
- line 100: event "move_scored" (seq 100) does not match its schema
- line 116: event "move_played" (seq 116) does not match its schema
- line 117: event "move_scored" (seq 117) does not match its schema
- line 131: event "move_played" (seq 131) does not match its schema
- and 579 more
