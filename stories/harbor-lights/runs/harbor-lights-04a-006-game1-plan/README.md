# harbor-lights-04a-006-game1-plan

2026-11-11. One-game matches on twelve new deals (seeds 101-112), three arms on the same deals, Haiku via
Anthropic, the default rules (soft strikes from the second misfire, discard debrief). Run for the
cross-game analysis ([docs/CROSS-GAME-FINDINGS.md](../../../../docs/CROSS-GAME-FINDINGS.md)) to answer one
question: when a brain helps in game 1 (before it can have learned anything), is that a **shared
convention** or simply **a plan written before play**?

- `harbor-lights-g1`: the crew talks in the team chat before the game and one captain writes the shared
  crew brain (conventions allowed);
- `harbor-lights-solo-g1`: every seat writes its own private notes before the game, no chat, no sharing;
- `harbor-lights-nobrain-g1`: no notes, straight into the game.

With one game per match, nothing can be learned from play: the only difference between the arms is the
text written before game 1. Cost 1.84 USD for 36 games (0.050-0.054 USD a game in every arm), plus about
0.18 USD for the reporter drafts (DeepSeek via OpenRouter). No forfeits, no output-cap turns, no invalid
match. Each match folder keeps the run directory (`events.jsonl`, the signed chain, transcripts, usage)
and the reporter's first draft `REPORT.md`; all numbers below are computed from `events.jsonl`.

## Digest highlights

- **Private notes written before the game win, a shared convention does not.** Score per game: solo notes
  21.6, crew brain 20.2, nothing 18.4 (bot crew 22.9 on the same deals). Solo minus nothing, paired by
  deal: +3.2 points (standard error 0.8), ahead on 9 deals, level on 3, behind on none. Crew minus nothing:
  +1.8 (standard error 1.4, ahead on 8, behind on 3), not firm. Crew minus solo: -1.4 (4 ahead, 7 behind).
- **The whole gain is fewer misfires.** Lit cards are the same in every arm (22.3, 21.9, 21.9 of 35); the
  misfires are 14 (solo), 19 (crew) and 26 (nothing) over 12 games, and from the second one each costs 3
  points. All 48 solo notes contain a "never misfire / play only a known card" line ("Never gamble on an
  unknown slot", solo-105 A04).
- **The crew convention is a trigger that misfires.** Crew brains define "rank signal = play now" ("every
  card of that rank in your hand is playable NOW", crew-108, which then misfired 3 times and scored 14).
  A rank signal that touches two cards of which one is not playable turns the convention into a misfire.
- **Each seat writing its own rule binds more than reading the captain's rule.** In the crew arm one
  captain writes 113-140 words for four seats; in the solo arm every seat writes its own 115-160 words.
  Same cost per game (the notes take about 20 extra requests).
- **This explains the earlier crew edge.** In [harbor-lights-04a-005](../harbor-lights-04a-005-crew-nobrain-soft/)
  the crew's lead over nobrain was 2.3, 1.8 and 0.5 points in games 1, 2 and 3: it shrank as the match went
  on, which is what a plan does and not what learning does.

| Arm | Score per game | Lit per game | Misfires (12 games) | Rank share of signals | Discards | Requests | Cost |
|---|---:|---:|---:|---:|---:|---:|---:|
| `harbor-lights-solo-g1` (private notes) | **21.6** | 22.3 | **14** | 0.70 | 138 | 1378 | 0.62 USD |
| `harbor-lights-g1` (crew brain) | 20.2 | 21.9 | 19 | 0.67 | 138 | 1337 | 0.63 USD |
| `harbor-lights-nobrain-g1` | 18.4 | 21.9 | 26 | 0.59 | 131 | 1148 | 0.60 USD |
| bot crew (same deals) | 22.9 | | | | | | |

Per deal: score / lit / misfires.

| Seed | Crew | Solo | Nobrain | Bot crew |
|---:|---|---|---|---:|
| 101 | 17 / 20 / 2 | 20 / 20 / 1 | 13 / 19 / 3 | 21 |
| 102 | 21 / 21 / 1 | 19 / 22 / 2 | 13 / 22 / 4 | 25 |
| 103 | 17 / 23 / 3 | 22 / 25 / 2 | 22 / 25 / 2 | 23 |
| 104 | 25 / 25 / 1 | 21 / 21 / 1 | 20 / 23 / 2 | 23 |
| 105 | 16 / 19 / 2 | 21 / 21 / 1 | 15 / 18 / 2 | 22 |
| 106 | 22 / 22 / 1 | 22 / 22 / 1 | 22 / 22 / 1 | 22 |
| 107 | 23 / 23 / 1 | 22 / 22 / 1 | 16 / 19 / 2 | 22 |
| 108 | 14 / 20 / 3 | 22 / 22 / 1 | 22 / 25 / 2 | 23 |
| 109 | 17 / 20 / 2 | 22 / 22 / 1 | 19 / 22 / 2 | 24 |
| 110 | 24 / 24 / 1 | 26 / 26 / 0 | 23 / 23 / 1 | 23 |
| 111 | 23 / 23 / 1 | 24 / 24 / 1 | 20 / 23 / 2 | 24 |
| 112 | 23 / 23 / 1 | 18 / 21 / 2 | 16 / 22 / 3 | 23 |

## Problems

- **P330: a note written before game 1 is a plan, and that is where the brain's Harbor Lights gain comes
  from.** Solo notes +3.2 points on 12 paired deals with no game to learn from; see the highlights.
- **P331: the shared crew convention is weaker than private caution.** "Rank = play now" is the
  convention every crew writes (P177); it raises misfires against private notes (19 against 14).
- The reporter drafts again read the game as a city ("levels solved: none", P89); they stay drafts.

## Loopholes

None new. No seat used the pre-game window for anything but notes and chat.

## Solutions

- Proposed (not built): give every crew member its own pre-game note in the crew arm too (the captain's
  shared brain plus a private line each), and a misfire line in the briefing of the control arm, to tell
  "having written it" from "having been told it" (the nobrain briefing already states the misfire cost).
