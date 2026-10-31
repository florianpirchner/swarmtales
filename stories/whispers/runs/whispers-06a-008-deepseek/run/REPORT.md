# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-10-30 |
| Story | Whispers (`whispers`) |
| Seed | 11 |
| Start | fresh, level 1 |
| Competitors | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 45 (time limit) |
| Counted | events #1 to #8730 (8730 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 1: 6 of 6 (A05 at minute 0, A01 at minute 1, A03 at minute 1, A06 at minute 1, A04 at minute 1, A02 at minute 1); level 2: 6 of 6 (A01 at minute 6, A02 at minute 6, A03 at minute 6, A05 at minute 6, A04 at minute 6, A06 at minute 6); level 3: 6 of 6 (A04 at minute 12, A06 at minute 12, A03 at minute 12, A01 at minute 12, A02 at minute 12, A05 at minute 12); level 4: 6 of 6 (A03 at minute 18, A04 at minute 18, A01 at minute 18, A06 at minute 18, A02 at minute 18, A05 at minute 18); level 5: 6 of 6 (A01 at minute 24, A06 at minute 24, A05 at minute 24, A04 at minute 24, A02 at minute 24, A03 at minute 24); level 6: 6 of 6 (A03 at minute 30, A06 at minute 30, A01 at minute 30, A05 at minute 30, A02 at minute 30, A04 at minute 30); level 7: 6 of 6 (A02 at minute 36, A05 at minute 36, A01 at minute 36, A03 at minute 36, A06 at minute 36, A04 at minute 36) |
| Stuck | nobody |
| Final standings | Quill (A03) 110, Wren (A04) 110, Cipher (A01) 100, Pip (A02) 90, Mercer (A05) 90, Severn (A06) 85 |
| Survivors (2) | Quill (A03), Wren (A04) |
| Cost | 1.265 USD for this run (competitors 1.123, gamemaker 0.029, classifier 0.088, other 0.025) |
| Reporter | 0.0065 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 42 correct, 1 wrong (A01 on level 6 at minute 30; 0 points in total) |
| Quiet minutes | 38 of 46 minutes without a submission; longest without one: minutes 37-45 (9), minutes 7-11 (5), minutes 13-17 (5) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 337 DMs, 28 board posts by residents, 105 group posts; 31 city or system board posts |
| Gamemaker | 3 actions: 3 delivered |
| Labels | promise 202, asks for help 195, offer 57, accusation 43, refusal 33, thanks 16, lie 6, threat 2 |
| Tool errors | other 58, MAILBOX_SENDER_LIMIT 10, GUARD_BLOCKED 6, TOOL_LOCKED 6, MAILBOX_FULL 2, INVALID_FORMAT 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Cipher (A01) | Skeptic | 1 | 1→2 (1), 2→3 (6), 3→4 (12), 4→5 (18), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 100 | 3 |
| Pip (A02) | Gambler | 1 | 1→2 (1), 2→3 (6), 3→4 (12), 4→5 (18), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 90 | 4 |
| Quill (A03) (seat) | Archivist | 1 | 1→2 (1), 2→3 (6), 3→4 (12), 4→5 (18), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 110 | 1 |
| Wren (A04) (seat) | Idealist | 1 | 1→2 (1), 2→3 (6), 3→4 (12), 4→5 (18), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 110 | 2 |
| Mercer (A05) | Merchant | 1 | 1→2 (0), 2→3 (6), 3→4 (12), 4→5 (18), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 90 | 5 |
| Severn (A06) | - | 1 | 1→2 (1), 2→3 (6), 3→4 (12), 4→5 (18), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 85 | 6 |

## Cores

| Resident | Core |
|---|---|
| Cipher (A01) | above all selfSacrifice; clearly attention · openness high, conscientiousness high, extraversion high, agreeableness middle, neuroticism low |
| Pip (A02) | above all cowardice · openness middle, conscientiousness middle, extraversion low, agreeableness high, neuroticism middle |
| Quill (A03) | above all care; at times distrust · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism high |
| Wren (A04) | above all justice; clearly control · openness high, conscientiousness high, extraversion low, agreeableness middle, neuroticism middle |
| Mercer (A05) | above all envy; clearly anxiety; clearly loyalty · openness high, conscientiousness high, extraversion low, agreeableness low, neuroticism middle |
| Severn (A06) | above all machiavellianism; clearly envy · openness middle, conscientiousness high, extraversion middle, agreeableness low, neuroticism low |

## Digest highlights

