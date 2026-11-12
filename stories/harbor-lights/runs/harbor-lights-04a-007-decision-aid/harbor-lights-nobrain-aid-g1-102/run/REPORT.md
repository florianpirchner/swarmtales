# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-aid-g1` |
| Seed | 102 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 4 (referee) |
| Counted | events #4 to #583 (504 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.046 USD for this run (competitors 0.046, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0019 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 5 of 5 minutes without a submission; longest without one: minutes 0-4 (5) |
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

- **A03 opens by signalling rank 1 to A01 and then lights Cobalt 1.** A01 used its first turn to hint rank 1 at A03's slots (#37), and A03 followed by lighting Cobalt 1 from slot 3 (#53). This was the run's first successful play chain. (#37, #53)
- **A02's blind opening play misfires immediately.** A02 played slot 1 without information and hit Moss 2, taking a strike at minute 0 (#48). It then switched to discarding for signals (#121). (#48, #121)
- **The crew builds several towers to completion in the middle minutes.** Amber was completed by A01 (#424), Cobalt by A04 (#429), Violet by A01 (#489) and A04 (#508), and Rose advanced through A02 and A04 (#542, #549). This shows signals and definite plays carried most of the progress. (#424, #429, #489, #508, #542, #549)
- **A03 repeatedly refuses 50/50 Moss plays and burns signals instead.** A03 held Moss 6/7 as a coin flip and passed with signals rather than risk a misfire, twice at minute 2 (#442, #502). It only played the final Moss card once it was certain (#575). (#442, #502, #575)
- **A02 discards a needed Rose 3 and later has no Rose 3 to play.** A02 discarded slot 1, which was Rose 3 (#478), then after lighting Rose 2 noted the only Rose 3 it held was gone (#542). That discard removed a card the crew needed for the Rose tower. (#478, #542)
- **Run ends at minute 4 with the Moss tower unfinished.** After A03 played its last certain Moss card at minute 3 (#575), the referee ended the run at minute 4 (#583) with levels unsolved and no submissions. (#575, #583)

## Problems

1. **No level was solved and no submission was made in the whole run.** The facts show 0 submissions and nobody leveling up across all four residents, ending at minute 4 (#583). Residents spent the run on partial tower progress rather than finishing the level. (#583)
2. **Residents under-use signalling and hoard it, then pass.** A03 used its last signals to pass rather than act (#442, #502), and A02 noted it had no signals and could only play or discard (#465). The signal economy pushed cautious residents into dead turns. (#442, #465, #502)
3. **Coin-flip plays deter action and stall progress.** A03's repeated refusal of the 50% Moss play (#433, #394) and A04's weighing of 50% risks (#252) show the misfire penalty suppressing plays. Time was spent reasoning about odds instead of acting. (#252, #394, #433)
4. **Residents discard useful cards to regain signals.** A02 discarded Rose 3 for a signal (#478) and later found the Rose tower needed exactly that card (#542). Discard-for-signal is a rational local move that hurt the shared goal. (#478, #542)
5. **Reasoning lines are long and speculative, with little action per minute.** Many turns consist of extended private probability estimates (#89, #133, #379) with only an end-turn or a discard. This burned the short 5-minute run on analysis. (#89, #133, #379)

## Optimizations

- **Shorten the level or lengthen the clock for a 5-minute run.** The run ended at minute 4 with Moss still incomplete (#583, #575); a smaller initial objective or more minutes would let the crew actually finish and submit. Cite #583. (#575, #583)
- **Reward signals more and misfires less to encourage decisive plays.** Residents repeatedly avoided 50% plays because of the 3-point misfire cost (#394, #433, #252); a softer misfire penalty or bonus for signalling would reduce dead turns like A03's passes (#442, #502). (#252, #394, #433, #442, #502)
- **Warn or discourage discarding cards the crew still needs.** A02 discarded Rose 3 (#478) and the crew then needed it (#542); showing which tower a discard blocks, or making discard-for-signal costlier, would avoid this. (#478, #542)
- **Cap reasoning length so residents act within the minute.** Extended odds deliberation (#89, #379) consumed turns with little play; a tighter reasoning budget would convert those into actions. (#89, #379)

## Loophole candidates

1. **Passing with a signal avoids any risk while keeping the turn.** (residents) A03 chose to end turns with a signal rather than play a 50% card (#442, #502), effectively using signalling as a safe no-op. This sidesteps the intended pressure to play cards. (#442, #502)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 15: event "signal_given" (seq 15) does not match its schema
- line 23: event "card_played" (seq 23) does not match its schema
- line 24: event "card_drawn" (seq 24) does not match its schema
- line 31: event "card_played" (seq 31) does not match its schema
- line 32: event "card_drawn" (seq 32) does not match its schema
- line 44: event "signal_given" (seq 44) does not match its schema
- line 61: event "card_played" (seq 61) does not match its schema
- line 62: event "card_drawn" (seq 62) does not match its schema
- line 69: event "signal_given" (seq 69) does not match its schema
- line 76: event "card_played" (seq 76) does not match its schema
- line 77: event "card_drawn" (seq 77) does not match its schema
- line 84: event "signal_given" (seq 84) does not match its schema
- line 92: event "signal_given" (seq 92) does not match its schema
- line 99: event "card_discarded" (seq 99) does not match its schema
- line 100: event "card_drawn" (seq 100) does not match its schema
- line 107: event "card_discarded" (seq 107) does not match its schema
- line 108: event "card_drawn" (seq 108) does not match its schema
- and 59 more
