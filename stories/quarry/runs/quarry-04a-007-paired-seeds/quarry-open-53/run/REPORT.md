# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry-open` |
| Seed | 53 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1320 (1094 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.041 USD for this run (competitors 0.041, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0023 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
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

- **All four residents entered with generic placeholder brains because they could not see the rules before the game opened.** Every resident wrote a roughly 110-120 word generic brain before knowing the game's rules, then found writeBrain locked (#44, #52, #60, #68). They were left waiting with version 1 in place until the first game opened (#103, #108, #112, #116). (#44, #52, #60, #68, #103, #108, #112, #116)
- **Game 1 turned on single-colour hoarding: A03 won with ten cobalt (137) while A02 spread and finished third.** A03 committed to cobalt from minute 2 (#310, #332, #349, #378) and won game 1 with 137 points, ahead of A04 (114), A02 (91) and A01 (79) (#466, #472, #478, #486). A02 diagnosed its own failure as holding one colour with no second set (#466). (#310, #332, #349, #378, #466, #472, #478)
- **A04 combined basalt hoarding with lodestones to win game 2 with 101.** A04 stacked eight basalt plus three lodestones for 101 points in game 2, beating A03 (70), A01 (63) and A02 (59) (#895, #907, #915, #962). The lodestone trick was noticed and then copied by A02 later (#755, #1194). (#755, #895, #907, #915, #962, #1194)
- **A01 repeatedly shifted its declared colour, costing it the first two games.** A01 picked jade, amber, basalt, cobalt and lodestone across games 1 and 2 rather than committing (#296, #369, #385, #568, #670, #726), finishing last in game 1 with 79 and third in game 2 with 63 (#472, #968). Its own retro noted spreading across colours as the mistake (#531). (#296, #369, #385, #472, #531, #568, #670, #726, #968)
- **Game 3 opened with no resolution: residents were still drafting at minute 12 when the referee stopped the run.** All four were still picking in game 3 at minute 11 (#1229, #1238, #1251, #1258, #1267, #1280) and the run ended at minute 12 with no game 3 result recorded (#1320). No level-ups or standings were finalised. (#1229, #1238, #1251, #1258, #1267, #1280, #1320)

## Problems

1. **No resident ever solved a level or submitted anything for 12 minutes.** The facts report zero correct and zero wrong submissions, and all four residents are stuck on level 1 from minute 0 to the end. Their activity was drafting and picking, not solving (#124, #243, #547, #979). (#124, #243, #547, #979)
2. **Five writeBrain attempts were rejected as BRAIN_TOO_LONG across the run.** A02, A01, A04, A01 and A02 each hit the 150-word cap and were refused (#469, #475, #898, #904, #918). Residents had to redo the same thinking each retro window, wasting time. (#469, #475, #898, #904, #918)
3. **Residents could not see the rules before the first game and wrote blind placeholder brains.** Each resident reasoned that the rules were unknown and dashed off a generic brain (#52, #60, #68, #44), which then locked immediately (#83, #94). The first game therefore started from an unplanned strategy. (#44, #52, #60, #68, #83, #94)
4. **Self-talk lines confuse the residents' own identity with rivals' statistics, causing muddled reasoning.** Several reasoning lines attribute a rival's count to the speaker (#332, #339, #349, #895, #915, #1180), e.g. A03 reasoning "A03 shows cobalt 5, which is the quarry I'm after" (#332). This makes the drafting logic unreliable and hard for designers to follow. (#332, #339, #349, #895, #915, #1180)
5. **The run ended before game 3 resolved, so the third game's picks produced no outcome.** All four residents were mid-draft at minute 11 and the referee ended the run at minute 12 (#1229, #1238, #1251, #1258, #1267, #1280, #1320). The final standings are unknown. (#1229, #1251, #1267, #1280, #1320)

## Optimizations

- **Give residents one read-only rules preview before the initial brain write.** Because residents wrote blind generic brains (#52, #60, #68), the first game started from an unplanned strategy. Showing the scoring rules during the first brain window would produce a real opening strategy. (#52, #60, #68, #108)
- **Raise or drop the 150-word brain cap, or pre-trim automatically.** Five writeBrain calls were refused for exceeding 150 words (#469, #475, #898, #904, #918). A higher cap or a polite trim-and-accept would keep the retro window productive. (#469, #475, #898, #904, #918)
- **Shorten the draft phase or extend the run so game 3 resolves.** The run ended at minute 12 with game 3 still in draft (#1229, #1280, #1320). More minutes per game, or a shorter pick sequence, would let each game reach a scored result. (#1229, #1280, #1320)
- **Give residents their own seat label as a distinct token from rival seats in the prompt.** Reasoning lines like #332 and #1180 mix the speaker's seat into rival counts. A clearer seat-tagged prompt would remove this source of drafting errors. (#332, #915, #1180)
- **Verify that each resident has an actual level puzzle; if levels never yield submissions, check the harness wire-up.** Zero submissions in twelve minutes with all four stalled on level 1 from minute 0 (#979, #986, #995, #1002 show only draft actions). The harness should confirm that the level/pick loop is connected to the referee. (#979, #986, #995, #1002)

## Loophole candidates

1. **Residents optimised drafting arithmetic while never engaging the level-solving task.** (residents) Residents spent the whole run minutely comparing squared scores and majority bonuses (#310, #369, #378, #1194) but never submitted for a level. The drafting minigame effectively replaced the intended level progression. (#310, #369, #378, #1194)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 55: event "brain_written" (seq 55) does not match its schema
- line 56: event "retro_closed" (seq 56) does not match its schema
- line 63: event "brain_written" (seq 63) does not match its schema
- line 64: event "retro_closed" (seq 64) does not match its schema
- line 71: event "brain_written" (seq 71) does not match its schema
- line 72: event "retro_closed" (seq 72) does not match its schema
- line 118: event "draft_game_started" (seq 118) does not match its schema
- line 119: event "draft_pick_opened" (seq 119) does not match its schema
- line 127: event "draft_card_picked" (seq 127) does not match its schema
- line 134: event "draft_card_picked" (seq 134) does not match its schema
- line 141: event "draft_card_picked" (seq 141) does not match its schema
- line 148: event "draft_card_picked" (seq 148) does not match its schema
- line 149: event "draft_pick_opened" (seq 149) does not match its schema
- line 157: event "draft_card_picked" (seq 157) does not match its schema
- and 206 more
