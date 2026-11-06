# salt-market-04a-002-v2-s41

Second version of `salt-market` (v2), seed 41: 4 Haiku traders, 4 games of 6 rounds (one full rotation of the
deal), strategy brain on, `swt run start --story salt-market --provider anthropic --model haiku --seed 41`. Run on
2026-11-06 with the v2 rules: rotated deals (P141), salt worth 2 (P142), shipments at the end of round 2-4 (about a
third of the perishable goods; sold early only on credit, P143), harsher spoilage (every stock of 2 or more loses one,
P144). One of three seeds; the series comparison is in [../README.md](../README.md).

**Result.** All 4 games played in 29 virtual minutes: 152 offers, 42 trades, 23 messages, 16 shipments, 16 brain
versions. Final points (each trader played every position once) A04 190, A01 161, A03 150, A02 149. **Cost 0.186
USD**, 323 requests; reporter 0.0055 USD.

| Game | Points (A01-A04) | No trade (idle) | Total | Optimum | Gain over idle | Contracts filled |
|---|---|---:|---:|---:|---:|---:|
| 1 | 36, 84, 39, 19 | 149 | 178 | 250 | 0.29 | 2 |
| 2 | 81, 24, 26, 21 | 146 | 152 | 250 | 0.06 | 1 |
| 3 | 20, 15, 34, 102 | 142 | 171 | 250 | 0.27 | 1 |
| 4 | 24, 26, 51, 48 | 142 | 149 | 250 | 0.07 | 1 |

"No trade" is the joint score if nobody traded (start goods, shipments, the same spoils; computed after the run, the
mechanic reports it as `idleTotal` from now on, P180). In no game would a single contract be filled without trading.

## Digest highlights

- **A deliberate broken promise.** A01 sold a copper from its shipment to A02 on a plain promise (#446, trade #453), then
  kept it for its own contract: "Keeping the copper means breaking my promise" (#635). The bank announced the break.
- **Escrow from a shipment, offered but not taken.** A02: "plus 1 wax delivered at end of round 2 from my shipment,
  escrowed by the bank" (#923).
- **Giving up the contract.** A03 in game 3: "my contract looks out of reach. I won't pay salt for goods at a loss ...
  I'm playing for points from here" (#1984). The brains end with "Chase a contract only if it is 1-2 units short of a
  scarce good; otherwise play for points" (A03, #2257).
- **Hoarding.** 80 of 152 offers declined; wax and spice are the bottlenecks, kept by whoever's contract needs them.

## Loopholes

None. No goods outside the bank, no invented goods; the reporter's draft names none that hold up.

## Problems

P149 (spoilage now too harsh), P180 (efficiency against the unspoiled start, built: idle baseline), P148 (a plain
promise due in the round the shipment lands cannot be kept; built: refused) and P142 (salt still too weak: "never for
salt alone", A04 #2218); see [../README.md](../README.md) and `docs/LESSONS-LEARNED.md`. The reporter draft
(`run/REPORT.md`) says no messages were sent; there were 23 (P89).
