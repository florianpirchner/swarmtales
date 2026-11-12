# harbor-lights-04a-007-decision-aid

2026-11-11. One-game matches on the same twelve deals as
[harbor-lights-04a-006-game1-plan](../harbor-lights-04a-006-game1-plan/) (seeds 101-112), Haiku via
Anthropic, the default rules. One question from
[docs/CROSS-GAME-FINDINGS.md](../../../../docs/CROSS-GAME-FINDINGS.md) (optimization 1, P174): does a number
shown at the moment of the decision help here too, as it did in chess and Ember Tricks?

The new option `playableOdds` of `hint-towers` (P430) adds to each own slot of the status the share of its
possible cards that are playable now: `Chance a play lights it now: 1 of 4 (25 %).` (not shown for a slot
that is surely playable). Two arms, `-aid` added to the names of run 006:

- `harbor-lights-nobrain-aid-g1`: no notes, the chance on every slot;
- `harbor-lights-solo-aid-g1`: private notes written before the game, and the chance on every slot.

The controls are the arms of run 006 on the same deals (`-nobrain-g1`, `-solo-g1`), run the same day with the
same code apart from the new option. Cost **1.19 USD** for 24 games (0.566 and 0.625 USD per arm), plus about
0.06 USD for the reporter drafts (DeepSeek via OpenRouter). Every signed log verifies. No forfeit, no invalid
match. 53 turns hit an API error (429, too many concurrent requests across the 70 runs started at once, P431);
in this story a lost turn only wakes the seat again a pass later, no action was taken for it.

## Result

| Arm | Score per game | Paired difference (SE) | Deals ahead / level / behind | Misfires (12 games) | Lit per game |
|---|---:|---|---|---:|---:|
| nothing (006) | 18.4 | | | 26 | 21.9 |
| nothing + chance | 18.3 | -0.1 (1.6) to nothing | 7 / 0 / 5 | 29 | 22.6 |
| private notes (006) | **21.6** | +3.2 (0.8) to nothing | 9 / 3 / 0 | **14** | 22.3 |
| private notes + chance | 19.9 | **-1.7 (1.2) to notes** | 4 / 1 / 7 | 22 | 22.4 |
| bot crew | 22.9 | | | | |

Per deal (nothing, nothing + chance, notes, notes + chance): 101 13/15/20/23, 102 13/23/19/19, 103 22/17/22/25,
104 20/25/21/25, 105 15/16/21/14, 106 22/10/22/19, 107 16/12/22/15, 108 22/20/22/19, 109 19/22/22/15,
110 23/24/26/23, 111 20/23/24/23, 112 16/13/18/19.

**The chance at the decision does not help, and on top of the notes it costs about 1.7 points.** It lights
a little more (22.4-22.6 against 21.9-22.3), but misfires rise (29 against 26 without notes, 22 against 14
with notes), and from the second misfire each one costs 3 points.

## Digest highlights

- **The number turns "never gamble" into "pick the best gamble".** With the chance on the screen, seats
  compare slots instead of asking whether to play at all: "Slot 1 or 2 ... about a 27% chance, which beats
  the 20% odds on the Violet slots" (nobrain-aid-101 #85, misfire), "Playing slot 4 looks clearly better at
  25% than slot 3 at 10%" (nobrain-aid-103 #245, misfire), "each of those slots a 25% gamble with a 3-point
  cost for a misplay" (nobrain-aid-103 #430, played anyway, misfire). Of 591 plays in the two aid arms, 129
  were made on a slot shown below 75 %, and all 51 misfires are among them (the shown chance is read from
  the seat's last status before the play).
- **The notes still say the right thing.** 28 of 48 private notes say "only play a slot you know is
  next-playable" (solo-aid-105 A02 and A04 #4-#7), as in run 006. They were written before the first status,
  so they never mention the chance; the line at the decision then wins over them.
- **Where the number helps is the coin flip it was meant for.** 84 plays on a slot shown at 50-74 % lit 67
  times. The loss comes from the 23 plays at 25-49 % (18 misfires) and the 22 below 25 % (16 misfires), which
  the line made look like a choice between odds.
- **This is the first game where the decision-time aid fails.** In chess the aid is a list that removes bad
  options, in Ember Tricks the number is the answer itself (the bid). Here it is a number about each of
  several bad options, and the seat reads it as a ranking of plays rather than as a reason to signal or
  discard (P432).

## Loopholes

None. The reporter's candidates are ordinary play: discarding a card to win a signal back, signalling a
teammate instead of gambling, and the old "dead card" reading of a card whose tower lost a lower rank
(P170, still seen: "Cobalt 4 and 5 were already lost so the card could never light", the rules say the
gap is bridged).

## Problems

- **P432**: the chance at the decision raises misfires; the seats rank gambles by it.
- **P431**: 429 errors (too many concurrent requests) when about 70 runs start at once; a lost turn is a
  delay here, a missed decision in other stories.
- **P170 again**: "dead card" discards.

## Optimizations (proposals, not built)

1. Word the line as the expected points of a play against a signal or a discard (a play at 25 % costs about
   2.5 points on average after the free misfire), so the number answers "play or not?" and not "which slot?".
2. Show the chance only when it is at least 50 %, or only on the slot a signal just touched.
3. Keep the aid off by default (as built); the private note before game 1 stays the best lever in this game.
