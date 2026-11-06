# tictactoe-teams-06a-009-captain-solo-cap

Three groups of matches from 2026-11-06 that test what lay behind the forfeits of runs 006-008 and what teamwork adds. Cost **4.83 USD** (0.92 + 0.13 + 3.78). Per-match numbers: [summary.txt](summary.txt). Event logs are gzipped.

## Finding of this run: the output cap, not the captain

The forfeits of Gemma and GLM in runs 006-008 came largely from the **cap of 4000 output tokens per call**: a thinking model spends the whole budget inside its thinking, the call ends without a tool call and the move forfeits (the same mechanism as P52 for the Gamemaker). Over runs 006-008 and the fixed-captain matches about 680 turns of Gemma and GLM ended at the cap, against 8 turns in 16 Haiku matches. The story now sets 16000 (`OUTPUT_TOKENS` in `stories/tictactoe-teams/story.ts`).

## Group A: GLM with the cap at 16000 (14 matches, `cap16-glm-*`)

Same arms as run 008 without brain (`-nobrain-r6`), Haiku X vs GLM O (`glmO`) and GLM vs GLM (`glmboth`), 3x3 with 3 seeds, 4x4 and 5x5 with 2.

| Board | Pairing | Games (X / O / draw) | Forfeits per match with cap 16000 (run 008 with cap 4000) |
|---|---|---|---|
| 3x3 | Haiku X vs GLM O | 2 / 0 / 7 | 0.3 (0.5) |
| 3x3 | GLM vs GLM | 3 / 2 / 4 | 0 (0.5) |
| 4x4 | Haiku X vs GLM O | 1 / 0 / 5 | 0 (1.25) |
| 4x4 | GLM vs GLM | 1 / 1 / 4 | 0 (2.75) |
| 5x5 | Haiku X vs GLM O | 5 / 0 / 1 | 1 (3) |
| 5x5 | GLM vs GLM | 2 / 2 / 2 | 1.5 (6) |

(The run 008 figures count its no-brain and brain arms together, so they are only indicative.) With the cap lifted, GLM forfeits almost nothing, the 4x4 matches are no longer cut short, and the play is as good as Haiku's (all scored moves optimal except a few missed blocks and blunders). Draws dominate 3x3 and 4x4; 5x5 still produces decisive games. A 5x5 GLM vs GLM match takes 60-90 real minutes.

## Group B: Gemma 4 (`cap4000-fc-gemma-*`, `cap16-gemma-*`)

- **Fixed captain, cap 4000** (8 matches): still 2-5 forfeits per match and every 4x4 match invalid. The fixed captain did not help; the timeline shows capped turns of the captain and of voters (output 4000, no tool call).
- **Cap 16000** (4 matches finished, the other 6 stopped on purpose): 3x3 and 4x4 matches still end invalid. The log shows two other failures: Gemma agents tell each other "it is team O's turn, I will wait" when it is their own turn (the empty-input wake is read as "nothing to do"), and one call ran into the 16000 cap (runaway thinking). Gemma 4 26B-a4b is not a usable resident for this protocol yet; more tokens do not fix it.

## Group C: one agent per side against teams of three (`cap4000-solo-*`, Haiku and GLM, 5x5)

`-solo`: A01 plays X and A04 plays O alone; proposals agree at once, the brain is rewritten by the single agent. 5x5, four in a row, 3 Haiku seeds and 2 GLM seeds per brain arm.

| Pairing | Games (X / O / draw) | Matches |
|---|---|---|
| Haiku solo vs Haiku solo (run 009) | 11 / 7 / 0 (18 games) | 3-5 min, 0.02-0.04 USD each |
| Haiku team vs Haiku team (run 007) | 4 / 2 / 6 (12 games) | 10-31 min, 0.08-0.33 USD each |

Alone, Haiku decides every game on 5x5; as a team of three it draws half of them. That fits the idea that the team catches blunders (a hint with 18 and 12 games, X moving first, and the solo matches without a second look at the board). GLM solo (4 matches, cap 4000, 8 forfeits each in two of them) is not comparable.

## Loopholes

None seen.

## Problems

| # | Problem | Solution |
|---|---|---|
| P86 | Re-diagnosed: forfeits of Gemma 4 come from the 4000-token cap and, with 16000, from misreading whose turn it is and from runaway thinking. A fixed captain does not help. | partly fixed (cap 16000); Gemma 4 itself open |
| P88 | Re-diagnosed: GLM's forfeits grow with the board because its thinking grows; at 16000 they nearly vanish. | fixed by the cap |
| P94 | **The default cap of 4000 tokens silently ruined the comparison of thinking models** (runs 006-008 are biased against Gemma and GLM). | built: story cap 16000; open: report capped turns in the run summary |

## Notes

- Built with this run: `fixedCaptain` (grid-game option, name suffix `-fc`), `teamSize: 1` (name suffix `-solo`).
- The folder prefix names the cap: `cap4000-*` ran before it was raised, `cap16-*` after.
- Reporter (OpenRouter) was not run; this README is the hand-written report.
