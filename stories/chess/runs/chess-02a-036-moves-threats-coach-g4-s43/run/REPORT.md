# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `chess-moves-threats-coach-g4-p80` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 44 (referee) |
| Counted | events #3 to #2674 (2172 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 44 minutes (to the end); A02 on level 1 from minute 0 for 44 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.211 USD for this run (competitors 0.211, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0083 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 45 of 45 minutes without a submission; longest without one: minutes 0-44 (45) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 5, ILLEGAL_MOVE 2, BRAIN_REPLAY 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 lost game 1 by resigning after hanging its queen on e6** A01 realized at minute 9 that Black's queen on b6 could slide along the sixth rank to take the e6 queen and resigned, down about eleven points (#582). It recorded two earlier blunders: a knight placed on e4 where a pawn took it and a bishop left on d4 taken by a pawn (#610). (#582, #610)
- **A02 won game 2 by checkmate with Qxe1# after A01 blundered** A02 was forced to block with Re1 on the back rank (#1162), and A01 saw Qxe1 was mate (#1175), winning game 2 as Black to level the match (#1216). The costliest reviewed error was a missed bishop attack, Bxe6 (#1216). (#1162, #1175, #1216)
- **A02 lost game 3 by taking a pawn with the queen that a pawn recaptured** A02 played Qxc4 not seeing that d3 recaptured (#1627), losing its queen for a pawn, and A01 converted to checkmate with Qxe8# (#1716, #1769). A02 named 18...Qxc4 as the decisive error (#1774). (#1627, #1716, #1769, #1774)
- **A01 blundered a rook to a pawn in the final game but the run ended at the 40-move cutoff** A01 missed that the c2 pawn captured the rook on d3 (#2349), putting A02 ahead on material, and the game was heading to a material decision at the 40-move limit (#2649, #2666) when the referee ended the run at minute 44 (#2674). So the last game was never scored. (#2349, #2649, #2666, #2674)
- **Both residents hit the 150-word brain limit repeatedly** A02's writeBrain was refused four times for being 156, 174 and 153 words (#1193, #1732, #1743, #1212) and A01's twice for 159 and 157 words (#1199, #1738). Each tried to compress notes into rules during the short retro windows. (#1193, #1199, #1732, #1738, #1743)

## Problems

1. **Both residents played the wrong colour or lost track of whose turn it was** A01 twice tried to move as Black when the tool said Black to move but the legal list did not include the intended move (#2185, #2411), and A02 concluded it was Black to move and waited instead of reacting (#2189). Several reasoning lines from one side describe the other side's pieces, e.g. A02 reasoning about White's pieces while playing Black (#2058). (#2058, #2185, #2189, #2411)
2. **The final game was cut off before it could be scored** The referee ended the run at minute 44 (#2674) while game 4 was mid-play, with A01 explicitly noting the 40-move material cutoff was about to decide it (#2649, #2666). The match result of game 4 was never recorded. (#2649, #2666, #2674)
3. **Brain budget is too tight for the lessons residents try to write** Six writeBrain refusals came from the 150-word cap (#1193, #1199, #1732, #1738, #1743), and one from replaying game moves instead of writing rules (#1212). Residents spend retro time trimming text rather than improving play. (#1193, #1199, #1212, #1732, #1738, #1743)
4. **Illegal-move tool errors came from reasoning about the wrong side's legal moves** A01's Bc5 and Kc6 were both rejected with ILLEGAL_MOVE and a legal-move list that shows the position was Black to move (#2185, #2411). The retry cost minutes and confused the resident about which pawns block which diagonals (#2194, #2425). (#2185, #2194, #2411, #2425)
5. **Residents' material counting is unreliable and drives their blunders** Residents repeatedly recount material and get conflicting totals (#267, #2058, #2289, #2363), and A01's resign decision was based on such a count (#582). They also miss pawn captures repeatedly: the e4 knight (#347), bishop on d4 (#490), queen on c4 (#1627) and rook on d3 (#2349). (#267, #347, #490, #582, #1627, #2058, #2289, #2349)

## Optimizations

- **Give each side an unambiguous turn and colour marker in the tool list** Problems: wrong-side moves and illegal-move errors. Make playMove report whose turn it is and feed the resident its own colour explicitly, so Bc5/Kc6-style rejections are avoided (#2185, #2411). (#2185, #2189, #2411)
- **Raise or template the brain word limit** Problem: six BRAIN_TOO_LONG refusals. Either raise the cap above 200 words or give a structured template (rule slots) so residents do not spend retro minutes trimming prose (#1193, #1738, #1743). (#1193, #1199, #1738, #1743)
- **Guarantee game 4 time to finish** Problem: the run ended mid-game before a material decision. Reserve enough minutes for the final game after the move-40 cutoff, or let the referee score unfinished games on material instead of ending the run (#2674, #2649). (#2649, #2666, #2674)
- **Add a pawn-capture sanity prompt before each move** Problem: missed pawn recaptures cause most decisive blunders (knight on e4 #347, bishop on d4 #490, queen on c4 #1627, rook on d3 #2349). Require the resident to list enemy pawn attacks on its target squares in its reasoning before moving. (#347, #490, #1627, #2349)
- **Show a controller-computed material score in viewBoard** Problem: residents miscount material (#267, #2058, #2289, #2363). Put the exact material difference in the viewBoard output so resign and cutoff decisions are based on recorded facts, not estimates (#582). (#267, #582, #2058, #2289, #2363)

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
- line 96: event "move_played" (seq 96) does not match its schema
- line 97: event "move_scored" (seq 97) does not match its schema
- line 103: event "move_played" (seq 103) does not match its schema
- line 104: event "move_scored" (seq 104) does not match its schema
- line 119: event "move_played" (seq 119) does not match its schema
- and 482 more
