# convoy-06a-002-brain-vs-nobrain

The first comparison of the strategy brain in Convoy, run on 2026-11-06 after a delegated go. There are ten
live runs with 6 Haiku seats each (`--provider anthropic --model haiku`), all with the default match: three
games of eight stages, crews 2, 2, 3, 3, 3, 3, 4, 4, two saboteurs, four damaged stages lose, and a damage
cooldown of 3. The runs went in parallel. The arms:

- `convoy`: every seat keeps a brain, written before game 1 and rewritten after each game. Seeds 101-105.
- `convoy-nobrain`: the same briefings, no brain and no retro. Seeds 101-105, so the role deals are the same
  as the brain arm's.

All ten runs finished all 30 games. No deadline was missed, no seat called itself a saboteur, and every signed
log verifies (`swt log verify`). **Cost 1.87 USD** for the ten runs (0.99 brain, 0.88 no brain; 0.17-0.22 USD
a run). The reporter drafts cost about 0.13 USD more (OpenRouter). Each `<arm>-s<seed>/` folder holds the
full run directory with its `REPORT.md` draft.

## Result

Hits and tracker hits count the saboteurs among a loyal seat's two accusations (4 loyal seats x 2 per game).
"Right votes" are loyal confidence votes that matched the crew's truth (yes on a clean crew, no on one with
a saboteur). A chance is a stage on which a saboteur sat on the crew and was allowed to damage.

| | `convoy` (brain, 15 games) | `convoy-nobrain` (15 games) |
|---|---:|---:|
| Saboteur wins | **1** | 0 |
| Damaged stages per game | **2.0** | 1.4 |
| Damaged stages, game 1 / 2 / 3 | 1.6 / 2.2 / 2.2 | 1.2 / 1.8 / 1.2 |
| Saboteur damage cards per chance | **32 / 62 (0.52)** | 25 / 66 (0.38) |
| Loyal accusation hits | 0.79 | 0.79 |
| Tracker hits (same seats' view) | 0.86 | 0.83 |
| Loyal right votes | 0.53 | 0.51 |
| Share of no votes | 0.11 | 0.09 |
| Crews voted down | 13 | 8 |
| Audits used | 15 of 15 | 14 of 15 |

Paired by seed (same role deals), damaged stages over the match:

| Seed | 101 | 102 | 103 | 104 | 105 |
|---|---:|---:|---:|---:|---:|
| `convoy` | 8 | 7 | 5 | 4 | 6 |
| `convoy-nobrain` | 5 | 5 | 4 | 4 | 3 |

The brain arm damaged at least as much as the no-brain arm on every seed, and more on four of five. Five
pairs are few, but the sign is the same everywhere (a sign test gives p = 0.06 over the four non-ties).

## Digest highlights

- **The brain makes saboteurs bolder, not loyal seats sharper.** With a brain, saboteurs play damage on 52 %
  of their chances against 38 % without one, and the convoy takes 2.0 damaged stages a game against 1.4.
  The loyal side does not read better: the accusation hits are 0.79 in both arms, the votes are right about
  half the time in both arms (0.53 and 0.51), and the tracker reading only crews, counts and audits does as
  well as or better than the players (0.86 and 0.83).
- **The effect starts before the first game.** Game 1 already has more damage with a brain (1.6 against 1.2
  damaged stages), although no seat has played yet. The brain written before game 1 is a plan, and the plans
  name the saboteur's job in numbers, for example "Saboteur: two saboteurs share 4 damage needs; play damage
  early (stages 2-5)…" (convoy-s103, A06, #1238). Without one, a saboteur plays it safe: in
  convoy-nobrain-s103 game 2 the two saboteurs had seven chances and played no damage at all.
- **The one saboteur win was a perfect use of the cooldown.** convoy-s101 game 1: A04 and A05 damaged
  stages 3 (A04), 4 (A05), 7 (A05) and 8 (A04), one card each time, so no crew ever showed two damage cards
  and each saboteur came back exactly when its cooldown allowed. At stage 8 the table saw it coming: A01 voted
  no on A04's crew (#1107), A03 and A06 reasoned with the possible saboteur pairs (#1140, #1149), A04 claimed
  safe (#1159), and the crew went out with three of six votes against (A01, A03, A06; a tie is not a majority)
  and took the fourth damage.
- **The audit works.** In convoy-s101 game 2 A05 audited A01's card from stage 3, it was damage (#1694), and
  the table kept A01 off the crews; the saboteurs got one damaged stage in eight.
- **The vote bites now.** After the P151 fix (a seat may vote during the talk) only two votes were refused,
  against 56 in the smoke run, and 21 crews were voted down, against none in the smoke run.

## Loopholes

None found. I checked the reporter's candidates against `events.jsonl`:
- "Proven saboteurs kept on crews to look reasonable" (convoy-s101) mixes two games: the audit that proved
  A01 a saboteur was in game 2 (#1694), and the yes votes were A06 in game 3, where A01 was again a saboteur
  and A06 its partner (#2763, #2925). A saboteur voting yes for its partner is the role.
- "Votes dropped to exact halves treated as passing" is the rule: only a strict majority of no ends a lead's
  term.
- "A lost cause played out" is ordinary play: a seat that computes the saboteurs can no longer reach four
  damaged stages still has to cross the stages.

## Problems

- **The brain overruns the word cap** (P152 again): 26 `BRAIN_TOO_LONG` refusals over the five brain runs (1-8 a
  run); every seat got its brain written on a later call.
- **Accusations over the reason cap**: 4 `accuse` calls failed validation because the reason was over 400
  characters (convoy-s101 A02 #3721, and in s102 and s104), and the seat had to accuse again (P270).
- **Saboteurs try to accuse**: `accuse` is not asked of saboteurs, yet a few called it and were refused
  (`TOOL_LOCKED`, 5 in the no-brain runs). Harmless.
- **The reporter is still city-shaped** (P155): levels, submissions and "0 messages" with hundreds of talk
  lines, and about 390 log issues per draft because the convoy and brain events are not in its schema.
- **Seats re-derive the rules mid-game.** The tie rule (3 of 6 no does not end a term) and the cooldown were
  argued over in the talk (convoy-s101 #1045, #1057, #824, #882). It is the table reading the rules aloud, not
  an error of the mechanic; the rules text states both.

## Solutions

- Brain against no brain: done in this run. The brain changes the saboteurs' play and not the detection (P271,
  P272). Proposal (not built): a mixed table, three seats with a brain and three without, to see whether a
  brain seat wins more points on the same deals, as in the Hold'em mixed table.
- P151 (vote decorative): the fix holds; 21 crews voted down.
- P154 (cooldown-aware tracker): **not built**. The tracker beats the players on average in both arms
  (0.86 and 0.83 against 0.79), so the reference is not too weak to compare with. The players beat it in a
  few games (convoy-s102 game 2: 7 against 2 hits), where the cooldown matters; that is too little to rebuild
  the reference.
- P270 (accuse reason too long): proposal, not built: say the limit in the accuse line, or cut the reason to
  400 characters instead of refusing it.

## Optimizations

- The game is too easy for the convoy with four damaged stages: one saboteur win in 30 games. The follow-up
  [convoy-06a-003-damage3](../convoy-06a-003-damage3/) tests three damaged stages.
- A no-brain saboteur needs a sharper role line: "a saboteur who never damages cannot win" in the role
  prompt, so the control arm does not measure timidity instead of learning.
- A shorter talk (one line a seat) would cut cost by about a third; the second line is mostly agreement.
