# Runs of the city slice

The index of the recorded runs of this game. The run folders are on the branch `data/runs` (decision A15), not
here; each has a `README.md` with its loopholes, problems and solutions. Model of every run: `anthropic/haiku`,
resolved to `claude-haiku-5-5`, thinking medium. The spend ledger of M3 is
[`../m3-ledger.jsonl`](../m3-ledger.jsonl): 0.0206 USD of the cap 1.50.

| Series | Path on `data/runs` | Data commit | Code commit | Runtime | n | Estimate | Cost (USD) |
|---|---|---|---|---:|---|---|---:|
| Live smoke of M3 (issue M3-30, decision A21), seed 7, `--snapshot-at 6` | `city-slice/smoke/city-slice-001` | `00f05497` | `a4e7ea7d` | 3 | 1 run | none: tick limit (12); 22 tool calls, all `readBoard`; no vote, no decision, the Director asked nothing | 0.0058 |
| Live smoke of M3, seed 11, `--snapshot-at 6`, Human Hand `city-slice-002.hand.jsonl` | `city-slice/smoke/city-slice-002` | `00f05497` | `a4e7ea7d` | 3 | 1 run | none: tick limit (12); as 001; the person's pause, snapshot and resume worked, its amendment was refused with `DECISION_CLOSED` (#342) | 0.0056 |
| Live smoke of M3, the variant `briefed` (issue M3-33, decisions A21 and A26): `--set briefed=true`, seed 7, `--snapshot-at 6`, Human Hand `games/city-slice/hands/amend.jsonl` | `city-slice/smoke/city-slice-003` | `807b32ff` | `53c35973` | 3 | 1 run | none: tick limit (12); 48 resident calls (36 `readBoard`, 12 `postBoard`), the court's notice arrived (#195 to #205), no vote: the residents agreed in public not to vote without evidence; no decision, the Director asked nothing; the person's amendment was refused with `DECISION_CLOSED` (#385) | 0.0092 |

All three folders verify with `swt log verify`, replay equal (`replay` of `@swarmtales/testkit`) and hold a
`REPORT.md` written with `--game`; the leak scan found no held key value. `swt resume` refuses the folders of the
first two runs (`SWT-X008`, "live resume is M5").

The smoke did not reach what it was run for, in none of its three runs. Without a briefing no resident acted (P450
in [`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md)). With the briefing and the court's notice
(`city-slice-003`) the residents posted twelve times, read the notice, and agreed on the board not to vote without
evidence (LH20); they have no clock and waited for the close of the session until the last tick (P457), and the
two ticks of the session gave them one turn to act on what they read (P458). The session closed with an empty
tally, so no decision was proposed. Untested on the live path: the Director's model port (its question, its
answer, the parsing of its take), an amendment that lands, the settling of a decision, the exile and the burn of
points and fragments. They are covered offline (the timelines of the game and `swt run --fake`, where the same
command with seed 3 gives a verdict, an amendment and an exile). This was the third and last run of M3-30.

Loopholes: none in the first two runs; one candidate in the third, the public pact of abstention (LH20). The logs
of `city-slice-001` and `city-slice-003` were read line by line.
