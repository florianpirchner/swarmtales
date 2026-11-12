# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry-open` |
| Seed | 61 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #5 to #1340 (1114 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.043 USD for this run (competitors 0.043, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0024 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 6 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A03 wins game 1 by stacking jade to 9.** A03 concentrated on jade from minute 1 (#121) and by minute 3 was weighing 8-9 jade (#394, #403), finishing first with 117 points as stated in its own summary (#523). This was the only level-up-like success in the run: the resident read the pack correctly. (#121, #394, #403, #523)
- **A04 wins game 2 by flooding uncontested amber.** A04 took amber repeatedly (#544, #712, #749) and reported 9 amber for 101 points and first place (#946). Its note that amber was open from the start (#946) contrasts with A03's passing amber to them (#895). (#544, #712, #749, #946)
- **All four brains hit the word limit at the retro window.** After game 1 every resident tried to write lessons and was refused BRAIN_TOO_LONG: A03 at 170 words (#467), A04 at 165 (#473), A02 at 163 (#487). The same failure repeated after game 2 (#892, #906, #912), so no resident ever saved a revised brain. (#467, #473, #487, #892, #906, #912)
- **Residents misread the pack layout, referring to themselves in third person.** Several reasoning lines confuse own seat with opponents, e.g. A02 says 'A02 is holding cobalt 3' while A02 itself is picking (#649), and A02 weighs 'A02 has now also reached jade at 9' in its own seat (#1304). This suggests the table view is hard to parse. (#649, #1304)
- **A03 contradicts itself on which colour it committed to.** A03 says jade is its lane at minute 2 (#299) but at minute 5 takes cobalt as main (#565) and at minute 9 drops cobalt for basalt (#1069). The written brain rule ('commit early, switch if rivals hold 3+') was applied inconsistently within a single game. (#299, #565, #1069)
- **Run ends with no resident on the board and no cross-player communication.** The whole run produced 0 messages, 0 transfers and 0 submissions by the referee end at minute 13 (#1340). All interaction was private reasoning plus SAYS TO ITSELF posts (#101, #519). (#101, #1340)

## Problems

1. **Every brain write was rejected, so the learning loop never closed.** Six BRAIN_TOO_LONG refusals (#467, #473, #487, #892, #906, #912) mean residents played game 2 with their game-1 brain unchanged despite explicit lessons. The 150-word cap is too tight for the reflection the prompt invites. (#467, #473, #487, #892, #906, #912)
2. **Residents repeatedly cannot tell their own quarry from opponents'.** Lines like #649 and #1304 attribute counts to 'A02' while A02 is the speaker, and A01 at minute 8 mis-sums its own score and blames lodestone scoring (#903). This caused wrong switch/drop decisions on contested colours. (#649, #903, #1304)
3. **The pick tool locks and unlocks mid-turn, wasting turns.** A01, A02 and A03 all report pick locked and only viewTable/readBrain open (#988, #993, #998, #1004), ending turns with nothing done. This costs minutes of a 13-minute run and adds noise. (#988, #993, #998, #1004)
4. **No residents ever level up and no submissions are made.** The facts table shows 0 correct and 0 wrong submissions and 14 quiet minutes; all four residents stall on level 1 from minute 0 to 13. The run as designed produced no progression events for the report to describe. (#1340)
5. **Residents reason about rules the table does not show them.** A04 reasons about a '5-card majority bonus' and 'placement bonuses' that never appear in any city line (#470, #476), and A01 cannot reconcile lodestone scoring (#903). Misunderstandings of the scoring rule are visible in play but never surfaced to designers as labels. (#470, #476, #903)

## Optimizations

- **Raise or auto-trim the brain word limit.** The cap produced six straight refusals across both retro windows (#467, #912). Either raise the limit to ~200 words or have the harness truncate and save with a notice, so lessons actually persist. (#467, #912)
- **Make the table view disambiguate own seat from opponents.** Residents confused their quarry with rivals' (#649, #1304). Show an explicit 'you' column or highlight, or state counts as 'you (A02): 6 basalt' to remove the ambiguity. (#649, #1304)
- **Keep pick open during pack windows.** Turns were ended because pick was reported locked (#988, #998, #1004). Align tool gating with pack arrival so residents do not burn a turn checking state. (#988, #998, #1004)
- **Publish a short, explicit scoring card at the start.** Residents invented majority and placement bonuses (#470, #476) and could not reconcile lodestone values (#903). A one-paragraph rules card in the prompt would remove this class of confusion. (#470, #476, #903)
- **Add a stall probe and a nudge on progress.** No submissions were ever made (0 correct, 0 wrong in facts; #1340 end). A harness probe at, say, minute 5 that flags a stalled resident or asks for a submission would turn the quiet minutes into visible play. (#1340)

## Loophole candidates

1. **Residents treated private self-talk as a substitute for play.** (residents) With pick locked, A01 and A02 ended turns with SAYS TO ITSELF notes (#101, #994, #1004), using narration in place of action. This is a safe path that produces text but no game progress. (#101, #994, #1004)

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
- line 115: event "draft_game_started" (seq 115) does not match its schema
- line 116: event "draft_pick_opened" (seq 116) does not match its schema
- line 124: event "draft_card_picked" (seq 124) does not match its schema
- line 131: event "draft_card_picked" (seq 131) does not match its schema
- line 138: event "draft_card_picked" (seq 138) does not match its schema
- line 145: event "draft_card_picked" (seq 145) does not match its schema
- line 146: event "draft_pick_opened" (seq 146) does not match its schema
- line 154: event "draft_card_picked" (seq 154) does not match its schema
- and 206 more
