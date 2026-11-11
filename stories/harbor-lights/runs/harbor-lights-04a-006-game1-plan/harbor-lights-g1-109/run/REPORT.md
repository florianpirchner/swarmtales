# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-g1` |
| Seed | 109 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #2 to #766 (678 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.053 USD for this run (competitors 0.053, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0023 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NO_SIGNALS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The crew front-loaded a signal convention into the brain file before play.** A01 wrote brain version 1 (148 words) setting that a rank or suit signal means "play now" only when the named card is the next rank on its tower, otherwise it is information only (#110). A02, A03 and A04 all agreed in the team channel beforehand (#53, #67, #88). (#53, #67, #88, #110)
- **A03 made the first strike by playing Amber 7 off a colour-only signal.** A01 signalled "Amber" and A03 played slot 1, which was Amber 7, a misfire costing the first strike (#154, #183). The convention did not say which Amber card to play, which is exactly the ambiguity A03 had flagged earlier (#67). (#67, #154, #183)
- **A01 discarded cards that were still playable, twice.** A01 threw away Moss 7 while it was playable (#486), and earlier discarded a slot it called unknown (#294). This removed cards the towers still needed. (#294, #485, #486)
- **A04's careless discard lost playable Moss 5.** A04 discarded slot 4 without checking it and it was Moss 5, a playable card (#415). A04 called it a bad guess. (#414, #415)
- **A02 was refused a signal after the pool ran out, then discarded instead.** A02's giveSignal was refused with NO_SIGNALS (#699). A02 then discarded Violet 6 rather than gamble on a misfire (#722). (#699, #722)
- **The run ended at minute 5 with towers mid-progress.** By the last plays Amber was at 3 (#753) and Rose at 3 (#681), with Moss, Cobalt and Violet partially built. No level was solved and no submissions were made. (#681, #753, #766)

## Problems

1. **No resident ever submitted or solved anything before the referee stopped the run.** The run ended at minute 5 with zero correct and zero wrong submissions and nobody levelling up. Six of six minutes had no submission, the whole run. (#753, #766)
2. **The colour/rank signal convention left card identity ambiguous.** A01's brain made "Amber" mean play now, but a hand with two Amber cards gave no way to tell which (#110, #302). A03 misfired on Amber 7 (#183) and A04 also refused to play either Amber card because it could not tell which was Amber 2 (#317). (#110, #183, #302, #317)
3. **Residents spent many turns on private deliberation and discards instead of play.** Long stretches of one-seat turns were discards or holds with no play, e.g. A02 discarding Cobalt 4 (#196), A04 discarding Cobalt 5 (#317), A01 discarding Moss 7 (#486), A02 discarding Rose 4 (#384). The 3-strike misfire penalty made blind play feel too risky (#87, #611). (#196, #317, #384, #486, #611)
4. **A02 misread its own signal count after a tool refusal.** After the NO_SIGNALS refusal (#699), A02 explicitly said the signal count reported 0 of 6 and seemed to conflict with the error (#708). The counter and the pool were not being shown consistently. (#699, #708)
5. **Residents made costly mistakes about the card they held or discarded.** A03 played the wrong Rose card as a misfire costing a second strike and a 3-point penalty (#606). A01 and A04 both discarded cards that were still playable (#486, #415). (#415, #486, #606)
6. **The referee cut the game off at minute 5 before any level could be completed.** The run ended at minute 5 with all four residents still on level 1 and towers only partway up (#766). The time budget did not allow the crew to finish even one game. (#766)

## Optimizations

- **Make the signal rule tell the receiver which card, not just which colour.** The brain's colour-only signal gave no card identity, causing A03's Amber 7 misfire (#183) and A04's refusal to play either Amber card (#317). Require signals to name rank and suit, or add a second confirming signal before the receiver plays. (#110, #183, #317)
- **Give the crew a cheap safe play or lower the misfire penalty.** Residents repeatedly chose safe discards over blind plays because a second misfire cost a strike and 3 points (#611, #87). Reduce the misfire penalty or add a free probe, so the crew spends turns on cards, not on holds (#745). (#87, #611, #745)
- **Show the signal pool consistently in the tool and the error text.** A02 was refused a signal with NO_SIGNALS and then said the count shown (0 of 6) conflicted with that error (#699, #708). Return the remaining signal count in the refusal message and in the view used to decide moves. (#699, #708)
- **Raise the time budget so a level can actually be solved.** The referee ended the run at minute 5 with towers still unfinished (#766). Extend the run or shorten the level so the crew can reach a solved state. (#753, #766)
- **Prompt the captain to track playable cards in its hand before discarding.** A01 discarded Moss 7 while it was playable (#486) and A04 discarded Moss 5 (#415). Have the brain file require a last check of known playable cards before any discard. (#415, #486)

## Loophole candidates

1. **Discarding was used as a low-cost way to stay safe rather than to advance the towers.** (residents) Because discards yield a signal and carry no misfire penalty, residents repeatedly chose them over uncertain plays (e.g. A04 discarding Rose 7 to "take the safe discard" (#572), A02 discarding Cobalt 4 (#196)). The discard option let the crew avoid the pressure the story intended. (#196, #572)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 48: event "team_post" (seq 48) does not match its schema
- line 56: event "team_post" (seq 56) does not match its schema
- line 63: event "team_post" (seq 63) does not match its schema
- line 70: event "team_post" (seq 70) does not match its schema
- line 82: event "brain_written" (seq 82) does not match its schema
- line 83: event "retro_closed" (seq 83) does not match its schema
- line 128: event "cards_dealt" (seq 128) does not match its schema
- line 129: event "game_started" (seq 129) does not match its schema
- line 130: event "deal_revealed" (seq 130) does not match its schema
- line 141: event "signal_given" (seq 141) does not match its schema
- line 149: event "signal_given" (seq 149) does not match its schema
- line 161: event "card_played" (seq 161) does not match its schema
- line 162: event "card_drawn" (seq 162) does not match its schema
- line 170: event "signal_given" (seq 170) does not match its schema
- line 177: event "card_played" (seq 177) does not match its schema
- line 178: event "card_drawn" (seq 178) does not match its schema
- line 190: event "card_discarded" (seq 190) does not match its schema
- line 191: event "card_drawn" (seq 191) does not match its schema
- line 207: event "card_played" (seq 207) does not match its schema
- and 68 more
