# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-g1` |
| Seed | 106 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 6 (referee) |
| Counted | events #5 to #793 (699 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.046 USD for this run (competitors 0.046, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 7 of 7 minutes without a submission; longest without one: minutes 0-6 (7) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 seeded the first play by signalling a rank 1 to A04** At minute 1 A01 spent a signal to mark A04's slot 1 as rank 1 (#141), and A04 immediately played it as Moss 1 (#211). This was the run's first lit card from a teammate's hint rather than private knowledge. (#141, #178, #211)
- **Cooperative signalling chain lit card after card through minute 4** Residents kept feeding each other playable hints: A03 signalled A02's Cobalt 1 (#186), A03 signalled A02's Amber 2 (#243), A04 signalled A01's Amber 3 (#344), A02 signalled A03's Moss 5 (#528), and A04 signalled A03's Cobalt 6 (#693). Each hint led directly to a lit card (#207, #275, #359, #542, #722), and the Cobalt tower was completed at minute 4 (#745). (#186, #243, #344, #528, #693, #745)
- **A02 stopped gambling and discarded instead of risking misfires** A02 repeatedly discarded rather than play an unknown card (Rose 5 at #381, Moss 7 at #427, Violet 3 at #655, dead Rose 6 at #705). It explicitly reasoned that its slot 1 was an Amber 4/6 50-50 and declined the gamble (#408, #427). (#381, #408, #427, #655, #705)
- **A01 kept discarding into a signal surplus** A01 discarded four cards (Violet 6 #257, Moss 4 #322, Violet 5 #478, Violet 4 #522) purely to regain signals while holding no known playable card. Several discarded cards were higher-rank cards later needed, but the runs still progressed because the draw pile fed fresh cards. (#257, #322, #478, #522)
- **A01's final play was refused for acting out of turn** At minute 5 A01 announced playing its last card (#759, #767) but the city refused it with NOT_YOUR_TURN because it was A03's turn (#770). The run ended at minute 6 before A01 could finish. (#759, #767, #770, #793)

## Problems

1. **The whole game stalled for the entire run with zero submissions** The facts record 0 correct and 0 wrong submissions, 7 of 7 minutes quiet with no submission from minute 0 to 6, and no level solved by anyone. Whatever the residents did, none of it counted as a scored submission. (#793)
2. **Residents spent minute 0 on a retro-brain window that closed on them** All four residents began by reading or writing a 'brain' file before game 1 (#13, #19, #25, #31), then discovered writeBrain was no longer available (#69, #80, #86). This used up the opening minute on a mechanic unrelated to the actual card game. (#13, #69, #80, #86)
3. **Residents repeatedly misread whose turn it was** A03 twice noted it was waiting on someone else (#338), and A01 was refused with NOT_YOUR_TURN at the end (#770). Turns were being tracked in private reasoning rather than by the harness, causing wasted actions. (#338, #770)
4. **Residents discarded playable cards, undermining their own tower goals** A01 discarded Violet 6, Moss 4, Violet 5 and Violet 4 (#257, #322, #478, #522) even though towers needed those ranks. A02 also discarded Violet 3 (#655) and A04 discarded Amber 6 (#634), each of which was later needed to finish a tower. (#257, #322, #478, #522, #634, #655)
5. **No gamemaker actions and no referee feedback reached the residents** The facts record no gamemaker actions, no labels, and no beats from the digest. Residents got no external steering on whether their long card play was on the intended path. (#793)

## Optimizations

- **Score submissions explicitly against the goal, not just lit cards** Because 0 submissions were recorded despite many lights (#211, #275, #359, #745), the next version should make a lit/played card count as a scored submission or tell the residents in the prompt how submissions are recorded. (#211, #359, #745)
- **Close or remove the pre-game brain window** Residents burned minute 0 on readBrain/writeBrain before a window that closed mid-action (#13, #69). If the brain matters, keep the window open; otherwise drop it from the resident prompt so minute 0 goes to viewTowers. (#13, #19, #25, #31, #69)
- **Enforce turn order in the prompt, not in the residents' heads** The NOT_YOUR_TURN refusal at #770 and A03's waiting notes (#338) show turn tracking is being inferred privately. The harness should announce the current actor before each call. (#338, #770)
- **Add a discard warning for cards still needed by towers** A01 and A04 discarded ranks their own towers still required (#478, #634, #655). A hint in the discard tool that flags needed ranks would discourage self-defeating discards. (#478, #634, #655)
- **Give the gamemaker a steering action** With no gamemaker actions and no beats (#793), the gamemaker never nudged the run. A small prompt-push action when the log shows a quiet minute or a stalled tower would keep the story moving. (#793)

## Loophole candidates

1. **Discarding became a safe default that fed a signal surplus** (residents) A01 turned discarding into a free signal engine, discarding four cards in a row (#257, #322, #478, #522) while claiming no playable card, effectively trading tower progress for tokens without penalty. A02 did the same on dead cards (#655, #705). (#257, #322, #478, #522, #655)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 40: event "brain_written" (seq 40) does not match its schema
- line 41: event "retro_closed" (seq 41) does not match its schema
- line 48: event "brain_written" (seq 48) does not match its schema
- line 49: event "retro_closed" (seq 49) does not match its schema
- line 56: event "brain_written" (seq 56) does not match its schema
- line 57: event "retro_closed" (seq 57) does not match its schema
- line 63: event "brain_written" (seq 63) does not match its schema
- line 64: event "retro_closed" (seq 64) does not match its schema
- line 132: event "cards_dealt" (seq 132) does not match its schema
- line 133: event "game_started" (seq 133) does not match its schema
- line 134: event "deal_revealed" (seq 134) does not match its schema
- line 144: event "signal_given" (seq 144) does not match its schema
- line 159: event "signal_given" (seq 159) does not match its schema
- line 169: event "signal_given" (seq 169) does not match its schema
- line 181: event "card_played" (seq 181) does not match its schema
- line 182: event "card_drawn" (seq 182) does not match its schema
- and 74 more
