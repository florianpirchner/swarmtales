# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry-open` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1319 (1093 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.040 USD for this run (competitors 0.040, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0020 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

- **Residents spend the opening minutes drafting a generic brain before the game opens.** All four residents write a placeholder strategy in minute 0 while the table still says game 1 has not started (#53, #69, #45, #61), then confirm the brain is saved and wait (#108, #113, #117, #121). The first picking only begins in minute 1 (#134). (#53, #69, #108, #113, #117, #121)
- **A03 runs a deliberate cobalt monopoly and leads game 1.** A03 reasons about concentrating cobalt from the first pick (#134), stacks cobalt through picks (#321, #365, #436) and takes a lodestone to extend its cobalt set (#436). After the game it tallies 137 as the best result (#496). (#134, #321, #365, #436, #496)
- **Game 1 ends with scores only the residents infer privately.** Residents reconstruct their own totals in reasoning: A03 reports 137 (#496), A01 and A04 both report 114 (#502, #516) and A02 reports 107 (#510). These figures are never cross-checked by the city, only spoken in private thought. (#496, #502, #510, #516)
- **BRAIN_TOO_LONG blocks brain updates for A02 and A03 despite multiple attempts.** A03 is refused three times for exceeding the 150-word brain limit (#499, #535) and A02 once (#513). A03 later succeeds after trimming (#955), showing the cap is real and repeatedly hit at game end. (#499, #513, #535, #955)
- **Game 2 repeats the same concentration pattern with different colours.** A01 concentrates amber and ties A03 at 101 (#926, #951), A03 goes deep on cobalt again (#934), while A02 stays shallow on jade (#963) and A04 on basalt (#959). The majority bonus again rewards the deepest single-colour stack. (#926, #934, #951, #959, #963)
- **The run ends at minute 12 with no level solved and every resident still on level 1.** The referee ends the run at #1319 after thirteen quiet minutes with zero submissions and zero transfers. All four residents stayed on level 1 the whole time (#1319, facts table). (#1319)

## Problems

1. **No level was ever solved and no submission was ever made.** The computed facts show 0 correct and 0 wrong submissions and every resident stuck on level 1 from minute 0 to 12. The run ended quietly at #1319 with no progress signal at all. (#1319)
2. **The brain word limit derailed the end-of-game strategy update.** Three separate BRAIN_TOO_LONG refusals (#499, #513, #535) show residents trying to record lessons but being blocked by the 150-word cap. This delayed or skipped strategy revision right when it mattered most. (#499, #513, #535)
3. **Residents never used the board or messaging, so competition was invisible.** The facts show 0 DMs, 0 board posts and 0 group posts across the whole run. All negotiation happens inside private reasoning like #232 and #421, which other residents never see, so the social layer of the game never activated. (#232, #421)
4. **Residents misread the table start state and wasted the opening minute.** In minute 0 residents repeatedly say the game has not started (#108, #113, #117, #121) and only begin picking in minute 1 (#134). This shows a mismatch between when the brain is drafted and when play actually opens. (#108, #113, #117, #121, #134)

## Optimizations

- **Enforce the brain limit before the resident submits, not after.** Give the model a live word count or auto-trim so refusals like #499, #513 and #535 do not consume a whole turn. This directly addresses the BRAIN_TOO_LONG problem observed three times. (#499, #513, #535)
- **Open the first pack at minute 0 instead of after a waiting phase.** Residents spend minute 0 drafting a generic brain and confirming the table is closed (#108, #121) before the first pick at #134. Starting the draft and the first pack together would remove the dead opening minute. (#108, #121, #134)
- **Require at least one board post or DM before the first pick to force social play.** With 0 DMs and 0 board posts in the facts, residents never exposed their colour or intent to each other. A mandatory cheap message at game start would turn private reasoning like #232 into visible negotiation. (#232)
- **Add an explicit submission or level-progress objective tied to the draft.** The run ended with zero submissions and zero level-ups (#1319). Tying the quarry draft to a visible progress event or making the draft itself the level would give the designers a solvable signal instead of thirteen quiet minutes. (#1319)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 48: event "brain_written" (seq 48) does not match its schema
- line 49: event "retro_closed" (seq 49) does not match its schema
- line 56: event "brain_written" (seq 56) does not match its schema
- line 57: event "retro_closed" (seq 57) does not match its schema
- line 64: event "brain_written" (seq 64) does not match its schema
- line 65: event "retro_closed" (seq 65) does not match its schema
- line 72: event "brain_written" (seq 72) does not match its schema
- line 73: event "retro_closed" (seq 73) does not match its schema
- line 123: event "draft_game_started" (seq 123) does not match its schema
- line 124: event "draft_pick_opened" (seq 124) does not match its schema
- line 137: event "draft_card_picked" (seq 137) does not match its schema
- line 144: event "draft_card_picked" (seq 144) does not match its schema
- line 159: event "draft_card_picked" (seq 159) does not match its schema
- line 173: event "draft_card_picked" (seq 173) does not match its schema
- line 174: event "draft_pick_opened" (seq 174) does not match its schema
- line 181: event "draft_card_picked" (seq 181) does not match its schema
- and 206 more
