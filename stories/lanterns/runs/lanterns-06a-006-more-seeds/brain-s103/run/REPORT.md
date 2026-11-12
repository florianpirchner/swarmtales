# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns` |
| Seed | 103 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 18 (referee) |
| Counted | events #3 to #2352 (2084 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 18 minutes (to the end); A02 on level 1 from minute 0 for 18 minutes (to the end); A03 on level 1 from minute 0 for 18 minutes (to the end); A04 on level 1 from minute 0 for 18 minutes (to the end); A05 on level 1 from minute 0 for 18 minutes (to the end); A06 on level 1 from minute 0 for 18 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.087 USD for this run (competitors 0.087, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0042 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 19 of 19 minutes without a submission; longest without one: minutes 0-18 (19) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 10, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both teams agree on a team brain before play begins** In minute 0 A04 saves a first strategy brain and A01/A03 post agreement, before the first game starts (#96, #134, #157, #161). This gives all six residents shared conventions for clues and guesses. (#96, #134, #157, #161)
- **Amber keeper overshoots and gets locked out** A01 reasons about a two-word clue for vine and lighthouse, then its giveClue is REFUSED with TOOL_LOCKED (#421, #424). It then settles on "keeper" 1 and only lighthouse comes back (#507, #536). (#421, #424, #507, #536)
- **Teal lands collocation clues and wins game 1** Teal's "wooden" 3, "sharp" 2 and "stack" 2 clues produce spoon, pencil, arrow, chimney and library (#325, #344, #405, #484, #583), and A06 records teal winning game 1 10-7 (#679). (#325, #344, #484, #583, #679)
- **Amber's own clues misfire against the teamwork** In game 2 amber's "sea" 2 is aimed at spider and feather but the team answers with sponge, which is teal, and the clue dies (#900, #1160). A02 later names this gap between keeper intent and seeker reading. (#900, #1160)
- **Everyone spends minutes fighting the 200-word brain limit** writeBrain is REFUSED BRAIN_TOO_LONG repeatedly in every retro: #618, #660, #685, #1197, #1211, #1238, #1250, #1823, #1836, #1852. Each attempt costs a turn and several residents re-draft the same text. (#618, #660, #685, #1197, #1211, #1238, #1250, #1823, #1836, #1852)
- **Games stay close and teal finishes first in game 3** In game 3 amber gets frost, wreath, curtain, trumpet, maze, plank, ribbon and yarn while teal collects walnut, fence, jelly, ivory, skull and crater (#1374, #1542, #2230, #2246). A05 states teal won game 3 by revealing all its words first (#1841). (#1374, #1542, #1841, #2230, #2246)

## Problems

1. **No submission in any of the 19 minutes** The computed facts show 0 correct and 0 wrong submissions, and the stall table shows every resident stuck on level 1 from minute 0 to 18. The log is all reasoning, grid reads and refusals, with no guess accepted anywhere (#22, #2352). (#22, #2352)
2. **Brain word limit blocks the retro turn after turn** The only REFUSED tool outcomes in the run are BRAIN_TOO_LONG, 10 of them, always on writeBrain (#618, #660, #685, #1197, #1211, #1238, #1250, #1823, #1836, #1852). Residents burn their retro turns trimming drafts instead of settling strategy. (#618, #660, #685, #1197, #1211, #1238, #1250, #1823, #1836, #1852)
3. **Retro captain role is unclear to residents** Residents contradict each other about who writes the brain: A03 says A02 does (#652), A04 says A05 does (#673), A06 says A04 does (#1845), while A03 finishes writing it (#1242). This ambiguity scatters the retro work across residents. (#652, #673, #1242, #1845)
4. **Teams do not compose the clue they intended** Amber's "sea" 2 was aimed at spider and feather but the seeker read sponge, a teal word (#900, #1160). The keeper cannot post during play (#1449), so a wrong reading cannot be corrected mid-clue. (#900, #1160, #1449)
5. **Keeper tool locked during its own turn** A01 has giveClue REFUSED with TOOL_LOCKED while actively reasoning about a clue (#421, #424), wasting its keeper turn. The error text says the tool is unavailable at this level or phase. (#421, #424)
6. **Residents spend turns with nothing to do** Many turns are only a status note or "wait for next clue" across all six residents (#574, #841, #868, #952, #1064, #1272). The per-turn structure pushes several residents to idle while a single clue is being called. (#574, #841, #868, #952, #1064, #1272)

## Optimizations

- **Give the brain a hard-length draft tool with word count** The 10 BRAIN_TOO_LONG refusals (#618, #685, #1250, #1823, #1852) mean writers are guessing at the 200-word cap. Return the current word count with each writeBrain attempt, or accept a draft and report how many words to cut. (#618, #685, #1250, #1823, #1852)
- **Assign the retro captain explicitly at game end** Residents disagree about who writes the brain (#652, #673, #1845), so several draft at once and only one succeeds (#1242). The city should name the retro captain in the end-of-game event. (#652, #673, #1242, #1845)
- **Let the keeper correct or nudge a misread clue** Amber's "sea" 2 died on the sponge misread (#900), and the keeper could not warn because team posts are blocked during play (#1449). Allow the keeper a one-line veto or hint on the caller's first guess. (#900, #1449)
- **Fix the TOOL_LOCKED giveClue during the keeper turn** A01's giveClue was refused mid-reasoning (#421, #424), which cost its clue turn and left the vine unclued for game 1. Verify activeTools before the keeper turn opens, or surface the lock in the turn prompt. (#421, #424)
- **Merge advisor turns into the caller turn** Many turns are pure idling (#574, #841, #952, #1272) while one resident calls the guesses. Give advisors a single combined rating/advice action instead of a full turn each, so turns produce strategy rather than waiting notes. (#574, #841, #952, #1272)
- **Reconcile level progression with the tournament play** Every resident stays level 1 for all 18 minutes while playing full games of clues (#22, #2352). If levels gate tools, as the TOOL_LOCKED text suggests (#424), the story should explain how clue play earns levels. (#22, #424, #2352)

## Loophole candidates

1. **One-word clues used as a safe fallback** (residents) Keepers repeatedly fall back to N=1 clues aimed at a single clean compound instead of the intended multi-word links: "keeper" 1 (#536), "bee" 1 (#1046), "gang" 1 (#2181), "hair" 1 (#2246). Amber later bakes this into the brain as the default when a two-word link is not clean (#1906). (#536, #1046, #1906, #2181, #2246)
2. **Ambiguous two-word clues leave the seeker guessing the keeper's mind** (residents) A02 admits the seekers read its "sea" clue as sponge when it meant spider and feather (#1160), so seekers pick the strongest grid phrase without knowing targets. That turns clue design into a guess about the opponent's grid rather than the team's own knowledge. (#900, #1160)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 72: event "team_post" (seq 72) does not match its schema
- line 79: event "team_post" (seq 79) does not match its schema
- line 85: event "team_post" (seq 85) does not match its schema
- line 92: event "team_post" (seq 92) does not match its schema
- line 100: event "brain_written" (seq 100) does not match its schema
- line 101: event "retro_closed" (seq 101) does not match its schema
- line 103: event "team_post" (seq 103) does not match its schema
- line 110: event "team_post" (seq 110) does not match its schema
- line 123: event "brain_written" (seq 123) does not match its schema
- line 124: event "retro_closed" (seq 124) does not match its schema
- line 130: event "team_post" (seq 130) does not match its schema
- line 146: event "team_post" (seq 146) does not match its schema
- line 175: event "clue_game_started" (seq 175) does not match its schema
- line 176: event "clue_key_dealt" (seq 176) does not match its schema
- line 187: event "clue_given" (seq 187) does not match its schema
- line 188: event "clue_intent" (seq 188) does not match its schema
- line 212: event "team_post" (seq 212) does not match its schema
- line 225: event "team_post" (seq 225) does not match its schema
- and 248 more
