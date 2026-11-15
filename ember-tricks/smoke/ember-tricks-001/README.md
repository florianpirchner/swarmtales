# ember-tricks-001: live smoke of Ember Tricks, one game (M4-60)

| Item | Value |
|---|---|
| Game | `games/ember-tricks/game.ts` with `--set games=1` (otherwise the default: four seats, eight rounds of 1 to 8 cards, a brain per seat, no lever), seed 23, purpose `smoke` |
| Command | `swt run games/ember-tricks/game.ts --set games=1 --provider anthropic --model haiku --budget 0.40 --ledger games/m4-ledger.jsonl` |
| Model | `anthropic/haiku`, resolved `claude-haiku-5-5`, thinking medium, output cap 4000 (the old entry set none), pricing `pi-ai@1.4.0` |
| Code commit | `7ea5ea107090937a4b84de02f64b96aa5c51daf8`, tree clean, runtime revision 4 |
| Cost | 0.0540 USD of the cap 0.40 (323 requests; 1032 input, 45181 output, 1356163 cache-read, 142092 cache-written tokens) |
| End | `trick-play.match` at tick 15 ("the match is over", #2857), exit code 0; 2858 lines |
| Result | `trick-play.totals`: A01 0, A02 -5, A03 -5, A04 25; A04 wins the game |
| Checks | `swt log verify`: ok; `swt replay --game`: equal, 2858 lines; `swt scan`: clean, keys of 2 providers held; `REPORT.md` written with `--game` |

## What happened

The game plays live: 32 bids, 8 trumps named, 145 cards played, 36 tricks, 8 rounds scored, no forfeit, no failed
request. The bids are low: in the rounds of 5 to 8 cards every seat bids 1 (or 2: A01 in round 8), the mean bid is
0.72 tricks per seat and round, 31 % of the bids are zero and 41 % hit (`trick-play.hits` 0.406). The table ends
far below what the hands allow (A01 0, A02 -5, A03 -5): round 6 costs A03 -14 for 4 tricks on a bid of 1 (#1715),
round 8 costs A02 -14 for 4 on 1 (#2841). This is the under-bidding the old lever "worth at the bid" was built for
(P430, spec 7.4); a smoke does not measure it.

One veto in the match: A02 in the last round, "this is the last round and the token has no future value" (#2367,
#2369); other seats weigh the veto and keep it (#1354, #1624, #2659). One refusal: A02 plays a second card after its
own play, `NOT_YOUR_TURN` (#1406, #1407).

**130 of 323 requests are answer turns that buy nothing.** After each play the seat is woken with no input (the
wake reason `answer`, 137 times) and calls `viewTable`, which answers "Not your turn: waiting for A03. You get the
full table in your input when it is your turn; do nothing until then." (130 times, e.g. #30, #84, #2826).

**The brain is never written in a one-game match.** Ember Tricks writes no brain before game 1 (every seat reads
"(empty: you have not written a brain yet)", #14, #39), and the retro after the last game opens (#2846 to #2852)
and is closed at once by the end of the match (#2853). With `games: 1` the `brain: true` game is the arm without a
brain; `strategy-brain.brainWrites` is absent in the report. Three seats say so in their turn texts ("The brain is
empty, so there were no notes to follow", A03 #143; #619, #1287).

Read for this review: the whole match by script (every bid, trump, trick, round score, veto, refusal and wake), and
rounds 1, 6 and 8 line by line.

## Loopholes

None seen.

## Problems

- **P475: an answer turn in Ember Tricks is a `viewTable` call that says "Not your turn".** 130 of 323 requests
  (40 %); `liars-dice-002` has 19 answer turns in 232 requests. Proposed: no answer
  turn when the result needs no next step, or a reply that the seat can end on. Built: nothing. Open; whether the
  old platform woke the same way is not checked here.
- **P476: `games: 1` leaves the brain of Ember Tricks out without saying so.** The game has no brain before game 1,
  and the retro of the last game is cut by the end of the match, so the run of the spec (`games: 1`) cannot show the
  brain live, and the retro opens four windows nobody can use (#2846 to #2852). Proposed: say in the game README
  that a one-game match has no brain, and open no retro after the last game. Built: nothing. Open.
- **P447 seen again** in the result line.

## Solutions

None built. A smoke reports and tunes nothing.
