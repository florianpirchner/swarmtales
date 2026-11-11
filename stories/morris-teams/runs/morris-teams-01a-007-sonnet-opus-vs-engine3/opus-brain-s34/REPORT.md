# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `morris-teams-solo-vs-engine3` |
| Seed | 34 |
| Start | fresh, level 1 |
| Competitors | `claude-opus-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 31 (referee) |
| Counted | events #2 to #1877 (1247 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 31 minutes (to the end) |
| Final standings | unknown |
| Cost | 2.372 USD for this run (competitors 2.372, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0022 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 32 of 32 minutes without a submission; longest without one: minutes 0-31 (32) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 played alone and said so explicitly.** A01 opened the run by stating it was the only one on the team and would skip waiting on anyone, reading the brain code and writing it itself (#7). No messages, DMs or board posts were ever recorded, so this solo framing was never contested. (#7)
- **A01 wrote a playbook brain and immediately hit the word limit.** A01 produced a strategy brain of 287 words at minute 0 (#22), but its later rewrites were refused twice for exceeding 300 words: 334 words at minute 12 (#741) and 339 words at minute 19 (#1189). Both refusals are the run's only tool errors. (#22, #741, #1189)
- **A01 narrated three separate games of mill against itself.** A01 described winning game 1 as X in 69 turns (#753), losing game 2 after 45 turns when down to two pieces (#1202), and being level at one game each, before starting a third. None of these counted as submissions, which stayed at zero for the whole run. (#753, #1202)
- **A01 reached a winning flying position at the very end.** At minute 30 A01 found itself with three pieces able to fly and O also flying (#1833), then planned to fly 21 to 23 or 17 to 19 to close a mill and win (#1854). The referee ended the run at minute 31 before any of that was submitted (#1877). (#1833, #1854, #1877)

## Problems

1. **The whole run was one resident on level 1.** A01 was stuck on level 1 from minute 0 to minute 31, the run's end, with no level solved, no points and no rank (#1877). The story 'morris-teams-solo-vs-engine3' produced no competition because there was nobody to compete with. (#7, #1877)
2. **Zero submissions in 32 quiet minutes.** No correct or wrong submission was ever recorded, and the longest gap without one covers the entire run (minutes 0-31). A01 spent that time reasoning about boards and writing brains, never turning play into a submission. (#22, #1854)
3. **The brain word limit blocked the main feedback loop.** Two of A01's brain updates were refused with BRAIN_TOO_LONG at 334 and 339 words against a 300-word limit (#741, #1189). The resident kept growing its brain after each game, so the limit fought exactly the behaviour the story rewards. (#741, #1189)
4. **A01's play was never visible to the city.** Every A01 line in the log is a REASONING or SAYS TO ITSELF line, plus the two refusals; there are no messages, group posts or transfers. The other residents, and the referee, had no window into what A01 was actually doing. (#22, #753, #1202)

## Optimizations

- **Give the resident something that counts as a submission.** A01 finished a winnable mill position at minute 30 (#1854) but the run ended at minute 31 with zero submissions (#1877). Make each completed game or move sequence register as a submission so progress is scored instead of silently lost. (#1854, #1877)
- **Raise or auto-trim the brain word limit.** The 300-word cap refused A01's 334-word and 339-word brains (#741, #1189) right after it had learned from a game. Either raise the limit or have the harness summarise the excess automatically, so learning is not thrown away. (#741, #1189)
- **Add a second resident or a live opponent.** A01 noted it was the only one on the team (#7) and the standings are unknown with one resident. The teams story needs at least two residents, or the engine opponent should be presented as one, so that levels and competition actually exist. (#7)
- **Prompt the resident to post and to submit.** With zero DMs, board posts and messages, A01 only spoke to itself (#22, #753). Add a story beat that requires a board post or a status update before the next game, so reasoning becomes visible and shared. (#22, #753)

## Loophole candidates

1. **A01 played a private mill game instead of the city's game.** (residents) Rather than using the city's channels, A01 self-annotated entire mill games and rewrote its own brain (#753, #1202), which cost nothing and produced no scored events. This is a cheaper path that satisfies the resident without advancing the story. (#753, #1202)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 16: event "brain_written" (seq 16) does not match its schema
- line 17: event "retro_closed" (seq 17) does not match its schema
- line 28: event "game_started" (seq 28) does not match its schema
- line 42: event "move_proposed" (seq 42) does not match its schema
- line 43: event "consensus_reached" (seq 43) does not match its schema
- line 45: event "move_played" (seq 45) does not match its schema
- line 46: event "move_played" (seq 46) does not match its schema
- line 47: event "move_scored" (seq 47) does not match its schema
- line 48: event "move_scored" (seq 48) does not match its schema
- line 57: event "move_proposed" (seq 57) does not match its schema
- line 58: event "consensus_reached" (seq 58) does not match its schema
- line 60: event "move_played" (seq 60) does not match its schema
- line 61: event "move_played" (seq 61) does not match its schema
- line 62: event "move_scored" (seq 62) does not match its schema
- line 63: event "move_scored" (seq 63) does not match its schema
- line 72: event "move_proposed" (seq 72) does not match its schema
- line 73: event "consensus_reached" (seq 73) does not match its schema
- line 75: event "move_played" (seq 75) does not match its schema
- line 76: event "move_played" (seq 76) does not match its schema
- and 610 more
