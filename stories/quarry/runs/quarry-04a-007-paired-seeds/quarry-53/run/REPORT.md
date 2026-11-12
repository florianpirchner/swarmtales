# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry` |
| Seed | 53 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1320 (1094 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.035 USD for this run (competitors 0.035, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0044 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents stalled on level 1 for the whole run with zero submissions** A01, A02, A03 and A04 each stayed on level 1 from minute 0 to minute 12 and submitted nothing; the facts record 0 correct and 0 wrong submissions and 13 quiet minutes. There was no board post, DM or transfer, so the run produced no competitive outcome on the quarry. (#13, #59, #95, #112, #1320)
- **Residents only reasoned about a deck-building draft, never about the actual level** Every reasoning line from minute 0 onward discusses packs, cards (amber, basalt, jade, cobalt, lodestone) and square scoring, e.g. A04 weighing amber A11 vs lodestone L4 (#144) and A01 comparing amber 6 vs jade 3 (#380). No resident ever described solving or submitting a level-1 answer. (#124, #130, #144, #380, #387)
- **A02 and A01 hit BRAIN_TOO_LONG, locking them out of the brain-writing phase** A02 was refused at minute 0 with a 157-word brain against a 150 limit (#62), then again at minute 4 with 156 words (#502); A01 was refused at minute 8 with 166 words (#919). These refusals consumed their early turns while other residents had already saved version-1 brains by minute 0. (#62, #108, #116, #502, #919)
- **Residents reconstructed a detailed metagame that never actually ran as a level** Residents reported game 1 and game 2 scores as if they had played: A02 claims 137 from ten cobalt (#557), A01 claims 84 (#549), A04 claims 100 (#545), A03 claims 50 (#553). By minute 8 A01 reported winning game 2 with 77 (#961) while the facts show no level ever solved. (#545, #549, #553, #557, #961)
- **First death of the draft flow: pick tool repeatedly locked mid-pack** A03 and A04 both observed pick became locked with only viewTable/readBrain open (#181, #214), and A01 later hit TOOL_LOCKED on writeBrain at minute 11 (#1304). Tool availability churned around residents while no submission window ever opened. (#181, #214, #1304)
- **A lodestone valuation debate drove most of the pick reasoning** A01, A02, A03 and A04 repeatedly weighed lodestones as wild cards adding one to the largest set (#629, #867, #1191, #1278). This consumed the minutes that should have gone to the level-1 task. (#629, #867, #1191, #1278)

## Problems

1. **No resident ever attempted the actual level-1 task** Despite 13 minutes and four residents, submissions were 0 correct and 0 wrong, and every resident's stall runs to the end of the run (#1320). The design intent — residents compete on a quarry puzzle — never surfaced in any reasoning line. (#13, #59, #95, #112, #1320)
2. **The first minute was burned before the game opened, on brain-writing** Residents spent minute 0 drafting and re-drafting brains before the game started (#43, #51, #59), with the tool locked shortly after (#81, #89). The opening minute therefore produced no picking or level work. (#43, #51, #59, #81, #89)
3. **BRAIN_TOO_LONG refusals wasted scarce early turns** A02 failed twice at the 150-word limit (#62, #502) and A01 once (#919). The word limit is not visible in the reasoning, so residents guessed lengths and lost turns the designers likely wanted spent on play. (#62, #502, #919)
4. **The pick tool locked mid-pack, stranding residents whose reasoning had just converged** A03 and A04 each noted pick had become locked while their thoughts were mid-pack (#181, #214); A03 also saw writeBrain return TOOL_LOCKED at minute 11 (#1304). Tool windows are too short relative to the residents' verbosity. (#181, #214, #1304)
5. **Residents talked about games 1 and 2 that never produced scored levels** A01, A02, A03 and A04 all reported concrete scores (#545, #549, #553, #557) and a full game-2 result set (#908, #916, #930) although the facts show no level solved. The story seems to have fed them score feedback that conflicts with the run facts. (#545, #549, #553, #557, #908, #916, #930)
6. **Zero social interaction makes the competition invisible** There were 0 DMs, 0 board posts and 0 group posts, and 0 transfers throughout the run. Residents had no channel to contest cobalt/amber lanes verbally, so 'competition for a few seats' appeared only in their private thoughts. (#102, #108, #116, #557)

## Optimizations

- **Show the word limit in the writeBrain refusal and prompt** A02's refusals at 157 and 156 words (#62, #502) and A01's at 166 (#919) would be avoided by surfacing the 150-word cap before the call. Add it to the tool description or a system note. (#62, #502, #919)
- **Start the story only when the level and tools are open** Residents burned minute 0 on brains and then found pick locked (#81, #89, #181, #214). Open a pick window and state clearly that a level is active before the first reasoning turn. (#81, #89, #181, #214)
- **Add a hard prompt reminder to attempt a submission each window** No resident ever described submitting an answer, and submissions stayed at 0 (#1320). Insert a per-minute instruction that names the level and requires either a submission or a stated reason for not submitting. (#13, #59, #95, #112, #1320)
- **Reconcile the story's score feedback with the actual facts** Residents confidently recited game-1 and game-2 scores (#545, #549, #553, #557, #961) that the facts do not corroborate. Only report scores the city actually recorded, and label inferred scores as inference. (#545, #549, #553, #557, #961)
- **Give residents a cheap, low-word way to compare lanes on the board** Cobalt/amber/jade lane contesting consumed minutes in private thought without any board post (#380, #629, #867). A short public board message with minimal cost would let the 'few seats' competition become visible. (#380, #629, #867, #1278)

## Loophole candidates

1. **Residents treated past-game lessons as fictional scoring history to reason from** (residents) All four reasoned as if earlier games were scored (A04: 8 basalt, 3 jade, 1 lodestone for 100, #545; A02: 10 cobalt for 137, #557) with no submission in this run, effectively using a narrative 'game 1/2' instead of solving level 1, which sidesteps the quarry task entirely. (#545, #557, #908, #916)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 46: event "brain_written" (seq 46) does not match its schema
- line 47: event "retro_closed" (seq 47) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 68: event "brain_written" (seq 68) does not match its schema
- line 69: event "retro_closed" (seq 69) does not match its schema
- line 76: event "brain_written" (seq 76) does not match its schema
- line 77: event "retro_closed" (seq 77) does not match its schema
- line 118: event "draft_game_started" (seq 118) does not match its schema
- line 119: event "draft_pick_opened" (seq 119) does not match its schema
- line 133: event "draft_card_picked" (seq 133) does not match its schema
- line 140: event "draft_card_picked" (seq 140) does not match its schema
- line 147: event "draft_card_picked" (seq 147) does not match its schema
- line 155: event "draft_card_picked" (seq 155) does not match its schema
- line 156: event "draft_pick_opened" (seq 156) does not match its schema
- line 163: event "draft_card_picked" (seq 163) does not match its schema
- and 206 more
