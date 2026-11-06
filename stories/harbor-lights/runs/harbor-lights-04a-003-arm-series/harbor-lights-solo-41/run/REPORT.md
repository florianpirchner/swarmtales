# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-solo` |
| Seed | 41 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 14 (referee) |
| Counted | events #5 to #2225 (1961 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 14 minutes (to the end); A02 on level 1 from minute 0 for 14 minutes (to the end); A03 on level 1 from minute 0 for 14 minutes (to the end); A04 on level 1 from minute 0 for 14 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.172 USD for this run (competitors 0.172, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0051 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 15 of 15 minutes without a submission; longest without one: minutes 0-14 (15) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 11, BRAIN_TOO_LONG 6, NO_SIGNALS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents opened by writing a strategy brain and several stalled on the 150-word limit.** Every resident's first move was to read and write a strategy brain before the game (#13, #19, #25, #31). A01's first write was refused as BRAIN_TOO_LONG (#61), and later rewrites in the same pattern were refused again (#756, #777, #1467, #1472, #1477). (#13, #19, #25, #31, #61, #756, #777, #1467, #1472, #1477)
- **Residents spent early turns signalling and discarding while staying blind to their own hands.** A01 planned rank-1 signals to A03 but wasted turns on NOT_YOUR_TURN refusals (#138, #139, #146, #147). A01 and others repeatedly discarded unknown cards to regain signals instead of playing (#278, #299, #340, #350, #520). (#138, #139, #146, #147, #278, #299, #340, #350, #520)
- **The residents made progress in the mid-game, lighting towers through signals and plays.** A04 played Rose 1 at #181, A01 lit Violet 1 (#892) and Cobalt 1 (#941), and A03 lit Moss 1 (#919) and Moss 2 (#970). By minute 4 A04 reported 24 of 35 cards lit (#720, #810). (#181, #720, #810, #892, #919, #941, #970)
- **Misfires accumulated, changing the risk calculus and leading residents to hoard plays.** A03 misfired twice (#597, #1061) and A02 misfired twice (#1282, #1841). A01 repeatedly refused to play at two strikes, citing the risk of a third strike ending the game (#1294, #1854, #1961). (#597, #1061, #1282, #1294, #1841, #1854, #1961)
- **The game ended in a late stall over turn order and a final blind gamble that was never resolved.** A01, A02 and A04 all hit NOT_YOUR_TURN while A03 was up (#2166, #2199, #2205), and A01 noted A02 may have been skipped (#2183). A03 was weighing a coin-flip play of Moss 5 or Moss 7 (#2213) when the referee ended the run at minute 14 (#2225). (#2166, #2183, #2199, #2205, #2213, #2225)

## Problems

1. **The run produced zero submissions in 15 minutes; every resident stayed at level 1.** No resident made a single scored play or level-up across the whole run (facts). The 15 counted minutes were all quiet (#2225 ends the run with no submission). (#2225)
2. **Turn-order confusion repeatedly wasted residents' turns with NOT_YOUR_TURN errors.** There were 11 NOT_YOUR_TURN refusals, e.g. #146, #147, #324, #592, #674, #1382, #1431, #2166, #2199, #2205. Residents noted the errors and passed without acting (#2011, #2183). (#146, #147, #324, #592, #674, #1382, #1431, #2011, #2166, #2183, #2199, #2205)
3. **The brain word limit (150) repeatedly rejected residents' notes, burning turns.** Six BRAIN_TOO_LONG refusals occurred (#61, #756, #777, #1467, #1472, #1477), each capping a write attempt right after a game. A02's notes were 154, 188 and other lengths over the limit. (#61, #756, #777, #1467, #1472, #1477)
4. **Residents reasoned at length about probability but defaulted to discarding or signalling, slowing progress.** A01 chose a discard 'rather than risk a blind play' (#278, #340, #694) and others discarded to regain signals (#520, #1004, #2134). The draw pile emptied before the towers finished, limiting later plays (#532, #1992). (#278, #340, #520, #532, #694, #1004, #1992, #2134)
5. **NO_SIGNALS error shows residents attempted illegal signals without a working fallback.** A02 tried giveSignal with no tokens left and was refused (#1151) and had to re-read the status line (#1163). (#1151, #1163)

## Optimizations

- **Make turn order explicit in each turn's state so residents don't waste turns on NOT_YOUR_TURN.** Show the acting resident's name and the next actor in the tool status. This addresses the 11 NOT_YOUR_TURN refusals (#146, #147, #2166, #2199, #2205). (#146, #147, #2166, #2199, #2205)
- **Allow the brain write to be truncated automatically rather than refused.** Six BRAIN_TOO_LONG refusals (#61, #756, #777, #1467, #1472, #1477) burned turns for no information gain. Trim to 150 words and confirm, so residents keep their lessons. (#61, #756, #777, #1467, #1472, #1477)
- **Give a clear signal-count display and a no-op fallback when signals are spent.** A02 hit NO_SIGNALS and had to re-read the status line (#1151, #1163). Showing 'signals: 0/6 — play or discard' would prevent the dead attempt. (#1151, #1163)
- **Seed residents with knowledge of their own hand or a starter signal to shorten the blind phase.** Residents spent the first minutes discarding to learn their hands (#278, #340, #520). Providing one known card or a free starter signal would move the game forward. (#278, #340, #520)
- **Cap or summarize reasoning length so turns resolve faster and more plays occur in the window.** Reasoning lines run long, e.g. #138, #139, #1803, #2111. Shorter reasoning budgets would let the residents act more within the 14-minute referee window (#2225). (#138, #139, #1803, #2111, #2225)

## Loophole candidates

1. **Residents use discard as a near-free way to regain a signal instead of risking a play.** (residents) A01 repeatedly discards an unknown card purely to bank a signal (#278, #299, #350, #694), treating discard as a safe reset rather than a cost. This stalls the light bar while keeping strike risk low. (#278, #299, #350, #694)
2. **At two strikes residents stop playing and only signal or discard, avoiding the third strike.** (residents) A01 refuses a coin-flip play explicitly because a miss would be a third strike and end the game (#1961, #1294), effectively stalling the board while waiting for teammates to play. (#1294, #1961)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 40: event "brain_written" (seq 40) does not match its schema
- line 41: event "retro_closed" (seq 41) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 79: event "brain_written" (seq 79) does not match its schema
- line 80: event "retro_closed" (seq 80) does not match its schema
- line 130: event "cards_dealt" (seq 130) does not match its schema
- line 131: event "game_started" (seq 131) does not match its schema
- line 132: event "deal_revealed" (seq 132) does not match its schema
- line 144: event "signal_given" (seq 144) does not match its schema
- line 156: event "signal_given" (seq 156) does not match its schema
- line 167: event "card_played" (seq 167) does not match its schema
- line 168: event "card_drawn" (seq 168) does not match its schema
- line 175: event "card_played" (seq 175) does not match its schema
- and 244 more
