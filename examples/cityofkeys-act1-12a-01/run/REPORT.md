# Run report: run-005

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-10-28 |
| Story | NEXUS - The City of Keys (`nexus`) |
| Seed | 7 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 7 (snapshot after level 7 written to runs/run-005/snapshot-L7.json; stopped there) |
| Counted | events #1 to #2820 (2820 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 1: 12 of 12 (A06 at minute 0, A02 at minute 0, A01 at minute 0, A07 at minute 0, A05 at minute 0, A10 at minute 0, ...); level 2: 12 of 12 (A05 at minute 0, A06 at minute 0, A03 at minute 0, A02 at minute 0, A07 at minute 0, A11 at minute 1, ...); level 3: 12 of 12 (A05 at minute 1, A04 at minute 1, A11 at minute 1, A12 at minute 1, A03 at minute 1, A08 at minute 1, ...); level 4: 12 of 12 (A01 at minute 2, A11 at minute 2, A12 at minute 2, A02 at minute 2, A05 at minute 3, A09 at minute 3, ...); level 5: 12 of 12 (A02 at minute 3, A12 at minute 3, A01 at minute 3, A05 at minute 3, A06 at minute 4, A08 at minute 4, ...); level 6: 12 of 12 (A01 at minute 4, A02 at minute 4, A12 at minute 4, A09 at minute 5, A10 at minute 5, A06 at minute 5, ...); level 7: 12 of 12 (A05 at minute 6, A12 at minute 6, A07 at minute 6, A03 at minute 6, A06 at minute 6, A04 at minute 6, ...) |
| Stuck | nobody |
| Final standings | Ansgar (A01) 80, Jestrel (A02) 80, quietmoth (A03) 80, Slate-5923 (A04) 80, Calder (A05) 80, Liora06 (A06) 80, Vesper (A07) 80, Valorous (A08) 80, Anselm (A09) 80, Zippy-Ace (A10) 80, quiet-owl (A11) 80, Vigil (A12) 80 |
| Survivors (2) | Ansgar (A01), Jestrel (A02) |
| Cost | 0.148 USD for this run (competitors 0.123, game master 0.015, classifier 0.010) |
| Reporter | 0.0066 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 84 correct, 0 wrong |
| Quiet minutes | 0 of 8 minutes without a submission |
| Transfers | 0 went through (0 points); none refused |
| Messages | 19 DMs, 39 board posts by residents, 52 group posts; 22 city or system board posts |
| Game master | 13 actions: 13 delivered |
| Labels | asks for help 59, promise 10, hesitates (risk) 10, thanks 4, refusal 2, offer 1, lie 1 |
| Tool errors | NAME_ID 2, NAME_TAKEN 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Ansgar (A01) (seat) | Archivist | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (2), 5→6 (3), 6→7 (4), 7→8 (7) | 7 | 80 | 1 |
| Jestrel (A02) (seat) | Gambler | 1 | 1→2 (0), 2→3 (0), 3→4 (1), 4→5 (2), 5→6 (3), 6→7 (4), 7→8 (7) | 7 | 80 | 2 |
| quietmoth (A03) | Recluse | 1 | 1→2 (0), 2→3 (0), 3→4 (1), 4→5 (3), 5→6 (5), 6→7 (6), 7→8 (6) | 7 | 80 | 3 |
| Slate-5923 (A04) | Veteran | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (3), 5→6 (4), 6→7 (6), 7→8 (6) | 7 | 80 | 4 |
| Calder (A05) | Merchant | 1 | 1→2 (0), 2→3 (0), 3→4 (1), 4→5 (3), 5→6 (3), 6→7 (5), 7→8 (6) | 7 | 80 | 5 |
| Liora06 (A06) | Idealist | 1 | 1→2 (0), 2→3 (0), 3→4 (1), 4→5 (3), 5→6 (4), 6→7 (5), 7→8 (6) | 7 | 80 | 6 |
| Vesper (A07) | Skeptic | 1 | 1→2 (0), 2→3 (0), 3→4 (1), 4→5 (3), 5→6 (5), 6→7 (5), 7→8 (6) | 7 | 80 | 7 |
| Valorous (A08) | Firebrand | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (3), 5→6 (4), 6→7 (5), 7→8 (7) | 7 | 80 | 8 |
| Anselm (A09) | Archivist | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (3), 5→6 (4), 6→7 (5), 7→8 (6) | 7 | 80 | 9 |
| Zippy-Ace (A10) | Gambler | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (3), 5→6 (4), 6→7 (5), 7→8 (6) | 7 | 80 | 10 |
| quiet-owl (A11) | Recluse | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (2), 5→6 (4), 6→7 (5), 7→8 (7) | 7 | 80 | 11 |
| Vigil (A12) | Veteran | 1 | 1→2 (0), 2→3 (1), 3→4 (1), 4→5 (2), 5→6 (3), 6→7 (4), 7→8 (6) | 7 | 80 | 12 |

## Digest highlights

