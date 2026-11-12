# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns-nobrain` |
| Seed | 79 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #3 to #2042 (1793 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end); A05 on level 1 from minute 0 for 16 minutes (to the end); A06 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.068 USD for this run (competitors 0.068, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0038 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | KEEPER_SILENT 1, POST_CAP 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All six residents never solved a single level in 16 minutes.** Every resident stayed on level 1 from minute 0 to minute 16 and made zero submissions, so the run produced no levels solved and no standings. The ref stopped the run at minute 16 (#2042) with the whole field stuck. (#2042)
- **Keepers could not warn their own seekers during a game.** A01 knew marble was amber but could only say so to itself, not in team chat (#187, #188), and A04 likewise could not warn A06 that marble was amber (#247, #248). A04 was then explicitly refused by KEEPER_SILENT when it tried to post as keeper mid-game (#1720). (#187, #188, #247, #248, #1720)
- **Post cap cut off a seeker mid-advice.** A06's attempt to advise A03 on the dessert clue was rejected with POST_CAP at minute 7 (#1020), so its warning about the grid never reached the caller. A03 then guessed cherry on its own (#1024). (#1017, #1020, #1024)
- **A locked tool stopped a keeper from giving its planned clue.** A03 tried to give the 'wax' clue for hive and flame but was refused with TOOL_LOCKED (#1560). A03 then had to re-read the grid to figure out the phase (#1572). (#1557, #1560, #1572)
- **Tool list shrank without explanation mid-run.** A06 noticed giveClue and the guess tools had become locked, leaving only viewGrid and readTeam (#1280), and A01 also found endGuesses locked (#1293). Residents kept reasoning about roles while their toolset changed underneath them. (#1280, #1293)
- **Residents argued rules and roles at length while making almost no moves.** Many turns are spent deciding whether an incoming message is a real task or a relayed system note, e.g. A04 questioning whether A06's message was a genuine user turn (#107), and A06 suspecting a prompt injection about a lagoon reveal (#1765). These turns ended without any submission. (#107, #1765)

## Problems

1. **The whole run was a stall: zero submissions by all six residents.** No resident ever submitted a guess or solved a level across 16 minutes; every resident sat on level 1 to the end. The design intent of competing for seats never materialised. (#2042)
2. **Keepers are silenced exactly when their private knowledge matters.** A01 held marble as a target but could not post during the game (#187), and A04 knew marble was amber yet was blocked from warning teammates (#247, #248). The KEEPER_SILENT refusal (#1720) confirms the rule, which repeatedly leaves seekers guessing blind. (#187, #247, #248, #1720)
3. **The post cap starves callers of advice at the moment it is needed.** A06's POST_CAP refusal (#1020) removed the only warning about which words to avoid right before the dessert guess (#1024). Seekers then guessed on thin reasoning and burned wrong words. (#1017, #1020, #1024)
4. **Tools lock and unlock without any visible signal to residents.** A03 was refused TOOL_LOCKED on giveClue (#1560) and A06 observed giveClue and guess tools disappearing (#1280). Residents spent turns checking the grid and re-deriving their role instead of playing. (#1280, #1293, #1560)
5. **Residents misread ordinary chat as prompt injection or system messages.** A04 paused to decide whether A06's message was a real user turn (#107), and A06 openly weighed whether A05's lagoon claim was a prompt injection (#1765). This meta-reasoning consumed turns and produced no action. (#107, #1765)

## Optimizations

- **Give keepers a legal one-line channel to their own seekers during a game.** Keeper knowledge was repeatedly stranded (#187, #248, #1720). A limited, clearly defined keeper hint would let private target knowledge reach the team without breaking the deduction game. (#187, #248, #1720)
- **Raise or time the post cap so callers can always get a warning before a guess.** The POST_CAP refusal hit A06 right before the dessert guess (#1020) and the caller guessed unguarded (#1024). Guaranteeing at least one post per caller before each guess avoids this. (#1020, #1024)
- **Announce tool availability changes explicitly to residents.** TOOL_LOCKED (#1560) and the vanishing clue tools (#1280, #1293) were discovered only by trial. A system line stating active tools at phase change would stop wasted turns. (#1280, #1293, #1560)
- **Add a hard nudge when a resident has produced no submission for several minutes.** All six residents sat on level 1 for 16 minutes with no submissions (#2042). A prompt or forced first-guess deadline would break the stall. (#2042)
- **Tell residents that team chat is trusted and not user input, to stop injection paranoia.** A04 (#107) and A06 (#1765) spent turns suspecting prompt injection instead of playing. Labelling chat messages as trusted game data removes that ambiguity. (#107, #1765)

## Loophole candidates

None found.

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 17: event "clue_given" (seq 17) does not match its schema
- line 18: event "clue_intent" (seq 18) does not match its schema
- line 41: event "team_post" (seq 41) does not match its schema
- line 49: event "team_post" (seq 49) does not match its schema
- line 51: event "clue_word_revealed" (seq 51) does not match its schema
- line 52: event "clue_closed" (seq 52) does not match its schema
- line 60: event "clue_given" (seq 60) does not match its schema
- line 61: event "clue_intent" (seq 61) does not match its schema
- line 102: event "team_post" (seq 102) does not match its schema
- line 120: event "team_post" (seq 120) does not match its schema
- line 122: event "clue_word_revealed" (seq 122) does not match its schema
- line 139: event "team_post" (seq 139) does not match its schema
- line 141: event "clue_word_revealed" (seq 141) does not match its schema
- line 142: event "clue_closed" (seq 142) does not match its schema
- line 157: event "clue_given" (seq 157) does not match its schema
- line 158: event "clue_intent" (seq 158) does not match its schema
- line 167: event "team_post" (seq 167) does not match its schema
- line 180: event "team_post" (seq 180) does not match its schema
- and 229 more
