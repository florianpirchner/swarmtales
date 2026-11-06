# quarry-04a-003-p125-burn-vs-noburn

Eight Haiku matches to answer P125 ("do free burns pay the burner?"): the arm `quarry` (free burns, at most
two a game, place bonus 10/5) against the control arm `quarry-noburn` (the same rules and place bonus, no
burns), each on the seeds 31, 37, 41 and 43, so both arms play the same deals. 4 seats, 3 games of 2 packs of
6, strategy brain on (150 words), hidden hands. Run in parallel on 2026-11-06 (`swt run --story <arm>
--provider anthropic --model haiku --seed <n>`). One folder per match (`<arm>-<seed>/run/`, with the
reporter's draft `REPORT.md`); every signed log verifies.

**Cost 0.278 USD** for the 8 matches (0.033-0.037 each, 174-189 requests), plus about 0.017 USD for the 8
reporter drafts (OpenRouter).

## Result

| Seed | Table score with burns | without burns | Difference | Burns (own colour, early) |
|---:|---:|---:|---:|---|
| 31 | 874 | 981 | -107 | 14 (13, 5) |
| 37 | 651 | 789 | -138 | 21 (19, 9) |
| 41 | 758 | 878 | -120 | 13 (9, 3) |
| 43 | 776 | 869 | -93 | 18 (16, 4) |
| **all** | **3059** | **3517** | **-458 (-13 %)** | **66 (57, 21)** |

The table score is the sum of all quarries over the match without the place bonus (sets, majorities, burn
costs, which are 0). "Early" is a burn made while the pack could still come back to the burner.

Inside the burn arm (48 seat-games):

| Burns in the game | Seat-games | Mean score (with place bonus) | Mean place |
|---:|---:|---:|---:|
| 0 | 10 | 75.1 | 2.1 |
| 1 | 10 | 66.8 | 2.7 |
| 2 | 28 | 65.2 | 2.5 |

9 of the 12 game winners burned, against 38 of 48 seat-games overall (75 % against 79 %): burning does not
win games either. **Answer to P125: no.** With Haiku, free burns guard the own lane, cost the table about 13 %
of its points on the same deals, and the seats that burn score about 9 points a game less than the seats
that do not. The bot test (P123) said a late burn of the receiver's best card pays 1-2 points with the place
bonus; Haiku burns early (21 of 66) and mostly its own colour (57 of 66), which is not that move.

## Digest highlights

- **The brains recommend burning, and keep doing it.** Burns per game do not fall over the match (game 1: 18,
  game 2: 25, game 3: 23, summed over the four burn matches). After game 2, 14 of the 16 brains have a burn
  rule, most of them "burn a same-colour duplicate to starve the next seat (both burns worked well)" (A04,
  seed 37, #831) or "Burns are free; use them early in a pack" (A03, seed 43, #917). The cost is invisible to
  the seat: a burned card that would have come back never shows up in its result line.
- **A few brains find the bot's move.** "Burns: rarely, only to deny a rival's main color late in pack 2"
  (A02, seed 31, #883); "only on a rival deep stack (4+) about to be completed" (A02, seed 41, #940). These
  are a minority.
- **The control arm plays clean drafts.** No burn means no refusal and 144 picks in every match; the burn arm
  has 123-131 picks, because every burn removes a card from the picks.
- **Scores per game fall in both arms** (no-burn table, game 1 to 3: 1282, 1151, 1084). The deals differ by
  game, so this is not yet a learning curve (P122).

## Loopholes

None. The reporter's candidates are the intended free burn (seeds 41 and 43), the city-shaped reading of a
core story (seeds 37 and noburn-43, P89), and "always take the lodestone" (a weak heuristic, not a way around
a rule). No pick out of turn or outside a pack; deals and picks stayed sealed.

## Problems

| # | Problem | Solution |
|---|---|---|
| P125 | Answered: free burns do not pay the burner with Haiku (-13 % table score, burners about 9 points a game below non-burners). | kept the rule as it is for now; see the optimizations |
| P126 | **The brain does not learn a cost it cannot see.** The burned cards that would have wheeled back never appear in a seat's results, so the brains praise their burns ("both burns worked well") and burns do not fall over a match. | open: see the optimizations |
| P120 | (worse) 75 refusals for 95 brain versions (`BRAIN_TOO_LONG`); one retro window closed on timeout without a new brain. | open: proposal below |
| P127 | **Three pick calls without a card.** In the no-burn arm two seats called `pick` with no arguments and one named a card no longer in its pack; each retried at once. | none needed; noted |
| P89 | (again) the reporter drafts are city-shaped. | open |

## Optimizations (proposals, not built)

1. **Show what a burn cost.** At the game's end, tell each seat which of its burned cards would have come back
   to it, or simply list everyone's burns with the cards; then the brain can learn P126.
2. **Make the default `quarry-noburn`'s rules.** With Haiku the burn only destroys value; keep `quarry` with
   burns as the "hate drafting" arm rather than the default, unless the change in 1 makes the burns smarter.
3. **P120:** state the cap as lines ("at most 150 words, about 8 short lines") in the retro prompt, or return
   the overrun in words with the refusal (it does) and the old text, so a second try does not grow.
4. **More seeds for a learning curve:** the same deal in game 1 and game 3 (repeat the seed's deck), so a
   falling or rising score is the brain's, not the deal's (P122).
