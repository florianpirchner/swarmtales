# quarry-04a-004-visible-burns

Smoke test of three changes after P125 (`swt run --story <arm> --provider anthropic --model haiku --seed 29`), two Haiku matches on the
same deals as [run 001](../quarry-04a-001-smoke/) and [run 002](../quarry-04a-002-free-burns/):

- `quarry-29`: **the new default without burns** (`quarry`; the old `quarry-noburn` is now an alias of it);
- `quarry-burn-29`: the hate-drafting arm `quarry-burn` (free burns, two a game), where every seat is now told at
  the game's end each burn and whether its pack came back to the burner later (P126);
- both: the brain's retro prompt now says "at most 150 words (aim for about 120 words in at most 10 short
  lines; a longer text is refused)" (P120; in `strategy-brain`, so for every game with a brain).

4 seats, 3 games of 2 packs of 6, place bonus 10/5, hidden hands. Run on 2026-11-06. Both signed logs verify.
**Cost 0.065 USD** (0.031 and 0.034), plus 0.004 USD for the two reporter drafts.

| Match | Table score (without place bonus) | Final points | Burns per game (could have come back) | Brain refusals |
|---|---:|---|---|---:|
| `quarry-29` (no burns) | 921 | A01 271, A02 258, A03 245, A04 238 (from 81.3 a seat-game) | - | 2 of 14 attempts |
| `quarry-burn-29` | 808 | burners 73.7 a seat-game, others 63.3 | 3 (1), 4 (3), 7 (4) | 1 of 13 attempts |
| run 001, same deals (burns at 2 points, unused) | 797 | | 0 | 8 of 20 |
| run 002, same deals (free burns, no cost shown) | 714 | | 2, 8, 5 | 10 of 22 |

## Digest highlights

- **P120 is fixed.** With the aim and the line count in the prompt, 3 of 27 brain writes were refused (before:
  75 of 170 in the eight matches of series 003, 8 and 10 in runs 001 and 002). Brains are now 64-150 words, most
  between 120 and 140.
- **The default plays the cleanest drafts so far.** On the same deals the no-burn match scores 921, the best of
  the four matches on seed 29 (797, 714, 808 for the others).
- **Showing the burn's cost did not stop the burns, in one match.** The line reads, for example, "burns A01 L1
  lodestone (its pack came back to A01 later, so this card could have been A01's)". Burns rose from 3 to 7 per
  game. One seat drew the right rule ("never burn my own color", A04, #880); another drew the opposite: "a card I
  leave can return, so burn the second copy of my main colour" (A01, #872), reading the return as a threat, not
  as a loss. In this match the burners even scored more than the others (73.7 against 63.3 a seat-game; series
  003 had them 9 points behind), so one match says nothing about P126 yet.

## Loopholes

None. The reporter's candidates are the intended free burn in the burn arm and "lodestones are always taken"
(a sound pick under the rules, since a lodestone always adds to the biggest set; not a way around a rule).

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | Brains overran the word cap. | built: aim (80 % of the cap) and a line count in the retro prompts of `strategy-brain`; 3 of 27 writes refused here |
| P126 | The brain could not see what a burn cost it. | built: the game's result line names every burn and whether its pack came back to the burner; burns still rose in this one match, and one brain read the return as a reason to burn more. Open: more seeds in `quarry-burn` |
| P89 | (again) the reporter is city-shaped. | open |

## Optimizations (proposals, not built)

1. Word the burn line as a loss ("A01 burned L1, which was still in a pack coming back to A01: A01 lost that card"),
   since one seat read the neutral wording the other way round.
2. Run `quarry-burn` on the four seeds of series 003 to see whether the shown cost lowers early and own-colour burns.
