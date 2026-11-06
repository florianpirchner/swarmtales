# holdem-04a-004-mixed-tables

The points question of the brain in Hold'em (P139), run on 2026-11-06 after the coordinator passed on
Flo's go: eight more mixed tables, seeds 51-58, with 4 Haiku seats each (`--provider anthropic --model
haiku`). On every table A01 and A03 keep a strategy brain and A02 and A04 do not. All seats play the same
duplicate cards: four games of eight hands, fixed limit 1/2 with bets of 2 and 4. The eight runs went in
parallel.

Two fixes from this PR were in the code: the brain tools are closed to the seats without a brain (P138),
and the baseline takes equity against the range each opponent's actions leave (P134).

All eight runs finished all 32 hands. No decision was missed, and every signed log verifies. **Cost 1.73
USD** for 256 hands (0.15-0.29 USD per run). The reporter drafts cost a little more (OpenRouter).

A first attempt with the same seeds was stopped halfway, after 15-19 of 32 hands per run, when the
container restarted. It cost **0.95 USD**. A run cannot be resumed, so all eight ran again from the
start. Its data was not kept. It showed the same picture: no brain tool in the no-brain seats' requests,
and 1 TOOL_LOCKED in 475 requests at seed 51. In total the series cost **2.68 USD**.

## Result

| | brain seats (A01, A03; 16) | no-brain seats (A02, A04; 16) |
|---|---:|---:|
| VPIP, game 1 | 0.75 | 0.72 |
| VPIP, game 2 / 3 / 4 | 0.53 / 0.57 / **0.52** | 0.76 / 0.72 / 0.73 |
| VPIP, all games | 0.59 | 0.73 |
| Calls / folds (all runs) | 548 / 298 | 724 / 228 |
| Bets + raises per call | 0.60 | 0.56 |
| Showdowns per seat and game | 2.7 | 3.5 |
| Agreement with the baseline | 0.68 | 0.65 |
| EV loss per decision, range baseline (new) | **0.25** | **0.29** |
| EV loss per decision, random-hand baseline (old) | 0.27 | 0.22 |
| Net points per seat and game | **+0.8** | **-0.8** |

| Run | Final points | Brain seats (A01 + A03) | Cost |
|---|---|---:|---:|
| holdem-mixed-s51 | A02 +50, A01 +36, A03 -30, A04 -56 | +6 | 0.27 USD |
| holdem-mixed-s52 | A02 +24, A01 +15, A04 -17, A03 -22 | -7 | 0.24 USD |
| holdem-mixed-s53 | A03 +33, A01 +7, A02 -15, A04 -25 | +40 | 0.15 USD |
| holdem-mixed-s54 | A03 +72, A04 +9, A01 -23, A02 -58 | +49 | 0.18 USD |
| holdem-mixed-s55 | A03 +30, A04 +16, A02 +7, A01 -53 | -23 | 0.21 USD |
| holdem-mixed-s56 | A02 +64, A01 +10, A04 -17, A03 -57 | -47 | 0.29 USD |
| holdem-mixed-s57 | A01 +39, A04 +25, A03 -15, A02 -49 | +24 | 0.17 USD |
| holdem-mixed-s58 | A02 +46, A01 +33, A03 -21, A04 -58 | +12 | 0.22 USD |

**Points.** The brain seats come out at +54 over the eight tables, which is +0.8 points per seat and game.
They are ahead in 16 of 32 games. Together with the two mixed tables of
[holdem-04a-002](../holdem-04a-002-brain-vs-nobrain/), the ten tables give **+1.8 points per seat and
game over 40 games**. The standard error is 2.4, taken over the per-game mean of the two brain seats, and
the brain seats are ahead in 22 of 40 games. So the earlier +5.6 was mostly noise. The game order shows
no learning trend either: +8.5, -8.3, +8.4 and -5.2 for games 1-4 of the new tables. Against Haiku seats
without one, the brain buys no measurable points: if there is an edge, it is below about 6 points per
seat and game.

## Digest highlights

- **The style effect repeats exactly.** The brain seats tighten after the first retro, from a VPIP of
  0.75 in game 1 to 0.52-0.57. Their neighbours without a brain stay at 0.72-0.76 on the same cards. The
  brains write it down: "Fold junk offsuit (J7o, 76o, 26o, 5-9o) even in position" (A03 v4, s54 #4113),
  and "multiway (3+ players), fold no-pair hands to any bet" (A01, s51 #4973).
- **Tighter does not mean richer.** The no-brain seats call a third more often and reach showdown more
  often. Against other Haiku seats that calling costs them little: four-handed fixed limit with small
  bets pays a calling station well enough.
- **The new baseline turns the ranking round (P134).** Against the range-narrowed baseline the brain
  seats lose less per decision than the seats without a brain (0.25 against 0.29). The old baseline
  against random hands said the opposite (0.27 against 0.22). The cleanest cases are folds the old
  baseline punished. "Underpair to an overcard king; A02 bets real hands" (s58 #5575) had 0.61 equity
  against a random hand and 0.10 against A02's range. "A01 checked the turn then bet the river, which
  suggests a made hand" (s57 #4832) had 0.51 against random and 0.06 against the range. Both now cost
  nothing.
- **The no-brain seats see no brain tool (P138).** Their requests list only `viewTable` and `act`, and no
  `BRAIN_DISABLED` refusal appears in 6,508 requests.
- **Out-of-turn tries stay low (P131).** There are 18 TOOL_LOCKED in eight runs (0-5 per run), against
  about 48 per run before the input fix.

## Loopholes

None found. The reporter's candidates are its city frame (P89: "never advanced past level 1", "never
attempted a submission") or ordinary play:
- "Ending the turn as a safe action" is right: a seat that is not to act has nothing to do.
- "Trimming the brain to just under the limit" is what the limit asks for.
- "Strategy notes in self-talk" do not carry across games, because of the context reset.

## Problems

| # | Problem | Solution |
|---|---|---|
| P139 | **No measurable points edge from the brain.** +1.8 per seat and game over 40 games, standard error 2.4. | answered with this series; the style result needs no more runs. A stronger test would be a heads-up arm, where a calling station pays more, or a no-brain opponent that plays better than Haiku |
| P134 | The random-hand baseline punished sensible folds. | fixed in this PR (`rangeEquity`); the old `equity` stays in `decision_scored` for comparison |
| P138 | The no-brain seats held the brain tools. | fixed in this PR: the brain mechanic closes them for good, and the core runner declares only open tools |
| P89 | The reporter is still city-shaped. | open |

## Optimizations

- 29 `BRAIN_TOO_LONG` refusals (one window timed out after four: A01, s53, game 2). The limit of 150 words
  is missed by a few words again and again. Allowing 180, or putting the word count in the refusal and the
  retro line, would save the retries.
- Requests per decision are 1.9 (6,508 for 3,377 decisions), against 2.1 in the smoke run.
- The eight runs in parallel took about 24 minutes of wall time. A container restart loses parallel runs
  in flight, so a long series is safer in batches of four.

## Notes

- Files: one folder per run (`holdem-mixed-s<seed>/`) with `events.jsonl` (+ chain and public key),
  `usage.json`, `agents/` (transcripts) and the reporter draft `REPORT.md`.
- The seat statistics come from `game_scored` and `decision_scored`. The old baseline's EV loss is
  recomputed from the recorded `equity` with the same formula.
