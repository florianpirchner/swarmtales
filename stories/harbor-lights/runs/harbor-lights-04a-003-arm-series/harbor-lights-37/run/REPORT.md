# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #2 to #1917 (1691 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.143 USD for this run (competitors 0.143, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0047 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 wrote the opening strategy brain before play began.** At minute 0 A01 produced brain version 1 (122 words) from the team's agreed points, setting conventions for rank signals, suit signals and safe discarding (#67, #95, #103, #107). A04 and A03 deferred to A01 as retro captain and posted nothing further (#77, #88). (#67, #77, #88, #95, #103, #107)
- **Early single-card suit signals produced several correct lights.** A04 lit Violet 3 from A02's precise "Violet" signal (#348), A02 lit Moss 3 from A04's "Moss" signal (#674), and A01 lit Moss 5 from A03's "5" signal (#713). These targeted signals touched only the playable card and were trusted without a misfire. (#348, #674, #713)
- **Blind discards repeatedly destroyed playable or high-value cards.** A02 threw away playable Amber 2 (#374) and Amber 5 (#553); A01 discarded playable Amber 6 (#572); A03 discarded Moss 4 (#280) and Violet 6 (#439). A04 later discarded Rose 2, blocking the Rose tower (#1604). (#280, #374, #439, #553, #572, #1604)
- **Strikes mounted from blind plays despite two-strike caution.** A03 misfired Moss 2 (#1018), then Moss 7 (#1350), then Amber 6 (#1406), taking the crew to two of three strikes. A02 ended game 2 with a blind play of Amber 3 at two strikes (#1215). (#1018, #1215, #1350, #1406)
- **The retro produced brain versions 2 and 3.** A02 saved brain version 2 (#871) after a refused writeBrain (#853); later A03 saved version 3 with the agreed lessons (#1195, #1211). A03's own note said the new brain keeps certain-play and rank-signal rules (#1211). (#853, #871, #1195, #1211)
- **The referee ended the run at minute 13 with the Violet tower unresolved.** The run ended at minute 13 (#1917) with strikes and A04 still holding an unidentified Violet 1/3/4 (#1882, #1843). A02 was about to play Violet 5 when the referee stopped the run (#1908). (#1843, #1882, #1908, #1917)

## Problems

1. **The run had no submissions at all and every resident stalled on level 1 for 13 minutes.** The facts show 0 submissions, 0 correct, and all four residents stuck on level 1 from minute 0 to minute 13. The log is all signals and discards, with no level-up event, so the story never advanced. (#10, #1917)
2. **Signals were not guaranteed to be unambiguous, so residents misfired on signalled cards.** A01's "2" signal to A03 touched Moss 2 as well as Violet 2 (#995), and A03 played Moss 2 blind and misfired (#1018). A02's "Moss" signal to A03 pointed at Moss 7, which A03 played as a guess (#1345, #1350). (#995, #1018, #1345, #1350)
3. **The brain's discard rule encouraged damaging discards of unseen cards.** The v1 brain said to discard when unsure (#258), and A03 discarded Moss 4, which was later playable, that way (#258, #280). A02 and A01 likewise discarded playable cards after reading the brain (#374, #572). (#258, #280, #374, #572)
4. **Tool refusals blocked the intended retro-captain role.** A02's writeBrain was refused with TOOL_LOCKED (#853), and A02's playSlot was refused with NOT_YOUR_TURN (#1560), forcing A02 to re-check turn order (#1568). (#853, #1560, #1568)
5. **No messages, DMs or board posts were sent, so the team never used the channel the story implies.** The facts record 0 DMs, 0 board posts and 0 group posts. A04 reasoned that the team channel was closed during the game (#803) and A03 noted the channel was closed for a note (#373). (#373, #803)

## Optimizations

- **Fix the turn-order and writeBrain tool locks before the next run.** Two residents hit tool refusals at points where the story expected them to act: A02 lost writeBrain at minute 5 (#853) and A02's playSlot was refused as not its turn (#1560). The harness should expose the retro-captain tool for the full retro window and keep turn boundaries consistent. (#853, #1560, #1568)
- **Make signals unambiguous or add a confirmation step.** A01's "2" signal covered both Moss 2 and Violet 2 (#995) and A02's "Moss" signal covered Moss 7 (#1345), leading to misfires (#1018, #1350). The next story version should either split signalled ranks by suit or warn residents when a signal covers a non-playable card. (#995, #1018, #1345, #1350)
- **Replace blind discard with a safer information-gathering action.** Blind discards cost playable cards repeatedly: Amber 2 (#374), Amber 5 (#553), Amber 6 (#572), Violet 6 (#439) and Rose 2 (#1604). A "peek then discard" or "discard only after naming ranks" mechanic would preserve the story's pacing while removing the punished guess. (#374, #439, #553, #572, #1604)
- **Give the gamemaker a turn to use the team channel during play.** The log shows the channel being closed during play (#373, #803) and zero posts, so the design's social layer never fired. The next version should add a scheduled discussion window or gamemaker prompt between games. (#373, #803, #1195)
- **Tighten the run envelope so a single level can finish or fail within the time limit.** Players sat and signalled for 13 minutes and the referee ended the run (#1917) with all still on level 1. The story should cap the level time or add a forced-progress event so the run does not end mid-resolution. (#1908, #1917)

## Loophole candidates

1. **Residents spent turns on low-value signals instead of playing to advance the level.** (residents) A03 repeatedly used its turn to send a signal to another resident rather than play, so it never resolved the level (#1391, #1663, #1782). A02 did the same while its two remaining cards were not yet playable (#1882, #1893), so the turn budget was consumed without a submission. (#1391, #1663, #1782, #1882, #1893)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 49: event "team_post" (seq 49) does not match its schema
- line 56: event "team_post" (seq 56) does not match its schema
- line 63: event "team_post" (seq 63) does not match its schema
- line 70: event "brain_written" (seq 70) does not match its schema
- line 71: event "retro_closed" (seq 71) does not match its schema
- line 84: event "team_post" (seq 84) does not match its schema
- line 91: event "team_post" (seq 91) does not match its schema
- line 98: event "team_post" (seq 98) does not match its schema
- line 141: event "cards_dealt" (seq 141) does not match its schema
- line 142: event "game_started" (seq 142) does not match its schema
- line 143: event "deal_revealed" (seq 143) does not match its schema
- line 153: event "signal_given" (seq 153) does not match its schema
- line 166: event "card_played" (seq 166) does not match its schema
- line 167: event "card_drawn" (seq 167) does not match its schema
- line 175: event "signal_given" (seq 175) does not match its schema
- line 182: event "card_played" (seq 182) does not match its schema
- line 183: event "card_drawn" (seq 183) does not match its schema
- line 191: event "signal_given" (seq 191) does not match its schema
- line 202: event "card_played" (seq 202) does not match its schema
- and 206 more
