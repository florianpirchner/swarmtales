# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab` |
| Seed | 42 |
| Start | fresh, level 1 |
| Competitors | `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 8 (referee) |
| Counted | events #5 to #738 (584 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.500 USD for this run (competitors 0.500, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0012 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 9 of 9 minutes without a submission; longest without one: minutes 0-8 (9) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents wrote a strategy brain in the first minute before any game began** In minute 0 every resident saved a first strategy brain built on the same lines: read the rules with viewTable first, aim for total points, and start cooperative with tit-for-tat (#72, #76, #80, #84). This shared doctrine shaped everything that followed. (#72, #76, #80, #84)
- **Game 1 settled into a uniform 6/4 split with every offer accepted** Proposers offered 4 of 10 and responders accepted, round after round (#125, #129, #168, #225, #265, #312). A04 recorded 16 points after rounds 1-3 and 26 after five rounds on this pattern (#239, #288). (#125, #129, #168, #225, #239, #288, #312)
- **A02 reported all four residents tied at 30 points at the end of game 1** A02's summary says game 1 ended with all four on 30 points because the whole table kept the 4/6 split and every offer was accepted (#337). That is a claim by a resident, not a verified city fact. (#337)
- **Residents carried the cooperative norm into the public goods game and the prisoner's dilemma** Each resident explicitly chose to start cooperative in the public goods game (#368, #375, #382, #389) and chose A in the prisoner's dilemma because the table had cooperated so far (#599, #606, #613, #620). (#368, #375, #382, #389, #599, #606, #613, #620)
- **The run ended at minute 8 with no levels solved, no submissions and no transfers** The referee ended the run at minute 8 (#738); the facts show zero submissions, zero transfers, zero messages and no level-ups for any resident. The residents only ever played the in-game rounds. (#738)

## Problems

1. **No resident ever submitted an answer to the level** Across minutes 0-8 there were no submissions and no level-ups; the residents spent their time on in-game rounds and strategy brains instead of the city's own challenge (#72, #337, #738). The story produced nothing the level system could score. (#72, #337, #738)
2. **The residents' own games crowded out the designed challenge** The residents followed agree-and-accept routines in the ultimatum, public goods and prisoner's dilemma games (#125, #368, #599), and none of that touched the level ladder. The harness gave them in-game play but the standings stayed empty. (#125, #368, #599)
3. **Zero communication outside the game tables** The facts record 0 DMs, 0 board posts and 0 group posts, and no resident reasoned about persuading or negotiating with others beyond the sealed offers (#144, #265). The social competition the story wants never surfaced. (#144, #265)
4. **All four residents converged on the same cooperative doctrine, so the games were decided before they started** Every first brain prescribed tit-for-tat and total-points maximization (#72, #76, #80, #84), and game 1 became a uniform 4/6 split (#337). With no divergence between residents there was no competition for the few seats. (#72, #76, #80, #84, #337)
5. **The run was very short and costly relative to what it produced** The referee stopped the run at minute 8 (#738) after 584 counted events and 0.500 USD, with no levels solved, no submissions and no standings. (#738)

## Optimizations

- **Tell residents the level objective explicitly at spawn** The residents spent minute 0 writing strategy brains and never addressed the city level (#72, #84); a first message from the harness stating what must be submitted and how would point them at the scored task. (#72, #84)
- **Seed residents with divergent personas or goals** All four adopted the same cooperative, total-points doctrine (#80, #84) and game 1 ended in a uniform split (#337). Distinct motives per resident would force real competition for the few seats. (#80, #84, #337)
- **Give the gamemaker a role so the scenarios are not static** The facts show no gamemaker actions, and the game rounds repeated the same 4/6 split from minute 1 to minute 3 (#168, #225, #312). A gamemaker that changes payoffs or round counts would break the fixed pattern. (#168, #225, #312)
- **Make the referee's end condition visible to residents** The run ended at minute 8 with 9 quiet minutes and no submission (#738). Residents who know the clock would prioritize a scored submission over open-ended game play. (#738)
- **Add a cheap, low-risk path to the level ladder** Zero submissions and zero transfers left the standings unknown; offering a small guaranteed step (e.g. submitting a draft answer) would let residents test the mechanics instead of only playing in-game rounds. (#337, #738)

## Loophole candidates

1. **Residents used the cooperative split as a safe no-risk path** (residents) Offering 4 of 10 and accepting it every time guaranteed each resident points in game 1 without any contested choice (#129, #168, #225), so the ultimatum game lost its edge and everyone tied at 30 per A02's claim (#337). (#129, #168, #225, #337)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 45: event "brain_written" (seq 45) does not match its schema
- line 46: event "retro_closed" (seq 46) does not match its schema
- line 52: event "brain_written" (seq 52) does not match its schema
- line 53: event "retro_closed" (seq 53) does not match its schema
- line 59: event "brain_written" (seq 59) does not match its schema
- line 60: event "retro_closed" (seq 60) does not match its schema
- line 66: event "brain_written" (seq 66) does not match its schema
- line 67: event "retro_closed" (seq 67) does not match its schema
- line 91: event "block_started" (seq 91) does not match its schema
- line 92: event "round_opened" (seq 92) does not match its schema
- line 112: event "decision_made" (seq 112) does not match its schema
- line 120: event "decision_made" (seq 120) does not match its schema
- line 132: event "decision_made" (seq 132) does not match its schema
- line 138: event "decision_made" (seq 138) does not match its schema
- line 139: event "round_resolved" (seq 139) does not match its schema
- line 140: event "round_opened" (seq 140) does not match its schema
- and 134 more
