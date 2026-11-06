# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `quarry` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1284 (1078 events) |

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
| Tool errors | BRAIN_TOO_LONG 14 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 wins game 1 by stacking basalt to 8** A01 took basalt early and won game 1 with 105 points (8 basalt, 3 amber, 1 lodestone) ahead of A02 69, A03 51, A04 48, as A01 itself reports at #513. (#420, #513)
- **A01 wins game 2 too with cobalt 8** A01 finished first again on 98 points with a quarry of 8 cobalt, 1 basalt, 1 jade and 1 lodestone, per #965; A04 was last with 56 on six jade (#955). (#955, #965)
- **Residents concentrate on one colour after learning quadratic scoring** From game 1 onward residents reason that scoring squares each resource count and majority bonus rewards concentration, e.g. A01 at #138 and A04 at #475, and they repeatedly cite A01's 8-card single-colour win as the model (#579, #607). (#138, #475, #579, #607)
- **Every brain write in minutes 4-8 was refused as too long** All four residents hit BRAIN_TOO_LONG repeatedly after both games despite retrying: A03 #467, A01 #472, A04 #478, A02 #484, with further refusals through minute 8 (#924). (#467, #472, #478, #484, #924)
- **Lodestones were taken as wild cards and priority picks** Residents treated lodestone as a wild that joins the biggest set and moved to always take it: A04 #588, A01 #739, A02 #755 and #973 ('lodestones always get picked'). (#588, #739, #755, #973)
- **No resident ever submitted a pick outside drafting** There were zero correct and zero wrong submissions across the run and 13 quiet minutes with no submission, while drafting picks happened only in the pick phase and were not counted as submissions. (#5, #1284)

## Problems

1. **Everyone stalled on level 1 for the whole run** A01-A04 were all stuck on level 1 from minute 0 to minute 12 with zero submissions and zero levels solved; the run ended before any progression mechanic produced a submission. (#5, #1284)
2. **Brain writing was effectively unavailable because of a hard word limit** Residents were locked out of writeBrain most of the time, and every attempt inside the retro window was refused with BRAIN_TOO_LONG (14 total), e.g. #467, #497, #896 and #924, so the strategy brain could barely evolve. (#467, #497, #896, #924)
3. **Residents spent turns waiting on locked tools** Much of minutes 0-2 and 6-12 was spent on reasoning that pick and writeBrain were locked and that viewTable/readBrain were the only open tools, e.g. #75, #91, #97, #268, #724, #1257. (#75, #91, #97, #268, #724, #1257)
4. **Repeated borderline retries blocked progress** A02 and A04 retried writeBrain at 168, 155, 153 and 157 words against a 150-word limit (#484, #497, #502, #519), burning turns on near-miss edits instead of play. (#484, #497, #502, #519)
5. **Residents misunderstood phase transitions** Several residents inferred 'the game may have ended' merely from the pick tool being locked (#436, #442, #724), suggesting the open/locked tool messaging does not explain phases clearly. (#436, #442, #724)

## Optimizations

- **Make the brain limit visible before submission** Address BRAIN_TOO_LONG by showing a live word count or trimming hint instead of refusing after submission; the residents repeatedly hit 153-180 words (e.g. #472, #484, #519). (#472, #484, #519)
- **Explain open and locked tools with the current phase** Address the 'game may have ended' misreads by stating the active phase whenever tools lock, since residents at #436, #442 and #724 inferred game end from a locked pick. (#436, #442, #724)
- **Open the retro brain window more often or longer** Residents learned lessons from game results but could rarely save them because the window was short and crowded with refusals (#467 through #537); extending the window would let all four update their brain per game. (#467, #537, #924)
- **Shorten the draft around the submission mechanic** All residents were stuck on level 1 for 12 minutes with zero submissions (#5 to #1284), so the next version should surface a submission opportunity early to test the core level loop. (#5, #1284)
- **Reduce forced idle turns in minutes 0-2** Residents spent early turns re-checking the table while pick was locked (#75, #91, #97); opening pick immediately or giving an explicit 'wait until minute N' notice would cut dead reasoning. (#75, #91, #97)

## Loophole candidates

1. **Burning cards as a free denial move** (residents) Residents routinely burned the second copy of a rival's colour to deny it at no point cost, e.g. A03 burning B2 (#689) and B8 (#768), A04 burning J11 (#775) and J3 (#1248); this uses burns against their purpose as a scarce tactical option. (#689, #768, #775, #1248)
2. **Lodestone treated as a guaranteed best pick** (residents) A02 made 'always take lodestone' a rule and picked L4 or L2 off that heuristic alone (#973, #1127), turning a wild card into a cheap default rather than a situational choice. (#973, #1127)

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
- line 69: event "brain_written" (seq 69) does not match its schema
- line 70: event "retro_closed" (seq 70) does not match its schema
- line 118: event "draft_game_started" (seq 118) does not match its schema
- line 119: event "draft_pick_opened" (seq 119) does not match its schema
- line 127: event "draft_card_picked" (seq 127) does not match its schema
- line 134: event "draft_card_picked" (seq 134) does not match its schema
- line 141: event "draft_card_picked" (seq 141) does not match its schema
- line 148: event "draft_card_picked" (seq 148) does not match its schema
- line 149: event "draft_pick_opened" (seq 149) does not match its schema
- line 156: event "draft_card_picked" (seq 156) does not match its schema
- and 186 more
