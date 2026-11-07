# holdem-02a-005-hu-mixed

The heads-up test of the brain, and the last Hold'em series. Run on 2026-11-07 after the coordinator passed
on Flo's go: four `holdem-hu-mixed` matches, seeds 61-64, with 2 Haiku seats (`--provider anthropic
--model haiku`). A01 keeps a strategy brain and A02 does not. A match is two games of twelve duplicate
hands, fixed limit 1/2 with bets of 2 and 4, so each seat plays both positions' cards once. The brain word
limit stays at 150.

The question was whether the brain pays where calling too much costs more than at a four-handed table
(P139).

All four matches finished all 24 hands. No decision was missed, and every signed log verifies. **Cost 0.21
USD** (0.04-0.06 USD a match). The four matches ran in parallel in about 5 minutes of wall time. The
reporter drafts cost a little more (OpenRouter).

## Result

| Match | Final points | A01 game 1 / game 2 |
|---|---|---|
| holdem-hu-mixed-s61 | A02 +8, A01 -8 | -20 / +12 |
| holdem-hu-mixed-s62 | A01 +8, A02 -8 | -9 / +17 |
| holdem-hu-mixed-s63 | A02 +1, A01 -1 | +16 / -17 |
| holdem-hu-mixed-s64 | A01 +6, A02 -6 | +51 / -45 |

| | A01 (brain) | A02 (no brain) |
|---|---:|---:|
| VPIP, game 1 / game 2 | 0.67 / 0.50 | 0.73 / 0.58 |
| PFR, game 1 / game 2 | 0.42 / 0.17 | 0.15 / 0.38 |
| Calls / folds / bets + raises | 61 / 46 / 76 | 84 / 20 / 76 |
| EV loss per decision (range baseline) | 0.24 | 0.22 |

**Points.** A01 is +5 over the four matches: +0.6 per game, standard error 10. That is no edge. The
duplicate pair works: the games swing by up to 51 points, but the match totals stay within 8, because
each seat plays the same cards from the other chair.

## Digest highlights

- **Same picture as four-handed.** The brain seat folds more than twice as often (46 against 20) and
  calls less (61 against 84), with the same number of bets and raises. The points do not move.
- **Some brains carry the four-handed textbook into heads-up.** "Avoid bluffing into multiple
  opponents", "play tight early, looser on button/cutoff" (s62 #904, s64 #980): rules for seats that do
  not exist at a two-seat table. The other two brains read the opponent instead: "A02 folds often to
  preflop raises" (s61 #1026), "A02 calls small flop bets with weak hands" (s63 #1082).
- **Clean protocol.** There were 0-1 TOOL_LOCKED per match. All eight retro windows were written, with
  one `BRAIN_TOO_LONG` refusal.

## Loopholes

None found. The reporter's candidates are its city frame (P89: "never attempted a submission",
"avoid the level-solve path").

## Problems

| # | Problem | Solution |
|---|---|---|
| P290 | **No brain edge heads-up either.** A01 is +0.6 per game (SE 10) over four matches. The brain makes it fold more, and two of four brains copy rules for a four-handed table. | closed: Hold'em is finished. The brain changes the style and not the points against Haiku without one |
| P291 | **Two games give the brain one rewrite after play.** A heads-up match is two games, so the brain learns once from real hands before the last game. | open, not planned: four or six games per match (each position's cards twice or three times), if heads-up is studied again |
| P89 | The reporter is still city-shaped. | open |

## Optimizations

- Heads-up is cheap: 0.05 USD and about 5 minutes per match. A larger heads-up sample costs little.
- The brain prompt could name the table size ("heads-up: there is no early position"), so that the first
  brain does not start from the four-handed textbook.

## Notes

- Files: one folder per match (`holdem-hu-mixed-s<seed>/`) with `events.jsonl` (+ chain and public key),
  `usage.json`, `agents/` (transcripts) and the reporter draft `REPORT.md`.
- The arm is new in this PR: `holdem-hu-mixed` (`holdemEntry({ seats: 2, brainSeats: ["A01"] })`).
