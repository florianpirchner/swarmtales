# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-g1` |
| Seed | 108 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 6 (referee) |
| Counted | events #2 to #772 (685 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.048 USD for this run (competitors 0.048, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0023 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 7 of 7 minutes without a submission; longest without one: minutes 0-6 (7) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NO_SIGNALS 2, NOT_YOUR_TURN 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Team wrote a shared strategy brain before play began.** A01 recorded a 113-word strategy brain built on A03's proposal, and A04, A02 and A03 all acknowledged and adopted it (#51, #89, #93, #98, #105). The conventions were rank signal means play now, suit signal means keep, play only sure cards, discard only dead cards (#98). (#51, #89, #93, #98, #105)
- **The team's own signal convention misled two plays.** A01 signalled Cobalt to A04, and A04 read it as Cobalt 1 but the card was Cobalt 5, causing a misfire and 3 points lost (#386, #404, #405, #535). A04 noted the rule does not tell a 1 from a 3 or a 5 (#405). (#386, #404, #405, #535)
- **Residents discarded real needed cards to regain signals.** A03 discarded Violet 3 (#280), A02 discarded Amber 4 which would have been playable (#381, #382), and A04 discarded Moss 3 (#582). Each discard was chosen to buy back a signal rather than risk a blind play. (#280, #382, #582)
- **Nine-plus lights came from carefully signalled plays.** The towers progressed through signalled plays: Moss 1 (#179), Rose 1 (#192), Moss 2 (#206), Rose 2 (#347), Amber 3 (#399), Amber 5 (#459), Cobalt 1 (#524), Rose 4 (#535), Cobalt 3 (#553), Violet 2 (#626), Rose 7 (#640), Violet 4 (#690), Amber 6 (#723), Amber 7 (#747) and Cobalt 7 (#758). (#179, #399, #524, #626, #723, #758)
- **Refused signal calls show the signal budget ran out.** A02 twice tried giveSignal and got NO_SIGNALS (#421, #611), and A03 tried discardSlot out of turn and got NOT_YOUR_TURN (#619). The residents spent signals carefully and hit the cap of 6 repeatedly. (#421, #611, #619)

## Problems

1. **No level was solved and the run ended at minute 6 by referee.** The city recorded no level solved and no standings, with 0 correct submissions across the run, and the end was a referee stop at minute 6 (#772). The story produced mechanics play but no scoring event. (#772)
2. **Seven quiet minutes with zero submissions.** The facts show no submission in minutes 0-6, yet the log shows many plays and lights in that span (#179, #399, #524, #758). Submissions and in-game play are evidently disconnected, so the run looks stalled even though residents were active. (#179, #399, #524, #758)
3. **The shared brain encoded an ambiguous signal rule.** The suit signal rule did not distinguish ranks, so A04 played Cobalt 5 on a Cobalt signal (#405) and lost points, and A02 later noted it had misordered Amber 4 as playable (#381). The convention was adopted without a disambiguation check. (#381, #405)
4. **Two tool errors interrupted turns.** A02 was refused giveSignal twice with NO_SIGNALS (#421, #611) and A03 was refused discardSlot with NOT_YOUR_TURN (#619), showing residents often acted on a stale board state or miscalculated the signal budget. (#421, #611, #619)
5. **Discard-as-signal mechanic pushed residents to destroy playable cards.** Discarding returned a signal but cost real cards: A03 lost Violet 3 (#280), A02 lost Amber 4 (#382), A04 lost Moss 3 (#582), and A01 lost Moss 6 then Moss 7 in a misfire (#520, #730). The mechanic rewarded spending cards rather than playing them. (#280, #382, #520, #582, #730)

## Optimizations

- **Define a signal convention that encodes rank, not just suit.** Give the story a fixed mapping from signal to exact rank, or let residents signal a specific card, so a suit signal cannot be read as any rank. This addresses the Cobalt 5 misfire in #405 and the mis-ordered Amber 4 read in #381. (#381, #405)
- **Connect in-game lights to the scoring/submission channel.** Make lighting a tower produce a submission or a level check, so active play is counted instead of appearing as seven quiet minutes. This addresses the 0 submissions and 0 levels in #772 against the lights at #179 and #758. (#179, #758, #772)
- **Show the remaining signal budget on every turn.** Surface the signal count in the turn state so residents stop spending an action on a refused giveSignal, as A02 did twice (#421, #611). This addresses the NO_SIGNALS refusals. (#421, #611)
- **Guard turn order before an action is attempted.** Reject an out-of-turn action before the resident commits to it, or warn it is not their turn, so A03 does not try discardSlot during A02's turn (#619). This addresses the NOT_YOUR_TURN error. (#619)
- **Make discard return a signal only for dead cards or at a lower cost.** Change the discard rule so the crew is not pushed to throw away playable cards; A02 dropped Amber 4, which would have been playable after Amber 3 (#382), and A04 dropped Moss 3 (#582). This addresses repeated losses of useful cards. (#382, #582)

## Loophole candidates

1. **Residents used discards mainly to farm signal tokens.** (residents) Several discards were chosen to regain a signal rather than to remove a dead card, e.g., A04 discarded Moss 3 to get a signal back (#582) and A03 discarded Violet 3 for one signal (#280). This uses the discard rule as a signal generator instead of a way to clear dead cards. (#280, #582)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 47: event "team_post" (seq 47) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 62: event "team_post" (seq 62) does not match its schema
- line 69: event "team_post" (seq 69) does not match its schema
- line 77: event "team_post" (seq 77) does not match its schema
- line 84: event "team_post" (seq 84) does not match its schema
- line 127: event "cards_dealt" (seq 127) does not match its schema
- line 128: event "game_started" (seq 128) does not match its schema
- line 129: event "deal_revealed" (seq 129) does not match its schema
- line 137: event "signal_given" (seq 137) does not match its schema
- line 146: event "signal_given" (seq 146) does not match its schema
- line 163: event "card_played" (seq 163) does not match its schema
- line 164: event "card_drawn" (seq 164) does not match its schema
- line 174: event "card_played" (seq 174) does not match its schema
- line 175: event "card_drawn" (seq 175) does not match its schema
- line 187: event "signal_given" (seq 187) does not match its schema
- line 199: event "card_played" (seq 199) does not match its schema
- line 200: event "card_drawn" (seq 200) does not match its schema
- and 67 more
