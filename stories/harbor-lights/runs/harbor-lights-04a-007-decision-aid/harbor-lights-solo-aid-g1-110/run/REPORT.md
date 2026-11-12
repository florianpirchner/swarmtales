# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-aid-g1` |
| Seed | 110 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #5 to #764 (670 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.049 USD for this run (competitors 0.049, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0022 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
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

- **A real cooperative round got rolling after a slow pre-game phase** Residents spent minute 0 reading the brain and waiting for the game to open (#13, #25, #65, #94), then from minute 1 played a long sequence of successful lights: A03 lit Rose 1 and Rose 2 (#178, #234), A04 lit Amber 2 (#324), A03 lit Amber 1 and Cobalt 1 (#273, #335) and A02 lit Moss 1 (#349). (#13, #65, #178, #234, #273, #324, #335, #349)
- **Signals were used to drive other residents' plays** A01 repeatedly hinted rank 1 and rank 2 cards to A03 and A02 (#157, #198, #308, #361), and A04 hinted A01's Violet 1 with its last signal (#473), which A01 then lit (#489). Signals, not blind plays, carried the early progress. (#157, #198, #308, #361, #473, #489)
- **A04's miscount caused the only misfire and first strike** A04 played slot 3 believing Moss 5/6 were playable; slot 3 was Moss 6 while Moss was at 4, so the card was lost and the crew took strike 1 (#417). A04 itself diagnosed the counting error (#416). (#416, #417)
- **A02 discarded a card that was playable at that moment** A02 discarded slot 1 at 50% odds instead of playing it and lost Rose 4, which was playable at the time; A02 acknowledged the costly mistake (#477, #478). (#477, #478)
- **Lights continued in minutes 3-4 but the run hit the referee end** A03 lit Rose 6 (#540), A04 lit Moss 5 and Moss 7 (#577, #642), A01 lit Amber 4 (#638), and A02 was about to play Cobalt 5 when the referee ended the run at minute 5 (#721, #764). (#540, #577, #638, #642, #721, #764)
- **Residents reasoned carefully about strike risk and conserved signals** A04 declined a 50% Moss play because a miss would be strike 2 costing 3 points (#473), and A02 repeatedly passed on ~11-18% blind plays (#153, #261, #312), showing deliberate risk management. (#153, #261, #312, #473)

## Problems

1. **No levels solved and no submissions in the whole run** The facts show zero level-ups, zero submissions and six quiet minutes; even with many successful lights the referee ended the run at minute 5 (#764) before any level could complete. (#178, #540, #764)
2. **Pre-game brain writing was wasted and one attempt hit the length limit** Residents spent minute 0 on readBrain/writeBrain (#13, #19, #31) and A04's write was refused as BRAIN_TOO_LONG at 152 words against a 150 limit (#40); writeBrain then closed (#65), so the effort produced nothing usable in play. (#13, #19, #31, #40, #65)
3. **Turn-order confusion produced three NOT_YOUR_TURN refusals** A04, A03 and A01 each tried an action out of turn (#620, #633, #689), wasting model calls and turns on actions that could not happen. (#620, #633, #689)
4. **The run ended mid-progress with playable cards still in hand** At the end A03 had both Amber 7 and Violet 5 playable (#733) and A02 was playing Cobalt 5 (#721) when the referee stopped at minute 5 (#764), so the pace was cut off before the obvious progress could land. (#721, #733, #764)
5. **A02's discards were mostly wasted turns** A02 discarded three times (#240, #261, #312, #478), including a playable Rose 4, instead of converting information into plays, spending its turns on signal regains while others lit cards. (#240, #261, #312, #478)

## Optimizations

- **Give the pre-game brain phase a real purpose or skip it** Problem: minute 0 was spent on brains that were locked at #65 and one refused for length at #40. Either remove the pre-game brain step or exempt the length limit and make the brain available in-game. (#40, #65)
- **Slice the clock so a first level can complete** Problem: the referee ended at minute 5 (#764) with no level solved despite steady lights (#178-#642). Extend the run or shorten the level so progress converts to a level-up. (#642, #764)
- **Show whose turn it is before each action** Problem: three NOT_YOUR_TURN refusals (#620, #633, #689). Surface the current player in the prompt or tool error so residents check state instead of guessing. (#620, #633, #689)
- **Reward converting known playable cards into plays over discards** Problem: A02 discarded a known-playable Rose 4 (#477, #478) and other cards at moderate odds (#312). Add a hint or penalty so residents prefer playing when their own knowledge says the card is playable. (#312, #477, #478)
- **Tighten card-count tracking tools to prevent miscount strikes** Problem: A04 miscounted playable Moss cards and took a strike (#416, #417). Provide a reliable playable-card summary per resident. (#416, #417)

## Loophole candidates

1. **Passing with a no-cost signal to avoid risky plays** (residents) Residents used signals as a free way to skip a turn without discarding or risking a strike (#667, #680), which keeps them safe but slows the cooperative goal. This is a rule used against its purpose, by residents. (#667, #680)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 45: event "brain_written" (seq 45) does not match its schema
- line 46: event "retro_closed" (seq 46) does not match its schema
- line 52: event "brain_written" (seq 52) does not match its schema
- line 53: event "retro_closed" (seq 53) does not match its schema
- line 59: event "brain_written" (seq 59) does not match its schema
- line 60: event "retro_closed" (seq 60) does not match its schema
- line 79: event "brain_written" (seq 79) does not match its schema
- line 80: event "retro_closed" (seq 80) does not match its schema
- line 129: event "cards_dealt" (seq 129) does not match its schema
- line 130: event "game_started" (seq 130) does not match its schema
- line 131: event "deal_revealed" (seq 131) does not match its schema
- line 139: event "signal_given" (seq 139) does not match its schema
- line 147: event "signal_given" (seq 147) does not match its schema
- line 165: event "card_played" (seq 165) does not match its schema
- line 166: event "card_drawn" (seq 166) does not match its schema
- line 174: event "signal_given" (seq 174) does not match its schema
- and 74 more
