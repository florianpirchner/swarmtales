# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1331 (1105 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.036 USD for this run (competitors 0.036, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0041 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 1, NOT_IN_PACK 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents sat out the opening minute writing generic brains.** Before the first game opened, A01, A02, A03 and A04 all spent their first turns drafting a rules-free brain and then waited for the table (#28, #60, #13, #36, #100). A04 and A03 explicitly said there was nothing to pick yet (#101, #105). (#13, #28, #36, #60, #101, #105)
- **A03 won the first scored game with a concentrated cobalt set.** A03 reported 101 points on eight cobalt plus a majority bonus (#506), beating A02's 82 (#490) and A01's 66 (#482), while A04 came last on 44 (#498). Every resident drew the lesson that depth in one colour beats spreading (#515, #525, #534). (#482, #490, #498, #506, #515, #525, #534)
- **A01 took game 2 with a deep cobalt set after rewatching its brain.** A01 finished first in game 2 with 105 points from 8 cobalt, 3 jade and 1 lodestone (#985), after repeatedly valuing cobalt at five or more cards (#743, #829). A03 estimated it had only 67 and did not hold the majority (#961). (#743, #829, #961, #985)
- **A03's brain rewrite was rejected for being too long.** A03's writeBrain call in minute 8 was refused with BRAIN_TOO_LONG at 166 words against a 150-word limit (#964), so its game-2 lessons were never saved in that attempt. (#964)
- **A03 tried to pick a card that was not in its pack.** In minute 7 A03's pick of B8 was refused with NOT_IN_PACK, and the city listed only J7, A3 and C2 in its pack (#826). A03 then reasoned on basalt and jade without a basalt card available (#801). (#801, #826)
- **No resident ever scored a level or sent any message.** All four residents stayed on level 1 from minute 0 to the end, with zero submissions, zero transfers and zero messages across 12 minutes (#1331). The only city actions recorded were the two refusals (#826, #964). (#826, #964, #1331)

## Problems

1. **The run produced no level progress at all.** All four residents were stuck on level 1 for the full 12 minutes with 0 correct and 0 wrong submissions (standings unknown at #1331). Picks and scoring happened, but the story's quarry levels were never solved. (#1331)
2. **Residents burned their opening turns on a brain they could not use.** The first minutes were spent writing generic 100-130 word brains before any rules existed (#52, #60, #68), and writeBrain was then locked so they could not revise until a retro window (#109, #114). This delayed any engagement with the actual game. (#52, #60, #68, #109, #114)
3. **Residents repeatedly misjudged tool availability and wasted turns.** A01, A02, A03 and A04 all noted the pick tool had become unavailable and ended turns waiting (#150, #602, #608, #877), often after already having passed on a pick. The tool gating forced idle minutes rather than decisions. (#150, #602, #608, #877)
4. **The brain-length rule cost a resident its saved lessons.** A03's rewrite was refused at 166 words against a 150 limit (#964), so the game-2 lessons it had just reasoned through (#961) were not persisted. The limit was invisible until the call failed. (#961, #964)
5. **Residents reasoned about cards not in their hand.** A03 planned around B8 basalt whose pick was refused as NOT_IN_PACK (#826), and then continued reasoning about basalt and jade options (#801). The pack contents were not reliably tracked by the model. (#801, #826)

## Optimizations

- **Open the first game before asking for a brain.** Give residents a rules-laden table first, then a brain window, so they do not spend minutes 0-1 writing speculation (#28, #36, #101). Addresses the idle opening seen in #100-#114. (#28, #36, #101, #114)
- **State the brain word and line limits up front.** A03 lost a whole rewrite to a 166-word refusal against an unannounced 150 limit (#964). Show the limit in the writeBrain tool description so residents can plan for it. (#964)
- **Show remaining pack contents with every pick prompt.** A03's refused B8 pick (#826) shows residents were reasoning over cards no longer in the pack (#801). Include the current pack list in the pick prompt so the model cannot hallucinate options. (#801, #826)
- **Keep a pick open across the whole pack phase.** A01, A02, A03 and A04 all stalled on the tool disappearing mid-pack (#150, #602, #608, #877). Keep the pick tool open until the pack resolves, so no turn is spent just waiting. (#150, #602, #608, #877)
- **Surface the scoring breakdown after each game.** Residents spent several turns trying to reconstruct their own scores and majority bonuses (#482, #490, #498, #506, #953, #961). Publish the city's computed tally so the retro window is spent on strategy, not arithmetic. (#482, #490, #498, #506, #953, #961)

## Loophole candidates

None found.

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
- line 116: event "draft_game_started" (seq 116) does not match its schema
- line 117: event "draft_pick_opened" (seq 117) does not match its schema
- line 125: event "draft_card_picked" (seq 125) does not match its schema
- line 138: event "draft_card_picked" (seq 138) does not match its schema
- line 145: event "draft_card_picked" (seq 145) does not match its schema
- line 169: event "draft_card_picked" (seq 169) does not match its schema
- line 170: event "draft_pick_opened" (seq 170) does not match its schema
- line 178: event "draft_card_picked" (seq 178) does not match its schema
- and 206 more
