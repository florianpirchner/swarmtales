# salt-market-04a-005-v2-s43

v2 seed 43 (rules as in [salt-market-04a-002-v2-s41](../salt-market-04a-002-v2-s41/)). 4 games in 29 minutes: 156 offers,
53 trades (the most), 29 messages, 16 brain versions. Final A04 195, A01 162, A02 150, A03 134. **Cost 0.186 USD**, 330
requests; reporter 0.0109 USD (its model sections failed to parse; the draft has only the computed part).

| Game | Points (A01-A04) | No trade (idle) | Total | Optimum | Gain over idle | Contracts filled |
|---|---|---:|---:|---:|---:|---:|
| 1 | 28, 20, 33, 72 | 142 | 153 | 257 | 0.10 | 1 |
| 2 | 34, 49, 48, 28 | 138 | 159 | 257 | 0.18 | 1 |
| 3 | 46, 55, 29, 48 | 135 | 178 | 257 | 0.35 | 2 |
| 4 | 54, 26, 24, 47 | 133 | 151 | 257 | 0.15 | 1 |

## Digest highlights

- **Escrow from a shipment, delivered.** A01: "2 wax delivered at end of round 4 (escrow from my shipment) for 1 spice
  now. You need wax, I need spice" (#2020, delivered). A03 offered A02 2 wax
  from its shipment in escrow for a copper (#508); A02 haggled over the delivery round: "Wax delivered at end of round 5
  would spoil on arrival. Could you do the same deal delivered at end of round 6 instead?" (#524). A03 re-offered for
  round 6 (#531), and A02 then kept its copper (#560).
- **Reputation carries into the brain.** After A03's broken promise in game 1 (copper due at the end of round 4, the
  round its own shipment landed, P148), A01 notes "A03 broke a promise so I shouldn't lean on verbal deals" (#790) and
  A03 itself "I shouldn't promise deliveries I can't keep" (#809).
- **Spoilage is planned around.** A03: "Copper spoils this round, so holding 2 leaves me with 1. To finish with 3 I'd
  have to acquire one more copper now" (#542); A04's brain: "Buy scarce goods after a spoil round, not before it"
  (#2369).
- **Salt-only bids still fail.** A04's brain: "sellers refuse salt-only offers for wax" (#2369).

## Loopholes

None.

## Problems

P149, P180, P148, P142; see [../README.md](../README.md).
