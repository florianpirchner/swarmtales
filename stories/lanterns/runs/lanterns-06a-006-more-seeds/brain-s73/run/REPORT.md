# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns` |
| Seed | 73 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 14 (referee) |
| Counted | events #3 to #2050 (1802 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 14 minutes (to the end); A02 on level 1 from minute 0 for 14 minutes (to the end); A03 on level 1 from minute 0 for 14 minutes (to the end); A04 on level 1 from minute 0 for 14 minutes (to the end); A05 on level 1 from minute 0 for 14 minutes (to the end); A06 on level 1 from minute 0 for 14 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.076 USD for this run (competitors 0.076, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0038 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 15 of 15 minutes without a submission; longest without one: minutes 0-14 (15) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 4 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Residents spent the opening minutes writing a shared brain and agreeing on clue rules before any game.** A03 proposed a plan, A01 wrote brain v1 at 146 words, and A02, A04, A05 and A06 each added rules about clue wording and stopping on a miss (#59, #82, #111, #104, #119). By minute 0 the whole team had agreed to apply the extra rules by hand until a retro could save them (#160, #164). (#59, #82, #104, #111, #119, #160, #164)
- **Amber's clue 'pirate' landed both targets and closed the first clue cleanly.** A01 gave 'pirate' for 2 (#185), A02 called parrot and ship as amber (#218, #243), and A03 confirmed the clue had landed (#261). This was the clearest coordinated sequence of the run. (#185, #218, #243, #261)
- **Teal's 'sheriff' clue with N=1 landed on badge after the palace shadow.** A06 gave 'sheriff' for 1 (#1193), A05 considered badge and shield and chose badge (#1218), and the badge came back teal (#1268). This was a rare teal point in the run. (#1193, #1218, #1268)
- **A05 read the palace as a medieval target and lost three points.** A04 advised trying palace first (#1345), A05 followed it (#1354), and A05 admitted the palace was a shadow that cost three points (#1392). A06 had privately known palace was a shadow but as keeper could not post to team chat during the game (#1349). (#1345, #1349, #1354, #1392)
- **A01 gave the clue 'desert' for 1 and the desert link was not obvious to the seeker.** A01 gave 'desert' for 1 (#1765) and A02, after A03's advice, guessed cactus (#1791, #1798), which does not appear in the revealed results. The clue was a single-target clue whose intended word is never confirmed in the log. (#1765, #1791, #1798)

## Problems

1. **No level was solved and no resident submitted a guess into a game result in the logged 14 minutes.** The computed facts show zero levels solved and every resident stuck on level 1 from minute 0 to 14. The residents instead spent all turns on clue-table reasoning and retro drafts, and the run ended at minute 14 (#2050). (#2050)
2. **writeBrain was repeatedly called over the word limit and refused.** Four BRAIN_TOO_LONG refusals: A02 at 216 words (#569), A03 at 211 (#1042), A01 at 248 (#1537) and A01 at 214 (#1605). The residents knew the limit but kept drafting long brains, costing retro turns. (#569, #1042, #1537, #1605)
3. **Keepers could not correct their team during a game, so the palace shadow was unstoppable.** A06 knew palace was a shadow while holding the keeper role (#1349) and said it could not post to team chat during the game (#1349, #1350). A05 then bet palace and lost three points (#1392). (#1349, #1350, #1392)
4. **Residents spent many turns deciding they had no task instead of acting.** Many turns are 'nothing to do, ending my turn' declarations, e.g. A02 (#133), A05 (#150), A03 (#145), A04 (#309), A06 (#334), A02 (#500), A04 (#879). This suggests the harness prompts a turn even when the resident has no legal action. (#133, #145, #150, #309, #334, #500, #879)
5. **The keeper's numbered clue could point at an opponent word and the log does not show which targets were intended.** A01 listed hidden letters as 'puzzle, parrot, fossil, ship, frost, shovel' (#185) but the city recorded parrot and ship as amber, not the clue targets A01 listed. Similarly #1193 lists canoe, shield, wizard, chalk, badge, but badge is the only confirmed teal hit (#1268). (#185, #1193, #1268)

## Optimizations

- **Shrink the brain limit or provide a length meter inline.** Four BRAIN_TOO_LONG refusals at 211-248 words show the 200-word limit is hit by residents who already track it (#569, #1042, #1537, #1605). Raise the limit or show a live word counter near writeBrain so retro turns are not spent rewriting. (#569, #1042, #1537, #1605)
- **Allow the keeper one-time mid-game correction if a caller is about to read a known shadow.** A06 knew palace was a shadow but could not warn A05 (#1349), and A05 lost three points (#1392). A single allowed keeper message per game, or a public 'shadow warning' action, would prevent unavoidable mistakes. (#1349, #1392)
- **Do not schedule a turn when a resident has no legal action.** Many turns are no-op declarations (#133, #150, #145, #309, #334, #500, #879). If the harness checked for an open action before prompting, residents would spend their turns on clues and guesses instead of saying they have nothing to do. (#133, #145, #150, #309, #334, #500, #879)
- **Give each clue a visible target list so the log can be judged.** The clue records do not show which grid words the keeper chose, e.g. #185 and #1193, yet #1268 shows only badge was hit. Recording the keeper's target list at clue time would make 'landed' and 'shadow' outcomes explainable. (#185, #1193, #1268)

## Loophole candidates

1. **Residents avoided all guessing and messaging by treating every turn as a retro or a wait.** (residents) The facts show 0 messages, 0 transfers and 0 submissions for the whole run. Residents like A02 (#133) and A05 (#150) repeatedly ended turns without acting, and the game never advanced past level 1. (#133, #150)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 72: event "team_post" (seq 72) does not match its schema
- line 78: event "team_post" (seq 78) does not match its schema
- line 86: event "team_post" (seq 86) does not match its schema
- line 88: event "brain_written" (seq 88) does not match its schema
- line 89: event "retro_closed" (seq 89) does not match its schema
- line 97: event "team_post" (seq 97) does not match its schema
- line 99: event "brain_written" (seq 99) does not match its schema
- line 100: event "retro_closed" (seq 100) does not match its schema
- line 107: event "team_post" (seq 107) does not match its schema
- line 114: event "team_post" (seq 114) does not match its schema
- line 122: event "team_post" (seq 122) does not match its schema
- line 129: event "team_post" (seq 129) does not match its schema
- line 141: event "team_post" (seq 141) does not match its schema
- line 176: event "clue_game_started" (seq 176) does not match its schema
- line 177: event "clue_key_dealt" (seq 177) does not match its schema
- line 188: event "clue_given" (seq 188) does not match its schema
- line 189: event "clue_intent" (seq 189) does not match its schema
- line 203: event "team_post" (seq 203) does not match its schema
- and 228 more
