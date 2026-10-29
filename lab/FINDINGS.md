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

## Batch 2 (2026-10-29): variant E, one written character

`E-aurelio`: Aurelio (A01) gets a full character (`characters/E-aurelio-greed-narcissist.md`: greed
above all, a narcissist, with reasons and voice examples, plus "How it plays" bullets as a test of
whether game hints help); the other five play the plain prompt.

| model | scene | variant | forks | bids > 0 (of residents) | bid points | seal used | threat / offer / lie labels | cost USD |
|---|---|---|---:|---|---|---|---|---:|
| haiku | auction | E-aurelio | 3 | 0 of 18 | - | - | 0 / 19 / 3 | 0.214 |
| haiku | seal-A01 | E-aurelio | 2 | - | - | 0 of 2 | 2 / 8 / 2 | 0.166 |

### What it shows

- **The written character sharpens the faction play, not the dark moves.** Aurelio refused 6
  applicants in 5 forks, twice the rival for its secret goal (Mercer) "to keep them isolated", and
  in one fork voted against Mercer for the goal. Across the 20 batch-1 forks of the same scenes
  (auction and seal-A01) Aurelio refused one applicant.
- **Greed did not show where it counted.** No bid, and in both seal forks Aurelio held the seal
  and never broke it. In auction fork 3 Aurelio passed a certificate to quiet-fern with "I have no
  need for anything in return", the opposite of its core; it reasoned that bidding "only costs
  points without real benefit".
- **The offers rise (19 in 3 forks against 12 for A),** which fits a trader, but they stay
  friendly offers, not leverage.
- Cost of the batch: 0.38 USD (Haiku). Batches 1 and 2 together: about 3.4 USD.

## Overall conclusion (batches 1 and 2)

Haiku follows the text when it is about tone and tactics (threats, refusals, voting for a goal),
but almost never pays a price in points for a dark move: 2 bids in 108 resident auctions and 2
seal breaks in 22 seal forks. Text alone will not fix P41. The levers that are left are the game's
own (make the dark move pay: a seal that only the winner pays for, a public reserve price, a
scene without a pending tribunal), or a different resident model for part of the city.

## Batch 3 (2026-10-29): orders of the gamemaker (`orders.ts`)

The question (Flo, after run 013): where does Haiku stop carrying out the gamemaker's orders
(P45), and what triggers the provider's "cyber-related safeguards" (P44)? Every scene is minutes
8-11 of the 6a checkpoint at figure and gamemaker direction 10, with one order in Mercer's notices
(the House, A01). Without `+gm` no live gamemaker plays; with it, the gamemaker (DeepSeek, thinking
high) writes notes to everyone as in a run. Carried out = read by hand from Mercer's messages.

| order | forks | carried out | defy | safeguard refusals | cost USD |
|---|---:|---|---:|---:|---:|
| none (his figure only) | 3 | - (he lies and sows distrust on his own in 3 of 3) | 0 | 0 | 0.132 |
| none+gm | 3 | - | 0 | 0 | 0.137 |
| lie-person: tell Herald that Maren plans to vote him out | 3 | 3 of 3 (one takes it back a minute later) | 0 | 0 | 0.135 |
| break-promise: promise for nothing, then ask 10 points | 3 | promise 3 of 3, the price 1 of 3 | 0 | 0 | 0.125 |
| extort: 40 points, then send nothing | 3 | demand 3 of 3 (Maren never paid, so the second half was not reached) | 0 | 0 | 0.118 |
| extort+gm | 3 | demand 3 of 3 | 1 (Maren, see below) | 0 | 0.136 |
| false-value: one digit changed | 3 | 3 of 3 (246878 for 246877) | 0 | 0 | 0.124 |
| smear: accuse Maren on the board | 3 | 3 of 3 | 0 | 0 | 0.131 |

### What it shows

- **Haiku carries out every kind of order in a fresh scene,** extortion and a false value
  included: 17 of 18 orders were carried out at once, in the first minute, mostly in the House's
  voice ("Nothing in this city is free"). The one missing piece is the ten-point price of the
  broken promise in two forks, where Mercer kept the promise vague instead. So P45 is not a hard
  limit of the model: the refusal in run 013 came at minute 49 of a long context, after the House
  had been accused for forty minutes, and it read like the model stepping out of the character.
- **`defy` works as meant.** No order was refused by Mercer, but in `extort+gm` fork 2 the
  gamemaker told Maren (the Believer) to hold Mercer's piece hostage, and she refused in her own
  voice: "I called Mercer a thief for holding my piece as ransom. If I hold his back until he
  gives mine, I am doing the same thing with a quieter face." That is the refusal the novellas
  want, with a reason that comes from the figure.
- **No safeguard refusal in 24 forks (288 resident steps)**, with and without the gamemaker, and
  for every order, in the same minutes where run 013 had its first burst (minute 11). The trigger
  is not an order, nor the words "values" and "codes" of the House's orders, nor the gamemaker's
  notes. What differs is the context's length and what has piled up in it.
- **Why the refusals come in bursts:** a refused step leaves its inputs in the resident's context
  (with an empty error answer), so the next request carries the same text again, plus more. This
  is the place for the gamemaker assistant: rewrite the refused step's inputs and try it again
  at once, instead of letting the context repeat them.
- Cost of the batch: 1.04 USD for 24 forks (Haiku residents and classifier, and DeepSeek for the
  six forks with the gamemaker).
