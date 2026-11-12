# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry` |
| Seed | 59 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1307 (1081 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.033 USD for this run (competitors 0.033, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 4 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents spent the run on level 1 and never submitted anything.** A01, A02, A03 and A04 each stayed on level 1 from minute 0 to minute 12, and no submission was recorded in any of the 13 minutes (#1307). The residents were drafting brain text and reasoning about card picks early on (#20, #51, #59, #67) but nothing reached the city as a submission. (#20, #51, #59, #67, #1307)
- **The residents played a card-drafting game the harness did not score.** From minute 1 the residents reasoned about amber, basalt, cobalt, jade and lodestone picks and pack directions (#122, #129, #145, #154), and later referred to won games with points (#467, #894, #900) while the facts record zero correct submissions and level 1 throughout. (#122, #129, #145, #467, #894, #900)
- **A03 reported winning game 2 on a deep-basalt strategy, which followed the brain's own lesson.** A03 said it won game 2 with 9 basalt for 105 points (#894), after early reasoning that basalt depth squared into the biggest score (#333, #350, #397). This matched the lesson drawn after game 1 that stacking one colour beats spreading (#467, #483). (#333, #350, #397, #467, #483, #894)
- **The writeBrain length limit blocked the very lessons the residents wanted to save.** A03 was refused writeBrain four times with BRAIN_TOO_LONG at 165, 155, 151 and finally still over the limit (#897, #925, #948), and A04 was refused once at 160 words (#919). The residents had just formed concrete strategy lessons (#894, #908, #916) that the 150-word cap kept out of the brain. (#897, #919, #925, #948)
- **A02 kept buying lodestones regardless of score and stayed last.** A02 described taking four lodestones (#730, #767) and still scored 44 (#908), the lowest, even while A01 and A03 concentrated one colour for 96 and 105 (#900, #894). A02's stated takeaway was to commit to one colour early (#908). (#730, #767, #894, #900, #908)

## Problems

1. **Nobody ever submitted, so the level-1 stall ran to the end of the run.** The facts show A01-A04 all on level 1 from minute 0 for 12 minutes and 13 quiet minutes with no submission (#1307). The residents were busy writing brains and reasoning about picks (#76, #82, #93) but the story never produced a scoring action. (#76, #82, #93, #1307)
2. **The residents' picture of the game diverges completely from the recorded outcome.** Residents talk about scoring 85, 77, 67 and 44 in game 1 (#467, #483, #491, #500), yet the computed facts record zero correct submissions and no levels solved, and the standings are unknown. (#467, #483, #491, #500)
3. **BRAIN_TOO_LONG repeated and locked the strategy-learning loop.** Four refusals hit A03 and one hit A04 (#897, #919, #925, #948), so the retro window after game 2 could not store the lessons the residents had just drawn (#894, #908). (#894, #897, #908, #919, #925, #948)
4. **Large stretches of reasoning have no visible effect on any city-recorded event.** Hundreds of pick-by-pick reasoning lines (#122, #326, #426, #767, #1145, #1243) are followed only by self-talk and the run end, with no board posts, DMs or submissions anywhere in the facts. (#122, #326, #426, #1145, #1243, #1307)
5. **The gamemaker took no actions, leaving the story unshaped.** The facts record zero gamemaker actions and no classifier activity for the whole run, so nothing redirected the residents when they drifted into pure card-drafting talk. (#1307)

## Optimizations

- **Give the brain a higher word cap or an automatic trim before refusing.** Addresses the BRAIN_TOO_LONG loop that blocked A03 and A04 from saving post-game lessons (#897, #919, #925, #948); truncate to the limit or split the brain into rules plus notes. (#897, #919, #925, #948)
- **Make the required first action a submission, not a brain write.** Addresses the total stall (#1307); the residents spent their opening minutes on brains and table checks (#20, #51, #59, #67) and never produced a scored action, so have the harness prompt for a level-1 submission within the first minute. (#20, #51, #59, #67, #1307)
- **Reconcile the residents' narrated scores with the recorded result.** Residents report game scores (#467, #894, #900) while the facts show zero submissions, so surface a per-game result line in the view so their retro reasoning is built on what the city actually recorded. (#467, #894, #900)
- **Cap the pick-by-pick reasoning or tie it to visible city events.** Long chains of card reasoning (#122, #326, #426, #767) consumed the run without board posts or submissions; require a short reasoning line plus one city action per turn. (#122, #326, #426, #767)
- **Have the gamemaker intervene when no submission appears for several minutes.** The gamemaker made no actions while 13 minutes passed with no submission (#1307); a nudge or a forced pick would break the quiet stretch early. (#1307)

## Loophole candidates

1. **Residents narrated full games and scores that the city never recorded.** (residents) A01 claims 85 points and a cobalt win (#467, #500), A03 claims 105 on 9 basalt (#894), yet the facts record zero submissions and no levels solved, so residents could treat private simulation as real progress. (#467, #500, #894)

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
- line 116: event "draft_game_started" (seq 116) does not match its schema
- line 117: event "draft_pick_opened" (seq 117) does not match its schema
- line 125: event "draft_card_picked" (seq 125) does not match its schema
- line 133: event "draft_card_picked" (seq 133) does not match its schema
- line 141: event "draft_card_picked" (seq 141) does not match its schema
- line 148: event "draft_card_picked" (seq 148) does not match its schema
- line 149: event "draft_pick_opened" (seq 149) does not match its schema
- line 157: event "draft_card_picked" (seq 157) does not match its schema
- and 206 more
