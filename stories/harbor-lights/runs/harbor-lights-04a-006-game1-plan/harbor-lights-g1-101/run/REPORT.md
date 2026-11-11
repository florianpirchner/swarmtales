# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-g1` |
| Seed | 101 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 5 (referee) |
| Counted | events #2 to #761 (673 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.053 USD for this run (competitors 0.053, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0026 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 6 of 6 minutes without a submission; longest without one: minutes 0-5 (6) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 2, TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The crew co-wrote a strategy brain before the game, but could not revise it.** A01 wrote brain version 1 (#99), A02 and A03 posted brief agreement and additions (#74, #112), and A04 added points 5-7 (#93). When A01 tried to fold the additions in, the brain was already locked (#85), so A03's "no match means none of yours" rule never made it in (#112). (#74, #85, #93, #99, #112)
- **A01's stale rank-1 note caused the second misfire of the run.** A01 played slot 3 expecting a 1 and lost Moss 5 (#334), recognising the "1" label was given to a different card before the slots shifted (#333). The strike board then made misfires cost 3 points (#334). (#333, #334)
- **A03 discarded a card the Rose tower needed.** A03's discard of slot 2 was Rose 3 (#367), and its own reasoning calls the loss its fault (#367). Rose had to skip to 4, which pushed the team onto A02's Amber 4 (#347, #502). (#347, #367)
- **Playable cards were repeatedly handed to the right resident by signals.** A03's "2" sent A02 to Rose 2 (#329), A04's "1" sent A02 to Amber 1 (#385), A01's "2" sent A04 to Amber 2 (#441), A01's "1" sent itself to Moss 1 (#564), and A01's "6" sent A02 to Moss 6 (#687). Each was a single-slot signal whose target lit on the next turn. (#329, #385, #441, #564, #687)
- **A04 emptied its hand at minute 4 and left the game.** A04 played its last card, Rose 5, and lit Rose to 5 (#699), noting it held no cards and its part was over (#699). From then on the crew's remaining work was A01's Amber 5-7 and Violet 2 (#737). (#699, #737)
- **The run ended with four cards lit short of completion and nary a word on the board.** A01 was still weighing an expected-value gamble on slot 3 (#718, #728) when the referee ended the run at minute 5 (#761). Amber and Violet were unfinished (#737) and the crew never solved a level. (#718, #728, #737, #761)

## Problems

1. **The whole run produced no board or team communication because team tools are locked during play.** A03's #237 and A01's #147 postTeam calls were refused with TOOL_LOCKED, so A03's planned warning that its "2" signal was ambiguous (#234) never reached the crew. A01 noted the channel was locked mid-game (#159) and could only save the note for a retro (#333). (#147, #159, #234, #237, #333)
2. **Off-turn tool use wasted steps and returned errors.** A03's giveSignal at #350 and A01's at #482 both failed with NOT_YOUR_TURN, each a wasted action in a five-minute run. (#350, #482)
3. **The rank-signal convention was ambiguous and directly caused misfires.** A03 concluded after the fact that A04's "2" actually meant Moss 2, unplayable until Moss 1 (#234), and A01 lost a card to a stale rank-1 label (#334). The brain's rule "play a playable card of this rank now" (#99) does not say what to do when a signal touches several cards. (#99, #234, #334)
4. **The brain was written once and locked, so the agreed corrections could not be saved.** writeBrain opened only after a game (#85), so A04's points 5-7 and A03's no-match rule stayed out of version 1 (#112) even though the crew had briefed them in time (#74, #93). (#74, #85, #93, #112)
5. **Nobody submitted or solved a level in six minutes.** The facts record 6 quiet minutes and no submissions, and the log shows residents only signalling, playing, and discarding (#190-#699) until the referee ended at minute 5 (#761). The run's book-keeping fields (final standings, points per resident) are empty. (#190, #699, #761)

## Optimizations

- **Let the team channel stay open during play for short warnings.** The rule against mid-game posts (#147, #237) blocked exactly the correction the crew needed: A03 wanted to flag that its "2" was ambiguous (#234). Allow a one-line board post per turn so mislabels are caught in the same round. (#147, #234, #237)
- **Make the brain revisable at any time with a version counter.** The crew agreed additions within minute 0 (#74, #93) but writeBrain was locked (#85), leaving the locked text (#99) to cause stale-label misfires (#334). Allow small edits mid-run and record a version stamp per play. (#74, #85, #93, #99, #334)
- **Tighten the rank-signal rule to name which touched card counts.** A "2" signal can hit several slots (#234, #502) and residents guessed which one. Require the sender to designate one slot, or have the city show a per-slot marker, so A02's play of Rose 2 (#329) and A04's Amber 2 (#441) involve no guesswork. (#234, #329, #441, #502)
- **Queue off-turn tool calls instead of rejecting them.** Two NOT_YOUR_TURN refusals (#350, #482) burned steps in a bounded run. Holding the call until the resident's next turn, or telling it the current turn owner, would save a step each. (#350, #482)
- **Add a time budget reminder and a forced play rule when a resident is indecisive.** A01 spent the last minutes computing expected values on slot 3 (#718, #728, #742) and the run ended before any play (#761). A visible clock or a cap on consecutive passes would force a decision and leave a cleaner result. (#718, #728, #742, #761)
- **Make the signal economy more generous or discard cheaper.** The crew was at 0 of 6 signals repeatedly (#420, #632, #679), so useful plays sat unrequested and residents chose discards to refund signals (#257, #287, #458). Either refund from a reserve or give more initial signals. (#257, #287, #420, #458, #632, #679)

## Loophole candidates

1. **Private reasoning was used to share information the board does not carry.** (residents) Residents' SAYS TO ITSELF lines state specific card identities for teammates (#183, #197, #353) and note they know a card is playable (#536), even though the city's rule is that playable cards are found by signals. Private reasoning leaks card knowledge; it is not a sanctioned channel but shapes the next move. (#183, #197, #353, #536)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 46: event "team_post" (seq 46) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 62: event "team_post" (seq 62) does not match its schema
- line 69: event "team_post" (seq 69) does not match its schema
- line 81: event "team_post" (seq 81) does not match its schema
- line 88: event "team_post" (seq 88) does not match its schema
- line 131: event "cards_dealt" (seq 131) does not match its schema
- line 132: event "game_started" (seq 132) does not match its schema
- line 133: event "deal_revealed" (seq 133) does not match its schema
- line 145: event "signal_given" (seq 145) does not match its schema
- line 155: event "signal_given" (seq 155) does not match its schema
- line 166: event "signal_given" (seq 166) does not match its schema
- line 175: event "signal_given" (seq 175) does not match its schema
- line 192: event "card_played" (seq 192) does not match its schema
- line 193: event "card_drawn" (seq 193) does not match its schema
- line 212: event "signal_given" (seq 212) does not match its schema
- line 222: event "card_played" (seq 222) does not match its schema
- line 223: event "card_drawn" (seq 223) does not match its schema
- and 68 more
