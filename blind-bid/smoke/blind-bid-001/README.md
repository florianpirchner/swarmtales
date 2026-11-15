# blind-bid-001: live smoke of Blind Bid (M4-60)

| Item | Value |
|---|---|
| Game | `games/blind-bid/game.ts`, the default game (four seats, three games of six lots, purse 100, a brain per seat), seed 31, purpose `smoke` |
| Command | `swt run games/blind-bid/game.ts --provider anthropic --model haiku --budget 0.40 --ledger games/m4-ledger.jsonl` |
| Model | `anthropic/haiku`, resolved `claude-haiku-5-5`, thinking medium, output cap 4000 (the old entry set none), pricing `pi-ai@1.4.0` |
| Code commit | `7ea5ea107090937a4b84de02f64b96aa5c51daf8`, tree clean, runtime revision 4 |
| Cost | 0.0216 USD of the cap 0.40 (103 requests; 372 input, 23914 output, 272818 cache-read, 54707 cache-written tokens) |
| End | `sealed-auction.match` at tick 7, exit code 0; 1099 lines |
| Result | `sealed-auction.scores`: A01 68, A02 38, A03 6, A04 52 (games: A01 19, 17, 32; A02 0, 24, 14; A03 -12, 14, 4; A04 16, 13, 23) |
| Checks | `swt log verify`: ok; `swt replay --game`: equal, 1099 lines; `swt scan`: clean, keys of 2 providers held; `REPORT.md` written with `--game` |

## What happened

The game plays live: 18 lots, 72 bids, no missed bid, no failed request. The seats reason in the terms of the
three formats: they shade on pay-your-bid lots (`shading` 0.67 of the value, the reference's equilibrium about
0.83), bid close to the value on pay-the-runner-up lots (`truthfulness` 0.98), and talk of the winner's curse on the
shared-worth lots ("Since the highest estimate wins in a winner's-curse setting, I'm thinking about shading my bid
down", A03 #250), and still pay for it: A03 buys both shared-worth lots of game 1 above their worth (42 for 33,
#273; 37 for 34, #360) and ends the game at -12. The curse is not seen again in games 2 and 3 (`cursed` 2, both in
game 1).

The drama of game 1 is the purse: A04 spends 94 of its 100 coins on the first two lots (42 and 52, #185, #230) and
bids 6 on each of the four lots after ("with only 6 coins my maximum bid is 6", #259). A02 wins nothing in game 1
(0 points) and still has its 100 coins. Over the match 44.5 % of the purse is left unspent. A01 wins the match with
68 after taking two shared-worth lots at a profit in game 2 (#615, #703).

One brain rewrite was refused with `BRAIN_TOO_LONG` (153 words, #776) and written again in the same retro. 11 turns
end without a call: after each brain write the seats are woken with an empty input and answer with a status line,
as in liar's dice (P474; #101 to #132 before game 1, #461 to #476, #801). One of these lines misreads the table:
"Game 1 ended with me on 19 points, behind A04 (16)" (A01, #466).

Read for this review: the whole match by script (every lot, bid, resolution, game score, refusal and turn text),
game 1 line by line.

## Loopholes

None seen.

## Problems

- **P474 seen again:** 11 of 103 turns are wakes with an empty input after a brain write.
- **P446 seen again:** one rewrite refused for the word limit, rewritten in time.
- **P447 seen again** in the result line.

## Solutions

None built. A smoke reports and tunes nothing.