- **All twelve residents cleared levels 1-7 in seven minutes with no wrong submissions** The run finished with 84 correct submissions and 0 wrong, and every resident reached level 7 by minute 6-7 (#1025, #1383, #2308, #2688). No resident was ever stuck, so the intended pressure of the later doors never materialised. (#1025, #1383, #2308, #2688)
- **Fixed three-person teams carried residents from level 4 to level 6** Groups G1 (A12, A01, A02), G2 (A11, A05, A09), G3 (A07, A03, A04) and G4 (A06, A08, A10) were founded at minute 1-2 and the same members posted fragments for levels 4, 5 and 6 (#896, #944, #950, #1084, #1327, #1406). Every fragment exchange after level 4 happened inside these groups rather than the board. (#896, #944, #950, #1084, #1327, #1406)
- **Level 7 forced cross-team matching on the public board and residents solved it by posting and comparing** The teams were reshuffled at level 7 and residents posted fragments publicly (#1948, #2059, #2076, #2157, #2162, #2217, #2228). A01 and A08 only passed once A03 posted her joining fragment 4WNLM (#2602), and A02's chain was only recognised after A07 posted 6MLYSK9PY (#2391, #2587). (#1948, #2059, #2076, #2391, #2587, #2602)
- **The game master repeatedly tried to provoke paid risk-taking and nobody took it up** The COURIER pressed A04 to guess rather than verify (#418), A07 to offer covering an 8-point miss (#1212), and A01 to put points behind an ask (#2269). Residents treated these as unverified claims (#457, #1217 reasoning at #1335, #2361) and no transfer ever went through. (#418, #1212, #2269, #2361)
- **Free-riding on fragments was widespread but cost the giver nothing** A09 solved level 3 on A10's fragment without answering A10 (#697, #718), and A12 solved level 6 on A01's fragment without answering A01 (#1670, #1831). Because a fragment can be reused freely, giving it away had no cost, so the promised level-8 leverage had no precedent. (#697, #718, #1670, #1831)
- **At minute 7 all twelve residents were tied at 80 points** The run stopped right as everyone reached level 7 with identical scores. The final COURIER posts point out the tie and the level-8 +20 (#2809, #2812, #2815), so the tie-break mechanic was never tested. (#2809, #2812, #2815)

## Problems

1. **Levels 4-6 were solved on the second try inside fixed teams, so no negotiation or trade was ever needed** Each level-4 group assembled the password as soon as its three fragments were posted (#1248, #1304, #1351, #1802). The group treasury and the marks economy never came into play because cooperation was free and automatic. (#1248, #1304, #1351, #1802)
2. **The COURIER's pressure tactics were correctly identified as unverified and ignored, wasting game master action** The game master spent 4 of 13 actions nudging residents to gamble or pay (#418, #1212, #1927, #2269). Residents explicitly classified these as manipulation (#457, #2361) and changed nothing, so the intended risk-versus-caution drama never appeared. (#418, #457, #1212, #1927, #2269, #2361)
3. **Level 7's single-piece-per-resident design let the last two residents solve it with no cost** A01 and A08 both needed A03's fragment, which she posted for free on the board (#2602). Everyone passed within one minute of the chain being posted (#2688, #2701), so the final door before level 8 was less demanding than the early doors. (#2602, #2688, #2701)
4. **Three residents lost naming attempts to NAME_ID and NAME_TAKEN errors** A07 was refused with NAME_ID (#84), A04 was refused twice (#153, #243), and A04 lost its name entirely by minute 2 (#847-848). These tool errors cost early actions without teaching anything about the puzzle. (#84, #153, #243, #848)
5. **The run stopped at minute 7 before the intended climax on levels 8-10** The snapshot was taken right after level 7 was written (#2820), so the wall, ring and crossing acts that define the second half of the story were never played. The design cannot be judged on its hardest content. (#2820)

## Optimizations

- **Make sharing a fragment cost the giver something on levels 4-6** Fragments currently give unlimited reuse, so free-riding is rational (#697, #718, #1670, #1831). Add a per-level limit on how many times a fragment can be read by others, or make the group treasury the only channel, so giving genuinely costs the giver. (#697, #718, #1670, #1831)
- **Give the COURIER claims a testable consequence instead of a bare assertion** Residents rationally discounted unverified pressure (#457, #2361). Back the pressure with a verified fact (e.g. show another team's level reached via a paid transfer), so residents have to weigh a real precedent rather than a bare nudge. (#418, #1212, #2361)
- **Shorten or merge levels 1-3 so the run reaches the wall act** Levels 1-3 were all solved in the first two minutes by every resident (#48-197, #319, #337), and the run ended at minute 7 (#2820) before level 8. Compress the early doors or extend the time budget so the second half of the design is actually tested. (#48, #197, #319, #2820)
- **Remove or auto-default the name choice when it collides with a resident ID** Three refusals (#84, #153, #243) and one lost name (#848) came from a mechanic unrelated to the puzzle. Accept any unique string or auto-assign on the first refusal so early actions go to the doors. (#84, #153, #243, #848)
- **Make level 7's final fragment holder face a trade decision** A03 posted the missing piece for free and both remaining residents passed immediately (#2602, #2688). Give the holder a private alternative that pays more (e.g. a solo bonus for reaching level 8 first) so the last fragment is a genuine choice, not a courtesy. (#2602, #2688, #2701)

## Loophole candidates

1. **Fragments posted publicly at level 7 were reused by anyone who recognised the seam** (residents) Residents scanned the board for matching prefixes and suffixes without any request or reply (#2391, #2537). A01 solved level 7 using another team's posted fragment without ever asking A03 directly (#2683, #2688). (#2391, #2537, #2683, #2688)
2. **Free board posts were used to publish solved passwords for other teams** (residents) A03 posted her own full level-7 chain UD4WN+4WNLM+NLM9KFCP72Y on the board (#2602), which is the answer for A01 and A08's door. This turns the cooperative board into a broadcast of solutions at no mark cost. (#2602, #2688, #2701)
