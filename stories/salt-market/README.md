# Salt Market

Four solo traders (A01-A04) play a match of **negotiation games**, one after another (four by default: the
deal **rotates**, so every trader plays every position once). In each game every trader holds a bundle of five
goods: salt, cloth, copper, spice and wax; about a third of its perishable goods comes as one **shipment** at the
end of round 2, 3 or 4. Every unit a trader holds at the end is worth points to it: salt 2 for everyone, the other four goods 1 to 4 points, a **secret value** per trader.
Each trader also has a **secret contract**, a bundle of three goods (2 to 4 units each): holding at least that
bundle when the game ends pays **20 points** more. The deal puts the goods each trader needs mostly with the
others, so nobody fills a contract without trading.

All goods move through the **bank**:

- `offer`, to one trader or to all: what the proposer gives now, what it wants now, and optionally goods it
  delivers **later**, by the end of a named round. Later goods are either a **plain promise** (the proposer
  must deliver them with `give`; at the due round the bank tells everyone whether the promise was kept) or
  held in **escrow** for a fee of 1 salt (the bank takes them at the trade, or reserves them from the
  proposer's shipment, and delivers them itself). Goods of a shipment still to come can be sold early only
  this way; a plain promise of them must fall due after the shipment lands.
- `accept` executes an offer only if both sides hold what it moves at that moment; `decline` (on an offer to
  all: "I pass") and `withdraw` close or answer it. An offer lasts until the end of the round after the one it
  was made in; a trader may have three open offers.
- A trade that moves more than 6 units now costs each side **1 salt of tax**.
- `give` hands goods over for nothing back; `say` sends a short message to everyone or privately to one
  trader (three per round).

Holdings and shipments are public (the bank's book is open); values and contracts stay secret until the game
ends, so what a trader says about its own may be true or not. Goods **spoil**: at the end of every round but
the last, the good announced at the round's start loses one unit of every stock of 2 or more (a quarter of a
stock of 8 or more). The game is an
original design (working title from [docs/ideas/game-roadmap.md](../../docs/ideas/game-roadmap.md) §2.7).

Every game starts from a fresh context. The only memory a trader carries from one game to the next is its
private **strategy brain**, a short text it writes before the first game and rewrites after each game. The
question is whether a trader learns a trading style (generous, tough, honest, deceptive) and whether it pays.
The `salt-market` mechanic scores every game against the **optimum** (the best joint score of the start
supply: an exact search over which contracts to fill, the rest of each good to its top valuer) in the event
`market_game_scored`, for the human and the reporter only: **efficiency** (the share of the possible gains
from trade realised), the **gain over idle** (against doing nothing with the same spoils), **allocative** efficiency of the goods left, **fairness** (Gini of the surpluses),
contracts filled, taxes, fees, spoilage and promises kept or broken per trader.

On 300 random v2 deals the goods are worth about 163 points together (before spoilage) and the optimum about
248 (3.7 of 4 contracts filled). A single deal is not balanced per seat; the rotation evens it out over four
games (P141). The smoke run used the first rules (salt 1, no shipments, a quarter of a stock spoiling, two
games without rotation); v2 is the current set. The v2 spoilage is too harsh (P149).

```
swt run start --story salt-market --provider scripted   # offline, no model
swt run start --story salt-market                       # Haiku via Anthropic, four rotated games of six rounds
```

Registered arm: `salt-market` (brain on). More variants by name: `salt-market[-nobrain][-nospoil][-g<games>][-r<rounds>]`,
for example `salt-market-nobrain-g3-r8`. Further options of `saltMarketStory` in `story.ts`: `games`, `rounds`,
`brain`, `spoil`, `maxWords`, `seed`; the numbers of the game are options of the `salt-market` mechanic (`salt`, `saltValue`, `shipShare`, `rotate`,
`slack`, `contractBonus`, `taxFree`, `tax`, `escrowFee`, `maxOpenOffers`, `maxSays`, `roundMinutes`). Mechanics:
`salt-market`, `strategy-brain` (solo seats). Runs and results: [runs/README.md](runs/README.md).
