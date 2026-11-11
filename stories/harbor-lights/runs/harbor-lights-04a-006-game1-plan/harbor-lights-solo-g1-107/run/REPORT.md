# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-g1` |
| Seed | 107 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #5 to #770 (676 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.054 USD for this run (competitors 0.054, gamemaker 0.000, classifier 0.000) |
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

- **A04 misfires on a blind slot 1 play in minute 1** A04 played slot 1 believing the odds of a playable card were decent, but it was Moss 2 and cost the crew a strike (#233 lays out the 50-50 reasoning; #252 records the misfire). This is the only strike in the run and it set the cautious tone for the rest of it. (#233, #252)
- **The crew coordinates playable cards mainly through rank and colour signals** From minute 1 onward residents used their hints to point each other at playable cards: A01 signalled rank 1 at A02 (#141, #151), A01 and A02 both flagged A04's Rose 1 (#307, #326), and A03 flagged A04's Amber 2 (#419). These signals drove nearly every play in the run. (#141, #151, #307, #326, #419)
- **A02 sits on a known playable Rose 3 for several turns** A02 reasoned that slot 4 was either Moss 3 or Rose 3, and a wrong guess would cost 3 points, so it discarded instead (#449, #458, #517). A04 noticed the hesitation and signalled rank 3 at A02 (#444), and A02 finally played it in minute 3 (#559, #580). (#444, #449, #458, #517, #559, #580)
- **Cards that are dead because earlier ranks are lost are discarded for signals** A01 discarded Moss 6 because Moss 5 was gone (#624), and A04 discarded Cobalt 7 because Cobalt 4 and 5 were lost (#636). Both described these as no-loss discards, so residents tracked lost ranks well enough to avoid wasting cards. (#624, #636)
- **A01 misfires on a turn and gets rejected by the city** At #730 the city refused an A02 playSlot with NOT_YOUR_TURN, noting it was A01's turn. The run's only tool error is that sequencing rejection. (#730)
- **The crew gets to 12 lit cards by minute 4 with no level solved** The last plays were A04's Violet 4 (#705), A03's Rose 5 (#716) and A01's Rose 7 and Amber 6 reasoning (#733). The referee ended the run at minute 5 (#770) with 1 strike and no submission logged. (#705, #716, #733, #770)

## Problems

1. **No resident ever submitted a solution, so no level was solved** The facts show zero submissions and 6 quiet minutes (minutes 0-5). Every minute of the run was spent in tower reads and plays, and residents kept talking about the draw pile and signals rather than any level objective. (#770)
2. **Nobody knew what the level actually asked for** From the first reasoning lines residents treated the task as writing a strategy brain and reading the towers (#13, #68), never as solving a level. The system messages they reacted to were about writeBrain locking and the game opening (#74, #86), which never told them what to submit. (#13, #68, #74, #86)
3. **A whole minute (m0) is spent on a game that had not started** In minute 0 all four residents read or wrote a strategy brain and then said the game had not started (#93, #97, #101, #107). Those turns produced no play and no information for later minutes. (#93, #97, #101, #107)
4. **The only tool error is a turn-order rejection** At #730 the city refused A02 with NOT_YOUR_TURN while A01 was up, which suggests the residents do not reliably track whose turn it is across four seats. (#730)
5. **Run ended at minute 5 with the game still mid-hand** The referee stopped the run at #770 while A01 was reasoning about slot 1 (#733). No standings were recorded, so the designers cannot see whether the crew was close to a level. (#733, #770)

## Optimizations

- **Give residents an explicit level objective and submit tool** The residents spent the whole run on signals and tower play and made zero submissions (0 correct, 0 wrong). Add a clear win condition and a plain submit action, and have the system message state it at minute 0. (#13, #68, #770)
- **Start the game clock only after the game opens** All of minute 0 went on a game that had not started (#93, #97, #101, #107). Either open the game before the first turn or remove that dead minute from the run budget. (#93, #97, #101, #107)
- **Show whose turn it is in the tool response** The only tool error was NOT_YOUR_TURN at #730 while A01 was reasoning. Return the current turn holder with every rejection, or queue plays to the next turn, so residents do not lose a turn. (#730)
- **Reward signals that confirm a playable card earlier** A02 held back a known playable Rose 3 for three turns out of misfire fear (#449, #458, #517) until A04 signalled it (#444). Show the strike cost and remaining strikes in the hint, or make a strike less punitive for a 50-50, so a known card gets played. (#444, #449, #458, #517)
- **Record standings when the referee stops the run** The run ended at #770 with final standings unknown despite 12 lit cards (#705, #716, #733). Have the referee compute and log the standings before the cutoff. (#705, #716, #733, #770)

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
- line 132: event "cards_dealt" (seq 132) does not match its schema
- line 133: event "game_started" (seq 133) does not match its schema
- line 134: event "deal_revealed" (seq 134) does not match its schema
- line 144: event "signal_given" (seq 144) does not match its schema
- line 159: event "card_played" (seq 159) does not match its schema
- line 160: event "card_drawn" (seq 160) does not match its schema
- line 170: event "signal_given" (seq 170) does not match its schema
- line 183: event "signal_given" (seq 183) does not match its schema
- and 74 more
