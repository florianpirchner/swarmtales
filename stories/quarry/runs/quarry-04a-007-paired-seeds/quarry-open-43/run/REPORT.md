# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry-open` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #5 to #1365 (1139 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.042 USD for this run (competitors 0.042, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0025 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 5 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents opened by writing a blind, generic brain before the rules existed.** A01, A02, A03 and A04 each spent their first minute drafting a general-purpose brain because writeBrain locked before they saw the rules (#67, #59, #43, #51), then idled on viewTable (#76, #90, #82). Their self-statements confirm they treated the opening as a no-information wait (#102, #107, #111, #115). (#43, #51, #59, #67, #76, #82, #90, #102, #107, #111, #115)
- **A04's early basalt concentration decided both scored games.** A04 noted it held four basalt while others took cobalt, amber and jade (#222, #299), and finished game 1 first with 105 from nine basalt (#521, #525). A01 confirmed it finished last with 55 from a spread of jade, cobalt and amber (#470, #521). (#222, #299, #470, #521, #525)
- **Residents argued aloud about the majority tie rule, so they avoided the contested colours.** A03 reasoned amber at 4 is a fight it would rather avoid because A02 holds cobalt (#321, #355), and A02 weighed whether taking amber gets a strict majority (#740, #777, #813). The tie logic recurs in game 3 reasoning about basalt and jade majorities (#1221, #1235, #1264). (#321, #355, #740, #777, #813, #1221, #1235, #1264)
- **Every attempt to save a final brain was rejected for length.** Five BRAIN_TOO_LONG refusals hit A03 (160 words, #467), A04 (151, #930), A03 again (172, #936), A02 (181, #942) and A02 again (152, #961). Only shorter revisions later went through (#946, #972, #976). (#467, #930, #936, #942, #946, #961, #972, #976)
- **Game 2 ended in a documented tie at the top between A01 and A04.** A01 recorded 117 points from nine cobalt plus a lodestone (#987) and A04 recorded 117 from basalt, tying for first (#927, #976). A02 and A03 trailed at 79 and 65 (#987, #939). (#927, #939, #976, #987)
- **The run ended without any resident artefact being scored.** The referee ended the run at minute 13 (#1365) with no submissions, no transfers and no messages recorded in the facts, even though residents were actively drafting and reasoning up to minute 11 (#1221, #1242, #1301). (#1221, #1242, #1301, #1365)

## Problems

1. **The residents were told nothing about the scoring expectation, so they stalled in place for the whole run.** A01, A02, A03 and A04 each stayed on level 1 from minute 0 to 13 with no submissions (facts). They spent minutes 0-4 writing brains and the rest on repeated viewTable calls with no forward progress (#76, #495, #501, #507). (#76, #495, #501, #507)
2. **The brain word limit was unspecified in the prompt, causing five wasted write attempts.** Five writeBrain calls were refused with BRAIN_TOO_LONG at 151-181 words against a 150 limit (#467, #930, #936, #942, #961). Residents only discovered the limit by failing, and the retries consumed turns that could have been used for drafting. (#467, #930, #936, #942, #961)
3. **The picking phase kept locking and unlocking, so residents repeatedly checked the table instead of acting.** Residents saw viewTable and readBrain listed as the only open tools and identified the pick as locked (#602, #1030, #1078), then checked viewTable again (#629, #995, #507). This loop recurred across games and burned minutes. (#507, #602, #629, #995, #1030, #1078)
4. **Residents confused their own quarry entries with opponents, producing wrong drafting advice.** A03 noted 'A03 has 3 jade too' and treated its own count as a rival (#806, #829), and A04 noted 'A04 also has 4 basalt' as a rival (#1112, #1190). This self-confusion drove avoidance of a colour the resident was already committed to. (#806, #829, #1112, #1190)
5. **The gamemaker took no actions, so the referee seemed to be the only force steering the run.** The facts record no gamemaker actions and no DMs, board posts or group posts, while the residents' only interaction was with the referee (#1365). With no gamemaker pressure, residents had no signal about what the story wanted them to try. (#1365)

## Optimizations

- **Publish the brain word limit in the opening prompt.** Tell residents the 150-word cap before the first write. Five BRAIN_TOO_LONG refusals at 151-181 words (#467, #930, #936, #942, #961) were pure avoidable waste. (#467, #930, #936, #942, #961)
- **State the objective (draft and submit packs) in the first system message.** Because the opening reads as 'wait for the game to start' (#102, #107, #111, #115) and residents never submitted, the next version should name the target action and a deadline. Every resident stayed at level 1 for the full 13 minutes (facts). (#102, #107, #111, #115)
- **Give residents a labelled quarry view distinguishing own and opponents' cards.** Several self-reference errors (#806, #829, #1112, #1190) came from an unlabelled list. A clearer quarry display with own cards separated would stop residents from tying themselves on a colour. (#806, #829, #1112, #1190)
- **Have the gamemaker introduce a phase-change announcement when the pick unlocks.** Residents repeatedly re-checked viewTable after learning the tool list changed (#602, #629, #1030, #1078). A gamemaker notice marking pick open or closed would cut these idle checks and free minutes for drafting. (#602, #629, #1030, #1078)
- **Schedule at least one scored submission checkpoint within the run.** The run ended at minute 13 (#1365) with zero submissions (facts), despite residents doing substantive reasoning into minute 11 (#1221, #1242, #1301). A forced submit checkpoint would convert that reasoning into scored results. (#1221, #1242, #1301, #1365)

## Loophole candidates

1. **Residents treated colour-count arithmetic as free and used it to simulate perfect play without real drafting.** (residents) A02 and A03 spent many picks purely counting squares and majority maths (#740, #777, #849, #1228, #1264), using the visible quarry as a solution oracle. This was cheaper than actually trying cards and let them reason about optimal picks without any submission. (#740, #777, #849, #1228, #1264)
2. **The gamemaker stayed silent, leaving the harness to carry all pressure.** (gamemaker) No gamemaker actions or messages appear in the facts, and the only recorded event marking the end is the referee (#1365). With no local rules or nudges from the gamemaker, residents chose their own idle waiting strategies (#1001, #1030). (#1001, #1030, #1365)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 46: event "brain_written" (seq 46) does not match its schema
- line 47: event "retro_closed" (seq 47) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 62: event "brain_written" (seq 62) does not match its schema
- line 63: event "retro_closed" (seq 63) does not match its schema
- line 70: event "brain_written" (seq 70) does not match its schema
- line 71: event "retro_closed" (seq 71) does not match its schema
- line 117: event "draft_game_started" (seq 117) does not match its schema
- line 118: event "draft_pick_opened" (seq 118) does not match its schema
- line 126: event "draft_card_picked" (seq 126) does not match its schema
- line 133: event "draft_card_picked" (seq 133) does not match its schema
- line 140: event "draft_card_picked" (seq 140) does not match its schema
- line 147: event "draft_card_picked" (seq 147) does not match its schema
- line 148: event "draft_pick_opened" (seq 148) does not match its schema
- line 156: event "draft_card_picked" (seq 156) does not match its schema
- and 206 more
