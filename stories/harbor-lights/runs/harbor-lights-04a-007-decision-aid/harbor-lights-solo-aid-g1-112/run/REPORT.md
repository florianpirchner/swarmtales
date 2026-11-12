# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-aid-g1` |
| Seed | 112 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 7 (referee) |
| Counted | events #5 to #902 (806 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.067 USD for this run (competitors 0.067, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0025 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 8 of 8 minutes without a submission; longest without one: minutes 0-7 (8) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 3, NO_SIGNALS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Pre-game brain writing consumed the opening and was then locked out.** All four residents spent minute 0 reading and writing a strategy brain before game 1; A01 saved 135 words, A03 132, A02 122, and A04 saved notes as version 1 (#102, #98, #94, #106). The tool was then closed and the residents could not update the brain again until a retro window (#75, #87, #94). (#75, #94, #98, #102, #106)
- **Zero submissions and a full-run stall despite correct plays by everyone.** The game recorded 0 correct and 0 wrong submissions, and 8 of 8 minutes passed with no submission (#164, #229, #249, #292). Yet residents lit cards steadily through plays like Rose 1 (#164), Amber 1 (#193), Cobalt 1 (#249), Moss 1 (#345) and Cobalt 3 (#440), so the city simply never credited a submission path. (#164, #193, #249, #345)
- **A signal economy was spent heavily on rank hints and then ran dry.** Signals moved from 6 down to 0 by minute 2 when A01 spent the last one on A04's Cobalt 3 (#367); later A04 was refused with NO_SIGNALS (#633) and the board showed 0 of 6 while the error still fired (#646). Residents then burned discards purely to refund signals, e.g. A04 discarding Violet 4 (#655). (#367, #633, #646, #655)
- **A02 pushed a Violet 5 play blind and took a soft strike.** A02 played slot 1 believing the hand was Violet 1 or Violet 5, and it misfired as Violet 5 (#606, #616), costing 3 points on the third strike. A02's own reasoning had already narrowed the card to two options before gambling (#606). (#606, #616)
- **A01 discarded Cobalt 6 in a self-described misjudgment.** A01 discarded slot 1 believing it held one of three unknowns and lost Cobalt 6, which it admitted it had failed to identify (#599, #600). This left the Cobalt tower needing to skip to 7 (#600). (#599, #600)
- **Turn-order confusion caused repeated rejected actions.** Three NOT_YOUR_TURN refusals hit A01 (#143), A04 (#708) and A01 again (#783), all because residents tried to act after the turn had passed. A04 explicitly reasoned it could not act because it was A01's turn (#723). (#143, #708, #723, #783)

## Problems

1. **The submission mechanic appears unreachable or unused by design.** Across 806 events there were 0 submissions, 0 points and 0 level-ups, even though residents lit at least 19 of 35 cards (#874). The run produced plays but no scoring path, so the story's core competition never started. (#164, #229, #874)
2. **Residents spent the first minute on a brain tool that was then withdrawn.** A01, A02, A03 and A04 all wrote or saved a brain before game 1 (#102, #94, #98, #106), then writeBrain was locked out (#75, #87). The effort had no downstream use in this short run. (#75, #87, #94, #98, #102, #106)
3. **Signal tokens ran out early and forced low-value discards.** By minute 4 the crew had 0 of 6 signals and A04 was refused (#633, #646); A04 then discarded a known card just to regain one (#655). The signal economy starved mid-game, pushing residents into discard-for-signal loops. (#633, #646, #655)
4. **NO_SIGNALS error contradicted the displayed 0 of 6 count.** A04's reasoning noted the display said 0 of 6 signals while the error claimed none were left (#646), indicating a confusing or inconsistent state message. This wasted a turn and muddied the rules for the resident. (#633, #646)
5. **Turn-order errors repeatedly wasted actions.** Three NOT_YOUR_TURN refusals (#143, #708, #783) show residents could not reliably tell when their turn was live. Each refusal cost an attempted signal or discard. (#143, #708, #783)

## Optimizations

- **Make the submission path explicit and testable.** Since the run ended with 0 submissions despite many successful plays (#874), the harness should verify that plays register as submissions or surface a clear submit action. A dry run should confirm at least one submission is possible before the game starts. (#164, #874)
- **Keep the brain tool open or drop it from minute 0.** Residents spent minute 0 on brain writing that was then locked out (#102, #75). Either leave writeBrain available during play or start the game without it so residents focus on towers. (#75, #102, #106)
- **Rebalance signal tokens or make discards more attractive.** The crew hit 0 of 6 signals by minute 4 and resorted to discard-for-signal loops (#633, #655). Increase starting signals or reduce signal cost so hints are not exhausted so early. (#367, #633, #655)
- **Fix conflicting signal-state messages.** A04 saw 0 of 6 signals displayed while being told none were left (#646). The tool should report a single consistent count to avoid wasted turns. (#633, #646)
- **Expose whose turn it is clearly to residents.** Three NOT_YOUR_TURN refusals (#143, #708, #783) show the turn state was unclear. The harness should include the current turn holder in every tool response. (#143, #708, #783)

## Loophole candidates

None found.

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
- line 63: event "brain_written" (seq 63) does not match its schema
- line 64: event "retro_closed" (seq 64) does not match its schema
- line 128: event "cards_dealt" (seq 128) does not match its schema
- line 129: event "game_started" (seq 129) does not match its schema
- line 130: event "deal_revealed" (seq 130) does not match its schema
- line 141: event "signal_given" (seq 141) does not match its schema
- line 157: event "card_played" (seq 157) does not match its schema
- line 158: event "card_drawn" (seq 158) does not match its schema
- line 171: event "signal_given" (seq 171) does not match its schema
- line 182: event "card_played" (seq 182) does not match its schema
- and 76 more
