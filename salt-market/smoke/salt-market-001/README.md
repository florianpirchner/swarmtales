# salt-market-001: live smoke of Salt Market (M4-61)

| Item | Value |
|---|---|
| Game | `games/salt-market/game.ts`, the default game (four seats, four games of six rounds, spoiling goods, a brain per seat), seed 41, purpose `smoke` |
| Command | `swt run games/salt-market/game.ts --provider anthropic --model haiku --budget 0.40 --ledger games/m4-ledger.jsonl` |
| Model | `anthropic/haiku`, resolved `claude-haiku-5-5`, thinking medium, output cap 4000 (the old entry set none), pricing `pi-ai@1.4.0` |
| Code commit | `f0de5e95` (the code of `7ea5ea10`; the commit adds only run rows and docs), tree clean, runtime revision 4 |
| Cost | 0.1831 USD of the cap 0.40 (324 requests; 1268 input, 185578 output, 4630445 cache-read, 350678 cache-written tokens) |
| End | `salt-market.match` at tick 28, exit code 0; 3317 lines |
| Result | `salt-market.scores`: A01 160, A02 158, A03 163, A04 128 |
| Checks | `swt log verify`: ok; `swt replay --game`: equal, 3317 lines; `swt scan`: clean, keys of 2 providers held; `REPORT.md` written with `--game` |

## What happened

The game plays live: 151 offers, 37 trades, 22 public or private remarks, 16 shipments, 20 spoilings, no failed
request. It plays badly. Three contracts of 16 are filled (one in games 1, 2 and 4, none in game 3), the table ends
with 609 points, the gains from trade are negative in every game (`efficiency` -0.42, -0.11, -0.63, -0.28; -0.36
over the match) and the gain over idle is 0.07. The old platform's brain arm had 0.228, 669 table points and 6.0
contracts of 16 over 8 seeds (P435); one run says nothing about a difference.

The talk is honest and short of goods: "I need 1 more cloth to hold my contract ... I have no salt or copper left to
pay" (A03, #739); "I have no salt left, so O38 can't go through as it stands. If you'd take 1 copper for 1 spice
instead, make that offer and I'll accept it" (A02, #2412). Nobody trades on credit (`credit` 0, no promise made or
broken), although the seats offer it in words ("I can offer a promise to repay in round 6", A02 #1471).

**Seats take their own offer for another's.** Four `OWN_OFFER` refusals: A04 reasons "Offer O23 gives 1 wax for 3
salt and 1 cloth, so I'll take it" about its own offer (#2190, #2193; also #1412, #2332, #2389). Further refusals:
`OFFER_CLOSED` 3 (an offer withdrawn or taken before the call), `CANNOT_COVER` 2.

**A brain was lost to the word limit.** After game 3 A03 was refused three times (159, 153, 154 words, #2543 to
#2610) and the retro closed by the timeout (#2625); in all 9 rewrites were refused. One request ended at the output
cap of 4000 tokens in its thinking, without a call (A01, #2351, `stopReason: length`). 53 of 324 turns end without a
call.

Read for this review: the whole match by script (every game score, refusal, remark, contract and retro), game 3
rounds 4 and 5 line by line.

## Loopholes

None seen. No pact, no collusion against a seat, no use of the remark channel outside trade.

## Problems

- **P478: a seat takes its own offer for another's.** Four `accept` calls on the seat's own offer (#1412, #2193,
  #2332, #2389); the offer list in the turn input names the sender, and the system answers "withdraw it instead".
  Proposed: mark the seat's own offers in the input as "(yours)". A prompt change after the baseline needs the
  owner's go. Built: nothing. Open.
- **P446 seen again, with a lost brain:** A03 kept its game-2 brain for game 4.
- **P94 seen again, once:** a turn ended at the 4000-token cap inside its thinking (#2351). The old entry set no cap
  (rule 8 of 2.2 keeps the default); one turn in 324 is no reason to change it.
- **P447 seen again** in the result line.

## Solutions

None built. A smoke reports and tunes nothing.
