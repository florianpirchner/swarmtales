# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `liars-dice` |
| Seed | 79 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic, `claude-opus-5-5` via anthropic, `claude-sonnet-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 22 (referee) |
| Counted | events #5 to #2751 (2266 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 22 minutes (to the end); A02 on level 1 from minute 0 for 22 minutes (to the end); A03 on level 1 from minute 0 for 22 minutes (to the end); A04 on level 1 from minute 0 for 22 minutes (to the end) |
| Final standings | unknown |
| Cost | 1.148 USD for this run (competitors 1.148, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0086 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 23 of 23 minutes without a submission; longest without one: minutes 0-22 (23) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 5, TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Every resident played the dice game by pure probability arithmetic, with no table talk.** All four residents spent their turns computing binomial odds for bids and calls (#132, #141, #153, #161), and not one message was ever sent: 0 board posts and 0 DMs in the whole run. The social game ran as four isolated solvers looking at the same table. (#132, #141, #153, #161)
- **A03 won game 1 by baiting liar calls it could beat.** A03 bid 5x6 twice and both times A04 called liar and lost a die (#180, #228, #247). A03 closed out game 1 with a 3x6 bid that its own wild and two sixes made true, knocking A01 out (#708, #731). (#180, #228, #247, #731)
- **A04 lost every game with a fixed 'call at expectation' rule.** A04 called liar on bids that met its rough expected count (#161, #228, #356, #938, #1300) and was out of game 1 in fourth by minute 2 (#377). It then rewrote its brain to call only at 1.5 above expectation (#1768) but still finished last in game 2. (#161, #228, #356, #377, #1768)
- **A01 won game 2 by bidding faces its wild dice guaranteed.** A01 repeatedly raised to bids certain from its own hand, e.g. '1x6 ... the wild 1 covers any face, so it's certain' (#1657), and A03 lost three straight liar calls against those bids in the endgame (#1764). A01 took first in game 2 (#1781). (#1657, #1764, #1781)
- **The brain-writing window dominated post-game turns and mostly failed.** Four of five writeBrain attempts were rejected for length or lock: #67, #787, #1714, #1727, #1733, plus locked #1516 and #2580. Most of the 'retro' turns were spent trimming a 150-word file rather than reflecting on the game. (#67, #787, #1516, #1714, #1727, #1733, #2580)

## Problems

1. **Zero submissions and zero messages across the whole run.** The facts show 0 correct and 0 wrong submissions, 0 DMs and 0 board posts, and 23 of 23 quiet minutes. The residents only played the internal dice game, so the story's 'compete for seats' framing produced no visible player-to-player interaction. (#20, #28, #79, #97)
2. **The brain tool limit caused repeated wasted turns.** The 150-word limit rejected #67 (152 words), #787 (172), #1714 (160), #1727 (175) and #1733 (157). Residents had to guess word counts and lost the retro window to formatting instead of strategy. (#67, #787, #1714, #1727, #1733)
3. **writeBrain was locked in phases where residents expected it to be open.** A04 tried writeBrain during play and got TOOL_LOCKED (#1516) and again at minute 19 (#2580), while A02 concluded from the tool list that only the retro captain may write (#1605). The phase rules were not clear to the agents. (#1516, #1605, #2580)
4. **Residents misread the table state and the turn order.** A01 noted the dice totals in a message 'don't match my sixes plus the wild ones' but just accepted it (#439). A02 saw a contradiction between 'A04 opens round 7' and 'A01 is to act' and had to check the table (#2355). (#439, #2355)
5. **The run ended before any game concluded or score was recorded.** The referee ended at minute 22 with no levels solved and final standings unknown. The last logged action is A01 concluding its 3x2 call was a sure win (#2741), so the match had no closure. (#2741, #2751)

## Optimizations

- **Give residents a reason to talk at the table.** Because the run had 0 messages (#20-#2751), add a story beat that rewards table talk, such as a bonus for correctly reading an opponent's tells or a penalty for silent rounds, so probability work is not the only winning path. (#20, #79, #97)
- **Make the brain limit visible before writing.** Show the remaining word budget in the tool response or allow an automatic trim, since five writes were rejected for length (#67, #787, #1714, #1727, #1733) and the retro turns were consumed by counting words. (#67, #787, #1714, #1727, #1733)
- **State clearly when writeBrain is open.** A04 hit TOOL_LOCKED twice (#1516, #2580) while A02 inferred a 'retro captain' rule from the tool list (#1605). Publish the window and the eligibility rule to every resident at the start of each phase. (#1516, #1605, #2580)
- **Fix or explain the dice-total and turn-order messages.** A01 saw mismatched dice counts (#439) and A02 saw a turn-order contradiction in round 7 (#2355). Audit the table narration so counts and whose-turn notices always agree with the state. (#439, #2355)
- **Shorten or cap the match so a game finishes.** The referee ended at minute 22 with no levels solved and standings unknown (#2751), and the last game was still in round 12. Either raise the time limit or reduce dice so at least one game resolves within the run. (#2741, #2751)

## Loophole candidates

1. **Bidding a face the resident's own wild dice already guarantee.** (residents) A01 several times raised to bids that were mathematically certain from its own hand, e.g. '1x6 ... the wild 1 covers any face, so it's certain' (#1657) and 2x6 'certain' at #2652. This turns the wild-one rule into a safe, repeatable endgame weapon rather than a bluffing risk. (#1657, #1686, #2652)
2. **Passing the turn with a one-line 'not my turn' note.** (residents) Residents repeatedly ended turns with no action, e.g. A01 'Not my turn; A03 is acting now, so I'm ending my turn' (#212) and A02 'I'll just wrap up here' (#1556). This is a cheap way to stay safe without engaging with the table. (#184, #212, #1556)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 46: event "brain_written" (seq 46) does not match its schema
- line 47: event "retro_closed" (seq 47) does not match its schema
- line 53: event "brain_written" (seq 53) does not match its schema
- line 54: event "retro_closed" (seq 54) does not match its schema
- line 60: event "brain_written" (seq 60) does not match its schema
- line 61: event "retro_closed" (seq 61) does not match its schema
- line 85: event "brain_written" (seq 85) does not match its schema
- line 86: event "retro_closed" (seq 86) does not match its schema
- line 122: event "dice_game_started" (seq 122) does not match its schema
- line 123: event "dice_rolled" (seq 123) does not match its schema
- line 124: event "dice_round_started" (seq 124) does not match its schema
- line 135: event "dice_decision_scored" (seq 135) does not match its schema
- line 136: event "dice_bid" (seq 136) does not match its schema
- line 144: event "dice_decision_scored" (seq 144) does not match its schema
- line 145: event "dice_bid" (seq 145) does not match its schema
- line 156: event "dice_decision_scored" (seq 156) does not match its schema
- and 465 more
