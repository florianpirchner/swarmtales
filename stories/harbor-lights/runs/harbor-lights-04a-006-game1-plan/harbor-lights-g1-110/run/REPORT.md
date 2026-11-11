# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-g1` |
| Seed | 110 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #2 to #763 (677 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.048 USD for this run (competitors 0.048, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0024 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

- **The team agreed on a shared brain before touching the table.** A01 read the brain and team channel, A02/A03/A04 each posted agreement, and A01 saved version 1 of the crew brain (127 words) with the rank/suit signal convention. This coordination happened entirely in minute 0 before any card was played (#26, #58, #78). (#26, #58, #78)
- **A01 carried the team with signals while never knowing its own hand.** A01 repeatedly signalled playable cards to others ("1" to A03 at #155, "1" to A02 at #191, "3" to A02 at #310, "4" to A03 at #438, "6" to A03 at #542, "2" to A02 at #638) while stating its own four cards stayed unknown (#496, #580). (#155, #191, #310, #438, #542, #638)
- **A02's blind play misfired and cost a strike.** A02 played slot 1 as a 50/50 between Cobalt 2 and Violet 2, it was Violet 2 and misfired, giving strike 1 (#573, #599). A02 then refused to play blind again and discarded instead (#599). (#573, #599)
- **A02 discarded a playable Rose 6 by mistake.** A02 discarded slot 3 assuming it was Violet 3, but it was Rose 6, which was playable at that moment; A02 called it a costly miss (#483, #484). (#483, #484)
- **Two towers were completed late in the run.** Amber was completed by A03's Amber 7 (#665) and Moss by A03's Moss 7 (#728), each returning a signal to the crew. By minute 4 the count reached 20 cards lit (#728). (#665, #728)
- **The run ended at minute 5 with cards still playable.** A01 held Rose 7 and Violet 1, both playable, and was about to play them when the referee ended the run at minute 5 (#745, #763). (#745, #763)

## Problems

1. **No level was solved and no submission was made in six minutes.** The facts show zero correct and zero wrong submissions and no level-ups for any resident; the whole run was spent on one level's play without a submission (#763). (#763)
2. **A02 acted out of turn and was refused.** A02 attempted a discardSlot while it was A04's turn and got NOT_YOUR_TURN (#602), then had to wait (#606, #607). This is a wasted action and a tool error in the log. (#602, #606, #607)
3. **Residents repeatedly played or discarded blind and lost playable cards.** A01 discarded Rose 5 unknowingly (#407), A02 discarded playable Rose 6 (#484), and A02 misfired Violet 2 (#599). The signal economy pushed residents to discard for tokens rather than play known cards. (#407, #484, #599)
4. **A01 never learned its own hand despite being the brain writer.** A01 states its four cards are still unknown at #496 and #580, and only infers the set late (#514, #712). The team's signals went almost entirely to other players, leaving the coordinator unable to act on its own cards. (#496, #514, #580, #712)
5. **The run was cut off mid-play by the referee.** At minute 5 the referee ended the run (#763) while A01 still had two playable cards in hand (#745), so the outcome was decided by the clock rather than by play. (#745, #763)

## Optimizations

- **Give the coordinator a way to learn its own hand.** A01 spent the run signalling others while its own cards stayed unknown (#496, #580). Add a mechanic or incentive for teammates to signal back to the brain writer, or rotate the coordinator role. (#496, #580)
- **Make turn order visible before an action is attempted.** A02's discard was refused with NOT_YOUR_TURN (#602). Surface the current turn holder in the tool response or block the action client-side so residents do not waste a turn discovering the order. (#602, #606)
- **Reduce the cost of blind discards or warn when a discard is playable.** A01 lost Rose 5 (#407) and A02 lost Rose 6 (#484) to blind discards. A cheap "is this card playable?" check or a discard confirmation would prevent these losses. (#407, #484)
- **Extend the time budget or shorten the level.** The referee ended the run at minute 5 with playable cards still in hand (#745, #763). Either raise the minute cap or reduce the deck so a level can be finished within the window. (#745, #763)
- **Require a submission attempt to count progress.** Zero submissions were made across the run (#763). The harness should prompt or require a submission when a level's towers are near completion so the run produces a scored result. (#763)

## Loophole candidates

1. **Residents used discards purely to farm signal tokens.** (residents) A02 discarded Violet 3 explicitly to refill a signal (#692) and A03 discarded Violet 5 as a dead card to gain a signal (#613). Discarding became a cheap way to buy signals rather than a last resort, which the story likely did not intend. (#613, #692)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 46: event "team_post" (seq 46) does not match its schema
- line 54: event "team_post" (seq 54) does not match its schema
- line 61: event "team_post" (seq 61) does not match its schema
- line 68: event "brain_written" (seq 68) does not match its schema
- line 69: event "retro_closed" (seq 69) does not match its schema
- line 85: event "team_post" (seq 85) does not match its schema
- line 92: event "team_post" (seq 92) does not match its schema
- line 126: event "cards_dealt" (seq 126) does not match its schema
- line 127: event "game_started" (seq 127) does not match its schema
- line 128: event "deal_revealed" (seq 128) does not match its schema
- line 136: event "signal_given" (seq 136) does not match its schema
- line 145: event "signal_given" (seq 145) does not match its schema
- line 163: event "card_played" (seq 163) does not match its schema
- line 164: event "card_drawn" (seq 164) does not match its schema
- line 172: event "signal_given" (seq 172) does not match its schema
- line 184: event "card_discarded" (seq 184) does not match its schema
- line 185: event "card_drawn" (seq 185) does not match its schema
- line 194: event "signal_given" (seq 194) does not match its schema
- line 205: event "card_played" (seq 205) does not match its schema
- and 66 more
