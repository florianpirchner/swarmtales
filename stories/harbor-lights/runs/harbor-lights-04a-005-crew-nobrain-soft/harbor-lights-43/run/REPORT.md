# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 15 (referee) |
| Counted | events #2 to #2240 (1988 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 15 minutes (to the end); A02 on level 1 from minute 0 for 15 minutes (to the end); A03 on level 1 from minute 0 for 15 minutes (to the end); A04 on level 1 from minute 0 for 15 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.185 USD for this run (competitors 0.185, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0056 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 16 of 16 minutes without a submission; longest without one: minutes 0-15 (16) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 8, NOT_YOUR_TURN 3, NO_SIGNALS 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The crew built a shared signal convention before play and it mostly held.** All four residents agreed in minute 0 that a suit signal means 'play this card now' and a rank signal means 'keep these cards', and A01 saved a brain (132 words) at #74. That convention drove most lit cards through minutes 6-13, e.g. A02's 'Cobalt' suit signal told A03 to play Cobalt 1 (#164) and A04's 'Moss' call gave A02 Moss 2 (#318). (#74, #164, #318)
- **Blind plays and blind discards cost the crew strikes and useful cards.** A01 gambled slot 1 at #204 and lost Amber 5 (strike 1); A04 misfired Violet 6 (#464) for strike 3, and A02 misfired Cobalt 6 (#648) then lost Rose 1 by discarding an unknown slot (#1112). Discards of unknown slots lost playable cards like Rose 1 and later Moss 3 (#2059). (#204, #464, #648, #1112, #2059)
- **Signals were repeatedly wasted on cards that were already known or not playable.** A04 sent A03 an 'Amber' signal it called redundant (#405), and signalled '1' to A02 twice in a row (#1183), while A01's 'Amber' signal at #1700 caused A03 to misfire Amber 7. These used up the six-signal budget without producing a lit card. (#405, #1183, #1700)
- **Residents often held back from playing known-playable cards in teammates' hands.** A04's slot 4 was Violet 1, playable and un-signalled, for several turns before it was played (#527 at minute 3), and A02's slot 4 Cobalt 1 was only lit at #1170 after A03 signalled it at #1572/#1605. Several residents noted playable cards they could see but could not act on (#1056, #1288). (#527, #1170, #1288)
- **The retro-brain limit blocked A02 eight times.** A02's writeBrain calls were refused eight times with BRAIN_TOO_LONG at 151-184 words against a 150 limit (#767, #773, #796, #806, #812, #818, #824, #830). The brain was only successfully rewritten later in the minute-9 retro. (#767, #773, #796, #830)
- **Play reached minute 14 with only part of the deck lit and no level solved.** The run ended at minute 15 by referee with no level-ups and each resident still on level 1 (#2240). The digest records zero correct submissions and quiet minutes 0-15. (#2240)

## Problems

1. **Non-turn actions wasted the residents' single action and burned tool errors.** A04 tried playSlot out of turn (#1299, #2164) and A02 tried giveSignal out of turn (#1580), each returning NOT_YOUR_TURN. A04 also tried postTeam during a game phase and got TOOL_LOCKED (#227). (#227, #1299, #1580, #2164)
2. **Blind discards destroyed playable cards because residents lacked slot knowledge.** A01 discarded an unknown slot 4 that was Rose 1, a playable card (#1112), and A02 discarded slot 1 that was playable Moss 3 (#2059). The brain's own rule against blind discards was violated without any way to check the slot. (#1112, #2059)
3. **The signal budget of six was exhausted on low-value or redundant hints.** Residents sent signals that were redundant (#405, #1183) and then hit NO_SIGNALS refusals (#596), leaving playable cards in teammates' hands un-signalled (#1056). Six signals for 35 cards was the binding constraint all run. (#405, #596, #1056, #1183)
4. **The brain word limit produced eight repeated refusals instead of one clear failure.** A02 retried writeBrain at 184, 176, 177, 157, 152, 151, 151 and 151 words, each refused (#767 through #830). The harness gave no guidance until the retries stopped. (#767, #830)
5. **Residents reasoned correctly about playable cards but could not act on them, creating stalls.** A02 knew A04's slot 4 was Amber 2 and Cobalt 1 but only the signaller could confirm (#1056, #1099); A01 knew A04's slot 4 was Amber 1 but had zero signals (#1705). The turn order plus signal budget meant knowledge did not convert into plays. (#1056, #1099, #1705)

## Optimizations

- **Make out-of-turn tools fail silently or auto-defer the action.** Three NOT_YOUR_TURN refusals (#1299, #1580, #2164) cost residents their only action for that turn. The harness should queue or auto-defer the attempted play to the resident's turn instead of erroring. (#1299, #1580, #2164)
- **Show residents their own known slot contents before offering discard.** Blind discards lost Rose 1 (#1112) and Moss 3 (#2059). A per-slot 'known / unknown' summary in the brain or status line would let residents apply the brain's own no-blind-discard rule. (#1112, #2059)
- **Allow signalling in the team channel during play or raise the six-signal cap.** Residents repeatedly saw playable cards they could not point to because the board was locked during games (#227) and signals ran out (#596). Free-text channel messages would let the crew coordinate plays without spending hints. (#227, #596)
- **Give a word-limit hint when writeBrain is refused.** Eight BRAIN_TOO_LONG refusals (#767-#830) were all near-misses at 151 words. The refusal message should include the current count and a suggested trimming so the resident converges in one retry. (#767, #830)
- **Make signals cheaper or more precise so redundant hints are not spent.** Redundant Amber signals (#405, #1183) and the resulting misfire (#1700) show the suit signal is ambiguous. A per-card pin (slot-indexed signal) would prevent redundant or wrong-suit hints. (#405, #1183, #1700)
- **Surface playable cards across all hands in the status line.** Several turns passed before visible playable cards like A04's Violet 1 (#527) and Cobalt 1 (#1170) were played. A 'playable now' indicator per hand would turn known facts into action. (#527, #1170)

## Loophole candidates

1. **Residents sent 'keep' rank signals to burn the signal meter for no play.** (residents) A03 used a '5' signal purely as a keep marker (#879), and A02 spent its last signal on a rank-only marker (#434). This spends the limited six-signal budget without advancing any tower. (#434, #879)
2. **Residents treated suit signals as non-committal 'maybe play' hints.** (residents) A03 played slot 2 on A01's Amber signal and misfired Amber 7, concluding the signal only meant 'possible' (#1700); A04 likewise misfired Moss 2 on a suit signal (#1729). The convention's ambiguity let signallers send hints that cost teammates strikes. (#1700, #1729)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 46: event "team_post" (seq 46) does not match its schema
- line 54: event "team_post" (seq 54) does not match its schema
- line 61: event "team_post" (seq 61) does not match its schema
- line 68: event "brain_written" (seq 68) does not match its schema
- line 69: event "retro_closed" (seq 69) does not match its schema
- line 90: event "team_post" (seq 90) does not match its schema
- line 120: event "cards_dealt" (seq 120) does not match its schema
- line 121: event "game_started" (seq 121) does not match its schema
- line 122: event "deal_revealed" (seq 122) does not match its schema
- line 132: event "signal_given" (seq 132) does not match its schema
- line 146: event "signal_given" (seq 146) does not match its schema
- line 153: event "card_played" (seq 153) does not match its schema
- line 154: event "card_drawn" (seq 154) does not match its schema
- line 171: event "signal_given" (seq 171) does not match its schema
- line 183: event "card_played" (seq 183) does not match its schema
- line 184: event "card_drawn" (seq 184) does not match its schema
- line 192: event "card_played" (seq 192) does not match its schema
- line 193: event "card_drawn" (seq 193) does not match its schema
- line 211: event "signal_given" (seq 211) does not match its schema
- and 232 more
