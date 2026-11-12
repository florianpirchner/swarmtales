# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-aid-g1` |
| Seed | 107 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #4 to #686 (608 events) |

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
| Tool errors | NOT_YOUR_TURN 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 opens the run by lighting Cobalt 1 from slot 3** A02 played slot 3, which was Cobalt 1, and it lit, putting the crew on 1 of 35 (#38). The play followed its own reasoning that slot 3 had to be a rank-1 card (#21). (#21, #38)
- **A04 burns three strikes within minute 0** A04 misfired on Moss 2 (#81), then on Cobalt 5 for the second strike costing 3 points (#119), then on Violet 7 for the third strike and 6 points lost to misfires in total (#170). After this A04 stopped gambling and mostly discarded or signalled (#542, #593). (#81, #119, #170)
- **A01 becomes the reliable closer with signals from teammates** A01 lit Violet 1 (#77), Rose 1 (#189), Rose 2 after A04's rank-2 signal (#230, #234), and Violet 2 after A04's Violet signal (#282, #295). Later A01 lit Amber 3 (#434) and completed the Rose tower with Rose 6 (#649). (#77, #189, #230, #234, #282, #295, #434, #649)
- **A04's costly discards feed signals that other residents convert** A04 discarded Violet 5 (#123), Moss 6 (#542) and Cobalt 7 (#593) to regain signals, and used signals to point A01 and A03 at playable cards (#230, #282, #481). A04 itself lit only Moss 1 (#373), Amber 5 (#635) and earlier misfired repeatedly. (#123, #230, #282, #373, #481, #542, #593, #635)
- **Two towers complete late in the run** Violet was completed by A01's Violet 6 (#399) and Rose by A01's Rose 6 (#649). Cobalt reached 3 and Moss reached 5, with A03 reporting no cards left in hand (#612, #665). (#399, #612, #649, #665)
- **Run ends with no submission and six quiet minutes** No level was solved; the referee ended the run at minute 5 (#686). The computed facts show 0 correct submissions and no submission in minutes 0-5. (#686)

## Problems

1. **No resident ever submitted a level solution** The run counted 0 correct and 0 wrong submissions across minutes 0-5, with the referee ending it at #686. Residents only played cards and signalled; nobody attempted a submitted answer. (#686)
2. **A02 hit a NOT_YOUR_TURN tool error** A02's playSlot was refused with NOT_YOUR_TURN because it was A03's turn (#498), even though A02 had already reasoned its slot 1 was playable Rose 4 (#495). A02 then correctly waited and played Rose 4 later (#557). (#495, #498, #557)
3. **Taxing misfire penalty made residents stop playing** After A04's three strikes (#81, #119, #170), residents repeatedly declined to play hidden cards citing the 3-point misfire cost (#217, #242, #267, #320, #367, #593). The crew spent many turns discarding or signalling rather than lighting towers. (#81, #119, #170, #217, #242, #267, #320, #367, #593)
4. **A04 was left with unplayable cards for long stretches** A04 reasoned none of its four cards could light and used its last signal at #438, then discarded again at #542 and #593 while waiting for Amber 5. A04's own cards were mostly Amber 5/7, Cobalt 7 or Moss 6 (#438, #569). (#438, #542, #569, #593)
5. **No messages or board posts between residents** The computed facts show 0 DMs, 0 board posts and 0 group posts, so all coordination happened through signals and private reasoning. This leaves no record of alliances or negotiation in the log. (#686)

## Optimizations

- **Add a clear submission step or a win condition residents can act on** The run ended with 0 submissions (#686) although residents were lighting cards all along. Give residents an explicit end-of-level submission action or a scoring target so tower progress counts toward a solved level. (#686)
- **Soften or cap the misfire penalty after the third strike** Residents stopped playing after strikes accrued (#170) and cited a 3-point cost repeatedly (#242, #267, #593). A lower or one-time penalty would keep hidden cards in play and reduce the long discard/signal stretches. (#170, #242, #267, #593)
- **Prevent off-turn play attempts with clearer turn prompts** A02 attempted playSlot out of turn and got NOT_YOUR_TURN (#498) even though its reasoning was ready (#495). A turn indicator or queued action would avoid wasted tool calls. (#495, #498)
- **Give residents a way to trade or pass unplayable cards** A04 sat on Amber 5/7, Cobalt 7 and Moss 6 for several turns (#438, #569) and only discarded to regain signals (#542, #593). A swap or draw action would reduce dead hands and speed tower progress. (#438, #542, #569, #593)
- **Encourage explicit public coordination among residents** The facts show 0 DMs and 0 board posts, so signals were the only visible coordination. A structured public board or shared plan slot would let residents align on which tower to push next. (#686)

## Loophole candidates

1. **A02 used a discard on a card that could never light** A02 discarded Cobalt 6 (#462), reasoning that Cobalt 4 and 5 were already lost so the card could never light, and the discard gave the crew a signal for free. This turns a dead card into a signal at no real cost. (#462)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 15: event "signal_given" (seq 15) does not match its schema
- line 24: event "card_played" (seq 24) does not match its schema
- line 25: event "card_drawn" (seq 25) does not match its schema
- line 34: event "signal_given" (seq 34) does not match its schema
- line 51: event "card_played" (seq 51) does not match its schema
- line 52: event "card_drawn" (seq 52) does not match its schema
- line 59: event "card_played" (seq 59) does not match its schema
- line 60: event "card_drawn" (seq 60) does not match its schema
- line 72: event "card_discarded" (seq 72) does not match its schema
- line 73: event "card_drawn" (seq 73) does not match its schema
- line 88: event "signal_given" (seq 88) does not match its schema
- line 96: event "card_played" (seq 96) does not match its schema
- line 97: event "card_drawn" (seq 97) does not match its schema
- line 112: event "card_discarded" (seq 112) does not match its schema
- line 113: event "card_drawn" (seq 113) does not match its schema
- line 130: event "signal_given" (seq 130) does not match its schema
- line 137: event "signal_given" (seq 137) does not match its schema
- and 58 more
