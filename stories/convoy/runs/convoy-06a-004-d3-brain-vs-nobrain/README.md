# convoy-06a-004-d3-brain-vs-nobrain

Brain against no brain again, now with **three damaged stages to lose, the new default** (P273). Run on
2026-11-06 after a delegated go, as the last Convoy run of the series. There are ten live runs with 6 Haiku
seats each (`--provider anthropic --model haiku`), all with the default match: three games of eight stages,
crews 2, 2, 3, 3, 3, 3, 4, 4, two saboteurs, cooldown 3. The runs went in parallel. The arms:

- `convoy`: every seat keeps a brain. Seeds 101-105.
- `convoy-nobrain`: the same briefings, no brain and no retro. Seeds 101-105, the same role deals.

The seeds and arms are those of [convoy-06a-002](../convoy-06a-002-brain-vs-nobrain/), which used four
damaged stages. All 30 games finished. No deadline was missed, no seat called itself a saboteur, and all ten
signed logs verify. **Cost 1.77 USD** (0.94 brain, 0.83 no brain; 0.14-0.20 USD a run); the reporter drafts
about 0.13 USD more. Each `<arm>-s<seed>/` folder holds the full run directory with its `REPORT.md` draft.

## Result

| | `convoy` (brain, 15 games) | `convoy-nobrain` (15 games) |
|---|---:|---:|
| Saboteur wins | **5 (33 %)** | 3 (20 %) |
| Saboteur wins, game 1 / 2 / 3 | 3 / 2 / 0 | 0 / 2 / 1 |
| Damaged stages per game | 1.9 | 1.6 |
| Damaged stages, game 1 / 2 / 3 | **2.4** / 2.0 / 1.4 | **1.0** / 2.0 / 1.8 |
| Saboteur damage cards per chance | 35 / 58 (0.60) | 33 / 55 (0.60) |
| Stages with two damage cards (of the damaged ones) | 6 of 29 | **9 of 24** |
| Game 1: stages with two damage cards | 1 of 12 | **5 of 5** |
| Loyal accusation hits | 0.88 | 0.93 |
| Tracker hits (same seats' view) | 0.89 | 0.95 |
| Loyal right votes | 0.59 | 0.61 |
| Crews voted down | 14 | 8 |

Paired by seed: saboteur wins 2/1, 1/0, 1/1, 0/1, 1/0 (brain/no brain); damaged stages 7/5, 6/5, 5/5, 5/5,
6/4. The brain arm has at least as much damage on every seed.

For comparison, at four damaged stages ([convoy-06a-002](../convoy-06a-002-brain-vs-nobrain/)) the saboteurs
won 1 and 0 of 15, and the brain saboteurs damaged on 0.52 of their chances against 0.38.

## Digest highlights

- **Three damaged stages make Convoy a game.** The saboteurs won 8 of 30 games (27 %) against 1 of 30 at four
  damaged stages, close to the bot prediction for half-careful saboteurs (34 %). The two-of-six result of
  [convoy-06a-003](../convoy-06a-003-damage3/) holds up on five seeds.
- **The brain's effect is coordination, not boldness.** At three damaged stages both arms damage on 60 % of
  their chances, so P271's gap in boldness (0.52 against 0.38) does not repeat. The difference is where the
  cards land. Without a brain, the two saboteurs put both of their cards on the same crew: in game 1 every one
  of the five damaged stages of the no-brain arm had two damage cards, which spends two cards on one stage and
  names both saboteurs at once (convoy-nobrain-s101 game 1: stage 3, crew A04, A05, A06, two damage cards
  (#392); all four loyal seats then accused A04 and A05, #1086-#1108). With a brain, 11 of 12 damaged stages in
  game 1 had one card. The brain written before game 1 says it in advance, for example "avoid being on the
  same crew as my partner when damage shows" (convoy-s105, A02, #103).
- **The edge is gone by game 3.** The brain saboteurs won 3 of 5 first games and none of the third games; the
  no-brain saboteurs won 0, 2 and 1. In game 3 the brain arm had more double damage (4 of 7 damaged stages)
  than in games 1 and 2. Five pairs are few, so this is a hint, not a learning curve.
- **The table reads the record as well as the tracker.** Loyal accusations hit 0.88 and 0.93, the tracker
  0.89 and 0.95. Detection is not where the arms differ, as at four damaged stages.

## Loopholes

None found. I checked the reporter's candidates against `events.jsonl`:
- "The lead bypassed a failed vote by naming a crew without one" (convoy-s103, game 1, stage 6, #961, #994): A06's
  crew was voted down 4 to 2, and the next lead A01, A06's partner, named a crew that went out without a
  vote, took one damage card, and the saboteurs won. That is the rule (the second crew of a stage goes without
  a vote), and it does not pay on average: of the 22 unvoted crews in these ten runs, 6 had a saboteur as
  lead and 4 took damage, a lower damage rate (18 %) than over all stages (23 %).
- "Saboteurs vote yes to keep cover", "a saboteur holds damage for the endgame", "an audit is taken as fact",
  "leads survive on the tie rule" are the game played as meant: bluffing, the cooldown, the audit (which
  cannot lie) and the strict majority.
- "Ending the turn is the safe default", "the level goes untouched" are the reporter's city frame (P155).

## Problems

- **The brain overruns the word cap more often** (P152): 60 `BRAIN_TOO_LONG` refusals in the five brain runs
  (9-16 a run), against 26 at four damaged stages. Every seat got a brain written on a later call.
- **Accusations over the reason cap** (P270): 5 more refused `accuse` calls.
- A few `speak` calls just after the talk had closed were refused (`TOOL_LOCKED`, 6 in all). Harmless.
- The reporter is still city-shaped (P155).

## Solutions

- P273 (four damaged stages too many): **built** before this run: `damageToLose` defaults to 3 in the
  mechanic and the story; `convoy-d4` keeps the old rule.
- P271 (brain makes saboteurs bolder): not confirmed at three damaged stages; the brain's effect is the
  saboteurs' coordination in game 1 (P275).
- P152 and P270 stay open (proposals in the lessons log).

## Optimizations

- A no-brain saboteur could be told the partner's position in its role line ("your partner is on this crew
  too"), which would separate coordination from learning: if the no-brain arm then stops doubling up, the
  brain's whole game-1 edge is the plan, not memory.
- Convoy is closed with this run (decided 2026-11-06); these stay proposals.
