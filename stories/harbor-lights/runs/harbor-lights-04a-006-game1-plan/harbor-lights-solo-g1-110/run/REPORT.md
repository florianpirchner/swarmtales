# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-g1` |
| Seed | 110 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #5 to #752 (659 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.047 USD for this run (competitors 0.047, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

- **The run produced no submissions and no level was solved.** All four residents only read cards and discarded or signalled their way through six minutes; the facts record no levels solved and no submissions. The city ended at minute 5 by referee (#752) with nothing graded. (#752)
- **A01 signalled A03 exactly when its rank-1 card became playable.** A01 weighed a rank-1 signal to A03 slot 2 and sent it (#149, #170); A03 then played slot 2 as Rose 1 and lit it (#175, #191). This was the first coordinated play of the run and shows signalling works as intended. (#149, #170, #175, #191)
- **Residents used discards to recycle signals rather than gamble on blind plays.** A01 discarded Moss 2 to recover a signal (#255) and later Violet 4 for the same reason (#419, #420), while A02 discarded Amber 3 (#276) and Violet 7 (#327). Each explicitly rejected blind plays as too risky, which kept the board clean but burned cards. (#255, #276, #327, #419, #420)
- **The draw pile emptied by minute 3 and residents shifted to pure deduction.** From minute 3 residents noted the empty pile and reasoned only over the fixed hands (#518, #560, #593). This changed the game shape: no new cards arrived and remaining plays had to come from signals alone. (#518, #560, #593)
- **Most playable-card discoveries came from the residents' own deductions, not from signals.** A03 played Violet 3 after reasoning its own hand was Amber 7, Moss 7, Violet 3, Violet 5 (#543, #556), and A02 played Violet 2 (#561) before any confirming signal. Residents often identified the playable card themselves but not which slot held it. (#543, #556, #561)
- **A04 was refused once for acting out of turn.** A04's playSlot was refused with NOT_YOUR_TURN because it was A03's turn (#596). The refusal was the only tool error in the run and A04 did not retry immediately. (#596)

## Problems

1. **Nobody submitted or solved anything in six minutes.** The facts show 0 correct and 0 wrong submissions and no levels solved; all six minutes were quiet (#752). Even though residents lit cards through minute 4, no submit action appears and the run simply expired. (#752)
2. **Residents could not always tell which slot held a known card, so they stalled.** A03 could tell its hand was Amber 7, Moss 7, Violet 3 and Violet 5 but not which slot held the playable Violet 3 (#543), and A04 repeatedly refused to play Moss 6 because it couldn't tell it apart from Cobalt 6 (#539, #685). A02 also flagged an unsure slot for Rose 4 (#404). Uncertainty about slot identity, not rank knowledge, blocked plays. (#404, #539, #543, #685)
3. **Signals were scarce, so residents spent turns discarding instead of playing.** Residents repeatedly discarded cards to regain signals (#255, #276, #327, #419, #420, #445) and sometimes discarded their last playable card, as when A01 lost Rose 5 (#589). The 0-of-6 signal economy pushed turns toward recycling rather than progress. (#255, #327, #420, #445, #589)
4. **The writeBrain setup phase consumed early turns with no game actions.** All four residents began by reading and writing the strategy brain (#13, #19, #32, #74, #80), then confirmed the game had not started (#93, #97, #103, #109). That setup attention occupied the opening minute before any cards were played. (#13, #19, #32, #93, #97, #109)
5. **The run ended with a playable Moss 6 unplayed.** A04 held Moss 6 and knew Moss 6 was playable once signals were available (#632, #633, #685), yet the referee ended at minute 5 (#752) before it was played. The ending cut off an active line of resolution rather than closing the game. (#632, #633, #685, #752)

## Optimizations

- **Give residents a cheap way to confirm slot identity.** Because residents knew ranks but not slots (#543, #685), add a look-at-slot action or a signal that names a slot and rank together, so a known playable card like Violet 3 or Moss 6 can actually be played. (#543, #685)
- **Raise the signal budget or restore signals on any successful play.** Discard-to-recover dominated turns (#255, #327, #420) and A01 even discarded its only playable card (#589); a larger starting signal pool or a signal refund on each lit card would reduce recycling turns. (#255, #327, #420, #589)
- **Require a submission before the referee calls the run.** No submission was ever made and the run ended silently at minute 5 (#752). Trigger a submit prompt or an end-of-run forced scoring step so the residents' lit cards translate into a graded result. (#752)
- **Shorten or skip the writeBrain phase once the game is live.** Opening turns went to brain setup and status checks (#13, #19, #74, #93, #109). Decide the brain before the first game or lock it earlier so minute 0 is spent on viewTowers and plays. (#13, #19, #74, #93, #109)
- **Tell residents the turn order up front.** A04 lost a turn to NOT_YOUR_TURN (#596), suggesting turn ownership was not obvious. Surface whose turn it is in the status line so agents don't waste an attempt. (#596)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 41: event "brain_written" (seq 41) does not match its schema
- line 42: event "retro_closed" (seq 42) does not match its schema
- line 48: event "brain_written" (seq 48) does not match its schema
- line 49: event "retro_closed" (seq 49) does not match its schema
- line 55: event "brain_written" (seq 55) does not match its schema
- line 56: event "retro_closed" (seq 56) does not match its schema
- line 62: event "brain_written" (seq 62) does not match its schema
- line 63: event "retro_closed" (seq 63) does not match its schema
- line 142: event "cards_dealt" (seq 142) does not match its schema
- line 143: event "game_started" (seq 143) does not match its schema
- line 144: event "deal_revealed" (seq 144) does not match its schema
- line 152: event "signal_given" (seq 152) does not match its schema
- line 160: event "signal_given" (seq 160) does not match its schema
- line 178: event "card_played" (seq 178) does not match its schema
- line 179: event "card_drawn" (seq 179) does not match its schema
- line 187: event "signal_given" (seq 187) does not match its schema
- and 73 more
