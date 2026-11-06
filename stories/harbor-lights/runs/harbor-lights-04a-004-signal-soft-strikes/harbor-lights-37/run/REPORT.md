# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights` |
| Seed | 37 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 15 (referee) |
| Counted | events #2 to #2211 (1957 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 15 minutes (to the end); A02 on level 1 from minute 0 for 15 minutes (to the end); A03 on level 1 from minute 0 for 15 minutes (to the end); A04 on level 1 from minute 0 for 15 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.172 USD for this run (competitors 0.172, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0052 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 16 of 16 minutes without a submission; longest without one: minutes 0-15 (16) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 4, BRAIN_TOO_LONG 1, NO_SIGNALS 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A04 misread a suit signal as a rank and caused the first strike.** At minute 1 A04 read a negative rank note as "is a 1" and played slot 3, which was Amber 3, losing it (#201, #222, #223). The team then adopted the rank-means-play-now convention from that mistake (#51, #92). (#51, #201, #222, #223)
- **A02's misleading "Rose" signal caused A04's second strike.** A02 signalled Rose on A04's slot 3 when Rose was on 1 and needed 2, and A04 played Rose 4 as a result (#1091, #1116, #1117). A02 later admitted the suit signal should never have been read as a play cue (#1557, #1558). (#1091, #1116, #1117, #1558)
- **Blind and speculative plays by A02 and A04 used up all three strikes.** A02's blind play of slot 1 misfired on Violet 5 with one strike already used (#1795, #1796). A04's earlier 50% play of Moss 6 was described as a coin flip (#752), and the crew ended the run at two strikes with no signals left (#1859). (#752, #1795, #1796, #1859)
- **The crew spent most of the run discarding, often losing playable or needed cards.** A02 discarded Amber 4 while it was playable (#357, #358), A01 discarded playable Violet 7 (#550, #551) and Moss 6 (#1980, #1981), and A03 lost Amber 7 which was still needed (#478, #479). A01 later posted that most lost cards came from discards and misfires (#1515). (#357, #358, #550, #551, #1515, #1981)
- **The retro produced three brain versions and clear conventions but no submissions.** Retros at minutes 4-5 and 10 wrote brain v2 at 133 words and v3 at 148 words after v1 was refused at 181 words (#796, #832, #1562). Despite the agreed conventions, residents made 0 submissions all run and were stuck on level 1 from minute 0 to 15. (#796, #832, #1562)

## Problems

1. **No resident ever submitted a play or a signal answer.** All four residents stalled on level 1 for the whole 15 minutes, with 16 quiet minutes and 0 submissions (#2211). The conversations were spent entirely on reasoned play, discards and signals inside their own turns, never on level submissions. (#2211)
2. **The team over-planned before acting and kept retros running.** Minutes 0-5 went to team posts, a brain write and a retro instead of play (#51, #92, #796), and the game only reached status checks at #821, #832. Refusals like TOOL_LOCKED and OUT_OF_TURN show residents attempting actions outside their allowed phase (#226, #304, #1057). (#51, #92, #226, #304, #796, #1057)
3. **Residents repeatedly misread the signal convention they had agreed on.** A04 misread a negative rank note (#201, #222) and later read a suit signal as a play cue (#1091, #1117). A02 itself called the Rose call misleading (#1107), so the play-now rule was not reliably applied even after the brain was written. (#201, #222, #1091, #1107, #1117)
4. **The brain word limit tripped a resident mid-retro.** A02's writeBrain call was refused for being 181 words against a 150 limit (#796), costing a turn in the retro phase. Only after the trim to 133 words (#832) did the brain go through. (#796, #832)
5. **Tool errors consumed turns and confused residents.** The run logged four NOT_YOUR_TURN refusals (#304, #1057, #1741, #1851), and A04's giveSignal was refused with NO_SIGNALS after it believed one signal remained (#1225, #1245). This suggests residents could not see reliable signal counts. (#304, #1057, #1225, #1245, #1741, #1851)

## Optimizations

- **Expose a live signal and strike counter to residents.** A04 tried to signal when the crew had none (#1225) and wrote that a signal remained the next turn (#1245), and A02 debated whether "0 of 6" meant none or six (#337, #1413). A visible, unambiguous counter per resident would remove these wasted turns. (#337, #1225, #1245, #1413)
- **Show each resident's own submit/play tool and turn window clearly.** Four NOT_YOUR_TURN refusals (#304, #1057, #1741, #1851) and a TOOL_LOCKED post refusal (#226) show residents guessing at allowed actions. The harness should list the active tool set and whose turn it is on every status read. (#226, #304, #1057, #1741, #1851)
- **Give the brain tool a pre-write word check.** A02's 181-word brain was refused only after submission (#796). A pre-check or a visible word budget would keep the retro in one turn and avoid the split into v2 and v3 (#832, #1562). (#796, #832, #1562)
- **Add a short pre-game plan phase so level-1 submissions start in minute 1.** The whole run was spent on conventions and retro, with 0 submissions across 16 quiet minutes (#2211). A bounded planning phase, or a prompt nudge to submit each turn, would push the first play early. (#51, #92, #2211)
- **Tighten the signal convention wording in the brain.** The same suit-versus-rank confusion recurred after the convention was written (#201, #222, #1091, #1117). The brain should state explicitly that a suit signal never means play, with an example of the negative-rank note. (#201, #222, #1091, #1117)

## Loophole candidates

1. **Residents burned discards as a safe substitute for playing.** (residents) Residents often discarded for a signal instead of attempting a risky play, repeatedly losing playable or needed cards (#358, #479, #551, #1981). This let them avoid strikes at the cost of the card pool while still consuming turns. (#358, #479, #551, #1981)
2. **A02 passed turns with signals instead of playing its own hand.** (residents) A02 spent its last signals on harmless info calls to avoid a possible third strike (#2101, #2140). This kept A02 safe while teammates absorbed the risk of the remaining plays. (#2101, #2140)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 47: event "team_post" (seq 47) does not match its schema
- line 54: event "team_post" (seq 54) does not match its schema
- line 61: event "team_post" (seq 61) does not match its schema
- line 68: event "brain_written" (seq 68) does not match its schema
- line 69: event "retro_closed" (seq 69) does not match its schema
- line 77: event "team_post" (seq 77) does not match its schema
- line 84: event "team_post" (seq 84) does not match its schema
- line 125: event "cards_dealt" (seq 125) does not match its schema
- line 126: event "game_started" (seq 126) does not match its schema
- line 127: event "deal_revealed" (seq 127) does not match its schema
- line 137: event "signal_given" (seq 137) does not match its schema
- line 150: event "card_played" (seq 150) does not match its schema
- line 151: event "card_drawn" (seq 151) does not match its schema
- line 158: event "signal_given" (seq 158) does not match its schema
- line 165: event "card_played" (seq 165) does not match its schema
- line 166: event "card_drawn" (seq 166) does not match its schema
- line 174: event "signal_given" (seq 174) does not match its schema
- line 185: event "signal_given" (seq 185) does not match its schema
- line 192: event "signal_given" (seq 192) does not match its schema
- and 234 more
