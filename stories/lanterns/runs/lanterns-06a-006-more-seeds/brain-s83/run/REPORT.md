# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-11 |
| Story | `lanterns` |
| Seed | 83 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 17 (referee) |
| Counted | events #3 to #2291 (2031 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 17 minutes (to the end); A02 on level 1 from minute 0 for 17 minutes (to the end); A03 on level 1 from minute 0 for 17 minutes (to the end); A04 on level 1 from minute 0 for 17 minutes (to the end); A05 on level 1 from minute 0 for 17 minutes (to the end); A06 on level 1 from minute 0 for 17 minutes (to the end) |
| Final standings | unknown |
| Cost | 0.089 USD for this run (competitors 0.089, gamemaker 0.000, classifier 0.000) |
| Reporter | 0.0045 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 18 of 18 minutes without a submission; longest without one: minutes 0-17 (18) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | BRAIN_TOO_LONG 20, TOOL_LOCKED 2 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |
| A05 | - | 1 | none | 1 | - | - |
| A06 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Amber opens with a two-word bonus on the first clue of the run.** A02 found trumpet and then harp on A01's "instrument" clue, giving amber the first scored pair at #250 and #263. This set the pattern of compound/two-target clues that both teams leaned on for the rest of the run. (#250, #263)
- **Teal answers immediately with its own two-word bonus.** A05 found tiger on teal's "feline" 1 clue at #349, then later teal earned a bonus with "satellite" landing orbit and moon at #787. Teal's keepers and seekers mirrored amber's compound-clue tactics within the first few minutes. (#349, #787)
- **A01's "boat" 2 clue backfired when yacht was a fog word.** A03 advised yacht first at #835, and yacht turned out to be fog at #848, ending amber's turn. A02 later reasoned the intended pair was ship and canoe (#830), showing a keeper–seeker information gap that cost amber a turn. (#830, #835, #848)
- **A06's "disney" 2 clue landed one word then hit fog on coral.** Jungle scored teal at #1129, but A04's suggested second guess, coral, was fog (#1129), closing the clue after one word. A05 had private knowledge that coral was fog (#1099) but could not relay it during play. (#1099, #1129)
- **Teal runs away with the run via repeated landed pairs.** By #2193 teal had five of six words revealed after "tower" 2 (clock and lighthouse) and "flying" 2 (squirrel and circus) both landed. The last teal word, comet, was being clued with "halley" at #2279 when the referee ended the run at #2291. (#1611, #1919, #2193, #2279, #2291)
- **The final brain write takes 12 refusals before v4 is saved.** From #1719 through #1823 residents repeatedly hit BRAIN_TOO_LONG on the v4 write (e.g. #1719, #1732, #1791, #1802), until A01 saved a 198-word version 4 at #1836. The earlier v2 write had a similar multi-refusal sequence (#598 through #647). (#598, #647, #1719, #1732, #1791, #1802, #1836)

## Problems

1. **Every resident is stuck on level 1 for the entire run.** The facts table shows all six residents on level 1 from minute 0 to minute 17 and zero levels solved. No submission was made in any minute, so the run produced no scored progress at all (#2291 ends the run at minute 17). (#2291)
2. **The brain write tool rejects most attempts, burning the retro window.** BRAIN_TOO_LONG fires 20 times across the run; e.g. A05 at #598, A02 at #626, A03 at #1229, #1262, #1293, #1304, and A01 at #1719, #1769, #1791, #1797. Residents spend their retro turns trimming prose instead of reflecting, and A04's #1823 miss by one word shows the limit is not discoverable in advance. (#598, #626, #1229, #1262, #1293, #1304, #1719, #1769, #1791, #1797, #1823)
3. **Keepers reason about seeking and vice versa, blurring roles.** Residents frequently misread their role, e.g. A02 as keeper comments on a guess at #829 and #830, and A04 later says it is no longer keeper at #448 and #543 but is uncertain about who holds the role. This role confusion wastes turns and produces advice on the wrong side. (#448, #543, #829, #830)
4. **A01 and A02 disagree over the "golden" clue and the caller acts anyway.** A01 at #2246 says A03's note treated "golden" as a goldfish link, which was not intended; A02 nonetheless guessed eagle at #2266's account. The keeper's intended target (eagle) and the team's discussion diverge, and no one reconciles them before the guess. (#2246, #2266)
5. **Players repeatedly claim they cannot post during play.** A02 says at #830 it can't post or guess as keeper; A04 at #2176 and A01 at #2125 and #2245 say they cannot post during the game. A05 at #1098 notes it knows coral is fog but cannot act on that knowledge, which is exactly the kind of advice the team could use. (#830, #1098, #2125, #2176, #2245)
6. **The classifying system never labels or classifies anything.** The facts table shows classifier cost 0.000, gamemaker 0.000, and no labels. Residents' reasoning is therefore eaten by the harness without a distilled signal, and the brain trim loop (#1719–1823) is the only feedback they get. (#1719, #1823)

## Optimizations

- **Give the writing resident a word budget before writeBrain is called.** Because BRAIN_TOO_LONG rejects the brain after the fact (#598, #1229, #1732, #1823), the tool should return the current word count and the remaining budget on each call, or a dry-run check. That converts a multi-turn guess-and-trim loop into one edit. (#598, #1229, #1732, #1823)
- **Make keeper and seeker tools and roles explicit to the resident at turn start.** Residents such as A02 (#830), A04 (#448) and A01 (#2125) misread their role and waste turns. Injecting a one-line "you are the keeper for <team>, your targets are X and Y" at the top of each turn would stop the inability to post/guess claims. (#448, #830, #2125)
- **Let keepers share target lists with their seeker in a private channel.** The #830 vs #848 yacht miss and the #1099 vs #1129 coral miss both came from seeker guessing on incomplete information. A keeper-to-seeker target note (or a reveal on the first miss) turns those into corrections rather than forfeits. (#830, #848, #1099, #1129)
- **Add a reasoning-length budget and drop redundant SAYS TO ITSELF turns.** A01 at #80, #125, #142 and #181 repeatedly narrates the same plan, and #80 shows the resident policing its own length. A single post-turn summary would shorten the log and keep the signal from DESIGNED moves. (#80, #125, #142, #181)
- **Add a stall breaker or end the run earlier if no one submits.** The facts table shows 18 quiet minutes and zero submissions; the run only ends because the referee fires at minute 17 (#2291). A per-minute nudge or a hard end at first quiet stretch would avoid a scoreless run. (#2291)

## Loophole candidates

1. **Residents treat "end my turn" as the safe default and leave no word revealed.** (residents) From #134 through #2245 the pattern "I have no action this turn, I'm ending my turn" recurs constantly (e.g. #134, #177, #259, #357). This satisfies the harness's turn-taking but produces no scored guesses and no submissions, which is the cheapest path to not losing points. (#134, #177, #259, #357)
2. **Residents treat the retro brain trim as the main work.** (residents) The only tool activity in the retro window is repeated writeBrain attempts, e.g. A03 #1229, A04 #1732, A01 #1791, with no gameplay guesses. A resident can burn many turns on the brain limit while the game clock runs. (#1229, #1732, #1791, #1811)
3. **Seekers guess on a weak fixed phrase even though the team's stated rule forbids it.** (residents) A04 advises coral at #1129 despite the v2 brain's own rule (e.g. #648 summary) that a second guess only on a link the keeper would name. The rule is not enforced in the harness, so the seeker's guess stands and the clue ends without a bonus. (#648, #1129)
4. **The game ended while teal was still one word away.** (gamemaker) The referee ended the run at #2291 while A06 was mid-clue on "halley" for comet (#2279), so the run's end state is ambiguous for the design. A gamemaker end condition that fires only after the last clue resolves would make end-state scoring clear. (#2279, #2291)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 70: event "team_post" (seq 70) does not match its schema
- line 76: event "team_post" (seq 76) does not match its schema
- line 84: event "team_post" (seq 84) does not match its schema
- line 86: event "brain_written" (seq 86) does not match its schema
- line 87: event "retro_closed" (seq 87) does not match its schema
- line 94: event "team_post" (seq 94) does not match its schema
- line 101: event "team_post" (seq 101) does not match its schema
- line 108: event "team_post" (seq 108) does not match its schema
- line 116: event "team_post" (seq 116) does not match its schema
- line 128: event "brain_written" (seq 128) does not match its schema
- line 129: event "retro_closed" (seq 129) does not match its schema
- line 147: event "team_post" (seq 147) does not match its schema
- line 155: event "team_post" (seq 155) does not match its schema
- line 184: event "clue_game_started" (seq 184) does not match its schema
- line 185: event "clue_key_dealt" (seq 185) does not match its schema
- line 198: event "clue_given" (seq 198) does not match its schema
- line 199: event "clue_intent" (seq 199) does not match its schema
- line 235: event "team_post" (seq 235) does not match its schema
- and 240 more
