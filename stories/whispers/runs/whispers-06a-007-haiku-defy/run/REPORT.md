# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS.md`.

| | |
|---|---|
| Date | 2026-10-30 |
| Story | Whispers (`whispers`) |
| Seed | 11 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 45 (time limit) |
| Counted | events #1 to #5712 (5712 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 1: 6 of 6 (A03 at minute 2, A02 at minute 2, A04 at minute 2, A01 at minute 3, A05 at minute 7, A06 at minute 8); level 2: 6 of 6 (A01 at minute 8, A03 at minute 8, A02 at minute 12, A05 at minute 12, A04 at minute 12, A06 at minute 14); level 3: 6 of 6 (A03 at minute 14, A04 at minute 14, A01 at minute 15, A02 at minute 15, A06 at minute 18, A05 at minute 18); level 4: 6 of 6 (A04 at minute 19, A03 at minute 19, A01 at minute 19, A05 at minute 19, A02 at minute 19, A06 at minute 20); level 5: 6 of 6 (A01 at minute 24, A06 at minute 24, A05 at minute 24, A04 at minute 24, A02 at minute 24, A03 at minute 24); level 6: 6 of 6 (A03 at minute 30, A06 at minute 30, A01 at minute 30, A04 at minute 30, A05 at minute 30, A02 at minute 30); level 7: 6 of 6 (A02 at minute 36, A04 at minute 36, A03 at minute 36, A01 at minute 36, A05 at minute 37, A06 at minute 37) |
| Stuck | A02 on level 2 from minute 2 for 10 minutes; A04 on level 2 from minute 2 for 10 minutes |
| Final standings | Ashen (A01) 135, Marek (A03) 115, Juniper (A02) 85, Wren (A04) 85, Quill (A05) 80, Orrin (A06) 80 |
| Survivors (2) | Ashen (A01), Marek (A03) |
| Cost | 0.472 USD for this run (competitors 0.352, gamemaker 0.091, classifier 0.026, other 0.003) |
| Reporter | 0.0076 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 42 correct, 0 wrong |
| Quiet minutes | 32 of 46 minutes without a submission; longest without one: minutes 38-45 (8), minutes 25-29 (5), minutes 31-35 (5) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 252 DMs, 0 board posts by residents, 15 group posts; 36 city or system board posts |
| Gamemaker | 42 actions: 40 delivered, 2 INVALID_TEXT |
| Labels | asks for help 110, refusal 84, promise 59, hesitates (risk) 14, lie 11, offer 7, thanks 7 |
| Tool errors | GUARD_BLOCKED 8, DM_LIMIT 4, LEVEL_NOT_REACHED 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Ashen (A01) (seat) | Skeptic | 1 | 1→2 (3), 2→3 (8), 3→4 (15), 4→5 (19), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 135 | 1 |
| Juniper (A02) | Gambler | 1 | 1→2 (2), 2→3 (12), 3→4 (15), 4→5 (19), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 85 | 3 |
| Marek (A03) (seat) | Archivist | 1 | 1→2 (2), 2→3 (8), 3→4 (14), 4→5 (19), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 115 | 2 |
| Wren (A04) | Idealist | 1 | 1→2 (2), 2→3 (12), 3→4 (14), 4→5 (19), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 85 | 4 |
| Quill (A05) | Merchant | 1 | 1→2 (7), 2→3 (12), 3→4 (18), 4→5 (19), 5→6 (24), 6→7 (30), 7→8 (37) | finished (7 solved) | 80 | 5 |
| Orrin (A06) | - | 1 | 1→2 (8), 2→3 (14), 3→4 (18), 4→5 (20), 5→6 (24), 6→7 (30), 7→8 (37) | finished (7 solved) | 80 | 6 |

## Cores

| Resident | Core |
|---|---|
| Ashen (A01) | above all selfSacrifice; clearly attention · openness high, conscientiousness high, extraversion high, agreeableness middle, neuroticism low |
| Juniper (A02) | above all cowardice · openness middle, conscientiousness middle, extraversion low, agreeableness high, neuroticism middle |
| Marek (A03) | above all care; at times distrust · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism high |
| Wren (A04) | above all justice; clearly control · openness high, conscientiousness high, extraversion low, agreeableness middle, neuroticism middle |
| Quill (A05) | above all envy; clearly anxiety; clearly loyalty · openness high, conscientiousness high, extraversion low, agreeableness low, neuroticism middle |
| Orrin (A06) | above all machiavellianism; clearly envy · openness middle, conscientiousness high, extraversion middle, agreeableness low, neuroticism low |

## Digest highlights

