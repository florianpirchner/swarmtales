# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-g1` |
| Seed | 112 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 6 (referee) |
| Counted | events #5 to #863 (768 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.058 USD for this run (competitors 0.058, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0025 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 7 of 7 minutes without a submission; longest without one: minutes 0-6 (7) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 3, BRAIN_TOO_LONG 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 is the only resident whose brain write was rejected for length** A01 tried to save the opening strategy brain but the city refused it at 163 words against a 150-word limit (#54). The other three residents report brains saved at 113-143 words (#118, #91, #108), so A01 played the whole run without the shared strategy note it intended to write. (#54, #91, #108, #118)
- **The crew cleared several towers but never solved a level** Residents lit cards steadily: A04 lit Amber 1 (#201), Cobalt 1 (#260), Cobalt 3 (#364) and Cobalt 5 (#534); A01 lit Cobalt 2 (#274) and Amber 3 (#487); A03 lit Amber 2 (#457) and Moss 3 (#509). Rose was completed by A04's Rose 4 (#821). Despite this progress no level was solved and no points were scored, because progress inside minute 6 did not convert into a finished level. (#201, #260, #274, #364, #457, #487, #509, #534, #821)
- **Residents spent most of the game guessing because they could not see their own hands** A01 repeatedly refused to play slot 3 because it could be Amber 3, Rose 3 or Violet 3 (#326, #377, #422). A02 held a Rose card at roughly a one-in-five chance of being playable (#236). A04 called a blind play of slot 1 a 50% bet and gave a signal instead (#683). (#236, #326, #377, #422, #683)
- **Discards burned high cards and dead cards to buy signals** A03 discarded Cobalt 4 (#356), Violet 5 (#427) and Violet 4 (#798), each time to regain a signal. A04 discarded Moss 7 (#473) and Amber 7 (#589). A02 discarded Rose 1 by mistake early (#172) and later Violet 2 (#672). (#172, #356, #427, #473, #589, #672, #798)
- **The run ended with only one resident holding cards and nobody able to force a play** By minute 5 A01, A03 and A04 were out of cards (#781, #798); only A02 held two cards, either Violet 1 or Violet 3 (#804). A04 noted A02 should simply play Violet 1 rather than rely on signals (#836), and the run ended at minute 6 with no submission (#863). (#781, #798, #804, #836, #863)

## Problems

1. **No level was solved and no submission was made in seven minutes** The facts record zero submissions, zero levels and seven quiet minutes. Residents lit cards throughout (#274, #457, #534) but never reached the level's target, so the story produced no result to report on. (#274, #457, #534, #863)
2. **Three NOT_YOUR_TURN errors came from residents acting out of order** A03 tried playSlot at minute 4 (#629), giveSignal at minute 4 (#679) and discardSlot at minute 5 (#755), each refused because it was not A03's turn. This cost turns and shows residents misread turn ownership. (#629, #679, #755)
3. **The brain-write window closed before A01 could save its brain** A01's only write attempt was rejected for length (#54), and by #83 and #102 residents report writeBrain is locked. A01 played the run without the strategy note the design expected it to write. (#54, #83, #102)
4. **Residents with no information wasted turns on pass-like signals** A02 reasoned that a signal to a resident with no cards would just pass the turn (#843), and A04 noted A02's Violet signal was effectively a pass (#836). Signals were spent on residents who had nothing to act on, slowing the game rather than advancing it. (#836, #843)
5. **A02 discarded a playable Rose 1 early** A02 discarded slot 1 with no hand information and lost Rose 1, a card playable immediately (#172). This was the earliest permanent loss and set the tone of cautious discarding. (#172)

## Optimizations

- **Give residents a reliable way to see their own hand or narrow it** Many turns ended in refusal to play because a slot had three or more candidates (#326, #377, #422). Letting a resident buy a narrow, single-slot peek, or reducing hand size, would convert the tower progress already seen (#274, #487, #534) into plays. (#274, #326, #377, #422, #487, #534)
- **Fix the brain write window so every resident can save a brain** A01 lost its brain to a length limit (#54) and then found writeBrain locked (#83). Either raise the word limit or reopen the window briefly at the start so all four residents have a saved brain. (#54, #83, #102)
- **Make turn ownership visible before any action is taken** Three NOT_YOUR_TURN refusals came from A03 acting between turns (#629, #679, #755). The harness should block the call client-side with the current turn named, so the resident can choose another action instead of losing the turn. (#629, #679, #755)
- **Extend the referee horizon or shorten the level** The referee ended at minute 6 with towers partly built and one resident still holding cards (#863), and no level was solved. A longer run, or a level target that matches what the crew reached, would let the story produce a result. (#804, #821, #863)
- **Stop signals to residents who have no cards** A02 and A04 both used signals that only passed the turn because the target had no cards (#843, #836). Forbidding or warning about signals to empty-handed residents would save turns for plays. (#836, #843)

## Loophole candidates

1. **Residents used discards of dead cards as free signal refills** (residents) A03 discarded Cobalt 4 (#356) and Violet 4 (#798) on the reasoning that discarding a dead card costs nothing and refunds a signal. This turns the discard mechanic into a safe, repeatable way to buy signals without risk, against the design intent of discarding as a cost. (#356, #781, #798)
2. **A04 signalled instead of playing to keep the turn count moving** (residents) A04 chose giveSignal over a blind play explicitly to "keep the turn count moving without spending a card" (#748), and A02 considered signal-passing to force others into misfires (#826). Signals were used as a cheap stall or a trap rather than as information about playable cards. (#748, #826)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 40: event "brain_written" (seq 40) does not match its schema
- line 41: event "retro_closed" (seq 41) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 59: event "brain_written" (seq 59) does not match its schema
- line 60: event "retro_closed" (seq 60) does not match its schema
- line 73: event "brain_written" (seq 73) does not match its schema
- line 74: event "retro_closed" (seq 74) does not match its schema
- line 137: event "cards_dealt" (seq 137) does not match its schema
- line 138: event "game_started" (seq 138) does not match its schema
- line 139: event "deal_revealed" (seq 139) does not match its schema
- line 149: event "signal_given" (seq 149) does not match its schema
- line 164: event "card_discarded" (seq 164) does not match its schema
- line 165: event "card_drawn" (seq 165) does not match its schema
- line 179: event "signal_given" (seq 179) does not match its schema
- line 190: event "card_played" (seq 190) does not match its schema
- and 75 more
