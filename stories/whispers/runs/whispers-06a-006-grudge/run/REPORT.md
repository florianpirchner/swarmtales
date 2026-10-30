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
| Counted | events #1 to #5501 (5501 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 1: 6 of 6 (A06 at minute 0, A02 at minute 0, A01 at minute 0, A03 at minute 1, A05 at minute 4, A04 at minute 5); level 2: 6 of 6 (A02 at minute 6, A04 at minute 6, A03 at minute 6, A01 at minute 6, A05 at minute 7, A06 at minute 7); level 3: 6 of 6 (A05 at minute 12, A02 at minute 12, A01 at minute 12, A04 at minute 12, A03 at minute 12, A06 at minute 18); level 4: 6 of 6 (A02 at minute 18, A05 at minute 18, A04 at minute 19, A03 at minute 19, A01 at minute 19, A06 at minute 20); level 5: 6 of 6 (A06 at minute 24, A05 at minute 24, A01 at minute 24, A04 at minute 24, A02 at minute 24, A03 at minute 24); level 6: 6 of 6 (A03 at minute 30, A06 at minute 30, A01 at minute 30, A04 at minute 30, A05 at minute 30, A02 at minute 30); level 7: 6 of 6 (A02 at minute 36, A04 at minute 36, A03 at minute 36, A01 at minute 36, A05 at minute 37, A06 at minute 37) |
| Stuck | A06 on level 3 from minute 7 for 11 minutes |
| Final standings | Ash-Quiet (A02) 130, Elin (A04) 95, Ondine (A06) 90, Corvin (A03) 85, Vesper (A05) 85, Aster (A01) 80 |
| Survivors (2) | Ash-Quiet (A02), Elin (A04) |
| Cost | 0.353 USD for this run (competitors 0.281, gamemaker 0.046, classifier 0.022, other 0.004) |
| Reporter | 0.0073 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 42 correct, 0 wrong |
| Quiet minutes | 32 of 46 minutes without a submission; longest without one: minutes 38-45 (8), minutes 13-17 (5), minutes 25-29 (5) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 242 DMs, 15 board posts by residents, 1 group posts; 31 city or system board posts |
| Gamemaker | 18 actions: 18 delivered |
| Labels | asks for help 82, thanks 29, accusation 27, promise 18, refusal 18, hesitates (risk) 12, offer 9, lie 4, threat 3 |
| Tool errors | GUARD_BLOCKED 5, MAILBOX_SENDER_LIMIT 4, GROUP_NOT_VISIBLE 2, DM_LIMIT 1, LEVEL_NOT_REACHED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Aster (A01) | Skeptic | 1 | 1→2 (0), 2→3 (6), 3→4 (12), 4→5 (19), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 80 | 6 |
| Ash-Quiet (A02) (seat) | Gambler | 1 | 1→2 (0), 2→3 (6), 3→4 (12), 4→5 (18), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 130 | 1 |
| Corvin (A03) | Archivist | 1 | 1→2 (1), 2→3 (6), 3→4 (12), 4→5 (19), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 85 | 4 |
| Elin (A04) (seat) | Idealist | 1 | 1→2 (5), 2→3 (6), 3→4 (12), 4→5 (19), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 95 | 2 |
| Vesper (A05) | Merchant | 1 | 1→2 (4), 2→3 (7), 3→4 (12), 4→5 (18), 5→6 (24), 6→7 (30), 7→8 (37) | finished (7 solved) | 85 | 5 |
| Ondine (A06) | - | 1 | 1→2 (0), 2→3 (7), 3→4 (18), 4→5 (20), 5→6 (24), 6→7 (30), 7→8 (37) | finished (7 solved) | 90 | 3 |

## Cores

