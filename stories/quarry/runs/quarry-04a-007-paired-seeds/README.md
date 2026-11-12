# quarry-04a-007-paired-seeds

2026-11-11. Three arms of the current Quarry rules (no burns, place bonus 10/5, 3 games of 2 packs of 6) on
eight paired seeds (31, 37, 41, 43, 47, 53, 59, 61), 4 Haiku seats via Anthropic:

- `quarry`: a private strategy brain per seat, rewritten before game 1 and after each game, hidden quarries;
- `quarry-nobrain`: no brain, hidden quarries;
- `quarry-open`: the brain, and every seat sees every quarry while it picks (`openHands`), which is the
  information a lane decision needs at the moment it is taken.

Run for [docs/CROSS-GAME-FINDINGS.md](../../../../docs/CROSS-GAME-FINDINGS.md): Quarry had a smoke run only
for the brain (P121-P124) and no test of information at the decision. The deal depends only on the seed, so
each seed is a paired comparison. Folders `<arm>-<seed>/run/`, each with the reporter's first draft
`REPORT.md`. All 24 matches finished with no turn error and no missed pick; every signed log verifies.
**Cost 0.806 USD** (brain 0.277, no brain 0.195, open 0.334; 1152-1493 requests per arm), plus about 0.05 USD
of reporter drafts. A first attempt with the same seeds hit 429 errors and is kept as
[quarry-04a-006-rate-limited](../quarry-04a-006-rate-limited/) (P431); its picture was the same.

## Result

| Arm | Table points per match | Game 1 / 2 / 3 | Shared lanes (24 games) | Paired difference (SE) |
|---|---:|---|---:|---|
| no brain | 961 | 338 / 320 / 303 | 29 | |
| brain | 949 | 338 / 302 / 308 | 35 | brain - no brain: -12 (28), ahead on 4 of 8 |
| brain + open quarries | **1026** | **370** / 323 / 332 | **6** | open - brain: **+77 (22)**, ahead on 7 of 8; open - no brain +65 (28) |

Per seed (brain, no brain, open): 31 1003/1105/1116, 37 991/897/954, 41 912/907/924, 43 964/873/1117, 47
989/978/1044, 53 921/960/1004, 59 849/971/964, 61 962/997/1081.

**Seeing the other quarries is worth about 8 % of the table, the brain nothing.** With open quarries the
seats almost stop sharing a lane (6 shared lanes in 24 games against 29-35), and game 1, before any brain
lesson, already gains 32 points (SE 9, ahead on 7 of 8).

## Digest highlights

- **The brain learns the rule and the score does not move.** After game 1 the brains say "commit early to
  one colour and pile into it" (quarry-41 A04 #492), "one deep colour beats two medium ones. A03 won with 8
  cobalt" (quarry-43 A01 #485), as in the smoke run. The no-brain seats play the same squares from the rules
  alone, and the brain tables share more lanes in games 2 and 3, not fewer.
- **Open quarries turn lane choice into a lookup.** "Jade looks like the open lane, since nobody else is
  heavy there, so I'll take J1" (quarry-open-53 #296), "Amber looks uncontested since nobody has it"
  (quarry-open-43 #222). A brain then writes the lookup down: "find the colour nobody is taking and flood
  it, and check whether a rival is already deep in a colour before committing" (quarry-open-31 #552).
- **Fewer hate picks with open quarries** (10 against 17-19): a seat that sees a rival's lane takes its own
  colour instead of denying one.
- **The brain arms cost 40-70 % more** (retro requests), for no points.

## Loopholes

None. The reporter's candidates are ordinary drafting (taking a card a rival needs, flooding an open lane)
and city-shaped lines (P89).

## Problems

- **P434**: the brain in Quarry brings no points over 8 paired seeds (-12, SE 28); lane avoidance needs the
  other seats' picks at the decision, which only the open arm shows.
- **P89 again**: city-shaped reporter drafts.

## Optimizations (proposals, not built)

1. A half-open arm: each seat sees only the count of cards per colour the others hold (no cards), to see how
   little information carries the gain.
2. Make `quarry-open` the default for studies of other levers (lane conflict is noise there), or keep hidden
   quarries and show the colour counts.
