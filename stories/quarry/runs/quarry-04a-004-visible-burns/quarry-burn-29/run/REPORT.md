# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `quarry-burn` |
| Seed | 29 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1247 (1035 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.034 USD for this run (competitors 0.034, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 wins two straight games by hoarding jade into a wild lodestone.** A01 took jade from its first pick in game 1 (#155) and built a seven-card jade run in game 2, finishing at 119 with nine jade plus a lodestone (#894). That hoarding pattern is the clearest scoring strategy shown this run. (#155, #772, #894)
- **A04 wins game 1 with a deep basalt stack.** A04 committed to basalt early (#140) and reported 74 points and first place at game 1's end, ahead of A03 (66) and A01/A02 (58 each) (#440, #470). (#140, #440, #470)
- **A03's brain write is blocked by the word limit.** A03 tried to save its revised brain after game 1 and was refused with BRAIN_TOO_LONG at 167 words against a 150 limit (#481). It then rewrote and reported saving version 2 later (#506). (#481, #506)
- **Residents repeatedly burn cards to deny rivals instead of scoring.** Burning costs no points and residents used it as a denial tool: A02 planned to burn C9 (#524), C2 (#718) and C3 (#1014); A01 burned the second lodestone to keep it from A04 (#1108). (#524, #718, #1014, #1108)
- **All residents misjudge the lock state and waste turns on viewTable.** In every game transition residents called viewTable or waited because pick was locked (#84, #90, #496, #742, #1095, #1137). This consumed early-turn capacity each round. (#84, #90, #496, #742, #1095)
- **A01 reports an unresolved doubt about whether its game-3 pick landed.** At the end of game 3 A01 said the pack looked nearly empty and it was unsure its pick had gone through, while still reporting jade 8 plus a lodestone (#1235, #1236). (#1235, #1236)

## Problems

1. **Every resident stalls with zero submissions for the whole run.** The facts show 0 correct and 0 wrong submissions, all four residents stuck on level 1 for minutes 0-12, and 13 quiet minutes with no submission. Whatever the pick/burn interface was, it never produced a scored submission the harness counted. (#99, #111, #1236)
2. **The brain word limit silently blocks strategy updates.** A03's writeBrain was refused at 167 words against a 150-word limit (#481), costing it a turn and forcing a rewrite. The limit is not surfaced in a way residents anticipate. (#481, #506)
3. **Residents repeatedly misread the phase and the locked tools.** Residents at nearly every transition assumed the game had not started or had ended and called viewTable (#84, #496, #742, #1095, #1137). Much of each round's early capacity went to checking state rather than playing. (#84, #496, #742, #1095, #1137)
4. **Burn mechanics reward non-scoring denial play.** Because burns cost nothing and are capped only by count, residents spent them to deny rivals rather than build sets (#524, #718, #1108). This shifts optimal play toward hurting others instead of the quarry-building the story intends. (#524, #718, #1108)
5. **Residents cannot see each other's stacks, so burns are speculative.** A03 explicitly noted it did not know rivals' stacks and held off burning (#1080), yet others burned blindly based on guesses about who would receive the pack (#1108). Denial decisions rest on unverifiable assumptions. (#1080, #1108)
6. **A01 cannot confirm its final pick was applied.** A01 ended game 3 unsure whether its pick went through and saw a near-empty pack (#1235). Without confirmation, residents cannot reliably close out their last round. (#1235, #1236)

## Optimizations

- **Surface the pick/burn lock state and phase in the prompt before the turn starts.** Residents burned turns calling viewTable to learn whether the game had opened or ended (#84, #496, #742, #1095). Push the phase and available tools into the turn prompt so no turn is spent discovering them. (#84, #496, #742, #1095)
- **State the brain word limit and length before writeBrain.** A03 lost a turn to BRAIN_TOO_LONG at 167 words against 150 (#481). Show the current word count and the limit in the writeBrain prompt, or auto-truncate. (#481)
- **Give residents a view of rivals' visible stacks to make burns informed.** A03 admitted it could not see rivals' stacks when deciding whether to burn (#1080). Provide an opponents' quarry summary so denial decisions are grounded rather than guessed. (#1080, #1108)
- **Confirm each pick in the turn result so residents know it applied.** A01 ended the last game unsure its pick had gone through (#1235). Return an explicit confirmation of the picked and burned cards after each turn. (#1235, #1236)
- **Make burns cost something so play focuses on building sets.** Free burns drove denial-focused play (#524, #718, #1014, #1108) instead of quarry-building. Attaching a small cost or limiting burns per game would steer residents back to scoring. (#524, #718, #1014, #1108)
- **Reconcile scored games with the submission counter.** Residents report clear game results (74, 119, 60, 56 points; #440, #894, #916) yet the harness counts 0 submissions and no level-ups. The pick/burn outcomes are not being recorded as scored submissions; align the two. (#440, #894, #916)

## Loophole candidates

1. **Free burns let residents deny rivals at no scoring cost.** (residents) Residents used zero-cost burns purely to keep strong cards from opponents (A02 burning C2 and C3, A01 burning the second lodestone; #718, #1014, #1108). The mechanic can be used against its purpose of shaping the quarry. (#718, #1014, #1108)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 45: event "brain_written" (seq 45) does not match its schema
- line 46: event "retro_closed" (seq 46) does not match its schema
- line 52: event "brain_written" (seq 52) does not match its schema
- line 53: event "retro_closed" (seq 53) does not match its schema
- line 59: event "brain_written" (seq 59) does not match its schema
- line 60: event "retro_closed" (seq 60) does not match its schema
- line 66: event "brain_written" (seq 66) does not match its schema
- line 67: event "retro_closed" (seq 67) does not match its schema
- line 113: event "draft_game_started" (seq 113) does not match its schema
- line 114: event "draft_pick_opened" (seq 114) does not match its schema
- line 122: event "draft_card_picked" (seq 122) does not match its schema
- line 129: event "draft_card_picked" (seq 129) does not match its schema
- line 136: event "draft_card_picked" (seq 136) does not match its schema
- line 143: event "draft_card_picked" (seq 143) does not match its schema
- line 144: event "draft_pick_opened" (seq 144) does not match its schema
- line 151: event "draft_card_picked" (seq 151) does not match its schema
- and 192 more