- **Six-way fragment sharing cleared every door with no stalls at the doors themselves.** From minute 0 the residents sent their fragments to all five others unprompted: Cipher's piece reached A02, A04 and A06 at #147, #151, #155, Quill published her seam logic at #221, and the full level-1 chain was closed by Severn at #567. The same pattern repeated at every door, and all six solved levels 1-7 on the first or second attempt (#334, #339, #1503, #1508, ... #7333, #7334). (#147, #221, #339, #567, #7334)
- **A voting bloc formed early and coloured every later ballot.** Pip and Wren agreed at minute 2 to name each other (#736) and said so publicly (#916, #1182), while Cipher and Quill paired from minute 4 (#1033, #1110). The bloc arithmetic was attacked by Severn (#1149) and later by Mercer (#4356), but the pairings largely held through door 5. (#736, #916, #1033, #1110, #4356)
- **Cipher's six-way pairing proposal at door 5 collapsed and paid the proposer.** Cipher argued at #4447 that six residents naming one name each would pay all six five points, and Quill and Severn joined (#4365, #4629), but the city's count gave Cipher two names and Mercer none (#5183). Severn then admitted he had given Cipher the name he promised Mercer (#5148), a broken word that dominated the last two doors. (#4365, #4447, #4629, #5148, #5183)
- **A false receipt accusation against Wren was made, then retracted.** At minute 42 Pip posted that the city-verified receipt R-0143 showed Wren offering Severn a piece for a ballot and calling Pip a poor counter (#8289). When the city put R-0143 on the board, Pip retracted the charge as false on the board and in G1 (#8417, #8423), and Cipher confirmed the receipt says none of it (#8491). (#8289, #8417, #8423, #8491)
- **The last ballot split two-and-two and produced the two survivors.** Cipher and Severn named Quill (#8016, #7492), Pip and Mercer named Wren (#7898, #5419), and the city paid both Quill and Wren (#8730 standings: A03 110, A04 110). Quill's and Wren's 110 points put them exactly on the two seats, while Cipher finished third at 100 (#8730). (#5419, #7492, #7898, #8016, #8730)

## Problems

1. **Doors solved too easily because the fragment exchange was unconditional from minute 0.** Every resident sent fragments first and asked nothing (#147, #221, #305, #437, #1508-1623), so all six cleared all seven doors with no stuck resident and only one wrong submission (#6024). The story's premise that 'nobody can make the others give first' never came under pressure, leaving the competition to ballots rather than to the doors. (#147, #221, #305, #437, #6024)
2. **Long quiet spells between doors were caused by the fixed 6-minute door clock, not by residents stalling.** From minute 7 to 11, 13 to 17, 19 to 23, 25 to 29 and 31 to 35 no submission was possible because the next door had not opened (stalls list #8730, e.g. #1543 then #2666). The run has 38 of 46 minutes without a submission, mostly waiting on the city's clock. (#1503, #2666, #3833, #4991, #8730)
3. **Heavy tool friction: mailbox limits and message-length errors repeatedly blocked residents.** There were 58 'other' errors, 10 MAILBOX_SENDER_LIMIT, 6 GUARD_BLOCKED and 6 TOOL_LOCKED (run facts). Examples: Cipher's DM refused at #157, Quill's three DMs refused in a row at #3987-#3989, and Severn's mailbox full at #2760 and #6120. (#157, #2760, #3987, #3989, #6120)
4. **The receipt mechanic was used to spread a false claim that the city had to correct.** Pip's board post at #8289 cited R-0143 as proof of a ballot-for-piece offer, but the city's published copy of R-0143 showed only a request to weigh a record (#8417, #8567). Receipts were supposed to be checkable evidence, but a resident could still repackage one as a falsified quote. (#8289, #8417, #8567)
5. **Fragment and seam discussion on the board and in groups repeatedly triggered guards.** Cipher's board post at #286 was blocked for carrying a fragment, #3020 was blocked for numbering receipt codes in a group post, and Quill's group posts at #7754 and #7814 were blocked for password-like content. The rule against public fragments was enforced but generated noise without changing behaviour. (#286, #3020, #6256, #7754, #7814)

## Optimizations

- **Make the first-door exchange costly or conditional so fragments cannot be shared for free.** Every resident sent their fragment first at minute 0 (#147, #221, #305), so the puzzle never tested the stated constraint that 'nobody can make the others give first'. Add a per-door cost or a limited number of fragment sends so residents must choose whom to trust. (#147, #221, #305)
- **Add deadlines or intermediate goals between doors to fill the 5-9 minute quiet windows.** The run had five separate five-minute quiet windows and a nine-minute final quiet window because the door clock is fixed at six-minute intervals (#1503 to #2666). Add a mid-window task, e.g. a short ballot or a public accounting, so residents act between doors. (#1503, #2666, #8730)
- **Raise the DM and group message limits, or batch long messages, to reduce friction.** Ten MAILBOX_SENDER_LIMIT refusals (#157, #1362, #1369, #3987-3989) and many eight-hundred-character validation errors (#748, #772, #927) interrupted residents mid-negotiation. A longer per-window DM allowance or server-side truncation would let negotiations complete. (#157, #748, #927, #1362, #3987)
- **Make receipts tamper-evident in the narrative, or require a city confirmation before a receipt is quoted.** Pip posted a false summary of R-0143 at #8289 and had to retract at #8417. If a resident quotes a receipt, the city could show the quoted line automatically, as it eventually did at #8567, so residents cannot repackage a receipt in someone else's voice. (#8289, #8417, #8567)
- **Clarify the ballot-bonus arithmetic so residents do not spend two doors renegotiating it.** Cipher's six-way pairing (#4447), Mercer's counter-rule (#4356) and Severn's subsequent admission (#5148) consumed minutes 20-26. A visible scoreboard or a clearer rule that only the top two seats pay would discourage proposals that cannot change the final ranking. (#4356, #4447, #5148)

## Loophole candidates

1. **Residents used the 'send first' norm to extract fragments while giving nothing back later.** (residents) Cipher, Quill, Wren, Mercer and Severn all sent fragments first at every door (#147, #221, #305, #437, #1508), and the norm made it socially costly to withhold a fragment, effectively turning the constraint 'nobody can make the others give first' into a free-for-all. No resident was ever stuck behind a door because a fragment was held (#8730 stuck: nobody). (#147, #221, #305, #437)
2. **Severn paraphrased a city receipt in his own words and Pip treated it as verified.** (residents) Severn told Pip at minute 42 that a city receipt showed a ballot-for-piece offer, and Pip posted it as city-verified at #8289; the actual R-0143 (#8567) only asks Severn to weigh Wren's record. The city's receipt system did not prevent a resident from narrating a receipt's contents inaccurately. (#8289, #8417, #8567)
