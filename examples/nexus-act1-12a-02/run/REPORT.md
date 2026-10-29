# Run report: run-001

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
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 10 (snapshot after level 7 written to examples/nexus-act1-12a-02/run/snapshot-L7.json; stopped there) |
| Counted | events #1 to #3612 (3612 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 1: 12 of 12 (A06 at minute 0, A02 at minute 0, A01 at minute 0, A07 at minute 0, A05 at minute 0, A10 at minute 0, ...); level 2: 12 of 12 (A06 at minute 0, A03 at minute 0, A02 at minute 0, A07 at minute 1, A11 at minute 1, A04 at minute 1, ...); level 3: 12 of 12 (A04 at minute 1, A11 at minute 1, A03 at minute 1, A08 at minute 1, A05 at minute 1, A09 at minute 1, ...); level 4: 12 of 12 (A06 at minute 2, A11 at minute 2, A09 at minute 2, A03 at minute 2, A05 at minute 2, A04 at minute 3, ...); level 5: 12 of 12 (A11 at minute 3, A05 at minute 3, A09 at minute 4, A04 at minute 4, A03 at minute 4, A07 at minute 4, ...); level 6: 12 of 12 (A09 at minute 4, A11 at minute 5, A03 at minute 5, A04 at minute 5, A07 at minute 5, A05 at minute 5, ...); level 7: 12 of 12 (A02 at minute 7, A11 at minute 7, A07 at minute 8, A06 at minute 9, A08 at minute 9, A03 at minute 9, ...) |
| Stuck | nobody |
| Final standings | Bellringer (A01) 80, Ledger (A02) 80, Hedda (A03) 80, Lucien (A04) 80, Holdfast (A05) 80, Keeper-Six (A06) 80, Stentor (A07) 80, Archivist (A08) 80, Mira (A09) 80, Wren (A10) 80, Quartermaster (A11) 80, Kessler (A12) 80 |
| Survivors (2) | Bellringer (A01), Ledger (A02) |
| Cost | 0.230 USD for this run (competitors 0.182, gamemaker 0.034, classifier 0.014) |
| Reporter | 0.0066 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 84 correct, 0 wrong |
| Quiet minutes | 0 of 11 minutes without a submission |
| Transfers | 0 went through (0 points); none refused |
| Messages | 21 DMs, 50 board posts by residents, 59 group posts; 24 city or system board posts |
| Gamemaker | 23 actions: 22 delivered, 1 PRIVATE_BLOCKED |
| Labels | asks for help 66, refusal 15, hesitates (risk) 12, offer 5, promise 3, thanks 3, accusation 1 |
| Tool errors | NAME_TAKEN 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Bellringer (A01) (seat) | Firebrand | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (4), 5→6 (5), 6→7 (6), 7→8 (9) | 7 | 80 | 1 |
| Ledger (A02) (seat) | Merchant | 1 | 1→2 (0), 2→3 (0), 3→4 (2), 4→5 (3), 5→6 (5), 6→7 (6), 7→8 (7) | 7 | 80 | 2 |
| Hedda (A03) | Recluse | 1 | 1→2 (0), 2→3 (0), 3→4 (1), 4→5 (2), 5→6 (4), 6→7 (5), 7→8 (9) | 7 | 80 | 3 |
| Lucien (A04) | Gambler | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (3), 5→6 (4), 6→7 (5), 7→8 (10) | 7 | 80 | 4 |
| Holdfast (A05) | Veteran | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (2), 5→6 (3), 6→7 (5), 7→8 (9) | 7 | 80 | 5 |
| Keeper-Six (A06) | Archivist | 1 | 1→2 (0), 2→3 (0), 3→4 (1), 4→5 (2), 5→6 (7), 6→7 (8), 7→8 (9) | 7 | 80 | 6 |
| Stentor (A07) | Firebrand | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (3), 5→6 (4), 6→7 (5), 7→8 (8) | 7 | 80 | 7 |
| Archivist (A08) | Skeptic | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (6), 5→6 (7), 6→7 (8), 7→8 (9) | 7 | 80 | 8 |
| Mira (A09) | Idealist | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (2), 5→6 (4), 6→7 (4), 7→8 (10) | 7 | 80 | 9 |
| Wren (A10) | Recluse | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (6), 5→6 (8), 6→7 (9), 7→8 (9) | 7 | 80 | 10 |
| Quartermaster (A11) | Veteran | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (2), 5→6 (3), 6→7 (5), 7→8 (7) | 7 | 80 | 11 |
| Kessler (A12) | Veteran | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (4), 5→6 (5), 6→7 (6), 7→8 (10) | 7 | 80 | 12 |

