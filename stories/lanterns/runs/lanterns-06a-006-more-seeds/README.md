# lanterns-06a-006-more-seeds

2026-11-11/12. Eight more seeds (73, 79, 83, 89, 97, 101, 103, 107) of the comparison in
[lanterns-06a-005-pace-and-handicap](../lanterns-06a-005-pace-and-handicap/), with unchanged code and rules
(pace line, second team one word fewer): `lanterns` (a brain per team) against `lanterns-nobrain`, 4 games,
6 Haiku residents via Anthropic. Run because P230 left the brain question open: the brain lead in recall was
0.16 on seeds 41-53 and 0.02 on seeds 59-71, and the cross-game paper asks for 8-12 paired seeds (P334).
Together with 005 this is 12 paired seeds on the same rules. Folders `brain-s<seed>/run/` and
`nobrain-s<seed>/run/`, each with the reporter's first draft `REPORT.md`.

All 16 matches finished; all 64 games ended with a team finding all its words; no turn error. Every signed
log verifies. **Cost 1.138 USD** (brain 0.678, no brain 0.460), plus about 0.04 USD of reporter drafts.

## Result

Recall and precision as in the earlier runs (per team and game, then averaged); the paired difference is
brain minus no brain on the same seed, with its standard error over the seeds.

| | Brain | No brain | Paired difference (SE) |
|---|---:|---:|---:|
| Recall, these 8 seeds | 0.81 | 0.70 | +0.12 (0.03), ahead on 7 of 8 |
| Precision, these 8 seeds | 0.88 | 0.78 | +0.10 (0.03) |
| Recall, 12 seeds (005 + 006) | 0.82 | 0.73 | **+0.08 (0.03)**, ahead on 10 of 12 |
| Precision, 12 seeds | 0.88 | 0.81 | +0.08 (0.02) |
| Recall by game, 12 seeds | | | game 1 **+0.00 (0.04)**, game 2 +0.11 (0.05), game 3 +0.07 (0.07), game 4 +0.16 (0.04) |
| Recall, games 2-4, 12 seeds | | | **+0.11 (0.03)**, ahead on 9 of 12 |
| Shadow hits per match, 12 seeds | 0.8 | 1.5 | |
| Mean clue number, 12 seeds | 1.54 | 1.83 | |
| Points per team and game, 12 seeds | 6.9 | 6.6 | +0.2 (0.2) |

**The first firm memory effect of a brain in the game stories.** In game 1 the arms are level (+0.00); from
game 2 on, after the first retro, the brain teams guess more of the intended words (+0.11 recall, 3 standard
errors) and hit half as many shadows. The gain is in accuracy, not in points: a game ends when one team has
found all its words, and both arms finish.

## Digest highlights

- **The brains are keeper-seeker codes learned from game 1.** "Clue shape that worked (game 1:
  halloween->mask, ghost; backyard->fence, squirrel): a single everyday category word whose two strongest board
  words are obvious, with N=2" (brain-s73 A05 #561); "N = exact count of OUR words under ONE link only"
  (brain-s103 A05 #647); "Never pad N" (brain-s101 A02 #734). The keepers give smaller numbers (1.54
  against 1.83) and the seekers trust them.
- **Why Lanterns and not the other games:** the lesson is about a teammate (what this keeper means by a
  clue), not about the game's rules, so the model cannot already know it. It is the positive control the
  cross-game paper asked for (optimization 7): a brain works when there is something to learn that the
  rules do not say.
- **P230 resolved:** on 12 seeds the effect is there in recall and precision (both about 3 SE); the seed set
  59-71 alone was the low end.

## Loopholes

No new one. LH15 seen again: the silenced keeper A05 notes "for the record" that fence is a fog word and whistle
the second target, in its private answer (nobrain-s103 #732-#733); the seekers never see it,
no effect, as in 005. The reporter's other candidates are ordinary play (cautious numbers, seekers naming a
word in the team chat, ending a turn with nothing to do) and city-shaped lines (P89).

## Problems

- **P439**: the brain improves recall and precision from game 2 on (+0.11 recall, SE 0.03) but not the points
  (+0.2, SE 0.2): the score does not reward accuracy enough to show it.
- **P89 again**: city-shaped reporter drafts.

## Optimizations (proposals, not built)

1. Score accuracy in the points (for example a bonus for words left over when a team finishes), so the
   learned code shows in the result.
2. Swap the keeper's teammates between games (a new seeker who did not write the brain), to test whether the
   code lives in the text or in the team.
