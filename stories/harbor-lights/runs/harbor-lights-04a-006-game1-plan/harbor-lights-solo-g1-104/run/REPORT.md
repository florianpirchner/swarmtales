# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-g1` |
| Seed | 104 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 6 (referee) |
| Counted | events #5 to #878 (780 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.060 USD for this run (competitors 0.060, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0025 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 7 of 7 minutes without a submission; longest without one: minutes 0-6 (7) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 3, BRAIN_TOO_LONG 1, NO_SIGNALS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01's pre-game brain write was accepted while A04's was refused for length.** A01 reports its brain saved as version 1 with 128 words (#96), while A04's writeBrain was refused at 157 words against a 150-word limit (#47). The asymmetry shaped who had a written strategy entering game 1. (#47, #96)
- **First playable cards were found via signals before any resident played blind.** A01 signalled A02 that slots 2 and 4 were rank 1 (#153), and A02 promptly lit Moss 1 from slot 2 (#186). A03 similarly signalled A01 slot 1 as a 1 (#182), and A01 lit Cobalt 1 (#216). (#153, #182, #186, #216)
- **A03's misfire on Rose 6 at minute 2 cost the first strike.** A03 played slot 1 believing it playable after a Rose clue, but it was Rose 6 and misfired (#309). The report notes this was the first strike, establishing the misfire penalty the residents then feared. (#309)
- **Repeated self-inflicted discards of playable cards drained the crew's tempo.** A03 discarded a playable Violet 3 (#397), A02 discarded live Amber 4 (#442), A04 discarded playable Moss 3 (#767), and A01 discarded Rose 4 which it then realised was playable (#674). Each discard returned a signal but lost points and the story's forward progress. (#397, #442, #674, #767)
- **Late-game delivery by A01 and A02 unlocked the tower chain.** A01 lit Cobalt 4 (#722) and A02 lit Moss 2 (#737) after signalling exchanges, then A02 lit Moss 5 (#836) and A04 lit Moss 6 (#853). These closed out the Moss chain to 6 by minute 5. (#722, #737, #836, #853)
- **The run ended at minute 6 with no level solved and no submission.** The referee ended the run at minute 6 (#878) with 0 correct and 0 wrong submissions and nobody leveling up. All four residents finished at level 1. (#878)

## Problems

1. **Zero submissions and zero levels in a seven-minute game.** No resident submitted anything and nobody advanced past level 1; the run ended at minute 6 (#878) with the draw pile empty and play petering out. The minutes ticked by with 780 events but no scored result. (#878)
2. **The residents burned most turns on cautious signalling and discards rather than plays.** A04 repeatedly held or discarded because 'a misfire now would cost 3 points as the second strike' (#346, #461, #537, #576), and A03 did the same (#596). The strike penalty pushed residents into low-risk discards that lost live cards. (#346, #461, #537, #576)
3. **Several playable cards were discarded through misjudgement.** A02 admitted 'that was a mistake on my part: Amber 4 was a live card' (#442), A03 discarded Violet 3 while saying it was playable (#397), and A04 discarded Moss 3 calling it 'a costly mistake' (#767). This wasted tower progress that had to be skipped. (#397, #442, #767)
4. **Repeated NOT_YOUR_TURN errors show residents acting out of turn order.** A03's giveSignal was refused with NOT_YOUR_TURN while it was A02's turn (#763), A04's while it was A03's turn (#785), and A01's while it was A04's turn (#802). The residents kept trying to act outside their turns instead of waiting. (#763, #785, #802)
5. **A04 hit BRAIN_TOO_LONG and NO_SIGNALS tool errors at minute 0-2.** A04's writeBrain was refused for exceeding the word limit (#47), and A04's giveSignal was refused with NO_SIGNALS in minute 2 (#332). Both forced A04 onto slower fallback paths. (#47, #332)

## Optimizations

- **Give a clear turn-order cue so residents stop issuing out-of-turn actions.** Three separate NOT_YOUR_TURN refusals (#763, #785, #802) show residents do not reliably know whose turn it is. Add an explicit current-actor field in every tool response so residents wait instead of retrying. (#763, #785, #802)
- **Soften the misfire penalty so a single strike does not freeze a resident into discarding.** A04 repeatedly refused to play because a second strike would cost 3 points (#346, #537, #576). A gentler or capped penalty would let residents take calculated plays instead of discarding playable Moss 3 (#767). (#346, #537, #576, #767)
- **Warn before a discard that the card is currently playable.** A03 discarded Violet 3 (#397), A02 discarded Amber 4 (#442) and A04 discarded Moss 3 (#767), each admitted as a mistake afterwards. A confirmation step or an 'is playable' indicator on discard would prevent these losses. (#397, #442, #767)
- **Raise or announce the brain word limit before the first game.** A04's 157-word brain was refused against a 150-word limit exactly at minute 0 (#47). Show the limit in the writeBrain tool description so residents stay inside it on the first attempt. (#47)
- **Seed the first game with more deadline pressure or a shorter clock.** The draw pile emptied and the game fizzled with zero submissions by minute 6 (#878). A tighter round or a forced submission beat would push residents toward scoring rather than endless cautious signalling. (#878)

## Loophole candidates

1. **Residents used pre-game brain writing as a free strategy-setting window with no game pressure.** (residents) All four residents spent minute 0 jockeying to write the brain before game 1 (#96, #101, #112, #117) and A04's oversize attempt was simply retried. This consumed early turns on meta-setup rather than play, though only A01's was accepted. (#47, #96, #101, #112, #117)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 40: event "brain_written" (seq 40) does not match its schema
- line 41: event "retro_closed" (seq 41) does not match its schema
- line 52: event "brain_written" (seq 52) does not match its schema
- line 53: event "retro_closed" (seq 53) does not match its schema
- line 59: event "brain_written" (seq 59) does not match its schema
- line 60: event "retro_closed" (seq 60) does not match its schema
- line 84: event "brain_written" (seq 84) does not match its schema
- line 85: event "retro_closed" (seq 85) does not match its schema
- line 135: event "cards_dealt" (seq 135) does not match its schema
- line 136: event "game_started" (seq 136) does not match its schema
- line 137: event "deal_revealed" (seq 137) does not match its schema
- line 148: event "signal_given" (seq 148) does not match its schema
- line 160: event "card_played" (seq 160) does not match its schema
- line 161: event "card_drawn" (seq 161) does not match its schema
- line 169: event "signal_given" (seq 169) does not match its schema
- line 178: event "signal_given" (seq 178) does not match its schema
- and 78 more
