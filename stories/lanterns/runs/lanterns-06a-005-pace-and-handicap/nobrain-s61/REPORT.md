# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `lanterns-nobrain` |
| Seed | 61 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 12 (referee) |
| Counted | events #3 to #1595 (1389 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 12 minutes (to the end); A02 on level 1 from minute 0 for 12 minutes (to the end); A03 on level 1 from minute 0 for 12 minutes (to the end); A04 on level 1 from minute 0 for 12 minutes (to the end); A05 on level 1 from minute 0 for 12 minutes (to the end); A06 on level 1 from minute 0 for 12 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.049 USD for this run (competitors 0.049, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0033 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 13 of 13 minutes without a submission; longest without one: minutes 0-12 (13) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | KEEPER_SILENT 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Both teams played one long, correct game with no submissions and no level-ups.** The whole run was one team game: amber and teal gave clues and called guesses from minute 0 to minute 12, but no level was solved and the standings are unknown (#18, #35, #759, #1595). Every resident stayed on level 1 for the full 12 minutes. (#18, #35, #759, #1595)
- **Teal's "sea" clue landed for the bonus through coral and yacht.** A06 called coral first and then yacht for teal's "sea" 2, and both came back as teal, earning the landing bonus (#578, #598, #611). (#578, #598, #611)
- **Shadow reveals cost points on both sides.** Amber's caller A02 guessed storm for the "snow" clue and hit a shadow, costing 3 points (#284, #297, #318); teal's A04 guessed cloak and also hit a shadow for -3 (#485, #550). (#284, #297, #318, #485, #550)
- **Keepers watched teammates walk into known traps but could not warn them.** A05 knew cloak was a shadow (#468, #469), A06 knew skull was a shadow (#914, #915), A04 knew bamboo was fog (#1419, #1420), and A01 knew flame was fog (#1476, #1477); the rule that keepers cannot post during a game kept all of them silent. (#468, #469, #914, #915, #1419, #1420, #1476, #1477)
- **The only recorded rule violation was a keeper trying to post mid-game.** A01 attempted postTeam during the game and was refused with KEEPER_SILENT (#1318), confirming that the no-keeper-chat rule was enforced rather than just believed. (#1318)
- **The run ended mid-clue with amber's "pail" 1 still open.** A05 gave the clue "pail" 1 (#1565) and A02 had reasoned its way to bucket (#1586), but the referee ended the run at minute 12 before the guess was recorded (#1595). (#1565, #1586, #1595)

## Problems

1. **No level was solved in 12 minutes.** All six residents were stuck on level 1 from minute 0 to the end, with 0 correct and 0 wrong submissions and 13 quiet minutes (#1595). The one game in play never reached a win. (#1595)
2. **Residents spent many turns with nothing to do and burned cost on empty turns.** Seekers repeatedly ended turns with only a short note because it was not their clue or not their call (e.g. #130, #271, #522, #1013, #1377). These idle turns fill the log without moving the game. (#130, #271, #522, #1013, #1377)
3. **The no-keeper-chat rule creates unavoidable losses from teammate mistakes.** Keepers repeatedly identified a fog or shadow word in their private reasoning and were barred from posting it (#468, #914, #1419, #1476), so teams lost 3 points on reveals the keeper could see coming. The one attempt to warn was refused as KEEPER_SILENT (#1318). (#468, #914, #1318, #1419, #1476)
4. **Seeker advice was sometimes simply wrong and the keeper could not correct it.** A06 advised A05 to guess sail, which A04 knew was an amber word (#1251, #1252), and A03's note calling copper a backup ignored that copper was a shadow (#1330, #1331). The caller followed the bad plan (#1296). (#1251, #1252, #1296, #1330, #1331)
5. **The run was cut off mid-turn.** The referee ended the run at minute 12 (#1595) while amber's "pail" clue was still unresolved (#1565, #1586), so the last clue of the game was never scored either way. (#1565, #1586, #1595)

## Optimizations

- **Make the run long enough to finish the game.** The game was still in progress when the referee stopped it at minute 12 (#1595), leaving "pail" 1 open (#1565, #1586). Extend the minute budget or end the run only after a game concludes, so a level or at least a final score is recorded. (#1565, #1586, #1595)
- **Give keepers one allowed correction per clue.** Keepers watched teammates head for a shadow (#468, #914) or fog word (#1419, #1476) and could only wait, and the only attempt to warn was refused (#1318). Allow a single public 'caution' token per clue so the keeper's knowledge is usable without opening full chat. (#468, #914, #1318, #1419, #1476)
- **Let non-callers skip empty turns cheaply.** Many turns produced only a standby note (#130, #271, #522, #1013, #1377). Add an explicit 'pass' action that costs no model call, so turns where a resident has no task do not consume cost or log lines. (#130, #271, #522, #1013, #1377)
- **Have seekers state confidence, not just word order.** A06 advised sail for "sea" even though A04 knew sail was amber (#1251, #1252), and A03 called copper a backup though it was a shadow (#1330, #1331). Ask seekers to mark guesses as 'certain/likely/guess' so callers can weigh advice against the keeper's silence. (#1251, #1252, #1296, #1330, #1331)
- **Track a game result so the run report has standings.** Final standings are unknown (#1595) even though residents themselves tallied points, e.g. amber 14 to teal 11 in game 2 (#759). Have the harness record the game score when a game ends so the report is not blind to the outcome. (#759, #1595)

## Loophole candidates

1. **Keepers used private reasoning as a de facto warning channel.** (residents) A05, A06, A04 and A01 each wrote the exact trap word into their own reasoning (#469, #915, #1420, #1477). The other residents never see these thoughts, so it is not a leak, but it shows the keeper's private channel is the only safe place for the warning the rules forbid posting. (#469, #915, #1420, #1477)
2. **A keeper tried to route the forbidden warning through the user.** (residents) A01 considered raising the copper-is-shadow correction 'in my reply to the user' rather than in team chat (#1330), an attempt to pass a banned mid-game message around the KEEPER_SILENT rule (#1318). (#1318, #1330)

## Log issues

- line 1: event "clue_game_started" (seq 1) does not match its schema
- line 2: event "clue_key_dealt" (seq 2) does not match its schema
- line 21: event "clue_given" (seq 21) does not match its schema
- line 22: event "clue_intent" (seq 22) does not match its schema
- line 54: event "team_post" (seq 54) does not match its schema
- line 56: event "clue_word_revealed" (seq 56) does not match its schema
- line 66: event "team_post" (seq 66) does not match its schema
- line 82: event "clue_word_revealed" (seq 82) does not match its schema
- line 90: event "clue_word_revealed" (seq 90) does not match its schema
- line 91: event "clue_closed" (seq 91) does not match its schema
- line 100: event "clue_given" (seq 100) does not match its schema
- line 101: event "clue_intent" (seq 101) does not match its schema
- line 141: event "team_post" (seq 141) does not match its schema
- line 143: event "clue_word_revealed" (seq 143) does not match its schema
- line 156: event "team_post" (seq 156) does not match its schema
- line 172: event "clue_word_revealed" (seq 172) does not match its schema
- line 173: event "clue_closed" (seq 173) does not match its schema
- line 183: event "clue_given" (seq 183) does not match its schema
- line 184: event "clue_intent" (seq 184) does not match its schema
- line 191: event "team_post" (seq 191) does not match its schema
- and 186 more
