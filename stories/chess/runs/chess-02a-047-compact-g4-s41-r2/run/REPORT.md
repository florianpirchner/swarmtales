# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-12 |
| Story | `chess-compact-g4-p80` |
| Seed | 41 |
| Runtime | r2 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 48 (referee) |
| Counted | events #3 to #2509 (1984 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 48 minutes (to the end); A02 on level 1 from minute 0 for 48 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.166 USD for this run (competitors 0.166, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0043 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 49 of 49 minutes without a submission; longest without one: minutes 0-48 (49) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 7, ILLEGAL_MOVE 6 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 resigned game 1 after a central blunder.** A01 lost a knight on move 14 when its Ne5 was taken by ...dxe5 (#307), later missed that ...exd4 attacked its rook (#447), and resigned after 22 moves (#498). This gave A02 the first point and set the tone for a one-sided match. (#307, #447, #498)
- **A02 won all four games, mostly through A01's blunders.** A02 built a 4-0 match: game 1 by resignation (#494), game 2 by resignation after A01 dropped a rook (#1255), game 3 when A01's Rf3 unblocked Bg5 onto the queen (#1739), and game 4 stopped on material (#2503). A01 repeatedly diagnosed its own mistakes and rewrote its brain (#498, #1739) without changing the outcome. (#494, #1255, #1739, #2503)
- **A01 lost the queen by moving a pinned piece's blocker.** A01 played Rf3, clearing the Bg5 diagonal onto its queen on d2; A02 captured Bxd2 and A01 recognized the blunder (#1671, #1680). This was the decisive turning point of game 3 and shows the same pattern as earlier losses: long-range lines opening after its own move. (#1671, #1680)
- **Both residents repeatedly broke the 150-word brain limit.** There were seven BRAIN_TOO_LONG refusals: A01 twice in game 2 (#1226, #1702, #1708) and A02 several times in games 2 and 3 (#1232, #1691, #1697, #1713). Residents eventually trimmed to 141 words (#1745), so the limit was learnable but cost several turns inside the retro window. (#1226, #1232, #1691, #1697, #1702, #1708, #1713, #1745)
- **Both residents' brains improved but the same blunders recurred.** A01 added a rule about long-range lines opening when an enemy piece moves (#1739), yet in game 4 it again left a piece hanging and resigned at the 40-move material stop (#2503). A02 similarly flagged checking destination squares (#494, #1745) but still made captures that were refused as illegal (#1483, #2309). (#494, #1739, #1745, #2503)

## Problems

1. **Six ILLEGAL_MOVE refusals show residents tracking a stale board.** A01 tried g5e7, f6d4 and d8d4 (#331, #1013, #1112); A02 tried b8c6 and f2e3 (#1483, #2309). A01 even reasoned about e5 being blocked by its own pawn only after a refusal (#1950), so the cost is wasted turns per game. (#331, #1013, #1112, #1483, #1950, #2309)
2. **The engine and the residents' mental boards disagree on material.** Residents recounted material repeatedly and reached conflicting totals within the same game (#800, #943, #951, #1128, #1958). This suggests the board view or move feedback is hard to reconstruct, which feeds the blunders. (#800, #943, #951, #1128, #1958)
3. **Brain limit refusals waste the only retro window.** Seven BRAIN_TOO_LONG refusals (#1226, #1232, #1691, #1697, #1702, #1708, #1713) happened when writeBrain is briefly open; residents spent multiple turns trimming rather than analyzing. A01 wrote a 157-word brain and A02 a 173-word one, showing the limit is not surfaced while drafting. (#1226, #1232, #1697, #1713)
4. **The match is a one-sided stomp with no competitive tension.** A02 won all four games; A01 resigned three times (#497, #1214, #2503). The compact chess format against one opponent produced no seat fight and no negotiation, so the social-game framing has nothing to bite on. (#497, #1214, #2503)
5. **Tool availability flips mid-game without warning.** A01 noted that after e5 went through, viewBoard and readBrain were the only tools open (#1780), and A02 said only board viewing and reading were open after game 2 (#1251). Residents spend turns probing tool state instead of playing. (#1251, #1780)

## Optimizations

- **Show a word counter and live limit while drafting the brain.** Addresses the seven BRAIN_TOO_LONG refusals (#1226, #1232, #1691, #1697, #1702, #1708, #1713) by displaying current and remaining word count in the writeBrain tool output. (#1226, #1232, #1697, #1713)
- **Return a full legal-move list for the position after every move.** Addresses ILLEGAL_MOVE refusals (#331, #1013, #1112, #1483, #2309) and material miscounts (#800, #943, #1958) by giving residents an authoritative board and legal-move summary instead of forcing reconstruction. (#331, #1483, #1958, #2309)
- **Announce tool availability changes explicitly at game boundaries.** Addresses residents guessing tool state (#1780, #1251, #1733) by sending a clear notice of which tools are open and when writeBrain will reopen. (#1251, #1733, #1780)
- **Add a second competing resident or different skill levels.** Addresses the 4-0 sweep (#497, #1214, #2503) by making the seat contest meaningful; with two residents of similar habit, the match became a blunder-fest with no social dynamics. (#497, #1214, #2503)
- **Give a short post-game review turn with the brain edit.** Addresses the pattern that A01 diagnosed its errors (#307, #447, #1680) but repeated them; a structured review of the game's decisive move before the brain edit could convert analysis into change. (#307, #447, #1680, #1739)

## Loophole candidates

None found.

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 26: event "brain_written" (seq 26) does not match its schema
- line 27: event "retro_closed" (seq 27) does not match its schema
- line 33: event "brain_written" (seq 33) does not match its schema
- line 34: event "retro_closed" (seq 34) does not match its schema
- line 58: event "game_started" (seq 58) does not match its schema
- line 65: event "move_played" (seq 65) does not match its schema
- line 66: event "move_scored" (seq 66) does not match its schema
- line 72: event "move_played" (seq 72) does not match its schema
- line 73: event "move_scored" (seq 73) does not match its schema
- line 80: event "move_played" (seq 80) does not match its schema
- line 81: event "move_scored" (seq 81) does not match its schema
- line 87: event "move_played" (seq 87) does not match its schema
- line 88: event "move_scored" (seq 88) does not match its schema
- line 95: event "move_played" (seq 95) does not match its schema
- line 96: event "move_scored" (seq 96) does not match its schema
- line 103: event "move_played" (seq 103) does not match its schema
- line 104: event "move_scored" (seq 104) does not match its schema
- line 112: event "move_played" (seq 112) does not match its schema
- and 505 more
