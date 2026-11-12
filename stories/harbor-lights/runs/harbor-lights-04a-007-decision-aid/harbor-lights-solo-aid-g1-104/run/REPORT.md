# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-solo-aid-g1` |
| Seed | 104 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 6 (referee) |
| Counted | events #5 to #854 (760 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.049 USD for this run (competitors 0.049, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0024 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 7 of 7 minutes without a submission; longest without one: minutes 0-6 (7) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 2, BRAIN_TOO_LONG 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **A01 opens by signalling A02 two rank-1 slots, and A02 lights one immediately.** A01 told A02 their slots 2 and 4 were rank 1 (#155), and A02 played slot 3, Violet 1, to light it (#249) after weighing which 1 to play first (#159). This was the first successful play of the run. (#155, #159, #249)
- **A03 discards the only unseen Rose 6 and kills A02's Rose 7.** A03 discarded slot 1, Rose 6, and later recognised that this was the only copy, so A02's Rose 7 could never be lit (#373, #374). The mistake cost a tower card but the run continued. (#373, #374, #497)
- **The crew chain-plays the mid-game towers across minutes 2-4.** Between minutes 2 and 4 residents lit Rose 1 (#320), Moss 2 (#369), Violet 3 (#402), Cobalt 2 (#450), Rose 2 (#454), Amber 1 (#484), Cobalt 4 (#543), Cobalt 5 (#568) and Moss 3 (#580), driven by signals such as A04's "3" to A03 (#365) and A01's Cobalt signal to A03 (#539). (#320, #369, #402, #450, #454, #484, #543, #568, #580)
- **A04 and others repeatedly decline blind plays because misfires now cost 3 points.** A04 refused slot 2 at 50% odds, calling the expected value negative (#458, #467), and A02 refused its 25% Violet 5 guess on the same reasoning (#643). This risk calculus shaped most turns in the middle game. (#458, #467, #643)
- **Amber, Violet and Cobalt towers finish in minute 4-5.** A03 completed Amber by playing Amber 5 (#733), A03 completed Violet with Violet 7 (#839), and A01 finished its hand with Cobalt 6 (#779). A02 still held Moss 6 as the run ended (#824, #854). (#733, #779, #824, #839, #854)
- **A02 and A03 trade signals to keep the Violet tower moving.** A03 signalled A02's Violet 6 as playable (#784) and A02 lit it (#824), after A02 and A04 had signalled 5s and 4s (#603, #651, #752). The last plays depended on cooperation between A02 and A03. (#651, #752, #784, #824)

## Problems

1. **Nobody submitted a single game card or reached level 2 in the run.** The facts show 0 correct and 0 wrong submissions with all four residents stuck at level 1 for the whole run, so the competition for seats never started. The run is entirely coop play with no climb. (#854)
2. **One resident broke a write rule and the tool was then closed to everyone.** A01 was refused writeBrain for 154 words against a 150 limit (#56), and A03 and A04 then saw writeBrain gone from the tool list (#67, #85). The intended pre-game brain phase was spent on a word-limit failure. (#56, #67, #85)
3. **Two NOT_YOUR_TURN refusals show turn-order confusion.** A04's discardSlot was refused (#636) and A01's playSlot was refused (#714), both because it was another resident's turn. Residents were acting or retrying without a reliable view of whose turn it was. (#636, #714)
4. **Residents spend most thinking on risk math instead of the competition.** Turn after turn A02, A03 and A04 reason about misfire penalties and expected value (#458, #531, #705) and then signal or discard. The story's competitive premise gets no attention in the logs. (#458, #531, #705)
5. **The log is dominated by private reasoning and self-talk rather than messages to others.** The facts record 0 DMs, 0 board posts and 0 group posts, while the log is full of REASONING and SAYS TO ITSELF lines (#103, #107, #193). No resident ever addressed another in a message. (#103, #107, #193)

## Optimizations

- **Give residents an explicit, always-visible turn indicator and turn-ownership check.** Two NOT_YOUR_TURN refusals (#636, #714) suggest residents guess the turn from stale state; a persistent 'whose turn' field in every tool response would cut wasted retries. A01 even reasoned it was A03's turn mid-retry (#724). (#636, #714, #724)
- **Show the brain word count before the write call and warn near the limit.** A01's brain was refused at 154 words against 150 (#56), which then collapsed the whole pre-game brain phase (#67, #85). A pre-check in readBrain or a counted draft would avoid this. (#56, #67, #85)
- **Add a visible scoring or seat-pressure cue so the competitive goal is present each turn.** Residents never submitted and never discussed levels or seats; the only stakes they weigh are misfire penalties (#458, #643). Surfacing current levels, standings and cost of a miss in the turn prompt would reconnect play to the story. (#458, #643, #854)
- **Reward or require at least some spoken communication between residents.** Zero DMs, board posts or group posts appear (facts), yet the story is about residents competing, which needs voiced claims to be interesting. Prompts could ask for a board post when signalling a playable card (#784, #365). (#365, #784)
- **Cap or summarise private reasoning so the digest and report can focus on plays.** The log is packed with long REASONING lines (#147, #292, #705) and only a few SAYS TO ITSELF summaries (#228, #454). A digest of the summary lines would make the run far easier to read. (#147, #228, #292, #705)

## Loophole candidates

1. **Residents avoid all risk by signalling and discarding instead of ever gambling on a play.** (residents) A02, A03 and A04 repeatedly chose a safe signal or discard over a low-odds play because a miss would cost 3 points (#446, #467, #555, #729). This keeps the table safe but means the tower progress is slow and no misfire ever happens, removing the story's intended tension. (#446, #467, #555, #729)
2. **Residents gain signals by discarding cards that may still be needed, cheapening the signal economy.** (residents) A03 discarded Rose 6 to earn a signal and only afterwards realised it killed A02's Rose 7 (#373, #374), and A01 discarded Rose 4 for a signal that it later admitted it needed (#592, #593). Discarding for signals is effectively a free resource at the crew's expense. (#373, #374, #592, #593)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 42: event "brain_written" (seq 42) does not match its schema
- line 43: event "retro_closed" (seq 43) does not match its schema
- line 49: event "brain_written" (seq 49) does not match its schema
- line 50: event "retro_closed" (seq 50) does not match its schema
- line 61: event "brain_written" (seq 61) does not match its schema
- line 62: event "retro_closed" (seq 62) does not match its schema
- line 80: event "brain_written" (seq 80) does not match its schema
- line 81: event "retro_closed" (seq 81) does not match its schema
- line 137: event "cards_dealt" (seq 137) does not match its schema
- line 138: event "game_started" (seq 138) does not match its schema
- line 139: event "deal_revealed" (seq 139) does not match its schema
- line 150: event "signal_given" (seq 150) does not match its schema
- line 162: event "card_played" (seq 162) does not match its schema
- line 163: event "card_drawn" (seq 163) does not match its schema
- line 171: event "signal_given" (seq 171) does not match its schema
- line 201: event "card_played" (seq 201) does not match its schema
- and 74 more
