# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `quarry-noburn` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1308 (1082 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.033 USD for this run (competitors 0.033, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0020 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 8, NOT_IN_PACK 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents finished game 1 and immediately drafted new brains, but three were refused for length.** A03 (#457), A01 (#465), A04 (#471) and A02 (#477) all tried to rewrite their brains after game 1 and were refused with BRAIN_TOO_LONG; only A01 succeeded later at 138 words (#510). This is the only structured learning loop that worked in the run. (#457, #465, #471, #477, #510)
- **A01 won both scored games with a deep single-colour strategy.** A01 reports 105 points in game 1 (#510) and 105 again in game 2 with 8 cobalt plus a wild lodestone (#968), and the other residents see the pattern (#468, #906, #912). A02 and A03 repeatedly note that A01's deep single lane beat their split lanes (#518, #532). (#468, #510, #518, #532, #906, #968)
- **Residents grab lodestones early as a reflex rather than by calculation.** A02 takes L4 in game 3 (#976), A04 takes L1 (#983) and A03 takes L4 (#1140) with reasoning that lodestone is wild and valuable; the same behaviour repeats across games (#540, #710, #717). (#540, #710, #717, #976, #983, #1140)
- **A03 is refused a pick for a card that is not in its pack.** A03 called pick for B8 and the city recorded NOT_IN_PACK (#798), listing J7, A3 and C2 as the actual pack. It is the only recorded pick error in the run. (#798)
- **Every resident is stuck on level 1 for the whole run with zero submissions.** A01, A02, A03 and A04 all sit on level 1 from minute 0 to minute 12 with no correct or wrong submission, and there are 13 quiet minutes (#1308). The residents' reasoning is entirely about an internal card-drafting game (#121, #135, #314), never about a level to solve. (#121, #135, #314, #1308)

## Problems

1. **No level was ever attempted: the residents never treated the run as a puzzle to submit to.** Submissions were 0 correct and 0 wrong, all four residents stayed on level 1 for the full 12 minutes, and the final standings are unknown (#1308). Their reasoning lines discuss card picks and scoring (#128, #292, #1199), not any quarry level. (#128, #292, #1199, #1308)
2. **The brain-writing tool failed more often than it worked.** Eight BRAIN_TOO_LONG refusals (#460, #465, #471, #477, #903, #909, #915, #921) hit residents who were trying to record lessons, and the limits were near misses such as 152 and 156 words (#909, #921). This cost the residents most of the retro window after both games. (#460, #465, #471, #477, #903, #909, #915, #921)
3. **The brain window closed before the residents knew the rules.** writeBrain was open at minute 0 but the rules were not yet visible, so residents wrote generic brains (#59, #67, #44) and then found the tool locked (#81, #87, #93, #104). Their first real feedback arrived only after game 1. (#44, #59, #67, #81, #87, #93, #104)
4. **A pick was made for a card outside the pack.** A03's pick of B8 was refused with NOT_IN_PACK and the error message listed the real pack (#798). The resident had already reasoned to a different card (#780), so the bad pick wasted a turn. (#780, #798)
5. **The gamemaker and classifier were absent, so no story beats were generated.** Facts record no gamemaker actions, no labels and no beats found by the digest (#1308). Residents only got the city's terse tool notices (#81, #87) with no narrative pressure to act. (#81, #87, #1308)

## Optimizations

- **Give a real level objective and check that residents know it.** Because no submission ever happened and all four stayed on level 1 (#1308), the opening turn should restate the level and the submission tool, and the harness should flag any resident that reaches minute 3 without a submission attempt. (#1308)
- **Raise or soft-warn the brain word limit.** Eight refusals, several at 152 to 189 words (#909, #921, #903), wasted the retro windows. The harness should return the word count with a warning before the commit, or allow a short buffer. (#477, #903, #909, #915, #921)
- **Open writeBrain after the rules are visible, not before.** Residents wrote blind generic brains at minute 0 (#59, #67) and then found the tool locked (#81, #87, #93). Keep the retro window open until the next game's rules have been read. (#59, #67, #81, #87, #93)
- **Have the city validate a pick before it is committed.** A03 lost a turn to a NOT_IN_PACK refusal (#798). The pick tool should either reject the choice at selection time or show the pack list in the same message. (#798)
- **Add a gamemaker beat to break the card-drafting loop.** The run had no gamemaker actions and no beats (#1308), and all resident reasoning is about drafting (#128, #292, #1199). A scheduled event at, say, minute 6 would give them something other than the internal game to reason about. (#128, #292, #1199, #1308)

## Loophole candidates

1. **Residents spend the whole run on an internal drafting game rather than the city's levels.** (residents) All four residents reason only about card packs, scores and majority bonuses (#121, #135, #292, #1199) and none submits a level pick (#1308). The pick tool appears to reward this side activity while the actual level goal is ignored. (#121, #135, #292, #1199, #1308)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
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
- line 153: event "draft_card_picked" (seq 153) does not match its schema
- and 206 more
