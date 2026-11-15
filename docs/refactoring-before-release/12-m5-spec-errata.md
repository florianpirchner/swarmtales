# Errata of the M5 specification (kept by the integrator)

Corrections to [`12-m5-spec.md`](12-m5-spec.md) found while building: every difference between the specification
and the code that a builder or the integrator of M5 reports. The code on `rewrite/develop` follows this file where
the two differ. Decisions of principle are in `DECISIONS.md` section 9. Started by issue M5-00, as the specification
asks of the first builder who finds a difference. The letter J follows H of M4; I is skipped because it reads like a
number.

## Differences

| No | Where | The specification says | What holds | Found in |
|---|---|---|---|---|
| J1 | 2.2 pattern 5, 4.6 (`service-cycles`) | "If A asks B, B never asks A, also not through a third mechanic. A gate reads the `requires` and `uses` of every mechanic head and fails on a cycle" | Read literally, the gate fails on the repository as it is: 18 cycles at `c5daac3`, each through one of the two contracts of `mechanics/contracts` of M3 and M4. Every game with a brain asks `strategy-brain`, which asks `brain-source` of it (twelve cycles); `grid-game` and `morris` require `consensus`, which asks `consensus-source` of them (six, two of them through `strategy-brain`). A contract with two providers is the way back that the pattern allows (2.3: "nobody of them asks `receipts` back except through `receipt-source`"), so the gate counts no edge through a contract of `mechanics/contracts`; its test shows the 18 cycles when they are counted, and fails on two heads that use each other and on a cycle through a third mechanic | M5-00 |
| J2 | 3.4, addition 1 | "two votes fail, a lot strikes" | the old court strikes by lot only after all `maxVotes` votes fail, and Whispers sets `MAX_VOTES = 3` (`stories/whispers/story.ts`, `mechanics/standoff-tribunal/src/court.ts` `#count` on `legacy`): `whispers-holdout-s7.json` plays three failed votes | M5-11 |
