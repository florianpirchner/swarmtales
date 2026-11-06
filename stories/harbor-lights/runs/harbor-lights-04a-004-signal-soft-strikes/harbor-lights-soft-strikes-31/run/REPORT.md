# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-soft-strikes` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 18 (referee) |
| Counted | events #2 to #2370 (2114 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 18 minutes (to the end); A02 on level 1 from minute 0 for 18 minutes (to the end); A03 on level 1 from minute 0 for 18 minutes (to the end); A04 on level 1 from minute 0 for 18 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.169 USD for this run (competitors 0.169, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0053 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 19 of 19 minutes without a submission; longest without one: minutes 0-18 (19) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 10, NOT_YOUR_TURN 6, NO_SIGNALS 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The crew saved a strategy brain in game 1 before any cards were played.** A01 wrote brain v1 in the opening minutes, and the crew agreed on a signal convention (a rank or suit signal on a playable card means play it now). This convention was later the source of confusion when A03 played Amber 5 on an info-only signal (#171, #277). (#103, #112, #171, #277)
- **A03 lit Rose 1 from A01's rank-1 signal, the first card played in game 1.** A01 signalled rank 1 to A03 (#144), and A03 played slot 2 as Rose 1 and lit it (#198). This shows the convention working as intended on a sure play. (#144, #198)
- **Three misfires in game 1 cost the crew three strikes.** A02 played Amber 4 blind (#217), then A03 played Amber 5 on A02's 'Amber' signal (#278), and later A03 misfired again on Cobalt 6 in game 2 (#1367). Strikes came from blind plays and misread signals, not from the tower logic. (#217, #278, #1367)
- **The crew lit 20 of 35 in game 1, then started game 2 fresh.** A02 reported game 1 ended with 20 lit for a score of 17, and game 2 began at minute 7 (#904, #936). The brain was saved as v2 (149 words) and later v3 (149 words) after several BRAIN_TOO_LONG refusals. (#904, #936, #1683)
- **A01 repeatedly spent signals to point teammates at sure plays.** A01 signalled A03 rank 1 (#154), A02 rank 2 (#1437), A04 rank 3 (#1499), and A02 rank 1 in game 2 (#1830). These signals produced several lit cards, showing A01 acting as a signal feeder rather than a player. (#154, #1437, #1499, #1830)
- **The run ended at minute 18 with no submission recorded.** The referee ended the run at #2370, with all four residents still on level 1 and no level-ups or submissions in the computed facts. (#2370)

## Problems

1. **All four residents stayed on level 1 for the whole run with zero submissions.** A01–A04 were stuck on level 1 from minute 0 to 18, and the quiet-minutes metric shows 19 of 19 minutes without a submission. The residents spent the run playing the card game, not solving the puzzle level. (#167, #936, #2370)
2. **The card-game phase consumed the entire run and left no room for level solving.** Game 1 ran from minute 0 to minute 6, the retro and brain writing took minutes 5–12, and game 2 started at minute 7 and ran to the end. There is no evidence of any attempt at a puzzle submission. (#904, #936, #1683, #2370)
3. **The brain word limit blocked the captain repeatedly.** A02 was refused five times in game 1 (#847, #865, #871, #878) and A03 seven times in game 2 (#1611, #1640, #1650, #1656, #1662, #1668, #1673 area) for BRAIN_TOO_LONG. Ten BRAIN_TOO_LONG errors in the computed facts show the limit is too tight or the instructions unclear. (#847, #865, #871, #878, #1611, #1640)
4. **Residents acted out of turn and hit NOT_YOUR_TURN errors.** A01 (#1166), A04 (#1388), A01 (#2209), A04 (#2293) and A04 (#2114, #2356) tried to play, discard or signal when it was not their turn. Six NOT_YOUR_TURN errors show the turn order is not clear enough in the prompt or tool feedback. (#1166, #1388, #2114, #2209, #2293, #2356)
5. **The team channel was locked during play, so residents could not coordinate in real time.** A03 tried to post a request during play and got TOOL_LOCKED (#1002), and noted it had to hold the information until after the game (#277, #1021). This forced residents to reason privately and act on stale or guessed information. (#277, #1002, #1021)
6. **Signals were often spent on information-only hints rather than sure plays.** A04 signalled 'Amber' to A02 (#194), A02 signalled 'Amber' to A03 (#289), and A02 signalled 'Rose' to A04 (#706). These info-only signals used up tokens that were later needed for sure plays, and the convention was supposed to discourage exactly this. (#194, #289, #706)

## Optimizations

- **Separate the card-game phase from the level-solving phase with a hard time budget.** Give the card game a fixed number of minutes or rounds and then force residents onto the puzzle level. The run used all 18 minutes on the card game and brain writing, with zero level submissions (facts; #936, #2370). (#936, #2370)
- **Raise or clarify the brain word limit.** Ten BRAIN_TOO_LONG refusals in one run (#847, #865, #871, #878, #1611, #1640) wasted captain turns and delayed the retro. Either raise the limit or show the word count in the tool feedback before the write. (#847, #865, #871, #878, #1611, #1640)
- **Make turn order explicit in the prompt and tool feedback.** Six NOT_YOUR_TURN errors (#1166, #1388, #2114, #2209, #2293, #2356) show residents did not know whose turn it was. Add the current player's name to every turn message and reject tools with a clearer 'it is A0X's turn' message. (#1166, #1388, #2114, #2209, #2293, #2356)
- **Allow a limited team channel during play for playable-card callouts.** A03's TOOL_LOCKED refusal (#1002) and the private-only reasoning (#277, #1021) meant residents could not share deductions in time. Open a restricted channel (e.g. one message per turn) for playable-card callouts. (#277, #1002, #1021)
- **Give the crew a rule that info-only signals are discouraged until sure plays are exhausted.** Info-only signals (#194, #289, #706) burned tokens that were later needed. Add a convention to the brain prompt: only signal when the target card is next for its tower, otherwise discard or play. (#194, #289, #706)

## Loophole candidates

1. **Residents used discards as a cheap way to regain signals instead of playing.** (residents) A01 discarded Moss 4 (#312), A04 discarded Violet 7 (#1091), and A02 discarded Rose 7 (#1185) to win signals back. Discarding was cheaper than a blind play and became the default safe move, which stalled progress toward lighting cards. (#312, #1091, #1185)
2. **The brain was rewritten every game with the same conventions, using up retro time.** (residents) Brain v1, v2 and v3 were all written within the run (#103, #904, #1683), and the retros at minutes 5–12 consumed most of the run. The residents treated brain writing as the main task rather than level solving. (#103, #904, #1683)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 48: event "team_post" (seq 48) does not match its schema
- line 56: event "team_post" (seq 56) does not match its schema
- line 63: event "team_post" (seq 63) does not match its schema
- line 70: event "brain_written" (seq 70) does not match its schema
- line 71: event "retro_closed" (seq 71) does not match its schema
- line 79: event "team_post" (seq 79) does not match its schema
- line 91: event "team_post" (seq 91) does not match its schema
- line 98: event "team_post" (seq 98) does not match its schema
- line 134: event "cards_dealt" (seq 134) does not match its schema
- line 135: event "game_started" (seq 135) does not match its schema
- line 136: event "deal_revealed" (seq 136) does not match its schema
- line 147: event "signal_given" (seq 147) does not match its schema
- line 161: event "card_played" (seq 161) does not match its schema
- line 162: event "card_drawn" (seq 162) does not match its schema
- line 174: event "card_played" (seq 174) does not match its schema
- line 175: event "card_drawn" (seq 175) does not match its schema
- line 182: event "signal_given" (seq 182) does not match its schema
- line 189: event "signal_given" (seq 189) does not match its schema
- line 205: event "card_played" (seq 205) does not match its schema
- and 236 more
