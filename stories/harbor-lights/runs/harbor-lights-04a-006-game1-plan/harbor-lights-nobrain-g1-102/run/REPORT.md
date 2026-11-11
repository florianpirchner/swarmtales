# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-g1` |
| Seed | 102 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 3 (referee) |
| Counted | events #4 to #537 (461 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.050 USD for this run (competitors 0.050, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0020 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 4 of 4 minutes without a submission |
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

- **A01 opens with a rank-1 signal that sets the crew's first plays.** A01 signals rank 1, which A03 reads as marking its slots 3 and 4 as the two 1s and plays Cobalt 1 at #27 and #52, while A02 separately signals A01 about rank 1 at #48. The whole early game runs off these two signals. (#27, #36, #48, #52)
- **A03's Violet 1 and A02's Rose 1 and Amber 3 light in sequence.** A03 plays Violet 1 at slot 4 (#182, #191) and A02 follows with Amber 3 (#301, #325) and Rose 1 (#352, #374), building the tower chain through other hands rather than its own. (#182, #191, #325, #374)
- **A04 takes the run's only misfire on Rose 6.** A04 plays slot 1 at #473 and it is Rose 6, a misfire, bringing strikes to 9 points; A04 then reasons its remaining slot 2 must be Rose 2 and plays it at #515. (#473, #474, #515)
- **Cobalt tower completes at minute 2.** A03 plays Cobalt 3 at slot 1 (#433, #509), completing the Cobalt tower and returning a signal. (#433, #509)
- **Signals run dry and residents fall back on blind coin-flip reasoning.** A02 notes at #240 that its last signal is spent, and A04 repeatedly frames its slot as a 50/50 (#400, #427) before the misfire at #473. (#240, #400, #427, #473)
- **A02 discards Amber 5, stranding Amber 6 in A01's hand.** A02 discards slot 2 (Amber 5) at #453/#454, and it says itself that this strands Amber 6 in A01's hand; A01 later reasons Amber 6 is playable only because Amber 5 was lost (#460). (#453, #454, #460)

## Problems

1. **No level was solved and no submissions were recorded in four minutes.** The computed facts show 0 submissions, 0 correct and no level-ups, with 4 of 4 minutes quiet; the crew spent the whole run on a single level-1 board. (#473, #515, #537)
2. **Every turn was consumed by reasoning and signaling rather than play.** Many turns end in SAYS TO ITSELF passes with no play or discard, e.g. #36, #155, #227, #316, #423, leaving most residents idle each turn. (#36, #155, #227, #316, #423)
3. **The signal economy collapsed to zero, forcing risky blind plays.** After the last signals were spent (#240, #423, #490) residents could no longer mark cards and reverted to 50/50 guesses, which produced the misfire at #473. (#240, #423, #473, #490)
4. **A04's action was rejected out of turn, wasting its reasoning.** A04 attempted a discard while it believed it was its turn and got NOT_YOUR_TURN at #430, then had to re-plan at #446; the resident's turn model diverged from the referee's. (#430, #446)
5. **Residents discarded cards they had already deduced, losing known playables.** A03 discards Rose 5 (#123) and A02 discards Amber 5 (#453) purely to regain signals, and A04 loses Rose 3 to a discard (#296, #297), shrinking the deck while towers still needed those ranks. (#123, #296, #297, #453)
6. **The run ended mid-turn with playable cards still in hand.** At minute 3 the referee ended the run (#537) while A01 still held Amber 6, Moss 6 and Rose 4 and was reasoning about which to play (#502, #520). (#502, #520, #537)

## Optimizations

- **Add more signals or a signal refund per lit card.** Signals hit zero by minute 1 (#240) and never recovered reliably, forcing blind guesses (#473). Granting a signal for each card lit or raising the cap would keep information flowing. (#240, #423, #473)
- **Shorten or cap reasoning turns to speed up the board.** Turns like #316 and #423 end with a signal and no play, and the run only reached 19 lit cards by minute 2 (#515). A per-turn action budget or forced play after N passes would push more cards down. (#316, #423, #515)
- **Make the referee's turn state visible to residents.** A04 believed it was its turn and was refused at #430. Exposing the current turn owner in the tool response would prevent wasted reasoning and the re-plan at #446. (#430, #446)
- **Warn residents before discarding a card another resident is waiting on.** A02 discarded Amber 5 (#453) knowing it stranded Amber 6 in A01's hand (#454), and A03 discarded Rose 5 (#123). A pre-discard check listing dependent cards would avoid destroying playables. (#123, #453, #454)
- **Lengthen the run or end it when no card can be played.** The run cut off at #537 with A01 holding three playable cards (#502, #520). Ending on a clean board or a longer clock would let the level close out. (#502, #520, #537)

## Loophole candidates

1. **Residents discard low-value cards to farm signals instead of playing.** (residents) A03 discards Rose 5 at #123 and A02 discards Amber 5 at #453 explicitly to regain signals, using discard as a signal-recharge rather than a last resort, which the story likely did not intend. (#123, #453)
2. **Residents repeatedly pass as a safe default when unsure.** (residents) A01 and A02 end multiple turns without playing or discarding (#36, #155, #227, #423), treating a pass as free despite the clock at minute 3. (#36, #155, #227, #423)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 15: event "signal_given" (seq 15) does not match its schema
- line 23: event "signal_given" (seq 23) does not match its schema
- line 30: event "card_played" (seq 30) does not match its schema
- line 31: event "card_drawn" (seq 31) does not match its schema
- line 43: event "card_discarded" (seq 43) does not match its schema
- line 44: event "card_drawn" (seq 44) does not match its schema
- line 60: event "card_played" (seq 60) does not match its schema
- line 61: event "card_drawn" (seq 61) does not match its schema
- line 68: event "signal_given" (seq 68) does not match its schema
- line 75: event "card_played" (seq 75) does not match its schema
- line 76: event "card_drawn" (seq 76) does not match its schema
- line 83: event "card_played" (seq 83) does not match its schema
- line 84: event "card_drawn" (seq 84) does not match its schema
- line 92: event "signal_given" (seq 92) does not match its schema
- line 99: event "signal_given" (seq 99) does not match its schema
- line 106: event "card_discarded" (seq 106) does not match its schema
- line 107: event "card_drawn" (seq 107) does not match its schema
- and 56 more
