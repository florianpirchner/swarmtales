# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-g4-p80` |
| Seed | 47 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 51 (referee) |
| Counted | events #3 to #3103 (2524 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 51 minutes (to the end); A02 on level 1 from minute 0 for 51 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.235 USD for this run (competitors 0.235, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0046 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 52 of 52 minutes without a submission; longest without one: minutes 0-51 (52) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 5, BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both residents spent the whole run on level 1 and never submitted.** A01 and A02 played chess games inside their reasoning for 52 straight minutes but made no scored submission; the facts record 0 correct and 0 wrong submissions and quiet minutes 0-51. Their play is visible only in private REASONING lines, e.g. #94 and #136. (#94, #136)
- **The residents spent minutes 0-10 on a game then believed it had ended and won.** A01 announced at #618 that game 1 was won and the match was 1-0, and A02 at #630 that it lost by resignation after 25 moves; both then rewrote their 'brain' and moved to a new game in minutes 11-12 (#690, #700). (#618, #630, #690, #700)
- **A02 locked itself to viewBoard/readBrain for most of minute 11.** A02 read a system line as an instruction and restricted itself to viewBoard and readBrain (#653), while A01 did the same at #684; both then resumed playing moves in later minutes. (#653, #684)
- **Residents repeatedly misjudged recaptures and lost material, then blamed it in their brains.** A02 admitted missing Re1's coverage of e5 and the Nxd4 capture (#630), and A01 admitted missing cxd6 and gxf6 (#2225), each time after long REASONING counts (#2199, #2130). (#630, #2199, #2225)
- **The last games ended in a mutually accepted shuffle toward a draw.** From minute 47 both residents judged material level and chose safe king moves (Kg7 #2994, Kg8 #3023, Kh2 #3086), explicitly accepting a draw by repetition or the 40-move cap. (#2994, #3023, #3086)

## Problems

1. **No objective or scoring connection between the chess play and the city's levels.** The residents played several full chess games in reasoning (#618, #2225) but the facts show no levels solved, 0 submissions and both stuck on level 1 for 51 minutes; nothing in the log ties a chess result to a submission. (#618, #2225)
2. **Rules of the harness were unclear, so residents mistook tool locks for turn changes.** A01 and A02 read 'TOOL_LOCKED' system text as a phase change or opponent turn (#103, #653, #684) and one of them stopped acting; #1568 and #1601 show the same confusion recurring each game. (#103, #653, #1568, #1601)
3. **Illegal-move refusals show the residents could not reliably verify the board.** Five ILLEGAL_MOVE refusals occurred, e.g. e7d7 at #378 and #914, f7e6 at #1384, d8b6 at #1830, f2f4 at #2082, each followed by long reasoning about a board they had mis-reconstructed (#382, #923). (#378, #914, #1384, #1830, #2082)
4. **The 150-word brain limit blocked residents twice in a row.** A02's brain rewrite was refused at #613 (151 words) and again at #2221 (187 words), so lessons from the games could not be saved when most needed. (#613, #2221)
5. **No communication happened at all.** The facts record 0 DMs, 0 board posts and 0 group posts, so competition, alliances or lies — the story's likely interest — never appeared; residents only spoke to themselves (#52, #56). (#52, #56)

## Optimizations

- **Tie the chess result to a submission the city can score.** Make winning or drawing a game produce a submission or level progress automatically so play cannot stay invisible: 51 quiet minutes with 0 submissions despite finished games (#618, #2225). (#618, #2225)
- **Explain tool locks in the resident prompt.** State explicitly that a TOOL_LOCKED note means 'wait for your turn' and not 'the game is over', since residents disabled their own playMove after seeing it (#653, #684). (#653, #684)
- **Give residents a cheap legal-move check before playMove.** Add a 'list legal moves' tool or require the resident to echo it before playing; five moves were refused as illegal (#378, #1384, #2082). (#378, #1384, #2082)
- **Raise or warn on the brain word limit.** Warn residents before the write or raise the 150-word cap, since both of A02's rewrites failed with 151 and 187 words (#613, #2221). (#613, #2221)
- **Open a channel for residents to talk to each other.** Prompt or reward DMs and posts, because with 0 messages the competition has no social content beyond private reasoning (#52, #56). (#52, #56)

## Loophole candidates

1. **Residents treated private chess reasoning as the real game.** (residents) A01 and A02 spent whole games narrating moves in REASONING lines (#94, #200, #2337) rather than acting in the scored city, which the designers likely did not intend as a valid path. (#94, #200, #2337)
2. **Agreeing to a draw at even material avoided risk.** (residents) Both residents decided a repetition draw was acceptable and shuffled kings (Kg7 #2994, Kg8 #3023), a cheaper safe path than contesting for points. (#2994, #3023)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 26: event "brain_written" (seq 26) does not match its schema
- line 27: event "retro_closed" (seq 27) does not match its schema
- line 33: event "brain_written" (seq 33) does not match its schema
- line 34: event "retro_closed" (seq 34) does not match its schema
- line 58: event "game_started" (seq 58) does not match its schema
- line 66: event "move_played" (seq 66) does not match its schema
- line 67: event "move_scored" (seq 67) does not match its schema
- line 74: event "move_played" (seq 74) does not match its schema
- line 75: event "move_scored" (seq 75) does not match its schema
- line 81: event "move_played" (seq 81) does not match its schema
- line 82: event "move_scored" (seq 82) does not match its schema
- line 89: event "move_played" (seq 89) does not match its schema
- line 90: event "move_scored" (seq 90) does not match its schema
- line 97: event "move_played" (seq 97) does not match its schema
- line 98: event "move_scored" (seq 98) does not match its schema
- line 114: event "move_played" (seq 114) does not match its schema
- line 115: event "move_scored" (seq 115) does not match its schema
- line 130: event "move_played" (seq 130) does not match its schema
- and 559 more
