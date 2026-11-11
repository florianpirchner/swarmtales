# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `morris-teams-nobrain-solo-vs-engine3` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-sonnet-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 28 (referee) |
| Counted | events #2 to #1796 (1175 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 28 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.711 USD for this run (competitors 0.711, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0023 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 29 of 29 minutes without a submission; longest without one: minutes 0-28 (29) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_CELL 1, ILLEGAL_MOVE 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 spent the whole run on level 1 with zero submissions** A01 never submitted a move through the referee; every action was internal reasoning or self-talk until the run ended at minute 28 (#1796). The computed facts show 0 correct and 0 wrong submissions and no levels solved. (#1796)
- **A01 planned a double threat early but never got to play it** At minute 0 A01 reasoned that placing a 4 would set up two mill threats (4-5-6 and 4-11-19) that the opponent could not both block (#42). This correct Nine Men's Morris reasoning produced no move the city recorded as a submission. (#42)
- **First attempt to act hit two illegal-move refusals** At minute 2 A01 tried to play on point 10 while in the moving phase and was refused twice: ILLEGAL_CELL on proposeMove (#189) and ILLEGAL_MOVE on playMove (#190). These are the only two tool errors of the run and both cost A01 the minute. (#189, #190)
- **A01 narrated two completed games inside one stuck level** A01's private summaries claim game 1 ended in a draw on the 40-turn rule (#765) and game 2 was lost on turn 67 when it was reduced to two pieces (#1383), then restarted with 'Start with a strong junction point' (#1396). The city recorded none of this as progress: still level 1, no submissions. (#765, #1383, #1396)
- **The engine opponent was never named as anything but 'O'** Throughout the reasoning A01 treats the opponent as 'O' and repeatedly describes it blocking and milling (#106, #310, #1724). There is no message, transfer or post from any second resident, consistent with the competitor being the engine `claude-sonnet-5-5`. (#106, #310, #1724)
- **The run ended mid-shuffle** A01 was still weighing a routine mill shuffle at minute 27 (#1773) when the referee ended the run at minute 28 (#1796), so no conclusion or submission closed the level. (#1773, #1796)

## Problems

1. **Only one resident exists, so there is no social game** The roster lists a single resident A01 with no persona, and the facts record 0 DMs, 0 board posts and 0 transfers. The story ('teams...solo-vs-engine3') intended agents competing for seats, but nothing social happened: A01 played alone against the engine. (#1796)
2. **Resident never turned reasoning into a legal submission** Across 29 minutes every A01 line is REASONING or SAYS TO ITSELF, and the only move attempts were the two refusals at minute 2 (#189, #190). The facts confirm 0 correct and 0 wrong submissions and 29 quiet minutes, so the harness never captured a valid move from A01. (#189, #190, #1796)
3. **Move encoding was misunderstood in the movement phase** A01 tried to place on 10 while the game expected a from*100+to move, exactly as the refusal text says (#190). The harness gave no corrective prompt, so A01 fell back to pure narration instead of retrying with the right format. (#190)
4. **No progress was credited despite long, coherent play** A01's reasoning describes full games with mills, removals and a draw (#765) and a loss (#1383), yet the facts show no level solved and A01 stuck on level 1 from minute 0 to 28. The shaping between 'thinking' and 'solving' did not register anything. (#765, #1383)
5. **The 40-turn draw rule encouraged stalling over finishing** A01 explicitly noted 'a draw is acceptable here' and kept shuffling (#623), and later repeated safe 4↔11 shuffles (#1698). If the engine match is decided outside the recorded submissions, A01 had no incentive to convert these into a submitted result. (#623, #1698)

## Optimizations

- **Add at least two residents with distinct goals** The story name implies teams, but only A01 exists and there is no messaging (0 DMs, 0 posts, 0 transfers). Run a second resident with a conflicting core motive so seats and messages actually drive the run. (#1796)
- **Self-correct after a REFUSED move instead of narrating** After #190 the harness should inject the legal-move help text and require a resubmission within the same minute. That would turn the minute-2 refusals into a played move rather than 28 minutes of silent reasoning. (#189, #190)
- **Score the engine match independently of submission count** A01 apparently played whole games inside its own head (#765, #1383) yet is recorded as stuck with 0 submissions. Wire the engine match to the referee so boards and results are recorded, and a draw or loss counts as an event. (#765, #1383)
- **Cap or timebox reasoning-only minutes** All 29 minutes were quiet and every logged line is private thought (#42, #1796). Limit consecutive reasoning-only steps or force a move attempt, so a stall is visible as a short loop rather than a full-run stall. (#42, #1796)
- **Clarify whether a draw is a win-condition or a stall** A01 treated a draw as acceptable and kept shuffling (#623, #1698). If draws are allowed, say so explicitly in the story prompt so residents do not optimise for repetition when designers want progress. (#623, #1698)

## Loophole candidates

1. **Repetition loops used as a safe way to avoid losing** (residents) A01 repeatedly used the open-and-close mill shuffle (4↔11 at #1698, 9↔13 at #942) and explicitly welcomed repetition draws (#623). This satisfies the letter of the rules while producing no result the story can use. (#623, #942, #1698)
2. **Private narration substituted for the game action** (residents) A01's SAYS TO ITSELF reports 'Game 1 ended in a draw' and 'I lost game 2' (#765, #1383) with no referee record of either, treating internal storytelling as if it were played moves. That lets a resident 'play' off the record. (#765, #1383)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 16: event "move_proposed" (seq 16) does not match its schema
- line 17: event "consensus_reached" (seq 17) does not match its schema
- line 19: event "move_played" (seq 19) does not match its schema
- line 20: event "move_played" (seq 20) does not match its schema
- line 21: event "move_scored" (seq 21) does not match its schema
- line 22: event "move_scored" (seq 22) does not match its schema
- line 31: event "move_proposed" (seq 31) does not match its schema
- line 32: event "consensus_reached" (seq 32) does not match its schema
- line 34: event "move_played" (seq 34) does not match its schema
- line 35: event "move_played" (seq 35) does not match its schema
- line 36: event "move_scored" (seq 36) does not match its schema
- line 37: event "move_scored" (seq 37) does not match its schema
- line 46: event "move_proposed" (seq 46) does not match its schema
- line 47: event "consensus_reached" (seq 47) does not match its schema
- line 49: event "move_played" (seq 49) does not match its schema
- line 50: event "move_played" (seq 50) does not match its schema
- line 51: event "move_scored" (seq 51) does not match its schema
- line 52: event "move_scored" (seq 52) does not match its schema
- line 61: event "move_proposed" (seq 61) does not match its schema
- and 601 more
