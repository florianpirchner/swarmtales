# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `quarry-burn` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1224 (1011 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.032 USD for this run (competitors 0.032, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0019 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents were idle at minute 0 waiting for a game that had not opened.** A01, A02, A03 and A04 each reasoned that the pick tool was locked and that game 1 had not started, and none found anything to do in minute 0 (#73, #79, #85, #91). A02 recorded that its brain was saved as version 1 with no pack to pick from (#106). (#73, #79, #85, #91, #106)
- **The residents read the quadratic scoring rule correctly and shifted toward concentration.** From minute 1 the residents reasoned that each resource scores the square of its count and that the wild lodestone joins the biggest set (#118, #125, #139). By game 2 A01 was collecting three lodestones and heavy colour sets (#544, #553, #720). (#118, #125, #139, #544, #720)
- **A04 won game 1 by concentrating eight jade cards for 101 points.** A04 committed to jade with picks like J7 and J8 (#282, #329) and finished first with 101, ahead of A02 (93), A01 (74) and A03 (58) (#497, #501, #505). A04 itself credited jade concentration and the square scoring (#505). (#282, #329, #497, #501, #505)
- **A03 took game 2 with a deep two-colour set while A04 fell to last.** A03's game 2 quarry was cobalt 5, jade 4 and one lodestone, worth 67 points, the best at the table (#897). A04 finished last on 50 with a split amber/jade/cobalt set (#851, #888). (#851, #888, #897)
- **Residents reasoned repeatedly about burning cards but the facts record no transfers at all.** A01, A02 and A03 each weighed denying rivals by burning cards, sometimes deciding to burn (#359, #396, #819, #1120, #1178). The computed facts show 0 transfers went through and 0 refused, so none of these burns is recorded as an effect. (#359, #396, #819, #1120, #1178)

## Problems

1. **No resident ever submitted a correct or wrong answer, so no level was solved.** The computed facts show 0 correct and 0 wrong submissions and no level-ups for A01-A04. All four sat on level 1 from minute 0 to minute 12 (#1224). (#1224)
2. **The residents spent their minute-0 turns on locked tools instead of a real opening phase.** Four residents in a row called viewTable or readBrain because pick and writeBrain were locked (#73, #79, #85, #91). This wasted the opening minutes of the run. (#73, #79, #85, #91)
3. **The residents believed they were playing the quarry-burn card game while the harness recorded a level-based run.** Reasoning lines describe packs, picks, quarries and majority bonuses (#118, #125, #282), and residents report final scores such as 101, 93, 74 and 58 (#497, #501, #505). The computed facts record no levels solved and no points, so the game the residents described is not reflected in the run results. (#118, #282, #497, #505)
4. **Burns were heavily discussed but never recorded.** Residents repeatedly decided or contemplated burning cards to deny rivals (#359, #396, #819, #1120, #1178). The facts record 0 transfers and 0 refused, so the burn mechanic produced no logged outcome. (#359, #819, #1120, #1178)
5. **No messages reached the board or other residents.** The facts show 0 DMs, 0 board posts and 0 group posts, and residents only spoke to themselves (#98, #102, #493). No coordination or negotiation happened between residents. (#98, #102, #493)

## Optimizations

- **Open the game phase before the first minute so residents do not burn turn 0 on locked tools.** All four residents called viewTable because pick and writeBrain were locked at minute 0 (#73, #79, #85, #91). Starting the run after the first pack is dealt would let pick 1 happen immediately. (#73, #79, #85, #91)
- **Align the run harness with the game the residents are actually playing.** Residents reported scores of 101, 93, 74 and 58 for game 1 (#497, #501, #505), while the computed facts show no levels solved and no points. The referee and the scoring layer should record the quarry-burn results the residents see. (#497, #501, #505)
- **Make the burn and transfer mechanics actually resolve and log.** Residents repeatedly decided to burn a card to deny a rival (#359, #396, #1178), but 0 transfers went through. Either the burn action must be wired to the pick flow or the residents' instructions must stop inviting it. (#359, #396, #1178)
- **Give the residents a reason to communicate.** The facts show 0 board posts, 0 DMs and 0 group posts, and residents only talk to themselves (#98, #102). A phase or bonus that rewards a posted read of the table would create the social negotiation the story intends. (#98, #102)
- **Shorten the dead time when no pick is available.** There was no submission in any of the 13 minutes, and A01-A04 stalled on level 1 for the whole run (#1224). A faster referee clock or an auto-pass would keep the run from ending idle. (#1224)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 45: event "brain_written" (seq 45) does not match its schema
- line 46: event "retro_closed" (seq 46) does not match its schema
- line 52: event "brain_written" (seq 52) does not match its schema
- line 53: event "retro_closed" (seq 53) does not match its schema
- line 59: event "brain_written" (seq 59) does not match its schema
- line 60: event "retro_closed" (seq 60) does not match its schema
- line 67: event "brain_written" (seq 67) does not match its schema
- line 68: event "retro_closed" (seq 68) does not match its schema
- line 112: event "draft_game_started" (seq 112) does not match its schema
- line 113: event "draft_pick_opened" (seq 113) does not match its schema
- line 121: event "draft_card_picked" (seq 121) does not match its schema
- line 128: event "draft_card_picked" (seq 128) does not match its schema
- line 135: event "draft_card_picked" (seq 135) does not match its schema
- line 142: event "draft_card_picked" (seq 142) does not match its schema
- line 143: event "draft_pick_opened" (seq 143) does not match its schema
- line 151: event "draft_card_picked" (seq 151) does not match its schema
- and 193 more
