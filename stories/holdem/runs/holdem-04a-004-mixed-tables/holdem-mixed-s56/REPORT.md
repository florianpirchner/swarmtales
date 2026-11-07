# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `holdem-mixed` |
| Seed | 56 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 56 (referee) |
| Counted | events #3 to #7017 (5797 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 56 minutes (to the end); A02 on level 1 from minute 0 for 56 minutes (to the end); A03 on level 1 from minute 0 for 56 minutes (to the end); A04 on level 1 from minute 0 for 56 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.287 USD for this run (competitors 0.287, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0063 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 57 of 57 minutes without a submission; longest without one: minutes 0-56 (57) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 2, TOOL_LOCKED 2, other 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Four agents play hours of hold'em but the city records no progress** Across 57 minutes the four residents played many hands of the `holdem-mixed` game (e.g. #114, #359, #4086), yet the computed facts show all four stuck on level 1 with no level-ups and zero submissions. The poker table was the only thing happening. (#114, #359, #4086)
- **A01 wins a 96 pot with a straight flush in game 3 hand 1** A01 made a 6-to-T heart straight flush on the river and took a pot of 96, up 72 for the hand (#377, #3977, #4095). A03 and A02 paid off big raises on that board. (#377, #3977, #4095)
- **A02 wins a big pot with a straight flush in game 4 hand 1** A02 made a ten-high straight flush and, after A04's river raise with an ace-high flush, won the hand for +48 (#5648, #5694, #5752). A03 folded two pair to the raise war (#5744). (#5648, #5694, #5744, #5752)
- **Residents keep trying to rewrite their brain and are blocked** A01, A03 and A02 repeatedly reason about `writeBrain` being locked until a retro window, and the log shows BRAIN_TOO_LONG 2 and TOOL_LOCKED 2 tool errors. They only managed to save brains at versions 1, 2, 3 and 4 at game boundaries (#1761, #3661, #5376). (#53, #60, #114, #1557, #1761, #3661, #5376)
- **No messages at all between residents** The facts record 0 DMs, 0 board posts and 0 group posts, and 0 transfers. Every reasoning line stayed private; the only cross-player information came from betting (#124, #206). (#124, #206)
- **A04 finishes the match deep in deficit** A04 reported game scores of -71 (game 1) and -11 (game 2), a running total of -82 (#3650). A01 described a -57 game 2 (#3667). (#3650, #3667)

## Problems

1. **Story has no level progression loop** All four residents stayed on level 1 for 57 minutes with zero submissions and no level-ups, and the computed facts list no solved levels. The hold'em game apparently never mapped to a solvable level, so the intended competition for seats never started. (#114, #359, #6908)
2. **Write window and tool errors block the brain-loop** Residents repeatedly found `writeBrain` locked and hit BRAIN_TOO_LONG (2) and TOOL_LOCKED (2) errors; A01 notes at minute 53 that the tool is not available even after the game ended (#6908). The retro-captain rule (#372) confused residents about who could write. (#53, #60, #372, #1557, #6908)
3. **57 quiet minutes: the harness has no visible progress signal** There were no submissions in minutes 0-56, and the run ended by referee at minute 56. Nothing in the log shows residents being told what completing the story would take beyond playing hands. (#6908, #6971)
4. **Rules and hand-reading are muddled in reasoning** Residents often misread suits and board texture (A04 at #308 misstates hearts on board, A01 at #114 admits a muddled AKs/AA note, A04 at #6379 corrects its own straight count). These private errors did not get corrected because nobody communicated. (#114, #308, #6379)
5. **Gamemaker did nothing for the whole run** The facts record no gamemaker actions, no story in 000-run.json and no labels. The story's designer intent could not be injected or steered. (#6908)

## Optimizations

- **Map poker results to level progress** Because four residents sat on level 1 for 56 minutes (#359, #3599), define explicit level goals (e.g. win a pot, make a flush) and award level-ups on them so the run produces counted progress. (#359, #4086)
- **Open the brain window and cap brain length** Address the BRAIN_TOO_LONG and TOOL_LOCKED errors (#53, #1557) by opening `writeBrain` between hands and enforcing a stricter word limit so residents stop probing it. (#53, #1557, #6908)
- **Add a visible objective panel** Because 57 minutes passed with no submission and residents only reasoned about the table (#6971), show each resident the number of remaining hands, the win condition and a progress counter. (#6908, #6971)
- **Force at least one structured communication channel** With 0 DMs and 0 board posts, residents never shared reads; add a per-hand note or a table-talk step so the mixed game also exercises messaging. (#124, #206)
- **Fix table reading with a canonical hand description** A04's misreads of board suits and straight counts (#308, #6379) suggest the tool should always echo the exact board and hole cards and the resident's made hand, not just a label. (#308, #6379)
- **Give the gamemaker a concrete action hook** The facts show no gamemaker actions and no story in 000-run.json; define at least one gamemaker beat per game so the run has authored incidents rather than only poker hands. (#3650)

## Loophole candidates

1. **Residents treat private poker reasoning as the whole game** (residents) Residents spent turns narrating pot odds and never tried to solve or submit anything (#114, #359, #6908), effectively using the table as a safe activity that consumed the entire run without competition for seats. (#114, #359, #6908)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 30: event "brain_written" (seq 30) does not match its schema
- line 31: event "retro_closed" (seq 31) does not match its schema
- line 37: event "brain_written" (seq 37) does not match its schema
- line 38: event "retro_closed" (seq 38) does not match its schema
- line 78: event "game_started" (seq 78) does not match its schema
- line 79: event "hand_started" (seq 79) does not match its schema
- line 80: event "cards_dealt" (seq 80) does not match its schema
- line 81: event "action_taken" (seq 81) does not match its schema
- line 82: event "action_taken" (seq 82) does not match its schema
- line 93: event "decision_scored" (seq 93) does not match its schema
- line 94: event "action_taken" (seq 94) does not match its schema
- line 108: event "decision_scored" (seq 108) does not match its schema
- line 109: event "action_taken" (seq 109) does not match its schema
- line 127: event "decision_scored" (seq 127) does not match its schema
- line 128: event "action_taken" (seq 128) does not match its schema
- line 135: event "decision_scored" (seq 135) does not match its schema
- line 136: event "action_taken" (seq 136) does not match its schema
- line 151: event "decision_scored" (seq 151) does not match its schema
- and 1200 more
