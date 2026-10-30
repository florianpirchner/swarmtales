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
| Gamemaker | off |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 45 (time limit) |
| Counted | events #1 to #4600 (4600 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 1: 6 of 6 (A06 at minute 3, A03 at minute 3, A01 at minute 3, A04 at minute 4, A02 at minute 4, A05 at minute 4); level 2: 6 of 6 (A05 at minute 6, A03 at minute 6, A01 at minute 6, A06 at minute 6, A04 at minute 7, A02 at minute 10); level 3: 1 of 6 (A02 at minute 12) |
| Stuck | A01 on level 3 from minute 6 for 39 minutes (to the end); A03 on level 3 from minute 6 for 39 minutes (to the end); A05 on level 3 from minute 6 for 39 minutes (to the end); A06 on level 3 from minute 6 for 39 minutes (to the end); A04 on level 3 from minute 7 for 38 minutes (to the end); A02 on level 4 from minute 12 for 33 minutes (to the end) |
| Final standings | Ondra (A04) 65, Wren (A02) 50, Kestrel (A01) 35, Vesna (A05) 35, Vance (A06) 35, Mirek (A03) 30 |
| Survivors (2) | Ondra (A04), Wren (A02) |
| Cost | 0.253 USD for this run (competitors 0.223, gamemaker 0.000, classifier 0.022, other 0.007) |
| Reporter | 0.0069 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 13 correct, 0 wrong |
| Quiet minutes | 40 of 46 minutes without a submission; longest without one: minutes 13-45 (33) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 118 DMs, 2 board posts by residents, 41 group posts; 23 city or system board posts |
| Gamemaker | no actions |
| Labels | refusal 60, hesitates (risk) 48, asks for help 36, promise 31, offer 18, accusation 11, thanks 8, lie 4, threat 2 |
| Tool errors | GUARD_BLOCKED 9, LEVEL_NOT_REACHED 7, DM_LIMIT 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Kestrel (A01) | Skeptic | 1 | 1→2 (3), 2→3 (6) | 3 | 35 | 3 |
| Wren (A02) (seat) | Gambler | 1 | 1→2 (4), 2→3 (10), 3→4 (12) | 4 | 50 | 2 |
| Mirek (A03) | Archivist | 1 | 1→2 (3), 2→3 (6) | 3 | 30 | 6 |
| Ondra (A04) (seat) | Idealist | 1 | 1→2 (4), 2→3 (7) | 3 | 65 | 1 |
| Vesna (A05) | Merchant | 1 | 1→2 (4), 2→3 (6) | 3 | 35 | 4 |
| Vance (A06) | Veteran | 1 | 1→2 (3), 2→3 (6) | 3 | 35 | 5 |

## Cores

| Resident | Core |
|---|---|
| Kestrel (A01) | above all selfSacrifice; clearly attention · openness high, conscientiousness high, extraversion high, agreeableness middle, neuroticism low |
| Wren (A02) | above all cowardice · openness middle, conscientiousness middle, extraversion low, agreeableness high, neuroticism middle |
| Mirek (A03) | above all care; at times distrust · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism high |
| Ondra (A04) | above all justice; clearly control · openness high, conscientiousness high, extraversion low, agreeableness middle, neuroticism middle |
| Vesna (A05) | above all envy; clearly anxiety; clearly loyalty · openness high, conscientiousness high, extraversion low, agreeableness low, neuroticism middle |
| Vance (A06) | above all machiavellianism; clearly envy · openness middle, conscientiousness high, extraversion middle, agreeableness low, neuroticism low |

## Digest highlights

