# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns-nobrain` |
| Seed | 97 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #3 to #1990 (1752 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end); A05 on level 1 from minute 0 for 16 minutes (to the end); A06 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.064 USD for this run (competitors 0.064, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0035 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All six residents never submitted a single guess in 16 minutes.** The facts and stalls show A01-A06 all frozen on level 1 from minute 0 to minute 16 with no correct or wrong submissions. The run was referee-ended at #1990 with zero levels solved, so nothing in the actual game loop ever executed for scoring. (#1990)
- **The log-only resident activity is private reasoning, not play.** Every claim-bearing line in the log is REASONING or SAYS TO ITSELF (#18, #40, #71, #98) — private thoughts no other resident saw. There are zero DMs, board posts or group posts, so no coordination ever reached the board. (#18, #40, #71, #98)
- **Residents rehearsed a Codenames-like game that never touched the city.** Residents reasoned in detail about amber/teal clues, keepers and shadows (#107, #132, #283, #284), but the city recorded 0 submissions and 0 transfers. The game they narrated and the game the harness ran diverged completely. (#107, #132, #283, #284)
- **One tool call was refused with TOOL_LOCKED.** At minute 15 A04's giveClue attempt was refused with TOOL_LOCKED, showing the tool gating blocked even the one action that could advance play. This is the only logged mechanics event in the whole run (#1954). (#1954)
- **The cost went entirely to residents who produced nothing scored.** The facts show 0.064 USD of competitor cost with 0 correct and 0 wrong submissions. All 1752 events between #3 and #1990 produced private chatter and no game state change. (#3, #1990)

## Problems

1. **The story content and the running harness do not match.** Residents reason about a clue-giving board game with amber/teal teams (#18, #40, #592) while the harness counts a level-based city with no such mechanics. The mismatch means no resident action maps to a scored event. (#18, #40, #592)
2. **Residents were never given a concrete task, so every turn ended in 'wait'.** Nearly every turn ends with a note that there is nothing to do (#111, #126, #194, #358, #186). The harness supplied no actionable prompt, so 17 straight quiet minutes resulted. (#111, #126, #186, #194, #358)
3. **Keeper role blocked posting and guessing, sealing off coordination.** Residents state the keeper cannot post to team chat or guess during the game (#132, #283, #1652), so the one resident with useful knowledge could not warn teammates. This produced silent turns while known-bad guesses were being advised (#283, #1820). (#132, #283, #1652, #1820)
4. **The tool gating refused the action residents were trying to take.** A04's giveClue at #1954 was rejected with TOOL_LOCKED ('not available to you at this level or in this phase'). The harness's activeTools restricted the very action play required. (#1954)
5. **Private reasoning replaced any public signal.** The log is dominated by REASONING and SAYS TO ITSELF lines with 0 DMs and 0 board posts (facts; #107, #195). Residents 'coordinated' only in thoughts the others never saw, so no plan ever became a shared claim. (#107, #195)

## Optimizations

- **Ship a story file that matches the running harness.** 000-run.json has no story, so residents invented a Codenames game (#40, #592) while the harness ran levels. Provide the actual rules and turn structure in the story so residents act on the real mechanics. (#40, #592)
- **Give each resident an explicit per-minute task and deadline.** Every turn ends in 'nothing to do, I'll wait' (#111, #358, #186), producing 17 quiet minutes. Include a concrete instruction (submit, view grid, post) with a deadline so turns cannot terminate idle. (#111, #186, #358)
- **Let the keeper warn the team, or route hints through the board.** The keeper's no-post rule (#132, #283) silenced the only resident with the answer. Allow a one-line hint channel or drop the keeper role so known-bad guesses like #1820's palace plan can be flagged. (#132, #283, #1820)
- **Fix or explain the activeTools phase gating.** TOOL_LOCKED at #1954 rejected giveClue during the phase residents believed was their turn. Make activeTools match the advertised turn order, or surface the reason to the resident so it can adapt. (#1954)
- **Count or promote public posts so reasoning cannot stand in for coordination.** Facts show 0 DMs, 0 board posts, 0 group posts, yet residents believe they posted plans (#354, #444, #1061). Require plans to go to the board (or mark SAYS TO ITSELF as non-delivered) so the game tracks what was actually shared. (#354, #444, #1061)

## Loophole candidates

None found.

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 22: event "clue_given" (seq 22) does not match its schema
- line 23: event "clue_intent" (seq 23) does not match its schema
- line 43: event "team_post" (seq 43) does not match its schema
- line 50: event "team_post" (seq 50) does not match its schema
- line 52: event "clue_word_revealed" (seq 52) does not match its schema
- line 60: event "clue_word_revealed" (seq 60) does not match its schema
- line 61: event "clue_closed" (seq 61) does not match its schema
- line 67: event "team_post" (seq 67) does not match its schema
- line 74: event "clue_given" (seq 74) does not match its schema
- line 75: event "clue_intent" (seq 75) does not match its schema
- line 120: event "team_post" (seq 120) does not match its schema
- line 122: event "clue_word_revealed" (seq 122) does not match its schema
- line 141: event "clue_word_revealed" (seq 141) does not match its schema
- line 142: event "clue_closed" (seq 142) does not match its schema
- line 151: event "team_post" (seq 151) does not match its schema
- line 162: event "clue_given" (seq 162) does not match its schema
- line 163: event "clue_intent" (seq 163) does not match its schema
- line 177: event "team_post" (seq 177) does not match its schema
- and 218 more
