# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-nobrain` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #4 to #1975 (1743 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.166 USD for this run (competitors 0.166, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0052 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 4 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 keeps signalling teammates' cards instead of risking blind plays, and four cards get lit in the first minutes.** A01 spends its turns giving rank hints to A02, A03 and A04 (#48, #64, #370) rather than playing its own unknown hand. Those hints directly cause the first lit cards: A03 plays Moss 1 (#93), A04 plays Moss 3 (#213), A03 runs Cobalt 1 (#144) and Amber 2 (#312). (#48, #64, #93, #144, #213, #312, #370)
- **A03 misfires on a blind play and the crew absorbs its first strike.** A03 plays slot 1 blind and it is Amber 4, scored a strike and losing the card (#241). Two minutes later A03 misfires again on Moss 7, strike 2 of 3 (#359), which freezes the table into cautious discards and signals for the rest of the run. (#241, #359)
- **The crew runs out of information and starts burning turns on discards that lose usable cards.** From about minute 4 onward, residents repeatedly toss a random slot to win a signal back because they cannot identify their own cards: A02 discards Moss 7 (#906), A04 dumps a Violet 6 that was playable (#1818), and A01 discards Cobalt 4 (#1592). These discards shrink the deck and feed the stall. (#906, #1592, #1818)
- **Draw pile empties and the crew switches to endgame hunting by signal.** By minute 6 the draw pile is empty (#417, #1082), so every hand is fixed. A01 and A04 then spend their last signals to pinpoint single playable cards for teammates, e.g. A04 marking A01's Rose 3 (#1681) and A01 marking A03's Moss 5 (#1842). (#417, #1082, #1681, #1842)
- **Checking the numbers becomes a recurring side plot; residents repeatedly dispute the reported score.** In minute 3 A03 and A01 argue the lit count does not match the score being announced (#613, #639), and again in minute 8 the four seats reconcile the 22-lit score from their own tallies (#1310, #1320, #1326). This consumes turns without advancing the game. (#613, #639, #1310, #1320, #1326)
- **A04's final Violet 7 lights and the run ends on the referee clock at minute 13.** A04 plays slot 1, Violet 7, which completes the Violet tower (#1955), but the referee ends the run at minute 13 (#1975) with no level solved and no submission ever made. (#1955, #1975)

## Problems

1. **No resident ever solved a level or submitted anything in 13 minutes.** The facts table shows 0 submissions (0 correct, 0 wrong) and all four residents stuck on level 1 from minute 0 to 13, with a longest quiet stretch of 14 minutes. The entire run is talk and card play with no attempt on the actual puzzle. (#15, #1975)
2. **Residents did not know their own hands and had no cheap way to find out, so they defaulted to blind discards.** Every resident repeats that they know nothing about their own four cards (#16, #60, #76, #665) and treats a play as a percentage gamble. The only learning channel is a teammate's hint, which costs a scarce signal, so the safe move becomes discarding random slots (#906, #1592, #1818), not playing. (#16, #60, #76, #665, #906, #1592, #1818)
3. **The turn order rejects actions and several residents keep issuing them anyway.** The city refuses four actions with NOT_YOUR_TURN: A03's play (#1156), A04's signal (#1290), A03's discard (#1775) and A01's play (#1937). Each refusal is a wasted turn for that resident, and they recur throughout the run rather than tapering off. (#1156, #1290, #1775, #1937)
4. **The announced score and the residents' own tally disagree repeatedly, and the game keeps going while they audit it.** A03 says the reported 24 lit does not match its count of 22 (#613), A01 says its tally is 23 (#639), and in minute 8 A02, A01, A03 and A04 all compare notes on the 22-lit score (#1310, #1320, #1326). That time is spent reconciling numbers, not playing cards. (#613, #639, #1310, #1320, #1326)
5. **Two strikes early make the rest of the run extremely conservative.** After A03's Amber 4 misfire (#241) and the Moss 7 misfire (#359), residents explicitly say one more misfire ends the game (#350, #403, #1215). From then on, known-playable hands are held and random slots are discarded instead, which slows the ascent and lets the clock run out. (#241, #350, #359, #403, #1215)

## Optimizations

- **Give residents a free, minimal view of their own hand at the start of each turn.** The run stalls because every resident starts blind and refuses to play (#16, #60, #76). A free rank-only or suit-only peek per turn would break the deadlock without removing the signalling game, and it would cut the long discard-for-signal cycles (#906, #1592). (#16, #60, #76, #906, #1592)
- **Make the turn clock and turn order explicit in the status.** Four actions are refused with NOT_YOUR_TURN (#1156, #1290, #1775, #1937), each costing a resident its turn. The status line should state whose turn it is and whether the current resident may act, so reasoning like #110 and #1869 does not plan an action it cannot take. (#110, #1156, #1290, #1775, #1869, #1937)
- **Reconcile the scoreboard with the visible towers after every play.** Residents spend minutes 3 and 8 disputing the announced lit count (#613, #639, #1310, #1320). The harness should compute the score from the same tower state the residents can inspect, or announce it only after the digest confirms it, so the audit turns disappear. (#613, #639, #1310, #1320)
- **Make blind discards less attractive than a reasoned play.** Discarding a random slot gives back a signal and costs nothing known, so it becomes the default (#768, #874, #906). Attaching a small cost or a forced-known-card rule to discards would push residents toward using hints and playing known cards (#312, #213) rather than churning the deck. (#213, #312, #768, #874, #906)
- **Define an end condition tied to solving a level, not only to the 13-minute clock.** The run ends at minute 13 with Violet 7 lit (#1955) and zero submissions (#1975). The next version should either give the crew enough time to turn card progress into a level attempt, or stop a no-submission run earlier so designers do not read a full-length report of a game that never started. (#1955, #1975)

## Loophole candidates

1. **Discarding an unknown slot is a free signal with no information cost.** (residents) Residents repeatedly discard a slot they know nothing about to recover a signal (#768, #874, #1644), and in at least one case the discarded card was the one playable card in hand (#1818). The discard mechanic is being used as a signal faucet rather than a tactical sacrifice. (#768, #874, #1644, #1818)
2. **Waiting for a teammate's hint is treated as strictly safer than playing.** (residents) A01 and A04 both explain that they hold known-playable cards because a teammate might signal the exact slot later (#417, #1681, #1907), so turns pass with no play. That converts the signal economy into a waiting game instead of a race, which is why the run never converts hand knowledge into a submission. (#417, #1681, #1907)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 19: event "signal_given" (seq 19) does not match its schema
- line 27: event "card_played" (seq 27) does not match its schema
- line 28: event "card_drawn" (seq 28) does not match its schema
- line 35: event "signal_given" (seq 35) does not match its schema
- line 42: event "card_played" (seq 42) does not match its schema
- line 43: event "card_drawn" (seq 43) does not match its schema
- line 51: event "signal_given" (seq 51) does not match its schema
- line 71: event "signal_given" (seq 71) does not match its schema
- line 85: event "card_played" (seq 85) does not match its schema
- line 86: event "card_drawn" (seq 86) does not match its schema
- line 100: event "signal_given" (seq 100) does not match its schema
- line 114: event "card_played" (seq 114) does not match its schema
- line 115: event "card_drawn" (seq 115) does not match its schema
- line 122: event "card_played" (seq 122) does not match its schema
- line 123: event "card_drawn" (seq 123) does not match its schema
- line 130: event "card_played" (seq 130) does not match its schema
- line 131: event "card_drawn" (seq 131) does not match its schema
- and 212 more
