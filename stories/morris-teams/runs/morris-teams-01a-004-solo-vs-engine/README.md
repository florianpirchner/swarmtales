# morris-teams-01a-004-solo-vs-engine

Brain versus no brain against a **fixed scripted opponent**, decided by the coordinator for Flo (2026-11-06,
budget about 3 USD). One Haiku agent (A01) plays X; side O is the engine (`-vs-engine2`): the morris search
at depth 2 (whole turns, ties broken by the seeded random), playing its step and removal the moment it is
on move. Four matches of three games per arm (seeds 21-24 in both arms; X starts games 1 and 3, the engine
game 2): `morris-teams-solo-vs-engine2` (a private brain, written before game 1 and after games 1 and 2) and
`morris-teams-nobrain-solo-vs-engine2` (the same briefing, no brain). The plan was 6 games per arm; the runs
cost so little that each arm got 12. **0 forfeits, 0 illegal moves played** in 24 games.

## Result

| Folder | Arm | Game 1 (X starts) | Game 2 (engine starts) | Game 3 (X starts) | X blunders | Cost |
|---|---|---|---|---|---:|---:|
| `brain-s21` | brain | draw (quiet, 100 turns, 4 v 3) | X (engine blocked, 26) | X (pieces, 51) | 1 | 0.14 USD |
| `brain-s22` | brain | X (pieces, 61) | X (engine blocked, 30) | X (engine blocked, 27) | 1 | 0.06 USD |
| `brain-s23` | brain | O (X blocked, 26) | X (pieces, 56) | X (pieces, 45) | 4 | 0.08 USD |
| `brain-s24` | brain | O (pieces, 74) | draw (repetition, 57, 9 v 3) | draw (repetition, 64, 6 v 3) | 2 | 0.14 USD |
| `nobrain-s21` | no brain | draw (repetition, 88, 4 v 3) | X (pieces, 44) | draw (repetition, 42) | 2 | 0.10 USD |
| `nobrain-s22` | no brain | draw (repetition, 88, 4 v 3) | X (pieces, 46) | O (X blocked, 26) | 2 | 0.12 USD |
| `nobrain-s23` | no brain | O (pieces, 42) | X (engine blocked, 38) | X (pieces, 51) | 1 | 0.07 USD |
| `nobrain-s24` | no brain | X (pieces, 43) | X (pieces, 48) | X (pieces, 53) | 4 | 0.08 USD |

| Arm | Games | Haiku wins / losses / draws | Turns | X blunders per 100 turns | Missed wins |
|---|---:|---|---:|---:|---:|
| brain | 12 | 7 / 2 / 3 | 617 | 1.3 | 8 |
| no brain | 12 | 7 / 2 / 3 | 609 | 1.5 | 8 |

Blunders and missed wins are the morris-referee's classes (depth-3 alpha-beta) for A01's turns. **No brain
effect** (P109): against one fixed yardstick the two arms end with the very same tally for the second time
(after P106), and the blunder rate differs by 0.2 per 100 turns. Cost 0.80 USD for 24 games, plus 0.02 USD
for the reporter drafts.

## Digest highlights

- **Haiku beats the depth-2 engine.** 14 wins, 4 losses and 6 draws over both arms. The first game of a match
  is the hard one: Haiku wins 2 of the 8 first games and 12 of the 16 later ones, in both arms alike. X starts
  game 1, so the start side and a cold start are mixed here.
- **The engine walls itself in.** 4 of the 14 wins came from an engine with five pieces and no legal move,
  26 to 38 turns in (brain-s21 game 2, brain-s22 games 2 and 3, nobrain-s23 game 2). Its evaluation counts
  mobility only once both sides have placed every piece, so at depth 2 it places into a closed cluster (P107).
  A01 saw it and wrote it down: "Recipe that won game 2 ... Prefer removals leaving O with NO legal move"
  (brain-s21 v3). Three of the four blockade wins are in the brain arm, a hint at most on this sample.
- **Haiku cannot finish three flying pieces.** 5 of the 6 draws are repetition or quiet draws with the engine
  down to three pieces (4, 6 or 9 X pieces left; the sixth, nobrain-s21 game 3, is 8 v 8), e.g. 9 v 3 in brain-s24 game 2 ("we were ahead 9
  vs 3, but O flew and blocked single threats", brain v3). With three pieces the engine flies to block each
  single threat, and A01 rarely builds the double threat that wins (P108).
- **The running mill again.** A01's winning pattern in game 2 of brain-s23 was stepping 23 to 24 or 22 and back
  to re-close 17-20-23, a capture each cycle; the brain records it ("Reopen a closed mill by stepping to an
  empty neighbour O cannot reach, then step back").

## Problems

- **P107 (engine):** the engine's evaluation has no mobility term during the placement, so it blocks itself
  (see above). It is a fixed yardstick all the same: both arms meet the same weakness.
- **P108 (Haiku):** a won endgame against three flying pieces becomes a draw.
- **P109 (research question):** no brain effect against a fixed opponent either.
- **P105 seen again:** 12 `BRAIN_TOO_LONG` refusals in the brain arm (2, 4, 2, 4 per match), up to 388 words
  against 300.
- **P103 seen again (reporter):** the drafts count levels and submissions, call the solo story a "social game"
  that A01 ignored, and in `nobrain-s24` claim A01 "hallucinated a complete game" because the drafts do not
  connect A01's reasoning to the `move_played` events; `brain-s23` says game 3 was cut off by the referee while
  `game_ended` records an X win after 45 turns. The `REPORT.md` files are left as drafts; this README is the
  reviewed report.
- A01's `NO_CONSENSUS` refusal at the start of game 3 (brain-s23, #1138) is the protocol working: it called
  `playMove` before `proposeMove`; one call later it played.

## Optimizations (proposals, not built)

- Give the engine's evaluation a mobility term during the placement (blocked points of its own pieces), or a
  deeper search, and run the same arms against depth 3 to see whether the tally separates against a stronger
  yardstick.
- A brain effect needs a task where the general rules Haiku already knows are not enough: a fixed opponent
  with a habit that can only be learned (for example an engine that always opens on the same points), so the
  brain can store something specific.
- Show the word count in the retro line (P105).

## Loopholes

None found: no illegal move, no forfeit, no use of a tool outside the protocol.
