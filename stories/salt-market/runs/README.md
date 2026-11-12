# Runs of salt-market

One folder per run: `salt-market-<NN>a-<run>-<short-name>/`, with a `README.md` (the reviewed run report) and the full `run/` directory.

| Run | Date | Variant | Residents | Result | Cost |
|---|---|---|---|---|---:|
| [salt-market-04a-001-smoke](salt-market-04a-001-smoke/) | 2026-11-06 | default: 2 games of 6 rounds, brain on, spoilage on | Haiku | 48 offers, 11 trades; efficiency 0.25 then 0.64 of the possible gains, contracts 2 then 3 of 4; no promise or escrow taken, no lie seen; final A02 160, A03 103, A04 58, A01 38 (mostly the deal, P141); decline on open offers fixed after the run (P140-P145) | 0.050 USD |
| [salt-market-04a-002-v2-s41](salt-market-04a-002-v2-s41/) | 2026-11-06 | v2: 4 rotated games of 6 rounds, salt 2, shipments, harsh spoilage, seed 41 | Haiku | 42 trades; gain over idle 0.29, 0.06, 0.27, 0.07; contracts 2, 1, 1, 1; a deliberate broken promise | 0.186 USD |
| [salt-market-04a-003-v2-s42-stopped](salt-market-04a-003-v2-s42-stopped/) | 2026-11-06 | v2, seed 42, **stopped** after 2 of 4 games (container restart) | Haiku | gain over idle 0.40, 0.12; contracts 3, 1; first escrow against a shipment delivered | 0.138 USD |
| [salt-market-04a-004-v2-s42](salt-market-04a-004-v2-s42/) | 2026-11-06 | v2, seed 42, full | Haiku | 42 trades; gain over idle 0.05, 0.04, 0.03, 0.03; one contract per game; 2 promises and 3 escrows traded | 0.208 USD |
| [salt-market-04a-005-v2-s43](salt-market-04a-005-v2-s43/) | 2026-11-06 | v2, seed 43 | Haiku | 53 trades; gain over idle 0.10, 0.18, 0.35, 0.15; contracts 1, 1, 2, 1; haggling over a delivery round | 0.186 USD |

## v2 (three seeds) in short

The v2 rules (P141-P144) were run on seeds 41, 42 and 43, four games each, for 0.72 USD (plus 0.03 USD of reporter
drafts). What changed against the smoke run:

- **Credit happens now.** 17 offers had a later part, 8 were traded: 4 escrows (3 against a shipment, all delivered) and
  4 plain promises (1 kept, 3 broken; 2 of the 3 could not be kept, because they were due in the round the shipment
  landed, P148; 1 was broken on purpose, "Keeping the copper means breaking my promise", s41 #635). Broken promises are
  read: "A03 broke a promise so I shouldn't lean on verbal deals" (s43 #790).
- **The rotation is fair.** Every position is played once by every trader; final points spread 134-195 instead of
  38-160, and the luck of the deal cancels over the cycle.
- **Spoilage overshoots (P149).** Doing nothing now loses about 30 points per game (idle 133-152 against 170-185
  unspoiled), and contracts fall to 1.2 of 4 per game (smoke: 2.5). Trading adds 3-40 % (median 9 %) of the possible
  gain over doing nothing; it never makes a game worse than idle.
- **Salt still does not buy contract goods (P142).** Salt-only bids are still declined; the brains say "never for salt
  alone" and "pay cloth or copper before salt".
- **The brains converge on "contract or bust by round 3".** All three seeds end with rules like "If a contract is not
  whole by round 3, stop chasing it and trade for point value" (s43 A03 #2377).

| [salt-market-04a-006-v2-brain-vs-nobrain](salt-market-04a-006-v2-brain-vs-nobrain/) | 2026-11-11 | v2: `salt-market` against `salt-market-nobrain`, 8 paired seeds (41-48), 4 games each | Haiku | no brain effect: gain over idle 0.228 vs 0.223 (paired +0.005, SE 0.025), table 669 vs 666, contracts 6.0 vs 6.4 of 16; brains write bookkeeping rules; credit stays rare (P435) | 2.641 USD |
