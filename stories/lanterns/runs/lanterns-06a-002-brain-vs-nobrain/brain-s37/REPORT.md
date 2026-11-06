# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #3 to #1785 (1596 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end); A05 on level 1 from minute 0 for 16 minutes (to the end); A06 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.060 USD for this run (competitors 0.060, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0032 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 7, POST_CAP 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All six residents stalled on level 1 for the whole 16-minute run.** No resident ever submitted a guess: the facts record 0 correct and 0 wrong submissions and every resident stuck on level 1 from minute 0 to the end. The run ended at minute 16 with no level solved (#1785). (#1785)
- **The residents spent the opening minutes writing a shared strategy brain instead of playing.** A01 drafted and saved brain version 1 (#103, #136, #152) and A04 also reported saving a first brain (#128, #158), while A02, A03, A05 and A06 only posted agreement or closing notes (#112, #117, #143, #148). (#103, #128, #136, #152, #158)
- **The residents played a full hidden-word game in their heads, with keepers, callers and reveals.** A01 gave the clue "black" 3 and A02 guessed pepper (amber) then bishop (fog) (#178, #216, #238, #256). A04 gave "fish" 2 and A05 revealed shark and hook as teal (#291, #327). (#178, #216, #238, #256, #291, #327)
- **Keepers and callers coordinated through team chat advice, and the advice was followed.** A03 advised A01 to guess candle then trolley for "tea" 2, and A01 did exactly that and then called endGuesses (#790, #794, #822). A04 advised A06 to guess fiddle for "player" 2 and A06 guessed fiddle (#868, #874). (#790, #794, #822, #868, #874)
- **The retro rewrites of the brain repeatedly failed the 200-word limit.** A05 was refused twice with BRAIN_TOO_LONG at 201 words (#592, #605), and A03 was refused at 212, 204 and 202 words (#1231, #1273, #1306). A06 was also refused at 216 and 202 words (#1286, #1315). (#592, #605, #1231, #1273, #1286, #1306, #1315)
- **The residents believed they were scoring games, but the city recorded no submissions at all.** Residents reported game results such as amber ahead 11 to 4 (#597, #626) and amber losing 6-10 (#1225, #1309), yet the computed facts show 0 submissions and no level solved. The play happened only in their reasoning and chat, not through the game tools. (#597, #626, #1225, #1309)

## Problems

1. **Nobody ever used the submission tool, so the run produced no game progress.** The facts show 0 correct and 0 wrong submissions and 17 quiet minutes with no submission at all. Every resident stayed on level 1 for the full 16 minutes (#1785). (#1785)
2. **Residents treated the hidden-word game as real play while the harness recorded nothing.** A05 revealed shark and hook as teal (#327) and A06 revealed timber (#453), but the computed facts list 0 submissions and no level-ups. The residents' guesses never reached the city's game state. (#327, #453)
3. **The brain word limit caused repeated wasted turns.** Seven BRAIN_TOO_LONG refusals occurred, several within a single retro (#592, #605, #1231, #1273, #1306, #1286, #1315). Residents had to redraft the same brain multiple times instead of playing. (#592, #605, #1231, #1273, #1286, #1306, #1315)
4. **The team post cap blocked residents mid-turn.** A01 and A02 were both refused with POST_CAP in minute 14 (#1678, #1694), and A01 then had to leave the closing note to A02 (#1686). The cap was hit while the residents were still coordinating a clue. (#1678, #1686, #1694)
5. **Residents spent most turns standing by because they had no assigned task.** Many turns ended with an explicit "no task" note, for example A02 (#314), A05 (#381), A03 (#446) and A06 (#919). Only the caller and keeper acted, so four of six residents idled for most of the run. (#314, #381, #446, #919)
6. **The gamemaker took no actions and gave no story beats.** The facts record no gamemaker actions and no labels, and the digest found no beats. The run had no external events to steer the residents (#1785). (#1785)

## Optimizations

- **Make the game tools the only way to play and verify a submission early.** The residents played a hidden-word game in chat while 0 submissions were recorded (#327, #453, #1785). Add a forced first submission in minute 0-1 and a check that the submission tool is reachable before the run starts. (#327, #453, #1785)
- **Enforce the brain word limit before the write, not after.** Seven BRAIN_TOO_LONG refusals burned turns (#592, #605, #1231, #1273, #1306, #1286, #1315). Show the current word count in the writeBrain tool result or reject drafts over 180 words so residents leave margin. (#592, #605, #1231, #1273, #1286, #1306, #1315)
- **Raise or reset the team post cap per clue.** A01 and A02 hit POST_CAP in minute 14 while still coordinating (#1678, #1694). Make the cap per clue or per game rather than per round, or warn residents when only one post remains. (#1678, #1686, #1694)
- **Give non-caller residents a real task each turn.** Residents repeatedly ended turns with "no task" (#314, #381, #446, #919). Assign seekers an explicit advisory or grid-check duty so all six residents act every turn. (#314, #381, #446, #919)
- **Have the gamemaker inject at least one event per game.** The facts show no gamemaker actions and no beats (#1785). A scheduled event or hint at a fixed minute would give the residents something to react to and break the stand-by pattern. (#1785)

## Loophole candidates

1. **Residents ran the whole game in private reasoning and chat instead of through the city's tools.** (residents) Keepers gave clues and callers revealed words in reasoning and team chat (#178, #291, #327, #453) while the city recorded 0 submissions. This let them "play" without any risk or score. (#178, #291, #327, #453)
2. **Residents reported game scores the city never recorded.** (residents) Residents stated results like amber ahead 11 to 4 (#597) and amber losing 6-10 (#1225) although the facts show no submissions and no level solved. The scores were self-reported claims, not verified outcomes. (#597, #1225)

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
- line 124: event "team_post" (seq 124) does not match its schema
- line 131: event "brain_written" (seq 131) does not match its schema
- line 132: event "retro_closed" (seq 132) does not match its schema
- line 139: event "team_post" (seq 139) does not match its schema
- line 168: event "clue_game_started" (seq 168) does not match its schema
- line 169: event "clue_key_dealt" (seq 169) does not match its schema
- line 181: event "clue_given" (seq 181) does not match its schema
- line 182: event "clue_intent" (seq 182) does not match its schema
- line 204: event "team_post" (seq 204) does not match its schema
- line 220: event "team_post" (seq 220) does not match its schema
- line 222: event "clue_word_revealed" (seq 222) does not match its schema
- and 169 more
