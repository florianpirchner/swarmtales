# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-solo` |
| Seed | 31 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 17 (referee) |
| Counted | events #5 to #2473 (2194 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 17 minutes (to the end); A02 on level 1 from minute 0 for 17 minutes (to the end); A03 on level 1 from minute 0 for 17 minutes (to the end); A04 on level 1 from minute 0 for 17 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.201 USD for this run (competitors 0.201, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0110 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 2 requests); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 18 of 18 minutes without a submission; longest without one: minutes 0-17 (18) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 8, BRAIN_TOO_LONG 3, NO_SIGNALS 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A03 scores the first light of the run from a rank signal** A01 spent its opening signal on A03's slot 2 as a rank 1 (#151), and A03 played it for Rose 1 at minute 1 (#167, #194). This is the only evidence that signals could steer play at all in the opening. (#151, #167, #194)
- **Two strikes by minute 3 make the crew play scared** A04 misfired on Amber 6 at minute 2 (#301) and on Moss 5 at minute 3 (#464), putting the crew at two of three strikes early. From then on A01, A02 and A03 repeatedly refused to play unknown cards and passed or discarded instead (e.g. #478, #493, #674). (#301, #464, #478, #493, #674)
- **Discarding unknown cards repeatedly throws away needed cards** Residents discarded blind cards that turned out to be live ranks: A02 lost Amber 2 (#213), Amber 4 (#433) and Amber 4 again (#2077); A03 lost Cobalt 1 (#1437) and Cobalt 4 while believing it unknown (#2126); A04 lost Rose 4 (#255). These losses are the main reason towers stalled behind missing low ranks. (#213, #255, #433, #1437, #2077, #2126)
- **Cobalt tower is blocked by a discarded 1 while the crew asks for 2s** A03 discarded the only Cobalt 1 at minute 9 (#1437) and later still signalled A02 that slot 1 was a 3, expecting a Moss 3 (#2215). A03 itself later reasoned it held Cobalt 2 or Cobalt 6 and could not risk a coin flip (#2215), so Cobalt stalled until the end. (#1437, #2194, #2215)
- **Endgame arrives with live cards still in hand at minute 17** In the last minutes A01 played Violet 6 (#2238) and A02's Moss 3 lit (#2253), while A04 still held Cobalt 5, Rose 3 and Rose 6 (#2323, #2365) and A03 played Rose 4 only at minute 16 (#2450). The referee ended the run at minute 17 (#2473) with those cards unplayed. (#2238, #2253, #2323, #2365, #2450, #2473)
- **Residents rebuilt the shared brain twice between games** The brain was revised after game 1 as version 2 (#947, #956) and after game 2 as version 3 (#1717, #1729), with writeBrain refused as BRAIN_TOO_LONG before the successful writes (#895, #1686, #1714). The notes explicitly blame blind discards for the losses (#1729). (#895, #947, #956, #1686, #1714, #1717, #1729)

## Problems

1. **Run is cut off at minute 17 with no game finishing** The referee ended the run at minute 17 (#2473) while residents were still holding playable cards (#2323, #2365). No level was solved and the standings are unknown, so the report has no win or loss to judge the story against. (#2323, #2365, #2473)
2. **NOT_YOUR_TURN refusals reveal turn-order confusion** Eight NOT_YOUR_TURN refusals hit residents who thought it was their turn or acted from a stale view, e.g. A04's signal (#589), A02's play (#716), A04's discard (#1464), A04's play (#1596), A01's signal (#2337). These waste turns in a fast-moving game. (#589, #716, #1464, #1596, #2337)
3. **Discard is used as a blind default and destroys live cards** With no signal to a known playable card, residents discard random cards to regain signals: A02 lost Amber 2 (#213) and A04 lost Rose 4 (#255), and A03 kept discarding while unsure which slot held which card (#2126). The mechanic pushes toward exactly the losses the brain later warns against (#1729). (#213, #255, #1729, #2126)
4. **Signals are spent on suit hints that do not identify playable cards** Many signals named a suit touching several slots, e.g. A02's Amber on slots 2-4 (#394) and A01's Violet touching two cards (#1104), which did not settle rank or playability. A03 even misread its own Moss signal as safe (#464, #497). (#394, #464, #497, #1104)
5. **writeBrain rejects short-limit drafts mid-run** BRAIN_TOO_LONG refusals occurred three times (#895, #1686, #1714) even though the tool is only open in the retro window, so residents burn their one retro action on a rejected write before succeeding. (#895, #1686, #1714)
6. **NO_SIGNALS refusal comes after residents planned a signal** A03 spent reasoning on a Cobalt signal to A01 and was refused with NO_SIGNALS (#2084), having miscounted the pool. Signal accounting is error-prone because the counts residents see shift with each play. (#2084)

## Optimizations

- **Show each resident an explicit own-turn indicator in its state** Add a live 'your turn / next is A0x' field so residents stop acting from stale views, which produced NOT_YOUR_TURN refusals (#589, #1596, #2337). This directly targets the most frequent tool error. (#589, #1596, #2337)
- **Make discards require naming a specific slot and warn on unknown cards** Blind discards destroyed live ranks (#213, #255, #1437). A confirmation step or a rule that unknown slots cannot be discarded would stop the costly default that the residents' own brain later forbids (#1729). (#213, #255, #1437, #1729)
- **Give a length preview before writeBrain submission** BRAIN_TOO_LONG refusals (#895, #1686, #1714) cost residents their retro action. The tool should return current word count as the resident types, so the 150-word limit is visible before submission. (#895, #1686, #1714)
- **Extend the run past one game or set a clear end condition** The run ended at minute 17 with live cards in hand and no result (#2323, #2473). A per-game clock or a 'finish the current game' rule would give the report a resolution and let designers judge the story. (#2323, #2473)
- **Make suit signals show which touched slot is playable** Suit hints spanning several slots (#394, #1104) left residents guessing rank. Restricting a signal to name the playable slot, or showing the current tower next-rank next to each signalled card, would make signals actionable. (#394, #1104)

## Loophole candidates

1. **Passing without acting lets residents avoid risk and stall the crew** (residents) Residents repeatedly used a signal or a bare pass to end a turn without playing, e.g. A01's low-value Violet signal (#1046) and A02 ending turns with no action (#1888). This is a safe path that costs the crew tempo and explains the long quiet stretch. (#1046, #1888)
2. **Discarding dead cards is used to farm signals for teammates** (residents) A04 discarded a card it judged dead to refill the signal pool (#1854, #2365), and others discarded cards whose rank was already passed (#2268, #2276). This turns the discard penalty into a low-cost signal generator rather than a punishment. (#1854, #2268, #2276, #2365)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 40: event "brain_written" (seq 40) does not match its schema
- line 41: event "retro_closed" (seq 41) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 54: event "brain_written" (seq 54) does not match its schema
- line 55: event "retro_closed" (seq 55) does not match its schema
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
- line 131: event "cards_dealt" (seq 131) does not match its schema
- line 132: event "game_started" (seq 132) does not match its schema
- line 133: event "deal_revealed" (seq 133) does not match its schema
- line 144: event "signal_given" (seq 144) does not match its schema
- line 158: event "signal_given" (seq 158) does not match its schema
- line 170: event "card_played" (seq 170) does not match its schema
- line 171: event "card_drawn" (seq 171) does not match its schema
- line 178: event "signal_given" (seq 178) does not match its schema
- and 259 more
