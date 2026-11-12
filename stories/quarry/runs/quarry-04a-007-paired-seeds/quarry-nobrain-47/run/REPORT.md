# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry-nobrain` |
| Seed | 47 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #3 to #1027 (837 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.024 USD for this run (competitors 0.024, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0014 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 10 of 10 minutes without a submission; longest without one: minutes 0-9 (10) |
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

- **Every resident drafted cards the whole run but no level was ever solved** All four residents spent minutes 0-8 reasoning about card picks (e.g. #32 A01 picks cobalt C11, #11 A04 picks jade J10), yet the run ended at minute 9 with zero submissions and nobody advancing past level 1. (#11, #32, #1027)
- **A01 built a large jade set and then shifted to amber** A01 opened on cobalt (#32), moved heavily into jade (#254 places a lodestone in cobalt, #475 and #524 push jade to five), then pivoted to amber at #907 and #917, arguing amber 4->5 adds 9 points. (#32, #475, #524, #907, #917)
- **A04 hoarded lodestones as wild cards** A04 picked lodestones at #397, #783 and #987, the last one explicitly placed into a six-card cobalt set for 49 points, showing coordinated long-term set-building. (#397, #783, #987)
- **Residents noticed packs recirculating and reasoned about seat order** A03 noted at #128 that an amber card had come back around the four-seat table, and A02 at #482 and A04 at #817 also recognized cards from earlier packs returning. (#128, #482, #817)
- **Residents actively weighed blocking opponents, not just their own score** A01 at #605 considered leaving a jade to A04 and A04 at #893 weighed whether taking jade would leave A03 jade-rich, showing competitive intent beyond self-scoring. (#605, #893)

## Problems

1. **No submissions in any minute, so the run produced no game progress** The computed facts show 0 correct and 0 wrong submissions and a stall across minutes 0-9; every log line is card-draft reasoning (#11..#987) and the run simply ends at #1027. (#11, #987, #1027)
2. **The card-draft phase consumed the entire 9-minute run** From #32 to #987 the residents only picked and passed cards; the draft never transitioned into the actual quarry/level play the story expected, so no level-ups occurred. (#32, #987)
3. **No communication channels were used** Facts record 0 DMs, 0 board posts and 0 group posts, and all reasoning lines are private thoughts (#18, #25, #189) that other residents never saw, so no alliances or bluffs formed. (#18, #25, #189)
4. **Residents repeatedly misread or re-derived the scoring rule** A03 at #349 and A02 at #691 recompute the squared-count scoring from scratch mid-run, and A02 at #205 reasons about a 'two-set cap' on lodestones that is inconsistent with earlier picks, suggesting rule uncertainty slowed decisions. (#205, #349, #691)

## Optimizations

- **Give the draft a hard time-box and force a switch to level play** Because no submission happened in minutes 0-9 (#1027), the harness should cap draft picks or inject a phase change so residents must attempt levels before the referee ends the run. (#1027)
- **Surface the scoring rule once instead of letting residents re-derive it** A03 (#349) and A02 (#691) spend whole turns recalculating squared scoring; a persistent rules panel would reclaim that time for play. (#349, #691)
- **Seed an opening exchange so alliances and messages can form** With 0 DMs and 0 posts, residents only reason privately (#18, #189); the story should prompt a public board post in the first minute to create negotiation and bluffing. (#18, #189)
- **Make picks visibly contested to create competing seats** Residents already reasoned about blocking at #605 and #893 but had no feedback; exposing other players' set sizes would turn these private suspicions into real competition. (#605, #893)

## Loophole candidates

None found.

## Log issues

- line 1: event "draft_game_started" (seq 1) does not match its schema
- line 2: event "draft_pick_opened" (seq 2) does not match its schema
- line 14: event "draft_card_picked" (seq 14) does not match its schema
- line 21: event "draft_card_picked" (seq 21) does not match its schema
- line 28: event "draft_card_picked" (seq 28) does not match its schema
- line 35: event "draft_card_picked" (seq 35) does not match its schema
- line 36: event "draft_pick_opened" (seq 36) does not match its schema
- line 43: event "draft_card_picked" (seq 43) does not match its schema
- line 49: event "draft_card_picked" (seq 49) does not match its schema
- line 55: event "draft_card_picked" (seq 55) does not match its schema
- line 62: event "draft_card_picked" (seq 62) does not match its schema
- line 63: event "draft_pick_opened" (seq 63) does not match its schema
- line 70: event "draft_card_picked" (seq 70) does not match its schema
- line 76: event "draft_card_picked" (seq 76) does not match its schema
- line 82: event "draft_card_picked" (seq 82) does not match its schema
- line 89: event "draft_card_picked" (seq 89) does not match its schema
- line 90: event "draft_pick_opened" (seq 90) does not match its schema
- line 97: event "draft_card_picked" (seq 97) does not match its schema
- line 103: event "draft_card_picked" (seq 103) does not match its schema
- line 109: event "draft_card_picked" (seq 109) does not match its schema
- and 170 more
