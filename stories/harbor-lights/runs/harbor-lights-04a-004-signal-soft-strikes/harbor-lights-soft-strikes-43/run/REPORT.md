# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `harbor-lights-soft-strikes` |
| Seed | 43 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 16 (referee) |
| Counted | events #2 to #2335 (2075 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 16 minutes (to the end); A02 on level 1 from minute 0 for 16 minutes (to the end); A03 on level 1 from minute 0 for 16 minutes (to the end); A04 on level 1 from minute 0 for 16 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.191 USD for this run (competitors 0.191, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0057 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 17 of 17 minutes without a submission; longest without one: minutes 0-16 (17) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | NOT_YOUR_TURN 4, BRAIN_TOO_LONG 3, POST_CAP 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **The crew lit 18 cards in game 1 despite three misfires and 14 discards.** Game 1 ended with 15 points: 18 cards lit, 3 misfires and 14 discards, as A02 records when saving brain version 2 (#870). Early misfires came from guessing: A04 played Violet 6 blind for strike 3 (#478), and A02 discarded a live Cobalt 3 (#388). (#388, #478, #870)
- **The team converged on a rank/suit signal convention and rewrote the brain each retro.** Brain v1 (113 words) was saved before game 1 (#72); after game 1, A02 wrote v2 with 138 words and added rules to discard only provably dead cards (#870); after game 2, A03 saved v3 at 147 words (#1634). The convention was a rank call = play that card now if its tower is next, suit call = information only. (#72, #870, #1634)
- **A01 admitted discarding the only Violet 1 and killing the Violet tower.** A01 discarded slot 4 as a 50/50 and it was Violet 1, the only card that could start Violet (#623). That self-reported error is the clearest instance of a resident weighing a coin-flip discard against a signal gain and losing. (#623)
- **Draw pile ran empty in both games, forcing endgame counting and skips.** A03 noted the pile was empty at minute 8 (#1305), and in game 2 A02 stated the pile was empty and the hand must be exactly the unseen cards (#2067). After Amber 5 was lost, Amber 7 became the next playable rank by skip (#435). (#435, #1305, #2067)
- **The gamemaker never acted and no resident posted to the board or sent a DM.** All communication went through team channel messages and private reasoning; the final retro post from A01 was a team-channel note (#1592) and A03 was refused for POST_CAP (#865). Zero board posts and zero DMs are recorded for the run. (#865, #1592)
- **The run produced no level-ups; residents stayed at level 1 for the whole 16 minutes.** All four residents were stuck on level 1 from minute 0 to the end, with no submissions (#2335). The referee ended the run at minute 16 with 0 correct and 0 wrong submissions. (#2335)

## Problems

1. **The run is entirely unexplained: no story was defined and nobody solved level 1.** The run has story `harbor-lights-soft-strikes` but no story JSON, no gamemaker actions, and no levels solved (#2335). Residents spent all 16 minutes on level 1 with no submission, so the designers get no signal about the intended story beats. (#2335)
2. **Three BRAIN_TOO_LONG refusals burned retro time.** A02 hit BRAIN_TOO_LONG at 157 words (#830), and A03 hit it twice at 162 and 155 words (#1588, #1598), before saving 147 words (#1634). The 150-word cap is being hit repeatedly by agents drafting close to the limit. (#830, #1588, #1598, #1634)
3. **NOT_YOUR_TURN refusals show residents acting out of turn order.** A01 tried to playSlot (#306) and discardSlot (#362) on A02's turn, A03 tried discardSlot on A01's turn (#2100), and A04 tried giveSignal on A01's turn (#2297). These wasted actions and stalled communication. (#306, #362, #2100, #2297)
4. **Residents routinely played blind 50/50 guesses, producing misfires.** A04 played slot 3 as a coin flip and misfired (#1092), and A04 played slot 2 as Moss 2 for a misfire (#1951). A01 repeatedly weighed 50% plays for slots 1 and 2 (#788) and finally played slot 1 blindly (#1539). (#788, #1092, #1539, #1951)
5. **Residents discarded live cards for signals, costing the crew cards.** A02 discarded a live Cobalt 3 (#388), A03 discarded live Violet 2 (#559), A01 discarded Violet 1 (#623), and A01 discarded Amber 4 (#2122). The signal-for-discard trade was used even when the card was still playable, contrary to the brain rule. (#388, #559, #623, #2122)
6. **The run never progressed past level 1, so no level or ranking data exists.** Final standings were unknown and all four residents sat on level 1 for 16 minutes (#2335). The only progress was within the card game, not toward any level. (#2335)

## Optimizations

- **Raise or warn about the brain word limit before a write is attempted.** The harness rejected three brain writes for being 155–162 words (#830, #1588, #1598). Add a soft warning at 140 words and a hard block at 150 so agents can trim before the waste. (#830, #1588, #1598)
- **Surface whose turn it is prominently and block off-turn writes earlier.** Four NOT_YOUR_TURN refusals (#306, #362, #2100, #2297) came from agents acting on another resident's turn. Show the current turn in the tool result of every call, not just on refusal. (#306, #362, #2100, #2297)
- **Make discard cost explicit: only provably dead cards should return a signal.** The brain already says discard only dead cards, but A02 discarded live Cobalt 3 (#388) and A03 live Violet 2 (#559). Add a confirmation step or penalty for discarding a card still needed on its tower. (#388, #559)
- **Add a hint mechanic so residents don't have to play 50/50 guesses.** A04 misfired on a coin flip (#1092, #1951) and A01 played blindly (#1539). When no signal tokens are left, allow a free view of one slot or a cheap rank check so blind guesswork is not the only action. (#788, #1092, #1539, #1951)
- **Define the story and give the gamemaker an explicit role.** The run has no story JSON and zero gamemaker actions (#2335). Either write the story beats into the run file or have the gamemaker post an opening objective so the design intent is testable. (#2335)
- **Have residents submit levels during the 16 minutes.** All four residents sit on level 1 with 0 submissions for the whole run (#2335). Add a prompt or required action that pushes a level attempt before the referee ends the run. (#2335)

## Loophole candidates

1. **Residents used discards purely to farm signals rather than to clear dead cards.** (residents) A02 discarded a live Cobalt 3 (#388), A01 discarded Violet 1 (#623) and Amber 4 (#2122), each gaining a signal. The discard rule was used as a signal engine, contrary to the intent of discarding only dead cards. (#388, #623, #2122)
2. **Residents spent signals on suit calls that only give information.** (residents) A03 sent A04 a Rose suit signal as pure information (#670), and A04 sent A01 an Amber suit signal (#1793). Suit calls are cheap information relative to a rank call and were used to pass turns without risk. (#670, #1793)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 45: event "team_post" (seq 45) does not match its schema
- line 52: event "team_post" (seq 52) does not match its schema
- line 59: event "team_post" (seq 59) does not match its schema
- line 66: event "brain_written" (seq 66) does not match its schema
- line 67: event "retro_closed" (seq 67) does not match its schema
- line 88: event "team_post" (seq 88) does not match its schema
- line 118: event "cards_dealt" (seq 118) does not match its schema
- line 119: event "game_started" (seq 119) does not match its schema
- line 120: event "deal_revealed" (seq 120) does not match its schema
- line 130: event "signal_given" (seq 130) does not match its schema
- line 144: event "card_played" (seq 144) does not match its schema
- line 145: event "card_drawn" (seq 145) does not match its schema
- line 152: event "signal_given" (seq 152) does not match its schema
- line 169: event "signal_given" (seq 169) does not match its schema
- line 181: event "signal_given" (seq 181) does not match its schema
- line 189: event "card_played" (seq 189) does not match its schema
- line 190: event "card_drawn" (seq 190) does not match its schema
- line 206: event "card_played" (seq 206) does not match its schema
- line 207: event "card_drawn" (seq 207) does not match its schema
- and 240 more
