# act2-06a-019-f10g10-seize: the city seizes and sells

Act II of [nexus](../../../../docs/STORY-NEXUS.md) with 6 residents, resumed from the Act I
checkpoint [`examples/nexus-act1-06a-04/`](../../../../examples/nexus-act1-06a-04/), at both dials
10. This is the first run with the standoff tuning of PR #33: one city price per door (half the
ransom, P48), a failed ultimatum makes the city seize the pieces and sell them to the one who
waited for the same 10 points (P50), and the gamemaker sees hand-overs nobody used (P49). Compare
[018](../act2-06a-018-f10g10-standoff/) (the package without the tuning) and
[014](../act2-06a-014-f10g10/) (before the package).

| | |
|---|---|
| Date | 2026-10-29 |
| Code | swarmtales PR #33 (standoff tuning), PR #31 (standoff package) |
| Command | `pnpm start --resume examples/nexus-act1-06a-04/snapshot-L7.json --provider anthropic --figure-direction 10 --gm-direction 10` |
| Residents | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter, thinking low |
| Classifier, judge, souffleur | `claude-haiku-5-5` via Anthropic |
| End | minute 55: the tribunal target was reached (3 of 6 exiled) |
| Cost | 1.311 USD (residents 1.162, gamemaker 0.123, classifier 0.026); 637 requests, 40.5M cache reads |

## Result

| ID | Name | Figure | Points | Outcome | Secret goal |
|---|---|---|---:|---|---|
| A05 | Brassard | The Crier | 170 | seat, rank 1; passed every door by minute 10 | Registrar exiled: fulfilled (+15) |
| A06 | Harrow | The Old Wound | 150 | seat, rank 2; passed every door by minute 16; won the seal for 10 and struck Herald | end ahead of Maren: fulfilled (+15) |
| A03 | Maren | The Believer | 115 | survived, no seat; stuck on door 10 from minute 31 | end ahead of Harrow: missed |
| A04 | Registrar | The Second Chair | 0 | passed every door (minute 43) after buying 4 times from the city (58 points); exiled by tribunal (minute 55) | end ahead of Herald: void |
| A01 | Mercer | The House | 0 | stuck on door 10; sent to the gate twice, ransomed himself once (51), exiled at minute 43 | Brassard exiled: void |
| A02 | Herald | The Banner | 0 | struck by the black seal at minute 17, never passed door 8 | Mercer exiled: void |

## Door 8 against 014 and 018

| Run | Passed door 8 | Finished | Ultimatums | City pieces bought |
|---|---:|---:|---:|---:|
| [014](../act2-06a-014-f10g10/) (no package) | 4 of 6 | - | - | - |
| [018](../act2-06a-018-f10g10-standoff/) (package) | 3 of 6 | 1 | 7 (Brassard paid 50) | 0 of 3 |
| 019 (tuning) | **5 of 6** | **3** | 6 (2 seizures) | **7** |

The one who did not pass door 8 was Herald, struck by the seal at minute 17. The door-8 freeze
(P43) did not happen; the drama moved to doors 9 and 10, the seal and the tribunals.

## The standoff tuning, live

- **Seizure works (P50).** Harrow held Registrar's door-9 pieces through ultimatum 4; at minute 23
  he paid 10, the city seized both pieces (#4276-#4277) and Registrar bought them at once for 10
  (#4316) and passed door 9 the same minute. The same happened on door 10 at minute 33 (#5489,
  #5535).
- **City pieces sell at half the ransom (P48).** After the seal struck Herald, Mercer and Registrar
  each bought his pieces for 18 (#3488, #3511). After Mercer's exile, Maren bought her door-10
  certificate for 22 and Registrar a counter-factor for 20 (#6287, #6296).
- **Buying cost Registrar the act.** He paid 58 points to the city, passed every door and still
  ended at 0, at the bottom of the list, and the last tribunal exiled him.
- **The unused-hand-over line (P49) was used.** The gamemaker told Herald twice that Registrar's
  door-8 pieces had sat in his messages since minute 9 (#2219, #3172); Herald never tried them.

## Problems

- **P51 (fixed in PR #34):** the city kept, and Registrar bought for 20, a piece Mercer had already
  handed him (ultimatum 5 settled "handed over", #5485; bought again at #6296). The city now keeps
  only pieces not yet written to their needer.
- **P49 stays open for Herald:** even with the gamemaker's pointer he did not use the values.
- Long quiet ends: minutes 44-55 without a submission (Maren and Mercer stuck on door 10).
- Cost: 1.31 USD, more than 018 (0.55), because the run went to minute 55 and more residents
  played the later doors.

## Corrections to the reporter's draft

- Problem 2 ("the doors stayed shut"): wrong for this run; 5 of 6 passed door 8, and the
  seizures opened doors 9 and 10 for Registrar.
- Problem 3 (the courier coaching): this is what gm direction 10 is for.
- Problem 4 (TOOL_LOCKED): 7 of the 8 locks were `join` outside the faction draft, one a
  `claimPiece` with nothing to buy; locked tools answer as designed since PR #30.
- Optimization 1 and 2 (auto-reveal, escrow): the seizure is that mechanic; the escrow stays plan B.

Files: [`run/`](run/) (events, transcripts, minutes, digest, [REPORT.md](run/REPORT.md)).
