# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry-nobrain` |
| Seed | 61 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #3 to #1019 (829 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.023 USD for this run (competitors 0.023, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0015 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 10 of 10 minutes without a submission; longest without one: minutes 0-9 (10) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | none |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **All four residents spent the run drafting a quarry-like card game and never submitted.** A01 to A04 each reasoned repeatedly about squared scoring, lodestone wild cards and majority bonuses across all ten minutes, but the computed facts record zero correct and zero wrong submissions and no level-ups. The whole run was private deliberation with no visible output. (#11, #31, #349, #692)
- **A03 built a jade concentration strategy while A04 built amber and A01 built basalt.** A03 counted from six jade plus lodestone (#224, #261) toward jade nine at 100 points (#303). A04 repeatedly took amber expecting five ambers at 25 points plus majority (#204, #274), while A01 leaned on basalt plus lodestone (#246, #617). Each resident committed to a different color, so their plans collided even though they never communicated. (#204, #224, #246, #261, #274, #303)
- **Residents argued repeatedly over whether a card seen before was the same card or a new one from a reshuffled pack.** A02 paused to ask whether C11 was the same C11 as earlier (#324), and A01 noted J2 and J8 had appeared in a previous pack but concluded it was a different pack (#626, #796). This uncertainty about pack identity shows residents were partly tracking the deck rather than the goal. (#324, #626, #796)
- **A02 almost abandoned concentration at the end, citing a second-best-quarry bonus the rules apparently do not mention elsewhere.** A02 explicitly considered a "second-best-quarry bonus" while still choosing jade J2 (#929), suggesting the resident had a model of a bonus not grounded in the stated squared scoring. This is a divergence between resident belief and the scoring facts. (#929, #951)
- **Lodestone strategy dominated late-run reasoning, with residents hoarding wild cards into their largest sets.** A02 took L1 to boost its largest set (#715), A01 took L4 (#189) and L3 (#879), and A04 took L4 expecting cobalt to go from 49 to 64 (#944). Nearly every resident converged on the same lodestone play, indicating a single dominant line. (#189, #715, #879, #944)

## Problems

1. **Nobody ever submitted a move, so the run produced no game progress at all.** Facts show 0 correct and 0 wrong submissions, no levels solved, and 10 of 10 minutes quiet with the longest gap minutes 0-9. Every resident only ever emitted REASONING lines (#11 through #973) before the referee ended the run at #1019. (#11, #1019)
2. **Residents appeared confused about the board and pack mechanics rather than the scoring.** A01 tried to derive deck size and picks per player (#349), A04 puzzled over how six-card packs split across four seats (#692), and A02 repeatedly re-identified duplicate card IDs (#324, #626). These are rules-clarification thoughts, not strategy, and they consumed the run. (#324, #349, #626, #692)
3. **Reasoning lines show residents kept re-deriving the scoring rule from scratch.** A03 restated squared scoring and lodestone wild behavior at #685, A04 at #692, and A02 at #379 and #893. Repeated re-derivation suggests the rules were not given clearly or were not persisted between turns. (#379, #685, #692, #893)
4. **The gamemaker took no actions and no events were flagged, leaving the run unmoderated.** Facts record no gamemaker actions, no labels, no tool errors, and the digest found no beats. With no interventions between #3 and #1019, the run had no external steering to break the deliberation loop. (#1019)

## Optimizations

- **Force a pick or submission each minute so reasoning cannot replace play.** Because residents produced 0 submissions across minutes 0-9 (#11, #1019), add a hard per-minute action requirement or auto-pick when no submission arrives, so a run cannot end with every resident only reasoning. (#11, #1019)
- **State the rules once, in a structured form the resident reads, instead of letting it re-derive them.** Residents re-derived squared scoring and pack mechanics repeatedly (#349, #692, #685). Provide a fixed rules block with deck size, picks per player, pack rotation, wild-card rules and any bonuses so residents spend turns on strategy, not rule reconstruction. (#349, #685, #692)
- **Make card identity unambiguous or make reshuffles invisible.** A02 and A01 wasted turns deciding whether C11 or J8 were duplicates or new cards (#324, #626, #796). Give each physical card a unique instance ID per pack, or hide the internal IDs, so card tracking stops consuming reasoning. (#324, #626, #796)
- **Remove or explicitly define the "second-best-quarry bonus" a resident invoked.** A02 reasoned about a second-best-quarry bonus at #929 that does not appear in the stated scoring. If such a bonus exists, document it visibly; if not, correct the resident's rule summary so it does not invent a mechanic. (#929)
- **Add a gamemaker check-in when a minute passes with no visible action.** The gamemaker took no actions while ten minutes passed without a submission (#1019). Have the gamemaker nudge, warn or progress the run when a quiet-minute threshold is reached. (#1019)

## Loophole candidates

1. **Residents could stay in pure analysis without ever committing, and the harness allowed it.** (residents) Every resident emitted only REASONING lines for the whole run (#11, #31, #685, #944) and the run ended with no submissions, showing that endless private deliberation is a safe, cost-free path that satisfies the turn loop without advancing the game. (#11, #31, #685, #944)

## Log issues

- line 1: event "draft_game_started" (seq 1) does not match its schema
- line 2: event "draft_pick_opened" (seq 2) does not match its schema
- line 14: event "draft_card_picked" (seq 14) does not match its schema
- line 20: event "draft_card_picked" (seq 20) does not match its schema
- line 27: event "draft_card_picked" (seq 27) does not match its schema
- line 34: event "draft_card_picked" (seq 34) does not match its schema
- line 35: event "draft_pick_opened" (seq 35) does not match its schema
- line 42: event "draft_card_picked" (seq 42) does not match its schema
- line 48: event "draft_card_picked" (seq 48) does not match its schema
- line 54: event "draft_card_picked" (seq 54) does not match its schema
- line 60: event "draft_card_picked" (seq 60) does not match its schema
- line 61: event "draft_pick_opened" (seq 61) does not match its schema
- line 69: event "draft_card_picked" (seq 69) does not match its schema
- line 75: event "draft_card_picked" (seq 75) does not match its schema
- line 81: event "draft_card_picked" (seq 81) does not match its schema
- line 87: event "draft_card_picked" (seq 87) does not match its schema
- line 88: event "draft_pick_opened" (seq 88) does not match its schema
- line 95: event "draft_card_picked" (seq 95) does not match its schema
- line 101: event "draft_card_picked" (seq 101) does not match its schema
- line 107: event "draft_card_picked" (seq 107) does not match its schema
- and 170 more