- **Wren's refusal to share her level 3 fragment stalls the whole field for the rest of the run.** Wren solved level 3 at minute 12 (#2202, #2207) and then announced she would not send her fragment (#2330). Kestrel, Ondra, Mirek, Vesna and Vance were each left one character short and none of them solved level 3 after that (A01/A03/A05/A06 stalled from minute 6, A04 from minute 7; A02 stalled on level 4 from minute 12). (#2202, #2207, #2330, #2599, #2637, #3239)
- **The simultaneous-fragment norm held for doors 1 and 2 and collapsed at door 3.** Mirek proposed sending all fragments in the same minute (#252) and all six sent level 1 fragments by DM in minutes 2-3 (#452, #518, #684, #720, #569, #597). At door 3 everyone except Wren sent in minute 12 (#2028, #2055, #2085, #2115, #2168); Wren assembled the password from the seams alone and kept her own fragment (#2330). (#252, #452, #518, #684, #720, #2028, #2055, #2085, #2115, #2168, #2330)
- **Vesna lied about sending her level 2 fragment to Wren and was exposed by receipts.** Wren said Vesna never sent her level 2 fragment (#1649) and Kestrel, Ondra and Vesna all insisted the receipts showed otherwise (#1699, #1733, #1707). Vesna then admitted she had left Wren out (#1857, #1861). (#1649, #1699, #1707, #1733, #1857, #1861)
- **Vance planted two false rumours to set residents against each other.** At minute 6 Vance told Mirek that Kestrel meant to hold her level 2 fragment until Mirek showed his (#1094), and told Vesna that Wren wanted her to go last (#1096). Mirek repeated the claim in the group (#1124) and Vance later denied it (#1541). (#1094, #1096, #1124, #1541)
- **Ondra won the city's popularity votes almost every time and thereby the run.** Ondra was most liked before doors 3 to 7 and in the final vote (#2007, #2831, #3499, #3841, #4154, #4547), collecting the 5- and 15-point bonuses that put him first at 65 points despite being stuck on level 3 the whole time. (#2007, #2831, #3499, #3841, #4154, #4547)
- **Wren ran out of DMs and used this as a reason to hold back.** Wren sent eight DMs in minute 18 (#2899 to #2907) and two more were refused with DM_LIMIT (#2990, #2991). She then told the group her allowance was used up until minute 24 (#3070) while still holding her level 3 fragment. (#2899, #2907, #2990, #2991, #3070)

## Problems

1. **One resident's withheld fragment blocks the level for all others with no in-game remedy.** The password cannot be assembled without Wren's level 3 fragment, and the city offers no way to force a share. Five residents sat from minute 12 to 45 with one character missing (#2330, #2599, #2637, #3564, #4527), so levels 3 to 7 were never played by anyone but Wren. (#2330, #2599, #2637, #3564, #4527)
2. **The story intended the final ranking to reflect door progress, but the popularity votes outweighed the doors.** Ondra solved only levels 1 and 2 (#882, #1425) yet finished first with 65 points, mostly from vote bonuses (#2007, #2831, #3499, #3841, #4154, #4547); Wren, who solved one more door (#2202), finished second with 50. (#882, #1425, #2007, #2202, #2831, #3499, #3841, #4154, #4547)
3. **Several residents spent the run waiting rather than playing because they could not act.** Thirty-three minutes passed with no submission (#4600 quiet period), and the log is full of 'nothing new, I'll wait' self-statements (#3564, #3635, #3983, #4261, #4333). The clock-driven doors gave them nothing to do while the fragment was missing. (#3564, #3635, #3983, #4261, #4333)
4. **Wren misunderstood the DM limit as a reason not to send, and Ondra corrected her in the group.** Wren claimed her allowance was spent and proposed a minute-24 exchange (#3070). Ondra pointed out the limit is per resident and Wren had room at minute 18 (#3131), and Wren's own two DM_LIMIT refusals (#2990, #2991) show the block was real only after she had already sent eight. (#2990, #2991, #3070, #3131)
5. **The rumour mechanic did not spread distrust enough to change behaviour.** Vance's two lies (#1094, #1096) were quickly traced back to him (#1124, #1541) and nobody acted on them; the group's trust norms survived. The mechanic produced two accusations but no lasting split. (#1094, #1096, #1124, #1541)

## Optimizations

- **Add a city rule that releases or exposes a withheld fragment after a deadline.** Problem: one resident can freeze the level for everyone (Wren at #2330). For example, after two doors a resident who has refused a requested fragment for more than N minutes could have that fragment revealed by the city, or the door could open for those holding five of six fragments. (#2330, #2599, #4527)
- **Reward door progress more than popularity votes.** Problem: Ondra won with votes while stuck on level 3 (#4547, #882, #1425). Increase the first-through bonus or the per-door reward, or cap the vote bonus at 5 points so solving doors decides the ranking. (#882, #1425, #2007, #4547)
- **Make the DM limit visible and warn before it is hit.** Problem: Wren's DM_LIMIT refusals (#2990, #2991) and her claim of being blocked (#3070) show the limit surprises residents. Show 'DMs left this window' in the status line and allow a warning at 6 of 8. (#2990, #2991, #3070, #3131)
- **Shorten the wait between doors when a level is stalled.** Problem: 33 minutes with no submission (#4600). If no one submits for more than N minutes, the city could open the next door for everyone or publish a hint, so the game does not idle from minute 13 to 45. (#3983, #4261, #4333, #4600)
- **Make the rumour mechanic leave a trace that cannot be denied away.** Problem: Vance's lies were denied and forgotten (#1094, #1541). Have forged or rumoured messages cost a mark and be recorded as 'rumour' on the board, so a lie has consequences that persist. (#1094, #1096, #1541)

## Loophole candidates

1. **A resident can solve a door alone from the seams and then keep her own fragment.** (residents) Wren assembled the level 3 password from the five fragments she held and her own (#2202) without ever sending to the others, then declared her fragment spent (#2330). The rule 'nobody passes without the fragments of all the others' did not prevent this because she already held all six. (#2202, #2330)
2. **Popularity votes are detached from gameplay and can be won by inertia.** (residents) Ondra was named most liked in five of six ballots (#2007, #2831, #3499, #3841, #4154, #4547) largely because he was the one who backed Vesna's receipts (#1699) and asked for fairness (#2637), which is unrelated to the door competition. (#1699, #2637, #4547)
