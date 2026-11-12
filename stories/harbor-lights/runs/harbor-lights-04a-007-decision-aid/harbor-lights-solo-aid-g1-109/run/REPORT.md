# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-aid-g1` |
| Seed | 109 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #5 to #763 (671 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.053 USD for this run (competitors 0.053, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Residents coordinated to light 11 cards in the first three minutes despite no levels being solved.** A01, A02, A03 and A04 used signals and sequential plays to light Amber, Cobalt, Moss, Rose and Violet cards. By minute 3 the crew had lit 11 cards (#576) and had overcome three strikes (#396). (#183, #238, #297, #319, #491, #520, #576)
- **A02 and A01 misfired early, pushing the crew to three strikes by minute 2.** A02 played Cobalt 3 on a 50% guess (#387) and A01 played Violet 3 too early (#392), bringing the strike count to three and making future misfires cost 3 points each (#396). (#387, #392, #396)
- **Residents repeatedly discarded dead or unplayable cards to regain signals, keeping coordination alive.** A02 discarded Amber 6 (#548), A04 discarded Violet 5 (#516), and A01 discarded Moss 7 (#586) to get signals back. These discards enabled later helpful signals, such as A03's Cobalt signal to A04 (#614) and A01's Moss signal to A02 (#647). (#516, #548, #586, #614, #647)
- **Tool errors interrupted two intended signals.** A02 tried to signal A03 with 'Rose' but was refused with NOT_YOUR_TURN (#622), and A04 tried to signal A03 but was also refused (#726). These errors prevented the intended information from reaching A03. (#622, #726)
- **The crew ended at minute 5 with 21 lit cards and no levels solved.** A03 played Moss 6 to complete Moss (#743), and A01 was expected to play Violet 6 next, leading to a projected final score of 21 lit cards (#742). The run ended at minute 5 (#763) before any level was solved. (#742, #743, #763)

## Problems

1. **No resident made a submission, so the run produced zero level progress.** All four residents reached minute 5 without submitting any answer to the tower puzzle (#763). The run ended with no levels solved and zero submissions. (#763)
2. **Residents misunderstood the tool window for writeBrain and wasted early turns.** A04 (#13) and A02 (#19) reasoned about writing a brain before game 1, but the tool was not available (#80, #86). They then spent turns reading the brain and waiting for the game to start (#93, #102, #106). (#13, #19, #80, #86, #93, #102, #106)
3. **NOT_YOUR_TURN errors blocked signals and disrupted coordination.** A02 was refused when trying to signal A03 (#622), and A04 was refused when trying to signal A03 (#726). Both refusals meant A03 did not receive the intended information. (#622, #726)
4. **Residents took risky gambles that caused strikes and point penalties.** A02 played Cobalt 3 on a 50% chance, causing a misfire (#387), and A01 played Violet 3 before Violet 2 was lit, causing another (#392). These gambles increased the strike count and made later misfires cost 3 points (#396). (#387, #392, #396)
5. **The game lacked a clear objective or submission mechanism, leaving residents unsure how to proceed.** Residents repeatedly said there was 'nothing to play' before the game started (#93, #102, #106) and focused on tower play rather than solving a level. No resident attempted a submission, and the run ended without any. (#93, #102, #106, #763)

## Optimizations

- **Add a submission step to the game loop and make it obvious to residents.** Residents never submitted an answer because the game focused on lighting towers. Introduce a clear submission action after each tower play or at a set time, with instructions. Evidence: no submissions and game ended at minute 5 (#763). (#763)
- **Clarify writeBrain availability and timing in the instructions.** A04 (#13) and A02 (#19) wasted turns trying to use writeBrain when it was not available (#80, #86). State explicitly when writeBrain can be called and what it is for. (#13, #19, #80, #86)
- **Improve turn management to prevent NOT_YOUR_TURN refusals when signaling.** A02 (#622) and A04 (#726) were refused when trying to signal out of turn. The harness should queue or allow signals at the end of a turn, or warn residents before they call giveSignal. (#622, #726)
- **Provide residents with a visible game state summary including whose turn it is and available actions.** Residents frequently reasoned about whether it was their turn (#225, #622, #726) and sometimes ended turns without acting. A always-visible turn indicator and action list would reduce confusion. (#225, #622, #726)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 40: event "brain_written" (seq 40) does not match its schema
- line 41: event "retro_closed" (seq 41) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 55: event "brain_written" (seq 55) does not match its schema
- line 56: event "retro_closed" (seq 56) does not match its schema
- line 63: event "brain_written" (seq 63) does not match its schema
- line 64: event "retro_closed" (seq 64) does not match its schema
- line 128: event "cards_dealt" (seq 128) does not match its schema
- line 129: event "game_started" (seq 129) does not match its schema
- line 130: event "deal_revealed" (seq 130) does not match its schema
- line 141: event "signal_given" (seq 141) does not match its schema
- line 149: event "signal_given" (seq 149) does not match its schema
- line 161: event "card_played" (seq 161) does not match its schema
- line 162: event "card_drawn" (seq 162) does not match its schema
- line 170: event "card_discarded" (seq 170) does not match its schema
- and 72 more
