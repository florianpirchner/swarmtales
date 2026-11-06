# morris-teams-02a-002-solo-forfeit-bug

The first brain-versus-no-brain comparison of `morris-teams` on 2026-11-06, on Flo's go: one Haiku agent per
side (`morris-teams-solo` and `morris-teams-nobrain-solo`, A01 plays X, A04 plays O), three games each, seed 13.
**Not comparable** because of a bug found in it (P104); the clean comparison is
[morris-teams-02a-003](../morris-teams-02a-003-solo-brain-vs-nobrain/).

| Folder | Arm | Games (result, reason, turns) | Forfeits | Cost |
|---|---|---|---:|---:|
| `brain-s1` | brain | X (pieces, 45), draw (repetition, 53), O (pieces, 30) | 27 | 0.25 USD |
| `nobrain-s1` | no brain | draw (quiet, 84), draw (repetition, 33), O (pieces, 56) | 7 | 0.46 USD |
| `brain-s2-stopped`, `brain-s3-stopped`, `nobrain-s2-stopped`, `nobrain-s3-stopped` | both | stopped by hand after a few minutes, once the bug was found (14 forfeits in the two no-brain ones) | 14 | 0.04 USD |

## What went wrong (P104)

In game 1 of `brain-s1`, A04 (O) read the board at the start of a pass, before X had moved, and in the next
pass, now on move, answered from that stale view: "It's still X's turn ... so I have nothing to play yet"
(#704). It then got no new input: the runner calls the model only when there is a new input or a tool result
(P76), and a solo player has no teammate whose posts or votes would wake it. So the move timer played a random
move for O every three minutes, 13 times in game 1 and 14 times for X in game 3. Meanwhile the opponent
polled viewBoard up to twelve times a minute ("I'm still waiting on O's move", #768).

Fix (built, merged with this run): the morris mechanic tells the captain on move once per turn and minute
"Side O is on move (turn 20); you are its captain" (`turnInputs`), so a silent captain is asked again. A
test checks it with idle agents. The clean rerun had 0 forfeits.

## Loopholes

None.

## Notes

- The reporter drafts (`*/REPORT.md`) are kept as written; their city metrics are P89 and P103.
