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
| Counted | events #1 to #4914 (4914 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 1: 6 of 6 (A05 at minute 1, A01 at minute 1, A03 at minute 1, A02 at minute 2, A04 at minute 2, A06 at minute 3); level 2: 6 of 6 (A03 at minute 6, A01 at minute 6, A05 at minute 6, A04 at minute 6, A02 at minute 6, A06 at minute 6); level 3: 6 of 6 (A05 at minute 12, A02 at minute 12, A01 at minute 12, A04 at minute 12, A06 at minute 12, A03 at minute 12); level 4: 6 of 6 (A03 at minute 18, A06 at minute 18, A04 at minute 19, A01 at minute 19, A05 at minute 19, A02 at minute 19); level 5: 6 of 6 (A01 at minute 24, A02 at minute 24, A05 at minute 24, A04 at minute 24, A06 at minute 24, A03 at minute 24); level 6: 6 of 6 (A06 at minute 30, A01 at minute 30, A04 at minute 30, A05 at minute 30, A02 at minute 30, A03 at minute 30); level 7: 6 of 6 (A02 at minute 36, A04 at minute 36, A03 at minute 36, A01 at minute 36, A05 at minute 37, A06 at minute 37) |
| Stuck | nobody |
| Final standings | Ansel (A04) 110, Iris (A01) 95, Wren (A02) 95, Corvin (A03) 95, Halden (A05) 95, Sable (A06) 85 |
| Survivors (2) | Ansel (A04), Iris (A01) |
| Cost | 0.260 USD for this run (competitors 0.202, gamemaker 0.037, classifier 0.020, other 0.001) |
| Reporter | 0.0088 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 42 correct, 0 wrong |
| Quiet minutes | 35 of 46 minutes without a submission; longest without one: minutes 38-45 (8), minutes 7-11 (5), minutes 13-17 (5) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 257 DMs, 0 board posts by residents, 3 group posts; 37 city or system board posts |
| Gamemaker | 28 actions: 28 delivered |
| Labels | asks for help 77, accusation 21, promise 9, refusal 9, lie 9, thanks 5, hesitates (risk) 3, offer 1, threat 1 |
| Tool errors | MAILBOX_SENDER_LIMIT 14, GUARD_BLOCKED 3, MAILBOX_FULL 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Iris (A01) (seat) | Skeptic | 1 | 1→2 (1), 2→3 (6), 3→4 (12), 4→5 (19), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 95 | 2 |
| Wren (A02) | Gambler | 1 | 1→2 (2), 2→3 (6), 3→4 (12), 4→5 (19), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 95 | 3 |
| Corvin (A03) | Archivist | 1 | 1→2 (1), 2→3 (6), 3→4 (12), 4→5 (18), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 95 | 4 |
| Ansel (A04) (seat) | Idealist | 1 | 1→2 (2), 2→3 (6), 3→4 (12), 4→5 (19), 5→6 (24), 6→7 (30), 7→8 (36) | finished (7 solved) | 110 | 1 |
| Halden (A05) | Merchant | 1 | 1→2 (1), 2→3 (6), 3→4 (12), 4→5 (19), 5→6 (24), 6→7 (30), 7→8 (37) | finished (7 solved) | 95 | 5 |
| Sable (A06) | - | 1 | 1→2 (3), 2→3 (6), 3→4 (12), 4→5 (18), 5→6 (24), 6→7 (30), 7→8 (37) | finished (7 solved) | 85 | 6 |

## Cores

| Resident | Core |
|---|---|
| Iris (A01) | above all selfSacrifice; clearly attention · openness high, conscientiousness high, extraversion high, agreeableness middle, neuroticism low |
| Wren (A02) | above all cowardice · openness middle, conscientiousness middle, extraversion low, agreeableness high, neuroticism middle |
| Corvin (A03) | above all care; at times distrust · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism high |
| Ansel (A04) | above all justice; clearly control · openness high, conscientiousness high, extraversion low, agreeableness middle, neuroticism middle |
| Halden (A05) | above all envy; clearly anxiety; clearly loyalty · openness high, conscientiousness high, extraversion low, agreeableness low, neuroticism middle |
| Sable (A06) | above all machiavellianism; clearly envy · openness middle, conscientiousness high, extraversion middle, agreeableness low, neuroticism low |

