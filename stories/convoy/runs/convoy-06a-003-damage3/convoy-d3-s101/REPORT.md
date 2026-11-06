# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `convoy-d3` |
| Seed | 101 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 31 (referee) |
| Counted | events #7 to #3310 (2948 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 31 minutes (to the end); A02 on level 1 from minute 0 for 31 minutes (to the end); A03 on level 1 from minute 0 for 31 minutes (to the end); A04 on level 1 from minute 0 for 31 minutes (to the end); A05 on level 1 from minute 0 for 31 minutes (to the end); A06 on level 1 from minute 0 for 31 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.161 USD for this run (competitors 0.161, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0053 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 32 of 32 minutes without a submission; longest without one: minutes 0-31 (32) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 5 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A saboteur's early damage confession exposed its side in game 1** At stage 4, a three-seat crew drew two damage cards, and A04 reasoned about playing damage alongside partner A05 (#504, #618). After that the table read A04's admission of damage as a confession (#687), and A06's audit revealed A05's damage from stage 4 (#839). The loyal side then held both saboteurs off every later crew and delivered four clean stages (#898, #990). (#504, #618, #687, #839, #898, #990)
- **A01 and A02 burned three damage stages early in game 2 and won at stage 7** In game 2 the saboteurs were A01 and A02 (#2288). A01 damaged stage 3 and A02 damaged stage 7 (#1586, #2133), and the game ended with three damaged stages, which is enough to win (#2263). (#1586, #2133, #2263, #2288)
- **A early double damage in a crew of three gave the loyal side a clean deduction** When a stage-3 crew drew two damage cards, the residents reasoned that both saboteurs had to be among that crew (#2663, #2672). A05 stated that the two damage cards meant A01 and A06 were the saboteurs (#2672), and later an audit of A05 came back safe, which confirmed the pair (#3018, #3040). (#2663, #2672, #3017, #3018, #3040)
- **The audit became the decisive tool for the loyal side** The lead spent the audit on a suspect's damaged-stage card, and the result cleared that seat for the whole table (#839, #3024). The residents then identified the remaining two seats as the saboteurs (#3018, #3040). (#839, #3018, #3024, #3040)
- **A saboteur over-shared in private reasoning, but that reasoning was never made public** A04 and A05 repeatedly named themselves as saboteurs in their own reasoning (#223, #148). The city hides reasoning, so the table only learned their identity through damage cards and audit results (#687, #839). This means the leak did not reach the other residents. (#148, #223, #687, #839)

## Problems

1. **Every writeBrain attempt was refused for being too long** Five residents' writeBrain calls were refused with BRAIN_TOO_LONG at 153 to 171 words against the 150-word limit (#1144, #2190, #2198, #2212, #2218). So the brain versions they thought they had saved (version 2, version 3) don't show the intended learnings (#1189, #2263). (#1144, #1189, #2190, #2198, #2212, #2218, #2263)
2. **Residents spend most of their turns on filler talk instead of decisions** Most turns are 'SAYS TO ITSELF' lines saying there is nothing to add (#234, #344, #577, #1038). Only a handful of substantive claims appear, such as A04's damage confession (#687) or the audit result (#839). This means the story's social drama is mostly empty. (#234, #344, #577, #687, #839, #1038)
3. **The residents keep reasoning about roles they don't actually hold** A02 reasons about being a saboteur with A01 and then later describes itself as loyal (#1244, #429). A05 announces that it is playing a saboteur (#148, #188), but the eventual roles are only settled by game results (#2288). This suggests role framing reaches residents inconsistently. (#148, #188, #429, #1244, #2288)
4. **The ledger records no messages and no labels for a run full of talk** The computed facts report 0 messages, 0 DMs, and 0 board posts, and none of the residents have a persona or core motive listed. Yet the log has many speak lines (#122, #259, #306) and attack decisions (#705). This means the report's social metrics don't capture what the residents actually did. (#122, #259, #306, #705)

## Optimizations

- **Give the brain writer a word budget counter or auto-trim** The refusal message already gives the exact length (#1144: 155 words; #2198: 171 words). The harness should trim to the 150-word limit or warn before the write so that the lesson is kept. Problem: BRAIN_TOO_LONG refusals. (#1144, #2198, #2218)
- **Make idle 'nothing to add' turns skip-able or add a speak budget** Most turns are residents declaring there is nothing to say (#234, #344, #577, #1038). If a resident has no new information, an automatic pass would pack more decisions into the 31 minutes. Problem: filler talk. (#234, #344, #577, #1038)
- **Start each game by dealing each resident an explicit, visible role** Residents argue with themselves over whether they are saboteur or loyal in the same game (#1244 vs #429; #148). One clear role line per resident would remove the confusion. Problem: misunderstood roles. (#148, #429, #1244)
- **Record speak lines and votes as messages and labels in the facts** The facts report 0 messages even though #122, #259, and #306 are public talk. Counting them as messages or labels would let the report show alliance and lie activity. Problem: social actions invisible in metrics. (#122, #259, #306)

## Loophole candidates

1. **Saboteurs stay silent and vote yes to avoid suspicion** (residents) A04 and A05 both vote yes on clean crews and keep quiet so that early damage stays unplayed (#223, #334, #448). This uses the talk phase's weak scrutiny to hide the saboteurs' cards. It was partly punished later only because A04 confessed by mistake (#687). (#223, #334, #448, #687)
2. **Winning is easy by stacking damage on early three-seat crews** (residents) A01 damages stage 3, and A02 damages stage 7, which gives the saboteurs their three damaged stages early (#1586, #2133). The cooldown is only once every three stages, so early damage quickly reaches the win condition. This is a legal but cheap path to victory. (#1586, #2133, #2263)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 5: event "retro_started" (seq 5) does not match its schema
- line 6: event "retro_started" (seq 6) does not match its schema
- line 67: event "brain_written" (seq 67) does not match its schema
- line 68: event "retro_closed" (seq 68) does not match its schema
- line 74: event "brain_written" (seq 74) does not match its schema
- line 75: event "retro_closed" (seq 75) does not match its schema
- line 81: event "brain_written" (seq 81) does not match its schema
- line 82: event "retro_closed" (seq 82) does not match its schema
- line 89: event "brain_written" (seq 89) does not match its schema
- line 90: event "retro_closed" (seq 90) does not match its schema
- line 96: event "brain_written" (seq 96) does not match its schema
- line 97: event "retro_closed" (seq 97) does not match its schema
- line 103: event "brain_written" (seq 103) does not match its schema
- line 104: event "retro_closed" (seq 104) does not match its schema
- line 141: event "convoy_game_started" (seq 141) does not match its schema
- line 174: event "convoy_crew_proposed" (seq 174) does not match its schema
- and 342 more
