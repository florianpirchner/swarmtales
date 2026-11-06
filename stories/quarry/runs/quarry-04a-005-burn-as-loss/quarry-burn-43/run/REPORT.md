# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `quarry-burn` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #5 to #1271 (1058 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.033 USD for this run (competitors 0.033, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0021 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Residents spent the opening minute drafting brains before any pack was open.** A01, A02, A03 and A04 all wrote a generic brain at minute 0 before the first game started, e.g. A01 aimed for a 120-word draft at #66 and saved version 1 (#113). This front-loaded work left them idle until minute 1 when picking opened. (#44, #66, #105, #113)
- **A01 won game 1 with 105 points by stacking eight basalt.** A01 committed to basalt from #135 and kept deepening it (#301, #324, #367), finishing with eight basalt and a total of 105 (#494). A01 reported using free burns to block basalt (#471). (#135, #301, #471, #494)
- **A02 finished game 1 second with seven jade for 83 points.** A02 built jade through the first game (#308, #360) and reported 83 points, second behind A01 (#498). A02 later suspected it missed the jade majority bonus (#485). (#308, #360, #485, #498)
- **Game 2 ended in a 100-point tie between A01 and A04.** A04 built nine basalt for 81 points plus a +5 majority and +10 best-quarry bonus, totalling 100 (#867, #877). A01 also reached 100 with cobalt 8 (#925). (#867, #877, #925)
- **A03 stayed the weakest player across both games.** A03 finished third with 62 in game 1 (#509) and 39 in game 2 (#934), admitting it hedged too much and took amber early (#889). It repeatedly discussed burning to deny rivals but cast late effective picks sparsely. (#509, #889, #934)
- **Burns were used as a free denial tool despite unclear scoring.** A01 noted burns cost nothing and used them to block basalt (#471), and other residents repeatedly weighed burning to deny rivals (#706, #780, #1133). A01 also observed the game showed zero points per burn despite a note suggesting otherwise (#471). (#471, #706, #780, #1133)

## Problems

1. **No game opened for the entire run of the count** The run ended at minute 12 (#1271) with no levels solved and zero submissions from all four residents. Pick and writeBrain were reported locked or not open for most of the run (#82, #94, #1119). (#82, #94, #1119, #1271)
2. **The reported end state contradicts the game play in the log** The facts say no levels solved and all residents stuck on level 1 to the end, yet the log shows two games played with scored results (#494, #877, #925). The referee end at #1271 does not match the retro records residents reported. (#494, #877, #925, #1271)
3. **Brain length limits repeatedly rejected saves** A04's brain was refused at 151 words against a 150 limit (#482), and A01 hit the same error at 151 words (#900). These are the only recorded tool errors, both in the retro window. (#482, #900)
4. **Residents spent many turns polling viewTable instead of acting** Multiple reasoning lines are just checks of the table state, such as #433, #685, #815, #1119 and #1252. This reflects confusion about whether picks were locked or the game had ended. (#433, #685, #815, #1119, #1252)
5. **No messages or board posts were produced** The facts record zero DMs, board posts and group posts for the run, and the log contains no message events. Residents never coordinated on denial or shared rule knowledge. (#101, #494, #925)
6. **Rule understanding drifted between residents** A04 reasoned that a burn only makes sense when it clearly completes a rival's deep set (#699), while A03 and A01 treated burns as always worthwhile because they were free (#706, #471). This inconsistency left denial unused or arbitrary. (#471, #699, #706)

## Optimizations

- **Open the first pack immediately at minute 0** Residents burned the opening on generic brain drafting and table checks because pick was locked (#66, #113, #88). Starting game 1 with an open pack would remove the idle minute and the polling loops (#433, #685). (#66, #88, #113, #433, #685)
- **Enforce the brain word limit before submission** Both retro windows produced BRAIN_TOO_LONG refusals at 151 words (#482, #900), near the 150 limit. Pre-checking length or showing a live word count would stop wasted retro steps. (#482, #900)
- **Clarify the burn scoring rule in the game text** A01 reported the game showing zero points per burn despite a note suggesting otherwise (#471), and residents disagreed on when burning was worthwhile (#699 vs #706). Stating burn value and denial effects explicitly would stop this guessing. (#471, #699, #706)
- **Make the end-state accounting match the actual games played** The facts report no levels and a 12-minute stall while the log records two scored games (#494, #877). The metrics pipeline should derive levels and standings from the same pick and score events residents saw. (#494, #877, #925, #1271)
- **Give a shared rule summary so residents do not re-derive scoring** Residents spent reasoning on square scoring and majority bonuses with differing conclusions (#142, #287, #485). Publishing the scoring and majority-bonus rules once would shorten reasoning and reduce wasted turns. (#142, #287, #485)

## Loophole candidates

1. **Free burns used freely to deny rivals** (residents) A01 reported burns cost no points and used them to block basalt (#471), and A02 and A03 weighed burning purely to deny cards (#780, #1133). A zero-cost denial action lets residents strip rivals without any trade-off. (#471, #780, #1133)
2. **Lodestone counted into the biggest set without limit** (residents) Residents treated the lodestone as a wild card that adds to their largest set, e.g. A04 counted L2 as an eighth basalt for 64 instead of 49 (#1169) and A01 added L3 to reach cobalt five (#713). Stacking wilds into the deepest set may inflate depth scores cheaply. (#713, #1169)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
- line 69: event "brain_written" (seq 69) does not match its schema
- line 70: event "retro_closed" (seq 70) does not match its schema
- line 115: event "draft_game_started" (seq 115) does not match its schema
- line 116: event "draft_pick_opened" (seq 116) does not match its schema
- line 124: event "draft_card_picked" (seq 124) does not match its schema
- line 131: event "draft_card_picked" (seq 131) does not match its schema
- line 138: event "draft_card_picked" (seq 138) does not match its schema
- line 145: event "draft_card_picked" (seq 145) does not match its schema
- line 146: event "draft_pick_opened" (seq 146) does not match its schema
- line 153: event "draft_card_picked" (seq 153) does not match its schema
- and 193 more
