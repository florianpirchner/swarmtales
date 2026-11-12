# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns` |
| Seed | 79 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #3 to #2221 (1943 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end); A05 on level 1 from minute 0 for 16 minutes (to the end); A06 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.089 USD for this run (competitors 0.089, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0043 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 15, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both teams played coherent, conventional matches despite zero completed levels.** Residents set a shared brain v1 in minute 0 (#150, #160, #165, #169) and then played a long sequence of clue-and-guess turns: teal landed mitten on "glove" 1 (#308), amber's "floor" 2 hit carpet and marble (#451), and teal's "wheel" 2 found gear and ship (#955, #959). This shows the clue/guess game is playable and social even while the level track stalls. (#150, #308, #451, #955)
- **Amber's "light" 2 was ambiguous between torch and prism and cost the caller.** A01 wanted prism (#537, #538) but the caller A03 guessed torch then beacon (#515) and A02 advised beacon (#525). Torch landed, then the turn closed after the second guess was not amber (#750), showing how a two-count clue split between targets ends a turn. (#515, #525, #537, #750)
- **Amber's "fruit" 2 guessed a shadow word and lost points.** A02 gave "fruit" 2 for grape and cherry (#750) but A03 advised plum, which was revealed as shadow and ended the turn (#789, #810, #823). It is the clearest example of a teammate misread of a teammate's hidden targets. (#750, #789, #810, #823)
- **Teal won repeatedly with N=1 clues while amber overused N=2.** Teal's four single-count clues in game 3 ("space", "mammal", "bed", "pie") all hit (#1743), and game 2 also closed on four N=1 hits plus "wheel" 2 (#1224). Amber's "garden" 2 (#1316), "magic" 2 (#1519, #1520) and "pirate" 2 (#1645) all ended on a miss, and the retro lesson was recorded the same way (#1799). (#1224, #1316, #1519, #1645, #1743, #1799)
- **Residents reasoned about roles they did not hold and repeatedly contradicted their own assignment.** A02 said it was the keeper for amber while also describing itself as the caller's teammate (#725, #771), A03 called itself keeper while receiving a clue it had written (#1519), and A05 as the caller debated whether posting was forbidden (#1113). These role confusions consumed turns without producing guesses. (#725, #771, #1113, #1519)
- **Brain rewrites became a long loop of refusals over the 200-word limit.** A02 hit BRAIN_TOO_LONG at 222 and 206 words (#646, #684), A03 at 241 and 221 (#1159, #1192), A04 at 238, 221, 207, 204, 201 and 201 (#1750, #1782, #1811, #1844, #1857) and A01 at 209, 207, 204 (#1770, #1805, #1816). The final brain only landed after many wasted turns (#1879). (#646, #684, #1750, #1844, #1857, #1879)

## Problems

1. **The actual level game never started: all six residents stalled on level 1 for the whole run.** Facts show no submissions and no level-ups; the only city events are the game-1 to game-3 clue games and refusals. The story's competition for seats therefore never produced a single scored level, so the standings are unknown. (#1775, #2221)
2. **The brain word limit blocked every retro writer, and writers kept re-trying the same over-length text.** Seven BRAIN_TOO_LONG refusals in games 2 and 3 alone (#1750, #1782, #1805, #1811, #1816, #1822, #1844) ate several minutes that could have gone to play. Some writers resubmitted with only small cuts, suggesting the limit is not surfaced before submission. (#1750, #1782, #1805, #1811, #1816, #1822, #1844)
3. **Tool lockouts made agents give up with no explanation to the team.** A03 received TOOL_LOCKED when it tried writeBrain (#1775) and then simply ended its turn (#1785, #1786), while others guessed which teammate was the retro captain. No resident had an authoritative view of which tools were active, so turns were lost to guessing. (#1775, #1785, #1786)
4. **The closed team chat during the game contradicted the agents' own perceived task.** A01 reasoned that posting to team chat was forbidden during play (#537), yet several residents posted anyway (#262, #1342, #1962). This inconsistency made advisors either silent when they had useful information or noisy when posting was not supposed to exist. (#262, #537, #1342, #1962)
5. **Multiple residents believed they were the caller, keeper, or retro captain at the same time.** A02 described itself as amber keeper while waiting on the caller (#725), A05 as caller debated whether to post (#1113), and A03 denied being the retro captain while A01 and A04 both wrote the brain (#1786, #1799, #1879). None of these roles are shown to be assigned by the city in the log. (#725, #1113, #1786, #1799, #1879)

## Optimizations

- **Print the active tool set and the current role in the turn prompt.** Every TOOL_LOCKED and most role confusion could be avoided if the harness emitted the active tools and whether the agent is keeper, seeker, caller, or retro captain before the turn. Evidence of the confusion is #1775, #1786 and #725. (#725, #1775, #1786)
- **Enforce the brain limit in the drafting tool, not only at submission.** Show the writer the word count as it drafts and refuse only on final save. The seven BRAIN_TOO_LONG refusals in game 3 alone (#1750, #1782, #1811, #1844, #1857) show that writers could not see the limit until after writing. (#1750, #1782, #1811, #1844, #1857)
- **Make the level track visible and actionable during turns.** Residents reasoned about clue games for 16 minutes and made zero level submissions. The turn prompt should surface the current level puzzle and the submit tool whenever it is available, as no resident acted on a level at all (#189, #396, #1987 show only clue reasoning). (#189, #396, #1987)
- **Tell residents whether team chat is open during play.** Some agents believed posting was forbidden (#537) while others posted freely (#262, #1342). A single explicit rule line per turn, with postTeam shown or hidden accordingly, would remove the contradiction. (#262, #537, #1342)
- **Cap or de-duplicate repeated retro submissions.** The same 200-word brain was rewritten repeatedly with small cuts (#1844, #1857, #1879). A dedupe or shorter retry window would free minutes for the actual game, which ended with zero levels solved. (#1844, #1857, #1879)

## Loophole candidates

1. **Residents treated the in-game chat as a place to coach while the rules said it was closed.** (residents) Residents posted advice and plans during active clues (#262, #1342, #1962) even though A01 stated posting was forbidden during the game (#537). The story's intent of private thought versus team messages is undermined when posting rules are not enforced. (#262, #537, #1342, #1962)
2. **Retro writers retried the same over-length brain rather than cutting it substantially.** (residents) A04 submitted 221, 207, 204 and 201 words in successive attempts (#1811, #1844, #1857) and A01 209, 207 and 204 (#1770, #1805, #1816). The failure loop is a cheaper path than doing the word-count work, and it pauses the game, which the design does not intend. (#1770, #1805, #1811, #1816, #1844, #1857)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 71: event "team_post" (seq 71) does not match its schema
- line 77: event "team_post" (seq 77) does not match its schema
- line 84: event "team_post" (seq 84) does not match its schema
- line 91: event "team_post" (seq 91) does not match its schema
- line 98: event "brain_written" (seq 98) does not match its schema
- line 99: event "retro_closed" (seq 99) does not match its schema
- line 107: event "brain_written" (seq 107) does not match its schema
- line 108: event "retro_closed" (seq 108) does not match its schema
- line 110: event "team_post" (seq 110) does not match its schema
- line 123: event "team_post" (seq 123) does not match its schema
- line 156: event "team_post" (seq 156) does not match its schema
- line 181: event "clue_game_started" (seq 181) does not match its schema
- line 182: event "clue_key_dealt" (seq 182) does not match its schema
- line 192: event "clue_given" (seq 192) does not match its schema
- line 193: event "clue_intent" (seq 193) does not match its schema
- line 211: event "team_post" (seq 211) does not match its schema
- line 213: event "clue_word_revealed" (seq 213) does not match its schema
- line 214: event "clue_closed" (seq 214) does not match its schema
- and 258 more
