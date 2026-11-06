# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `quarry` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1284 (1072 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.036 USD for this run (competitors 0.036, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0020 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 10 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **No resident ever submitted a pick all run** All four residents spent all 13 minutes on level 1 with zero correct and zero wrong submissions (#1284). They reasoned at length about the quarry game (#121, #128, #135, #142) but the city recorded no submissions. (#121, #128, #135, #142, #1284)
- **Residents reported game scores that the city never credited** A03 says it won game 1 with 117 points (#470, #522) and A02 says it finished second with 96 (#482, #527), yet the facts record no levels solved and no standings. The residents' score talk came from private reasoning, not from recorded city facts. (#470, #482, #522, #527)
- **Every brain write failed with BRAIN_TOO_LONG** Ten writeBrain attempts were refused for exceeding 150 words, from A04 at minute 3 (#458) through A04 at minute 8 (#902). A01 needed three tries, still failing at 152 words (#479, #864, #890). (#458, #473, #479, #858, #890, #902)
- **Residents converged on a concentration strategy from the first minutes** By minute 1 residents had worked out squared scoring and pushed to stack one colour (#121, #128, #142). A01 repeatedly planned burns of rival colours even though burns cost nothing and none went through (#163, #321, #796). (#121, #128, #142, #163, #321, #796)
- **Residents spent the run waiting on a locked pick tool** A01 concluded pick was locked at minute 2 (#270) and again at minute 10 (#1101, #1259), and A04 did the same (#688, #1062). The final minute found A01 saying there was nothing to pick (#1260). (#270, #688, #1062, #1101, #1259, #1260)

## Problems

1. **Nothing was ever submitted** The run ended with zero correct and zero wrong submissions and all four residents stuck on level 1 for the full 12 minutes (#1284). The facts also record no standings, so no game outcome can be read. (#1284)
2. **Brain length limit blocks every retro write** All ten writeBrain calls were refused for length, the smallest only 2 words over at 152 (#890). The residents kept drafting long notes and never got a saved brain through, so the retro loop produced nothing. (#458, #473, #479, #485, #858, #864, #870, #876, #890, #902)
3. **Pick tool appears locked for most of the run** Residents saw only viewTable and readBrain open while they were trying to choose cards (#76, #270, #688, #1101). This mismatch between what residents believed and any recorded pick events left them idling. (#76, #270, #688, #1062, #1101)
4. **Residents invented scores and standings the city never recorded** A03 claimed a 117-point win (#470) and A02 a 96-point second place (#482), and A01 compared its 75 with A03's 84 (#929). The computed facts show no levels solved and unknown standings, so these numbers are resident claims with no city confirmation. (#470, #482, #522, #527, #929)
5. **No messages and no transfers, so no social play** The run had 0 DMs, 0 board posts, 0 group posts and 0 transfers, and no gamemaker actions. Residents only spoke to themselves (#101, #105, #109, #113). (#101, #105, #109, #113)

## Optimizations

- **Raise or pre-check the brain word limit** Every retro write failed at 150 words (#458, #890), so raise the limit or show a live word count before submit. This lets the intended lesson-saving loop actually persist. (#458, #858, #890, #902)
- **Confirm the pick tool is open when a pack exists** Residents repeatedly concluded pick was locked while packs were described (#270, #1101, #1260). The harness should log a pick-open event or expose the tool state so residents do not idle on a false lock. (#270, #688, #1101, #1260)
- **Make submitted picks the only source of scores** Residents narrated 117, 96 and 75-point games (#470, #482, #929) while the city recorded no submissions (#1284). Have the city broadcast verified scores so private guesses do not drift from the record. (#470, #482, #929, #1284)
- **Give the residents a reason to talk to each other** The run had zero DMs, board posts and transfers (#1284), with all speech self-directed (#101, #105). Add a board prompt or negotiation phase so the social game the story intends actually happens. (#101, #105, #1284)
- **Clarify burn economics before pack 1** Residents spent many turns on free-burn denial logic (#163, #321, #796, #1129) with zero burns recorded. State burn cost and cap up front so effort goes into picks, not speculation. (#163, #321, #796, #1129)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 48: event "brain_written" (seq 48) does not match its schema
- line 49: event "retro_closed" (seq 49) does not match its schema
- line 55: event "brain_written" (seq 55) does not match its schema
- line 56: event "retro_closed" (seq 56) does not match its schema
- line 62: event "brain_written" (seq 62) does not match its schema
- line 63: event "retro_closed" (seq 63) does not match its schema
- line 70: event "brain_written" (seq 70) does not match its schema
- line 71: event "retro_closed" (seq 71) does not match its schema
- line 115: event "draft_game_started" (seq 115) does not match its schema
- line 116: event "draft_pick_opened" (seq 116) does not match its schema
- line 124: event "draft_card_picked" (seq 124) does not match its schema
- line 131: event "draft_card_picked" (seq 131) does not match its schema
- line 138: event "draft_card_picked" (seq 138) does not match its schema
- line 145: event "draft_card_picked" (seq 145) does not match its schema
- line 146: event "draft_pick_opened" (seq 146) does not match its schema
- line 153: event "draft_card_picked" (seq 153) does not match its schema
- and 192 more
