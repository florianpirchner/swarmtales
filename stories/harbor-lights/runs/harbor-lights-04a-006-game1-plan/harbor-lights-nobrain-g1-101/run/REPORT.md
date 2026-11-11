# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-g1` |
| Seed | 101 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 4 (referee) |
| Counted | events #4 to #660 (581 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.053 USD for this run (competitors 0.053, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0024 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 5 of 5 minutes without a submission; longest without one: minutes 0-4 (5) |
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

- **A01 converts an early signal into the run's first lit card** A02 signalled rank 1 to A01 (#30), and A01 played slot 2 as Rose 1 and lit it (#95) after an earlier misfire on Amber 5 (#34). This was the first productive chain in the run. (#30, #34, #95)
- **Signals drive most early progress while residents avoid blind plays** A02 flagged A01's Rose 2 and Amber 1 (#147, #199), A01 lit Rose 2 (#270) and Amber 1 (#223), and later A04 played a signalled Amber 2 (#357, #382). Residents repeatedly chose signals or discards over low-odds plays (#71, #91, #119). (#223, #270, #357, #382)
- **A03 discards Cobalt 1, permanently killing the Cobalt tower** A03 discarded its unknown slot 4 and lost Cobalt 1 (#303), then noted the tower was stuck at 0 and every Cobalt card unplayable. The Cobalt chain still later recovered through Cobalt 2-4 (#540, #584, #590), contradicting A03's reading. (#303, #540, #584, #590)
- **A misfire at minute 2 pushes the run to strike 3 and 6 points of penalty** A03 gambled slot 2 as Violet 1 or 3 and hit Violet 3, a misfire (#335, #345). After this, residents repeatedly cited the 3-point misfire cost as a reason not to play (#322, #353, #396). (#335, #345, #353, #396)
- **Hands empty near the end as four towers light in quick succession** A01 lit Violet 2 (#440), Violet 5 (#479), Cobalt 2 (#540), Cobalt 3 (#584) and Violet 6 (#615); A03 lit Amber 3 (#514) and Cobalt 4 (#590); A04 lit Rose 6 (#570) and Violet 7 (#636). By minute 4 the run ends with residents holding few or no cards. (#440, #479, #514, #540, #570, #590, #615, #636)
- **Repeated misreadings of status and hand order cost cards** A01 twice admitted misreading the status message (#151, #176), and A03 discarded a playable Moss 2 (#160). A04 discarded Roze 4 while naming it playable (#497). (#151, #160, #176, #497)

## Problems

1. **No levels were solved and no submissions were made** The computed facts show 0 correct and 0 wrong submissions across 5 minutes, and the run ended at minute 4 with all residents still level 1 (#660). The story produced activity but no scored outcome. (#660)
2. **Residents spend turns discarding for signals rather than playing** Dozens of turns are discards explicitly to refill the signal pool (#132, #177, #228, #287, #353, #533). The signal economy, not card play, dominated the run. (#132, #177, #228, #287, #353, #533)
3. **Residents repeatedly misinterpret whose turn it is or provoke errors** A04 attempted a discard on A01's turn and got NOT_YOUR_TURN (#500). A01 and A04 both reasoned about turn order while uncertain (#123, #192), and A01 admitted status misreads (#151, #176). (#123, #151, #176, #192, #500)
4. **Residents keep private knowledge that would help teammates but only signal rarely** A02 knew Rose 2 was in A01's slot 4 (#123) and later spotted Cobalt 3 and Cobalt 4 positioning (#525) without direct play coordination. The signals are sparse and several residents end turns passing rather than sharing (#417). (#123, #417, #525)
5. **Early misfires and lost 1s strand whole suits** Amber 5 was lost on A01's first play (#34), Cobalt 1 was discarded (#303), and Moss stalled because Moss 2 was discarded (#160). Residents note Amber 7 and Moss 7 become unplayable after lost cards (#322, #533). (#34, #160, #303, #322, #533)

## Optimizations

- **Make at least one lit card mandatory per round or penalize idling** The run had 5 quiet minutes and dozens of passes and discards (#132, #228, #396, #533). A per-round play pressure would force engagement instead of signal-hording. (#132, #228, #396, #533)
- **Clarify turn order in the status message** A04's illegal discard returned NOT_YOUR_TURN (#500), and A01 and A04 both misread the status text (#151, #176, #192). A clear 'current player / next player' line in each status would help. (#151, #176, #192, #500)
- **Rebalance the signal economy** Residents burned turns discarding only to refill signals (#228, #287, #533) and sometimes complained signals were at zero (#349, #400). Granting signals on play or raising the cap would reduce discard churn. (#228, #287, #349, #400, #533)
- **Give residents a way to flag a specific playable card to a teammate** A02 had correct knowledge of Cobalt 3/4 positions (#525) but could not direct the sequence in time. A stronger targeted signal (card, not just rank/suit) would turn private knowledge into plays. (#525, #584, #590)
- **Warn before discarding a card that is currently playable** A03 discarded Moss 2 while naming it helpful if lit (#160), and A04 discarded Rose 4 while calling it playable (#497). A confirmation prompt naming the card's playability would prevent self-inflicted dead suits. (#160, #497)
- **Have the gamemaker or referee prompt stalled residents** The gamemaker took no actions per facts and the run ended at minute 4 with residents still holding cards (#660). A nudge to the current player when the clock is short would keep the pace up. (#660)

## Loophole candidates

1. **Residents use discard-for-signal as a safe stall** (residents) A03 and A02 repeatedly discard unknown cards solely to refill signals instead of risking a play (#132, #228, #353). This converts a limited resource into a cheap stalling move that avoids misfires. (#132, #228, #353)
2. **Private thoughts reveal knowledge teammates never get** (residents) A02 works out that Rose 2 is in A01's slot 4 (#123), and A03 deduces A04's Amber 2 (#227, #334), but this info stays private while the public signals are thin. Reasoning becomes an information advantage not surfaced to the table. (#123, #227, #334)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 15: event "card_played" (seq 15) does not match its schema
- line 16: event "card_drawn" (seq 16) does not match its schema
- line 25: event "signal_given" (seq 25) does not match its schema
- line 43: event "signal_given" (seq 43) does not match its schema
- line 57: event "signal_given" (seq 57) does not match its schema
- line 66: event "card_played" (seq 66) does not match its schema
- line 67: event "card_drawn" (seq 67) does not match its schema
- line 78: event "card_discarded" (seq 78) does not match its schema
- line 79: event "card_drawn" (seq 79) does not match its schema
- line 87: event "signal_given" (seq 87) does not match its schema
- line 102: event "signal_given" (seq 102) does not match its schema
- line 114: event "card_played" (seq 114) does not match its schema
- line 115: event "card_drawn" (seq 115) does not match its schema
- line 126: event "signal_given" (seq 126) does not match its schema
- line 135: event "card_discarded" (seq 135) does not match its schema
- line 136: event "card_drawn" (seq 136) does not match its schema
- line 143: event "signal_given" (seq 143) does not match its schema
- and 59 more
