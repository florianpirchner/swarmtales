# harbor-lights-04a-005-crew-nobrain-soft

2026-11-06. The closing Harbor Lights series: eight matches of three games, Haiku via Anthropic, seeds 31,
37, 41, 43 (the same deals as the two series before). Both arms play the new default, **soft strikes
from the second misfire** (strikes never end a game; the second misfire and every later one cost 3
points, P178), and every after-game record names each discarded card and what it was still needed for
(P170):

- `harbor-lights`: the crew brain, the chat between games and the retro question on signal meaning;
- `harbor-lights-nobrain`: the same rules, nothing kept between games.

Before the switch the reference bot crew was checked on 2000 deals: 22.56 lit with hard strikes, 22.60
with soft strikes from 3, 22.49 with soft strikes from 2 (worst game 1, 14, 12). The bot rarely
misfires, so the default change leaves the baseline where it was.

Cost 1.34 USD (8 x 0.15-0.19 USD), no forfeits, no invalid match. Each `run/` holds the events, the
signed chain, the transcripts and the reporter's first draft (`REPORT.md`, model-written; the numbers
below are computed from `events.jsonl`).

## Digest highlights

- **With the strike-out noise gone, the crew brain shows a small edge.** Crew 19.2 points a game, nobrain
  17.7 (bot crew 22.9 on the same deals). The crew is ahead in 8 of the 12 paired games and in 3 of the
  4 matches; the gap comes from misfires (1.9 against 2.2 a game; 33 against 42 penalty points), not
  from lit cards (21.9 against 21.2). Four seeds are still a small sample.
- **No more collapses to 1 or 4.** All 24 games went to the end of the pile. The worst game is crew 43
  game 1: 6 misfires, 18 lit, score 3 (#183 to #682). Every other game scored 11 or more.
- **The first misfire is read as a free guess.** "A first misfire only costs a card, not a strike
  penalty", so a seat plays a long shot instead of discarding (`harbor-lights-43`, A01 transcript before
  #183). This is the rule as written: a first misfire loses the card like a discard, without the signal
  back.
- **The discard debrief is read but does not change the habit.** Every record lists "Discarded, each
  still needed and each one point lost (no card is ever dead): Cobalt 7 (Cobalt stood at 1; ...)"; still
  9 of 12 crew brains keep "discard only dead cards", and discards stay at 11.2 (crew) and 11.7 (nobrain)
  a game, against 10.5 before.
- **Rank signals dominate in the crew.** Rank share 0.70 (crew) against 0.52 (nobrain): the crews keep
  their written "rank = play now" convention, nobrain seats signal suits as often as ranks.

| Arm | Games 1 / 2 / 3 (mean score) | All games | Lit per game | Penalty points | Misfires / game | Discards / game | Rank share of signals |
|---|---|---:|---:|---:|---:|---:|---:|
| crew | 17.3 / 21.3 / 19.0 | 19.2 | 21.9 | 33 | 1.9 | 11.2 | 0.70 |
| nobrain | 15.0 / 19.5 / 18.5 | 17.7 | 21.2 | 42 | 2.2 | 11.7 | 0.52 |
| bot crew (same deals) | 23.3 / 23.0 / 22.5 | 22.9 | | | | | |

| Match | Game 1 | Game 2 | Game 3 | Bot crew | Cost |
|---|---|---|---|---|---:|
| crew 31 | 22 | 19 (22 lit) | 18 (21 lit) | 21, 22, 24 | 0.183 |
| crew 37 | 22 | 23 | 17 (20 lit) | 24, 24, 22 | 0.153 |
| crew 41 | 22 (25 lit) | 21 (24 lit) | 23 | 23, 24, 23 | 0.172 |
| crew 43 | 3 (18 lit, 6 misfires) | 22 | 18 (21 lit) | 25, 22, 21 | 0.185 |
| nobrain 31 | 11 (17 lit) | 16 (22 lit) | 12 (18 lit) | 21, 22, 24 | 0.175 |
| nobrain 37 | 15 (21 lit) | 20 (23 lit) | 23 | 24, 24, 22 | 0.150 |
| nobrain 41 | 16 (22 lit) | 19 | 20 (23 lit) | 23, 24, 23 | 0.157 |
| nobrain 43 | 18 (21 lit) | 23 | 19 (22 lit) | 25, 22, 21 | 0.163 |

## Problems

- **P250: the discard debrief does not move the "dead card" habit.** Shown after every game, yet 9 of 12
  crew brains still say "discard only dead cards" and discards did not fall (11.2 a game). Part of the
  discards may be needed anyway: a discard is the only way to win a signal back.
- **P251: the first misfire is a free guess.** Under soft strikes from 2, a long-shot play costs the same
  card a discard would, so seats gamble once per game; the crew 43 game shows the step from there to six.
- **P252: crew against nobrain is still a small sample.** 1.5 points on 4 seeds, with one game (crew 43
  game 1) worth more than the whole gap per match.
- The reporter drafts misread the score as lit cards in places; they stay drafts.

## Loopholes

None new. LH14 (a harmless signal keeps the dark round alive) is unchanged and allowed.

## Optimizations (proposals, not built; Harbor Lights is closed with this series)

1. P251: charge the first misfire too (1 point), or give a misfire's card no draw, so a long shot is
   never cheaper than a discard.
2. P250: count the discards that were truly forced (the crew needed a signal and had no sure play) in
   the debrief, so the record tells good discards from wasted ones.
3. P252: a wider series (8 seeds per arm) would show whether the crew edge holds.

## Solutions

Built for this series (PR #133): soft strikes from the second misfire as the default (`-hard-strikes`
keeps the old rule) and the discard debrief. Open: P250, P251, P252.
