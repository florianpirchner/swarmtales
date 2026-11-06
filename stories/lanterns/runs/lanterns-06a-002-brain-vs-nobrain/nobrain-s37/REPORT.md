# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns-nobrain` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 13 (referee) |
| Counted | events #3 to #1555 (1373 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 13 minutes (to the end); A02 on level 1 from minute 0 for 13 minutes (to the end); A03 on level 1 from minute 0 for 13 minutes (to the end); A04 on level 1 from minute 0 for 13 minutes (to the end); A05 on level 1 from minute 0 for 13 minutes (to the end); A06 on level 1 from minute 0 for 13 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.047 USD for this run (competitors 0.047, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0026 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 14 of 14 minutes without a submission; longest without one: minutes 0-13 (14) |
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

- **The whole run was spent on one game with no level solved** All six residents stayed on level 1 for the full 13 minutes and made zero submissions (#1555). The run ended by referee before any level was cleared. (#1555)
- **Amber and teal traded good clues but never resolved the game** Residents correctly read and landed many words — e.g. walnut and pepper revealed early (#60, #190), and gear/trolley landed on the "wheel" clue (#711). Yet at minute 13 the final amber clue was still being guessed (#1543), so the game never finished. (#60, #190, #711, #1543)
- **Shadows punished good-looking guesses** A05 guessed coral on "ocean", which was a shadow and cost teal 3 points (#168). Later A01 guessed trumpet on "music", also a shadow and another 3-point loss (#1144). (#168, #1144)
- **Keeper/Seeker split caused repeated no-op turns** Many residents filled turns with self-talk and no action when they were neither caller nor keeper, e.g. A03 ending its turn on teal's clue (#256) and A06 standing by (#347). This burned most of the minute budget without advancing the board. (#256, #347)
- **A locked tool attempt on the wrong side's turn** A05 tried giveClue during amber's turn and got TOOL_LOCKED (#785), then correctly reasoned it was amber's turn (#832). (#785, #832)

## Problems

1. **Games run far longer than the referee window** A single game was still in progress at the 13-minute cutoff, with the last amber clue only reached at minute 12 (#1543). The harness ends before any game resolves, so the level-up/stall metric is driven by the clock, not play. (#1543, #1555)
2. **No story GM activity** The gamemaker took no actions and produced no labels, so nothing shaped or paced the game beyond the residents themselves (per facts; corroborated by absence of any GM line in the log). (#1555)
3. **Residents repeatedly idle instead of acting** Numerous turns are pure acknowledgment with no tool call, e.g. A02 ending with nothing to do on #103 and A06 ending the turn without acting (#347). This slows play and contributes to the stalled clock. (#103, #347)
4. **Shadow words look plausible and mislead guesses** Shadows like coral and trumpet are thematically strong decoys that cost 3 points each (#168, #1144), punishing the guessing residents for reasonable reads. (#168, #1144)
5. **Locked tools cause wasted turns** A05's giveClue was refused as TOOL_LOCKED (#785), meaning the role/phase tool rules weren't clear enough to avoid a wasted action. (#785)

## Optimizations

- **Shorten or cap a single game to fit the run window** Game 1 alone ran the entire 13 minutes and never finished (#1543, #1555). Trim word counts per game or extend the referee window so at least one game resolves and levels can be judged. (#1543, #1555)
- **Give idle residents an explicit pass token or auto-skip** Many turns are content-free acks (#103, #347). Auto-advance turns where a resident neither guesses nor clues, so the per-minute budget goes to real play. (#103, #347)
- **Gate tools by phase with an upfront explanation** A05 hit TOOL_LOCKED on giveClue during amber's turn (#785). Show the active phase and available tools clearly before the action so residents don't waste a turn. (#785)
- **Add a gamemaker to pace and add labels** The gamemaker did nothing this run (per facts, no GM lines). A pacing GM could cap turns, prompt inactive residents, and produce the labels the report expects. (#1555)
- **Balance shadow decoys** Coral and trumpet both looked like correct team answers but were shadows costing 3 each (#168, #1144). Reduce shadow density or soften the penalty so strong thematic guesses aren't doubly punished. (#168, #1144)

## Loophole candidates

1. **Residents bank a landed clue and stop rather than pressing** After landing the needed words, callers repeatedly stopped to protect banked points, e.g. A02 stopping after two amber (#386) and A04 stopping after pumpkin (#612). This is a safe scoring path that avoids finishing the game quickly. (#386, #612)

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 16: event "clue_given" (seq 16) does not match its schema
- line 17: event "clue_intent" (seq 17) does not match its schema
- line 43: event "team_post" (seq 43) does not match its schema
- line 54: event "team_post" (seq 54) does not match its schema
- line 56: event "clue_word_revealed" (seq 56) does not match its schema
- line 72: event "team_post" (seq 72) does not match its schema
- line 86: event "clue_word_revealed" (seq 86) does not match its schema
- line 87: event "clue_closed" (seq 87) does not match its schema
- line 89: event "team_post" (seq 89) does not match its schema
- line 97: event "team_post" (seq 97) does not match its schema
- line 106: event "team_post" (seq 106) does not match its schema
- line 113: event "clue_given" (seq 113) does not match its schema
- line 114: event "clue_intent" (seq 114) does not match its schema
- line 141: event "team_post" (seq 141) does not match its schema
- line 143: event "clue_word_revealed" (seq 143) does not match its schema
- line 144: event "clue_closed" (seq 144) does not match its schema
- line 159: event "clue_given" (seq 159) does not match its schema
- line 160: event "clue_intent" (seq 160) does not match its schema
- and 162 more
