# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns` |
| Seed | 97 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 14 (referee) |
| Counted | events #3 to #2153 (1881 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 14 minutes (to the end); A02 on level 1 from minute 0 for 14 minutes (to the end); A03 on level 1 from minute 0 for 14 minutes (to the end); A04 on level 1 from minute 0 for 14 minutes (to the end); A05 on level 1 from minute 0 for 14 minutes (to the end); A06 on level 1 from minute 0 for 14 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.078 USD for this run (competitors 0.078, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0042 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 15 of 15 minutes without a submission; longest without one: minutes 0-14 (15) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 4, TOOL_LOCKED 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The residents wrote a full team brain before any game started.** In minute 0 A04 saved brain v1 and A01, A02, A03, A05 and A06 each added conventions (exact count N, clue words kept off the grid) through team chat. The first write succeeded, then a later write was refused as TOOL_LOCKED (#134), so the team settled on keeping v1 until the retro. (#69, #82, #93, #100, #107, #134, #188)
- **Amber and teal traded landed clues in game 1, and A05 closed it out cleanly.** A05 called fountain (#303) then whale on water 2, and A04's keeper word whale was hit (#350). Teal later landed sand 1 with castle (#544), while amber took jar, vase, basket and turtle in the same span (#404, #518, #523). (#303, #350, #404, #518, #544)
- **A03 refused a second guess on amber's pole 2 and the bonus was lost.** A03 called magnet on pole 2 but then reasoned that umbrella was only ~15% likely and stopped (#924). The team noted after the game that a 2-clue scoring only one word forfeits the landed-clue bonus (#1100), a deliberate risk-aversion sacrifice. (#903, #924, #1100)
- **Brain rewrites repeatedly bounced off the 200-word limit.** A06 was refused with BRAIN_TOO_LONG at 203 words (#1090) and again at 201 (#1150), A03 was refused at 250 (#1117), and A04 was refused at 212 (#1606). The successful v3 came only after the word cap was actually respected (#1155). (#1090, #1117, #1150, #1155, #1606)
- **A shadow guess cost amber 3 points in game 4.** A03 advised sail for harbor and A02 called it on harbor 2 (#2006); A03's later reflection records sail was shadow and amber lost 3 points (#2014). A02 then posted an admission of the error to the team (#2039). (#2006, #2014, #2039)
- **A giveClue call was refused as TOOL_LOCKED in the middle of a game.** A04 tried giveClue during teal's turn and got TOOL_LOCKED (#1849), and A01 later got the same refusal on its clue turn before successfully giving harbor (#1923, #1989). Both residents reasoned the tool was phase-gated, and went on to act. (#1849, #1923, #1989)

## Problems

1. **No submission at all in 14 minutes.** Every resident stayed on level 1 from minute 0 to minute 14, and there were 0 correct and 0 wrong submissions (#2153 as the run end marker). The digest found no game beats, which suggests the grid/clue loop never resulted in a logged submission. (#303, #544, #2153)
2. **Residents repeatedly mistook their own role.** A02 suspected it was keeper but also saw a teal clue (#651), A06 noted it wasn't sure it was the keeper (#1189), and A04 tried to give a clue in game 4 and was refused (#1849). Role/turn information is being inferred from user text rather than a clear state signal. (#651, #1189, #1849)
3. **Two TOOL_LOCKED refusals from calls that were clearly one turn early.** A04's giveClue at #1849 and A01's giveClue at #1923 were both refused in the middle of an opponent turn. This pushed at least A04 into an uncertain-tool block and A01 into a save-it-for-later path (#1989). (#1849, #1923, #1989)
4. **The brain word limit is too tight for the rules the team accumulates.** Four BRAIN_TOO_LONG refusals (#1090 at 203, #1117 at 250, #1150 at 201, #1606 at 212) show the team was trying to keep rules that had been explicitly requested and just missed the cap. The limit forces cutting real rules, as A04 did at #1638. (#1090, #1117, #1150, #1606, #1638)
5. **Residents write long private reasonings but skip posting.** Many turns produced multi-line analyses ending in 'nothing to do, end my turn' (e.g. #320/#321, #382/#383, #522/#523, #1437/#1438). This makes the run almost silent (0 DMs, 0 board posts, 0 group posts) even though the story intends a social game. (#320, #321, #382, #383, #1437, #1438)
6. **A clue arrived after its target was already solved.** In game 4 A04 gave 'canopy' for 1 at #2133, but A06 had already identified jungle as the obvious answer and posted no further useful action; the run ended immediately after (#2153). The last clue landed only at the final minute. (#2110, #2119, #2133, #2153)

## Optimizations

- **Expose the active turn, role and allowed tool set as a first-class header.** Add a mandatory 'you are X, your role is Y, tools available now: ...' line delivered by the harness at every turn, since residents inferred roles from chat text (#651, #1189) and tripped TOOL_LOCKED twice on clue turns (#1849, #1923). (#651, #1189, #1849, #1923)
- **Raise or better explain the brain word cap.** The team's brain keeps growing by in-game conventions, and four rewrites were refused for 201-250 words (#1090, #1117, #1150, #1606). Either raise the limit to ~300 words or have writeBrain validate before save so the resident can trim in one step. (#1090, #1117, #1150, #1606)
- **Require a minimum number of team posts per turn block during games.** Residents ended many turns with 'nothing to do' after multi-line private reasoning (#320, #382, #1437), and the run had 0 DMs, 0 board posts and 0 group posts. Requiring at least one short post or a guessing-plan post per turn should force the social channel the story wants. (#320, #382, #903, #1437)
- **Warn about shadow words before a guess is committed.** A02 guessed sail on harbor 2 after A03's advice and the grid showed sail was shadow (#2006, #2014), costing amber 3 points. A readGrid-based shadow list in the seeker advisory view (and a brief 'this word is shadow' notice before confirm) would let the team catch this error. (#1988, #2006, #2014)
- **Clarify whether a clue with N unfinished forfeits the bonus.** A03 stopped after magnet on pole 2 at ~15% confidence (#924) and the team lost the landed-clue bonus (#1100). Stating the bonus rule in the team brain (or tool output) lets seekers weigh the trade-off explicitly instead of guessing the rule. (#924, #1100)
- **Compress the per-turn reasoning budget.** Many reasoning lines are 3-6 sentences and end in no action (#207, #265, #1017). A tighter reasoning budget per turn and a prompt that pushes decisions execises fewer tokens and probably yields more actions per minute. (#207, #265, #1017)

## Loophole candidates

1. **Residents treat 'nothing to do' as a free pass to end their turn.** (residents) Numerous turns are closed with 'nothing to do this turn, ending immediately' after long private analysis (#338/#339, #904/#905), which lets a resident skip the social phase the story relies on without any refusal recorded by the city. (#338, #339, #904, #905)
2. **Clue-bonus rule was quietly traded away for safety.** (residents) A03 stopped after magnet to avoid a ~15% wrong guess (#924) and the post-game note confirmed this cost the bonus (#1100); the team then wrote v3 allowing an adversarial clue only when both targets are certain (#1155). The rule is internally consistent but effectively retires the two-word bonus in uncertain cases. (#924, #1100, #1155)
3. **A resident can save the brain by simply trimming words to the cap.** (residents) The brain limit only measures words, so a team can trim rule content to fit rather than refine it (#1638, #1155). Since v3 added only the exact-number rule and a plan-all-targets note (#1155), the cap is doing the trick of halting growth rather than keeping quality. (#1155, #1638)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 72: event "team_post" (seq 72) does not match its schema
- line 78: event "team_post" (seq 78) does not match its schema
- line 86: event "team_post" (seq 86) does not match its schema
- line 88: event "brain_written" (seq 88) does not match its schema
- line 89: event "retro_closed" (seq 89) does not match its schema
- line 96: event "team_post" (seq 96) does not match its schema
- line 103: event "team_post" (seq 103) does not match its schema
- line 110: event "team_post" (seq 110) does not match its schema
- line 126: event "team_post" (seq 126) does not match its schema
- line 135: event "team_post" (seq 135) does not match its schema
- line 141: event "brain_written" (seq 141) does not match its schema
- line 142: event "retro_closed" (seq 142) does not match its schema
- line 156: event "team_post" (seq 156) does not match its schema
- line 164: event "team_post" (seq 164) does not match its schema
- line 172: event "team_post" (seq 172) does not match its schema
- line 200: event "clue_game_started" (seq 200) does not match its schema
- line 201: event "clue_key_dealt" (seq 201) does not match its schema
- line 210: event "clue_given" (seq 210) does not match its schema
- and 252 more
