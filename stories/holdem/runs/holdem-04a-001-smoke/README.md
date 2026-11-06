# holdem-04a-001-smoke

First live run of `holdem` (core story, `swt run --story holdem --provider anthropic --model haiku`): 4 Haiku
seats, seed 41, the default match (four games of eight hands, fixed limit 1/2 blinds, bets 2/4, cap 4),
duplicate deals, strategy brain on (150 words), no table talk. Run on 2026-11-06. A short smoke test on Flo's
go; extensive runs come later.

**Result.** The match finished in 49 virtual minutes (206 allowed) and 49 minutes of wall time: 32 hands,
428 scored decisions, **none missed**, no illegal action accepted; 16 brain versions (107-148 words). The
signed log verifies (`swt log verify`). Final points (duplicate, so the luck of the deal is the same for
every seat): **A01 +39, A04 +1, A03 -10, A02 -30**. **Cost 0.30 USD**, 906 requests (the roadmap guessed about
0.03 USD a hand; this is 0.009). The reporter draft cost 0.0064 USD more (OpenRouter).

| Game | Points | VPIP (A01-A04) | Agreement with the baseline (A01-A04) | EV loss vs the baseline (A01-A04) |
|---|---|---|---|---|
| 1 | A04 +65, A01 +12, A03 -31, A02 -46 | 0.63, 0.75, 0.75, 0.63 | 0.73, 0.73, 0.71, 0.66 | 3.6, 20.6, 2.8, 3.2 |
| 2 | A01 +44, A02 +20, A04 -18, A03 -46 | 0.50, 0.63, 0.63, 0.75 | 0.57, 0.77, 0.72, 0.67 | 0.3, 8.6, 4.5, 2.6 |
| 3 | A01 +32, A02 +4, A03 0, A04 -36 | 0.88, 0.25, 0.63, 0.50 | 0.77, 0.71, 0.80, 0.44 | 8.7, 0.5, 6.0, 5.6 |
| 4 | A03 +67, A02 -8, A04 -10, A01 -49 | 0.63, 0.75, 0.50, 0.75 | 0.66, 0.58, 0.61, 0.82 | 26.9, 17.9, 0.2, 3.7 |

Over the match: 178 calls, 96 checks, 62 bets, 61 folds, 31 raises; 20 of 32 hands went to a showdown.
Agreement with the equity baseline (same kind: fold, check-call, bet-raise) was 0.69. The baseline is
equity against random hands over one street, so its "losses" are not mistakes by themselves (P134).

## Digest highlights

- **Haiku plays the protocol cleanly.** No decision timed out in 428, every bet size and street was right, and
  the reasons read the pot odds correctly ("Pot is 14 for a 2 call (about 7 to 1)", A04 #200). Folding 7-2 and
  K-7 offsuit early, raising A-T on the button (#147): a textbook tight-aggressive table from the first hand.
- **Every brain starts as the same textbook.** All four first brains say "Play tight-aggressive", list nearly
  the same opening hands and promise to track opponents (#44, #51, #58, #65): prompt recall, as P92 saw in the
  econ lab.
- **The brains do learn opponents.** After game 3 every brain has a line per opponent, and they mostly agree:
  "A02 and A03 call very loosely; value-bet them, never bluff" (A04 #5030), "A03 calls almost everything, rarely
  folds, rarely bluffs: value bet it, never bluff it" (A01 #5052), "A02 calls a lot" (A03 #5038). That is the
  research question of §2.5 in a first hint; whether it pays needs the `-nobrain` arm.
- **No pure bluff in 428 decisions.** Only two bets call themselves a (semi-)bluff, both with a flush draw
  (#3957, #4171); calls outnumber bets and raises almost two to one. The passive floor the roadmap expected.
- **The duplicate deal caught the same misreading twice.** With two aces on the board, the seat holding 4h 2h
  read the line "pair of aces" as its own hand and called the river ("pair of aces with queen kicker", A03
  #4410; A02 #2794 in game 2 with the same cards): P132.

## Loopholes

None seen. No seat acted out of turn successfully (52 tries were refused by the lock), no illegal bet size
went through, nothing private leaked: hole cards and reasons are in human-only events (`cards_dealt`,
`decision_scored`), and the record a seat sees has the public actions only. There is no chat, so no collusion
channel. The reporter's two loophole candidates (polling `viewTable`, "bookkeeping instead of solving") are its
city frame (P89), not ways around this story.

## Problems

| # | Problem | Solution |
|---|---|---|
| P130 | **`card-table` could not be reused.** The Ember Tricks deck mechanic reached main only while this was built (#104), and its deck model (suits with ranks 1..n, ids like `Ember 7`) does not fit the French deck (2..A, `As`). `holdem` has its own 52-card deck and evaluator. | open: when `card-table` merges, give it named ranks and a 52-card preset; then `holdem` deals through `CardTableApi` |
| P131 | **A seat that just acted gets another turn and tries to act again.** Its model ends the turn on the tool result, so the runner wakes it again (`awaitsAnswer`); it reads the next actions and calls `act` out of turn: 52 TOOL_LOCKED, 906 requests for 428 decisions. | built after the run: the `act` reply says "X is to act, not you: end your turn now"; to be measured in the next run |
| P132 | **The best-hand line hid that the board plays.** "Your best hand now: pair of aces" with both aces on the board read as the seat's own pair; it called the river twice with 4-2 (#2794, #4410). | built after the run: the line adds "all from the board (your own cards add at most a kicker)" when the category and top rank come from the board alone |
| P133 | **Seats lost track of who they are.** The record named every seat in the third person, and a seat wondered "whether that is A04, and A04 is the one who raised" (#1273, also #2804, #4126, #6445). | built after the run: the seat's own entries read "A04 (you)", and the hand line says "you are A04, on the big blind" |
| P134 | **The baseline punishes sensible folds.** The largest one-street EV losses are folds against turn and river bets (#5239 with 0.62 equity, #406, #6235): against random hands the equity is high, against a bettor's real range it is not. | proposed: equity against a range narrowed by the action (a bettor holds the top part), or report folds-to-bets apart from the rest; not built |
| P135 | **Passive and honest.** Calls almost two to one over bets and raises, no pure bluff, 20 of 32 hands to showdown. | open: measure against `holdem-nobrain` first; then a heads-up arm (`holdem-hu`), where passivity costs more |
| P89 | The run reporter is still city-shaped: levels, submissions, DMs, and 1,156 "log issues" for the mechanics' events. | open (as in econ-lab); this README is the reviewed report |

## Optimizations

- `viewTable` repeats the full rules every time (about 300 tokens); most seats call it before each action.
  A short form after the game's first turn would save a fifth of the input.
- Eight `BRAIN_TOO_LONG` refusals (151-171 words against a 150 limit); every seat fixed it on the next try.
  Either say the count in the retro line or allow 180.
- A hand takes about 1.5 minutes of wall time (one model call at a time); a 100-hand arm is about 2.5 hours.
  Two tables in parallel (separate runs) are the cheap way to scale.

## Notes

- The reporter draft is `run/REPORT.md` (DeepSeek via OpenRouter); its city metrics, "stuck on level 1",
  and log issues are P89. Its seat-confusion and board-pair items were right and became P132 and P133.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).
- The genesis entry names commit `f30a1a68+dirty`: the run started from the working tree before the mechanic's
  first commit on the branch; that tree is the first commit of this PR (the P131-P133 fixes came after).