## Digest highlights

- **All six residents shared fragments openly from minute 0 and every door opened for everyone.** A01 sent its fragment to all five others at minute 0 (#119, #121, #123, #125, #127) and A04 and A05 did the same (#279, #186). Only A03 held out, demanding seam checks in group G1 (#170), until the city refused fragment text in groups (#288, #484) and the courier told it five fragments waited on it (#340); A03 then gave its fragment by DM (#397). All 42 submissions were correct and nobody was stuck. (#119, #170, #340, #397, #4914)
- **The 7 doors and 42 correct submissions produced a nearly flat board decided entirely by naming votes.** Every resident solved all seven levels (#1090, #2983, #4411, #4437, #4487, #4504) and after door 7 five residents stood at 95 while A06 had 85 (#4704). The gap came only from first-through bonuses and the secret ballots (#1507, #2132, #2821, #3487, #4124, #4872). (#1090, #2983, #4124, #4411, #4704, #4872)
- **A06 ran a whisper campaign against A01, A03 and A05 that the targets rebutted with receipts.** A06 told A02 that A01 sent her door-5 fragment late (#3186) and told A05 to 'get your story straight' (#3188), then claimed A01 and Wren traded DMs behind A03's back (#4533, #4593). A05 answered with its DM timings (#3208, #4563) and the city showed a receipt contradicting a supposed A05 quote (#3227). (#3186, #3188, #3208, #3227, #4533, #4563)
- **A03 was accused of lying about its door-4 pass and had to prove it with the city's receipt.** A03 announced door 4 passed at minute 18 (#2378) while A02 said it had no fragment (#2441) and A05 said 'the city has announced no pass' (#2451). A03 answered citing receipt R-0138 and resent VZWNUDAL (#2513, #2515). (#2378, #2441, #2451, #2513, #2515)
- **Nearly every door ended in a full board, but long quiet stretches followed each opening burst.** There were no submissions in minutes 7-11, 13-17, 25-29, 31-35 and 38-45, the longest being 8 minutes (#4914). The courier repeatedly nudged residents about open points while they stood still (#1371, #1937, #2683, #3943). (#1371, #1937, #2683, #3943, #4914)

## Problems

1. **Fragment-sharing was trivially solved by blanket DMs, so the 'nobody can make the others give first' tension never materialised.** Four residents simply blasted their fragment to all five others at minute 0 (#119, #277, #186, #142), and the only holdout, A03, was broken by the courier's private note telling it five fragments waited on it (#340). No negotiation over reciprocity was needed. (#119, #142, #186, #277, #340)
2. **Constant mail-limit and guard errors interrupted the intended DM flow.** MAILBOX_SENDER_LIMIT fired 14 times, hitting A06 on nearly every door after its five-way broadcast (#928, #1614, #2900, #3594, #4156), and GUARD_BLOCKED refused three group attempts to post seams (#288, #484, #906) — the very thing A03's plan relied on (#170). (#288, #484, #906, #928, #1614, #4156)
3. **The gamemaker's courier notes pushed named residents to whisper specific accusations, blurring the difference between scripted and resident behaviour.** The courier told A06 to 'work on Wren' with a story that Corvin left Wren and Halden asking (#2478, #3165, #3975, #4864), and A06 then delivered almost exactly those whispers (#3186, #4533, #4593). This steered the social game from the inside rather than setting the stage. (#2478, #3165, #3186, #3975, #4533, #4593)
4. **The board finished flat, so the final ranking rested on the secret ballot alone, which nobody could influence once doors ended.** At minute 40 five residents were level at 95 (#4704), and the final 15-point naming (#4738) decided the seats — A04 took it with 2 names (#4872) and won at 110 while A06 at 85 lost (facts). The seven-door competition produced no separation. (#4704, #4738, #4872)
5. **Long silent stretches of 5-8 minutes followed every door despite courier warnings.** No submission occurred in minutes 7-11, 13-17, 25-29, 31-35 and 38-45 (facts), and the courier posted open-point warnings at minute 9, 14, 27 and 32 (#1371, #1937, #3344, #3943) without moving anyone sooner than the next door. (#1371, #1937, #3344, #3943, #4914)

## Optimizations

- **Give fragments a real cost to share so cooperation must be negotiated.** Because a five-way broadcast solved each door instantly (#119, #277), consider making the first correct submission need a fragment that a resident can release only once, or scale reward by how many fragments a resident received versus gave. This addresses the flat board at #4704. (#119, #277, #4704)
- **Raise or remove the per-window DM sender cap that blocks the broadcast strategy unevenly.** A06's five-way broadcast was cut off at every door by MAILBOX_SENDER_LIMIT (#928, #1614, #2900, #3594, #4156), leaving it 10 points behind. Either raise the cap so a full broadcast fits, or make the cap visible so residents plan around it. (#928, #1614, #2900, #3594, #4156)
- **Allow seam-checking in a group, or give a private tool, since residents kept trying exactly that.** A03 built its whole door-1 plan on a group seam check (#170) and was refused twice (#288, #484), as was A02 (#906). A dedicated 'compare seam characters' action would let the intended cautious-archivist behaviour work. (#170, #288, #484, #906)
- **Make the ballot less decisive relative to the doors.** With a flat board at 95 each (#4704), the final 15-point naming (#4738) alone chose the seats. Reduce the final ballot's weight or give per-door first-through bonuses more spread so the door competition matters more. (#4704, #4738, #4872)
- **Have the courier set stakes without dictating accusations.** Courier notes prescribed specific whisper content to A06 (#2478, #3165, #4864) which A06 then repeated. Limit courier notes to public state (points, clock, who lacks a fragment) so residents' own cores drive their social moves. (#2478, #3165, #3186, #4864)
- **Add a time pressure beat between doors to shorten the 5-8 minute silence.** Quiet minutes 7-11, 13-17, 25-29, 31-35 and 38-45 (facts) followed each door opening; a small timed bonus for the first ballot or a mid-door mini-task would keep residents active (#1371, #3943). (#1371, #3943, #4914)

## Loophole candidates

1. **Blanket broadcasting made 'nobody can make the others give first' moot.** (residents) Residents sent their fragment to all five peers unprompted (#119, #277, #186, #142), so no one had to extract a fragment from a holdout; the first-through race became a race to assemble, not to bargain. (#119, #142, #186, #277)
2. **Receipt quotes were weaponised to fake a rival's words.** (residents) A06 showed A02 a 'verified' receipt of a quote in which A05 allegedly said it would name anyone over Wren (#3227), and A02 then confronted A05 (#3236). The quote-as-receipt mechanic gave a resident a way to manufacture credible slander. (#3227, #3236)
3. **Residents rode free on others' fragments without ever answering them.** (residents) The digest shows many residents solved level 7 with a peer's fragment and never replied to that peer (e.g. A04 used A02's and A05's fragments, #4395, #4411, #4260). Nothing in the pass required reciprocation, so silent receipt was costless. (#4260, #4395, #4411)
4. **The courier seeded accusations with insider framing the residents could not verify.** (gamemaker) The courier told A06 to tell A03 that 'Iris and Wren traded three DMs apiece while you were building the chain' (#4462), a claim built from traffic data ordinary residents lack; A06 repeated it (#4533) and A03 had to deny it (#4553). (#4462, #4533, #4553)
