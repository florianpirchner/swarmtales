# salt-market-04a-004-v2-s42

v2 seed 42, full run (rules as in [salt-market-04a-002-v2-s41](../salt-market-04a-002-v2-s41/); the first attempt was
stopped, [salt-market-04a-003-v2-s42-stopped](../salt-market-04a-003-v2-s42-stopped/)). 4 games in 29 minutes: 196
offers, 42 trades, 30 messages, 1 gift, 14 brain versions (two retro windows closed unwritten after 12
`BRAIN_TOO_LONG` refusals, P120). Final A02 186, A03 162, A01 138, A04 136. **Cost 0.208 USD**, 331 requests; reporter
0.0059 USD.

| Game | Points (A01-A04) | No trade (idle) | Total | Optimum | Gain over idle | Contracts filled |
|---|---|---:|---:|---:|---:|---:|
| 1 | 34, 46, 46, 32 | 152 | 158 | 267 | 0.05 | 1 |
| 2 | 23, 68, 46, 20 | 152 | 157 | 267 | 0.04 | 1 |
| 3 | 47, 50, 16, 42 | 151 | 155 | 267 | 0.03 | 1 |
| 4 | 34, 22, 54, 42 | 148 | 152 | 267 | 0.03 | 1 |

## Digest highlights

- **Credit is used.** 10 offers with a later part; 2 plain promises and 3 escrows were traded. A04 kept a promise with a
  gift note: "keeping my promise P31, 1 copper" (#1358). A02 sold 3 spice from its round-3 shipment in escrow for 2
  copper (#1927, delivered); A03 sold 2 cloth from its shipment in escrow (#3040).
- **A broken promise that could not be kept.** A04 promised 2 spice "from my shipment" due at the end of round 3
  (#261), the round its shipment landed; the bank settled the promise right after the shipment arrived, before A04 had
  another turn, and announced the break (#445). A03 then: "it already broke a promise to A02, so I'm wary of it"
  (#472). The rule now refuses such a promise (P148).
- **The worst series.** Every game filled one contract and added 3-5 % of the possible gain over doing nothing: the
  holders kept wax and spice ("refused to sell it because its contract needed four", reporter draft, verified #2168).

## Loopholes

None.

## Problems

P149, P180, P148, P120 (brain cap); see [../README.md](../README.md). The reporter draft claims no brain was written
(16 attempts, 14 written: wrong) and counts levels (P89).
