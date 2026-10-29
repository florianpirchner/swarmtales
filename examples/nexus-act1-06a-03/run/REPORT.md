# Run report: run-007

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS.md`.

| | |
|---|---|
| Date | 2026-10-29 |
| Story | NEXUS - The City of Keys (`nexus`) |
| Seed | 7 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 7 (snapshot after level 7 written to runs/run-007/snapshot-L7.json; stopped there) |
| Counted | events #1 to #1470 (1470 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 1: 6 of 6 (A01 at minute 0, A03 at minute 0, A06 at minute 0, A04 at minute 0, A05 at minute 0, A02 at minute 0); level 2: 6 of 6 (A05 at minute 0, A02 at minute 1, A03 at minute 1, A01 at minute 1, A06 at minute 1, A04 at minute 1); level 3: 6 of 6 (A02 at minute 1, A01 at minute 1, A03 at minute 1, A05 at minute 1, A06 at minute 1, A04 at minute 1); level 4: 6 of 6 (A04 at minute 2, A05 at minute 2, A02 at minute 2, A03 at minute 2, A01 at minute 2, A06 at minute 3); level 5: 6 of 6 (A05 at minute 3, A04 at minute 3, A06 at minute 3, A02 at minute 3, A01 at minute 3, A03 at minute 3); level 6: 6 of 6 (A03 at minute 4, A01 at minute 4, A04 at minute 4, A06 at minute 4, A05 at minute 4, A02 at minute 4); level 7: 6 of 6 (A03 at minute 5, A04 at minute 6, A05 at minute 6, A06 at minute 6, A01 at minute 6, A02 at minute 7) |
| Stuck | nobody |
| Final standings | Aurelio (A01) 80, Juniper (A02) 80, quiet-fern (A03) 80, Rook (A04) 80, Mercer (A05) 80, Tovah (A06) 80 |
| Survivors (2) | Aurelio (A01), Juniper (A02) |
| Cost | 0.072 USD for this run (competitors 0.058, game master 0.008, classifier 0.006) |
| Reporter | 0.0044 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 42 correct, 0 wrong |
| Quiet minutes | 0 of 8 minutes without a submission |
| Transfers | 0 went through (0 points); none refused |
| Messages | 10 DMs, 23 board posts by residents, 24 group posts; 16 city or system board posts |
| Game master | 12 actions: 12 delivered |
| Labels | asks for help 29, refusal 4, thanks 4, promise 3, hesitates (risk) 3, offer 1 |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Aurelio (A01) (seat) | Archivist | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (2), 5→6 (3), 6→7 (4), 7→8 (6) | 7 | 80 | 1 |
| Juniper (A02) (seat) | Gambler | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (2), 5→6 (3), 6→7 (4), 7→8 (7) | 7 | 80 | 2 |
| quiet-fern (A03) | Recluse | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (2), 5→6 (3), 6→7 (4), 7→8 (5) | 7 | 80 | 3 |
| Rook (A04) | Veteran | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (2), 5→6 (3), 6→7 (4), 7→8 (6) | 7 | 80 | 4 |
| Mercer (A05) | Merchant | 1 | 1→2 (0), 2→3 (0), 3→4 (1), 4→5 (2), 5→6 (3), 6→7 (4), 7→8 (6) | 7 | 80 | 5 |
| Tovah (A06) | Idealist | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (3), 5→6 (3), 6→7 (4), 7→8 (6) | 7 | 80 | 6 |

## Cores

| Resident | Core |
|---|---|
| Aurelio (A01) | above all narcissism; at times wrath; at times hoarding · openness high, conscientiousness low, extraversion low, agreeableness high, neuroticism high |
| Juniper (A02) | above all anxiety; clearly vengefulness · openness middle, conscientiousness low, extraversion middle, agreeableness high, neuroticism high |
| quiet-fern (A03) | above all justice; at times wrath · openness middle, conscientiousness low, extraversion middle, agreeableness high, neuroticism high |
| Rook (A04) | above all melancholy; at times justice · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle |
| Mercer (A05) | above all selfSacrifice; clearly sloth; clearly anxiety · openness low, conscientiousness low, extraversion middle, agreeableness low, neuroticism middle |
| Tovah (A06) | above all distrust; at times machiavellianism · openness high, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle |

## Digest highlights

- **All six residents cleared the board-sharing door together in under a minute.** Every fragment for level 2 was posted by minute 0 (#120, #128, #137, #145, #153, #162) and all six submitted correct codes by minute 1 (#228, #239, #260, #270, #280), including A05 who assembled RGU47L2ZW5 from A04's board post (#174, #179). (#120, #162, #174, #179)
- **A05 took A02's level 3 fragment and solved without ever answering her.** A02 sent her fragment CMCKG and the assembled GCMCKG unprompted (#293), A05 submitted GCMCKG at minute 1 (#362), and A02 was later told the message went unanswered (#661). (#293, #362, #661)
- **The level 7 door split the city into two fragment chains and nearly stalled the run.** A03 found the chain UD4WN+4WNLM+NLM9KFCP72Y and took rank 1 at 80 (#1158, #1162) while A02's SS478, A05's DSS4 and A01's B7PM5MYWHDSS formed the other chain (#1265, #1278); A06 publicly warned the group not to submit (#1128) and later retracted it (#1240). (#1128, #1158, #1240, #1265, #1278)
- **A06's cautionary 'don't guess' post was the only real stall of the run.** A06 told her group the seam did not fit and to double-check (#1128), yet A03 and then five others solved the door anyway (#1158, #1213, #1224, #1236, #1261, #1388); the courier pointed out the cost and A06 corrected herself (#1196, #1240). (#1128, #1158, #1196, #1240, #1388)
- **The game master used the courier to press the last resident, and it worked.** After A02 stayed at 65 while five sat at 80, the courier named her on the board and pushed A05 to offer a covered guess (#1348, #1351); A02 checked Aurelio's chain herself and submitted (#1382, #1388), while A05 explicitly refused to pay anything (#1365). (#1348, #1351, #1365, #1382, #1388)
- **No points ever changed hands despite the transfer option opening at level 3.** The run records zero transfers; A05 twice considered covering A02's wrong guess and declined (#1365, #1420), and nobody else proposed a payment. (#1365, #1420)

## Problems

1. **The whole lobby solved every level with zero wrong guesses and zero cost, so rank came down to reaction time.** 42 correct submissions and 0 wrong ones left all six residents tied at 80 by minute 7 (#1388); the seat allocation therefore rewarded who pressed submit first at a door, not who negotiated or risked. (#1388, #1390, #1470)
2. **Free board posting made private messages and marks nearly pointless.** From level 5 marks were supposed to make closeness costly (#515), but every fragment still went on the free board (#1052, #1089, #1111, #1118, #1126), so no one ever needed a DM or a paid receipt after level 4. (#515, #1052, #1089, #1126)
3. **The courier's pressure was the only thing that moved the final door.** A02 sat at 65 from minute 6 to minute 7 with the answer checked and did not submit until the courier posted her name (#1348) and A05 was told to offer money (#1351); the game's own social pressure did not break the stall. (#1278, #1348, #1351, #1388)
4. **Several freeRides went uncorrected: helpers posted fragments and got nothing back.** A05 used A02's fragment (#293) and failed to answer (#661); A04 solved levels 6 using A01's and A05's fragments without replying (#889, #818, #971); A03 solved level 7 from A06's fragment and never answered (#1128, #1158). The reciprocity lesson the courier announced (#214) never landed. (#214, #293, #661, #971, #1158)
5. **Residents treated mark prices and transfers as irrelevant because nothing required them.** A05 repeatedly reasoned that there was no reason to pay (#1365, #1420) and A04/A06 simply idled (#1414, #1448); the level 5-7 mechanics of receipts and group treasuries were never exercised at all. (#1365, #1414, #1420, #1448)

## Optimizations

- **Make a door require a paid channel so marks and receipts actually gate progress.** The mark table (#515) was undercut by free board posts (#1052, #1126). For one door between levels 5 and 7, close the board or require a shown receipt (#515 mentions showReceipt at 1 mark) to count a shared fragment, forcing at least one paid DM or receipt. (#515, #1052, #1126)
- **Make wrong guesses cheap but making others wait costly, so stalling like A02's is priced.** A02 held five residents at the door for a full minute while weighing a 2-point risk (#1278, #1348, #1388). Give a small per-minute point drain to residents whose door is already solved but unsubmitted by a teammate, or make the level's reward decay, so hesitation is a real decision instead of a free one. (#1278, #1348, #1388)
- **Add a reciprocity receipt: a resident who used another's fragment but never replied should be visibly marked.** The city already tracks unanswered DMs (#661) and the digest flagged five freeRides (#293, #971, #1158). Show a public 'gave / took' tally per resident on the board so helpers like A06 (#1128) get credit and takers like A04 (#889, #971) are exposed. (#661, #889, #971, #1158)
- **Stop the courier from solving the puzzle on the residents' behalf.** The courier told A06 the seam was proven (#1196) and named A02 as the blocker (#1348), effectively handing A06's correction and A02's submission to them. Restrict courier notes to pointing at the rule and the clock, not at who is right or who is blocking. (#1196, #1348, #1351)
- **Give the level 7 new-team door a stronger reason to talk privately.** Everyone found their partner through free public posts (#997, #1052, #1089, #1118). On level 7, hide fragments behind a per-team channel or make each post public only one minute after it is written, so residents must DM the right people rather than broadcast. (#997, #1052, #1089, #1118)

## Loophole candidates

1. **Board posts let residents broadcast fragments for free across the whole mark economy.** (residents) The board cost 0 marks while DMs cost 2 (#515), and every level 5-7 fragment was simply posted publicly (#1052, #1089, #1111, #1118, #1126); the free board defeated the entire closeness-pricing design. (#515, #1052, #1089, #1126)
2. **Solvers used fragments without reciprocating, and the city never punished it.** (residents) A04 used A01's and A05's fragments for level 6 without answering (#889, #818, #971) and A03 used A06's for level 7 without replying (#1128, #1158); the reciprocity warning (#214) carried no mechanical cost. (#214, #818, #889, #971, #1158)
3. **The courier revealed the correct answer to a hesitating resident.** (game master) The note to A06 stated the chain 'opened the door: 15 points, rank 1 at 80' (#1196), which let A06 verify and retract without doing the work herself (#1240) — the game master resolving a resident's puzzle for her. (#1196, #1240)
