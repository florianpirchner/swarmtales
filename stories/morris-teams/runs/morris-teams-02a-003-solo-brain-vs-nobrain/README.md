# morris-teams-02a-003-solo-brain-vs-nobrain

Brain versus no brain in nine men's morris, on Flo's go (2026-11-06, budget about 3 USD): one Haiku agent per
side (A01 plays X, A04 plays O), matches of three games (X starts games 1 and 3, O game 2), two matches per
arm: `morris-teams-solo` (a private brain per side, written before game 1 and after games 1 and 2) and
`morris-teams-nobrain-solo` (the same briefings, no brain). With the P104 fix: **0 forfeits** in 12 games.

## Result

| Folder | Arm | Game 1 | Game 2 | Game 3 | Blunders | Cost |
|---|---|---|---|---|---:|---:|
| `brain-s1` | brain | X (pieces, 53 turns) | O (pieces, 71) | draw (repetition, 74) | 3 | 0.51 USD |
| `brain-s2` | brain | O (pieces, 50) | X (pieces, 58) | O (X blocked, 20) | 4 | 0.32 USD |
| `nobrain-s1` | no brain | draw (quiet, 57) | O (pieces, 39) | O (pieces, 54) | 5 | 0.33 USD |
| `nobrain-s2` | no brain | X (pieces, 49) | X (O blocked, 36) | O (pieces, 64) | 3 | 0.29 USD |

| Arm | Games | X / O / draw | Turns | Blunders per 100 turns | Missed wins |
|---|---:|---|---:|---:|---:|
| brain | 6 | 2 / 3 / 1 | 326 | 2.1 | 2 |
| no brain | 6 | 2 / 3 / 1 | 299 | 2.7 | 2 |

Blunders are turns the morris-referee (depth-3 alpha-beta) scores as losing a piece or more against the best
turn. **No brain effect is visible** (P106): the tallies are identical, and the blunder rate differs by less
than one blunder per game, on 12 games. Total cost 1.44 USD, plus 0.02 USD for the reporter drafts.

## Digest highlights

- **Running mills decide most games, in both arms.** A01 re-closed 3-15-24 by stepping out and back while
  A04 "could not reach 15" (brain-s1, #818, #1049); in brain-s2 game 2 A01 shuttled 1-2-3 via 3↔15 and 2↔5
  (#2680 to #3517), and A04's own post-mortem blames it (#3983). The no-brain matches show the same pattern
  (nobrain-s1 #2286: "13→9 re-forms 7-8-9"). Haiku knows the tactic without a brain.
- **The brain writes the lesson down, but it is the same lesson every time.** After losing game 2 to a
  running mill, A04 wrote "Keep pieces next to squares X uses to re-close its mill: 3 (from 2, 15), 2 (from
  1, 3, 5)" (brain-s2 v3, #3998). The brains name forks, running mills and flying double threats; none says
  anything a strong opening book would not.
- **A planned blockade.** In brain-s2 game 3, A04 placed 9 so that "X's only mobile piece is 13 ... forced to
  18", then closed 13-14-15 and removed 18, leaving X with eight pieces and no legal move after 20 turns
  (#4579, #4642). The plan was found in the game, not taken from the brain (the reporter's draft says
  otherwise; v3 does not mention it).
- **Draws are rare and come from the rules.** 2 of 12 games were draws (one threefold repetition after 74
  turns, one after 40 quiet turns); no side used the repetition rule to save a lost position.

## Loopholes

None. The reporter's candidates are the running mill (the classic tactic, inside the rules), a planned draw
by repetition that never happened, and a captain who tried to play a removal without a proposal (refused,
NO_CONSENSUS, nobrain-s2 #328).

## Problems

| # | Problem | Solution |
|---|---|---|
| P105 | **Brains overrun the word cap again and again.** 12 `BRAIN_TOO_LONG` refusals in brain-s1 alone (303 to 447 words against 300), each a retry with a shortened text; the retro takes minutes. The same as P96 and P120 in the card games. | open: show the word count of the current brain in the retro line and in the refusal ("cut 47 words"), or a cap in tokens the model can see |
| P106 | **No brain effect visible.** Identical tallies (X 2, O 3, draw 1) and nearly equal blunder rates in both arms; the brains hold general principles Haiku already plays. | open, proposals: more matches per arm (the sample is 6 games), a fixed scripted opponent (the referee's search at depth 1-2) so that a brain can learn one opponent's habits, or the team arm where the brain is shared knowledge |

## Notes

- The reporter drafts (`*/REPORT.md`) are kept as written; besides the city metrics (P89, P103) they invent a
  fourth game and a brain-saved trap; this README is the reviewed report.
- Files per match: `events.jsonl` (+ chain and public key), `usage.json`, `agents/` (transcripts).