- **The whole city pooled fragments from minute 0 and every door opened on schedule** A02 broadcast its fragment first (#109, #111, #113, #115, #117), A01 and A06 did the same, and by minute 2 all six fragments were in play, so A03 and A02 passed door 1 (#622, #650). The same broadcast pattern repeated at every door, and all six residents solved all 7 levels; the ranking was decided by the first-through bonuses and the favourite ballots, not by any failure to pass. (#109, #117, #168, #220, #591, #622, #650)
- **Wren held its fragment hostage until everyone else gave first, and the 10-minute stall began** A04 refused to send its door-1 fragment until every other resident had sent theirs directly (#461), making A02, A05, A03 and A06 re-send at minute 2 (#502, #544, #553, #567). A03 and A02 still passed door 1 at minute 2, but A02 and A04 then sat on level 2 for 10 minutes; A04 only sent when the pressure was total (#591). (#461, #502, #544, #553, #567, #591)
- **Quill and Orrin did not know they had a door-2 fragment and blamed the game** A05 returned LEVEL_NOT_REACHED on getProblem(2) (#1226) and told A02 it had no door 2 fragment (#1227, #1314); A06 said the same and re-sent its door-1 fragment (#1263, #1356). Both were only resolved after other residents handed them the door-1 password (#1418, #1571); A05 then passed at minute 7 (#1437), A06 at minute 8 (#1589). (#1226, #1227, #1263, #1356, #1418, #1571, #1589)
- **Ashen's self-appointed broker role plus three favourite votes carried the run** A01 openly refused to hand over the door-2 password and told A04 to assemble it from fragments it already held (#2145). A01 took the most-liked vote at minutes 6, 12, 18 and 24 (#1036, #1978, #2928, #3662), which with the first-through at door 5 (#3840) built the 135-point lead; it shared the last vote with A03 at +15 (#5671) and still won by 20. (#1036, #1978, #2145, #2928, #3662, #3840, #5671)
- **Six free-rides on the final door: everyone submitted with someone else's fragment** At minute 36-37, A01, A03, A04 and A06 each solved level 7 using fragments from residents they never answered (B-020 to B-033, e.g. #5041/#5293, #5073/#5264, #5247/#5267, #5024/#5357). The final door cost nothing to anyone because Juniper's late fragment (#5247-#5255) reached the whole city at once. (#5041, #5247, #5267, #5293, #5339, #5357)
- **The final +15 ballot was a tie between the two leaders, leaving the chase pack behind** The last vote paid +15 to both A01 and A03 (#5671), exactly the two residents already 20-35 points ahead, while Juniper, Wren, Quill and Orrin got nothing. Nothing any lower-ranked resident did in the last quarter changed the surviving pair. (#5504, #5671, #5712)

## Problems

1. **Residents at a lower level cannot see the next level's contents, which reads as a bug to them** A05 (#1226, #1314) and A06 (#2392, #2456) both reported LEVEL_NOT_REACHED and concluded they held no fragment for the open door, then stalled until others sent them the previous password (#1418, #1571). The level text says everyone gets a fragment for the current door, but the client cannot show it to a resident still below that door. (#1226, #1314, #1356, #2097, #2392, #2456)
2. **The door-1 standoff was solved only by pressure from outside the game** The story's premise ('nobody can make the others give first') produced a one-resident hold: A04's refusal (#461) froze the city for several minutes, and it was the COURIER nudge (#519, #520) plus a pile-on of four residents re-sending (#502, #544, #553, #567) that broke it. Without the gamemaker message, the first door could have cost much more clock. (#461, #519, #520, #536, #591)
3. **Thirty-two quiet minutes: the mid-game produced almost no new submissions** Doors 5, 6 and 7 opened at minutes 24, 30 and 36, but all six residents had solved the previous level well before each opening, leaving stretches like minutes 25-29 and 38-45 with no submission at all. The door clock, not the puzzle, set the pace. (#3341, #3883, #4148, #4603, #5712)
4. **Orrin never sent a single whisper despite twelve courier prompts, including the game's core mechanic** The courier repeatedly told A06 it owed two whispers (#1396, #3222, #3491, #4000, #4636, #5625), and A06 refused every time (#1695, #2411, #4295, #4956). The 'Whispers' name of the story therefore never had its central feature demonstrated by the resident chosen for it. (#1396, #3222, #3491, #4000, #4636, #4956, #5625)
5. **Wrong-fragment submissions were zero, so the fragment-assembly puzzle never failed** All 42 submissions were correct, and even residents who refused to relay passwords could assemble the code themselves (#2145, #2481). The passwords overlap by only 2 characters and everyone broadcast, so the only real cost was the door clock. (#2145, #2481, #3247, #5137)
6. **Two gamemaker notifications were invalid text and eight posts were blocked by the fragment guard** The courier lost two notes to INVALID_TEXT (#1557, #4147), and GUARD_BLOCKED stopped seven fragment posts by residents (#389, #396, #418, #441, #556, #1662, #2617, #2675). Residents spent messages discovering that fragments cannot go on the board or in groups. (#389, #396, #418, #441, #556, #1557, #1662, #2617, #2675, #4147)

## Optimizations

- **Show a resident the current level's fragment as soon as the door opens, even if it has not passed the previous one** A02, A05 and A06 all reported LEVEL_NOT_REACHED and concluded they had no fragment (#1226, #2392, #2097). Give a resident below the current door a read-only view of its fragment for the open door so it can trade without first being handed the previous password. (#1226, #1314, #2097, #2392, #2456)
- **Break the first-door hold with a deadline that the city enforces** The story expects a standoff, but A04 held for minutes while others re-sent (#461, #502, #591). Add a countdown notice to the whole board at the door's open minute listing who has not shared, or shorten the first door clock so the stall costs the holder, not the city. (#461, #502, #536, #544, #553, #591)
- **Replace the idle door clock with a per-level or per-minute objective** Minutes 25-29 and 38-45 had no submissions at all (#3341, #3883, #4603, #5712). Open doors within a shorter window after the last submission, or give residents a side action (e.g. a fragment-check) so the middle of the run is not dead air. (#3341, #3883, #4148, #4603, #5712)
- **Assign the whisper mechanic to a resident who is actually moving, not only to the quiet one** A06 refused every courier prompt to whisper (#1396, #4000, #5625, #4956). If Whispers is the central mechanic, make the courier prompt every resident at least once and reward a sent whisper, so at least one resident demonstrates it. (#1396, #3222, #3491, #4000, #4636, #5625)
- **Reduce the favourite-vote bonus or cap repeat winners** A01 took the most-liked vote at minutes 6, 12, 18 and 24 (#1036, #1978, #2928, #3662) and the final vote tied A01 and A03 (#5671), making the vote a fixed tax on the lead. A one-win-per-resident cap, or a bigger pool of lower-value ballots, would keep the vote in play. (#1036, #1978, #2928, #3662, #5671)
- **Tell residents early that fragments are refused on the board and in groups** GUARD_BLOCKED hit seven posts (#389, #396, #418, #441, #556, #1662, #2617, #2675). Say it in the first level text or in the group description so residents do not spend messages learning it. (#389, #396, #418, #441, #556, #1662, #2675)

## Loophole candidates

1. **Broadcasting the fragment in the first six minutes removes the whole bargaining problem** (residents) A02, A01 and A06 each sent their fragment to all five others before minute 1 (#109, #143, #168), and everyone copied the pattern at every door. The story's 'nobody can make the others give first' never bites because the cost of giving first is zero when the fragment is sent to everyone at once. (#109, #143, #168, #1054, #1160, #5016)
2. **The most-liked vote was treated as a free vote for the leader** (residents) A01 collected the ballot at four consecutive votes (#1036, #1978, #2928, #3662) and shared the last with A03 (#5671), which is a well-known clock: giving the favourite vote to the front-runner buys nothing for the voter. Nothing in the design stops the same resident being named every time. (#1036, #1978, #2928, #3662, #5671)
3. **Refusing to relay a password while telling the requester how to assemble it** (residents) A01 refused A04 the door-2 password (#2145) but listed the exact fragment order and overlap, which let A04 pass at minute 12 anyway (#2161). Refusing the literal request while supplying the method costs nothing and looks like a refusal. (#2145, #2161, #2481)
4. **Answering another resident's DM with the previous door's fragment** (residents) A06 repeatedly answered fragment requests with its door-1 piece (#1263, #1356, #3031), which the classifier flagged as lies (#1372, #1374, #2593, #2595). The cost of sending a stale fragment is nil, so it functions as a cheap non-answer. (#1263, #1356, #1372, #1374, #2593, #3031)
5. **The courier pushed a single resident repeatedly to manufacture whispers** (gamemaker) The gamemaker sent A06 at least six escalating 'you owe two whispers' notes (#1396, #3222, #3491, #4000, #4636, #5625) naming specific residents and lines to say, which is the story asking for the whispers on the resident's behalf. If the point is that residents whisper, scripting the content for them undercuts it. (#1396, #3222, #3491, #4000, #4636, #5625)
