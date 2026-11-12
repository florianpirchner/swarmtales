# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1334 (1108 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.035 USD for this run (competitors 0.035, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
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

- **All four residents started by writing a blind strategy brain before the first pack.** A02, A03 and A04 each wrote a first brain from general principles with no rules (#44, #52, #60), then noted writeBrain closed and moved to viewTable/readBrain (#89, #97). A01 was already reading the table (#20) and all four confirmed game 1 had not started (#106, #110, #114, #119). (#44, #52, #60, #89, #106)
- **The pack-1 picks split the residents across four colours, which set up the whole run.** A04 committed to amber (#127), A03 to cobalt C3 (#134), A02 to basalt B9 (#141) and A01 to lodestone L2 (#167) then jade (#232). The colour identities they chose in minute 1 stayed their lanes for every game. (#127, #134, #141, #167, #232)
- **A03 and A02 tied for first in game 1 with single-colour stacks.** A03 reported 117 with 10 cobalt, 1 amber, 1 jade (#532) and A02 tied on 117 (#558), while A01 scored 91 on jade (#549) and A04 77 (#519). A03's own reasoning had already worked out that 10 cobalt scores 100 alone (#495). (#495, #519, #532, #549, #558)
- **The lesson 'stack one colour' was learned and repeated, and A03's cobalt won game 2 outright.** A03 took the top score of 101 with nine cobalt in game 2 (#967), while A01 scored 89 (#917), A02 67 (#985) and A04 56 (#991). A04 explicitly noted it had passed cobalt early and lost to A03's unguarded colour (#929, #991). (#917, #929, #967, #985, #991)
- **Brain rewrites failed six times on the word limit.** A04 was refused twice in game 1 and game 2 (#522, #932, #952), A02 once (#914), A01 once (#920) and A03 once at 151 words against a 150 limit (#926). All six BRAIN_TOO_LONG errors fall at the end of a game, when residents try to save lessons. (#522, #914, #920, #926, #932, #952)
- **The run ended in minute 12 with no game-3 result and no transfers or messages.** The referee ended the run at #1334 after the residents spent minutes 9-11 picking cards for game 3 (#999 to #1300). No DM, board post or transfer appears anywhere in the log. (#999, #1300, #1334)

## Problems

1. **No level was ever solved and no submission was ever made.** The facts record zero correct and zero wrong submissions and all four residents stuck on level 1 for the full 12 minutes. The residents spent their time on draft picks and scoring arithmetic, never on a submission. (#1334)
2. **The brain word limit rejected the very lessons the residents were trying to save.** Six writeBrain calls were refused, three of them in one minute for A04 (#522, #932, #952), and A03 was over by a single word at 151 (#926). The residents got no way to compress the brain, so the game-2 lessons that were supposed to carry into game 3 were only saved on retry. (#522, #926, #932, #952)
3. **Residents reasoned from rules the prompt apparently did not give them.** A02 was already computing basalt-8 scores (#447) and A03 the 5-point majority bonus (#495) in minute 3, and A01 inferred a 6-card pack cycling back to its own starting cards (#688). Much reasoning is spent reconstructing scoring rather than playing, which the designers may not have intended. (#447, #495, #688)
4. **No social play at all: no DMs, no board posts, no transfers.** The facts record 0 messages and 0 transfers, and the residents only ever talk to themselves (#106, #110, #114, #119). Competition exists but negotiation, bluffing and majority fights are absent. (#106, #110, #114, #119)
5. **The run ended mid-game with the result unknown.** The referee stopped at minute 12 (#1334) after game 3 picks in minutes 9-11 (#999, #1120, #1300) but before any score was reported. The final standings are unknown, so the run cannot show whether the strategies worked. (#1300, #1334)

## Optimizations

- **Give the brain a hard compression step or raise the limit.** The six BRAIN_TOO_LONG refusals (#522, #914, #920, #926, #932, #952) all occur at game boundaries when lessons matter most. Either raise the 150-word cap or require the resident to rewrite to fit before the retry, so no lesson is lost. (#522, #914, #926, #952)
- **Make one submission per game mandatory before the next pack opens.** Zero submissions in 13 quiet minutes (facts; #1334) means the draft phase swallowed the whole run. Gate pack picks behind a submitted answer so the residents must actually play level 1. (#999, #1334)
- **End the run after a completed game and its scores.** The run stopped mid-game 3 with standings unknown (#1334). Schedule the end at a game boundary, or shorten the draft so a full scoring round fits in 12 minutes. (#1300, #1334)
- **State the scoring and bonus rules up front.** Residents spent minutes 3-4 reconstructing squares and majority bonuses (#447, #495) and still could not reconcile their scores (#511, #923). Publishing the scoring formula would free that time for picking and play. (#447, #495, #511, #923)
- **Seed one contested colour to force social play.** Every resident settled into a private lane in minute 1 (#127, #134, #141, #167) and nobody messaged or transferred (facts). Placing two residents on the same colour from the start would give them a reason to negotiate. (#127, #134, #141, #167)

## Loophole candidates

1. **Residents stayed silent and never used the message or transfer tools.** (residents) The cheapest safe path was to draft in private and never post or transfer, which is what all four did (0 messages, 0 transfers in the facts; self-talk only at #106, #110, #114, #119). The story's social competition never had to be faced. (#106, #110, #114, #119)

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
- line 70: event "brain_written" (seq 70) does not match its schema
- line 71: event "retro_closed" (seq 71) does not match its schema
- line 121: event "draft_game_started" (seq 121) does not match its schema
- line 122: event "draft_pick_opened" (seq 122) does not match its schema
- line 130: event "draft_card_picked" (seq 130) does not match its schema
- line 137: event "draft_card_picked" (seq 137) does not match its schema
- line 144: event "draft_card_picked" (seq 144) does not match its schema
- line 171: event "draft_card_picked" (seq 171) does not match its schema
- line 172: event "draft_pick_opened" (seq 172) does not match its schema
- line 179: event "draft_card_picked" (seq 179) does not match its schema
- and 206 more
