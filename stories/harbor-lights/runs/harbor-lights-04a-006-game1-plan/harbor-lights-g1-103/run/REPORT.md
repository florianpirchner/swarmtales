# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-g1` |
| Seed | 103 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #2 to #761 (676 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.049 USD for this run (competitors 0.049, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0025 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NO_SIGNALS 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The crew spent minute 0 agreeing on a signal convention but never wrote it anywhere official.** All four residents read the brain and team channel, then A02, A04 and A03 each confirmed a short convention (rank = play now, suit = info only) while leaving the actual writeBrain to A01 (#51, #66, #74). A01 declared the brain "already written as version 1" (#81) although the facts record zero board posts, zero DMs and no gamemaker action, so the agreement existed only in private thoughts. (#51, #66, #74, #81)
- **Early signalling worked exactly as designed, lighting playable 1s.** A01 signalled "1" to A04 (#146) and A04 played Violet 1 from slot 2 (#182); A02 signalled "1" to A01 (#166) and A01 played Cobalt 1 (#197); A04 then played Moss 1 (#242). Within minute 1 the early game ran on the intended hint-to-play loop. (#146, #166, #182, #197, #242)
- **Signal scarcity caused a refused action and forced risky plays.** At minute 2 A04 tried to giveSignal and was REFUSED with NO_SIGNALS (#366), then played slot 2 blind as Rose 3 and lit it (#389). The same refusal hit A04 again at minute 4 (#719), after which it discarded its last card instead (#745). (#366, #389, #719, #745)
- **A01's blind plays and discards produced costly misfires.** A01 discarded Moss 3 (#308) and Cobalt 4 (#340) to regain signals, then gambled on slot 1 and hit Moss 7 for a misfire (#420). At minute 4 A01 discarded Moss 6 and was left with a single known playable card (#635, #669). (#308, #340, #420, #635, #669)
- **A02's gamble on slot 1 became strike 3.** A02 reasoned that both remaining cards were playable but could not tell which slot held which (#600), played slot 1, and hit Cobalt 7 early for a misfire costing 3 points (#601). (#600, #601)
- **The run ended with two residents out of cards and no level solved.** By minute 4 A01 and A02 were empty-handed (#683, #695) while A03 still held Rose 5, Rose 6 and the dead Violet 6 and A04 held only the dead Violet 7 (#647, #691). A03 played Rose 5 (#709, #724) and the referee ended the run at minute 5 with no level-ups. (#683, #691, #695, #709, #724, #761)

## Problems

1. **Nobody recorded the agreed convention, leaving the "brain" purely fictional.** A01 asserted the brain was written as version 1 (#81) though the facts record 0 board posts, 0 DMs and 0 group posts; the other residents deferred writeBrain to A01 (#90, #99). The crew then acted on a shared contract that the city never stored. (#81, #90, #99)
2. **The signalling economy ran dry mid-run, blocking the intended coordination mechanic.** Two giveSignal attempts were REFUSED for NO_SIGNALS (#366, #719), and A04's own reasoning flagged the signal display as contradictory, reading 0 of 6 after earlier seeing 1 of 6 (#730). Residents were forced into blind plays precisely when coordination mattered most. (#366, #719, #730)
3. **Residents repeatedly discarded instead of playing, burning cards for signals.** A01 discarded three times (#308, #340, #635), A02 discarded twice (#438, #552) and A04 discarded at least twice (#453, #745). The discard-to-signal fallback became the dominant safe move whenever hands were unknown, and the draw pile emptied (#551). (#308, #340, #438, #453, #552, #635, #745)
4. **Blind slot choices were unavoidable and drove the misfires.** A01 chose between Moss 2 and Moss 6 as a coin flip (#615) and lost (#420); A02 knew both remaining cards were playable but not their positions (#600) and misfired (#601). Slots were frequently known only by candidate sets, never by identity, so play decisions were gambles. (#420, #600, #601, #615)
5. **No level was solved and there were no submissions in any of the six minutes.** The computed facts record 0 correct and 0 wrong submissions with the longest quiet stretch spanning minutes 0-5 (#761). The version never reached its scoring loop, so its story beats are unexercised. (#761)
6. **Reasoning references tower states the public log never shows.** Residents cite detailed tower levels and card identities in private thoughts (e.g. #394, #470, #544) that no visible event line ever records, making their plan impossible for a reader or teammate to audit. This leaves the run's only narrative in private reasoning. (#394, #470, #544)

## Optimizations

- **Make the brain file write mandatory and auto-recorded before the first move.** Addresses the unrecorded-convention problem (#81, #99): have the harness force A01's writeBrain call in minute 0 and echo the result to the team channel so residents cannot act on a contract the city never stored. (#81, #90, #99)
- **Guarantee a minimum signal budget or auto-refresh on refusal.** Addresses NO_SIGNALS refusals (#366, #719) and the contradictory display (#730): give each crew member at least one signal per turn or make the counter visibly consistent, so hinting stays the primary coordination path. (#366, #719, #730)
- **Reduce the penalty for informing plays or expose slot identity on a signal.** Addresses unavoidable blind plays (#600, #615) that caused strikes (#420, #601): a rank signal from a teammate should reveal the matching slot's exact card, converting guesses into deduction. (#420, #600, #601, #615)
- **Cap or rebalance discards so dumping a card for a signal is not the default safe move.** Addresses the discard-heavy pattern (#308, #340, #438, #635, #745) that drained the deck (#551) and emptied A01/A02 by minute 4 (#683, #695): limit discards per resident or attach a point cost. (#308, #438, #551, #635, #683, #745)
- **Add a visible end-of-tower summary so progress is observable.** Addresses the absence of any public tower/level state (#394, #470, #761): emit a periodic city-log line with tower levels and total lit, so the run's claimed progress can be checked against events rather than private thoughts. (#394, #470, #761)

## Loophole candidates

1. **Residents treated an unwritten brain file as already agreed.** (residents) A01 announced the brain was written as version 1 (#81) while other residents deferred the writeBrain to A01 and never verified it (#90, #91, #99). The crew effectively made a binding contract that exists in no city record, bypassing the intended shared-drift mechanic. (#81, #90, #91, #99)
2. **Residents used private reasoning to coordinate without board posts or DMs.** (residents) Despite 0 board posts and 0 DMs, residents repeated the same convention and cited each other's signals (#146, #170), so plans propagated through observed signals and private inference rather than the public channel the story intends. (#146, #170)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 47: event "team_post" (seq 47) does not match its schema
- line 54: event "team_post" (seq 54) does not match its schema
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
- line 69: event "team_post" (seq 69) does not match its schema
- line 77: event "team_post" (seq 77) does not match its schema
- line 121: event "cards_dealt" (seq 121) does not match its schema
- line 122: event "game_started" (seq 122) does not match its schema
- line 123: event "deal_revealed" (seq 123) does not match its schema
- line 134: event "signal_given" (seq 134) does not match its schema
- line 142: event "signal_given" (seq 142) does not match its schema
- line 153: event "signal_given" (seq 153) does not match its schema
- line 160: event "card_played" (seq 160) does not match its schema
- line 161: event "card_drawn" (seq 161) does not match its schema
- line 177: event "card_played" (seq 177) does not match its schema
- line 178: event "card_drawn" (seq 178) does not match its schema
- line 190: event "card_played" (seq 190) does not match its schema
- line 191: event "card_drawn" (seq 191) does not match its schema
- line 204: event "signal_given" (seq 204) does not match its schema
- and 65 more
