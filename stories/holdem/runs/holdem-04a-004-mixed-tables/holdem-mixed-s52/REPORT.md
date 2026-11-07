# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `holdem-mixed` |
| Seed | 52 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 48 (referee) |
| Counted | events #3 to #6125 (5031 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 48 minutes (to the end); A02 on level 1 from minute 0 for 48 minutes (to the end); A03 on level 1 from minute 0 for 48 minutes (to the end); A04 on level 1 from minute 0 for 48 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.237 USD for this run (competitors 0.237, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0065 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 49 of 49 minutes without a submission; longest without one: minutes 0-48 (49) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3, TOOL_LOCKED 3, other 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A02 builds a large early lead in game 1 and holds it across games.** A02 wins game 1 with +95 against A01 -1, A03 -39 and A04 -55 (#1992), and by the end of game 2 is at +91 versus A01 -24, A03 -3, A04 -64 (#3215). A03 and A04 report similar standings at game 2's end (#3262, #3219). The match lead never changes hands in the logged stretch. (#1992, #3215, #3219, #3262)
- **A03 loses game 1 by calling too much, then fixes it in the brain.** A03 ends game 1 at -39 and writes that it lost mostly by calling weak hands and ace-high to the river (#1983). From game 3 on it repeatedly folds junk offsuit before the flop on that rule (#3285, #3462, #5166), and by the end of game 3 it is at +5, then +10 per its own note (#4492, #4512). (#1983, #3285, #3462, #4492, #4512)
- **A01 tries to save lessons in its brain and is rejected twice for length.** A01 attempts writeBrain at the end of game 2 with a 158-word draft and gets BRAIN_TOO_LONG (#3212), then tries again at the end of game 3 with 157 words and is refused again (#4506). Its later reasoning shows it knows writeBrain is only open in the retro window (#1666, #3166). (#1666, #3166, #3212, #4506)
- **A04 bets strongly with made hands and takes several pots from A02 and A03.** A04 wins hand 1 of game 3 with jacks and threes over A02's sevens and threes (#3454), and later takes a 40-pot with queens and threes over A03's queens and twos (#3964). A03 records the second loss explicitly and notes A04 will call with two pair (#3950). (#3454, #3950, #3964)
- **Residents repeatedly misread whose turn it is, wasting many actions.** Residents say to themselves 'waiting for X' instead of acting in dozens of turns, e.g. A04 #129, #253, #328, A02 #200, #286, #415, and A01 #2039. A02 even reasons it is not up while A04 acts (#2187), and A03 has to check the table to resolve a contradictory turn notice (#1272). (#129, #200, #253, #286, #328, #415, #1272, #2187)
- **One act is refused by schema validation and one by tool lock.** A03's act at minute 12 is refused because its 'action' field doesn't match the schema and the received value was 'wait' (#1618). A03 is also refused act twice with TOOL_LOCKED (#385, #825), and statements in early reasoning confirm writeBrain and act were locked at game start (#53, #67). (#53, #67, #385, #825, #1618)

## Problems

1. **No level is solved and there are no submissions in 48 minutes.** All four residents remain on level 1 from minute 0 to 48 with zero correct submissions and one 49-minute quiet stretch (#6125, #53). The run never produces the core progress the story needs. (#53, #6125)
2. **The brain-writing rule blocks the main learning loop.** writeBrain is locked until a retro window (#53), which residents only get at game end, and then two of the four attempts fail on the 150-word cap (#3212, #4506). Residents spend reasoning cycles re-deriving this (#1666, #3166, #5975) instead of playing. (#53, #1666, #3166, #3212, #4506, #5975)
3. **Turn-order confusion produces many no-op turns.** Residents repeatedly end turns with 'waiting for X' and sometimes contradict the notice, e.g. A03 at #1272 and A02 at #2187. Each such turn burns a model call and delays the hand. (#129, #253, #415, #1272, #2187)
4. **Tool schemas reject legitimate actions.** A03's act with action 'wait' fails validation (#1618), and A03 is blocked from acting by TOOL_LOCKED twice (#385, #825), so the resident cannot take the action it intended. (#385, #825, #1618)
5. **Only one model plays all four seats, flattening the competition.** All four residents are the same competitor, claude-haiku-5-5, and no gamemaker actions occur. The table reads as one policy against itself (e.g. all four folding to weak opens in #4288, #4376, #4957), so secret goals and motives never produce real rivalry. (#4288, #4376, #4957)

## Optimizations

- **Raise or remove the brain word cap and open the retro window more often.** The 150-word limit rejects two useful lessons (#3212, #4506). Allow longer brains or auto-trim instead of refusing, and open the retro window after each game rather than only at match end (#53). (#53, #3212, #4506)
- **Send an explicit turn owner with each prompt and suppress no-op turns.** Many turns are spent saying 'waiting for X' (#129, #253, #415, #2187). Include the acting seat and legal actions in the prompt, and block end-of-turn without an action when the resident is actually up. (#129, #253, #415, #2187)
- **Fix the act schema so 'wait' and similar values validate.** A03's act was refused because 'wait' did not match the schema (#1618). Extend the allowed action enum or map 'wait' to check/fold, so legitimate intents are not dropped. (#1618)
- **Unlock writeBrain and act at the start of a game, not behind a retro gate.** TOOL_LOCKED rejections happened at minutes 2 and 6 (#385, #825) while residents wanted to act or write. Let the brain be readable and writable at any inter-hand gap; locked tools only cost calls. (#53, #67, #385, #825)
- **Add a gamemaker role to drive pressure and a varied field.** No gamemaker actions occurred in the run and all seats are the same competitor. Assign a gamemaker to inject blinds/levels or events and mix model providers so the four residents have distinct policies. (#4288, #4376, #4957)

## Loophole candidates

1. **Residents fold instead of playing marginal spots that the story likely wants contested.** (residents) Several residents adopt 'fold junk offsuit' rules (A03 #2596, #3285, A02 #3955) and fold hands that pot odds justify (A01 #5197 folds Q3o at 4:1; A03 #5854 folds 85o for 1 chip). This is a safe, cheap path that avoids the risky play the designers likely intended. (#2596, #3285, #3955, #5197, #5854)
2. **Residents spend turns on self-talk instead of action when not up.** (residents) Repeated SAYS TO ITSELF lines such as A04 #129, #253, #328 and A02 #415, #286 take a cheap no-op turn each time. This is an unintended way to burn a turn without acting or being penalized. (#129, #253, #286, #328, #415)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 31: event "brain_written" (seq 31) does not match its schema
- line 32: event "retro_closed" (seq 32) does not match its schema
- line 39: event "brain_written" (seq 39) does not match its schema
- line 40: event "retro_closed" (seq 40) does not match its schema
- line 80: event "game_started" (seq 80) does not match its schema
- line 81: event "hand_started" (seq 81) does not match its schema
- line 82: event "cards_dealt" (seq 82) does not match its schema
- line 83: event "action_taken" (seq 83) does not match its schema
- line 84: event "action_taken" (seq 84) does not match its schema
- line 91: event "decision_scored" (seq 91) does not match its schema
- line 92: event "action_taken" (seq 92) does not match its schema
- line 100: event "decision_scored" (seq 100) does not match its schema
- line 101: event "action_taken" (seq 101) does not match its schema
- line 115: event "decision_scored" (seq 115) does not match its schema
- line 116: event "action_taken" (seq 116) does not match its schema
- line 123: event "decision_scored" (seq 123) does not match its schema
- line 124: event "action_taken" (seq 124) does not match its schema
- line 125: event "board_dealt" (seq 125) does not match its schema
- and 1074 more
