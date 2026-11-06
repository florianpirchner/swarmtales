# liars-dice-04a-001-smoke

First live run of `liars-dice` (core story, `swt run --story liars-dice --provider anthropic --model haiku`):
4 Haiku seats, seed 53, the default match (three games, four dice per seat, ones wild, places 3/2/1/0), table
talk on, strategy brain on (150 words). Run on 2026-11-06. A short smoke test; extensive runs come later.

**Result.** The match finished in 24 virtual minutes (192 allowed) and about 19 minutes of wall time: 42 rounds,
192 scored decisions (150 bids, 42 liar calls), **none missed**, no illegal bid accepted; 12 brain versions. The
signed log verifies (`swt log verify`, genesis commit `104e333a`, the mechanic's first commit). Final points:
**A04 7, A02 5, A01 3, A03 3**. **Cost 0.197 USD**, 476 requests. The reporter draft cost 0.0061 USD more
(OpenRouter).

| Game | Places (1st to 4th) | Rounds | Bluffs (bids under 0.5 from own dice) | Calls won by the caller |
|---|---|---:|---:|---|
| 1 | A04, A01, A03, A02 | 13 | 0 of 41 | 4 of 13 |
| 2 | A04, A02, A01, A03 | 14 | 3 of 50 | 3 of 14 |
| 3 | A02, A03, A04, A01 | 15 | 3 of 59 | 5 of 15 |

Over the match the seats agreed with the own-dice probability baseline in 0.95 of their decisions (149 of 150
bids, 34 of 42 calls). The baseline reads nothing into the other seats' bids, so this says "Haiku does the
binomial", not "Haiku plays well" (P282).

## Digest highlights

- **Haiku does the arithmetic out loud.** Nearly every reason computes the binomial: "Five sixes-or-ones needs 5 of
  the 11 unseen dice; Binomial(11, 1/3) gives about 29%" (A01, first call of the run), "4x6 holds about 74% (I have
  two 6s, need two more 6-or-1 among 7 unseen)" (A04, game 3). All four first brains are the same probability
  recipe, and the later ones add thresholds ("call liar if P(true) < 45%", A03 v3).
- **Table talk is a confession.** 148 of 150 bids carry a remark, and they tell the truth: "Six fives, I've got a
  pair in hand", "Five fours, I have a pair". Ten remarks claim the seat's own dice; none of them is false. The
  others use it: A04 did not call 5 x 4 "since A03 claimed a pair" (game 1, round 2). P280.
- **No deliberate bluff in 150 bids.** The six bids under 0.5 are all forced: the seat judged a call even worse and
  took "the lesser risk" (A02 game 2, A04 and A03 game 3). Nobody bids a face it does not hold to steer the table.
  The passive, honest floor of Hold'em (P135) again, now in a game where a bid *is* a claim. P281.
- **Callers lose.** 30 of 42 liar calls lost the caller a die; from its own dice the caller saw the bid as false
  with 0.66 on average, but only 29 percent were false. An honest table makes each bid evidence, and the seats
  (and the baseline) read it only as a number. P282.
- **The brains learn opponents, half right.** "A04 bids high on 5s and 6s and claims 'I have all three'; its
  claims were often true, so discount calling them" (A01 v3) is a true and useful lesson; A04 won two of three
  games. A01 also writes "Ignore table talk", the opposite lesson from the same evidence.

## Loopholes

None seen. All 42 reveals match the secret rolls, every bid beat the standing one and fit on the table, no seat
acted out of turn successfully (34 tries were refused by the lock), and no die leaked: rolls and reasons are in
human-only events (`dice_rolled`, `dice_decision_scored`), and the record a seat reads holds only revealed dice.
The remark channel was used for honest claims, not for collusion. The reporter's two candidates ("ending the turn
with text", "near-certain bids from own dice") are the normal protocol and normal play.

## Problems

| # | Problem | Solution |
|---|---|---|
| P280 | **Table talk is honest self-disclosure.** Remarks announce the seat's own dice ("I've got a pair"), all true; the table trusts them. | open: the `-quiet` arm as a control; proposed: briefing says plainly that a remark may mislead and that the others know it |
| P281 | **No deliberate bluff.** 6 of 150 bids are under 0.5 from the bidder's own dice, all forced "lesser risk" raises. | open: compare `-quiet` and `-nobrain`; proposed: a heads-up arm with five dice, where a bluff has room; a mixed table (one stronger model) |
| P282 | **The own-dice baseline overrates calls.** Callers saw 0.66 false on average, 29 percent were false; 30 of 42 calls lost. Agreement 0.95 with a baseline that ignores the bids says little. | proposed: an opponent-aware baseline that treats a bid as evidence (a Bayesian posterior over the bidder's dice, given an honest or a bluffing bidder); not built |
| P283 | **Out-of-turn tries.** 34 TOOL_LOCKED on `bid` and `liar` (476 requests for 192 decisions), as in P131, although the reply already says "end your turn now". | built after the run: the Hold'em P131 line ("Not your turn: X is to act. End your turn") whenever a seat is woken and is not on move; to be measured in the next run |
| P284 | **Brain word cap overrun.** 6 BRAIN_TOO_LONG (157-172 words against 150), each fixed on the next try (as P96, P120). | open, as P96 |
| P89 | The run reporter is still city-shaped (levels, submissions, gamemaker, "no final standings"). | open; this README is the reviewed report |

## Optimizations

- `viewTable` was called 141 times for 192 decisions and repeats the full rules; the turn line already has
  everything. A short form after the game's first turn would cut a large part of the input.
- A decision costs about 0.001 USD and a 3-game match 0.20 USD: arms of ten matches (`-nobrain`, `-quiet`) cost
  about 2 USD each.
- Wall time is about 6 minutes a game (one model call at a time); separate runs in parallel scale it.

## Notes

- The reporter draft is `run/REPORT.md` (DeepSeek via OpenRouter); its city metrics and the "silent gamemaker"
  are P89. Its claim that A03 "miscounted ones as wild" is a seat's own self-correction in its thinking, not a
  rules error of the engine.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).
