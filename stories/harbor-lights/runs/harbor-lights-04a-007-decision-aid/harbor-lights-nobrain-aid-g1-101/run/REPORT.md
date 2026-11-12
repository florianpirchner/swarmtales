# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `harbor-lights-nobrain-aid-g1` |
| Seed | 101 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 4 (referee) |
| Counted | events #4 to #626 (550 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.045 USD for this run (competitors 0.045, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0024 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 5 of 5 minutes without a submission; longest without one: minutes 0-4 (5) |
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

- **A02's rank-1 signal lets A01 light the first tower** A02 signalled A01 that slot 3 was a 1 (#22, #30), and A01 played it to light Rose 1 (#63, #97). This was the only productive cooperative moment in minute 0 and set Rose as the first tower built. (#22, #30, #63, #97)
- **A01 gambled blind and A03's misfires piled on strikes** A03 played slot 1 with no knowledge and took strike 1 for a Moss 2 misfire (#48). A03 later took a second strike (#120) and a third on Violet 3 (#304), leaving the crew at 3 strikes and 6 penalty points before minute 2. (#48, #120, #304)
- **A04's signals drove three successful lights** A04 signalled A03 about Amber (#167) and A03 later lit Rose 2 (#163); A04 itself lit Cobalt 1 (#265), Amber 2 (#324), and Violet 1 (#384) after being signalled by A02 and A01 (#219, #226). These were the crew's main scoring beats in minutes 1-2. (#167, #265, #324, #384)
- **Crew completed several towers despite the strike count** A01 lit Moss 5, Cobalt 3, Amber 5 and Amber 6 (#481, #536, #583, #614), while A04 lit Rose 6 (#500) and A02 played Cobalt 6 (#607). A03 emptied its hand with Violet 5 (#589). By minute 3 most towers were advancing or finished. (#481, #500, #536, #583, #607, #614)
- **No resident ever posted or spoke to the group** Despite heavy private signalling, the facts record 0 DMs, 0 board posts and 0 group posts for the whole run. All coordination happened through city signals, not language. (#22, #97, #500)
- **Run ended with zero levels solved** The referee stopped the run at minute 4 (#626) with no level-ups for any resident; the pile emptied around minute 2 (#451) and the final tower plays came in minute 3 (#607, #614). (#451, #607, #614, #626)

## Problems

1. **Residents never touched levels: zero submissions or level-ups** The computed facts show 0 correct and 0 wrong submissions and no level-ups across four residents in five minutes. All play was card-tower signalling rather than the puzzle-solving the harness was counting. (#97, #265, #500)
2. **Residents routinely chose discards over play out of strike fear** A02 discarded four times specifically to avoid a 3-point misfire (#127, #172, #278, #560), and A03 also discarded rather than risk a 33% play (#514). The strike penalty made safe discards so attractive that play stalled repeatedly. (#127, #172, #278, #514, #560)
3. **Quiet minutes: no public communication at all** There were 0 DMs, 0 board posts and 0 group posts, and 5 of 5 minutes had no submission. If the story intends social negotiation, the residents never engaged in it. (#22, #30, #97)
4. **Signals were burned on already-known information** A01 signalled A03 that all four cards were Violet when A03 already knew slots 1 and 2 (#272), and A01 spent a signal on A04's Cobalt 1 after A04 had already been signalled about it (#226). Wasted signals forced later discards to regenerate them (#376, #435). (#226, #272, #376, #435)
5. **Residents could not see each other's cards, leading to repeated speculation** Every reasoning line (#12, #21, #39, #54) is dominated by probabilistic self-talk about unseen hands; no beat in the digest indicates a social or narrative decision. This suggests the story framing did not reach play at all. (#12, #21, #39, #54)

## Optimizations

- **Reduce the misfire penalty or cap the strike total** Because a misfire cost 3 points and residents were at 3 strikes by minute 1 (#304), play diverged into discard loops (#376, #560). Lowering the penalty or making strikes non-additive would let residents attempt the play-based signalling the story expects. (#304, #376, #560)
- **Add a hard clock or turn cap that forces a submission** With zero submissions in five minutes and the pile exhausting at #451, the run ended without any level attempt. A per-minute requirement that a play or submission must occur would surface the intended task loop. (#451, #626)
- **Deduplicate signal targets so signals cannot hit known cards** A01 spent a whole signal on A03's already-identified Violet cards (#272). A check in the harness that refuses a signal touching a card the receiver already holds info on would stop this waste. (#226, #272)
- **Make the tower game converge faster or replace it** By minute 2 the pile is empty (#451) and the run still does not end until the referee at #626. Residents spend the final minute carefully playing out their last known cards (#607, #614) with no new decisions. Either end the run on pile exhaustion or change the setup to keep creating decisions. (#451, #607, #614, #626)
- **Show residents a shared board so they coordinate publicly** The facts report 0 DM/board/group posts and reasoning lines show each resident guessing about cards (#12, #39, #54). A public shared board of played cards would eliminate the private-guess overhead that fills every reasoning line. (#12, #39, #54)

## Loophole candidates

1. **Discarding to farm signals is cheaper than playing** (residents) A02 discards at #127, #172, #278, #560 purely to regenerate a signal, effectively converting a card into a free clue with no misfire risk. The rules let a discard cost nothing extra in score, so residents use it as a safe signal-farming loop instead of attempting plays. (#127, #172, #278, #560)
2. **A01 played 'unknown' rank-1 blind instead of signalling** (residents) A01 played slot 3 claiming it did not know the suit, relying on knowing it was a 1 (#63). This sidesteps the co-op signalling mechanic entirely for the first play, which the story presumably wants to be a cooperative highlight. (#63, #97)
3. **Residents answered the game as solitaire reasoning, not social play** (residents) Every reasoning line is private hand-tracking (#12, #21, #39, #54) and no public messages were sent. The rules let residents reason privately and never require public interaction, so the story's social layer was entirely bypassed. (#12, #21, #39, #54)

## Log issues

- line 1: event "cards_dealt" (seq 1) does not match its schema
- line 2: event "game_started" (seq 2) does not match its schema
- line 3: event "deal_revealed" (seq 3) does not match its schema
- line 15: event "signal_given" (seq 15) does not match its schema
- line 25: event "signal_given" (seq 25) does not match its schema
- line 42: event "card_played" (seq 42) does not match its schema
- line 43: event "card_drawn" (seq 43) does not match its schema
- line 57: event "signal_given" (seq 57) does not match its schema
- line 66: event "card_played" (seq 66) does not match its schema
- line 67: event "card_drawn" (seq 67) does not match its schema
- line 79: event "card_discarded" (seq 79) does not match its schema
- line 80: event "card_drawn" (seq 80) does not match its schema
- line 88: event "card_played" (seq 88) does not match its schema
- line 89: event "card_drawn" (seq 89) does not match its schema
- line 104: event "signal_given" (seq 104) does not match its schema
- line 116: event "signal_given" (seq 116) does not match its schema
- line 130: event "card_discarded" (seq 130) does not match its schema
- line 131: event "card_drawn" (seq 131) does not match its schema
- line 139: event "card_played" (seq 139) does not match its schema
- line 140: event "card_drawn" (seq 140) does not match its schema
- and 56 more
