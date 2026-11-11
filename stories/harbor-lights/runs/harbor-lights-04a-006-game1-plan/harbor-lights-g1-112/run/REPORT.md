# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-g1` |
| Seed | 112 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 6 (referee) |
| Counted | events #2 to #820 (734 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.053 USD for this run (competitors 0.053, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0042 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 7 of 7 minutes without a submission; longest without one: minutes 0-6 (7) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 wrote the strategy brain before play but lost the post tool immediately after.** A01 drafted a 126-word brain of rank/suit conventions at #102, then found writeBrain gone from its tool list at #78 and lost team chat at #249 (TOOL_LOCKED). The crew had agreed conventions but no way to revise them mid-game. (#78, #102, #249)
- **The crew coordinated through signals alone, and the signals worked.** With messages locked, residents used giveSignal repeatedly, e.g. A03's rank-1 request to A01 at #338 lit Moss 1 at #360, and A02's rank-1 request to A03 at #699 lit Violet 1 at #717. This is the only communication path that produced plays. (#338, #360, #699, #717)
- **Two misfires happened, both on suit-only hunches.** A01 played slot 4 on an A04 Moss hint and got Moss 2 (#301, #310); later A01 discarded rather than guess at coin flips (#530, #721). Strikes deterred blind plays and drove heavy discarding instead. (#301, #310, #530, #721)
- **Discarding became the default safe move to recover signals.** A02 (#342, #381, #648), A04 (#346, #516, #713), A01 (#257, #468) and A03 (#761) all discarded to regain signals, often accepting card loss (e.g. Amber 2 at #424) rather than risk a strike. Several discards destroyed cards the crew still needed. (#342, #381, #424, #648, #713)
- **A01's three final cards were known and playable but the run ended first.** At #799 A01 reasoned that both its Moss 7 and Violet 4 were playable and planned to play them, but the referee ended the run at #820 without those plays landing. (#799, #820)

## Problems

1. **No level was solved and no submission was made in seven minutes.** The facts show 0 correct and 0 wrong submissions and 7 quiet minutes; the last play on record is A02's Violet 3 at #807 before the referee stopped play at #820. The run never converted its many plays into a level. (#807, #820)
2. **Messaging and brain-writing were locked after one write, stripping the coordination the story set up.** A01 wrote the brain once (#102) but postTeam returned TOOL_LOCKED at #249 and writeBrain vanished by #78, so the agreed conventions could not be corrected or extended mid-game. (#78, #102, #249)
3. **The strike penalty pushed residents into conservative discarding that destroyed needed cards.** Residents cited a 3-point misfire risk to avoid playing known-ish cards (#530, #721) and discarded accordingly, losing Amber 2 (#424) and Rose 6 (#761), which slowed progress. (#424, #530, #721, #761)
4. **Residents misread their own hand state at times, wasting discards.** A02 discarded Amber 2 from slot 4 at #425 realizing afterward it would have identified its own Violet 2, and later reasoned about Violet 2 in slot 1 as the only option (#633). This reflects uncertainty that signals did not resolve. (#425, #633)

## Optimizations

- **Keep team chat or brain updates available after minute 0.** Restore postTeam/writeBrain at low levels so the crew can clarify half-known cards like A02's 50/50 Violet 2 (#413). Addresses the lock at #249 and #78. (#78, #249, #413)
- **Reduce or soften the strike penalty to encourage justified plays.** Lowering the 3-point misfire cost (#530) would let residents play cards that are probably playable instead of discarding needed cards like Amber 2 (#424) and Rose 6 (#761). (#424, #530, #761)
- **Give residents at least partial knowledge of their own hand.** Residents repeatedly lacked info on their own cards (#134, #149), causing blind risks and wasted discards; a hidden-but-inferable hand or a one-time peek would make signals meaningful sooner. (#134, #149, #425)
- **Extend the time limit or start with towers lower so play completes.** The referee ended at minute 6 with playable cards still in hand (#799, #820); a longer run or fewer towers would let the crew finish level 1. (#799, #820)

## Loophole candidates

1. **Discarding to farm signals was used as a low-risk stall.** (residents) Residents repeatedly discarded solely to regain a signal without advancing towers (#342, #381, #648), converting a card-loss mechanic into a safe waiting move that slowed the run. (#342, #381, #648)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 46: event "team_post" (seq 46) does not match its schema
- line 54: event "team_post" (seq 54) does not match its schema
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
- line 69: event "team_post" (seq 69) does not match its schema
- line 81: event "team_post" (seq 81) does not match its schema
- line 125: event "cards_dealt" (seq 125) does not match its schema
- line 126: event "game_started" (seq 126) does not match its schema
- line 127: event "deal_revealed" (seq 127) does not match its schema
- line 137: event "signal_given" (seq 137) does not match its schema
- line 152: event "signal_given" (seq 152) does not match its schema
- line 165: event "signal_given" (seq 165) does not match its schema
- line 176: event "card_played" (seq 176) does not match its schema
- line 177: event "card_drawn" (seq 177) does not match its schema
- line 194: event "signal_given" (seq 194) does not match its schema
- line 207: event "card_played" (seq 207) does not match its schema
- line 208: event "card_drawn" (seq 208) does not match its schema
- line 216: event "signal_given" (seq 216) does not match its schema
- line 233: event "card_played" (seq 233) does not match its schema
- and 66 more
