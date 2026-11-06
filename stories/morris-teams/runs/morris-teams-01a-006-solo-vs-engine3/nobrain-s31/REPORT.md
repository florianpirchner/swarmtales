# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `morris-teams-nobrain-solo-vs-engine3` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 21 (referee) |
| Counted | events #2 to #928 (693 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 21 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.032 USD for this run (competitors 0.032, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0014 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 22 of 22 minutes without a submission; longest without one: minutes 0-21 (22) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 played whole games privately in its own reasoning** A01's reasoning describes full nine-men's-morris games against an opponent, including placements and mills (#13, #233), a lost game (#253), and a second game with a recap (#726). None of this appears in the city record as submissions, transfers or messages. (#13, #233, #253, #726)
- **A01 described its own losses inside the reasoning** A01 concluded a game was over because it had no legal move (#253), later noted it was down 6 pieces to 9 (#598), then four to nine (#677) and reduced to two pieces (#726). These are claims in private thoughts, not verified city events. (#253, #598, #677, #726)
- **A01 considered a team note and dropped it** At minute 16 A01 thought about posting a team note with lessons but decided notes do not carry between games and reported the result instead (#725, #726). This is the only moment near a board post, and it stayed private. (#725, #726)
- **A01 restarted its opening from scratch twice** A01 proposed the center point 5 as an opening at minute 0 (#13) and again at minute 17 (#743), then worked through opening sequences again (#764, #786). This shows it treated the stall as fresh games rather than progress on level 1. (#13, #743, #764, #786)
- **Twenty-one minutes ended with no city-visible action** The run ended at minute 21 with A01 still on level 1, no submissions, no transfers and no messages (#928). Everything A01 did was reasoning or a self-addressed remark (#726). (#726, #928)

## Problems

1. **A01 never submitted anything in 21 minutes** The facts show zero correct and zero wrong submissions and 22 quiet minutes, while A01's reasoning describes dozens of moves (#13 through #914). The resident played the game in its head instead of taking city actions. (#13, #914)
2. **The task and the game were disconnected** A01 reasoned about nine-men's-morris boards (#38, #64) with no sign that this mapped to a level, submission or points. Nothing in the log shows a submission attempt or an error teaching it otherwise. (#38, #64)
3. **A01 invented an opponent and outcomes the city did not record** A01 treated an 'O' as its opponent and declared game results (#253, #591, #726), but the facts record no opponent, no wins or losses, and no referee judgments besides the end of the run (#928). This is a rules misunderstanding inside the reasoning. (#253, #591, #726, #928)
4. **Repeated restarts wasted the run** A01 went back to an opening at minute 0, minute 6 and minute 17 (#13, #270, #743) and opened new games at minute 17 and minute 18 (#764, #786). With only one resident and one level, this consumed the whole run without a single step of progress. (#13, #270, #743, #764, #786)
5. **No feedback loop from the city to correct the resident** There were no tool errors and no gamemaker actions, so nothing broke A01's private game loop in 21 minutes. The city stayed silent while A01 lost game after game in its reasoning (#253, #677). (#253, #677)

## Optimizations

- **Require an explicit submit step each turn** The harness should force every reasoning cycle to end in a city action (submit a move, pass, or ask) and record it. A01 reasoned through the entire run with no submission, so the run produced no data for designers. (#13, #914)
- **Give the resident the actual rules and board state** Feed the level's rules and the real board state in the prompt instead of letting the resident invent an opponent. A01 manufactured an 'O' and declared losses at #253 and #591 that the city never recorded. (#253, #591)
- **Add a stall nudge from the gamemaker** After a set number of quiet minutes, the gamemaker should prompt the resident with the current level, legal moves and time left. The facts show 22 quiet minutes and no gamemaker actions, and A01 simply restarted its opening at #743 instead of progressing. (#743, #928)
- **Detect restarts and re-anchor the resident** When the resident begins a fresh opening, the harness should tell it that prior moves still stand on the current level. A01 reopened at #270, #743 and #764, wasting most of the run on level-1 openings. (#270, #743, #764)
- **Make level progression visible in the log** Record each level, attempt and submitted answer as its own event so analysts can see where the resident believes it is. A01 stayed on level 1 with no submissions, and only reasoning lines show what it thought it was doing. (#726, #928)

## Loophole candidates

1. **A01 escaped the city by playing in its head** (residents) Rather than competing for seats, A01 played complete private games that produced no submissions, transfers or messages (#726). This satisfied its reasoning loop without ever engaging the city's rules, so the run recorded no competitive behavior to design against. (#726, #928)

## Log issues

- line 1: event "game_started" (seq 1) does not match its schema
- line 16: event "move_proposed" (seq 16) does not match its schema
- line 17: event "consensus_reached" (seq 17) does not match its schema
- line 24: event "move_played" (seq 24) does not match its schema
- line 25: event "move_played" (seq 25) does not match its schema
- line 26: event "move_scored" (seq 26) does not match its schema
- line 27: event "move_scored" (seq 27) does not match its schema
- line 41: event "move_proposed" (seq 41) does not match its schema
- line 42: event "consensus_reached" (seq 42) does not match its schema
- line 50: event "move_played" (seq 50) does not match its schema
- line 51: event "move_played" (seq 51) does not match its schema
- line 52: event "move_scored" (seq 52) does not match its schema
- line 53: event "move_scored" (seq 53) does not match its schema
- line 67: event "move_proposed" (seq 67) does not match its schema
- line 68: event "consensus_reached" (seq 68) does not match its schema
- line 75: event "move_played" (seq 75) does not match its schema
- line 76: event "move_played" (seq 76) does not match its schema
- line 77: event "move_scored" (seq 77) does not match its schema
- line 78: event "move_scored" (seq 78) does not match its schema
- line 93: event "move_proposed" (seq 93) does not match its schema
- and 215 more
