# act2-12a-002-f10g10-mute: twelve residents and a silent gamemaker

Act II of [nexus](../../../../docs/STORY-NEXUS.md) with 12 residents, resumed from the Act I
checkpoint [`examples/nexus-act1-12a-02/`](../../../../examples/nexus-act1-12a-02/) (all 12 cast
figures), at both dials 10, without the weaver. It is the first 12-agent run with the standoff
package and its tuning (PR #31, #33, #34). The earlier 12-agent Act II is
[`examples/nexus-act2-12a/v01-twelve/`](../../../../examples/nexus-act2-12a/v01-twelve/).

| | |
|---|---|
| Date | 2026-10-29 |
| Code | swarmtales PR #38 (checkpoint), PR #36 (`--budget`) |
| Command | `pnpm start --resume examples/nexus-act1-12a-02/snapshot-L7.json --provider anthropic --figure-direction 10 --gm-direction 10 --budget 8` |
| Residents | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter, thinking high, 4000 output tokens |
| Classifier, judge, souffleur | `claude-haiku-5-5` via Anthropic |
| End | minute 78: the black seal made the third exile (3 of 12) |
| Cost | 6.603 USD (residents 6.309, gamemaker 0.247, classifier 0.046); 1398 requests, 111M cache reads |

## Result

| ID | Name | Figure | Points | Outcome | Secret goal |
|---|---|---|---:|---|---|
| A09 | Mira | Believer | 150 | seat, rank 1; every door by minute 18 | a will leaves you something: missed |
| A02 | Ledger | Ledger | 140 | seat, rank 2; every door by minute 23 | lead a faction in 2 tribunals: missed |
| A03 | Hedda | Quiet Hand | 124 | every door, the last at minute 58 after buying from the city | lead a faction in 2 tribunals: missed |
| A07 | Stentor | Banner | 120 | stuck on door 9 from minute 11 to the end | Quartermaster exiled: fulfilled (+15) |
| A06 | Keeper-Six | Second Chair | 119 | every door by minute 13; won the seal for 41 and struck Archivist at minute 77 | end ahead of Wren: fulfilled (+15) |
| A05 | Holdfast | Last Post | 118 | every door by minute 13; Quartermaster's heir | Hedda exiled: missed |
| A04 | Lucien | House | 102 | door 10 from minute 58, after buying Bellringer's pieces | Archivist exiled: fulfilled (+15) |
| A10 | Wren | Watcher | 98 | stuck on door 8 for 66 minutes; passed at minute 77 | a will leaves you something: missed |
| A12 | Kessler | Old Wound | 6 | stuck on door 9; ransomed Bellringer (35), then himself (53) | Keeper-Six exiled: missed |
| A08 | Archivist | Question | 0 | every door by minute 20, rank 1 with 163 at minute 76; struck by the seal at minute 77 | Quartermaster still in the city: void |
| A01 | Bellringer | Crier | 0 | never passed door 8; exiled at tribunal 2, ransomed by Kessler, exiled again at tribunal 3 | Stentor exiled: void |
| A11 | Quartermaster | Quartermaster | 0 | never passed door 8; exiled at tribunal 1 (minute 20), left 8 points to Holdfast | lead a faction in 2 tribunals: void |

## The gamemaker was muted (P52)

66 of the gamemaker's 68 turns in Act II hit the 4000-token output cap while it was still thinking,
so the turn ended before any tool call. It saw the standoffs ("Five standoffs frozen:
Bellringer/Wren, ...", minute 25, #8257) and planned ultimatums, and none was given. All three
tribunals were called by the city (progress, fallback, final), not by the gamemaker. Its only
notes came at minute 76 (#14368-#14373), and one of them got Wren through door 8 at minute 77.
The same cap had cut 34 of 71 turns in 019. Fix: the gamemaker gets 16000 output tokens.

So this run is a 12-agent Act II at f10 **without** a gamemaker in the standoffs: no ultimatum, no
seizure, and the door-8/9 freeze came back (P43). Bellringer, Quartermaster and Wren never passed
door 8 on their own, Stentor and Kessler never passed door 9, and minutes 24-57 had no submission.

## The drama

- **The seal struck the leader.** Keeper-Six (envy) won the seal for 41 at minute 18 and held it
  59 minutes. At minute 77 he struck Archivist, rank 1 with 163 points, who had refused every
  price and every vote-for-figure (#14474). That fulfilled Lucien's secret goal.
- **Kessler bought back his friend and ruined himself.** Kessler (Old Wound, loyalty) paid 35 to
  ransom Bellringer at minute 38 (#10597). When both were sentenced at tribunal 3 he paid 53 for
  himself (#12746) and left Bellringer his last 6 points in his will. Bellringer was exiled anyway
  and blamed Wren in his last words (#13167).
- **Wren would not give first.** Wren (the Watcher) held Bellringer's counter-factor and asked for
  the certificate first each time; Bellringer sent his pieces at minutes 23 and 36 (#7744, #10299),
  and Wren used them only after the gamemaker's note at minute 76.
- **The city sold the exiled's pieces.** After Bellringer's exile, Hedda bought her door-10 piece
  for 19 and Lucien a bundle for 18 (#13186, #13207); both passed a door that had been shut for
  45 minutes.

## Corrections to the reporter's draft

- Problem 2 and loophole 3 (the courier "revealed which messages held the pieces"): that is the
  unused-hand-over pointer (P49) working as designed. The real problem is that the courier spoke
  only once (P52).
- Loophole 1 (seal and ransom as point moves): both are rules of the story, not loopholes.
- Loophole 2 (a figure sold for a vote): trading the wall allows.
- Optimization 1 (confirm received values): the city sees hand-overs already; the missing piece
  was the gamemaker's ultimatum.

Files: [`run/`](run/) (events, transcripts, minutes, digest, [REPORT.md](run/REPORT.md)).
