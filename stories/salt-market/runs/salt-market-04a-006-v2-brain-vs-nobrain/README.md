# salt-market-04a-006-v2-brain-vs-nobrain

2026-11-11. The first brain comparison of Salt Market on the v2 rules on `main` (4 rotated games of 6 rounds,
salt 2, shipments, harsh spoilage; the stopped v3 patch is not in this code): `salt-market` (a private
strategy brain per trader) against `salt-market-nobrain`, on eight paired seeds (41-48), 4 Haiku seats via
Anthropic. Run for [docs/CROSS-GAME-FINDINGS.md](../../../../docs/CROSS-GAME-FINDINGS.md), where Salt Market
had no comparison yet. Folders `<arm>-<seed>/run/`, each with the reporter's first draft `REPORT.md`.

All 16 matches finished (64 games); 8 turns hit a 429 error (P431: 6 in the brain arm, 2
without), each one lost turn of one trader. Every signed log verifies. **Cost 2.641 USD** (brain 1.410, no brain 1.231),
plus about 0.04 USD of reporter drafts.

## Result

Gain over idle is the reference's scale: 0 is the table's points without any trade, 1 the exact optimum over
contract subsets (P180). The paired difference is brain minus no brain on the same seed.

| Measure (8 matches per arm) | Brain | No brain | Paired difference (SE) |
|---|---:|---:|---:|
| Gain over idle, all games | 0.228 | 0.223 | +0.005 (0.025), ahead on 4 of 8 |
| game 1 / 2 / 3 / 4 | 0.16 / 0.23 / 0.30 / 0.22 | 0.23 / 0.24 / 0.23 / 0.20 | game 1: -0.07 (0.07); games 2-4: +0.03 (0.02) |
| Table points per match | 669 | 666 | +3 (12) |
| Contracts filled per match (of 16) | 6.0 | 6.4 | -0.4 (0.5) |
| Trades per match | 85.5 | 82.8 | |
| Promises and escrows per match | 1.9 | 1.2 | |
| Broken promises (all matches) | 0 | 1 | |

**No brain effect.** Trading recovers about a fifth of the possible gain in both arms. The brain arm starts
a little worse (game 1, the brain written before any play) and is a little better in games 2-4, both inside
the noise.

## Digest highlights

- **The brains write bookkeeping, not strategy.** The lines are "Read rules, my values and contract before
  any offer" (salt-market-41 A02 #1447), "map perishable goods and spoil rounds" (salt-market-44 A02 #1516),
  "Never give more than I get unless the contract needs it" (salt-market-43 A04 #1473): what the rules and
  the status already make every seat do.
- **One lesson is real and specific:** "Keep 1 spare tradeable unit (salt) until the last round; I ran out of
  currency and could not buy the last spice" (salt-market-42 A04 #1593). It is the kind of lesson that needs
  the moment of the decision to bind.
- **Credit stays rare.** Fewer than two promises or escrows per match in either arm, as in the v2 smoke runs
  (P143, P148).
- **The brain arm costs 15 % more** (retro requests) for no gain.

## Loopholes

None. The reporter's candidates are ordinary negotiation (asking for more than the value, declining salt
bids) and city-shaped lines (P89).

## Problems

- **P435**: no brain effect in Salt Market over 8 paired seeds (gain over idle +0.005, SE 0.025).
- **P142 again**: salt-only bids are still declined.

## Optimizations (proposals, not built)

1. Decision-time information, as proposed in the cross-game paper: show each trader the gap to its contract
   and the reference value of an offer's goods next to the offer (accept or decline).
2. Decide on the stopped v3 patch (`/mnt/project-files/salt-market-v3/`: milder spoilage, salt worth 3)
   before more series; it changes the economy more than any brain did.
