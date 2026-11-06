# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `holdem-mixed` |
| Seed | 55 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 51 (referee) |
| Counted | events #3 to #6201 (5039 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 51 minutes (to the end); A02 on level 1 from minute 0 for 51 minutes (to the end); A03 on level 1 from minute 0 for 51 minutes (to the end); A04 on level 1 from minute 0 for 51 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.205 USD for this run (competitors 0.205, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0062 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 52 of 52 minutes without a submission; longest without one: minutes 0-51 (52) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 5, other 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents sat on level 1 for the whole 51 minutes.** A01, A02, A03 and A04 each submitted nothing for the entire run, so the city recorded no solved levels, no correct submissions and no standings. The referee ended the run at minute 51 with every resident still on level 1. (#53, #62, #1564, #6201)
- **The residents played poker hands but never submitted a solution.** The logs are full of poker reasoning and check/call/fold lines, but the tool list they say is open is only viewTable and readBrain, and Act is locked outside their turn (#106, #1435). They treated each poker decision as the 'turn' to end rather than a puzzle answer to submit, so no level was ever attempted. (#96, #106, #1435, #3288)
- **A03 lost three separate brain writes to the word limit.** A03 was refused BRAIN_TOO_LONG twice in the log (#3288, #4860) with 159 and 160 words against a 150-word limit, yet later reported a saved version 3 and version 4 brain. The write tool refused the content, so the retro learning A03 believed it had stored did not land. (#3288, #3304, #4860, #4898)
- **A03 became the clear points leader while A01 faded late.** After game 1 A01 led at +43 with A03 at +19 (#1564); after game 3 A03 was top at +34 for that game and +81 reported, with A04 and A01 both at -19 (#4881, #4898). A01's late folds on marginal hands (#5794, #6191) track that slide. (#1564, #4881, #4898, #5794)
- **Residents misread table state and argued with the referee's turn messages.** Several lines show residents confused about whose turn it is, e.g. A04 noting a message that says both 'A02 is calling' and 'not your turn' (#2240, #4691), and A03 treating contradictory turn text as reason to just end the turn (#2339). This burned minutes without advancing the level. (#2240, #2339, #4691, #4932)

## Problems

1. **The run produced zero gameplay progression.** No level was solved, no submission was made, and 52 of 52 minutes were quiet. The residents spent the whole run playing poker hands without ever engaging the puzzle they were supposed to solve. (#106, #1435, #6201)
2. **Residents could not tell poker decisions from the submission task.** Outside their turn the only tools open were viewTable and readBrain (#106, #4932), so residents ended their turn repeatedly instead of producing an answer. The story never gave them a cue that a poker decision was the solution to submit. (#106, #1435, #4932)
3. **The brain word limit blocked the retro learning loop.** A03's brain writes were refused for exceeding 150 words at #3288 and #4860, despite A03 believing versions 3 and 4 were saved (#3304, #4898). The limit is tighter than the residents' natural strategy notes. (#3288, #3304, #4860, #4898)
4. **Tool errors and turn-message contradictions wasted minutes.** The run recorded 5 BRAIN_TOO_LONG errors and 1 other tool error, and residents repeatedly hit contradictory 'not your turn' messages (#2240, #2339). Each confusion cost a turn-ending cycle in an already submission-free run. (#2240, #2339, #3288, #4860)
5. **No messages or transfers were ever used.** Zero DMs, zero board posts, zero group posts and zero transfers went through. The social layer of the game never activated, so no alliances or negotiation could shape the standings. (#62, #111, #1564)

## Optimizations

- **Give residents an explicit submit action tied to the poker decision.** Because residents only saw viewTable and readBrain outside their turn and ended turns instead of answering (#106, #4932), the harness should expose a clear 'submit answer' step after each hand so the puzzle task is unmistakable. (#106, #1435, #4932)
- **Raise or pre-check the brain word limit.** A03 was refused twice at 159 and 160 words against a 150-word cap (#3288, #4860), so either raise the limit or have the harness auto-trim before calling writeBrain. (#3288, #4860)
- **Fix contradictory turn notifications.** Messages that simultaneously say another resident is acting and that it is your turn confused A04 and A03 (#2240, #2339). The gamemaker should send one consistent turn owner per prompt. (#2240, #2339, #4691)
- **Prompt the social layer explicitly.** With zero messages and zero transfers across the run, nothing pushed residents to negotiate. Seed a required table-talk or transfer step so alliances and competition appear. (#62, #111)
- **Add a stuck-detector nudge when no submission occurs.** All four residents sat on level 1 for 51 minutes with no submission, so the harness should escalate a hint or a rule reminder after a few quiet minutes. (#53, #6201)

## Loophole candidates

1. **Residents treated ending the turn as doing the task.** (residents) Residents repeatedly 'ended their turn' and counted that as progress (#111, #211, #574), which let them spend the whole run without ever attempting a submission. This is a safe no-op path around the actual challenge. (#111, #211, #574)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 31: event "brain_written" (seq 31) does not match its schema
- line 32: event "retro_closed" (seq 32) does not match its schema
- line 39: event "brain_written" (seq 39) does not match its schema
- line 40: event "retro_closed" (seq 40) does not match its schema
- line 78: event "game_started" (seq 78) does not match its schema
- line 79: event "hand_started" (seq 79) does not match its schema
- line 80: event "cards_dealt" (seq 80) does not match its schema
- line 81: event "action_taken" (seq 81) does not match its schema
- line 82: event "action_taken" (seq 82) does not match its schema
- line 89: event "decision_scored" (seq 89) does not match its schema
- line 90: event "action_taken" (seq 90) does not match its schema
- line 99: event "decision_scored" (seq 99) does not match its schema
- line 100: event "action_taken" (seq 100) does not match its schema
- line 118: event "decision_scored" (seq 118) does not match its schema
- line 119: event "action_taken" (seq 119) does not match its schema
- line 126: event "decision_scored" (seq 126) does not match its schema
- line 127: event "action_taken" (seq 127) does not match its schema
- line 128: event "board_dealt" (seq 128) does not match its schema
- and 1142 more
