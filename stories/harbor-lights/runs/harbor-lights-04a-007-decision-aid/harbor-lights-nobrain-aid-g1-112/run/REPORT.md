# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-aid-g1` |
| Seed | 112 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #4 to #723 (642 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.057 USD for this run (competitors 0.057, gamemaker 0.000, classifier 0.000) |
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

- **A04 opened scoring in minute 0 with Amber 1 and Cobalt 1.** A04 played slot 1 for Amber 1 (#53) and later slot 1 for Cobalt 1 (#112), giving the crew its first lit towers before anyone else scored. (#53, #112)
- **A02 landed a string of plays while others hesitated.** A02 lit Rose 1 (#82), Rose 2 (#418), Cobalt 7 completing Cobalt (#460), and Violet 1 (#527), the most productive early line in the run. (#82, #418, #460, #527)
- **Two strikes came from blind plays that the residents themselves had priced as bad bets.** A01 played slot 1 as Cobalt 6 and misfired for strike 1 (#90), then A03 played Moss 4 for strike 2 (#266), despite A01 having just argued a misfire costs 3 points (#119). (#90, #119, #266)
- **Many turns were spent signalling instead of playing, ending with zero submissions.** Residents repeatedly gave clues rather than playing cards, e.g. A03 signalled A01 Cobalt (#154) and A04 signalled A02 Rose (#174); the run closed with 0 correct and 0 wrong submissions. (#154, #174, #723)
- **A03 hit strike 3 late, after which the crew was on heavy penalties.** A03 played Moss 3 for a misfire in minute 4 (#638), the third strike, bringing total penalties to 6 points, while the game was otherwise running out of cards. (#90, #266, #638)
- **The run ended at minute 5 with no submissions and no winner.** The referee ended the run at minute 5 (#723) with the standings unknown, no levels solved and no submissions recorded. (#723)

## Problems

1. **Nobody ever submitted a solution, so no level was attempted.** Across all six minutes there were 0 correct and 0 wrong submissions and the run ended with no levels solved (#723); every turn was spent on plays, discards and signals. (#460, #723)
2. **The whole run stalled quiet for minutes 0-5.** The facts record no submission in minutes 0-5, a six-minute stall per resident, matching the lack of any level attempt in the log (#723). (#723)
3. **Residents misread playable cards and wasted strikes on known bad bets.** A01 played a 50/50 Cobalt card and lost it (#90) even though it had just reasoned a miss costs a strike and 3 points (#119); A03 did the same with Moss 4 (#266). (#90, #119, #266)
4. **Early discards threw away live, needed cards.** A01 discarded Amber 3 (#239) and Amber 4 (#397), and A02 discarded Moss 5 (#325), cards that later had to be replaced from an already thinning deck. (#239, #325, #397)
5. **Signals were spent on information that could not be converted into plays.** A03 signalled A04 Violet (#488) and later '4' to A04 (#684) while holding unplayable cards itself, and signals ran down to 0 (#501) without producing submissions. (#488, #501, #684)
6. **A tool error blocked a legitimate signal attempt.** A02 was refused with NOT_YOUR_TURN when trying to give a signal in minute 3 (#580), showing turn handling interfered with an intended action. (#580)

## Optimizations

- **Make submissions the visible goal and the end condition.** Since 0 submissions and 0 levels solved closed the run (#723), the story should state that lighting towers or submitting solutions ends the run and surface per-level submission affordances at minute 0. (#723)
- **Shorten or gate the signalling economy.** Turn after turn was spent on low-value clues (#154, #174, #488), delaying plays; the next version could limit signals or make the game clock pressure the residents toward plays. (#154, #174, #488)
- **Prevent or penalise blind plays after a strike.** A01 reasoned a misfire costs 3 points (#119) yet still played a 50/50 card (#90); the harness could mark playable cards more explicitly or forbid plays below a confidence threshold after two strikes. (#90, #119, #266)
- **Fix the turn-order error that refused a valid signal.** A02 was rejected with NOT_YOUR_TURN (#580) during a normal giveSignal; the referee should re-check ordering before refusing so residents are not blocked from clues. (#580)
- **Show residents the exact card counts so discards of needed cards stop.** Residents discarded Amber 3 and Amber 4 (#239, #397) and Moss 5 (#325) while later needing them; exposure of the remaining deck state would discourage discarding live cards. (#239, #325, #397)

## Loophole candidates

1. **Signalling kept the clock alive without advancing the game.** (residents) Residents repeatedly used signals (e.g. #488, #684, #700) as a cheap way to keep turns moving rather than attempting plays or submissions, while the run stayed at 0 submissions (#723). (#488, #684, #700, #723)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 15: event "signal_given" (seq 15) does not match its schema
- line 23: event "signal_given" (seq 23) does not match its schema
- line 36: event "signal_given" (seq 36) does not match its schema
- line 47: event "card_played" (seq 47) does not match its schema
- line 48: event "card_drawn" (seq 48) does not match its schema
- line 60: event "card_played" (seq 60) does not match its schema
- line 61: event "card_drawn" (seq 61) does not match its schema
- line 68: event "card_played" (seq 68) does not match its schema
- line 69: event "card_drawn" (seq 69) does not match its schema
- line 76: event "card_discarded" (seq 76) does not match its schema
- line 77: event "card_drawn" (seq 77) does not match its schema
- line 97: event "card_played" (seq 97) does not match its schema
- line 98: event "card_drawn" (seq 98) does not match its schema
- line 107: event "card_discarded" (seq 107) does not match its schema
- line 108: event "card_drawn" (seq 108) does not match its schema
- line 134: event "signal_given" (seq 134) does not match its schema
- line 141: event "signal_given" (seq 141) does not match its schema
- and 61 more