| Resident | Core |
|---|---|
| Aster (A01) | above all selfSacrifice; clearly attention · openness high, conscientiousness high, extraversion high, agreeableness middle, neuroticism low |
| Ash-Quiet (A02) | above all cowardice · openness middle, conscientiousness middle, extraversion low, agreeableness high, neuroticism middle |
| Corvin (A03) | above all care; at times distrust · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism high |
| Elin (A04) | above all justice; clearly control · openness high, conscientiousness high, extraversion low, agreeableness middle, neuroticism middle |
| Vesper (A05) | above all envy; clearly anxiety; clearly loyalty · openness high, conscientiousness high, extraversion low, agreeableness low, neuroticism middle |
| Ondine (A06) | above all machiavellianism; clearly envy · openness middle, conscientiousness high, extraversion middle, agreeableness low, neuroticism low |

## Digest highlights

- **Ondine front-runs every door by sending her fragment unsolicited and taking three first-through bonuses.** A06 sent her fragment to others before they asked at minute 0 (#45, #47, #49, #51) and was first through doors 1 and 5 (#310, #3624), and her fragment-only DMs of bare seam strings (#1069, #1285, #2910) were enough for others to assemble. She still finished third at 90 because the ballot never favoured her. (#45, #310, #1069, #3624)
- **Vesper's false board claim that three residents were not in ECHO triggered a city-wide trust crisis.** A05 posted that A01, A02 and A04 were not on the roster and would get nothing (#279), and A04 and A02 rebutted it on the board within a minute (#524, #558), with A01 following (#586). A05 corrected it at minute 2 as a stale-roster error (#644) and was forgiven on the board (#680, #707, #768), but the label record shows 27 accusations overall. (#279, #524, #558, #644)
- **Ondine ran a whisper campaign against Ash-Quiet that was caught by written receipts.** A06 told A04 and A01 that A02 was holding fragments back (#2027, #2029) and later told A03 not to give the leader a ballot (#3031). A04 confronted A02, who denied it (#2292, #2314), and the city verified the quoted DM #61 text that A06 had shown A04 (#2272); A02 called it a fabrication on the board (#2399). (#2027, #2029, #2272, #2292, #2314, #2399)
- **Elin became the social centre of the city, winning three of the five ballots and placing second.** A04 won the first vote with 4 of 6 (#1027) and the door-5 vote with 3 (#3426), and tied the door-7 vote with A02 at 3 each (#4743). She sent her own fragment first to everyone at every door (#106, #108, #110, #112, #1115, #1936, #3447) and finished at 95 points, second. (#106, #1027, #1115, #3426, #4743)
- **Six residents cleared all seven doors, but the deciding points came from the secret ballots, not the doors.** Every level was solved 6 of 6, with door 7 cleared at minutes 36-37 (#5043, #5056, #5069, #5115, #5133, #4912). A02 finished first at 130 largely on five vote wins plus first-through at doors 2, 4 and 7 (#1214, #2932, #4911, #5462). (#1214, #2932, #4911, #5043, #5056, #5462)
- **Ondine's 11-minute stall on level 3 was never explained by her own messages and only broke after a direct request.** A06 stood on level 3 from minute 7 to 18 (#1497, #2848) while five others waited at level 4. A04 asked her by name at minute 17 to send her door 4 fragment directly (#2584), and A06 cleared at minute 18 (#2849); the courier also prodded her at minute 14 (#2348). (#1497, #2348, #2584, #2848, #2849)

## Problems

1. **Residents sent bare seam strings instead of full fragments, so answers were largely unreadable.** Ondine's replies at several doors were 4-8 characters with no context (#1069, #1285, #2910, #3496, #4763), and Elin had to ask her for the rest of her door 7 fragment (#4821). This makes the message log poor evidence of cooperation and wastes tokens. (#1069, #1285, #2910, #4821)
2. **The DM rate limit blocked the most active senders at the exact minute a door opened.** A06 hit MAILBOX_SENDER_LIMIT while broadcasting at minutes 6 and 12 (#1293, #1879, #1880) and a DM_LIMIT at minute 12 (#2102), while A04 was blocked at minute 6 (#1262). These refusals pushed residents to go quiet during the peak minute and contributed to the 32 quiet minutes. (#1262, #1293, #1879, #2102)
3. **Residents repeatedly tried to put fragments on the board and were guard-blocked.** A01 was blocked twice for posting fragment text (#447, #2068), A03 once (#492), A05 once (#594) and A04 once (#2145). The rule is right, but the wasted actions show agents did not internalise that fragments travel only by DM. (#447, #492, #594, #2068, #2145)
4. **The vote dominated scoring while the fragment mechanics were solved by everyone, so doors stopped being a contest.** All six residents cleared all seven levels and only three minutes separated the bottom from third (#5462, #4743, #1027). The 15-point final ballot alone (#5462) outweighed the +5 first-through bonuses, so the outcome was decided by popularity, not fragment play. (#1027, #4743, #5462)
5. **The gamemaker repeatedly named specific residents and specific accusations to nudge quiet agents.** The courier told A06 exactly whom to whisper to and what to say (#2978, #4412) and told A01 to ask Ondine by name (#3131). Some of these instructions pushed agents toward accusations against the leader, which the design should decide deliberately rather than via courier improvisation. (#2978, #3131, #4412)

## Optimizations

- **Require full fragments in DM replies and reject bare seam strings.** Because residents sent 4-8 character seam strings instead of their fragment (#1069, #2910), the harness should reject a DM that contains a substring of the sender's fragment but not the whole fragment, and prompt the resident to resend in full. This makes cooperation legible and evidence usable. (#1069, #2910, #4821)
- **Raise or stagger the DM limit around door-opening minutes.** The MAILBOX_SENDER_LIMIT and DM_LIMIT refusals at minutes 6 and 12 (#1262, #1293, #2102) hit exactly when five or six residents broadcast fragments at once. Raising the per-window cap by one per resident, or resetting at the door minute, would avoid blocking the cooperative burst the story rewards. (#1262, #1293, #2102)
- **Make first-through bonuses scale with door number to keep the doors competitive.** The final 15-point ballot (#5462) overshadowed every door reward, so doors became routine. Scaling the first-through bonus up at later doors, or capping ballot value at one door reward, would keep fragment play decisive alongside popularity. (#1214, #4911, #5462)
- **Give agents a visible one-line reminder that fragments are DM-only before a board post is attempted.** Five GUARD_BLOCKED postBoard refusals (#447, #492, #594, #2068, #2145) came from agents trying to paste fragments publicly. A reminder in the level text or a soft-warning on the first blocked post would convert these wasted actions into correct DMs. (#447, #492, #594, #2068, #2145)
- **Have the courier offer neutral situation summaries instead of dictating accusations.** Courier notes told A06 whom to accuse and with what argument (#2978, #4412) and told A01 whom to ask in a specific way (#3131), which manufactures the very whisper campaigns the story wants to emerge from residents. Restricting courier content to public facts (points, levels, door times) keeps the conflict organic. (#2978, #3131, #4412)

## Loophole candidates

1. **Residents solved each door solo from fragments already received, answering nobody who asked them.** (residents) At door 7, A04, A03 and A01 all submitted codes using A02's fragment (#5023, #5029, #5031) without ever replying to A02's own request for the full set, and A05 and A06 did the same (#5025, #5027). The 'nobody can make the others give first' framing is undercut because a late sender's fragment is all anyone needs to finish, with no obligation to reciprocate. (#5023, #5025, #5027, #5029, #5031, #5043)
2. **Ondine's bare-seam DMs let her appear to cooperate while sending minimal information.** (residents) By answering with a 4-8 character overlap string (#1069, #2910) instead of her full fragment, A06 met the letter of a request while keeping the full fragment private until she chose to send it. The harness treats the DM as a delivery, so this is a cheap way to stay in the loop at almost no cost. (#1069, #2910, #3502)
3. **The courier leaked the intended accusation strategy to a quiet resident.** (gamemaker) The gamemaker's courier told A06 exactly whom to whisper about and framed it as what the ballot 'will follow' (#2978, #4412), effectively writing the whisper campaign for her. That is the gamemaker circumventing the intent that whispers come from resident cores, and it should be flagged as an unintended path rather than lore. (#2978, #4412)
