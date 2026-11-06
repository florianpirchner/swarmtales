# ember-tricks-04a-001-smoke

First live run of `ember-tricks` (core story, `swt run --story ember-tricks-g2-r4 --provider anthropic --model haiku`):
4 Haiku seats (A01-A04), seed 23, two games of four rounds (1 to 4 cards), notes (strategy brain, a team
of one per seat) on, context reset every round. Run on 2026-11-06, 12 virtual minutes, 6 min 40 s wall time.

**Result.** Game 1: A01 40, A04 38, A03 27, A02 18. Game 2: A02 46, A04 21, A01 18, A03 18. Match: A01 and
A02 one win each; points A02 64, A04 59, A01 58, A03 45. 32 bids, 22 hits (69 %). 82 cards played, 20
tricks, 8 trumps named, 2 vetoes, **0 forfeits, 0 rule breaks** (the engine refused the one bid out of
turn). Four notes written after game 1 (103-144 words). **Cost 0.055 USD**, 340 requests (almost all
cached input). The roadmap guessed 0.2-0.5 USD for an 8-round game; this run had 4 rounds per game.

The run used the first wiring of the brain (a `resetEveryRound` option inside the strategy brain); before the merge it
was switched to the brain's `BrainSourceApi`/`StrategyBrainApi` with `solo` and trick play's `briefEveryRound`, with
the same briefing texts and the same resets. The reporter (OpenRouter) was not run; this README is the hand-written run report.

## Digest highlights

- **Round 4 of game 1, the trump as a weapon** (`#711`, `#1019`): A01, A02 and A03 all bid 0, A04 bid 1.
  A01, the first lowest bidder, named Cinder, a suit A01 did not hold. A03 held Cinder 3, 4 and 5 and was
  forced to win three tricks (-9); A01 kept its zero (+10) and won the game by two points. A01's notes:
  "with a 0 bid, name a suit I hold none of, so I cannot be forced to win with trump." A03's notes draw
  the mirror lesson: "Before bidding 0, count trump length."
- **The first veto** (`#833`): A01 sent back A04's low Ash lead in game 1, round 4. A04 wrote it into its
  notes ("have a backup lead ready").
- **The notes are lessons, not transcripts.** All four seats wrote rules keyed to hands (count winners
  before bidding 0, shed high trumps early, watch zero bidders who lead high). A02, last in game 1 with
  0 bids everywhere, wrote "a 0 bid is not safe ... be bolder when trailing" and won game 2 with bids of
  0, 0, 1, 1.
- **Calibration in numbers:** game 1 hits 12 of 16, game 2 hits 10 of 16. Two games are no learning curve.

## Loopholes

| # | What happened | Status |
|---|---|---|
| LH12 | The lowest bidder names a trump it does not hold, so that another zero bidder holding that suit is forced to win (`#711`-`#1019`). | by design (the roadmap asked to measure it); watch whether zero bids and "void trump" naming become the dominant line in longer runs |

## Problems

| # | Problem | Solution |
|---|---|---|
| P95 | **Redundant `viewTable` calls**: 200 of 361 tool calls, although the seat on turn gets the full table as a status line. 18 refusals with `STEP_LIMIT` (8 steps a minute), mostly on `viewTable`; seats not on turn look at the table too. | open. Proposed: say in the briefing that the status line is current and complete; or make `viewTable` free of the step limit; or answer a seat not on turn with a short "waiting for X" |
| P96 | **Notes over the word limit**: 5 `BRAIN_TOO_LONG` refusals (153-198 words against 150); every seat got its notes in on the second or third try. | open. Proposed: 200 words, or say the limit again in the retro line |
| P97 | **Zero bids are almost free**: 21 of 32 bids were 0. A miss by one trick costs -1 (the square of the error) against +10 for a hit, so a weak bid risks little. | open (rules, Flo decides). Proposed: a miss costs 5 + error squared, or a hit pays only on bids above 0 in rounds of 3+ cards; check with the reference listener first |

## Optimizations

- Cut the redundant `viewTable` calls (P95): about half the requests of the run.
- Build the Monte Carlo reference listener (roadmap §2.3): bid error against the expected tricks per hand,
  so calibration has a number per bid.
- The real test is the full 8-round game over 5-10 games, with the `ember-tricks-nobrain` control arm.

## Files

`run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).
