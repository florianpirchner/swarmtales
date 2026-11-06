# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `quarry-burn` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1282 (1067 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.036 USD for this run (competitors 0.036, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents treated minute 0 as a setup phase and never drafted until games opened.** A01, A02, A03 and A04 each found the pick locked at start, saved a brain (A01 112 words, #101) and sat out minute 0 waiting for game 1 to open (#97, #102, #106, #111). (#74, #90, #101, #102, #106, #111)
- **The residents converged on the correct scoring rule by reasoning alone.** A03 (#133) and A04 (#140) worked out that points are the square of each colour's count, and A01 used it to justify concentrating on amber (#126); A02 later confirmed the majority bonus from the Game 1 result (#467). (#126, #133, #140, #467)
- **A03 won Game 1 with a jade stack, setting the pattern the others copied.** A03 reported 95 points from 7 jade (#507), beating A02's 69 (#490) and A01's 56 (#459); A04's lesson was explicitly to focus on one colour (#483). (#459, #483, #490, #507)
- **A02 won Game 2 by pushing a single colour to nine amber.** A02 recorded nine amber for 81 points and a total of 98 (#921), ahead of A03's 75 (#926) and A01's 60 (#930); A04 finished last at 46 with four spread colours (#903). (#903, #921, #926, #930)
- **Burn-to-deny reasoning ran through the whole draft but almost never fired.** Residents repeatedly weighed burning a card to deny the next seat and usually held back to save their limited burns (#249, #733, #763); A04 actually burned B11 at minute 6 (#656) and J8 at minute 9 (#977). (#249, #656, #733, #763, #977)
- **Three of the four residents failed to write a brain in the retro windows.** A04 at minute 4 (#486), A01 at minute 8 (#893) and A03 at minute 8 (#899) were all REFUSED for BRAIN_TOO_LONG; only A02's rewrites succeeded (#490, #921). (#486, #893, #899)

## Problems

1. **Every resident was stuck on level 1 for the whole run with no submissions.** All four sat on level 1 from minute 0 to 12 and the city recorded no submissions at all; the run ended at minute 12 with levels unsolved. (#560, #1282)
2. **Brain word limit caught residents writing in the retro window.** Three BRAIN_TOO_LONG refusals (#486 156 words, #893 163 words, #899 166 words) show residents did not budget words against the 150 cap, so their Game 1/2 lessons were only partly saved. (#486, #893, #899)
3. **Residents misread the pick windows and burned turns checking the table.** Several reasoning lines show confusion over whether pick was locked or the game had ended (#431, #677, #841, #1115, #1175), wasting tool calls on viewTable instead of drafting. (#431, #677, #841, #1115, #1175)
4. **No social channel was used at all.** The facts record 0 DMs, 0 board posts and 0 group posts; all talk was private ('SAYS TO ITSELF' #97, #507) or reasoning the others never saw. (#97, #507)
5. **No gamemaker action and no transfers, so the story had no external pressure.** The facts record no gamemaker actions and 0 transfers; the residents played an isolated draft with no events shaping the plot. (#1282)

## Optimizations

- **Show the brain word count live before submission.** Address the three BRAIN_TOO_LONG refusals (#486, #893, #899) by displaying remaining words and truncating rather than refusing, so the retro lesson is never lost. (#486, #893, #899)
- **Pre-brief the phase calendar so residents stop probing the table.** Many calls were spent confirming whether pick was locked or the game had ended (#431, #1115, #1175); a clear schedule of pick/retro/start minutes would recover those turns for drafting. (#431, #1115, #1175)
- **Give residents a minimum draft commitment trigger.** Residents sat out minute 0 because pick was locked (#97, #106, #111), and the run produced no submissions; an explicit 'game 1 opens at minute X' prompt would get drafting going sooner. (#97, #106, #111)
- **Push at least one forced social interaction.** With 0 messages (#97, #507), the competitive drama stayed private; requiring one board post per game, or letting burns be negotiated, would give the designers observable alliances and lies. (#97, #507)
- **Prompt the gamemaker to act.** No gamemaker actions occurred in 1067 events (#1282); seeding an event per game would test whether residents react to outside pressure. (#1282)

## Loophole candidates

1. **Residents saved brains during setup and never rewrote them when the retro window opened.** (residents) Multiple residents saved version 1 before game 1 started (#101, #106, #111) and then treated the retro window as optional, so lessons were recorded only in private notes. (#101, #106, #111)
2. **Burns were treated as free denial with no cost, so residents deliberated endlessly without using them.** (residents) Residents repeatedly noted burning 'costs no points' (#249, #763, #1131), treating it as a free denial tool and mostly deferring it, which stalled decisions rather than shaping play. (#249, #763, #1131)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 46: event "brain_written" (seq 46) does not match its schema
- line 47: event "retro_closed" (seq 47) does not match its schema
- line 53: event "brain_written" (seq 53) does not match its schema
- line 54: event "retro_closed" (seq 54) does not match its schema
- line 60: event "brain_written" (seq 60) does not match its schema
- line 61: event "retro_closed" (seq 61) does not match its schema
- line 68: event "brain_written" (seq 68) does not match its schema
- line 69: event "retro_closed" (seq 69) does not match its schema
- line 113: event "draft_game_started" (seq 113) does not match its schema
- line 114: event "draft_pick_opened" (seq 114) does not match its schema
- line 122: event "draft_card_picked" (seq 122) does not match its schema
- line 129: event "draft_card_picked" (seq 129) does not match its schema
- line 136: event "draft_card_picked" (seq 136) does not match its schema
- line 143: event "draft_card_picked" (seq 143) does not match its schema
- line 144: event "draft_pick_opened" (seq 144) does not match its schema
- line 151: event "draft_card_picked" (seq 151) does not match its schema
- and 195 more
