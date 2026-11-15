# salt-market-001: live check of `markOwnOffers` (M4-70)

| Item | Value |
|---|---|
| Game | `games/salt-market/game.ts`, the default game (four seats, four games of six rounds, spoiling goods, a brain per seat) with the param `markOwnOffers` on, seed 41, purpose `smoke` |
| Command | `swt run games/salt-market/game.ts --set markOwnOffers=true --provider anthropic --model haiku --budget 0.40 --ledger games/m4-ledger.jsonl` |
| Model | `anthropic/haiku`, resolved `claude-haiku-5-5`, thinking medium, output cap 4000, pricing `pi-ai@1.4.0` |
| Code commit | `864ab0e8` (branch of issue M4-70), tree clean, runtime revision 4 |
| Cost | 0.1746 USD of the cap 0.40 (326 requests; 1278 input, 171663 output, 4590064 cache-read, 341922 cache-written tokens) |
| End | `salt-market.match` at tick 28, exit code 0; 3232 lines |
| Result | `salt-market.scores`: A01 147, A02 173, A03 143, A04 160 |
| Checks | `swt log verify`: ok; `swt replay --game`: equal, 3232 lines; `swt scan`: clean, keys of 2 providers held; `REPORT.md` written with `--game` |

## What happened

The variable changed is one prompt text: with `markOwnOffers` on, a seat's own open offers carry the mark "(your own
offer: others may accept it, you cannot; withdraw it if you no longer want it)" after the id in the round text and in
`viewMarket`, and "(your own)" in the short list of a later turn. 50 turn inputs carry the mark.

130 offers, 38 trades, 34 remarks, 25 withdrawals, 4 contracts of 16 (one per game), 623 table points, `efficiency`
-0.309, gain over idle 0.10, one trade with a later delivery, no promise broken. The smoke without the mark
(`salt-market/smoke/salt-market-001`, the same seed and code apart from the mark) had 151 offers, 37 trades, 3
contracts, 609 points, efficiency -0.36, gain over idle 0.07. One run each says nothing about a difference in play.

**Own-offer accepts: 1** (the smoke without the mark: 4). A03 accepts O7 in game 3, round 3 (#1924, refused
`OWN_OFFER` #1925), although its input names it "O7 (your own offer: others may accept it, you cannot ...) from A03
(you)" (#1920). The cause is a different misreading: A03 wrote the offer to A02 with the note "I'll accept once your
round-2 wax arrives" (#1830), so it takes the bank's `accept` for its own confirmation step. The mark answers who made
the offer; it does not teach a seat that only the receiver accepts.

Other refusals: `OFFER_CLOSED` 6, `BRAIN_TOO_LONG` 3, `TOO_MANY_OFFERS` 1, `CANNOT_COVER` 1. 63 of 326 turns end
without a call.

## Loopholes

None seen.

## Problems

- **P478, after the fix:** one own-offer accept in 326 turns, against four in the smoke without the mark. Its cause is
  the belief that the proposer confirms its own offer by accepting it, written in the offer's note.
- **P446 / brain word limit seen again:** three `BRAIN_TOO_LONG` refusals.

## Solutions

- Built (M4-70): the option `markOwnOffers` of `salt-market` and the param of the game family, off by default.
- Open for the owner: whether series after the baseline turn the mark on (a prompt change, one variable at a time).
  One run is no evidence that it helps play; it shows the mark is read and the own-offer accepts drop from 4 to 1.
