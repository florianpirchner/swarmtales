# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `holdem-mixed` |
| Seed | 51 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 53 (referee) |
| Counted | events #3 to #6822 (5596 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 53 minutes (to the end); A02 on level 1 from minute 0 for 53 minutes (to the end); A03 on level 1 from minute 0 for 53 minutes (to the end); A04 on level 1 from minute 0 for 53 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.272 USD for this run (competitors 0.272, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0061 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 54 of 54 minutes without a submission; longest without one: minutes 0-53 (54) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 3, TOOL_LOCKED 3 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 wins the first hand and leads game 1 with a straight** A01's King-Jack made the broadway straight on a Ten-Queen-Ace board in hand 1, and A02 recorded the loss explicitly (#406, #407). A01 then built a set of sixes in hand 2 for 34 points (#2427). (#406, #407, #2427)
- **Residents misread whose turn it is repeatedly and idle turns** A01, A02, A03 and A04 all end turns saying 'not my turn' while the preceding line names them as the one to act (#143, #150, #2013, #4215, #5112). This pattern runs through all four games. (#143, #150, #2013, #4215, #5112)
- **The table is loose-passive and the residents learn it in their brains** A01's brain notes opponents 'call often, rarely fold, and sometimes raise preflop' (#1909), and A03's notes A01 raises a lot and A04 calls often (#1920). A02 calls A01's river raise a 'real strength' read after being burned (#348, #2182). (#348, #1909, #1920, #2182)
- **The match itself plays out over four games with no level progress** Games end at minute 14, 38, and 52 with standings reported by residents (#1939, #4989, #6775). Despite all this poker, no level is solved and nobody submits anything. (#1939, #4989, #6775)
- **writeBrain locked outside retro windows causes residents to burn turns** A01 notes writeBrain is 'locked to me right now' at minute 52 (#6774, #6775), and A03 waits on the retro window (#6711). A01 also tried to write a brain at #1909 during play. (#1909, #6711, #6774, #6775)

## Problems

1. **All four residents are stuck on level 1 for the whole run with zero submissions** The computed facts show every resident at level 1 from minute 0 to 53 and 54 quiet minutes with no submission (#6775). The whole run is poker hands with no puzzle attempt. (#1939, #6775)
2. **Turn-order confusion wastes many turns** Residents repeatedly reason that the system message contradicts who is to act and end their turn without acting (#143, #4215, #5112, #3542). This is not a one-off; it recurs each game. (#143, #3542, #4215, #5112)
3. **Brain writes are blocked for most of the run and residents collide with it** A01 finds only viewTable and readBrain open at minute 0 (#53) and writeBrain locked at minute 52 (#6774). A01 attempts a brain write mid-hand at #1909 despite the lock. (#53, #1909, #6774)
4. **Tool errors interrupt the flow** The facts record BRAIN_TOO_LONG 3 and TOOL_LOCKED 3. A03's brain is reported at 142 words (#1956) and A01's at 143 (#4980), close to the limit, while A01's mid-hand attempt at #1909 tried to stay under 150 words. (#1909, #1956, #4980)
5. **No messages, transfers or gamemaker actions ever happen** The facts show 0 DMs, 0 board posts, 0 transfers and no gamemaker actions across 53 minutes. Residents only ever speak to themselves (#60, #807). (#60, #807)

## Optimizations

- **Make the turn indicator unambiguous** The repeated 'not my turn' endings after the system names them (#143, #4215) suggest the acting-player field is inconsistent. Show the acting seat explicitly and only prompt that seat to act. (#143, #4215, #5112)
- **Surface a level-1 objective early so play does not collapse into endless poker** Residents spend all 53 minutes on four-game poker and never submit (#6775). Gate or cap hands per game and put the submission requirement in front of residents. (#1939, #4989, #6775)
- **Open brain writes in a clear retro window and raise the word limit** A01 is blocked from writing at #6774 and residents hit BRAIN_TOO_LONG (#1956, #4980). Allow a fixed word budget with visible counter, or open writeBrain between hands. (#53, #1956, #4980, #6774)
- **Give the residents a channel to talk to each other** 0 messages in 54 minutes (#60, #807) means reads are done through play only. A short table-talk or board post option would let the mixed story actually use communication. (#60, #807)

## Loophole candidates

1. **Residents narrate poker strategy in long private monologues instead of acting** (residents) Many REASONING lines reconstruct pot odds at length (#222, #263, #271) and answer with only a self-message (#294, #356). This uses the reasoning budget for calculation rather than decisions, sidestepping the intended action loop. (#222, #263, #271, #294, #356)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 30: event "brain_written" (seq 30) does not match its schema
- line 31: event "retro_closed" (seq 31) does not match its schema
- line 37: event "brain_written" (seq 37) does not match its schema
- line 38: event "retro_closed" (seq 38) does not match its schema
- line 78: event "game_started" (seq 78) does not match its schema
- line 79: event "hand_started" (seq 79) does not match its schema
- line 80: event "cards_dealt" (seq 80) does not match its schema
- line 81: event "action_taken" (seq 81) does not match its schema
- line 82: event "action_taken" (seq 82) does not match its schema
- line 91: event "decision_scored" (seq 91) does not match its schema
- line 92: event "action_taken" (seq 92) does not match its schema
- line 100: event "decision_scored" (seq 100) does not match its schema
- line 101: event "action_taken" (seq 101) does not match its schema
- line 110: event "decision_scored" (seq 110) does not match its schema
- line 111: event "action_taken" (seq 111) does not match its schema
- line 130: event "decision_scored" (seq 130) does not match its schema
- line 131: event "action_taken" (seq 131) does not match its schema
- line 132: event "board_dealt" (seq 132) does not match its schema
- and 1206 more
