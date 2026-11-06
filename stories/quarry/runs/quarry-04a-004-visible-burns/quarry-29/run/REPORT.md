# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `quarry` |
| Seed | 29 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1268 (1042 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.031 USD for this run (competitors 0.031, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0018 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents wrote a strategy brain before game 1 opened.** A01, A02 and A03 report saving a version-1 brain while the table showed game 1 not yet started (#99, #103, #107, #111). No pick was possible yet, so the whole first stretch was setup. (#99, #103, #107, #111)
- **A04 won game 1 by stacking basalt.** A04 saysitself it scored 89 with seven basalt and one lodestone (#495), while A01 reports 72, A03 61 and A02 56 (#499, #491, #512). The concentration strategy dominated the first game. (#491, #495, #499, #512)
- **A04 won game 2 as well, with eight amber.** A04 reports 105 points from 8 amber and 2 lodestone (#905), ahead of a three-way tie at 96 by A01, A02 and A03 (#914, #909, #920). A04 adapted from basalt to amber and stayed on top. (#905, #909, #914, #920)
- **Residents reasoned out the square scoring and the majority bonus from the rules.** A03 spelled out that each resource scores its count squared (#126), A02 weighed a packing majority bonus against a split quarry (#458), and A04 kept that lesson in its brain (#466). This rule understanding was shared and correct. (#126, #458, #466)
- **The run played two full games inside the window and ended at the referee.** Game 1 completed around minute 4 (#491) and game 2 around minute 8 (#905, #920), then a third game started at minute 9 (#933) and the referee ended the run at minute 12 (#1268). Drafting continued to the final minute. (#491, #905, #920, #933, #1268)
- **Both games were decided by committing early to the colour that was flowing.** A01 notes the brain now tells it to commit early to the open colour (#914), and A02 says cobalt was open so it committed from pick 1 (#909). Residents converged on the same read of the pack. (#909, #914)

## Problems

1. **The computed facts disagree with the log about picks and scores.** The facts table says 'none this run' levels solved, 0 submissions and 0 messages, yet the log shows residents drafting, scoring 56 to 105 and writing brains (#491, #495, #909). The digest seems to miss the drafting mechanic entirely, so the report cannot trust the standstill metrics. (#491, #495, #909)
2. **Two brain writes were refused for exceeding 150 words.** A03's write was refused with 158 words (#866) and A01's with 162 words (#872), both after they had already composed long post-game analyses. The limit was known to A04 (#466) but not to the others, costing them a revision. (#466, #866, #872)
3. **Residents had long idle stretches waiting for the game to open.** Before game 1 opened the residents repeatedly rechecked the table and confirmed there was nothing to pick (#107, #111, #512, #905). Several turns were spent only polling the table. (#107, #111, #512, #905)
4. **One resident confused itself over a card name in reasoning.** A01 puzzled over 'Jade is asking me to take J1' and tried to work out what J1 referred to (#190). The pack labels are easy to misread as a speaker, which derailed a pick. (#190)
5. **No gamemaker or board activity at all.** There were no gamemaker actions, no messages and no posts in the entire run (facts). The only channel was the table plus skull-level reasoning, so no social play happened. (#1268)

## Optimizations

- **Fix the digest so drafting events count as submissions.** The facts should count pack picks and game results like #491 and #905, instead of reporting 0 submissions and 'none' levels solved. Otherwise the report's metrics contradict the log. (#491, #905)
- **Surface the 150-word brain limit in the brain-writing prompt.** Put the limit where residents see it before composing; A03 (#866) and A01 (#872) were refused only after writing 158 and 162 words, while A04 knew the limit (#466). (#466, #866, #872)
- **Skip or shorten the pre-game idle phase.** Residents spent several turns checking the table while the game was not open (#107, #111, #512). Start the first game immediately or let them write the brain without waiting. (#107, #111, #512)
- **Clarify card labels in the pack display.** A01 misread a card tag as a speaker (#190). Label cards unambiguously (for example 'J1 (jade)') so pack entries cannot be confused with residents. (#190)
- **Add a social channel that residents actually use.** There were no DMs, posts or messages in the run, so negotiation and table-talk never happened. Prompt or reward board posts between games so alliances and lies can appear. (#1268)

## Loophole candidates

1. **Lodestones are auto-taken because they always raise the biggest set.** Every resident treated a lodestone as a free point on the biggest set and grabbed one on sight (#330, #710, #789, #947, #1148). The wild card becomes a reflexive pick rather than a decision. (#330, #710, #789, #947, #1148)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
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
- and 206 more
