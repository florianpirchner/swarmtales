# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-aid-g1` |
| Seed | 103 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #5 to #775 (682 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.047 USD for this run (competitors 0.047, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0047 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 2, BRAIN_TOO_LONG 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Four residents coordinated signals and lit many towers by hand.** A01 signalled A04 that slots 2 and 4 were rank 1 (#159), and A04 lit Violet 1 and Moss 1 (#196, #257). Over minutes 1-4 the crew lit Amber 1, Rose 2, Amber 2, Cobalt 2, Violet 2, Cobalt 3, Amber 3, Violet 3, Moss 2, Amber 4, Moss 4, Amber 5, Violet 4, Cobalt 5, Cobalt 6, and Rose 4 (#223, #270, #312, #349, #383, #440, #547, #592, #680, #692, #716, #736). (#159, #196, #257, #440, #716)
- **A04's first brain write was refused for being too long.** A04 attempted to save a strategy brain at minute 0 and the city refused it with BRAIN_TOO_LONG at 154 words against a 150-word limit (#63). A01 saved version 1 at 128 words and A04 later reported 143 words (#104, #114). (#63, #104, #114)
- **A01 discarded Moss 3 and Cobalt 4, then Moss 7, losing playable-later cards to buy signals.** A01 discarded slot 1 for Moss 3 (#355), then Cobalt 4 (#435), then Moss 7 (#572), each time citing a misfire risk or a need for signals. This left Cobalt stuck at 3 until A01's Cobalt 5 was later signalled and lit (#692). (#355, #435, #572, #692)
- **A03's blind play was a misfire that put the crew on strike one.** A03 played slot 1 blind and it was Rose 5, a misfire (#389). A03 then avoided blind plays, discarding or signalling instead (#585, #623), and later had its signalled Cobalt 3 (#440) and Violet 4 (#680) and Cobalt 6 (#716) lit successfully. (#389, #440, #585, #680, #716)
- **The pile ran empty by minute 3, forcing endgame discipline.** A04 noted the draw pile was empty at minute 3 (#528), and A01 noted the same at minute 3 (#540). After that, any turn without a light or signal ends the game, and residents stopped risking blind plays. (#528, #540)
- **Two NOT_YOUR_TURN refusals from residents acting out of order.** A04's discard was refused with NOT_YOUR_TURN because it was A02's turn (#646), and A01's play was refused because it was A03's turn (#658). Both residents appeared to be reasoning about the wrong resident's turn. (#646, #658)

## Problems

1. **The run ended at minute 5 with no levels solved and no standings.** The facts show zero levels solved, nobody stuck, and final standings unknown, with the referee ending at minute 5 (#775). The 682 events produced coordinated play but no scoring outcome, so the story design cannot calibrate difficulty. (#775)
2. **Residents spent early turns reasoning about a game that had not started.** A01, A02, A03 and A04 all reasoned at minute 0 that the game had not started and ended turns (#99, #103, #108, #113). This burned turns while tools were opening and before any tower action. (#99, #103, #108, #113)
3. **A04 lost a full turn to a brain-too-long refusal before play began.** A04's writeBrain was refused for 154 words against 150 (#63), and A04 then had to note that writeBrain was closed (#93). The word limit is tight enough that a resident exceeded it on the first attempt. (#63, #93)
4. **Several blind plays and misfires risked strikes instead of following signals.** A03 played blind and misfired Rose 5 (#389). A03 repeatedly judged blind plays as 2-in-3 misfires and discarded instead (#585, #623), which suggests the risk model pushed toward passivity rather than coordinated play. (#389, #585, #623)
5. **Residents repeatedly misjudged whose turn it was.** A04 tried to discard on A02's turn (#646) and A01 tried to play on A03's turn (#658). A02 also reasoned about turn order mid-game (#720), showing turn tracking was not reliably available. (#646, #658, #720)

## Optimizations

- **Give residents an explicit turn-status tool before they act.** The NOT_YOUR_TURN refusals (#646, #658) show residents acting without knowing whose turn it is. A status call that always returns the active resident would prevent these wasted calls. (#646, #658)
- **Raise or clarify the brain word limit before minute 0.** A04 was refused at 154 words against 150 (#63) and then found writeBrain closed (#93). Either raise the limit or show the exact count and limit in the tool response so a first attempt can be corrected in time. (#63, #93)
- **Shorten or remove the pre-game dead turns.** All four residents spent minute 0 concluding the game had not started (#99, #103, #108, #113). Open viewTowers and playSlot from the start, or start the clock only when the board is live. (#99, #103, #108, #113)
- **Have the referee record a final score and standings when the game ends.** The run ends with no levels solved and final standings unknown (#775). A recorded outcome per resident would let designers compare runs and tune the story. (#775)
- **Encourage playing signalled cards over cautious discards once the pile is empty.** Residents judged blind plays too risky and discarded instead, losing cards such as Moss 3 and Cobalt 4 (#355, #435). A rule or hint that signals which cards are safe to play would reduce card loss and speed up lighting. (#355, #435)

## Loophole candidates

1. **Residents could discard repeatedly to regain signals instead of playing.** (residents) A01 discarded Moss 3, Cobalt 4 and Moss 7 to buy signals (#355, #435, #572), and A02 discarded Amber 7 rather than risk a 0% play (#619). Discarding for signals is legal but lets residents avoid the risk-taking the story likely intends. (#355, #435, #572, #619)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 42: event "brain_written" (seq 42) does not match its schema
- line 43: event "retro_closed" (seq 43) does not match its schema
- line 49: event "brain_written" (seq 49) does not match its schema
- line 50: event "retro_closed" (seq 50) does not match its schema
- line 56: event "brain_written" (seq 56) does not match its schema
- line 57: event "retro_closed" (seq 57) does not match its schema
- line 87: event "brain_written" (seq 87) does not match its schema
- line 88: event "retro_closed" (seq 88) does not match its schema
- line 134: event "cards_dealt" (seq 134) does not match its schema
- line 135: event "game_started" (seq 135) does not match its schema
- line 136: event "deal_revealed" (seq 136) does not match its schema
- line 147: event "signal_given" (seq 147) does not match its schema
- line 155: event "signal_given" (seq 155) does not match its schema
- line 166: event "signal_given" (seq 166) does not match its schema
- line 173: event "card_played" (seq 173) does not match its schema
- line 174: event "card_drawn" (seq 174) does not match its schema
- and 73 more
