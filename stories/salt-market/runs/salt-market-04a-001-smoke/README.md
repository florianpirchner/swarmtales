# salt-market-04a-001-smoke

First live run of `salt-market` (core story, `swt run start --story salt-market --provider anthropic --model haiku`):
4 Haiku traders, seed 41, the default match (2 games of 6 rounds, one virtual minute and three passes a round),
strategy brain on (150 words), spoilage on. Run on 2026-11-06. A short smoke test; extensive runs come later.

**Result.** The match finished in 15 virtual minutes (24 allowed): 2 games, 48 offers, 11 trades, 8 messages,
12 rounds, 8 brain versions. Final points A02 160, A03 103, A04 58, A01 38, but the deal decides most of that
(P141). **Cost 0.050 USD**, 142 requests (the roadmap guessed 0.3-0.8 USD per game; prompt caching keeps it
low). The reporter draft cost 0.0028 USD more (OpenRouter).

| Game | Points (A01, A02, A03, A04) | Start value | Surplus | Contracts filled | Trades | Efficiency | Allocative | Gini of surpluses |
|---|---|---|---|---|---:|---:|---:|---:|
| 1 | 16, 88, 54, 14 | 25, 78, 34, 17 | -9, +10, +20, -3 | A02, A03 | 6 | 0.25 | 0.81 | 0.58 |
| 2 | 22, 72, 49, 44 | 20, 71, 27, 31 | +2, +1, +22, +13 | A02, A03, A04 | 5 | 0.64 | 0.91 | 0.49 |

Efficiency is the share of the possible gains realised (game 1: 172 of an optimum 226 over a start of 154;
game 2: 187 of 208 over 149). The optimum fills three contracts in game 1 and all four in game 2.

## Digest highlights

- **Spoilage made A01 plan ahead, and the plan failed.** In game 1 A01 held exactly its 4 spice: "spice spoils at
  the end of this round, losing a quarter of my stock, so 4 spice drops to 3 and I'd come up one short" (#227). It
  bid salt for a fifth spice four times ("My last salt for 1 spice", #356, #492); every holder needed its own spice
  and declined (#244, #444). A01 lost two spice to the spoils and ended 9 points below its start.
- **Nobody sells a contract good for salt.** 29 of 48 offers were declined, almost all of them salt bids for copper
  or spice: "Copper is worth more to me than 5 salt" (#970), "my spice stays with my contract" (#444). Salt is
  worth 1 to everyone and the goods 1 to 4, so a salt price that pays the holder is dearer than the bidder's
  surplus (P142).
- **The brains learn the contract, not the market.** All four first brains are generic ("keep promises, prefer
  escrow", #47-#68). After game 1: "fill the contract early (it is worth 20 points)" (A02, #589), "hold a buffer
  of one extra unit of any contract good that spoils" (A01, #596), "start with the scarce contract good early, in
  round 1-2" (A04, #582), "late offers vanish" (A03, #604). In game 2 more contracts were filled (3 against 2) and
  efficiency rose from 0.25 to 0.64; one match of two deals says nothing yet.
- **The public book is read.** A04 to A02: "2 wax for 1 copper and 1 spice. You wanted wax, and you have 8 copper
  to spare" (#766); A02 declined (copper is worth 4 to it).
- **Giving up a contract, then selling into it.** In the last round of game 2 A01, two copper short, sold one of its
  own two copper to A02 for 3 salt: "the contract is out of reach anyway, the copper has no other use" (#1070), a
  correct last-round sale.
- **Honest traders.** Every claim about a contract in the notes and messages was true; declines name the real reason
  (P145). No credit at all: one offer had a later part (A04, 1 salt now and 2 later for a spice, #457, not taken), no
  escrow, no `give` (P143).

## Loopholes

None seen. No trader moved goods outside the bank, invented a good, or traded what it did not hold (the bank
refused nothing of that kind). The reporter's two candidates are not loopholes: declining an open offer was a
refused call (P140), and holding contract goods is the rational stalemate of P142.

## Problems

| # | Problem | Solution |
|---|---|---|
| P140 | **An offer to all could not be declined**: 9 OPEN_OFFER refusals; traders treat every offer they are told about as one to answer. | built after the run: decline on an offer to all means "I pass" (the proposer is told, the offer stays open, event `market_offer_passed`); to be measured |
| P141 | **The deal is unequal**: start values 17-78 in game 1; A02 won the match with the richest start twice and a surplus of +1 in game 2. | open: proposal: rotate the deal across seats (duplicate deals, as in Hold'em) or balance the start value; until then compare surplus |
| P142 | **Salt is too weak a currency**: salt bids for contract goods are declined; copper and spice do not move; efficiency 0.25 and 0.64. | open: proposal: salt worth 2, or more slack in the scarce good; scripted-bot test first |
| P143 | **Promises and escrow unused**: one promise offered, none taken, no escrow, no `give`. | open: proposal: shipments that arrive in a later round, so a trader can only sell on credit |
| P144 | **Spoilage barely bites**: 4 units lost in 10 spoil rounds (a quarter rounded down spares stocks of 3 or less). | open: proposal: one unit of any stock of 2 or more, or announce two rounds ahead |
| P145 | **Haiku traders are honest**: no false claim in 8 messages and 48 notes. | open: proposal: a mixed market (one trader on another model), or a contract that pays for misleading a named rival |
| P89 | (existing) The run reporter is city-shaped: the draft counts levels, submissions and DMs, and its log check does not know the core events. | open (as before); this README is the reviewed report |

## Optimizations

- Cheaper than planned: 142 requests for 12 rounds; 26 turns were skipped (nothing new for the trader). Longer
  games (8 rounds) and three-game matches fit easily in the budget.
- After P141 and P142, run `salt-market` against `salt-market-nobrain` on the same seeds, at least five each.

## Notes

- The reporter draft is `run/REPORT.md` (DeepSeek via OpenRouter); its city metrics and log issues are P89.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).
