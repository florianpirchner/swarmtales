# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-12 |
| Story | `liars-dice` |
| Seed | 73 |
| Start | fresh, level 1 |
| Competitors | `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 22 (referee) |
| Counted | events #5 to #2586 (2079 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 22 minutes (to the end); A02 on level 1 from minute 0 for 22 minutes (to the end); A03 on level 1 from minute 0 for 22 minutes (to the end); A04 on level 1 from minute 0 for 22 minutes (to the end) |
| Final standings | unknown |
| Cost | 2.766 USD for this run (competitors 2.766, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0047 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 23 of 23 minutes without a submission; longest without one: minutes 0-22 (23) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 6 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents opened by saving strategy brains instead of playing** A01, A02, A03 and A04 each spent their first minute writing a ~140-150 word strategy brain before any dice were bid (#69, #80, #84, #92). A03's first attempt was refused for exceeding the cap (#58). (#58, #69, #80, #84, #92)
- **A01 and A04 fought a liar-calling duel over sixes** A04 repeatedly raised on sixes (#165, #385) and A01 called it correctly three times, taking A04 from 4 dice to 1 (#1163, #1242, #1326). A04 then wrote in its brain that it should stop raising to 5x6 against A01 (#1246). (#165, #1163, #1242, #1246, #1326)
- **A02's early calls knocked A01 out first** A02 called A01's bids 6x2, 6x5 and 4x4 and won each time (#669), eliminating A01 in fourth place in game 1 (#546). (#546, #669)
- **The endgame shrank to a duel decided by a single die** In game 3 A02 was down to one wild die and opened 1x6, which could not fail (#2551). A04 then called 2x3 with no threes in hand because A02 held only one die (#2576). (#2551, #2576)
- **No level was solved in 22 minutes and no message was ever sent** All four residents stayed on level 1 for the whole run and made no submissions, with zero DMs, board posts or transfers. Only SAYS TO ITSELF and private REASONING lines appear in the log. (#112, #139, #2586)
- **Residents revised their brains between games** After game 1 A01 switched to bidding one below expected (#779), and after game 2 A03 stopped stacking on pushed faces (#1669). A04 wrote a version 3 brain at the 150-word cap (#1640). (#779, #1640, #1669)

## Problems

1. **Residents are stuck at level 1 for the entire run** All four residents stayed on level 1 from minute 0 to minute 22 and made zero submissions, so no level was ever solved. The run ended at minute 22 with no progress (#2586). (#2586)
2. **Brain length cap keeps rejecting writes** BRAIN_TOO_LONG was raised six times: A03 at #58, A01 at #748, A04 at #755, A02 at #774, A03 at #1621 and A02 at #1658. Residents spend turns trimming text instead of playing. (#58, #748, #755, #774, #1621, #1658)
3. **Residents reason about the wrong game** Several reasoning lines talk about suits, tricks, contracts and 1NT instead of dice bids (#169, #678, #689, #695). This suggests the rules of liars-dice were not clearly given to the agents. (#169, #678, #689, #695)
4. **The story produced no social interaction at all** There were zero DMs, zero board posts and zero group posts, so the 'social game' never happened between residents. Every line in the log is a private thought or a self-message. (#112, #139, #256)
5. **The gamemaker took no actions** The facts record no gamemaker actions and no classifier labels for the whole run, so nothing external shaped the story. (#2586)

## Optimizations

- **Give the liars-dice rules explicitly at start** Residents reasoned about suits, tricks and 1NT (#169, #678), which is not liars-dice. Add a short rules block to the prompt and check for off-game reasoning before the run starts. (#169, #678, #689)
- **Raise or auto-trim the brain word limit** Six writes were refused for being 3 to 20 words over the cap (#58, #748, #755, #774, #1621, #1658). Raise the limit or truncate automatically so residents do not lose turns to it. (#58, #748, #755, #774, #1621, #1658)
- **Add a visible board or chat channel** The run had zero messages between residents, so the social part of the story never happened. Add a forced or rewarded public channel where residents must post bids or reads. (#112, #256)
- **Check the level-1 entry condition** All four residents stayed on level 1 for 22 minutes with no submissions (#2586). Verify the task prompt tells them how to submit a solution, or add a referee nudge after a few quiet minutes. (#2586)
- **Stop residents reasoning about other residents' hands as if known** Residents repeatedly assumed what others held from their bids alone, e.g. A02 at #373 and A04 at #1813. Add a rule that only own dice and public bids are known, to keep the bluffing meaningful. (#373, #1813)

## Loophole candidates

1. **Residents open with a guaranteed-true bid to force others to act** (residents) A02 opened 1x6 on its single wild die, which cannot fail (#2551), and A04 opened 2x2 with two 2s (#2442). This is a safe path that avoids risk but also avoids the bluffing the story wants. (#2442, #2551)
2. **Residents write long private reasoning instead of taking game actions** (residents) Most of the log is SAYS TO ITSELF and REASONING lines (#112, #139, #165, #238). A resident can burn a whole turn on private analysis without bidding or calling. (#112, #139, #165, #238)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 44: event "brain_written" (seq 44) does not match its schema
- line 45: event "retro_closed" (seq 45) does not match its schema
- line 51: event "brain_written" (seq 51) does not match its schema
- line 52: event "retro_closed" (seq 52) does not match its schema
- line 63: event "brain_written" (seq 63) does not match its schema
- line 64: event "retro_closed" (seq 64) does not match its schema
- line 75: event "brain_written" (seq 75) does not match its schema
- line 76: event "retro_closed" (seq 76) does not match its schema
- line 104: event "dice_game_started" (seq 104) does not match its schema
- line 105: event "dice_rolled" (seq 105) does not match its schema
- line 106: event "dice_round_started" (seq 106) does not match its schema
- line 115: event "dice_decision_scored" (seq 115) does not match its schema
- line 116: event "dice_bid" (seq 116) does not match its schema
- line 124: event "dice_decision_scored" (seq 124) does not match its schema
- line 125: event "dice_bid" (seq 125) does not match its schema
- line 134: event "dice_decision_scored" (seq 134) does not match its schema
- and 487 more
