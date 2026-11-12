# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-aid-g1` |
| Seed | 109 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 4 (referee) |
| Counted | events #4 to #601 (526 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.043 USD for this run (competitors 0.043, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0020 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 5 of 5 minutes without a submission; longest without one: minutes 0-4 (5) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 seeds the first safe play by signalling A03's Amber 1** A01 privately identifies the only visible 1 and signals A03, who plays slot 4 as Amber 1 (#23, #35, #44). This opens the game's cooperative signalling loop. (#23, #35, #44)
- **First misfire by A04 on a blind play** A04 plays slot 1 blind against roughly 22 candidates and hits Cobalt 5, a misfire costing the first strike (#78). A02 then shifts to deliberate discards rather than blind plays (#84). (#49, #78, #84)
- **Second strike from A02's blind play of Amber 6** After the signal pool refills, A02 plays slot 1 as Amber 6 and misfires, dropping the crew 3 points (#260). This is the only scoring penalty in the run. (#251, #260)
- **Residents use the signal pool as a free pass** With signals at full, A04 and others spend tokens to pass rather than risk misfires (#305, #354, #395, #443). Signalling becomes a low-risk alternative to playing. (#305, #354, #395, #443)
- **A03 discards the only playable card** A03 discards slot 1 as Cobalt 7, which was playable, losing it and leaving only unplayable Violet 6 (#537, #538). The run's clearest self-inflicted error. (#517, #537, #538)
- **A02 exhausts its hand and finishes** A02 plays its last card, Cobalt 6, skipping the lost Cobalt 4 and 5, bringing lit cards to 19 of 35 (#513). A02 then has nothing left to do. (#475, #500, #513)

## Problems

1. **No level ever solved and no submissions made** The run ended at minute 4 with zero correct or zero wrong submissions and no level-ups across all four residents. Referee ended the run before any tower or level completion was recorded. (#601)
2. **Almost all five minutes pass without a submission** Quiet minutes are 5 of 5, the entire run, with the longest gap spanning minutes 0-4. Every action was a play, discard or signal outside the submission channel. (#601)
3. **Residents frequently reason but pass to avoid a 3-point misfire** Multiple turns end in signal-pass rather than a play because the resident cannot identify a safe card (#305, #354, #443). A04 repeatedly notes a misfire would cost 3 points against modest odds (#281, #383). (#281, #305, #354, #383, #443)
4. **A resident acted out of turn, raising a tool error** A02 attempts a discard while it is A04's turn and the city returns NOT_YOUR_TURN (#478). The player was tracking the turn order incorrectly. (#475, #478)
5. **Blind first plays lead to early strikes and lost cards** A04 and A02 both play blind on turn one and misfire (#78, #260), costing a card each and 3 points later. Starting with four unknown cards pushed residents into gambles. (#49, #78, #260)
6. **Some towers become uncompletable after lost cards** A02 notes Cobalt 4 and 5 are both lost, so Cobalt 6 could never naturally light and its slot became dead (#475). Lost cards can strand later cards and dead slots. (#475, #500)

## Optimizations

- **Give residents partial information at the start** Start residents with some visible rank or colour hints so fewer opening turns are blind gambles and misfires. Evidence: both blind plays misfired (#78, #260). (#78, #260)
- **Add a clear submission tutorial or cue** No submissions occurred in five minutes; add an explicit prompt or reminder about the submission channel. Evidence: zero correct and zero wrong submissions by minute 4 (#601). (#601)
- **Make turn order visible to each resident** A02 attempted a discard out of turn and got NOT_YOUR_TURN (#478). Show each resident whose turn it is in their context. (#478)
- **Reduce the pass incentive from a full signal pool** Signals at six let residents pass without cost (#305, #354, #443). Cap the signal pool lower or make passing cost something so play is encouraged. (#305, #354, #443)
- **Handle dead cards in hand** A02's slot became unplayable because Cobalt 4 and 5 were lost (#475, #500). Allow replacing or discarding dead cards without penalty to keep residents active. (#475, #500)
- **Let the run proceed past minute 4 to reach a result** The referee ended the run at minute 4 with no level solved and no standings (#601). Give enough time for at least one tower or level completion. (#601)

## Loophole candidates

1. **Using the signal pool as a free pass instead of playing** (residents) Residents with full signals chose to signal rather than risk a play, treating the token as a safe no-op (#305, #354, #443). This sidesteps the risk-reward of playing cards. (#305, #354, #443)
2. **Signalling known cards to other seats to trigger safe plays** (residents) A01 and A04 repeatedly signal a card they cannot see in their own hand but can see elsewhere, letting that seat do the risky work (#23, #395, #556). This offloads risk to allies at no cost. (#23, #395, #556)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 17: event "signal_given" (seq 17) does not match its schema
- line 31: event "signal_given" (seq 31) does not match its schema
- line 38: event "card_played" (seq 38) does not match its schema
- line 39: event "card_drawn" (seq 39) does not match its schema
- line 52: event "card_played" (seq 52) does not match its schema
- line 53: event "card_drawn" (seq 53) does not match its schema
- line 66: event "card_played" (seq 66) does not match its schema
- line 67: event "card_drawn" (seq 67) does not match its schema
- line 74: event "signal_given" (seq 74) does not match its schema
- line 96: event "card_discarded" (seq 96) does not match its schema
- line 97: event "card_drawn" (seq 97) does not match its schema
- line 105: event "card_discarded" (seq 105) does not match its schema
- line 106: event "card_drawn" (seq 106) does not match its schema
- line 118: event "card_played" (seq 118) does not match its schema
- line 119: event "card_drawn" (seq 119) does not match its schema
- line 137: event "signal_given" (seq 137) does not match its schema
- line 144: event "card_discarded" (seq 144) does not match its schema
- and 55 more
