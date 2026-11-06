# lanterns-06a-004-conventions

Eight live runs of `lanterns` after three changes: 4 games by default (each team starts twice, P196), no
extra guess (a caller guesses up to the clue's number, P191), and a retro prompt that asks for the team's
conventions between keeper and seekers instead of caution (P195). Brain arm (`lanterns`) against the control
arm without brains (`lanterns-nobrain`), each on seeds 41, 43, 47 and 53, so both arms play the same grids.
6 Haiku residents via Anthropic, run on 2026-11-06 (`swt run --story <arm> --seed <seed> --provider anthropic
--model haiku`). Folders: `brain-s41/` ... `nobrain-s53/`, each with the reporter's draft `REPORT.md`
(city-shaped, P89; this README is the reviewed report).

These runs asked for conventions through a story prompt override of `strategy-brain/retro-open.md`; the
prompt validator does not allow a story to override a mechanic prompt, so the same text now ships as the
strategy-brain option `retroFocus`, which Lanterns sets. The wording the residents saw is the same in substance.
A first attempt of these eight runs was stopped by a container restart after 2 of 4 games
([lanterns-06a-003-stopped](../lanterns-06a-003-stopped/)).

**Result.** All eight matches ran to the end (4 games each, 253 clues). **Cost 0.62 USD** (brain 0.090,
0.098, 0.080, 0.086; no-brain 0.053, 0.066, 0.077, 0.065), 2,210 requests; the reporter drafts about 0.02 USD
more (OpenRouter).

| Run | Clues | Mean number | Numbers (1 / 2 / 3 / 4) | Landed | Wrong-word ends | Game points (amber:teal) | Match |
|---|---:|---:|---|---:|---:|---|---|
| brain-s41 | 27 | 1.81 | 10 / 13 / 3 / 1 | 9 | 9 | 10:7, 6:11, 2:12, -4:9 | teal 39, amber 14 |
| brain-s43 | 36 | 1.31 | 25 / 11 / 0 / 0 | 4 | 6 | 11:2, 4:10, 4:5, 4:5 | amber 23, teal 22 |
| brain-s47 | 31 | 1.39 | 19 / 12 / 0 / 0 | 10 | 1 | 12:6, 10:5, 11:5, 3:11 | amber 36, teal 27 |
| brain-s53 | 30 | 1.47 | 18 / 10 / 2 / 0 | 7 | 4 | 11:4, 11:5, 10:3, 11:5 | amber 43, teal 17 |
| nobrain-s41 | 29 | 1.76 | 8 / 20 / 1 / 0 | 9 | 10 | 6:11, 4:11, 11:5, 2:10 | teal 37, amber 23 |
| nobrain-s43 | 33 | 1.70 | 11 / 21 / 1 / 0 | 10 | 11 | 6:11, 3:5, 7:10, 4:11 | teal 37, amber 20 |
| nobrain-s47 | 34 | 1.88 | 7 / 24 / 3 / 0 | 9 | 12 | 10:3, 5:6, 6:12, 6:10 | teal 31, amber 27 |
| nobrain-s53 | 33 | 1.73 | 11 / 20 / 2 / 0 | 7 | 9 | 7:12, 9:5, 10:4, 10:6 | amber 36, teal 27 |

By arm (all four seeds): the brain arm has recall 0.81 and precision 0.88, the no-brain arm 0.65 and 0.78.
Wrong-word ends: 20 of 124 clues with brains, 42 of 129 without (fog 11 against 27, opponent 6 against 13,
shadow 3 against 2). Mean number 1.48 with brains, 1.77 without; points per team and game 6.9 with brains,
7.4 without.

## Digest highlights

- **The brains are codes now, for both roles.** Every brain is split into keeper and seeker rules: "TEAL
  BRAIN v4 (keeper and seekers share this code) ... Keeper: one clue word with one tight link (compound,
  exact type-of, common phrase) ... Seekers: read only the keeper's link; lead with the tightest fit"
  (brain-s53, #1767); amber writes a list of link kinds that worked ("animal, fungus, sewing tool, sailing
  gear, footwear, castle part") and "With 2 or fewer of our words left, aim a 2 at a pair ... it ends the game
  for the bonus" (#1813). Teal in brain-s41 records "colour clusters: white 3, grey 2 worked" (#1737).
- **First brain effect: accuracy.** With brains the seekers find more of the keeper's targets (recall 0.81
  against 0.65) and guess fewer wrong words (precision 0.88 against 0.78); half as many clues end on a wrong
  word. This is the first signal in Lanterns that the memory carries something from one keeper to the next.
- **But the code is still careful, so points do not follow.** The brains keep "Default: number 1"
  (amber, brain-s41, #1756) and "Prefer N=1" (teal, brain-s53, #1767). In brain-s43, 25 of 36 clues are a 1
  and games 3 and 4 end on the clue cap at 4:5 and 4:5 (P197): 6 words cannot be found with 5 clues of 1.
  Per team and game the brain arm scores 6.9, the control 7.4.
- **The bold clue that met two shadows.** In brain-s41 game 4 amber's keeper A01 tries "window" 3 (#1897);
  the first guess is "storm" (storm window), a shadow (#1944). Later "tree" 1 reveals "apple", the second
  shadow (#2199). Amber ends the game at -4, its match 14 to 39.
- **Four games make the match fair; each game is still not.** Each team starts twice now. The starter still
  wins 20 of 32 games (11 of 16 with brains, 9 of 16 without), but the matches split 4 to 4 between the teams.
- **Brain cap overruns grow.** 38 `BRAIN_TOO_LONG` refusals in four brain runs (8, 9, 8, 13), many by
  1-30 words (P193): the code of two roles is longer than the cautious lists before.

## Loopholes

None seen. The reporter's candidates are normal play or misreadings of a core story as a city run ("zero
submissions", "end my turn instead of submitting"): seekers following their partner's advice is the intended
team chat, and a writeBrain refused with `TOOL_LOCKED` after the retro window closed was not saved and the
team noticed. No keeper posted during a game, the targets stayed sealed.

## Problems

| # | Problem | Solution |
|---|---|---|
| P191 | (update) Keepers timid: without the extra guess the mean number is 1.31-1.88 per run. | partly fixed: extra guess removed (option `extraGuess`, default off) |
| P193 | (update) Brain cap overruns: 38 refusals in four brain runs. | open (as P120) |
| P195 | (update) The conventions prompt gives a brain effect on accuracy (recall 0.81 against 0.65, precision 0.88 against 0.78) but not on points; the brains still give smaller numbers. | partly fixed: built `retroFocus` in strategy-brain, Lanterns asks for conventions |
| P196 | (update) The starter still wins 20 of 32 games; with 4 games the match evens out (matches 4 to 4). | partly fixed: 4 games by default |
| P197 | **A cautious brain default makes the game unfinishable.** "Default number 1" with 6 words and 5 clues: brain-s43 games 3 and 4 end on the clue cap at 4:5. | open: proposal: tell the keeper the arithmetic (words left against clues left) in the task, or a clue cap of 6 |
| P89 | (existing) The reporter is city-shaped. | open (as before) |

## Optimizations (proposals, not built)

- Show the arithmetic to the keeper: "4 words left, 2 clues left" in the clue task, so a code that says
  "number 1" meets the cap before the game is lost (P197).
- Pay boldness where the brain is accurate: with precision 0.88 a 2 is worth more than two 1s already; the
  retro focus could add "a number is a promise your seekers keep; count what the cap needs".
- The second team gets one word fewer (5 against 6), the classic answer to the first-move edge (P196).
- A brain cap of 250 words for two-role codes, or a tool that reports the length before writing (P193).
