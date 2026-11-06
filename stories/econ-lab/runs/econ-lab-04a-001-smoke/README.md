# econ-lab-04a-001-smoke

First live run of `econ-lab` (core story, `swt run --story econ-lab --provider anthropic --model haiku`): 4 Haiku
seats, seed 23, the default match (split offer, shared fund, A-or-B choice, 6 rounds each), strategy brain on,
unknown horizon, no chat. Run on 2026-11-06. A short smoke test on Flo's go; extensive runs come later.

**Result.** The match finished in 9 virtual minutes (60 allowed), 18 rounds, 72 sealed decisions, none missed
and no tool refused; 12 brain versions (101-150 words, under the 150-word limit). The signed log verifies
(`swt log verify`). Final points A04 118.8, A02 117.8, A03 115.8, A01 113.8.
**Cost 0.019 USD**, 124 requests (the roadmap guessed 0.02-0.05 USD per round block; one whole match of
three games is below that). The reporter draft cost 0.0016 USD more (OpenRouter).

| Game | Cooperation (0 Nash, 1 social optimum) | Efficiency | Curve per round | Notes |
|---|---:|---:|---|---|
| 1 split offer (ultimatum) | 1.00 | 1.00 | 0.5 offer share in all 6 rounds | 24 of 24 offers were 5 of 10, all accepted; everyone ends on 30 |
| 2 shared fund (public goods) | 0.55 | 0.83 | 0.75, 0.55, 0.5, 0.5, 0.5, 0.5 | A01 and A03 open with 10, A02 and A04 with 5; from round 3 everyone gives exactly 5. The openers finish last (77.8 and 75.8 against 82.8) |
| 3 A-or-B (prisoner's dilemma) | 0.04 | 0.38 | 0.25, then 0 | only A02 chose A, once (round 1, against A03's B); then 23 of 23 choices B |

## Digest highlights

- **Fair splits without a single test.** Every brain written before game 1 already said "propose near 50/50,
  accept any positive share" (#44, #51, #58, #65), and the table did exactly that: no lowball, no rejection.
- **The fund punishes the generous and the brains learn it.** After game 2, A03 writes "the player who
  contributed most (me) finished last ... Do not open at 10. Open low (about 2-3)" (#664), A01 "free-riding pays
  individually; match the group median, not the max" (#672), A04 "contributing 0 earns about 3 more per round"
  (#688). Only A02 keeps "steady 5s beat both free-riding and early overgiving" (#680).
- **The A-or-B game is solved by name.** In round 1 three seats call B dominant ("Pairs change, so there is no
  later round to build trust over", A04 #714); A02 opens with A ("This is a prisoner's dilemma, and I will
  cooperate unless the partner shows a pattern of defecting", #721) and is exploited by A03 ("A02 chose A last
  round, so I am taking the 5 from a cooperative partner", #745). From round 2 on all choose B.
- **Transfer across games runs the wrong way.** The fairness norm of game 1 did not carry into game 3; the
  free-rider lesson of game 2 did. The sample is one match, so this is a hint, not a result.

## Loopholes

None seen. No seat tried a tool out of turn, an amount out of range or a second decision in a round; the
sealed decisions stayed sealed (`decision_made` has audience `human`). The reporter's loophole candidate
("residents treat the game as one-shot") is a design problem, not a way around the rules: see P90.

## Problems

| # | Problem | Solution |
|---|---|---|
| P89 | **The run reporter is shaped for the City of Keys.** The draft counts levels, submissions and DMs (all zero here, reported as "problems"), and lists 154 "log issues" because the core-story events (`retro_started`, `brain_written`, `round_resolved`, ...) are checked against the legacy event schema. Its digest highlights were still right. | open: a core-story report mode that reads the mechanics' own event schemas and drops the city metrics; this README is the reviewed report |
| P90 | **Rotating pairs read as a one-shot game.** With pairs changing every round (each pair meets every third round), three of four seats call B dominant in round 1 and argue there is no reputation to protect; the one cooperator is exploited and the table settles on mutual B. | proposed: a fixed-partner arm, and/or show each seat its partner's past choices against others (reputation); then compare. Not built |
| P91 | **The split offer has no learning signal.** Every offer is 5/5 and accepted, so the brain has nothing to correct (a ceiling, as P77 was for tic-tac-toe). | proposed: a responder seat that rejects low offers is not needed for a ceiling; instead vary the sum or make the proposer's outside option asymmetric, or let one seat be scripted as a lowballer. Not built |
| P92 | **Neutral framing does not hide the games.** The seats name "public goods", "prisoner's dilemma" and "bargaining" in their brains and reasons (#44, #721), so play follows textbook knowledge (prompt recall, as the roadmap warned). | proposed: changed numbers and less familiar payoff tables (for example a dilemma where B is not strictly dominant, or a threshold fund); measure against the textbook prediction. Not built |

## Notes

- Changed after this run, from the challenger review: the default games now have 6, 7 and 5 rounds (with
  6 each, a brain could learn the horizon after game 1), the order in a pair swaps every round (seat A01
  proposed in the first three rounds), a missed offer counts as nothing offered in the reference score.

- The reporter draft is `run/REPORT.md` (DeepSeek via OpenRouter); its city metrics and log issues are P89.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).
