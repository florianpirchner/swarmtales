# Salt Market

Four solo traders (A01-A04) play a match of **negotiation games**, one after another. In each game every
trader holds a bundle of five goods: salt, cloth, copper, spice and wax. Every unit a trader holds at the end
is worth points to it: salt 1 for everyone, the other four goods 1 to 4 points, a **secret value** per trader.
Each trader also has a **secret contract**, a bundle of three goods (2 to 4 units each): holding at least that
bundle when the game ends pays **20 points** more. The deal puts the goods each trader needs mostly with the
others, so nobody fills a contract without trading.

All goods move through the **bank**:

- `offer`, to one trader or to all: what the proposer gives now, what it wants now, and optionally goods it
  delivers **later**, by the end of a named round. Later goods are either a **plain promise** (the proposer
  must deliver them with `give`; at the due round the bank tells everyone whether the promise was kept) or
  held in **escrow** for a fee of 1 salt (the bank takes them at the trade and delivers them itself).
- `accept` executes an offer only if both sides hold what it moves at that moment; `decline` (on an offer to
  all: "I pass") and `withdraw` close or answer it. An offer lasts until the end of the round after the one it
  was made in; a trader may have three open offers.
- A trade that moves more than 6 units now costs each side **1 salt of tax**.
- `give` hands goods over for nothing back; `say` sends a short message to everyone or privately to one
  trader (three per round).

Holdings are public (the bank's book is open); values and contracts stay secret until the game ends, so what
a trader says about its own may be true or not. Goods **spoil**: at the end of every round but the last, the
good announced at the round's start loses a quarter of every stock of it (rounded down). The game is an
original design (working title from [docs/ideas/game-roadmap.md](../../docs/ideas/game-roadmap.md) §2.7).

Every game starts from a fresh context. The only memory a trader carries from one game to the next is its
private **strategy brain**, a short text it writes before the first game and rewrites after each game. The
question is whether a trader learns a trading style (generous, tough, honest, deceptive) and whether it pays.
The `salt-market` mechanic scores every game against the **optimum** (the best joint score of the start
supply: an exact search over which contracts to fill, the rest of each good to its top valuer) in the event
`market_game_scored`, for the human and the reporter only: **efficiency** (the share of the possible gains
from trade realised), **allocative** efficiency of the goods left, **fairness** (Gini of the surpluses),
contracts filled, taxes, fees, spoilage and promises kept or broken per trader.

On 200 random deals the start bundles are worth about 139 points together and the optimum about 224 (3.7 of
4 contracts filled), so there is a lot to gain from trade. The deal is not balanced per seat (P141): compare a
trader's surplus over its start, not its points.

```
swt run start --story salt-market --provider scripted   # offline, no model
swt run start --story salt-market                       # Haiku via Anthropic, two games of six rounds
```

Registered arm: `salt-market` (brain on). More variants by name: `salt-market[-nobrain][-nospoil][-g<games>][-r<rounds>]`,
for example `salt-market-nobrain-g3-r8`. Further options of `saltMarketStory` in `story.ts`: `games`, `rounds`,
`brain`, `spoil`, `maxWords`, `seed`; the numbers of the game are options of the `salt-market` mechanic (`salt`,
`slack`, `contractBonus`, `taxFree`, `tax`, `escrowFee`, `maxOpenOffers`, `maxSays`, `roundMinutes`). Mechanics:
`salt-market`, `strategy-brain` (solo seats). Runs and results: [runs/README.md](runs/README.md).
