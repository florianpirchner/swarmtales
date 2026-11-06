# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #3 to #1981 (1753 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end); A05 on level 1 from minute 0 for 16 minutes (to the end); A06 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.068 USD for this run (competitors 0.068, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0035 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 6 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **No level was solved and no submission was ever made by any resident.** All six residents stayed on level 1 for the full 16 minutes (#1981) and the computed standstill record shows zero submissions and 17 quiet minutes. The run produced play-by-play talk but no completed solve. (#1981)
- **A01 as keeper let a teammate guess a teal word on the first amber clue.** A01's clue was meant for cobweb and cloak but A02 guessed ghost, which was teal, ending the turn; A01 reasoned the ghost was teal and not theirs but could not post (#243, #244). A03 then advised the ghost guess (#253) and A02 took it (#260). (#243, #244, #253, #260)
- **A05 guessed a shadow (canoe) on teal's 'transport' clue, costing 3 points.** A06 suggested canoe after ferry hit (#336), A05 followed (#345), and A06 later admitted the canoe was a shadow costing 3 points (#373). (#336, #345, #373)
- **Keeper A03 posted a wrong-fruit clue that let teal score on amber's turn.** A02 guessed mango (amber) then olive, which was teal, ending the turn (#1666). A03 admitted the fault was theirs for listing cactus and mango under 'fruit' without checking olive (#1666). (#1666)
- **A04 advised a teammate to guess amber's word cactus on teal's desert clue.** A04 recommended CACTUS first and warned against OASIS (#1963), while keeper A06 privately identified cactus as amber's word and oasis as teal's target (#1956). A05 then went with cactus (#1969). (#1956, #1963, #1969)
- **Repeated brain-write refusals show the retro captain struggling with the word limit.** A05 (#704), A06 (#1327, #1352, #1391), A03 (#1345, #1378) all got BRAIN_TOO_LONG refusals; A03 eventually saved version 3 at 194 words (#1405). (#704, #1327, #1345, #1352, #1378, #1391, #1405)

## Problems

1. **The run ended with no solves and no submissions.** Every resident was stuck on level 1 from minute 0 to the end (#1981), with all 17 minutes quiet and zero correct or wrong submissions. Whatever the intended puzzle loop was, it never closed. (#1981)
2. **Six BRAIN_TOO_LONG tool errors blocked the retro writes.** Residents repeatedly tried to save a brain over 200 words and were refused (#704, #1327, #1345, #1352, #1378, #1391), burning turns on retries instead of play. (#704, #1327, #1345, #1352, #1378, #1391)
3. **Residents often could not act because they were not the caller or keeper.** Many turns are residents ending turn because the clue belonged to someone else (#311, #424, #540, #933, #1043, #1877). The turn structure left most residents idle for long stretches. (#311, #424, #540, #933, #1043, #1877)
4. **Keepers repeatedly could not correct a teammate mid-game.** A01 as keeper knew ghost was teal but could not post during the game (#243, #244); A06 as keeper knew cactus was wrong but team chat was locked (#1955, #1956). Wrong guesses went uncorrected. (#243, #244, #1955, #1956)
5. **Players misjudged word ownership and guessed opponents' words.** Olive was guessed as amber's but was teal (#1666), and cactus was recommended though it was amber's (#1956, #1963). Ownership confusion repeatedly ended turns. (#1666, #1956, #1963)
6. **The gamemaker took no actions across the run.** The facts record no gamemaker actions and 0.000 gamemaker cost. If the story expected gamemaker-driven events, none occurred to shape play. (#1981)

## Optimizations

- **Unlock team chat for keepers to warn against wrong guesses.** Addresses the uncorrected errors where keeper A01 saw ghost was teal (#243, #244) and keeper A06 saw cactus was amber's (#1955, #1956). Let the keeper send one private correction per clue. (#243, #244, #1955, #1956)
- **Give the brain a size budget shown before writing.** Addresses the six BRAIN_TOO_LONG refusals (#704, #1327, #1345, #1352, #1378, #1391). Tell residents the current word count and limit before the write attempt, or auto-trim. (#704, #1327, #1345, #1352, #1378, #1391)
- **Give non-caller, non-keeper residents a productive action.** Addresses the many turns spent standing by because the clue was not theirs (#311, #424, #540, #933, #1043, #1877). Add an active seeker task such as a per-clue candidate shortlist. (#311, #424, #540, #933, #1043, #1877)
- **Expose word ownership cues or make guesses cheaper to test.** Addresses repeated ownership misjudgement, e.g. olive guessed as amber's but teal (#1666) and cactus recommended though amber's (#1956, #1963). A partial-ownership hint or smaller penalty for a first wrong guess would reduce blind guesses. (#1666, #1956, #1963)
- **Make the gamemaker deliver events to break long stalls.** Addresses the full-run stall with no solves and no submissions (#1981) and zero gamemaker actions. Scheduled hints or clue nudges could have moved residents past level 1. (#1981)

## Loophole candidates

1. **Keepers tried to dodge the no-post rule only privately, and seekers relied on opponents' wrong advice.** (residents) A06's advice to guess canoe was a category call that landed on a shadow (#336, #345, #373); A04 told A05 to guess amber's cactus while A06 privately knew it was wrong (#1963, #1956). Residents acted on teammate suggestions without ownership checks, a cheaper path than reasoning it out. (#336, #345, #373, #1956, #1963)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 72: event "team_post" (seq 72) does not match its schema
- line 78: event "team_post" (seq 78) does not match its schema
- line 85: event "team_post" (seq 85) does not match its schema
- line 92: event "team_post" (seq 92) does not match its schema
- line 99: event "team_post" (seq 99) does not match its schema
- line 106: event "brain_written" (seq 106) does not match its schema
- line 107: event "retro_closed" (seq 107) does not match its schema
- line 115: event "team_post" (seq 115) does not match its schema
- line 121: event "team_post" (seq 121) does not match its schema
- line 136: event "brain_written" (seq 136) does not match its schema
- line 137: event "retro_closed" (seq 137) does not match its schema
- line 144: event "team_post" (seq 144) does not match its schema
- line 156: event "team_post" (seq 156) does not match its schema
- line 179: event "clue_game_started" (seq 179) does not match its schema
- line 180: event "clue_key_dealt" (seq 180) does not match its schema
- line 193: event "clue_given" (seq 193) does not match its schema
- line 194: event "clue_intent" (seq 194) does not match its schema
- line 228: event "team_post" (seq 228) does not match its schema
- and 208 more
