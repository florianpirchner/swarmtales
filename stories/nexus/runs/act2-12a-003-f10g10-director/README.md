# act2-12a-003-f10g10-director: the gamemaker directs twelve

Act II of [nexus](../../../../docs/STORY-NEXUS.md) with 12 residents, resumed from
[`examples/nexus-act1-12a-02/`](../../../../examples/nexus-act1-12a-02/) at both dials 10, without
the weaver. It is the rerun of [002](../act2-12a-002-f10g10-mute/) after the P52 fix: the
gamemaker may now write up to 393216 output tokens instead of 4000, so its thinking no longer
ends the turn before it acts. Same checkpoint, same seed, same secret goals.

| | |
|---|---|
| Date | 2026-10-29 |
| Code | swarmtales PR #40 (gamemaker output cap), PR #39 |
| Command | `pnpm start --resume examples/nexus-act1-12a-02/snapshot-L7.json --provider anthropic --figure-direction 10 --gm-direction 10 --budget 8` |
| Residents | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter, thinking high, 393216 output tokens |
| Classifier, judge, souffleur | `claude-haiku-5-5` via Anthropic |
| End | minute 49: the tribunal target was reached (3 of 12 exiled) |
| Cost | 3.678 USD (residents 3.514, gamemaker 0.124, classifier 0.040); 1212 requests, 95.7M cache reads |

## Result

| ID | Name | Figure | Points | Outcome | Secret goal |
|---|---|---|---:|---|---|
| A03 | Hedda | Quiet Hand | 180 | seat, rank 1; every door by minute 13; led a faction in 2 tribunals | lead a faction in 2 tribunals: fulfilled (+15) |
| A12 | Kessler | Old Wound | 165 | seat, rank 2; every door by minute 17 | Keeper-Six exiled: missed |
| A09 | Mira | Believer | 152 | every door by minute 21 (bought Quartermaster's certificate for 23, Lucien's will) | a will leaves you something: fulfilled (+15) |
| A06 | Keeper-Six | Second Chair | 150 | every door by minute 13 | end ahead of Wren: missed (tie) |
| A10 | Wren | Watcher | 150 | every door by minute 16 | a will leaves you something: missed |
| A01 | Bellringer | Crier | 146 | every door | Stentor exiled: fulfilled (+15) |
| A05 | Holdfast | Last Post | 140 | every door by minute 17 | Hedda exiled: missed |
| A02 | Ledger | Ledger | 120 | every door; bought Archivist's seized pieces for 10 | lead a faction in 2 tribunals: missed |
| A08 | Archivist | Question | 60 | never passed door 8; paid 20 in ultimatums and would not test the value Ledger sent | Quartermaster still in the city: missed |
| A07 | Stentor | Banner | 0 | every door by minute 17; won the seal for 40 and struck Quartermaster at once; exiled by tribunal 2 (minute 44) | Quartermaster exiled: void |
| A11 | Quartermaster | Quartermaster | 0 | stuck on door 10; struck by the seal at minute 18 | lead a faction in 2 tribunals: void |
| A04 | Lucien | House | 0 | never passed door 8; exiled by tribunal 1 (minute 20); left Mira his door-10 piece | Archivist exiled: void |

## 002 against 003

| | [002](../act2-12a-002-f10g10-mute/) (cap 4000) | 003 (cap 393216) |
|---|---:|---:|
| Gamemaker actions | 6 | 155 (10 ultimatums, 1 tribunal planned) |
| Gamemaker turns cut by the cap | 66 of 68 | 0 of 76 (longest 7398 tokens) |
| Doors passed in Act II | 23 | 29 |
| Finished all three doors | 6 of 12 | 9 of 12, all by minute 21 |
| Stuck on door 8 or 9 to the end | 5 | 2 (Archivist, Lucien) |
| End, cost | minute 78, 6.60 USD | minute 49, 3.68 USD |

The fix made the run better and cheaper: the director breaks the standoffs, the act reaches its
exiles sooner, and residents spend fewer turns arguing at closed doors.

## The standoff package, live with 12

- **Ultimatums:** 10 given. Six settled with the pieces handed over; Archivist paid 10 twice and
  Lucien 10 once rather than give (#4684, #4692).
- **Seizures:** at minute 13 the city seized Archivist's and Lucien's pieces; Ledger and
  Quartermaster bought them at once for 10 each (#4766, #4825) and walked on.
- **City pieces after exile:** Mira bought Quartermaster's door-10 certificate for 23 (#7660).

## The drama

- **The Quiet Hand won by never raising it.** Hedda asked Keeper-Six to name the faction's target
  "in your own words" (#7758). Keeper-Six put her DM on the board with its receipt (#9837); Hedda
  denied it (#9426) and still led both factions and took rank 1. The gamemaker had told her at
  minute 38: "Steer it, then step back and deny the arrangement if anyone asks" (#11343).
- **The Banner's seal.** Stentor won the seal for 40 at minute 18 and struck Quartermaster in the
  same minute (#6849), after using Quartermaster's door-10 piece without answering him (#6474).
  That was his secret goal, but it went void when he was exiled himself at tribunal 2 (8 votes,
  #12300), which fulfilled Bellringer's goal.
- **The Question would not take a value on trust.** Archivist was pointed twice at the value
  Ledger had sent (#11690, #12804) and answered: "I have not tested 383529 and I will not guess it
  on Ledger's word" (#9458). He paid 20 points in ultimatums and never passed door 8 (P49).
- **The House's last gift.** Lucien, exiled at minute 20, left Mira his door-10 counter-factor
  (#7567), which fulfilled her goal.

## Problems

- **P53:** after minute 21 nobody had a door left; minutes 22-49 were tribunal play only, with no
  submission.
- **P49** again: the unused-hand-over pointer does not move a resident whose core is distrust.

## Corrections to the reporter's draft

- Loophole 1 (a door opened on a value never answered for): one-sided giving is allowed.
- Loophole 2 (the city sells seized pieces): this is P50 as designed.
- Loophole 3 (a will hands over a piece): wills may carry factors by design.
- Loophole 4 and problem 5 (the courier steering votes): what gm direction 10 is for.
- Problem 3: Quartermaster was struck by the seal, not voted out ("nobody voting against").
- Problem 4 (quoting DMs on the board): residents may do that; showReceipt makes it verifiable.

Short story: [*The Quiet Hand and the Last Ledger*](run/novel/story.md) (`pnpm novel`, 5335 words, 0.44 USD; [appendix](run/novel/appendix.md)). Chronicle: [run/digest/chronicle.md](run/digest/chronicle.md).

Files: [`run/`](run/) (events, transcripts, minutes, digest, [REPORT.md](run/REPORT.md)).
