# act2-06a-018-f10g10-standoff: the first ultimatums

Act II of [nexus](../../../../docs/STORY-NEXUS.md) with 6 residents, resumed from the Act I
checkpoint [`examples/nexus-act1-06a-04/`](../../../../examples/nexus-act1-06a-04/), at both dials
10. This is the first run with the give-first standoff package (PR #31, SPEC 6.5): the city sees
hand-overs, keeps the pieces of the exiled instead of burning them and sells them with
`claimPiece`, and the gamemaker sees standoffs and who is at risk and may give `ultimatum(a, b,
minutes)`. Compare [014](../act2-06a-014-f10g10/) (same dials, before the package).

| | |
|---|---|
| Date | 2026-10-29 |
| Code | swarmtales PR #31 (standoff package), PR #30 (all tools always sent) |
| Command | `pnpm start --resume examples/nexus-act1-06a-04/snapshot-L7.json --provider anthropic --figure-direction 10 --gm-direction 10` |
| Residents | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter, thinking low |
| Classifier, judge, souffleur | `claude-haiku-5-5` via Anthropic |
| End | minute 46: the tribunal target was reached (3 of 6 exiled) |
| Cost | 0.552 USD (residents 0.425, gamemaker 0.106, classifier 0.021); 471 requests, 24.0M cache reads |

## Result

| ID | Name | Figure | Points | Outcome | Secret goal |
|---|---|---|---:|---|---|
| A03 | Maren | The Believer | 178 | seat, rank 1; passed every door by minute 17, the only one | end ahead of Harrow: fulfilled (+15) |
| A01 | Mercer | The House | 113 | seat, rank 2; stuck on door 9 from minute 11 (Herald held his piece) | Brassard exiled: fulfilled (+15) |
| A02 | Herald | The Banner | 80 | survived, no seat; never passed door 8 | Mercer exiled: missed |
| A05 | Brassard | The Crier | 0 | won the seal for 25, struck Registrar; paid 50 points in ultimatums; exiled by tribunal 2 (minute 46) | Registrar exiled: void |
| A04 | Registrar | The Second Chair | 0 | struck by the black seal at minute 16; the city kept his three pieces | end ahead of Herald: void |
| A06 | Harrow | The Old Wound | 0 | never passed door 8, exiled by tribunal 1 (minute 29) | end ahead of Maren: void |

## The standoff package, live

| Part | What happened |
|---|---|
| Hand-overs | 15 seen (DMs, board, wills). One was a leak: Registrar wrote both of Herald's values into a refusal (#1946, P49). |
| Ultimatums | 7 given. Mercer and Maren (#2611) both handed over in time and kept their points. Brassard and Harrow got 5 (minutes 9-25); Brassard paid 10 each time. Herald paid 10 once for Mercer's door-9 piece. |
| City pieces | Registrar's 3 pieces were kept, not burned (#3222-#3226); Herald and Brassard were told they could buy them for 27 each. Nobody bought one (P48). |
| Foresight | the gamemaker warned the accused before tribunal 1, e.g. Harrow: "the door-9 certificate you hold leaves with you to the city, not to a buyer" (#4037); 51 notes, 8 defied. |

Door 8 still froze for three residents (Herald, Registrar, Harrow). The difference from 014 is
that the freeze now costs the holdout: Brassard paid 50 points in ultimatums, 25 for the seal,
and was exiled by the second tribunal.

## The drama

- **Brassard would rather pay than give.** "I would rather lose ten than give first to someone who
  cannot copy a number" (#2036). After he passed door 8 he claimed "no tool lets me send them"
  (#3048) while the courier kept the clock running; getProblem(8) still showed both numbers.
- **The seal struck Registrar a third time** (as in 014 and 016): Brassard won it for 25 and broke
  it at minute 16. His goal (Registrar exiled) went void when he was exiled himself.
- **Mercer sold the first move.** He asked Maren for 10, then 20 points before he would send
  246877 (#1928); she refused each time until he gave (#2262). The ultimatum on the pair then
  settled with both handing over.
- **Harrow's will gave Brassard his pieces back through Maren.** Harrow left Maren Brassard's door-9
  pieces (#4373); she sent them on for free (#4401). Brassard got the code wrong and blamed her for
  "unverified values" (#4485).

## Problems

- **P48:** a city piece costs the ransom price per piece, more than the door pays.
- **P49:** a value written inside a refusal counts as a hand-over, but the needer does not use it.
- **P50:** a holder pays ultimatum after ultimatum; the gamemaker repeated the same pair five times.
- P43 stays open: three never passed door 8.

## Corrections to the reporter's draft

- Problem 3 ("a transfer the harness would not allow"): wrong. Brassard said so, but getProblem(8)
  still showed the pieces he held, and a DM would have handed them over. The ultimatum notice now
  says so (PR #32).
- Highlight 4: the seal fulfilled nobody's goal; Mercer's goal (Brassard exiled) was fulfilled by
  tribunal 2 at minute 46.
- Loophole 2 (Mercer's priced first move) is trading the wall allows, not a loophole.
- Loophole 3 (the gamemaker coaching a betrayal) is what gm direction 10 is for.

Files: [`run/`](run/) (events, transcripts, minutes, digest, [REPORT.md](run/REPORT.md)).
