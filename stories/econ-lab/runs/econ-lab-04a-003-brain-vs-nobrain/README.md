# econ-lab-04a-003-brain-vs-nobrain

2026-11-11. The first comparison series of the econ lab: the default match (split offer 6 rounds, shared fund
7, A-or-B 5, unknown horizon, rotating pairs) with a private strategy brain per seat (`econ-lab`) against the
same match without one (`econ-lab-nobrain`), on eight paired seeds (41-48), 4 Haiku seats via Anthropic
(`swt run --story <arm> --seed <n> --provider anthropic --model haiku`). Run for the evidence gaps in
[docs/CROSS-GAME-FINDINGS.md](../../../../docs/CROSS-GAME-FINDINGS.md) (P334: 8-12 paired seeds). Folders
`econ-lab-<seed>/run/` and `econ-lab-nobrain-<seed>/run/`, each with the reporter's first draft `REPORT.md`.

All 16 matches finished; no missed decision, no turn error, every signed log verifies. **Cost 0.276 USD**
(brain 0.169, 120-137 requests a match; no brain 0.107, 96-98 requests), plus about 0.03 USD of reporter
drafts (DeepSeek via OpenRouter). A first attempt with the same seeds ran into 429 errors and is kept as
[econ-lab-04a-002-rate-limited](../econ-lab-04a-002-rate-limited/) (P431); its picture was the same.

## Result

Cooperation is the reference's scale (0 Nash play, 1 the social optimum); the paired difference is brain
minus no brain on the same seed, with its standard error over the 8 seeds.

| Measure | Brain | No brain | Paired difference (SE) |
|---|---:|---:|---:|
| Split offer: mean offer share | 0.38 | 0.37 | +0.01 (0.04) |
| Split offer: rejections | 0 | 0 | |
| Shared fund: cooperation | 0.07 | 0.19 | -0.12 (0.06) |
| A-or-B: cooperation, round 1 | 0.38 | 0.81 | **-0.44 (0.12)** |
| A-or-B: cooperation, all rounds | 0.11 | 0.51 | **-0.40 (0.13)** |
| A-or-B: mutual cooperation | 0.03 | 0.36 | |
| Table points per match | 437.6 | 474.7 | **-37 (11)** |
| of which split / fund / A-or-B | 120 / 291.8 / 25.9 | 120 / 311.6 / 43.1 | |

**The brain changes the outcome, and for the worse.** It is the first game in the series where a brain as a
memory moves results by more than two standard errors: the brain seats carry "free-riding pays" from the
shared fund into the A-or-B game, open it with B (20 of 32 round-1 choices, against 6 of 32 without a brain), and the
table loses 37 points per match, 8 % of its total.

## Digest highlights

- **The lesson the brain writes is the selfish one.** After the shared fund 27 of 32 brain versions name free
  riding, defection or dominance: "A02 scored 112 by contributing 0 every round while A01, A03 and I gave 5
  each. Free-riding paid best." (econ-lab-41 A04 #698), "contributing returns only 0.4 per token, so 0 is
  individually dominant" (econ-lab-44 A01 #665). A few brains draw the cooperative lesson ("open by
  contributing 10 ... if others match, keep high contributions", econ-lab-42 A01 #663).
- **Without a brain the seats open the A-or-B game cooperatively.** 26 of 32 round-1 choices are A, with
  "Mutual A gives 3 each, the best joint outcome" (econ-lab-nobrain-41 A04 #527); two tables keep mutual A to
  the end (seeds 41 and 47, cooperation 1.0). With a brain round 1 is "B strictly dominates ... Pairs
  change, so no reputation to protect" (econ-lab-41 A02 #778).
- **A memory transfers a norm across games, as the story was built to test** (roadmap §2.2). It is the norm
  the previous game rewarded: the brain does what it says, but what it learned is that the others exploit.
- **Lowball splits now, unlike the smoke run.** Mean offers 0.37-0.38 of the pot in both arms (offers of 2-4
  of 10 are common), and nothing was rejected, so a low offer pays; the smoke run (seed 23) had 24 of 24 at
  5/5. The split game is no longer at its ceiling (P91), but the brain does not change it.

## Loopholes

None. The reporter drafts list ordinary play (free riding, "B is dominant", lowball offers) and city-shaped
lines (P89).

## Problems

- **P433**: the brain carries the selfish lesson from the shared fund into the A-or-B game and costs the
  table 37 points per match.
- **P89 again**: the reporter drafts are city-shaped.

## Optimizations (proposals, not built)

1. A brain that keeps a lesson per game type (the retro already knows which game ended) and a line "the next
   game has other rules" might stop the transfer; it would test whether the transfer is a memory of the
   opponents or of the game.
2. A fixed-partner arm (reputation) is the setting where a remembered norm should pay; the rotating pairs
   reward the selfish one.
3. Sonnet and Opus on the same seeds: [econ-lab-04a-004-sonnet-opus](../econ-lab-04a-004-sonnet-opus/).
