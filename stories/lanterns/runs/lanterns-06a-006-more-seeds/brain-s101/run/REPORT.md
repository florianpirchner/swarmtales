# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns` |
| Seed | 101 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 19 (referee) |
| Counted | events #3 to #2483 (2201 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 19 minutes (to the end); A02 on level 1 from minute 0 for 19 minutes (to the end); A03 on level 1 from minute 0 for 19 minutes (to the end); A04 on level 1 from minute 0 for 19 minutes (to the end); A05 on level 1 from minute 0 for 19 minutes (to the end); A06 on level 1 from minute 0 for 19 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.098 USD for this run (competitors 0.098, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0047 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 20 of 20 minutes without a submission; longest without one: minutes 0-19 (20) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 7 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All six residents spent the first minute writing the team brain instead of playing.** A01, A03, A04, A05 and A06 all reasoned about who would write the brain and the 8-post limit before any clue existed (#74, #87, #98, #106, #114). A01 reported the brain saved at 153 words (#122) while A05 held three additions back because writeBrain was locked (#148, #155). (#74, #87, #98, #148, #155)
- **The residents coordinated roles through chat claims rather than city mechanics.** Residents repeatedly assigned themselves keeper, caller and seeker roles from messages (#231, #831, #946, #1524) and treated unverified claims as suspect (#249). The city recorded no DMs, board posts or group posts, so this coordination rested entirely on in-game chat that the digest could not verify. (#231, #249, #831, #1524)
- **A03 and A02 kept giving advice that pointed at shadow and fog words.** A03 advised guessing pepper for the red clue (#1159) while A02, as keeper, privately knew pepper was a shadow and could not warn anyone (#1168, #1169). A01 followed the advice and lost 3 points (#1189, #1213). Later A06 advised coral (#2171) while keeper A04 knew coral was amber (#2176, #2177). (#1159, #1168, #1189, #1213, #2171, #2176)
- **Seekers held back on unconfirmed second guesses and gave up points.** A01 waited several minutes for keeper A03 to confirm the two targets of the sea clue (#1541, #1557, #1572) and then guessed dolphin alone. On the man clue A01 stopped after ferry rather than guess sword without confirmation (#1865). (#1541, #1557, #1572, #1865)
- **Every retro failed to save the new brain because it was over the word limit.** A03 and A06 were refused with BRAIN_TOO_LONG at 210 and 236 words in minute 8 (#1352, #1370), A06 and A03 again at 207 and 213 in minute 9 (#1388, #1406), and A01 and A04 at 244 and 212 in minute 14 (#1988, #1997). Only after several rewrites did v3 and v4 save (#1443, #2061). (#1352, #1370, #1388, #1406, #1443, #1988, #1997, #2061)
- **The run ended at minute 19 with the game still undecided.** At minute 18 amber was one hidden word from finishing and teal still had cloud, shark and engine hidden (#2464). A03 advised the final spider guess (#2470) and A02 was weighing it (#2474) when the referee ended the run (#2483), so no level or game was recorded as solved. (#2464, #2470, #2474, #2483)

## Problems

1. **Residents never submitted a single clue or guess through a counted mechanism.** The computed facts show 0 submissions, 0 correct and 0 wrong across 20 minutes, and every resident stalled on level 1 from minute 0 to 19. Whatever guessing happened, the city did not record it as a submission, so the standings are unknown. (#3, #2483)
2. **The brain word limit blocked the retro loop six times in a row.** The 200-word cap refused A03, A06, A01 and A04 repeatedly (#1352, #1370, #1388, #1406, #1988, #1997), consuming retro turns on trimming instead of play. Residents even trimmed to fit and then had to re-check the saved state (#1421, #1443). (#1352, #1370, #1388, #1406, #1421, #1988, #1997)
3. **The keeper cannot talk during the game, which broke the confirmation rule the team wrote.** The team's brain required seekers to ask the keeper before a first guess (#1529), but keepers were locked out of chat (#646, #875, #1168, #2241). A01 burned minutes waiting for an answer that could never come (#1541, #1557). (#646, #875, #1168, #1529, #1541, #1557)
4. **Seekers acted on advice that the keeper knew was wrong and could not correct.** A02 privately recorded that A03's pepper advice would cost 3 points (#1168, #1169) and A04 privately recorded that A06's coral advice would give amber a point (#2176, #2177). In both cases the advice was followed (#1189, #2182), so the private knowledge was useless. (#1168, #1169, #1189, #2176, #2177, #2182)
5. **The 8-post team limit and message budget pushed residents toward silence.** A05, A06 and A03 all weighed whether a post was worth one of their 8 (#106, #114, #739), and several turns ended with residents deciding not to post at all (#159, #406, #979). The city recorded 0 messages overall, so the chat channel did not function as the story assumed. (#106, #114, #159, #406, #739, #979)
6. **No gamemaker actions and no labels left the run without narrative steering.** The computed facts show the gamemaker took no actions and no labels were applied. The only structural events are the referee start and the referee end at minute 19 (#2483), so nothing in the run pushed the story toward a resolution. (#2483)

## Optimizations

- **Raise or auto-trim the brain word limit before the retro window opens.** Six refusals in minutes 8, 9 and 14 wasted retro turns (#1352, #1370, #1388, #1406, #1988, #1997). Either raise the 200-word cap, or have the tool return a trimmed suggestion so the writer can accept it in one call. (#1352, #1370, #1388, #1406, #1988, #1997)
- **Let the keeper answer a confirmation question during the game.** The team's own rule told seekers to ask the keeper first (#1529), but keepers were chat-locked (#646, #875) and A01 stalled waiting (#1557, #1572). Add a one-line keeper reply channel, or delete the confirmation rule from the brain template. (#646, #875, #1529, #1557, #1572)
- **Make the clue and guess actions produce counted submissions.** The run shows 0 submissions despite many guesses being reasoned about (#1189, #1822, #2252, #2428). Check that the guess tool is actually wired to the submission counter, or the standings will stay unknown every run. (#1189, #1822, #2252, #2428)
- **Give the keeper a way to warn about shadow and fog words.** A02 and A04 both held private knowledge that advice was wrong and could not act (#1168, #2176). A limited keeper hint, or a pre-game list of shadow words shared with the team, would stop the repeated 3-point losses (#1189, #2182). (#1168, #1189, #2176, #2182)
- **Shorten or remove the retro phase so play time is not eaten by process.** Retros occupied minutes 4, 8, 9, 14 and 15 (#747, #1342, #2015, #2061) out of only 20 minutes total. Cap the retro to a single brain write per game so the race the story is about actually happens. (#747, #1342, #2015, #2061)
- **Add a time check before the referee cutoff.** The run ended mid-guess at minute 19 with amber one word from finishing (#2474, #2483). A short warning at minute 17 would let residents drop the confirmation step and finish the game. (#2474, #2483)

## Loophole candidates

1. **Seekers treated private keeper knowledge as unavailable and guessed blind anyway.** (residents) A01 guessed pepper on A03's advice even though the keeper held the answer (#1189), and A05 guessed coral on A06's advice (#2182). The role split made a cheaper blind guess the normal path, defeating the brain's confirmation rule (#1529). (#1189, #1529, #2182)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 70: event "team_post" (seq 70) does not match its schema
- line 77: event "team_post" (seq 77) does not match its schema
- line 83: event "team_post" (seq 83) does not match its schema
- line 91: event "brain_written" (seq 91) does not match its schema
- line 92: event "retro_closed" (seq 92) does not match its schema
- line 94: event "team_post" (seq 94) does not match its schema
- line 101: event "brain_written" (seq 101) does not match its schema
- line 102: event "retro_closed" (seq 102) does not match its schema
- line 109: event "team_post" (seq 109) does not match its schema
- line 117: event "team_post" (seq 117) does not match its schema
- line 131: event "team_post" (seq 131) does not match its schema
- line 162: event "team_post" (seq 162) does not match its schema
- line 187: event "clue_game_started" (seq 187) does not match its schema
- line 188: event "clue_key_dealt" (seq 188) does not match its schema
- line 201: event "clue_given" (seq 201) does not match its schema
- line 202: event "clue_intent" (seq 202) does not match its schema
- line 240: event "team_post" (seq 240) does not match its schema
- line 242: event "clue_word_revealed" (seq 242) does not match its schema
- and 262 more
