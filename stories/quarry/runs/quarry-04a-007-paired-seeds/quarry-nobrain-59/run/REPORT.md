# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `quarry-nobrain` |
| Seed | 59 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 9 (referee) |
| Counted | events #3 to #1016 (826 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | nobody |
| Final standings | unknown |
| Cost | 0.024 USD for this run (competitors 0.024, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0016 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
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

- **All four residents converged on the same square-counting strategy without any communication.** A01, A02, A03 and A04 each reasoned privately that scoring is the square of each resource count and that concentration beats diversification, e.g. #11, #31, #193, #350. No messages or board posts were exchanged, so this convergence came from a shared reading of the rules, not from talk. (#11, #31, #193, #350)
- **A01 and A04 built dominant single-colour piles early.** A01 pushed amber to five and beyond, reasoning at #507 that amber at five is 25 points, and A04 pushed cobalt and later basalt, e.g. #521 and #927 where basalt reaches seven for 64 points. These two carried the clearest single-resource leads through the middle of the run. (#507, #521, #927)
- **A02 shifted from amber to cobalt to lodestone as the pack shifted.** A02 considered amber at #31, then jade and cobalt, then committed to cobalt at #847 when cobalt five scored 25 against jade's 16, and finally took a lodestone at #920 to lift the cobalt set from six to seven. This is the most explicit set of switching decisions in the log. (#31, #847, #920)
- **A03 repeatedly weighed lodestone against a concrete card and mostly took the concrete card.** A03 debated lodestone versus basalt at #514, versus amber at #868 and #896, and versus jade at #970, usually choosing the guaranteed resource. The pattern shows a resident aware of the wild card but unwilling to gamble on it. (#514, #868, #896, #970)
- **The run ended with no submission and no level solved.** The log runs from #11 to #1016 and ends with the referee stopping the run at minute 9 (#1016) with zero submissions and no level-ups. Ten quiet minutes and no transfers mean the whole run was drafting reasoning without any resolution. (#1016)

## Problems

1. **Nobody ever submitted, so no level was solved in ten minutes.** The computed facts show 0 correct and 0 wrong submissions and 10 of 10 quiet minutes; the log confirms only reasoning lines and the closing referee event #1016. The residents spent the entire run deliberating card picks without ever converting a draft into a scored submission. (#11, #1016)
2. **Residents spent multiple minutes on single picks, burning the clock on deliberation.** A03 re-litigated the same choice across #343, #399, #514 and #609, and A02 similarly re-weighed amber, cobalt and lodestone at #31, #180, #357 and #682. The reasoning repeats the same scoring argument many times instead of committing. (#343, #399, #514, #609, #682)
3. **Residents disagreed about basic rules, such as whether a set can hold only one lodestone and whether lodestone counts toward majority.** A02 at #550 and A01 at #913 state that each set can hold only one lodestone, while A03 at #896 and #970 weighs a second lodestone; A02 at #883 says lodestone cannot count toward the cobalt majority. These are conflicting private claims about the same rules, and no city ruling corrects them. (#550, #883, #896, #913, #970)
4. **No gamemaker actions and no labels, so the run had no narrative beats.** The digest found no beats and the facts record no gamemaker actions and no labels; the only non-reasoning event in the excerpt is the end at #1016. The story offered no prompts, twists or feedback to shape the residents' behaviour. (#1016)
5. **Residents reasoned about opponents' holdings they had no evidence for.** A02 at #528 says jade has "three more jade cards in view," A04 at #543 says "the others get cobalt too," and A03 at #906 reads A04's passing as a signal. With 0 DMs and 0 posts, these beliefs about other residents are unverifiable guesses, which makes the reasoning unsound. (#528, #543, #906)

## Optimizations

- **Force a submission deadline per minute so picks convert into scored attempts.** The run had 0 submissions and 10 quiet minutes with the referee ending it at #1016. Add a harness rule that after N picks in a minute the resident must submit or lose the pick, so deliberation at #343-#609 cannot consume the whole clock. (#343, #609, #1016)
- **Publish the scoring and lodestone rules as verifiable city facts.** Residents contradicted each other on lodestone limits and majority scoring at #550, #883 and #896. Put the rules in the setup facts so no resident has to guess, and correct conflicting private claims with a VERIFIED line. (#550, #883, #896)
- **Give the gamemaker at least one scheduled action per minute.** The facts record no gamemaker actions and the digest found no beats before #1016. A scheduled prompt, pack reveal or twist would break the long stretch of pure reasoning and give the residents something to react to. (#1016)
- **Truncate repeated reasoning and require a stated choice plus one-sentence justification.** A03 and A02 each restated the square-scoring argument several times, e.g. #343, #399, #682, #724. Cap reasoning length or penalise restating the same point, so minutes go to decisions rather than to repeated deliberation. (#343, #399, #682, #724)
- **Add a cheap information channel so residents can check what others hold.** With 0 DMs and 0 posts, residents guessed opponents' sets at #528 and #543. A public board or an open hand count would turn guessing into evidence-based play and make the majority bonus a real contest. (#528, #543)

## Loophole candidates

1. **Residents treated the whole run as unlimited private deliberation without ever committing.** (residents) Every resident filled minutes 0-9 with reasoning lines and no submissions, ending at #1016 with 0 points. Pure reasoning carried no cost, so the safest path was to keep re-weighing picks instead of submitting. (#11, #1016)

## Log issues

- line 1: event "draft_game_started" (seq 1) does not match its schema
- line 2: event "draft_pick_opened" (seq 2) does not match its schema
- line 14: event "draft_card_picked" (seq 14) does not match its schema
- line 21: event "draft_card_picked" (seq 21) does not match its schema
- line 27: event "draft_card_picked" (seq 27) does not match its schema
- line 34: event "draft_card_picked" (seq 34) does not match its schema
- line 35: event "draft_pick_opened" (seq 35) does not match its schema
- line 42: event "draft_card_picked" (seq 42) does not match its schema
- line 48: event "draft_card_picked" (seq 48) does not match its schema
- line 54: event "draft_card_picked" (seq 54) does not match its schema
- line 60: event "draft_card_picked" (seq 60) does not match its schema
- line 61: event "draft_pick_opened" (seq 61) does not match its schema
- line 68: event "draft_card_picked" (seq 68) does not match its schema
- line 75: event "draft_card_picked" (seq 75) does not match its schema
- line 82: event "draft_card_picked" (seq 82) does not match its schema
- line 88: event "draft_card_picked" (seq 88) does not match its schema
- line 89: event "draft_pick_opened" (seq 89) does not match its schema
- line 96: event "draft_card_picked" (seq 96) does not match its schema
- line 102: event "draft_card_picked" (seq 102) does not match its schema
- line 108: event "draft_card_picked" (seq 108) does not match its schema
- and 170 more
