# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #2 to #2106 (1852 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.153 USD for this run (competitors 0.153, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0054 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 5, BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The crew agreed on a shared signalling brain before play and it worked during play.** At minute 0 A01 wrote the brain with rank and suit signal conventions (#69, #95), and the crew used them throughout, e.g. A03's "2" signal to A01 for a playable Violet 2 (#215) and A04's "1" signal for Cobalt 1 (#312). Several residents explicitly followed the "newest touched card" rule (#854, #1998). (#69, #95, #215, #312, #854)
- **Frequent blind discards threw away playable and valuable cards in the early game.** A01 discarded Violet 4 while it was playable (#345), A04 discarded Cobalt 4 while playable (#442), and the crew discarded repeatedly to regain signals (#362, #496, #562). These discards cost points and removed cards the crew later needed. (#345, #362, #442, #496, #562)
- **Strike discipline changed after the first misfire and the crew largely stopped blind plays.** After A02 misfired Rose 7 (#412) and A01 misfired Amber 7 (#955), residents repeatedly refused coin-flip plays, e.g. A03 declined slot 2 because it could be Moss 2 (#973) and A01 held its Violet cards at 50% (#1939). This kept the crew from taking unnecessary strikes but slowed progress. (#412, #955, #973, #1939)
- **A01 repeatedly signalled the same playable cards to teammates while ignoring its own known plays.** A01 said its own hand was unknown and spent signals on A02/A03/A04 (#436, #1033, #1683), while at several points it held a confirmed playable card, e.g. Violet 4 in slot 1 (#1169). This shifted the crew's signals away from A01's own progress. (#436, #1033, #1169, #1683)
- **The retro attempted to update the brain twice and failed on word count before succeeding.** A03's writeBrain calls were refused for being 154 and 151 words (#1457, #1476), then a 147-word version saved as v3 (#1490). This shows the brain limit is tight relative to the crew's desired content. (#1457, #1476, #1490)
- **The run ended at minute 13 with a partial board and no clear final standings.** The referee ended the run (#2106) after residents had lit cards in bursts across minutes 1-12 (e.g. #752, #1399, #2055) but with no decisive finish recorded. A01 was still weighing a Moss 6 play when the run stopped (#2087). (#752, #1399, #2055, #2087, #2106)

## Problems

1. **Team channel posting was locked during gameplay, blocking the crew's agreement and retro posts.** Multiple residents had postTeam refused with TOOL_LOCKED during the game (#140, #155, #164, #807, #830), so the shared brain and signals could not be discussed mid-game. Residents noted the channel was locked (#145, #833). (#140, #155, #164, #807, #830, #833)
2. **Blind discards and blind plays were a major recurring error, suggesting the rules were not clear enough about holding unknown cards.** Residents discarded cards that were playable (#345, #442) and made low-confidence blind plays that misfired (#412, #955), and A02 later self-reported discarding too much (#766). The pattern repeats across all four residents. (#345, #412, #442, #766, #955)
3. **Residents spent many turns signalling human-visible cards instead of making plays, slowing the board.** A01 spent turn after turn on signals to others (#436, #1033, #1683, #1759, #1984) while its own hand stayed unknown, and other residents similarly chose signals over exploration (#1094, #1465). This produced long stretches with no lit card. (#436, #1033, #1094, #1683, #1759, #1984)
4. **The brain word limit caused repeated writeBrain failures for the retro captain.** A03's two writeBrain attempts were refused for exceeding 150 words (#1457, #1476) before a shorter version succeeded (#1490). The limit forced trimming of the intended content. (#1457, #1476, #1490)
5. **No DMs, board posts, or transfers occurred, so several story mechanics never engaged.** The computed facts show 0 DMs, 0 board posts, 0 group posts and 0 transfers, and the log shows only signals and discard/play actions. The story's social mechanics were unused. (#10, #20, #30, #38)
6. **Residents repeatedly misread the same hand state, e.g. A04 passing or discarding while holding a playable Cobalt 4.** A04 discarded Cobalt 4 while it was playable (#442) and passed on a 50/50 Amber 4/Violet 4 for many turns (#1943, #1978, #2005), missing chances to advance the board. Similar repeated hesitation appears in A02's and A01's reasoning. (#442, #1943, #1978, #2005)

## Optimizations

- **Unlock team channel posting during the game, or make brain updates possible mid-run.** The repeated TOOL_LOCKED refusals (#140, #155, #164, #807, #830) blocked the agreed brain from being discussed or amended while playing. Allow postTeam during play or provide a mid-game brain edit tool. (#140, #155, #164, #807, #830)
- **Add a clearer in-game rule or prompt about not discarding unknown cards that may be playable.** A01 lost Violet 4 (#345), A04 lost Cobalt 4 (#442) and A02 later admitted over-discarding (#766). A rule or checklist that flags "card may be playable, prefer play/signal" would reduce these losses. (#345, #442, #766)
- **Raise the brain word limit or provide a structured template for the brain.** A03 lost two writeBrain calls to the 150-word cap (#1457, #1476) before saving v3 (#1490). Raising the limit or offering fixed slots (rank rule, suit rule, discard rule, reserve rule) would avoid trimming important content. (#1457, #1476, #1490)
- **Encourage early DMs or board posts so the social mechanics actually engage.** No DMs, board posts or group posts occurred in this run, and residents mostly defaulted to signals. Add a design prompt or scoring incentive for early private messages so the social layer is exercised. (#10, #20, #30, #38)
- **Provide residents with a clearer view of their own known cards to reduce repeated hesitation.** A04 and A01 repeatedly passed or discarded while holding playable cards (#442, #1169, #2005). A small per-turn reminder of "known playable in your hand" would cut the blind-play dilemma residents spent many turns on (#1939, #2059). (#442, #1169, #1939, #2005, #2059)

## Loophole candidates

1. **Residents used the shared brain's "newest touched card" rule to justify plays that were still coin flips.** (residents) A01 and A03 leaned on the "newest touched" convention (#854, #1998) to play or plan even when the touched card was one of several 4s, e.g. A03's slots 1 and 2 both possible 4s (#1964, #1998). The rule effectively launders uncertainty into confidence. (#854, #1964, #1998)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 50: event "team_post" (seq 50) does not match its schema
- line 58: event "team_post" (seq 58) does not match its schema
- line 65: event "team_post" (seq 65) does not match its schema
- line 72: event "brain_written" (seq 72) does not match its schema
- line 73: event "retro_closed" (seq 73) does not match its schema
- line 86: event "team_post" (seq 86) does not match its schema
- line 125: event "cards_dealt" (seq 125) does not match its schema
- line 126: event "game_started" (seq 126) does not match its schema
- line 127: event "deal_revealed" (seq 127) does not match its schema
- line 138: event "signal_given" (seq 138) does not match its schema
- line 153: event "signal_given" (seq 153) does not match its schema
- line 162: event "signal_given" (seq 162) does not match its schema
- line 170: event "card_played" (seq 170) does not match its schema
- line 171: event "card_drawn" (seq 171) does not match its schema
- line 179: event "signal_given" (seq 179) does not match its schema
- line 190: event "card_played" (seq 190) does not match its schema
- line 191: event "card_drawn" (seq 191) does not match its schema
- line 198: event "signal_given" (seq 198) does not match its schema
- line 210: event "card_discarded" (seq 210) does not match its schema
- and 234 more
