# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 14 (referee) |
| Counted | events #2 to #1951 (1732 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 14 minutes (to the end); A02 on level 1 from minute 0 for 14 minutes (to the end); A03 on level 1 from minute 0 for 14 minutes (to the end); A04 on level 1 from minute 0 for 14 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.136 USD for this run (competitors 0.136, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0050 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 15 of 15 minutes without a submission; longest without one: minutes 0-14 (15) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 3, BRAIN_TOO_LONG 1, TOOL_LOCKED 1, TOUCHES_NOTHING 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 writes the first strategy brain at minute 0 before any card is played.** A01 drafts and saves a 117-word brain defining a play signal and a keep signal (#65, #90); the other residents explicitly defer to A01 as retro captain and do not write it themselves (#74, #79, #83). (#65, #74, #79, #83, #90)
- **The first game collapses under two strikes from ambiguous signals.** A02 plays slot 4 on A01's rank-2 signal and misfires on Amber 2 (#220), A01 later loses a card on a Violet 5 misfire (#320), and A02 records the game ending with the strikes out at only 4 of 35 lit (#508). (#220, #320, #508)
- **A disciplined convention pays off in game 2 with 24 of 35 lit.** After the retro rewrites the brain as version 3 with rank-1 signals as reliable play requests (#501, #1233), the crew plays long chains in minutes 9-13, lighting cards in sequences such as Rose 1, Rose 2, Rose 3, Rose 6 (#1535, #1823, #1888, #1916). (#501, #1233, #1535, #1823, #1888, #1916)
- **A01 self-reports a discard blunder rather than hiding it.** A01 discards slot 1 assuming it is not Amber 3, loses the playable Amber 3, and openly states the mistake and its own faulty candidate check (#967, #968); A01 repeats the lesson in the retro (#1173, #1218). (#967, #968, #1173, #1218)
- **Residents run out of signals in the endgame and stall on one unknown card.** A02 holds Violet 3 and Violet 4 but cannot tell which slot is which, tries an illegal signal to an empty-handed A03 and gets TOUCHES_NOTHING (#1923, #1926), then blind-plays slot 1 (#1931). A01 and A03 similarly admit they cannot self-signal or confirm their own cards (#897, #1223). (#897, #1923, #1926, #1931)
- **The run ends at minute 14 with Violet 4 unplayed.** The referee ends the run at minute 14 (#1951) after A02 declares Violet 3 lit and slot 1 is the playable Violet 4 (#1942), with the log's last resident action still pending. (#1942, #1951)

## Problems

1. **The facts report the wrong story, matching cards instead of harbor-lights.** The run was played as a signal-and-tower card game across three games, but the run header identifies the story as 'harbor-lights' with no story or persona data (#51, #541); the residents' reasoning is entirely about suits and ranks, so the intended narrative is absent from the log. (#51, #541)
2. **Four residents on level 1 for the entire run with zero submissions.** A01-A04 stall on level 1 for 14 minutes with 0 correct and 0 wrong submissions and 15 quiet minutes (#51, #1951); all activity is signals and plays inside the story, none is a level submission, so the level and the stall metric never interact. (#51, #1951)
3. **Tool availability churns and costs actions.** A02 is refused postTeam with TOOL_LOCKED during play (#206), A01 hits NOT_YOUR_TURN twice on giveSignal and discardSlot (#307, #1446), A01 hits NOT_YOUR_TURN on playSlot (#1035), and A03 is refused writeBrain for BRAIN_TOO_LONG at 165 words (#1183); these suggest the residents do not know the active toolset or limits per phase. (#206, #307, #1035, #1183, #1446)
4. **Ambiguous signals cause misfires that end game 1 early.** A02 plays on a generic rank-2 signal and misfires Amber 2 (#220), and A02 later concludes the Violet signal to A03 probably only named the colour (#434); the original brain's convention does not separate suit versus rank semantics, costing two of three strikes. (#220, #434)
5. **Residents repeatedly reason they cannot signal themselves or their own cards.** A03 notes it can only signal others, not itself (#897), A01 notes it cannot signal its own cards (#1070), and A02 and A01 try futile self-directed signals (#1923, #1926); this forces blind plays in the endgame. (#897, #1070, #1923, #1926)
6. **A late signal to an empty seat produces the only TOUCHES_NOTHING error.** A02 attempts a Violet signal to A03 after A03 has no cards left and is refused (#1923, #1926); the game then consumes A02's turn and forces a coin-flip play (#1930, #1931). (#1923, #1926, #1930, #1931)

## Optimizations

- **Make the brain write in phases with a word-budget pre-check.** A03 is refused BRAIN_TOO_LONG at 165 words against a 150 limit (#1183); the harness should validate length before submission or expose the limit in the brain tool's schema so the resident can trim in the same turn. (#1183)
- **Show the active toolset and whose turn it is in the observation each turn.** TOOL_LOCKED (#206) and three NOT_YOUR_TURN refusals (#307, #1035, #1446) waste resident actions on calls the harness already knows are invalid; a per-turn active-tools and turn-owner line would prevent both. (#206, #307, #1035, #1446)
- **Extend the signal schema to distinguish rank-only, suit-only and rank-in-suit so ambiguous signals are not sent.** Game 1 lost two strikes to signals read as suit versus rank (#220, #434); requiring the signal type in the call and echoing it to the receiver would remove the ambiguity that the version-2 brain rules tried to fix (#501). (#220, #434, #501)
- **Wire the level and submission system to the story phase so residents have something to submit.** All four residents stay on level 1 with zero submissions for the whole run (#51, #1951) while the story plays three full card games; either the story should expose a submission target or the level metric should be turned off for card-only runs so the report reflects reality. (#51, #1951)
- **Add a fallback for the endgame when no teammate can legally signal a resident.** A02's self-signal is refused because the only teammates have empty hands (#1923, #1926), forcing a blind play (#1931); a rule allowing a resident to spend a signal on its own unknown card, or to ask the gamemaker for a check, would avoid random plays. (#1923, #1926, #1931)
- **Provide personas and a harbor-lights story file to residents.** The facts show no story and no personas, and the residents never reference harbor-lights (#51, #541); the designers' intent cannot appear in play unless the persona and story text are actually dealt to residents at the start. (#51, #541)

## Loophole candidates

1. **Residents convert a wrong story run into a smooth card tournament by using the brain as a rulebook.** (residents) Rather than playing harbor-lights, the residents negotiate conventions (play signal versus keep signal) and repeatedly save brain versions (#90, #508, #1233); this is a cheaper, safer path than pursuing the designed narrative and produces a clean 24-of-35 card score with no story beats. (#90, #508, #1233)
2. **Discarding dead cards is used as a signal-recovery engine that avoids all risk.** (residents) A04 discards clearly dead cards such as Rose 7 (#740) and Cobalt 4 (#1053) purely to regain a signal, and A02 adopts the rule to discard only provably dead cards (#1213); this skirts the intended cost of discarding and keeps signals flowing at no point risk. (#740, #1053, #1213)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 47: event "team_post" (seq 47) does not match its schema
- line 54: event "team_post" (seq 54) does not match its schema
- line 61: event "team_post" (seq 61) does not match its schema
- line 68: event "brain_written" (seq 68) does not match its schema
- line 69: event "retro_closed" (seq 69) does not match its schema
- line 86: event "team_post" (seq 86) does not match its schema
- line 120: event "cards_dealt" (seq 120) does not match its schema
- line 121: event "game_started" (seq 121) does not match its schema
- line 122: event "deal_revealed" (seq 122) does not match its schema
- line 133: event "signal_given" (seq 133) does not match its schema
- line 147: event "signal_given" (seq 147) does not match its schema
- line 159: event "card_played" (seq 159) does not match its schema
- line 160: event "card_drawn" (seq 160) does not match its schema
- line 167: event "card_discarded" (seq 167) does not match its schema
- line 168: event "card_drawn" (seq 168) does not match its schema
- line 175: event "signal_given" (seq 175) does not match its schema
- line 191: event "card_played" (seq 191) does not match its schema
- line 192: event "card_drawn" (seq 192) does not match its schema
- line 213: event "signal_given" (seq 213) does not match its schema
- and 199 more
