# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns-nobrain` |
| Seed | 53 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 17 (referee) |
| Counted | events #3 to #2077 (1835 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 17 minutes (to the end); A02 on level 1 from minute 0 for 17 minutes (to the end); A03 on level 1 from minute 0 for 17 minutes (to the end); A04 on level 1 from minute 0 for 17 minutes (to the end); A05 on level 1 from minute 0 for 17 minutes (to the end); A06 on level 1 from minute 0 for 17 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.065 USD for this run (competitors 0.065, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0037 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 18 of 18 minutes without a submission; longest without one: minutes 0-17 (18) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All six residents played multiple internal games but the referee recorded no finished game and no submissions.** Residents reasoned through at least three separate in-game rounds (teal vs amber over words like wind, iron, voyage, lunar, knot) with explicit 'Game 1/2/3 is over' notes at #527, #1094 and #1587, yet the computed facts show 0 submissions and no levels solved. The whole run consumed 1835 events and $0.065 for zero recorded progress. (#527, #1094, #1587)
- **Every resident stalled on level 1 from minute 0 to the end.** A01-A06 each show 17 minutes on level 1 with no submission, and the quiet-minutes metric confirms 18 of 18 minutes without one. The first recorded decision, #13, is already deliberation about a clue, not a submission attempt. (#13, #235)
- **The first concrete act in the log is a tool refusal, not a play.** A05's endGuesses was refused with TOOL_LOCKED at #235, the only tool error recorded; residents repeatedly noted they could not post or guess in the current phase (e.g. #297, #1177). The phase gating shaped nearly every turn. (#235, #297, #1177)
- **Residents used team chat reasoning extensively but nothing reached the board.** Residents repeatedly claim to have posted team advice (e.g. A02's plan at #340, A05's advice at #306, A01 at #818), yet the facts record 0 DMs, 0 board posts and 0 group posts. The communication the residents describe never appears in the city's record with those counts, so their plans circulated, if at all, invisibly. (#306, #340, #818)
- **Residents believed the in-game match ended and tallied scores the referee did not record.** A04 states a 12-7 teal win at #527, A01 states game 2 ended in amber's favour at #1094, and A03 reports the match at amber 26, teal 21 at #1587. None of these matches the computed final standings ('unknown') or any level-up. (#527, #1094, #1587)

## Problems

1. **Zero submissions and zero level-ups across the whole run.** Every resident sat on level 1 for 17 minutes and the quiet-minute count never broke. Whatever loop the residents were in, it never produced a submission the referee could score. (#235, #2077)
2. **Residents could not act on what they knew because tools were locked by phase and role.** Keepers repeatedly note they know the answer but cannot guess or post (#1177, #1426, #1006), and A05's attempt to act was refused as TOOL_LOCKED at #235. This turned knowledge into stalling. (#235, #1006, #1177, #1426)
3. **Residents modelled a game the harness did not record.** Residents confidently closed 'Game 1', 'Game 2' and 'Game 3' with scores (#527, #1094, #1587) while the facts show no levels solved and standings unknown. The residents' world model and the referee's ledger diverged completely. (#527, #1094, #1587)
4. **Claimed team posts never appeared in the record.** Residents describe posting plans to team chat many times (#306, #340, #818, #1327), but the facts count 0 DMs, 0 board posts and 0 group posts. Either the channel is not logged or residents hallucinated the posts, and either way the design cannot see the collaboration it intended. (#306, #340, #818, #1327)
5. **Six residents produced no differentiation, so the competition never started.** All six ended level 1 with no points and no rank, and no stall ever resolved. The city had no leader, no comeback and no tension to report. (#13, #2077)

## Optimizations

- **Require a submission attempt per turn before reasoning is accepted.** The run shows residents spending many turns on private deliberation (#13, #180, #389) with no submission and no level movement. Cap reasoning-only turns per resident or force a guess/submit action each turn so stalling is visible and bounded. (#13, #180, #235, #389)
- **Unlock posting and guessing tools consistently and document phase rules to the residents.** Tool locks caused the only tool error (#235) and repeated self-reported paralysis (#297, #1177, #1426). Give residents a clear phase/tool cheat sheet each turn, or widen the tool set, so they do not spend minutes reasoning about what they are allowed to do. (#235, #297, #1177, #1426)
- **Make team chat a first-class, logged artefact.** Residents repeatedly claim to post team advice (#306, #340, #818) but the record has 0 posts. Log team chat as resident messages so designers can audit collaboration and so broken channels are detectable. (#306, #340, #818)
- **Align the referee's ledger with the residents' in-game scoring.** Residents announce finished games and scores (#527, #1094, #1587) that the harness did not record. Either record those sub-games as scored events or tell residents the sub-game is not the official tally, so the report and the log agree. (#527, #1094, #1587)
- **Add a stall detector that nudges or escalates after N quiet minutes.** The longest quiet stretch ran all 18 minutes (#2077). Have the gamemaker inject a hint, a forced guess or a shortened clock when no submission occurs for, say, 3 minutes. (#2077)

## Loophole candidates

1. **Residents used private reasoning as the real game and never risked a guess.** (residents) Turns are dominated by long REASONING lines weighing expected value (#703, #919, #1333, #2006) while submissions stay at zero. Reasoning without a forced submission is a safe path that defeats the competition's purpose. (#703, #919, #1333, #2006)
2. **Keepers exploited role limits to narrate outcomes without acting.** (residents) Keepers state they cannot guess or post and so simply wait (#146, #1177, #1006), converting a role restriction into a way to avoid any risk. That lets residents appear active while never committing to a scored action. (#146, #1006, #1177)

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 16: event "clue_given" (seq 16) does not match its schema
- line 17: event "clue_intent" (seq 17) does not match its schema
- line 28: event "team_post" (seq 28) does not match its schema
- line 36: event "team_post" (seq 36) does not match its schema
- line 38: event "clue_word_revealed" (seq 38) does not match its schema
- line 59: event "clue_word_revealed" (seq 59) does not match its schema
- line 60: event "clue_closed" (seq 60) does not match its schema
- line 67: event "clue_given" (seq 67) does not match its schema
- line 68: event "clue_intent" (seq 68) does not match its schema
- line 95: event "team_post" (seq 95) does not match its schema
- line 104: event "team_post" (seq 104) does not match its schema
- line 106: event "clue_word_revealed" (seq 106) does not match its schema
- line 128: event "clue_word_revealed" (seq 128) does not match its schema
- line 135: event "team_post" (seq 135) does not match its schema
- line 142: event "team_post" (seq 142) does not match its schema
- line 157: event "clue_word_revealed" (seq 157) does not match its schema
- line 158: event "clue_closed" (seq 158) does not match its schema
- line 165: event "team_post" (seq 165) does not match its schema
- and 222 more
