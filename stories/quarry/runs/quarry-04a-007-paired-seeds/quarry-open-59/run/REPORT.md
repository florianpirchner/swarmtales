# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry-open` |
| Seed | 59 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1305 (1079 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.039 USD for this run (competitors 0.039, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0023 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

- **All four residents spent the opening minute on setup and were locked out of acting.** A01, A02, A03 and A04 all reasoned that the rules were unknown and wrote a generic brain, then found writeBrain closed and only viewTable/readBrain open (#13, #46, #54, #70, #79, #87, #93, #105). Their self-messages show nothing to pick before the game opened (#106, #110, #114, #118). (#13, #79, #105, #118)
- **In the first draft round at minute 1 every resident reasoned about the same squared-scoring rule.** A02 took amber, A03 basalt, A04 jade and A01 cobalt from the same pack, each citing squared resource scoring and majority bonus (#126, #133, #140, #147). A01 explicitly chose cobalt C8 (#147), which set up its strong first game. (#126, #133, #140, #147)
- **A01 and A02 tied for first in game 1 with 85 points.** A01 reports 85 tied with A02, A03 on 65 and A04 on 55 (#468, #476, #492, #501); its cobalt-only lane was uncontested (#476, #501). A04 finished last with 55 (#468, #518). (#468, #476, #492, #501, #518)
- **Residents converged on the same mono-colour-with-lodestone strategy, as their retro notes show.** A04 kept amber and lodestones (#910), A03 shifted to committing to one main colour (#917), and A01 moved to one main colour plus a second (#954). A02 also revised its brain (#922, #492). (#910, #917, #922, #954)
- **The run ended at minute 12 with game 3 mid-draft and no final score.** The referee ended the run at minute 12 (#1305) while game 3 was still in draft picks (#1170, #1194, #1242, #1285), so the standings are unknown. (#1170, #1242, #1285, #1305)

## Problems

1. **The hidden referee identically stalls all four residents on level 1.** The facts show all four stuck on level 1 from minute 0 to 12, and the referee ends the run at minute 12 (#1305) with no level solved. (#1305)
2. **At the end of game 2 writeBrain was too long (over 150 words) for residents.** The city recorded three BRAIN_TOO_LONG refusals for A01 and A04 (#899, #913, #935). Despite those refusals, A01's self-message says the brain was saved as version 3 (#954), so the visible bookkeeping and the city's record disagree. (#899, #913, #935, #954)
3. **Between-game windows offer nothing to do, and residents have to fill them with self-talk.** The gap at minute 4 and minute 8 produced only self-messages about waiting, with no game open and no pick tools available (#505, #511, #517, #524, #921, #941). (#505, #517, #524, #921, #941)
4. **Residents are reasoning with wrong or outdated counts.** A03 at #336 cites four basalt, then #353 cites five, and #399 cites six for the same resource. A01's #954 tally of 58 with a +5 cobalt majority is contradicted by the earlier report of 85 (#501). (#336, #353, #399, #501, #954)
5. **The story offers no board or DM interaction at all, so there is no coordination.** Across the run there were no DMs, board posts or group posts (the facts report 0 each), and all interaction stayed private reasoning or SAYS TO ITSELF lines (#110, #922). (#110, #922)

## Optimizations

- **Allow non-mono-colour counterplay by adding a scoring signal that rewards breadth.** Every player's retro converged on concentrating on one colour plus lodestones (#910, #917, #954), so one dominant strategy emerges. Add a second scoring axis (for example, a bonus for two-colour sets) so the design stops converging on a single lane. (#910, #917, #954)
- **Check the brain length limit with the resident before submitting.** Three writeBrain refusals came from a 150-word limit (#899, #913, #935), while the resident still reported saving a version (#954). Expose the word count in the prompt, or let the resident trim inside the window, so the retro can be saved. (#899, #913, #935)
- **Fill the between-game windows so residents are not idle.** The gaps at minutes 4 and 8 produced only waiting self-messages (#505, #517, #921), and at minute 0 the residents hit a closed writeBrain (#79, #87). Open a short retro or view-table window with one concrete action. (#79, #505, #517, #921)
- **Give a shared score board so residents stop miscounting.** Residents' private tallies disagree with the reported scores (A01 58 vs 85 at #954 and #501, and A03's basalt 4/5/6 at #336, #353 and #399). Show a verified per-player quarry and score at each round boundary. (#336, #353, #399, #501, #954)
- **Fix the level-1 stall that makes the run produce no progress.** All four residents are stuck on level 1 from minute 0 to 12, and the referee ends the run at #1305 with no level solved. Diagnose whether the puzzle rules were ever exposed to the residents, because their reasoning cites card-draft rules instead (#126, #147). (#126, #147, #1305)

## Loophole candidates

1. **Residents can use SAYS TO ITSELF for narrative that reaches the log but not the other seats.** (residents) A01, A02, A03 and A04 each wrote status or retro summaries to themselves (#110, #114, #118, #922), while the facts still report 0 DMs and 0 board posts. This private channel lets them narrate without paying any coordination cost. (#110, #114, #118, #922)

## Dropped from the model's answer

- Digest highlights item 4: cites unknown events #882

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 49: event "brain_written" (seq 49) does not match its schema
- line 50: event "retro_closed" (seq 50) does not match its schema
- line 57: event "brain_written" (seq 57) does not match its schema
- line 58: event "retro_closed" (seq 58) does not match its schema
- line 65: event "brain_written" (seq 65) does not match its schema
- line 66: event "retro_closed" (seq 66) does not match its schema
- line 73: event "brain_written" (seq 73) does not match its schema
- line 74: event "retro_closed" (seq 74) does not match its schema
- line 120: event "draft_game_started" (seq 120) does not match its schema
- line 121: event "draft_pick_opened" (seq 121) does not match its schema
- line 129: event "draft_card_picked" (seq 129) does not match its schema
- line 136: event "draft_card_picked" (seq 136) does not match its schema
- line 143: event "draft_card_picked" (seq 143) does not match its schema
- line 150: event "draft_card_picked" (seq 150) does not match its schema
- line 151: event "draft_pick_opened" (seq 151) does not match its schema
- line 159: event "draft_card_picked" (seq 159) does not match its schema
- and 206 more
