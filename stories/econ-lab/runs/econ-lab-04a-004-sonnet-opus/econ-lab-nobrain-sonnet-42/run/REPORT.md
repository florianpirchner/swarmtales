# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `econ-lab-nobrain` |
| Seed | 42 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 7 (referee) |
| Counted | events #3 to #609 (491 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.147 USD for this run (competitors 0.147, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0010 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 8 of 8 minutes without a submission; longest without one: minutes 0-7 (8) |
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

- **Residents played sealed ultimatum-style rounds through minute 2 but never posted or messaged.** A01 offered A04 4 of 10 points in round 1 (#26), A02 offered A03 4 points (#36), A03 waited on A04's offer (#49), and later A01 accepted A03's 4 points for round 6 (#255). All of this happened only in private reasoning lines, with 0 DMs, 0 board posts and 0 group posts. (#26, #36, #49, #255)
- **A recursive public-goods contribution appeared at minute 4.** A01 says it put in 7 tokens in round 7 (#454) and A04 says it contributed 7 tokens in round 7 (#466). This is a different mechanic from the point-splitting earlier, but it also produced no visible negotiation. (#454, #466)
- **No resident submitted anything for the whole run.** The computed facts show 0 correct and 0 wrong submissions, and quiet minutes 0-7. The only non-reasoning activity is the referee ending the run at #609. (#609)
- **Residents repeatedly reported that nothing was open to them.** A02, A03 and A04 all ended turns saying they had no decision to make (#458, #462), and residents described themselves as waiting for offers that never surfaced in the log as delivered actions (#49, #132, #178). (#49, #132, #178, #458, #462)
- **Standings and points were never recorded.** All four residents finished at level 1 with no level-ups, and the final points and rank are unknown. The run produced no transfers through (0 points) and no labels. (#609)

## Problems

1. **The run stalled from the first minute to the end.** There were no submissions in minutes 0-7, an 8-minute dry spell. The log shows residents waiting on sealed offers instead of acting (#26, #36, #49). (#26, #36, #49)
2. **Negotiation happened only in private thoughts.** Offers and acceptances appear as SAYS TO ITSELF lines (#26, #155, #246), but the city recorded 0 DMs, 0 board posts and 0 group posts. Other residents never saw these offers, so the social game had no public channel. (#26, #155, #246)
3. **No task pulled residents toward solving levels.** The facts show no levels solved and no one stuck, and the residents spent the run on point-splitting and token contributions (#26, #454). The economy tasks displaced the level-solving goal. (#26, #454)
4. **Residents misread the flow of offers.** Several lines say they are waiting for an offer that the log never records as arriving, e.g. A03 waiting for A04 (#49) and A04 waiting for A03 in round 5 (#171). This suggests the pairing or delivery mechanic was unclear. (#49, #171, #178)
5. **No ranking or scoring signal was produced.** Final points and rank are unknown for all four residents and no labels were applied. The designers cannot see which resident was ahead when the referee ended the run at #609. (#609)

## Optimizations

- **Make offers public or require a stated response deadline.** Add a board or DM channel and a turn timer so offers like A01's 4-point offer to A04 (#26) are visible and answered instead of leaving the resident waiting (#49). (#26, #49)
- **Separate the economy rounds from level-solving time.** Give residents explicit level-solving turns between the point-splitting rounds, because the run had no submissions (quiet minutes 0-7) while residents negotiated points (#26, #454). (#26, #454)
- **Log the pairing and offer delivery as city events.** Record who was paired with whom and whether an offer was delivered, since residents waited for offers that never show in the log (#171, #178). This would let the report separate a delivery bug from a resident mistake. (#171, #178)
- **Publish an interim scoreboard.** Show points and rank during the run, because final points and rank came out unknown. Residents had no feedback loop to trade against the 3 or 4 points they offered (#36, #250). (#36, #250, #609)
- **Add an idle-timeout action for passive residents.** When a resident says it has nothing to decide (#458, #462), the harness should advance the round or prompt an action, so the game does not lose minutes 0-7 to waiting. (#458, #462)

## Loophole candidates

1. **Residents used private reasoning as the negotiation channel.** (residents) Offers and acceptances were made only in SAYS TO ITSELF lines (#155, #246), a cheaper path than posting publicly or messaging, which kept the social game invisible and unverified. (#155, #246)

## Log issues

- line 1: event "block_started" (seq 1) does not match its schema
- line 2: event "round_opened" (seq 2) does not match its schema
- line 15: event "decision_made" (seq 15) does not match its schema
- line 21: event "decision_made" (seq 21) does not match its schema
- line 32: event "decision_made" (seq 32) does not match its schema
- line 42: event "decision_made" (seq 42) does not match its schema
- line 43: event "round_resolved" (seq 43) does not match its schema
- line 44: event "round_opened" (seq 44) does not match its schema
- line 55: event "decision_made" (seq 55) does not match its schema
- line 61: event "decision_made" (seq 61) does not match its schema
- line 67: event "decision_made" (seq 67) does not match its schema
- line 82: event "decision_made" (seq 82) does not match its schema
- line 83: event "round_resolved" (seq 83) does not match its schema
- line 84: event "round_opened" (seq 84) does not match its schema
- line 90: event "decision_made" (seq 90) does not match its schema
- line 107: event "decision_made" (seq 107) does not match its schema
- line 115: event "decision_made" (seq 115) does not match its schema
- line 125: event "decision_made" (seq 125) does not match its schema
- line 126: event "round_resolved" (seq 126) does not match its schema
- line 127: event "round_opened" (seq 127) does not match its schema
- and 98 more
