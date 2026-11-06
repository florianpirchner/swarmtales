# Run report: run-002

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS-LEARNED.md`.

| | |
|---|---|
| Date | 2026-11-06 |
| Story | `salt-market` |
| Seed | 42 |
| Start | fresh, level 1 |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | unknown |
| Classifier | unknown |
| End | minute 20 (no run_end event (the run did not finish cleanly)) |
| Counted | events #5 to #2287 (1825 events) |

## Result

| Metric | Value |
|---|---|
| Levels solved | none this run |
| Stuck | A01 on level 1 from minute 0 for 20 minutes (to the end); A02 on level 1 from minute 0 for 20 minutes (to the end); A03 on level 1 from minute 0 for 20 minutes (to the end); A04 on level 1 from minute 0 for 20 minutes (to the end) |
| Final standings | unknown |
| Cost | unknown (usage.json is missing or malformed) |
| Reporter | 0.0043 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 0 correct, 0 wrong |
| Quiet minutes | 21 of 21 minutes without a submission; longest without one: minutes 0-20 (21) |
| Transfers | 0 went through (0 points); none refused |
| Messages | 0 DMs, 0 board posts by residents, 0 group posts |
| Gamemaker | no actions |
| Labels | none |
| Tool errors | CANNOT_COVER 5, BAD_ROUND 3, OFFER_CLOSED 3, OWN_OFFER 3, BRAIN_TOO_LONG 1, NOT_YOURS 1, TOO_MANY_OFFERS 1, USE_GIVE 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| A01 | - | 1 | none | 1 | - | - |
| A02 | - | 1 | none | 1 | - | - |
| A03 | - | 1 | none | 1 | - | - |
| A04 | - | 1 | none | 1 | - | - |

## Digest highlights

- **Nobody ever submitted, so the run produced no levels** All four residents sat on level 1 from minute 0 to minute 20 and the run ended without a single submission (#13, #92). The whole run was trading on the salt-market game, so the harness never moved past the first level. (#13, #92)
- **A03 won the first salt-market game on points while A04 finished last** A03 reported 64 points with its contract filled (#851) and A02 reported 44 points with its contract filled (#843). A04 finished on 27 points with its contract unfilled because it could not get cloth (#1622). (#843, #851, #1622)
- **A03's 4-salt-for-1-spice offer closed A03's contract in round 6** A03 executed O42, giving 4 salt to A01 for 1 spice, and reached exactly 4 cloth, 3 spice and 4 wax (#752, #753). After that it refused to trade any contract goods away (#1393, #1504). (#752, #753, #1393)
- **In game 2, cloth was the bottleneck and A04 never got any** A04 repeatedly offered 5-6 salt for 2 cloth (#1156, #2244) and was declined by A01, A02 and A03 (#1147, #1067, #1160). It ended game 2 with 27 points and no cloth (#1622). (#1067, #1147, #1156, #1622)
- **Residents treated spoilage timing as unknown and stalled on purpose** A01 held off buying spice until round 6 because spice would spoil if held earlier (#504, #618, #1328). A02 explicitly refused to trade copper because it spoils at the end of round 3 (#345). (#345, #504, #618, #1328)
- **The gamemaker never acted and residents spent game 2 retro writing brains** The facts record no gamemaker actions, and residents wrote brain versions 2 and 3 during the retro windows (#843, #1602) with one write rejected for being 159 words (#807). (#807, #843, #1602)

## Problems

1. **The harness never recorded a level completion or submission** Zero correct and zero wrong submissions across 20 minutes, and all four residents stalled on level 1 (#13, #2287). The run ended without a run_end event, which the facts flag as an unclean finish. (#13, #2287)
2. **Offer validation errors pushed residents away from trades they intended** Residents hit CANNOT_COVER 5 times (#702, #722, #1849, #1947, #2262) and BAD_ROUND 3 times (#1106, #2036, #2059) because they misjudged escrow, tax and later-round rules. A02 was even told to use give because its offer asked for nothing (#1137). (#702, #1106, #1137, #2036, #2262)
3. **Residents tried to accept or withdraw offers that were not theirs or were closed** A01 tried to accept its own offer (#558), A02 tried twice (#1465, #1674) and tried to withdraw O43 as not its own (#1513). Two more actions hit OFFER_CLOSED (#928, #2022, #2167). (#558, #1465, #1513, #1674, #2167)
4. **Everyone hoarded contract goods, so the market locked up** A01, A02 and A03 each declined cloth or spice offers because the goods were needed for their own contract (#1067, #1160, #1393). A04 needed cloth for the whole of game 2 and never received an acceptable offer (#1622). (#1067, #1160, #1393, #1622)
5. **Residents wasted turns waiting out spoilage instead of trading** A01 said it would buy spice only after the round-4 spoilage (#504) and again planned to buy in round 6 to dodge spoilage (#1328). A02 held copper through round 3 specifically because it would spoil (#345). (#345, #504, #1328)
6. **The brain word limit rejected a resident's write with no warning** A04's writeBrain was refused because the brain had 159 words against a 150 limit (#807). The limit was not surfaced before the write. (#807)

## Optimizations

- **Show escrow, tax and fee in the offer preview** Four residents repeatedly offered more goods than they held because fees were not shown before submitting (#702, #722, #1849, #2262). A preview of the post-tax cost would remove CANNOT_COVER errors. (#702, #722, #1849, #2262)
- **Explain what counts as a later-round good before the offer is made** BAD_ROUND refusals at #1106, #2036 and #2059 show residents guessing at round rules for delayed goods. A short rule hint at the offer step would stop the guessing. (#1106, #2036, #2059)
- **Block self-accept and foreign-offer actions client-side** OWN_OFFER fired three times (#558, #1465, #1674) and NOT_YOURS once (#1513). These are residents' own bookkeeping mistakes, so the harness should hide own offers from the accept list. (#558, #1465, #1513, #1674)
- **Signal spoilage timing explicitly in the market view** Residents spent several turns deciding whether a shipment lands before or after spoilage (#441, #1217, #1232). Stating the exact order in the market would free those turns for real trades. (#441, #1217, #1232)
- **Warn about the brain word limit before the retro window** The 150-word limit only appeared as a refusal at #807. Showing the current word count while writing would prevent lost retro work. (#807)
- **Make contract goods tradable so cloth-scarce contracts can finish** A04's failure in game 2 came from every cloth holder keeping cloth for its own contract (#1067, #1160, #1622). The story should either spread cloth more widely or let a resident win by selling spare contract goods. (#1067, #1160, #1622)

## Loophole candidates

1. **Residents dodged spoilage by planning purchases for the last round** (residents) A01 deliberately delayed spice purchases to round 6 to avoid spoilage (#504, #1328), and A02 planned to rebuild copper after it spoiled (#345). That avoids the risk the spoilage rule is meant to create. (#345, #504, #1328)
2. **Residents used the retro window to rewrite strategy brains between games** (residents) A02, A01, A03 and A04 all saved brain versions 2 and 3 in the retro windows (#843, #847, #851, #1602). That gives late-game designers a memory the in-game market never exposed. (#843, #847, #851, #1602)

## Log issues

- line 1: event "retro_started" (seq 1) does not match its schema
- line 2: event "retro_started" (seq 2) does not match its schema
- line 3: event "retro_started" (seq 3) does not match its schema
- line 4: event "retro_started" (seq 4) does not match its schema
- line 47: event "brain_written" (seq 47) does not match its schema
- line 48: event "retro_closed" (seq 48) does not match its schema
- line 55: event "brain_written" (seq 55) does not match its schema
- line 56: event "retro_closed" (seq 56) does not match its schema
- line 62: event "brain_written" (seq 62) does not match its schema
- line 63: event "retro_closed" (seq 63) does not match its schema
- line 69: event "brain_written" (seq 69) does not match its schema
- line 70: event "retro_closed" (seq 70) does not match its schema
- line 96: event "market_game_started" (seq 96) does not match its schema
- line 97: event "market_round_started" (seq 97) does not match its schema
- line 106: event "market_offer_made" (seq 106) does not match its schema
- line 108: event "market_offer_made" (seq 108) does not match its schema
- line 116: event "market_offer_made" (seq 116) does not match its schema
- line 118: event "market_offer_closed" (seq 118) does not match its schema
- line 127: event "market_offer_made" (seq 127) does not match its schema
- line 129: event "market_offer_made" (seq 129) does not match its schema
- and 443 more
