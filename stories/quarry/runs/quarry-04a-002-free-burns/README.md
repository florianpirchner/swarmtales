# quarry-04a-002-free-burns

Comparison run after the P123 fix (`swt run --story quarry --provider anthropic --model haiku`): 4 Haiku seats,
**the same seed 29 as [run 001](../quarry-04a-001-smoke/)**, so the same three deals. Changed rules only: a
burn is free (it cost 2 points) and every game pays a place bonus of 10 for the best quarry and 5 for the
second. Everything else as in run 001 (3 games of 2 packs of 6, brain on, 150 words, hidden hands). Run on
2026-11-06.

**Result.** The match finished in 12 virtual minutes: 144 picks, none missed, no `pick` refused; 12 brain
versions (10 first attempts refused as too long, P120). The signed log verifies. Final points A04 227,
A01 206, A03 175, A02 151. **Cost 0.034 USD**, 175 requests; the reporter draft 0.0022 USD more.

| Game | Points (A01, A02, A03, A04) | Run 001, same deal | Burns | Efficiency (table over greedy) |
|---|---|---|---:|---:|
| 1 | 58, 58, 66, 89 | 56, 59, 67, 75 | 2 | 1.24 |
| 2 | 81, 51, 51, 64 | 71, 91, 46, 71 | 8 | 0.80 |
| 3 | 67, 42, 58, 74 | 85, 67, 50, 59 | 5 | 0.65 |

The greedy table now includes the place bonus too. Without the place bonus (45 points over the match) the
table scored 714 against 797 in run 001 on the same deals: the burns took about 80 points of value out of
the game.

## Digest highlights

- **The burn is alive.** 15 burns in 144 picks (run 001: none). The first two come in game 1, in pack 2 pick 5,
  once the seats read "burns cost nothing here" (A02, #400; A03, #420). After game 1 every brain has a burn
  rule (#463, #470, #477, #518), and in game 2 all four seats use both burns.
- **The seats guard their own lane.** 13 of the 15 burns destroy a second card of the colour the seat keeps:
  "burn the other jade so A02 cannot take it" (A01, #643), "burning the last amber so no rival gets it and
  dilutes my majority" (A04, #650), "the pack passed on carries less of the colour I'm building" (A03, #1081).
  Only two burns hit a lodestone (#701, #1088). This is hate drafting in a new shape: not taking the
  neighbour's card, but making sure nobody follows into one's own lane.
- **Some burns cost the burner itself.** 3 of the 15 were made while the pack could still come back to the
  burner (for example A02 in game 2, pick 1, #537), so the burned card might have wheeled to it. The bots
  showed that this is where a burn hurts its own maker.
- **The deals repeat, the winners do not.** Game 1, A04 again wins alone in basalt (89 with the place bonus).
  Game 2 goes to A01 with 8 jade (81); in run 001 A02 took that game with 8 cobalt. In game 3 A04 wins with
  amber; A02, last, writes in game 3 "A01 has taken jade before, so I burn J10 to deny it" (#1161), the only
  burn aimed at a named rival.
- **The brains learn the same scoring lesson as in run 001** ("squares win: one colour with 7+ cards beats
  spread", A02 #850), and now also "watch neighbours' colours" (A01, #875) and "a colour still plentiful at
  picks 4-6 is open" (A04, #843).

## Loopholes

The reporter's candidate ("free burns treated as a no-cost default") is the intended rule after P123, not a
way around it. No seat picked out of turn or outside its pack; picks and deals stayed sealed. None new.

## Problems

| # | Problem | Solution |
|---|---|---|
| P123 | (fixed by this change) The burn was never used at a cost of 2 points. | built: free burns and a place bonus of 10/5 per game, chosen by a bot test; 15 burns in this run |
| P125 | **Burns guard the own lane and shrink the table.** 13 of 15 burns destroy a second card of the burner's own colour; 3 of 15 were made while the pack could still come back; the table scored about 80 points less than on the same deals in run 001. One match cannot say whether guarding pays the guard. | open: measure on more seeds with `quarry` against a variant without burns (`maxBurns: 0`) and against run 001's rules; a bot that guards its lane (burn the second card of its own colour late) as a reference |
| P120 | (again) 10 of 12 brain writes first refused as too long (151-180 words). | open, as before |
| P121, P122 | (again) per-pick regret near 0 (6 of 144 picks above 0); the greedy-table efficiency falls 1.24, 0.80, 0.65 as in run 001, again mostly the deals. | open, as before |
| P89 | (again) the reporter is city-shaped (levels, submissions, schema "log issues" for the core events). | open, as before |

## Notes

- Bot test behind the change (2000-3000 deals each, scratch scripts, kept as a smaller check in
  `test/stories/quarry.test.ts`): a burn of the receiver's best card costs the burner 2-6 points when the pack
  can still come back to it; a late burn costs it nothing but gains nothing either when only points count
  (it hurts all three rivals alike); with a place bonus of 10/5 a late free burn pays the burner about 1-2
  points a game, at a cost of 1 it loses again.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/`, `run/REPORT.md` (draft).
