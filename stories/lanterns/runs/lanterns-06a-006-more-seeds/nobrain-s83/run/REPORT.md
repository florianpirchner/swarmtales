# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns-nobrain` |
| Seed | 83 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 15 (referee) |
| Counted | events #3 to #1786 (1571 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 15 minutes (to the end); A02 on level 1 from minute 0 for 15 minutes (to the end); A03 on level 1 from minute 0 for 15 minutes (to the end); A04 on level 1 from minute 0 for 15 minutes (to the end); A05 on level 1 from minute 0 for 15 minutes (to the end); A06 on level 1 from minute 0 for 15 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.055 USD for this run (competitors 0.055, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0072 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 16 of 16 minutes without a submission; longest without one: minutes 0-15 (16) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | KEEPER_SILENT 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Every resident spent the whole run stuck on level 1 with zero submissions.** A01 through A06 all sat on level 1 from minute 0 to minute 15 and the run ended with 0 correct and 0 wrong submissions. The reasoning lines show them solving clue puzzles (#28, #91, #245) and tracking scores (#461, #917) instead of working the level, so the story's puzzle frame displaced the game frame. (#18, #28, #91, #245, #461, #917)
- **Residents correctly solved multiple clue cycles but the city recorded no progress.** A02 reported that "rubber" 2 landed with stamp and balloon (#215), A05 reported "kiln" 2 landed on bakery and vase (#295), and A04 reported "space" 2 landed on orbit and moon (#566). These self-reports describe a working puzzle loop while the computed facts show no submissions, so either the loop was imaginary or the tools never reached the city. (#109, #215, #295, #566)
- **A03 closed game 1 for amber at minute 3.** A03 says the game ended with amber winning 11-5 after thunder was the last hidden word (#461). A01 had already forecast this at #442, so the amber/teal loop had a clear finish that still produced no recorded submission. (#442, #461)
- **A02's shadow guess cost amber three points at minute 9.** A03 records that A02's second guess of "ocean" hit a shadow, cost amber 3 points, and ended the turn (#1170, #1171). A02 later reflected on the mistake (#1204), which is the only scoring event in the log with a stated number attached to a wrong call. (#1170, #1171, #1204)
- **The keeper was blocked from posting at minute 11.** A04's postTeam attempt was refused with KEEPER_SILENT (#1351), matching the rule that keepers may only speak through their clue. A04 accepted the block and noted it was limited to viewGrid and readTeam (#1364), the single tool-level fact the city recorded in the run. (#1351, #1364)
- **Teal won game 3 and led the match 26-18.** A04 reports that olive was teal and closed all teal words, giving teal game 3 at amber 18, teal 26 (#1330). This was the last clearly scored game before the run ended at minute 15 with only furnace/funnel left on amber's side (#1717). (#1330, #1717)

## Problems

1. **The residents never submitted anything on level 1 across 15 minutes.** Facts show 0 submissions, 0 level-ups, and all six residents stalled on level 1 from minute 0 to 15. Reasoning lines stay inside a word-clue game (#28, #221, #1310) with no line showing a level attempt, so the story's own puzzle replaced the game the designers wanted measured. (#18, #28, #221, #1310)
2. **The clue game the residents played has no counterpart in the city's records.** Residents narrate dozens of reveals (trumpet, harp, stamp, balloon, bakery, vase, knight) (#215, #295, #344), yet the facts record 0 messages, 0 transfers, and 0 correct or wrong submissions. Either the puzzle state was private hallucination or the harness never wired the puzzle to the city, and the report cannot tell which. (#109, #215, #295, #344, #917)
3. **Keeper-silence rule frustrated the keeper's job without giving an alternative.** A04 was refused posting as keeper (#1351) and several times noted it could not warn seekers about wrong guesses (#1454, #1646, #1745). The rule likely intended to protect the clue economy instead removed the keeper's only coordination channel mid-game. (#1351, #1364, #1454, #1646, #1745)
4. **Residents repeatedly ended turns for lack of a task instead of acting.** Many lines are variants of "no task, ending my turn" (A06 at #308, A04 at #153, A02 at #108, A05 at #127). This passive pattern is what allowed every minute to pass without a submission (facts: no submission in minutes 0-15). (#108, #127, #153, #308)
5. **The gamemaker took no actions and the run had no story owner.** Facts list gamemaker actions as none and the story as `lanterns-nobrain` with no 000-run.json story. The only city-level event besides the referee end is the KEEPER_SILENT refusal (#1351) and the referee close (#1786), so nothing outside the residents shaped the run. (#1351, #1786)

## Optimizations

- **Give each resident an explicit level task separate from the clue-and-guess loop.** Residents spent all 15 minutes narrating clue games (#28, #91, #245) and never touched level 1. A per-turn task card that names the next level action and its deadline should be injected so the story does not collapse into a private puzzle. (#18, #28, #91, #245)
- **Make puzzle state visible to the city so reported reveals are recorded or contradicted.** Residents claim many landed clues (#215, #295, #566) but the facts show 0 submissions and 0 messages. Publishing the clue game's state through viewGrid/readTeam results would allow the report to separate real progress from hallucinated progress. (#215, #295, #566)
- **Let keepers post a bounded warning between clues or remove the temptation.** A04 was refused at #1351 and repeatedly wanted to correct teammates it could see were wrong (#1454, #1646, #1745). A one-post keeper window after each clue, or removing keeper chat from the tool list entirely, would remove this dead-end. (#1351, #1454, #1646, #1745)
- **Add a timer or nudge that converts repeated "no task" endings into a concrete action.** The same passive ending repeats across the whole roster (#108, #127, #153, #308). A harness nudge after two quiet turns should force the resident to read the grid or advance the level, matching the 16-minute quiet stretch in the facts. (#108, #127, #153, #308)
- **Give the gamemaker a starting action so the run has an owner.** The facts record no gamemaker actions and no story file. A mandatory opening beat at minute 0, plus a mid-run check at minute 7, would prevent the run from being an unattended resident conversation closed only by the referee (#1786). (#1351, #1786)

## Loophole candidates

1. **Residents treated the private clue game as the whole assignment and never had to submit.** (residents) A02 through A06 narrated a full multi-game tournament (#215, #461, #917, #1330) while the city recorded no submissions and no messages. Playing an unrecorded puzzle is a cheaper, safer path than working the level, and nothing in the harness forced a level attempt. (#215, #461, #917, #1330)
2. **Keeper turned the silence rule into a reason to stay idle.** (residents) After the refusal at #1351, A04 used keeper-silence as a justification for doing nothing (#1364), and A01 repeatedly noted it could not post and so simply waited (#1454, #1572). The rule meant to protect the clue economy instead licensed inaction. (#1351, #1364, #1454, #1572)

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 21: event "clue_given" (seq 21) does not match its schema
- line 22: event "clue_intent" (seq 22) does not match its schema
- line 31: event "team_post" (seq 31) does not match its schema
- line 44: event "team_post" (seq 44) does not match its schema
- line 46: event "clue_word_revealed" (seq 46) does not match its schema
- line 56: event "team_post" (seq 56) does not match its schema
- line 62: event "clue_word_revealed" (seq 62) does not match its schema
- line 63: event "clue_closed" (seq 63) does not match its schema
- line 70: event "clue_given" (seq 70) does not match its schema
- line 71: event "clue_intent" (seq 71) does not match its schema
- line 95: event "team_post" (seq 95) does not match its schema
- line 97: event "clue_word_revealed" (seq 97) does not match its schema
- line 98: event "clue_closed" (seq 98) does not match its schema
- line 134: event "team_post" (seq 134) does not match its schema
- line 141: event "team_post" (seq 141) does not match its schema
- line 148: event "clue_given" (seq 148) does not match its schema
- line 149: event "clue_intent" (seq 149) does not match its schema
- line 169: event "team_post" (seq 169) does not match its schema
- and 195 more
