# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `holdem-nobrain` |
| Seed | 42 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 54 (referee) |
| Counted | events #6 to #7326 (6069 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 54 minutes (to the end); A02 on level 1 from minute 0 for 54 minutes (to the end); A03 on level 1 from minute 0 for 54 minutes (to the end); A04 on level 1 from minute 0 for 54 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.325 USD for this run (competitors 0.325, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0062 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 55 of 55 minutes without a submission; longest without one: minutes 0-54 (55) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 41, other 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents played a full poker match but never advanced a level** A01-A04 spent the whole run on level 1 of holdem-nobrain across many hands and three game segments. A01 and A02 tracked game scores (A01 -51, A02 -42 at #1935/#2079), and later A01 reported +13 for game 3 while A03 reported +89 for game 2 (#3891, #5623). None of this produced a level-up or a submission. (#1935, #2079, #3891, #5623)
- **A03 was the strongest player across segments** A03 finished game 1 at +68 and game 2 at +89, both best of the four, and its own summaries name the totals (#2079, #3891). It repeatedly built value with sets and two pair, e.g. trips on a 2-3-3 flop (#2382) and a set of eights (#3543). (#2079, #2382, #3543, #3891)
- **TOOL_LOCKED dominated the run and fired on legal-looking turns** The city recorded 41 TOOL_LOCKED refusals, e.g. A04 refused at #224, A03 at #266, A02 at #360. Several came right after the resident's own reasoning concluded it was their turn (A04 #959 decides 'It's my turn now' and is refused at #962), so residents repeatedly misidentified turn order. (#224, #266, #360, #959, #962)
- **Residents burned many turns checking the table instead of acting** Residents frequently ended turns with only viewTable because they were unsure whose move it was, e.g. A02 #82 and #1047, A04 #940 and #2420, A01 #3340. This is a recurring stall pattern independent of hand outcome. (#82, #940, #1047, #2420, #3340)
- **A02 misread its own hand strength at a key moment** A02 reasoned it had a straight in hand 1 of game 1 on the J-9-8-7 board from T♣ and the board jack (#4027), and later in game 3 also concluded it had a jack-high straight from the same board (#4875 area). In several other spots it correctly counted outs, so the error is intermittent reasoning, not a rule misunderstanding. (#4027, #4875)
- **One non-lock tool error blocked an action** A02 was refused with an 'other' validation error when it tried action 'wait' at #3564, indicating the act schema rejected a chosen action rather than a turn-order problem. This is the single non-TOOL_LOCKED error of the run. (#3564)

## Problems

1. **No progression mechanic ever fired** Despite hundreds of hands played across many minutes, no level was solved and no submission occurred (#7326 ends the run with 0 correct, 0 wrong). The story apparently expects level clears, so the core loop is missing or unreachable. (#7326)
2. **Residents cannot tell when it is their turn** 41 TOOL_LOCKED refusals cluster on residents acting out of order, often immediately after they reasoned it was their turn (#959 then #962; #653 then #718 region). The turn-order signal in the prompt is ambiguous to the agents. (#224, #360, #718, #962)
3. **Time is spent on table checks rather than decisions** Many turns end with only a viewTable call and a short 'waiting' self-message (#929, #986, #3787, #809 area). This consumes run time without advancing hands or levels. (#929, #986, #3787)
4. **Action schema rejected a legal intent** A02's attempt to wait was rejected by a schema validation error at #3564, and elsewhere agents appear to route uncertain intent through only viewTable. This suggests the tool schema is too narrow for the actions agents need. (#3564)
5. **Residents hallucinate hand strength and pot state** A04 misreads the board repeatedly, e.g. claiming an ace-high straight from A-K-J-T-9 while noting no queen (#1099), and A02 calls a straight on the J-9-8-7 board (#4027). These reasoning errors make results noisy and mask whether story design works. (#1099, #4027)
6. **Gamemaker contributed nothing** The facts record 'no actions' and no labels for the gamemaker, so no narrative beats, hints, or pressure were supplied during the run. The residents played unaided poker with no story scaffolding. (#7326)

## Optimizations

- **Make turn order explicit in the per-turn prompt** Address the 41 TOOL_LOCKED refusals (#962, #224, #360) by stating in the turn prompt who has acted and who acts before the resident, rather than making agents infer it from a table view. (#224, #360, #962)
- **Widen or document the act-tool schema** Address the schema rejection at #3564 by allowing actions like check/fold/wait explicitly and documenting the exact allowed constants in the prompt, so agents do not fall back to viewTable. (#3564)
- **Add an explicit progression/submission path** Address 0 submissions and 0 level clears (#7326) by defining, in the touchable tools, what action counts as 'clearing level 1' and how a submission is made; currently no resident attempted one. (#7326)
- **Reduce voluntary viewTable-only turns** Address turns spent only waiting (#929, #986, #3787) by giving a concise state summary in the prompt and discouraging table checks when the resident already knows it is not their turn. (#929, #986, #3787)
- **Feed the gamemaker's story beats** Address the gamemaker's zero actions (#7326) by having it emit at least one beat or hint per game segment, so the run has narrative turning points rather than only poker hands. (#7326)
- **Give residents a hand-strength readout or validation** Address the misreads at #1099 and #4027 by providing the city's verified best-hand evaluation in the prompt so residents argue about strategy instead of inventing straights. (#1099, #4027)

## Loophole candidates

None found.

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
- line 47: event "decision_scored" (seq 47) does not match its schema
- line 48: event "action_taken" (seq 48) does not match its schema
- line 49: event "board_dealt" (seq 49) does not match its schema
- line 55: event "decision_scored" (seq 55) does not match its schema
- line 56: event "action_taken" (seq 56) does not match its schema
- line 69: event "decision_scored" (seq 69) does not match its schema
- line 70: event "action_taken" (seq 70) does not match its schema
- line 77: event "decision_scored" (seq 77) does not match its schema
- line 78: event "action_taken" (seq 78) does not match its schema
- and 1237 more
