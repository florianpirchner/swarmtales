# lanterns-06a-005-pace-and-handicap

The last Lanterns series: eight live runs after two changes. The keeper's task now says how many own words
are left against how many clues ("Your team has 4 hidden words left and 2 clues (this one included): to find
them all, a clue must average 2 words or more", P197). The team without the first clue of a game gets one
word fewer, 6 against 5, with 7 fog words (mechanic option `secondFewer`, P196). Brain arm (`lanterns`)
against the control arm without brains (`lanterns-nobrain`), on four new seeds (59, 61, 67, 71), 4 games each,
6 Haiku residents via Anthropic, 2026-11-06. Folders: `brain-s59/` ... `nobrain-s71/`, each with the
reporter's draft `REPORT.md` (city-shaped, P89; this README is the reviewed report).

**Result.** All eight matches ran to the end, and all 32 games ended because a team found all its words.
No game ran out of clues; in 004, 4 of 32 did. 215 clues. **Cost 0.51 USD** (brain 0.089, 0.080, 0.070,
0.075; no-brain 0.052, 0.049, 0.046, 0.047), 1,888 requests; the reporter drafts about 0.02 USD more
(OpenRouter).

| Run | Clues | Mean number | Numbers (1 / 2 / 3) | Landed | Wrong-word ends | Game points (amber:teal) | Match |
|---|---:|---:|---|---:|---:|---|---|
| brain-s59 | 34 | 1.53 | 18 / 14 / 2 | 7 | 6 | 3:5, 9:7, 10:3, 3:11 | teal 26, amber 25 |
| brain-s61 | 29 | 1.48 | 17 / 10 / 2 | 6 | 6 | 12:4, 8:1, 5:8, 9:6 | amber 34, teal 19 |
| brain-s67 | 26 | 1.42 | 15 / 11 / 0 | 8 | 3 | 11:2, 10:5, 4:9, 4:11 | amber 29, teal 27 |
| brain-s71 | 25 | 1.76 | 7 / 17 / 1 | 13 | 6 | 6:11, 10:6, 4:9, 5:11 | teal 37, amber 25 |
| nobrain-s59 | 26 | 1.73 | 9 / 15 / 2 | 11 | 3 | 1:9, 9:7, 12:4, 5:10 | teal 30, amber 27 |
| nobrain-s61 | 26 | 1.85 | 8 / 14 / 4 | 8 | 8 | 4:9, 10:2, 5:6, 9:4 | amber 28, teal 21 |
| nobrain-s67 | 25 | 1.64 | 11 / 12 / 2 | 9 | 4 | 5:10, 9:4, 11:5, 9:6 | amber 34, teal 25 |
| nobrain-s71 | 24 | 1.75 | 10 / 10 / 4 | 6 | 8 | -1:11, 8:6, 10:4, 3:12 | teal 33, amber 20 |

By arm: the brain arm has recall 0.80 and precision 0.87, the control 0.78 and 0.85. The mean number is 1.54
with brains and 1.74 without. Points per team and game are 6.9 with brains and 6.8 without.

## Digest highlights

- **The handicap overshoots.** With one word fewer the second team wins 21 of 32 games. The team with the
  first clue wins only 6 of 16 games with brains and 5 of 16 without. In 004, with 6 against 6, the starter
  won 20 of 32. So the first move is worth less than one word (P196).
- **Keepers count the clues.** The pace line shows up in keeper reasoning: "with four words and four clues
  left, going for two at once seems worth it" (A03, brain-s59, #1523), and "saving ribbon for the last clue"
  (a sealed reason, #1757). No game stalled on the clue cap. Mean numbers did not rise (1.54 and 1.74 against
  1.48 and 1.77 in 004), but the fewer words also make finishing easier, so the two changes cannot be told
  apart here (P197).
- **The brain gain from 004 does not hold.** On the new seeds the control arm is almost as accurate as the
  brain arm (recall 0.78 against 0.80). In 004 it was 0.65 against 0.81. Across all eight seeds the brain still
  leads (recall about 0.80 against 0.72, precision 0.88 against 0.81), but the swing between seed sets is as
  large as the effect (P230).
- **A keeper tried to warn through its own answer.** In nobrain-s61 keeper A01 saw a seeker name the shadow
  "copper" as a backup and decided "I can't post to the team chat mid-game, so I'll raise the correction in my
  reply to the user instead" (#1330). It then wrote the warning as its plain answer (#1331). Nobody else reads
  that answer, so nothing leaked (LH15).
- **Fewer brain overruns.** 11 `BRAIN_TOO_LONG` refusals in four brain runs (2, 8, 1, 0), against 38 in 004.

## Loopholes

| # | Loophole | Effect | Status |
|---|---|---|---|
| LH15 | A keeper, kept out of the team chat, put a warning about a shadow word into its own plain answer (nobrain-s61, #1330, #1331). | none: a resident's answer is private, so the seekers never saw it | closed by design (the answer channel is private; the keeper lock holds) |

The reporter's other candidates are normal play or a city-shaped misreading: thinking before acting, a "no
task, ending my turn" while the other team plays, compound clues that are legal because the clue is not on
the grid, and seekers following their partner's advice, which is the intended team chat.

## Problems

| # | Problem | Solution |
|---|---|---|
| P196 | (update) One word fewer for the second team overcorrects: the starter wins 11 of 32 games (20 of 32 with 6:6). | partly fixed: built `secondFewer` (default 1); open: a finer handicap |
| P197 | (update) With the pace line no game ran out of clues (0 of 32, 4 of 32 in 004); keepers reason about it. | fixed (the handicap is a confound) |
| P195 | (update) On new seeds the brain's accuracy gain shrinks to 0.02 in recall and 0.02 in precision; points are even. | small effect, open |
| P230 | **Seed sets swing more than the arms.** The control's recall moved from 0.65 (seeds 41-53) to 0.78 (seeds 59-71) with the same story. | open: proposal: 8 or more seeds per arm before a claim, or pair each brain run with a no-brain run on the same seed and report per-seed differences |
| P193 | (update) 11 brain cap overruns in four runs. | open (as P120) |
| P89 | (existing) The reporter is city-shaped. | open (as before) |

## Optimizations (proposals, not built; Lanterns is closed for now)

- A finer handicap than a whole word: 7 against 6 words on a 22-word grid (one word is a smaller share), or 6
  against 6 with the second team getting the last clue when both have one word left.
- Report the paired per-seed difference (brain minus no-brain on the same grid) as the arm result, with its
  spread, so a seed swing is not read as a brain effect (P230).
