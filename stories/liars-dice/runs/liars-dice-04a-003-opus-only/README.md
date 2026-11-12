# liars-dice-04a-003-opus-only

A table of readers (2026-11-12, Flo's go after [BLUFFING.md](../../BLUFFING.md)): the offline simulation says a
bluff pays only against seats that read the bids, and Opus read and never lied at the Haiku table (P420).
Does Opus bluff once the others read it too? Default story `liars-dice` (four seats, three games, four dice
each, ones wild, places 3/2/1/0, table talk and brain on), all four seats Opus (`--provider anthropic --model
claude-opus-5-5`), two seeds, `--budget 5` per match, runtime r1 (commit `b6f991c`). **0 missed decisions**, no illegal bid accepted, 79
rounds, 408 scored decisions.

## Result

| Folder | Seed | A01 | A02 | A03 | A04 | Game winners | Rounds | Requests | Cost |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|
| `s71` | 71 | 3 | 3 | **8** | 4 | A03, A04, A03 | 41 | 412 | 3.28 USD |
| `s73` | 73 | 4 | 5 | 3 | **6** | A04, A01, A04 | 38 | 337 | 2.77 USD |

(Points over the match, 9 at most.)

| Measure | Opus-only table (this run) | Opus seat at the Haiku table ([002](../liars-dice-04a-002-opus-sonnet-haiku/)) |
|---|---|---|
| Bids under 0.5 from the own dice ("bluffs") | 67 of 329 (20 %) | 14 of 168 (8 %) |
| ... on a face the bidder holds none of (no wild one either) | 5 | not counted |
| ... whose reason speaks of deceiving | 0 | 0 |
| Liar calls lost by the caller | 36 of 79 (46 %) | callers against Opus: 60 of 71 (85 %) |
| Public remarks (`say`) | 1 of 329 bids, 0 of 79 calls | 71 of 189 decisions |

Cost 6.05 USD for 6 games, plus 0.016 USD for the two reporter drafts. Wall time about 15 minutes, the two
matches in parallel.

## Digest highlights

- **Opus does not bluff even when it is read.** Every one of the 67 low bids gives a read or a forced choice
  as its reason: "A02 and A04 both bid 5s, so 5 x 5 likely holds. Smallest raise; about 37% to hold" (`s71`
  A01), "Three seats are bidding 6s and I hold one 6. That signal puts the expected count near 6, so calling
  5x6 is bad" (`s73` A02). No reason mentions a bluff, a feint or a false signal. The share of low bids rises
  from 8 to 20 percent because the seats credit each other's bids, not because they lie.
- **All eight brains say "bluff rarely".** "Bluff rarely, never when low on dice" (`s71` A01 v3), "Bluff rarely;
  never at high counts" (`s71` A02 v3), "Bluff rarely, early, low only" (`s73` A03 v3). The rule is written
  before the first game (`brainAtStart`) and never tried out.
- **The table talk dies.** Opus left `say` empty in 328 of 329 bids and every call; the only remark ("Sixes
  feel right.", `s73` A01) went with an honest 5 x 6. The brains plan remarks ("short and vague, never reveal
  my dice", "sometimes misleading") and nobody writes one: with readers at the table, silence is the safest
  signal.
- **The readers punish herding, not lies.** The seats lose dice by over-crediting a face several seats chased:
  "Don't add +1 on a face others pushed past expected (lost 7x5, 5x6, 4x4 that way)" (`s73` A03 v3), "Same-face
  bids by others are weak hints (+0.3 each); don't rely on them" (`s73` A04 v3). By game 3 they discount the
  bids, which is exactly what makes a bluff less worth it.
- **Calls get better.** Callers lose 46 percent of calls here against 70 percent at the Haiku smoke table
  (P282): a reading caller wins as often as it loses.

## Problems

- **P424:** Opus does not bluff at a table of readers either; the only low bids are reads and forced raises, the
  brains forbid bluffing before the first game, and the table talk falls silent.
- **P425 (reporter):** every event in the reporter's "Log issues" is flagged "does not match its schema" (also
  in run 002); the event log itself is fine (the matches ran and scored).
- **Reporter (P103-like):** the drafts call opening with a bid the own dice already make true a "certain-bid
  squeeze" loophole, and long private reasoning a loophole. Both are normal play.

## Optimizations (proposals, not built)

- Scripted reader seats (the simulation's reader as a seat policy) against one Opus seat: cheap (no model for
  three seats), and the simulation says a bluff then earns about 0.4 points a game. Does Opus find it?
- The briefing line from BLUFFING.md: "the others treat your bids as evidence of your dice".
- More games a match (`-g6`): the brain's "bluff rarely" is written before any game and only three games
  follow; with six the seats could test it.
- Heads-up Opus against Opus with five dice (`liars-dice-hu-d5`): one reader against one reader, every bid
  answered by the same opponent.

## Loopholes

None found (the reporter's candidates are normal play).
