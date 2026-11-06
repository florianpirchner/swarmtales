# lanterns-06a-002-brain-vs-nobrain

Four live runs of `lanterns` after the P191 change (a landed clue now scores 1 per word beyond the first, at
most 5 clues per team and game): the full three-game match with team brains (`lanterns`) against the control
arm without brains (`lanterns-nobrain`), each on seeds 31 and 37, so both arms play the same grids. 6 Haiku
residents via Anthropic, run on 2026-11-06 (`swt run --story <arm> --seed <seed> --provider anthropic
--model haiku`). Folders: `brain-s31/`, `brain-s37/`, `nobrain-s31/`, `nobrain-s37/`, each with the
reporter's draft `REPORT.md` (city-shaped, P89; this README is the reviewed report).

**Result.** All four matches ran to the end (3 games each, every game ended by a team finding all its
words; 86 clues, none missed). **Cost 0.22 USD** for all four (0.047, 0.047, 0.068, 0.060), 832 requests;
the reporter drafts 0.012 USD more (OpenRouter).

| Run | Clues | Mean number | Numbers (1 / 2 / 3) | Landed | Extra guess used | Game points (amber:teal) | Match |
|---|---:|---:|---|---:|---:|---|---|
| brain-s31 | 23 | 1.48 | 12 / 11 / 0 | 7 | 0 | 11:3, 11:2, 10:4 | amber 32, teal 9 |
| brain-s37 | 19 | 1.63 | 9 / 8 / 2 | 7 | 0 | 11:4, 6:10, 12:2 | amber 29, teal 16 |
| nobrain-s31 | 22 | 1.77 | 6 / 15 / 1 | 9 | 0 | 11:6, 5:11, 5:11 | teal 28, amber 21 |
| nobrain-s37 | 22 | 1.68 | 9 / 11 / 2 | 7 | 0 | 11:2, 11:4, 7:7 | amber 29, teal 13 |

Recall (keeper targets found over clue numbers) lies between 0.43 and 1.0 per team and game in both arms,
mean about 0.8; precision (own words over guesses) about 0.85 in both. On two seeds the brain shows no gain
in recall or precision.

## Digest highlights

- **The bonus moved the numbers a little.** The mean clue number rose from 1.0-1.5 in run 001 to 1.5-1.8,
  and 5 clues of 3 appeared (amber "black" 3 in brain-s37, #181; "floor" 3, #1580); 30 of 86 clues landed.
  But no caller ever took the number + 1 guess (0 in 86 clues): a landed clue is banked and the turn ends.
- **Brains make keepers more careful, not bolder.** With brains the mean number is 1.48 and 1.63, without
  1.77 and 1.68. The brains are lists of safety rules: "If more grid words fit than the number, drop the
  number or pick a sharper word" (teal, brain-s31, #1413); "Number 2+: only if every target has a direct
  link" (teal, brain-s37, #1338).
- **Some real conventions.** Amber in brain-s37 settles on "linking your hidden words by a common two-word
  phrase (tea light, tea trolley, black forest)" and "if 3 or more remain, look for a 2-target link first"
  (#1330), and wins two of three games with it. Teal in brain-s31 writes down the trap that cost it 3 points
  twice: "If a category item and its accessory both fit (canoe/paddle), name the item itself" (#1413), after
  revealing the shadows canoe (#348) and paddle (#1097).
- **The team that starts twice wins.** Amber has the first clue in games 1 and 3, teal only in game 2. Amber
  won 8 of the 12 games and three of the four matches (111 points against 66 in all); the starting team won
  8 of the 11 decided games. Over an odd number of games the match is not fair (P196).
- **Brain cap overruns again.** 13 `BRAIN_TOO_LONG` refusals in the two brain runs (P193).

## Loopholes

None seen. The reporter's candidates are normal play (stopping after a landed clue, a keeper keeping the
no-chat rule) or misreadings of a core story as a city run ("0 submissions"). No keeper posted during a game,
the targets stayed sealed.

## Problems

| # | Problem | Solution |
|---|---|---|
| P191 | (update) Keepers timid: the growing bonus and the cap of 5 raised the mean number from 1.0-1.5 to 1.5-1.8; the extra guess is still never used (0 of 86 clues). | partly fixed: built the bonus (number - 1) and the cap of 5; still open for the extra guess |
| P193 | (update) Brain cap overruns: 13 refusals in two brain runs. | open (as P120) |
| P195 | **No brain effect on two seeds.** Recall about 0.8 and precision about 0.85 in both arms; the brain arm gives smaller numbers (1.48 and 1.63 against 1.77 and 1.68) and, by points, wins nothing. | open: proposal: more seeds and an even number of games before any claim; a brain prompt that asks for conventions ("how we clue"), not safety rules |
| P196 | **The team that starts more often wins.** With 3 games amber starts twice; amber won 8 of 12 games, 111 to 66 points; the starter won 8 of 11 decided games. | open: proposal: an even number of games by default (2 or 4), or the second team gets one word fewer (the classic answer to a first-move edge); a bot or more runs to size the edge |
| P89 | (existing) The reporter is city-shaped ("0 submissions", "no level solved"). | open (as before) |

## Optimizations (proposals, not built)

- Make the match fair first (P196): 4 games by default, so each team starts twice; the keeper then rotates
  4 times through 3 members (one keeps twice), or teams of 2 seekers + 1 keeper per game with the order
  A01, A02, A03, A01.
- Reward the extra guess or drop it: score a "bonus word" (an own word found with the number + 1 guess) at 2,
  or remove the extra guess, which nobody uses.
- Ask the brain for conventions: the retro prompt could name what to write ("how our keeper picks a clue,
  how our seekers read it"), so the brain carries a code from one keeper to the next instead of caution.