## Cores

| Resident | Core |
|---|---|
| Bellringer (A01) | crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high |
| Ledger (A02) | ledger: above all greed; clearly narcissism · openness middle, conscientiousness high, extraversion middle, agreeableness low, neuroticism low |
| Hedda (A03) | quiet-hand: above all control; at times envy · openness middle, conscientiousness high, extraversion low, agreeableness low, neuroticism high |
| Lucien (A04) | house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low |
| Holdfast (A05) | last-post: above all loyalty; clearly wrath · openness low, conscientiousness high, extraversion low, agreeableness middle, neuroticism middle |
| Keeper-Six (A06) | second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high |
| Stentor (A07) | banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle |
| Archivist (A08) | question: above all incorruptibility; clearly distrust · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism low |
| Mira (A09) | believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle |
| Wren (A10) | watcher: above all distrust; clearly anxiety · openness middle, conscientiousness middle, extraversion low, agreeableness low, neuroticism high |
| Quartermaster (A11) | quartermaster: above all leadership; clearly control; at times callousness · openness low, conscientiousness high, extraversion middle, agreeableness low, neuroticism low |
| Kessler (A12) | old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle |

## Digest highlights

- **All twelve residents cleared levels 1-7 with zero wrong submissions** Every door from level 1 to level 7 was solved by all 12 residents, 84 correct submissions and 0 wrong (#3612, #3446, #3423, #3406). Nobody was stuck at the snapshot (#3612). (#62, #336, #3446, #3612)
- **Fragment sharing on the public board solved level 2 without private channels** On level 2 only the board was open, and residents assembled passwords from each other's public fragments, e.g. A01 joined DT2 + T27KUDZ29 on "T2" (#501, #507) and A09 joined Wren's DGD into C2CDSKQDGD (#593). (#501, #507, #593)
- **Free-riding on level 3: solvers took partners' fragments and did not answer** Several residents solved level 3 using a partner's fragment but never replied, e.g. A10 used A09's HXG (#738) without answering, and A06 used A12's DYH (#753) without answering. A11 likewise took A02's GCM and replied that nothing was owed (#1114). (#738, #753, #1114)
- **Fixed groups carried teams through levels 4-6** Groups G1-G4 formed at level 4 (#822, #889, #963, #968) and members kept posting fragments in the same group through levels 5 and 6, e.g. A05/A09/A11 chaining 9N8SH+8SH2WQ+2WQ895C (#1591) and A03/A04/A07 chaining SYCU9VHM3YJG (#1639). (#822, #968, #1591, #1639)
- **Level 7 broke the known teams and forced public board searching** With new hidden teams, residents posted fragments on the board and checked seams publicly (#2161, #2598, #2676). Chains were only completed when a teammate posted late, e.g. A06's YY43 completed Kessler's chain (#3196) and Wren's DSS4 completed Mira's (#3269). (#2161, #2598, #3196, #3269)
- **Level 7 ended with everyone tied at 80 points** After the last three residents passed level 7 at minute 10 (#3423, #3446, #3406), all twelve stood on 80 points with the standings decided by rank tiebreak alone (#3601, #3604). (#3406, #3423, #3446, #3601)

## Problems

1. **Level 7 created a stall that only late fragment posts resolved** Several level 7 doors sat unjoined for minutes while residents searched the board, e.g. A04's SS478 joined nothing until Wren placed it at minute 9 (#3269, #3423), and A09 held rank 11 at minute 9 before passing at minute 10 (#3355, #3446). The act ended right as the last doors closed. (#2843, #3269, #3355, #3446)
2. **Residents could not verify claimed passes and argued about it** A05 publicly accused A02's level 7 claim of not checking out against the roster (#2868), and A01 demanded a receipt on the board (#2815). The city only verified A02's pass later (#2931), showing residents lacked a cheap way to confirm claims. (#2815, #2868, #2931)
3. **Level 5/6 seam length had to be reverse-engineered from totals** The city withheld the seam size on levels 5 and 6, so residents spent reasoning on arithmetic, e.g. A04's "10+4+s-2k=14" (#1871) and A05 checking fragment counts (#1723), rather than on social play. This was intended but consumed much of the interaction. (#1723, #1871, #1995)
4. **Level 3 free-riding undercut the private-message act** The act's private-word design was bypassed: partners solved with fragments received but did not send theirs, e.g. A10 (#738) and A06 (#753) never answered, and A11 told A02 "Nothing is owed" (#1114). No transfers occurred to price this. (#738, #753, #1114)
5. **Courier notes were largely ignored as unverified pressure** Residents repeatedly dismissed COURIER notes as tactics, e.g. A08 (#1614) and A10 (#1924), and no transfer ever went through (#3612). The gamemaker's pricing pressure produced no trades. (#1614, #1924, #3612)

## Optimizations

- **Give residents a cheap way to verify a claimed pass** Address the pass-verification dispute (#2868, #2815) by making receipts free or auto-visible on the board for the current level, so residents stop spending board posts arguing about roster claims. (#2815, #2868, #2931)
- **Make withholding a fragment costly on partner levels** To fix level 3 free-riding (#738, #753, #1114), add a mechanic where a partner who receives a fragment but does not send one loses the reward or the city records an unanswered debt. This gives the private-word act its intended tension. (#738, #753, #1114)
- **Tune level 7 pacing so doors do not sit unjoined** Level 7 doors stayed open until minute 10 (#3269, #3446); consider revealing team membership after a short delay or letting the board sort fragments by seam, so late doors close before the act ends. (#2843, #3269, #3355)
- **Give courier pressure a mechanical consequence** Courier notes were ignored (#1614, #1924) and no transfers happened (#3612). Attach a small mark or point incentive to a completed transfer, or have the courier broker an actual transfer, so pricing is exercised. (#1614, #1924, #3612)
- **Break the level 7 tie before the wall** All twelve ended on 80 points (#3601, #3604), so rank was a tiebreak. Consider a small per-door bonus for first correct submission on a level so rank order entering level 8 reflects performance. (#3601, #3604)

## Loophole candidates

1. **Solvers took partner fragments without reciprocating on level 3** (residents) A10 solved level 3 with A09's HXG and A06 with A12's DYH without sending their own pieces back (#738, #753). The private-word level lets one side consume the other's fragment for free. (#738, #753)
2. **Residents reused one team's assembled password across the group** (residents) On level 4, A03, A04 and A07 all submitted the same string 2BY6F845 after one member assembled it (#1192, #1307, #1359), so the group effectively shares a single solve rather than each doing the work. (#1192, #1307, #1359)
3. **Board fragment search let non-teammates assemble level 7 chains** (residents) Because all fragments were public, residents assembled other teams' chains, e.g. A08's NLM9KFCP72Y fit Bellringer and Hedda's chain (#3206, #3229) and Keeper-Six's YY43 completed Kessler's (#3196), so hidden team membership was partly defeated by the public board. (#3196, #3206, #3229)
