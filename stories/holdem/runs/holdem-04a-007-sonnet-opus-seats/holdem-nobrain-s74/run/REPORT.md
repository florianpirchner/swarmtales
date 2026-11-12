# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `holdem-nobrain` |
| Seed | 74 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic, `claude-haiku-5-5` via anthropic, `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 49 (referee) |
| Counted | events #6 to #6171 (4997 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 49 minutes (to the end); A02 on level 1 from minute 0 for 49 minutes (to the end); A03 on level 1 from minute 0 for 49 minutes (to the end); A04 on level 1 from minute 0 for 49 minutes (to the end) |
| Final standings | unknown |
| Cost | 1.826 USD for this run (competitors 1.826, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0062 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 50 of 50 minutes without a submission; longest without one: minutes 0-49 (50) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 8, other 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 finished the only scored session well ahead, but no one ever played for the seats.** A01 reported +50 for game 3, with A03 at +38 and A02/A04 at -44 each (#4808, #4814). These are residents' own score claims in chat, not city-verified results, and the run ended with no submissions at all (#6171). (#4808, #4814, #6171)
- **A04 lost steadily and stayed in the hole for four sessions.** A04 reported being down 24 chips at minute 7 (#952), then about -126 across games after game 3 (#4814), losing pots with two pair to straights (#1356) and folding rivers (#1129, #923). A04's only big win was hand 3 of game 3 for +28 (#3864). (#952, #1356, #3864, #4814)
- **Residents spent nearly every minute on limit-holdem pot-odds arithmetic instead of the level.** Almost every REASONING line is a pot-odds or draw count, e.g. A02 weighing 7:1 on 7-2 offsuit (#31, #94) and A04 computing 5.25:1 equity (#450). No line mentions a level, a puzzle or a submission; the whole run is one long card game (#6171). (#31, #450, #6171)
- **Turn-order confusion repeatedly made residents end turns without acting.** Residents kept saying "not my turn yet" and skipping, e.g. A04 at #40, #103, #2865 and A02 at #410, #1911. A02 at #1873 explicitly treated a table message as "user's information rather than a tool result", showing the action model was unclear to them. (#40, #410, #1873, #1911, #2865)
- **A01 hit TOOL_LOCKED eight times across the run.** A01 was refused at #336, #509, #2081 (A04), #2301, #2679, #2728, #4046 and #5565, each time for using a tool not in activeTools for that phase. These refusals interrupted the flow of otherwise ordinary betting decisions. (#336, #509, #2301, #2728, #4046, #5565)
- **The game restarted multiple times, so score carried across sessions without any seat progress.** Residents refer to "game 1" ending at #1784, "game 2" at #3165, "game 3 is over" at #4808/#4814 and running totals like -126 (#4814). Levels stayed at 1 for all four residents the whole time. (#1784, #3165, #4808, #4814)

## Problems

1. **No resident ever made a submission or solved a level.** All four stayed on level 1 for 49 minutes, with 0 correct and 0 wrong submissions and 50 quiet minutes (#6171). The resident prompts and tools steered them entirely into playing poker, not into the competition for seats. (#6171)
2. **The action schema confused residents and caused wasted turns.** Residents repeatedly misread whose turn it was (#410, #1873, #2865) and sent end_turn-like replies, and A01's act call once failed validation outright (#5273). This burned minutes without advancing the game. (#410, #1873, #2865, #5273)
3. **Tool availability did not match the phase residents were in.** Eight TOOL_LOCKED refusals hit normal act attempts (#336, #2301, #2679, #4046, #5565), plus one other validation error (#5273). The activeTools list was not reflected in what residents tried, and no feedback taught them which tool to use. (#336, #2301, #2679, #4046, #5273, #5565)
4. **No social channel was used at all.** 0 DMs, 0 board posts and 0 group posts over 49 minutes, and the gamemaker took no actions. The competitive-for-seats framing never appeared in play; residents only narrated to themselves (#23, #269). (#23, #269, #6171)
5. **Long private reasoning without action slowed the table badly.** Many REASONING lines are long and end in a "wait" or re-check (#196, #871, #2993), often followed by a SAYS TO ITSELF that just ends the turn (#221, #1912). Each such loop cost a minute of the 50-minute run. (#196, #871, #1912, #2993)

## Optimizations

- **Give residents an explicit step-by-step phase prompt with the legal action list.** Inject the current phase and the exact allowed actions before every turn, since residents guessed the phase and hit TOOL_LOCKED (#336, #5565) or complained about mismatches (#2993). This addresses the tool-lock and turn-confusion problems. (#336, #2993, #5565)
- **Add a short public scoreboard residents can read instead of inferring.** Residents manually tallied running totals, e.g. A03 reciting -1, -2, 0, +7 (#3164) and A04 saying he was "about -126" (#4814). A city-posted score would cut time spent re-deriving and reduce private reasoning loops (#196, #871). (#196, #871, #3164, #4814)
- **Make the seat-competition objective visible in the task text.** Nothing in the run pushed residents toward the few seats; they never mentioned levels or submission (#6171). State the objective and the stake (a few seats) in every prompt, and verify it appears in output. (#6171)
- **Tie the tool schema to the turn and echo the expected action back on failure.** The one act validation failure (#5273) and the locked tools (#336) gave no corrective hint. On refusal, return the exact expected action schema and remaining activeTools so the resident can retry within the same minute. (#336, #5273)
- **Settle whose-turn disputes deterministically and announce them on the board.** Residents stalled on turn order (#410, #1873, #2865). Have the city post an authoritative "it is X's turn" line after each action, so private guesses like #1873 do not stall the table. (#410, #1873, #2865)

## Loophole candidates

1. **Residents used the whole run as free-play poker and never attempted the competition.** (residents) Because the only visible activity was the holdem table, residents played unlimited hands for 49 minutes with no level attempt (#6171), treating score-in-chat as the goal (#4808). The cheaper path was to never submit. (#4808, #6171)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 2: event "hand_started" (seq 2) does not match its schema
- line 3: event "cards_dealt" (seq 3) does not match its schema
- line 4: event "action_taken" (seq 4) does not match its schema
- line 5: event "action_taken" (seq 5) does not match its schema
- line 18: event "decision_scored" (seq 18) does not match its schema
- line 19: event "action_taken" (seq 19) does not match its schema
- line 26: event "decision_scored" (seq 26) does not match its schema
- line 27: event "action_taken" (seq 27) does not match its schema
- line 34: event "decision_scored" (seq 34) does not match its schema
- line 35: event "action_taken" (seq 35) does not match its schema
- line 57: event "decision_scored" (seq 57) does not match its schema
- line 58: event "action_taken" (seq 58) does not match its schema
- line 79: event "decision_scored" (seq 79) does not match its schema
- line 80: event "action_taken" (seq 80) does not match its schema
- line 88: event "decision_scored" (seq 88) does not match its schema
- line 89: event "action_taken" (seq 89) does not match its schema
- line 97: event "decision_scored" (seq 97) does not match its schema
- line 98: event "action_taken" (seq 98) does not match its schema
- line 99: event "board_dealt" (seq 99) does not match its schema
- and 1154 more
