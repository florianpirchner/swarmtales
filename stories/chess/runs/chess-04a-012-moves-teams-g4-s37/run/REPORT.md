# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `chess-moves-teams-g4-p80` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 46 (referee) |
| Counted | events #3 to #4965 (4146 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 46 minutes (to the end); A02 on level 1 from minute 0 for 46 minutes (to the end); A03 on level 1 from minute 0 for 46 minutes (to the end); A04 on level 1 from minute 0 for 46 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.456 USD for this run (competitors 0.456, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0064 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 47 of 47 minutes without a submission; longest without one: minutes 0-46 (47) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | ILLEGAL_MOVE 2, BRAIN_TOO_LONG 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents stayed on level 1 for the whole run with no submissions.** A01, A02, A03 and A04 all began at level 1 and were still there at minute 46; the computed facts record 0 correct and 0 wrong submissions across 4146 events. The residents spent the run playing chess rather than solving levels, e.g. #216 (A01: "I'll play f1b5") and #204 (A04: "I'm going with Nc6 here"). (#204, #216)
- **A03 blundered its queen on move 25 and then resigned game 1.** A03 reasoned about playing 25...Qxh3 (#947 says "Qxh3 was a blunder I missed"), and its own summary at #1036 records that the g2 pawn recaptured with gxh3, losing the queen for a pawn, after which White won a second rook with 27.Bxd8 and A03 resigned. (#947, #1036)
- **A01's speculative Rg5+ lost a rook for nothing in game 1.** A01 realized at #835 that Black's f6 pawn captures on g5, so "the Rg5 check was answered by fxg5 and I've lost the rook"; A02 confirmed at #807 that "21.Rg5+ was taken by the f6 pawn, so the rook is gone. That was A01's move, not mine." (#807, #835)
- **A03 repeated the hanging-rook mistake with 25...Re3 in game 3.** A03 played 25...Re3 attacking the c3 bishop (#3358), but the f2 pawn simply captured it; A02 saw it at #3368 ("fxe3 wins the undefended rook outright") and A03 owned the error at #3475 ("25...Re3, hung the rook"). (#3358, #3368, #3475)
- **Residents negotiated rule-like team brains, capped at 150 words, and were refused once.** A01 saved brain version 1 (93 words, #90) and A02 saved version 2 (96 words, #1041). A03's rewrite was refused for length (#2527, BRAIN_TOO_LONG: 158 words against a 150 limit) before a version 3 was saved at 134 words (#2554), then version 4 (#3471). (#90, #1041, #2527, #2554, #3471)
- **The engine kept the residents debating identical recapture checks every move.** Long stretches are residents re-deriving the same recapture logic, e.g. #546, #729, #1237-range reasoning about whether e4 is defended, and #2104's refusal showing an illegal Rb2 with a legal-move list. Two ILLEGAL_MOVE refusals (#2104 and one more) plus one BRAIN_TOO_LONG are the only recorded tool errors. (#546, #729, #2104)

## Problems

1. **The task and the story do not match: residents never attempted a level.** The facts show all four stuck on level 1 for 46 minutes and 0 correct, 0 wrong submissions, while 4146 events are consumed by chess play and retro discussion. Residents' own notes (e.g. #3471 "Game 3 is lost... I resigned after 26 moves") confirm they were following a chess match, not solving levels. (#3471)
2. **A 46-minute run produced no submission at all; quiet for all 47 minutes.** The computed facts record 47 of 47 minutes without a submission, longest 0-46, and the stall list shows every resident stalled on level 1 from minute 0. Nothing in the log shows a submission attempt; the only city refusals are a move and a brain write (#2104, #2527). (#2104, #2527)
3. **Tool errors point at the harness: a legal-move list in a refusal and a brain cap.** At #2104 A02's Rb2 was refused as illegal even though "Rb2" appears in the supplied legal move list, an internally inconsistent refusal. At #2527 A03's brain was refused at 158 words against a 150 limit, and residents then spent effort counting words rather than improving strategy. (#2104, #2527)
4. **Residents often misread the board and their own move records.** A04 at #238 puzzled that "The move-order note from A03 doesn't match what I recorded", A02 at #502 found it had noted Nxd4 when A01 played Bxe6, A03 at #4318 saw "22.Qxg5, yet the last board view had Black on move 21". These desyncs drove long re-derivations and repeated errors like #947. (#238, #502, #947, #4318)
5. **The referee ended the run at minute 46 while a game was still in progress.** A01's last reasoning at #4945 is still planning around the 40-move cap and material ("We're at Black's 40th move, and we're a pawn up"), yet the computed facts show the run ended at minute 46 with no game conclusion recorded and final standings unknown. (#4945)

## Optimizations

- **Make the levels the explicit objective and gate chess behind them.** Problem: no submissions for 47 minutes and no resident ever mentioned a level after the start (evidence: facts plus #90, #3471). Fix: put the level board in the resident's prompt and remove or lock the chess tools until a level is attempted, so the first event cannot be a chess plan. (#90, #3471)
- **Fix the illegal-move refusal to match the legal-move list.** Problem: #2104 refused "Rb2" while listing Rb2 as legal. Fix: validate against one canonical legal-move set and echo only moves that are truly excluded from it. (#2104)
- **Make the brain word limit visible and enforced before submission.** Problem: #2527 was refused at 158 words against a 150 limit and residents spent reasoning on word counts (#3431 "keeping the brain write-up to around 120 words within the 150-word cap"). Fix: show a live word counter and reject client-side, or raise the cap. (#2527, #3431)
- **Resynchronise the board state after every move.** Problem: residents repeatedly saw stale or contradictory boards (#238, #502, #4318), causing duplicate lost-rook reasoning and blunders like #835. Fix: push a compact piece list with each turn and require it to match the engine state before a move is accepted. (#238, #502, #835, #4318)
- **Set the referee's end time to a game or level boundary.** Problem: the run stopped at minute 46 mid-game while A01 was still planning around the 40-move cap (#4945). Fix: end the run on a completed game or a level attempt, and report standings again, so the report has a real turning point. (#4945)

## Loophole candidates

1. **Residents framed the run as a chess match and never engaged the level system.** (residents) A01's notes treat games as wins and resignations (#1036, #3421 scoring "team A 2.5, team B 0.5") and never mention a level, which sidesteps the intended level-solving contest without any city refusal. The city never pushed back, so this became the de-facto path. (#1036, #3421)
2. **Speculative sacrifice attempted despite the brain's recapture rule.** (residents) A01 played Rg5+ (#642 range) and admitted afterwards at #835 that fxg5 wins the rook, ignoring the rule the team had just added at #1041 to check enemy recaptures before a sacrifice. The team brain did not constrain later moves, making the rule cosmetic. (#835, #1041)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 46: event "team_post" (seq 46) does not match its schema
- line 53: event "team_post" (seq 53) does not match its schema
- line 60: event "team_post" (seq 60) does not match its schema
- line 67: event "brain_written" (seq 67) does not match its schema
- line 68: event "retro_closed" (seq 68) does not match its schema
- line 75: event "brain_written" (seq 75) does not match its schema
- line 76: event "retro_closed" (seq 76) does not match its schema
- line 107: event "game_started" (seq 107) does not match its schema
- line 114: event "team_post" (seq 114) does not match its schema
- line 128: event "move_played" (seq 128) does not match its schema
- line 129: event "move_scored" (seq 129) does not match its schema
- line 131: event "team_post" (seq 131) does not match its schema
- line 138: event "team_post" (seq 138) does not match its schema
- line 157: event "move_played" (seq 157) does not match its schema
- line 158: event "move_scored" (seq 158) does not match its schema
- line 160: event "team_post" (seq 160) does not match its schema
- line 173: event "team_post" (seq 173) does not match its schema
- line 180: event "team_post" (seq 180) does not match its schema
- and 799 more
