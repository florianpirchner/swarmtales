# harbor-lights-04a-004-signal-soft-strikes

2026-11-06. Eight matches of three games, Haiku via Anthropic, seeds 31, 37, 41, 43 (the same deals as
[harbor-lights-04a-003-arm-series](../harbor-lights-04a-003-arm-series/)). Two arms:

- `harbor-lights` (crew brain, chat between games), now with the retro question "agree what a signal
  means: which signal says play now, which only informs" in the briefing and in every after-game record
  (P175), and the new dark-round wording in the status (P176);
- `harbor-lights-soft-strikes`: the same, but the third strike no longer ends the game; it and every
  later misfire cost 3 points (P174).

Cost 1.36 USD (8 x 0.14-0.19 USD), no forfeits, no invalid match. Each `run/` holds the events, the
signed chain, the transcripts and the reporter's first draft (`REPORT.md`, model-written and
city-shaped; the numbers below are computed from `events.jsonl`).

## Digest highlights

- **Every crew now writes down what a signal means.** All 8 crews agreed in the pre-game retro and kept
  it for the match: "RANK signal = play the touched card now (only if it is next on its tower); SUIT
  signal = info only, keep it" (`harbor-lights-37` #68, `harbor-lights-soft-strikes-43` #1612:
  "Signals (agreed by A01, A02, A04)"). In the arm series only 1 crew of 4 did. The rank share of signals
  is 0.61 (crew; 0.65 before) and 0.73 (soft).
- **But the score did not move.** The crew arm lit 19.9 per game (series before: 20.8 on the same deals),
  with the same 2 strike-outs of 12 and 2.0 misfires a game (1.9 before). A written convention is not a
  played one: misfires still come from blind plays and from "the newest touched" against "the oldest
  touched" when a rank signal touches two cards.
- **Soft strikes remove the collapse.** In the 4 soft games that reached strike 3, the crew had lit 1,
  14, 10 and 7 cards at that moment (where the hard rule would have ended them) and finished at 20, 21,
  21 and 18 lit, scores 17, 18, 12 and 15 after the penalty: 62 points against 32. The worst soft game
  scored 12, the worst hard game 4.
- **The penalty is read and weighed.** At strike 2 a seat writes "a blind play would be a misfire worth
  3 points at strike 3. So I kept them and gave the signal instead" (`soft-strikes-37`, A02 transcript).
  Still, misfires rose from 2.0 to 2.6 a game: without the game-ending threat seats guess more, and one
  game paid 9 points for 5 misfires (`soft-strikes-37` game 3, #1842, #1882, #2107).
- **The new dark-round wording was read right.** "Discards also don't reset the no-progress counter"
  (`harbor-lights-41` transcript); no seat discarded to reset the count (P176, a text search of all
  transcripts).

| Arm | Games 1 / 2 / 3 (mean score) | All games | Lit per game | Strike-outs | Penalty games | Discards / game | Misfires / game | Rank share of signals |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| crew | 15.8 / 22.8 / 21.3 | 19.9 | 19.9 | 2 of 12 | | 10.5 | 2.0 | 0.61 |
| soft-strikes | 19.5 / 21.3 / 19.3 | 20.0 | 21.7 | 0 (rule) | 4 of 12 (18 points) | 11.0 | 2.6 | 0.73 |
| bot crew (same deals) | 23.3 / 23.0 / 22.5 | 22.9 | | | | | | |

| Match | Game 1 | Game 2 | Game 3 | Bot crew | Cost |
|---|---|---|---|---|---:|
| crew 31 | 4 (strikes) | 24 | 21 | 21, 22, 24 | 0.136 |
| crew 37 | 23 | 23 | 22 | 24, 24, 22 | 0.172 |
| crew 41 | 14 (strikes) | 23 | 21 | 23, 24, 23 | 0.172 |
| crew 43 | 22 | 21 | 21 | 25, 22, 21 | 0.179 |
| soft 31 | 17 (20 lit, 3 misfires) | 18 (21 lit, 3) | 22 | 21, 22, 24 | 0.169 |
| soft 37 | 23 | 23 | 12 (21 lit, 5) | 24, 24, 22 | 0.161 |
| soft 41 | 23 | 23 | 22 | 23, 24, 23 | 0.175 |
| soft 43 | 15 (18 lit, 3) | 21 | 21 | 25, 22, 21 | 0.191 |

## Problems

- **The "dead card" prior is still there (P170).** 20 of 24 brains still say "discard only dead cards or
  duplicates", and 4 say a lost lower rank "blocks" a card (`harbor-lights-31` #1202, `harbor-lights-41`
  #1401, `soft-strikes-41` #838, #1541), the opposite of the bridging rule. Discards stay at 10-11 a
  game, the biggest loss.
- **A written convention is not followed (P177).** Crews write "rank signal = play now" and the next game
  still has 2 misfires on average; the convention also differs from crew to crew in which touched slot
  it points to (newest, oldest, lowest).
- **Soft strikes invite guessing (P178).** Misfires 2.6 a game against 2.0; seats at strike 3 and beyond
  kept playing blind (`soft-strikes-37` game 3: strikes 3 to 5).
- The reporter drafts are city-shaped and miss the soft-strike penalty; they stay drafts.

## Loopholes

None new. LH14 (a harmless signal keeps the dark round alive) was seen again and stays allowed.

## Optimizations (proposals, not built)

1. Make soft strikes the default: the same mean score, no collapse to 4, and the arm comparison is no
   longer drowned in strike-out noise. Against the extra guessing (P178), the penalty could start at
   strike 2.
2. P170: the debrief names each discarded card and says "this card was still needed: it would have been
   playable after X", so the "dead card" habit meets a counterexample every game.
3. P177: the status marks the slot a convention points at ("your newest touched card"), or the crew
   brain gets a fixed first line "Signal meaning:" the engine shows next to every received signal.
4. The next series should compare the arms on soft strikes, crew against nobrain, now that the
   strike-out noise is gone.

## Solutions

Built in this change: the retro question and the crew briefing line (P175), the dark-round wording
(P176), the `-soft-strikes` arm (`strikePenalty` in `hint-towers`, P174). Open: P170, P177, P178.
