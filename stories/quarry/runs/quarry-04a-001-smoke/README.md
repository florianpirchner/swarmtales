# quarry-04a-001-smoke

First live run of `quarry` (core story, `swt run --story quarry --provider anthropic --model haiku`): 4 Haiku
seats, seed 29, the default match (3 games, each 2 pack rounds of 6 cards, 48 cards with 4 lodestones),
strategy brain on (150 words), hidden hands, no chat. Run on 2026-11-06. A short smoke test; extensive runs
come later.

**Result.** The match finished in 12 virtual minutes (84 allowed): 3 games, 144 sealed picks, none missed,
no `pick` refused; 12 brain versions (8 first attempts refused as too long, P120). The signed log verifies
(`swt log verify`). Final points A02 217, A01 212, A04 205, A03 163.
**Cost 0.036 USD**, 185 requests (the roadmap guessed 0.05-0.10 USD per game; a whole match of three games
is below that). The reporter draft cost 0.0021 USD more (OpenRouter).

| Game | Points (A01, A02, A03, A04) | Greedy table on the same deal | Efficiency (table over greedy) | Top lanes | Burns | Hate picks |
|---|---|---|---:|---|---:|---:|
| 1 | 56, 59, 67, 75 | 55, 47, 38, 64 | 1.26 | cobalt+jade (tied), cobalt+jade (tied), amber, basalt | 0 | 1 |
| 2 | 71, 91, 46, 71 | 71, 71, 62, 84 | 0.97 | basalt, cobalt, basalt, amber | 0 | 0 |
| 3 | 85, 67, 50, 59 | 127, 75, 79, 77 | 0.73 | jade, basalt, cobalt, amber | 0 | 1 |

(The lanes of game 1 are given as the fixed mechanic reports them now; the run itself named the first
resource of a tie, P124.)

## Digest highlights

- **Before any rule, the brains are generic draft wisdom.** All four first brains, written without the rules,
  say "stay flexible, commit by mid-pack, a colour that keeps coming back is open" (#47, #55, #63, #71): prompt
  recall of real draft games, as the roadmap warned, but harmless.
- **Game 1 is a jade rush.** In pack 1 all four seats take jade early (A02 "Jade has three cards in this pack,
  so J9 starts a jade lane", #139; A01 "Jade is still flowing", #161). A01 and A02 end tied at the top with
  two half lanes (56 and 59); A04, alone in basalt with 7 cards, wins with 75.
- **The brains learn the scoring, not yet the table.** After game 1 every brain says "one deep colour beats
  spread" and cites A04's 7 basalt (#481, #493, #500, #507). After game 2, A03 (last with 46, spread over four
  colours) adds the table lesson: "Count what neighbours take; avoid their main colour when contested" (#912).
- **Some signal reading.** A03 reads a neighbour: "Amber is flowing in heavily from A04 (three amber passed),
  so it looks open" (#339); A01 counts cards in circulation: "With 6 already and only 5 jade left in
  circulation, I should hold the strict majority" (#1240). In game 3 the four seats end in four different
  lanes (jade, basalt, cobalt, amber).
- **Nobody burns.** No burn in 144 picks; the reasons weigh it and decline ("burning it would cost me 2 points
  for a marginal denial", #420; "the 2 points aren't worth denying one jade", #838). See P123.
- **Learning does not show in the reference yet.** Efficiency against the greedy table falls from 1.26 to 0.73
  over the three games, but the greedy table itself swings with the deal (one greedy seat scores 38 in game 1
  and 127 in game 3), so one match says nothing (P122).

## Loopholes

None seen. No seat picked out of turn, named a card outside its pack, or picked twice; the picks and the deal
stayed sealed (`draft_card_picked` and `draft_game_started` have audience `human`). The reporter's draft names
no loophole candidate.

## Problems

| # | Problem | Solution |
|---|---|---|
| P120 | **Brains overrun the word cap.** 8 of 12 retro writes were first refused with `BRAIN_TOO_LONG` (155-168 words against 150); every seat then shortened and wrote. | open: costs one extra call per retro; proposal: name the count in the retro prompt ("write at most 150 words, about 8 lines") or raise the cap for this game to 200 |
| P121 | **The per-pick greedy reference is blunt.** 142 of 144 picks have regret 0: the seats always take a card that adds most to their own set score, so the measure cannot tell a good lane choice from a bad one. | open: proposal: a lookahead reference (the expected end score of a pick by Monte Carlo over the unseen cards and the other seats as greedy bots) |
| P122 | **The greedy table is a noisy baseline.** One greedy seat scores 38 in one game and 127 in another; efficiency against it (1.26, 0.97, 0.73) mostly measures the deal. | open: proposal: average several bot tables per deal (greedy, four lanes) and report the seat's rank among them; compare arms on the same seeds |
| P123 | **The burn is never used.** 0 burns in 144 picks; the seats call 2 points too dear for denying one card, which the square scoring confirms (a denied 5th card costs the neighbour 9 points, but only if it was the neighbour's lane). | open: proposal: bot test of a first free burn or a burn cost of 1, then a run; or drop the burn |
| P124 | **A tied top lane was named by list order.** `laneOf` named the first resource in the list for a tie (A02 in game 1, jade 5 and cobalt 5, was reported as cobalt), so `sharedLanes` was partly arbitrary. | built: tied top resources are all named (`cobalt+jade`) and count as shared; the table above uses the fixed rule |
| P89 | (existing) The run reporter is city-shaped: the draft counts levels, submissions and DMs, which Quarry does not have. | open (as before); this README is the reviewed report |

## Notes

- The reporter draft is `run/REPORT.md` (DeepSeek via OpenRouter); its city metrics are P89.
- Files: `run/events.jsonl` (+ chain and public key), `run/usage.json`, `run/agents/` (transcripts).
