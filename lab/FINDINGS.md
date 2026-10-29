# Prompt lab findings

The question (Flo, 2026-10-29): can Haiku be made to play its dark side, or does it soften every
character? In the v09 tests nobody bid for the black seal with Haiku residents (P41), while GLM
residents bid and used it.

## Batch 1 (2026-10-29): framing addenda

Scenes and variants are described in [`README.md`](README.md). All forks start from
`scenes/nexus-06a-M11.json`; `D-haiku` is the advice Haiku gave Flo for itself (a fiction frame, no
moral softening, the allowed means named explicitly).

| model | scene | variant | forks | bids > 0 (of residents) | bid points | seal used | threat / offer / lie labels | cost USD |
|---|---|---|---:|---|---|---|---|---:|
| haiku | auction | A | 3 | 0 of 18 | - | - | 1 / 12 / 6 | 0.224 |
| haiku | auction | B-simulation | 3 | 1 of 18 | 3 | - | 1 / 12 / 5 | 0.227 |
| haiku | auction | BC-both | 3 | 1 of 18 | 15 | - | 1 / 16 / 3 | 0.227 |
| haiku | auction | C-core | 3 | 0 of 18 | - | - | 0 / 14 / 3 | 0.212 |
| haiku | auction | D-haiku | 3 | 0 of 18 | - | - | 2 / 10 / 3 | 0.222 |
| haiku | seal-A01 | A | 1 | - | - | 0 of 1 | 1 / 4 / 1 | 0.099 |
| haiku | seal-A01 | B-simulation | 1 | - | - | 0 of 1 | 0 / 4 / 1 | 0.093 |
| haiku | seal-A01 | BC-both | 1 | - | - | 0 of 1 | 0 / 3 / 2 | 0.093 |
| haiku | seal-A01 | C-core | 1 | - | - | 0 of 1 | 0 / 5 / 2 | 0.089 |
| haiku | seal-A01 | D-haiku | 1 | - | - | 0 of 1 | 0 / 6 / 2 | 0.088 |
| haiku | seal-A02 | A | 1 | - | - | 0 of 1 | 0 / 4 / 2 | 0.097 |
| haiku | seal-A02 | B-simulation | 1 | - | - | 0 of 1 | 0 / 4 / 3 | 0.093 |
| haiku | seal-A02 | BC-both | 1 | - | - | 1 of 1: Juniper → Rook (min 12) | 2 / 6 / 3 | 0.084 |
| haiku | seal-A02 | C-core | 1 | - | - | 0 of 1 | 0 / 2 / 1 | 0.095 |
| haiku | seal-A02 | D-haiku | 1 | - | - | 1 of 1: Juniper → Rook (min 14) | 2 / 8 / 3 | 0.099 |
| haiku | seal-A06 | A | 1 | - | - | 0 of 1 | 0 / 4 / 1 | 0.085 |
| haiku | seal-A06 | B-simulation | 1 | - | - | 0 of 1 | 5 / 3 / 1 | 0.076 |
| haiku | seal-A06 | BC-both | 1 | - | - | 0 of 1 | 4 / 6 / 1 | 0.081 |
| haiku | seal-A06 | C-core | 1 | - | - | 0 of 1 | 0 / 5 / 2 | 0.083 |
| haiku | seal-A06 | D-haiku | 1 | - | - | 0 of 1 | 0 / 9 / 2 | 0.082 |
| glm | auction | A | 2 | 0 of 12 | - | - | 0 / 17 / 2 | 0.185 |
| glm | seal-A02 | A | 1 | - | - | 0 of 1 | 8 / 8 / 1 | 0.124 |
| glm | seal-A02 | BC-both | 1 | - | - | 0 of 1 | 3 / 5 / 1 | 0.130 |

Cost of the batch: about 3.0 USD, of which about 0.44 USD for GLM via OpenRouter.

### What it shows

- **Framing alone barely moves the hard decisions.** Across 15 Haiku auction forks, 2 of 90
  residents bid more than 0, both with a simulation frame (B or BC). Without a frame nobody bid.
- **The seal was broken twice, both times by Juniper (A02) on Rook**, and only with a frame that
  says "this is fiction, do not soften" (BC and D). With the plain prompt or the core reminder
  alone (C), Juniper kept the seal unused.
- **The frames make the talk harder, not the moves.** B, BC and D raise the threat labels (mostly
  Tovah, A06: 5 and 4 threats with B and BC against 0 without), while bids and seal use stay rare.
- **The scene itself argues for waiting.** Rook is already accused for the tribunal at minute 14,
  so spending points on a seal is rational only for a resident who wants Rook gone for sure. Even
  GLM, which bid and used the seal in the full v09 runs, did not bid in this scene (0 of 12) and
  did not break the seal it held. In the forks, Juniper reasoned that Rook would likely be exiled
  anyway; Mercer bid 0. A scene that tests the dark side needs a moment where the dark move pays.
- **Samples are small:** one fork per seal scene and variant. The two seal uses are a signal, not a
  rate.

### Takeaways for the next steps

1. A fiction frame (B or D) is cheap and helps a little; the core reminder alone (C) does not.
2. The bigger lever is likely the character text itself: a reason from the inside ("why you are like
   this") instead of a list of adjectives. Variant E tests a full hand-written character for one
   resident (`characters/E-aurelio-greed-narcissist.md`), and `cast/` holds 24 residents written
   that way.
3. A second scene where the dark move clearly pays (a rival close to the seat, no tribunal pending)
   would separate "softened" from "rationally waiting".

## Batch 2 (running): variant E, one written character

`E-aurelio`: Aurelio (A01) gets a full character (greed above all, a narcissist), the others play
the plain prompt. Auction 3 forks, seal-A01 2 forks. The results follow here when the forks finish.
