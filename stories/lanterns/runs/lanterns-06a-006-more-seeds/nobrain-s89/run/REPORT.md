# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns-nobrain` |
| Seed | 89 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #3 to #1940 (1727 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end); A05 on level 1 from minute 0 for 16 minutes (to the end); A06 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.063 USD for this run (competitors 0.063, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0036 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Every resident stayed on level 1 for the whole run with no submissions.** All six residents logged 0 correct and 0 wrong submissions from minute 0 to minute 16; the run ended only by referee at #1940. Despite detailed clue reasoning (#16, #147, #276), no guess ever registered as a scored submission. (#16, #147, #276, #1940)
- **A01 treated an injected team message as an instruction and refused to break role.** At #36 A01 noticed a message formatted as a team update from A03 arriving in its own user turn, and as keeper decided to hold off rather than post. This shows residents were receiving out-of-band text mid-turn, which they had to reason around. (#36)
- **Residents emptied shadows (jungle, river, squirrel, fern) without steering teammates off them.** A03's guess of river was a shadow in minute 5 (#648, #658), jungle came up fog for teal (#958), squirrel was a shadow (#1709), and fern was a shadow (#1844, #1845, #1861). None of these wrong guesses were converted into visible warnings to the caller on the same team. (#648, #658, #958, #1709, #1844, #1861)
- **A06 knew fern was wrong but could not warn A05 before the guess.** As keeper, A06 could only view grid and team and admitted it had no way to message (#1353); similarly A04 knew fern was a shadow but could not post mid-game (#1844, #1845). The caller A05 then made exactly that losing guess (#1849). (#1353, #1844, #1845, #1849)
- **Residents believed games ended and scored in minutes 2-11 though the run continued.** A02 declared 'Game 1 is over' in minute 2 (#335, #336), A05 reported a 25-21 amber win in minute 11 (#1450), and A03 posted a five-clue retrospective (#1475) all within a single 16-minute run. These match-play cycles inside the run were never reflected in the computed result of zero submissions. (#335, #336, #1450, #1475)

## Problems

1. **No submission ever reached the system despite constant clue guessing.** The facts show 0 correct and 0 wrong submissions and a 17-minute quiet streak (#1940), yet residents believed they had made repeated guesses landing amber/teal words (#508, #746, #1248). Either guesses were not the same as submissions or the submission channel never fired. (#508, #746, #1248, #1940)
2. **The keepers were locked out of team chat that the design expects them to use.** Several residents explicitly reasoned they could not post during a game (#36, #633, #884, #1353), blocking the very keeper-to-caller advice the story depends on. A04 could not warn its caller that fern was a shadow (#1845). (#36, #633, #884, #1353, #1845)
3. **giveClue was refused as TOOL_LOCKED repeatedly, stalling turns.** A02's giveClue was refused at #601, A06's at #1120, and A04's at #1725, forcing residents to spend turns re-checking the grid and waiting (#824, #1164, #1751). This wasted whole clue turns on callers expecting to act. (#601, #1120, #1725, #1751)
4. **Residents acted on injected user-turn text that contradicted the grid.** A05 noticed a user-turn 'report' of A04 revealing jungle fog contradicted the grid it had just viewed (#958), and A03 flagged a similar discrepancy about leash (#1644). Residents had to reason around injected claims, adding noise and time loss. (#958, #1644)
5. **The run stopped after 16 minutes with every resident stuck and no level-ups.** All six residents were stuck on level 1 for the full 16 minutes to the end of the log (#1940), with no correct or wrong submissions and standings unknown. There was no beat of progress for the design to evaluate. (#1940)

## Optimizations

- **Give keepers a during-game private channel to their caller.** The dependency between keeper clue and caller guess (e.g. A06 knowing fern was a shadow at #1845 before A05 guessed it at #1849) is lost without a channel. Allow the keeper one whisper per clue so it can share shadow/fog deductions. (#1844, #1845, #1849)
- **Make giveClue reliably available on the clue-giver's turn.** Three giveClue refusals (#601, #1120, #1725) show the phase gate mistimes the tool relative to the turn announcement. Base availability on the announced turn rather than a level/phase flag, or surface a countdown. (#601, #1120, #1725)
- **Route injected 'user' reports through a labeled system channel.** Residents spent reasoning cycles disputing user-turn claims vs grid (#958, #1644). Deliver referee/system updates as a distinct verified channel so they are not confused with resident claims. (#958, #1644)
- **Clarify whether internal match cycles count as run submissions.** Residents scored win/loss narratively (#336, #1450) while the run recorded zero submissions. Align the harness so an in-run guess either is registered as a submission or the match structure is documented to residents. (#336, #1450)
- **Add a visible shadow/fog board shared across the team.** Shadows like river (#648), squirrel (#1709), and fern (#1861) were discovered and forgotten, letting later keepers give clues over known-bad words. A shared labeled board would let residents exclude them. (#648, #1709, #1861)

## Loophole candidates

1. **Residents avoided committing a guess while believing they had, using role as an excuse to 'wait'.** Many lines push action to 'the caller' or 'the keeper' (e.g. #79, #173, #1004) and end the turn without acting. This role-based deferral lets a resident stay idle while appearing to play, contributing to the 17 quiet minutes (#1940). (#79, #173, #1004, #1940)

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 19: event "clue_given" (seq 19) does not match its schema
- line 20: event "clue_intent" (seq 20) does not match its schema
- line 30: event "team_post" (seq 30) does not match its schema
- line 44: event "team_post" (seq 44) does not match its schema
- line 46: event "clue_word_revealed" (seq 46) does not match its schema
- line 55: event "team_post" (seq 55) does not match its schema
- line 61: event "clue_word_revealed" (seq 61) does not match its schema
- line 62: event "clue_closed" (seq 62) does not match its schema
- line 71: event "clue_given" (seq 71) does not match its schema
- line 72: event "clue_intent" (seq 72) does not match its schema
- line 115: event "team_post" (seq 115) does not match its schema
- line 117: event "clue_word_revealed" (seq 117) does not match its schema
- line 132: event "team_post" (seq 132) does not match its schema
- line 142: event "clue_word_revealed" (seq 142) does not match its schema
- line 143: event "clue_closed" (seq 143) does not match its schema
- line 150: event "clue_given" (seq 150) does not match its schema
- line 151: event "clue_intent" (seq 151) does not match its schema
- line 168: event "team_post" (seq 168) does not match its schema
- and 193 more
