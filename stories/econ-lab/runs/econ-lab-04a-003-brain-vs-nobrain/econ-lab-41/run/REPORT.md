# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 10 (referee) |
| Counted | events #5 to #940 (786 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 10 minutes (to the end); A02 on level 1 from minute 0 for 10 minutes (to the end); A03 on level 1 from minute 0 for 10 minutes (to the end); A04 on level 1 from minute 0 for 10 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.022 USD for this run (competitors 0.022, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0038 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 11 of 11 minutes without a submission; longest without one: minutes 0-10 (11) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 5 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents sat out the entire run without a single submission.** The facts record no submissions, no transfers and no board posts, and every resident stayed on level 1 from minute 0 to 10. The only resident output was reasoning and self-talk about games that were already sealed, e.g. #235 waiting for an offer that never arrives. (#235, #283, #940)
- **A02 won the first split-offer game by taking free money.** A02 accepted A04's 5-point offer (#217) and later reasoned it had finished top with 33 points by offering a low 3 that A04 still accepted (#369, #386). (#217, #369, #386)
- **A03 briefly considered cutting its offers but kept the fair 5.** A03 deliberated offering 4 instead of 5 but chose 5 to protect its cooperative reputation (#325), and reported offering 5-5 splits in rounds 4-6 (#266, #312). (#266, #312, #325)
- **A02 free-rode the public-goods game to 112 points while the others scored 77.** A02 kept contributing 0 while the others gave 5 each (#556), then confirmed it scored 112 and topped game 2 (#703). A04 noted it scored 77 while A02 got 112 (#695). (#556, #695, #703)
- **Public-goods cooperation eroded toward defection after the free-rider result.** A01 noticed A02 free-riding again and considered dropping to 0 to punish it but stayed at 5 (#549); after the game A03's saved brain defaulted to contributing 0 (#750). (#549, #750)
- **In the coordination game A01 chose A, got 0 against A04's B, and switched to B.** A01 picked A to coordinate (#805) but scored 0 when A04 picked B, then switched to B and kept choosing it (#835, #870). (#805, #835, #870)

## Problems

1. **The run produced no gameplay actions at all; residents never submitted.** Over 786 logged events there were 0 submissions, 0 transfers and 0 posts, and every resident stalled on level 1 from minute 0 to the end. This means the story's core loop (solve a level, compete for seats) never happened. (#96, #100, #940)
2. **Residents repeatedly burned turns waiting for offers that never came.** A01, A03 and A04 all ended turns saying the offer had not arrived yet (#235, #266, #279), and A03's #192 shows the same pattern. The phases seemed to move without the pending decision ever reaching the resident with the turn. (#192, #235, #266, #279)
3. **BRAIN_TOO_LONG refusals wasted the retro window for three residents.** A02, A03 and A04 each had a brain refused for exceeding 150 words (#372, #378, #389), and A03 was refused again later at 160 words (#722). Residents were drafting to a word budget they could not reliably hit. (#372, #378, #389, #722)
4. **Residents could not verify game progress, guessing at round counts and results.** A03 said the game 'seems to have ended around round 7, though I'm not sure of the exact count' (#703 is A02's; A03's #719 says the game ended but the count is unknown). Uncertainty about the stopping rule left residents unable to plan endgame moves. (#695, #719, #750)
5. **The gamemaker took no actions during the run.** The computed facts record 'Gamemaker: no actions', so no events were injected to break the stall or steer the story. The residents were left alone in a loop of sealed phases. (#754, #940)

## Optimizations

- **Give a timeout or nudge when no resident has submitted for the whole run.** The run ended with 0 submissions and everyone stalled 10 minutes. A harness check that ends or restarts a run after N quiet minutes (quiet minutes show 11 of 11) would avoid wasted runs. (#96, #100, #940)
- **Make the pending decision reach the correct resident before the phase seals.** Residents kept ending turns waiting for offers that never came (#235, #266, #279). Deliver offers in the same turn they are made, or show the pending state in viewTable. (#192, #235, #266, #279)
- **Enforce or pre-check the brain word limit before submission.** Four writeBrain calls were refused for exceeding 150 words (#372, #378, #389, #722). Validate the draft or show the word count in the tool output so residents do not lose their retro window. (#372, #378, #389, #722)
- **Publish the number of rounds up front or make the stop rule visible.** Residents repeatedly guessed whether the game had ended (#695, #719). Showing total rounds in the rules would let them reason about endgame moves instead of hedging. (#695, #719)
- **Have the gamemaker intervene when a free-rider dominates to keep the story interesting.** A02 scored 112 in game 2 by contributing 0 every round (#703, #556), and the others degraded to defaulting to 0 (#750). A gamemaker script could add a punishment phase so the public-goods game does not collapse to everyone defecting. (#556, #703, #750)

## Loophole candidates

1. **A02 free-rode the public-goods game to the top without contributing.** (residents) A02 kept its contribution at 0 while the others gave 5 each (#556) and finished on 112 against 77 for everyone else (#703, #695). The 1.6 multiplier paid defection through the other players' contributions. (#556, #695, #703)
2. **A02 offered a low 3 and still won the split-offer game.** (residents) A04 accepted A02's 3-out-of-7 offer (#345), and A02 finished top with 33 points (#369, #386). Lowball offers that get accepted beat fair 5-5 splits. (#345, #369, #386)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 45: event "brain_written" (seq 45) does not match its schema
- line 46: event "retro_closed" (seq 46) does not match its schema
- line 52: event "brain_written" (seq 52) does not match its schema
- line 53: event "retro_closed" (seq 53) does not match its schema
- line 60: event "brain_written" (seq 60) does not match its schema
- line 61: event "retro_closed" (seq 61) does not match its schema
- line 67: event "brain_written" (seq 67) does not match its schema
- line 68: event "retro_closed" (seq 68) does not match its schema
- line 110: event "block_started" (seq 110) does not match its schema
- line 111: event "round_opened" (seq 111) does not match its schema
- line 136: event "decision_made" (seq 136) does not match its schema
- line 143: event "decision_made" (seq 143) does not match its schema
- line 149: event "decision_made" (seq 149) does not match its schema
- line 155: event "decision_made" (seq 155) does not match its schema
- line 156: event "round_resolved" (seq 156) does not match its schema
- line 157: event "round_opened" (seq 157) does not match its schema
- and 134 more
