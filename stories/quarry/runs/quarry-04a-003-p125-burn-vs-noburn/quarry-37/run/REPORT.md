# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `quarry` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1241 (1037 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.035 USD for this run (competitors 0.035, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 8 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **No level was solved by anyone in 12 minutes** All four residents (A01-A04) stayed on level 1 for the whole run, with zero submissions and no level-ups. The run ended at minute 12 with the referee (#1241) and no progress recorded. (#1241)
- **Residents spent the run reasoning about a card game that never opened for picks** A01 through A04 repeatedly inferred scoring rules (squares of colour counts, lodestone wilds, majority bonuses) and planned picks (#122, #129, #136, #143) while the pick tool stayed locked at minute 0 (#95, #102, #106, #110). (#95, #102, #122, #129, #136, #143)
- **Every writeBrain attempt was refused for exceeding 150 words** Eight BRAIN_TOO_LONG refusals hit all four residents (#437, #443, #449, #455, #839, #856, #862, #874). A01 finally reported a 149-word version saved at #902, after being refused at #874 with 155 words. (#437, #443, #449, #455, #839, #856, #862, #874, #902)
- **Residents narrated detailed game results they could not have been given** A03 claims to have scored 57 in a 'game 1' (#505), A04 claims 73 and first place (#511), and A02 tallies scores against other seats (#440), yet the computed facts record zero submissions and no level solved. These 'results' appear only inside private reasoning and self-talk. (#440, #489, #505, #511, #515)
- **Lodestone and burn-denial became the recurring tactical theme** Residents repeatedly weighed taking scarce lodestone wilds versus burning duplicate cards to deny the next seat (#278, #307, #375, #586, #683, #936, #961). This was the only concrete strategy debate that recurred across all four seats. (#278, #307, #375, #586, #683, #936, #961)

## Problems

1. **Total stall: no resident ever submitted or advanced a level** The facts show 13 of 13 minutes with no submission and all four residents stuck on level 1 from minute 0 to 12. The run burned 0.035 USD and produced no gameplay events, only reasoning and refused writes. (#1241)
2. **The 150-word brain limit blocked every first rewrite** All four residents were refused on their brain updates with BRAIN_TOO_LONG, and A03 was refused twice (#437, #839). The limit conflicts with the residents' instinct to record detailed scoring rules and lessons. (#437, #443, #449, #455, #839, #856, #862, #874)
3. **Residents hallucinated game outcomes and scores** Residents confidently reported point totals and standings for games that the city records show never happened (0 submissions). A02 even reasons about a mismatch between counted and actual scores (#859), treating its own invented numbers as ground truth. (#440, #505, #511, #859, #868, #885, #902)
4. **Tool-availability churn consumed turns** Residents repeatedly observed pick/writeBrain locking and unlocked only viewTable and readBrain, then spent turns checking the table (#293, #301, #648, #1059, #1065, #1211). This cycling produced no picks or progress. (#293, #301, #648, #1059, #1065, #1211)
5. **No messages, transfers, or gamemaker actions occurred** The facts record 0 DMs, 0 board posts, 0 group posts, 0 transfers, and no gamemaker actions. The social and competitive machinery the story depends on was entirely idle. (#1241)

## Optimizations

- **Make the pick phase actually open at start** Residents concluded at minute 0 that the game had not started and the pick tool was locked (#95, #102, #110), then never picked. Ensure the first pack is open when the run begins so residents convert reasoning into submissions. (#95, #102, #110)
- **Raise or warn on the brain word limit** Eight BRAIN_TOO_LONG refusals cost residents their whole retro window (#437, #443, #449, #455, #839, #856, #862, #874). Either raise the limit to match the detail residents want or give a live word count before submission. (#437, #443, #449, #455, #839, #856, #862, #874)
- **Ground residents in actual city state, not invented scores** Residents fabricated detailed standings and point totals (#440, #505, #511, #859). Feed the verified scoreboard into readBrain or the table so private reasoning cannot drift into confabulated results. (#440, #505, #511, #859)
- **Reduce tool-availability notices that eat turns** Repeated lock/unlock notices triggered table-check loops instead of play (#293, #648, #1059, #1211). Announce phase changes once, and keep the relevant action tool open for the whole phase. (#293, #648, #1059, #1211)
- **Add a forced progress check to catch silent stalls** The run produced zero submissions across 13 minutes with no referee intervention until the end (#1241). A mid-run nudge when no pick has occurred for several minutes would surface the stall early. (#1241)

## Loophole candidates

1. **Residents 'played' the card game entirely in private reasoning** (residents) Without an open pick phase, residents simulated full games, tallied scores, and drew lessons in REASONING and SAYS TO ITSELF lines (#440, #505, #511), producing the appearance of strategy with no city-recorded action. This substitutes narration for play. (#440, #505, #511, #868)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
- line 69: event "brain_written" (seq 69) does not match its schema
- line 70: event "retro_closed" (seq 70) does not match its schema
- line 116: event "draft_game_started" (seq 116) does not match its schema
- line 117: event "draft_pick_opened" (seq 117) does not match its schema
- line 125: event "draft_card_picked" (seq 125) does not match its schema
- line 132: event "draft_card_picked" (seq 132) does not match its schema
- line 139: event "draft_card_picked" (seq 139) does not match its schema
- line 146: event "draft_card_picked" (seq 146) does not match its schema
- line 147: event "draft_pick_opened" (seq 147) does not match its schema
- line 154: event "draft_card_picked" (seq 154) does not match its schema
- and 184 more
