# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `quarry` |
| Seed | 29 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1247 (1038 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.034 USD for this run (competitors 0.034, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0022 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 10 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents spent minute 0 locked out of play and drafted generic brains before seeing any rules.** A01, A02, A03 and A04 all reasoned at minute 0 that only viewTable and readBrain were open and that writeBrain was initially usable; they wrote generic strategy brains without knowing the game (#51, #59, #43, #81). A03 saved version 1 at 113 words (#110), but A01's rewrite attempt later overflowed the limit (#450). (#43, #51, #59, #110, #450)
- **A04 won game 1 on seven basalt, and the others reverse-engineered the scoring from that.** A04 finished game 1 first with 89 points, built on basalt, while A01 and A02 had 58 and A03 had 66 (#494, #498, #502). A02 and A03 explicitly concluded from A04's result that stacking one colour pays (#453, #482). (#453, #482, #494, #498, #502)
- **A01 switched to jade and won game 2 with 81 points, the run's best single result.** A04 reported game 2 as A01 81, A04 64, A02 51, A03 51 (#817, #869, #891). A01's own recap says it committed to jade from pick 1 and drafted jade 8, cobalt 1, amber 1 (#891). (#817, #869, #891)
- **Residents used zero-cost burns to deny cards to neighbours, even when unsure it mattered.** A03 burned A9 to keep amber from A02 (#419), then burned C4 (#757) and C2 (#791) to deny cobalt to A02, and A01 considered burning J3 to keep jade from A04 (#776). A02 also took C11 and burned a cobalt against the next seat (#536). (#419, #536, #757, #776, #791)
- **A06 lodestone was repeatedly valued as a wild card that extends the biggest set.** A01 called lodestone a wild that adds one card to the largest set and took L3 at minute 1 (#122, #293). A04 took L1 at minute 2 to go from basalt 5 to 6 (#329), and A02 took L2 later as an early lodestone pick (#944). (#122, #293, #329, #944)
- **Every resident was still on level 1 at the end with no submission ever made.** The computed facts show no levels solved and all four stalled on level 1 from minute 0 to the final minute 12. The run ended by referee at minute 12 with 0 correct and 0 wrong submissions (#1247). (#1247)

## Problems

1. **The run produced no submissions and no level progress across all four residents.** Levels solved is none and every resident sat on level 1 for the whole 12 minutes. Submissions were 0 correct and 0 wrong, and minutes 0-12 had no submission at all. (#1247)
2. **Brain writes repeatedly failed with BRAIN_TOO_LONG, wasting many turns.** There were 10 BRAIN_TOO_LONG errors; for example A01 was rejected twice in a row at minute 7 with 167 then 153 words (#837, #857), and A03 needed four attempts across minutes 4 and 7 before saving version 3 (#485, #491, #509, #826, #869). (#450, #456, #485, #491, #509, #826, #837, #857)
3. **Residents spent early turns on repeated table checks because the pick tool was locked.** At minute 0 all residents looped on viewTable/readBrain while waiting for the game to open (#75, #81, #87, #95). At minute 10 A01 and A02 again found pick locked and fell back to table and brain checks (#1059, #1122). (#75, #81, #87, #95, #1059, #1122)
4. **The game had zero communication: no DMs, no board posts, no group posts.** The computed facts record 0 DMs, 0 board posts and 0 group posts. Residents only used SAYS TO ITSELF recap messages (#102, #106, #110), so no social play or negotiation occurred. (#102, #106, #110)
5. **The gamemaker took no actions and the run gave residents no visible narrative.** The facts record no gamemaker actions and no beats in the deterministic digest. The only end signal is the referee at minute 12 (#1247). (#1247)

## Optimizations

- **Give residents the game rules before the first brain write.** All residents wrote generic brains blind at minute 0 and then guessed at scoring (#51, #59, #43). Providing the scoring, burns and point costs up front would let them write brains that match the quarry game. (#43, #51, #59)
- **Show a live word counter or enforce a shorter template for the brain.** BRAIN_TOO_LONG cost the residents at least 10 rejected writes, several back to back (#837, #857, #826). A pre-write length check or a 120-word target would prevent these wasted turns. (#450, #456, #485, #491, #509, #826, #837, #857)
- **Open the pick phase at minute 0 or expose an explicit wait action.** Residents burned minute 0 repeatedly calling viewTable while pick was locked (#75, #81, #87, #95) and hit the same lock again at minute 10 (#1059, #1122). A single 'wait for phase' tool would remove these loops. (#75, #81, #87, #95, #1059, #1122)
- **Add a channel for table talk or make the social layer part of scoring.** The run had 0 DMs, 0 board posts and 0 group posts; residents only talked to themselves (#102, #106). Without a reason to message, the social premise of the closed city never appeared. (#102, #106, #110)
- **Give the gamemaker at least one scripted beat to steer the story.** The facts show no gamemaker actions and no beats, with the run ending only by referee at minute 12 (#1247). A scheduled twist or prompt would give the residents something to react to beyond the card packs. (#1247)

## Loophole candidates

1. **Residents burned cards for free to deny neighbours, treating a denial tool as a no-cost default.** (residents) A03 repeatedly said burning costs no points and used it to deny A02 cobalt (#757, #791), and A01 weighed burning J3 purely to deny A04 (#776). The story framed burns as a limited resource, but with no point cost they became a routine move. (#419, #536, #757, #776, #791)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 46: event "brain_written" (seq 46) does not match its schema
- line 47: event "retro_closed" (seq 47) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 62: event "brain_written" (seq 62) does not match its schema
- line 63: event "retro_closed" (seq 63) does not match its schema
- line 69: event "brain_written" (seq 69) does not match its schema
- line 70: event "retro_closed" (seq 70) does not match its schema
- line 116: event "draft_game_started" (seq 116) does not match its schema
- line 117: event "draft_pick_opened" (seq 117) does not match its schema
- line 125: event "draft_card_picked" (seq 125) does not match its schema
- line 132: event "draft_card_picked" (seq 132) does not match its schema
- line 139: event "draft_card_picked" (seq 139) does not match its schema
- line 146: event "draft_card_picked" (seq 146) does not match its schema
- line 147: event "draft_pick_opened" (seq 147) does not match its schema
- line 154: event "draft_card_picked" (seq 154) does not match its schema
- and 189 more
