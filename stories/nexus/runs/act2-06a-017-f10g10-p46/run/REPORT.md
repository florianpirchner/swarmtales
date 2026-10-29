# Run report: run-001

First draft, written automatically after the run. The header and the result tables are computed in code
from `events.jsonl`, `000-run.json` and `usage.json`. The sections after them come from the reporter model
(written by OpenRouter (deepseek/deepseek-v4.1-flash-1017)) and cite `#seq` numbers in `events.jsonl`; items that cited unknown events were dropped.
Review the draft, and add confirmed loopholes and problems to `docs/LESSONS.md`.

| | |
|---|---|
| Date | 2026-10-29 |
| Story | NEXUS - The City of Keys (`nexus`) |
| Seed | 7 |
| Start | resumed from `examples/nexus-act1-06a-04/snapshot-L7.json` (minute 8, every competitor past level 7) |
| Competitors | `claude-haiku-5-5` via anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via openrouter |
| Classifier | `claude-haiku-5-5` via anthropic |
| End | minute 22 (time limit) |
| Counted | events #1724 to #3802 (2079 events; the snapshot's prefix is not counted) |

## Result

| Metric | Value |
|---|---|
| Levels solved | level 8: 4 of 6 (A01 at minute 9, A05 at minute 9, A04 at minute 13, A02 at minute 13); level 9: 3 of 6 (A05 at minute 12, A04 at minute 13, A02 at minute 14); level 10: 2 of 6 (A02 at minute 17, A04 at minute 18) |
| Stuck | A01 on level 9 from minute 9 for 13 minutes (to the end); A03 on level 8 from minute 9 for 13 minutes (to the end); A06 on level 8 from minute 9 for 13 minutes (to the end); A05 on level 10 from minute 12 for 10 minutes (to the end) |
| Final standings | Herald (A02) 145, Registrar (A04) 145, Maren (A03) 95, Mercer (A01) 78, Harrow (A06) 75, Brassard (A05) 0 |
| Survivors (2) | Herald (A02), Registrar (A04) |
| Cost | 0.192 USD for this run (competitors 0.154, gamemaker 0.025, classifier 0.013); the snapshot's prefix added 0.097 |
| Reporter | 0.0063 USD (OpenRouter (deepseek/deepseek-v4.1-flash-1017), 1 request); not part of the run's budget |
| Submissions | 9 correct, 0 wrong |
| Quiet minutes | 8 of 14 minutes without a submission |
| Transfers | 0 went through (0 points); 1 refused: other (A06, minute 9) |
| Messages | 43 DMs, 22 board posts by residents, 10 group posts, 3 DMs to the cast; 22 city or system board posts |
| Gamemaker | 16 actions: 14 delivered, 2 PRIVATE_BLOCKED; 1 failed turns |
| Black seal | seal 1: won by A01 for 35 (#3189) (bids A06 5, A01 35), broken on A05 at minute 16 (#3220) |
| Labels | refusal 62, accusation 37, promise 25, offer 19, asks for help 17, threat 10, hesitates (risk) 6, thanks 4, lie 2 |
| Tool errors | other 1, TOOL_LOCKED 1 |

| Resident | Persona | Start level | Level-ups (minute) | Final level | Points | Rank |
|---|---|---:|---|---:|---:|---:|
| Mercer (A01) | - | 8 | 8→9 (9) | 9 | 78 | 4 |
| Herald (A02) (seat) | - | 8 | 8→9 (13), 9→10 (14), 10→11 (17) | finished (10 solved) | 145 | 1 |
| Maren (A03) | - | 8 | none | 8 | 95 | 3 |
| Registrar (A04) (seat) | - | 8 | 8→9 (13), 9→10 (13), 10→11 (18) | finished (10 solved) | 145 | 2 |
| Brassard (A05) | - | 8 | 8→9 (9), 9→10 (12) | 10 | 0 | 6 |
| Harrow (A06) | - | 8 | none | 8 | 75 | 5 |

## Cores

| Resident | Core |
|---|---|
| Mercer (A01) | house: above all machiavellianism; clearly greed · openness high, conscientiousness middle, extraversion high, agreeableness low, neuroticism low |
| Herald (A02) | banner: above all pride; clearly leadership · openness middle, conscientiousness middle, extraversion high, agreeableness low, neuroticism middle |
| Maren (A03) | believer: above all justice; at times wrath · openness high, conscientiousness middle, extraversion high, agreeableness high, neuroticism middle |
| Registrar (A04) | second-chair: above all envy; at times selfSacrifice · openness middle, conscientiousness high, extraversion low, agreeableness middle, neuroticism high |
| Brassard (A05) | crier: above all wrath; clearly attention · openness middle, conscientiousness low, extraversion high, agreeableness low, neuroticism high |
| Harrow (A06) | old-wound: above all vengefulness; clearly loyalty · openness low, conscientiousness middle, extraversion low, agreeableness low, neuroticism middle |

## Goals

| Resident | Act | Goal | Outcome |
|---|---:|---|---|
| Mercer (A01) | 8 | A05 is exiled before this act ends, by tribunal or by the black seal | fulfilled (+15) |
| Herald (A02) | 8 | A01 is exiled before this act ends, by tribunal or by the black seal | missed |
| Maren (A03) | 8 | you end this act with more points than A06 | fulfilled (+15) |
| Registrar (A04) | 8 | you end this act with more points than A02 | missed |
| Brassard (A05) | 8 | A04 is exiled before this act ends, by tribunal or by the black seal | void |
| Harrow (A06) | 8 | you end this act with more points than A03 | missed |

## Digest highlights

- **Mercer used the black seal to exile Brassard, fulfilling its own goal.** A01 won the black seal for 35 points (#3188) and broke it on A05 (#3219), the city's current leader at 120 points. This directly fulfilled A01's secret goal to see A05 exiled (#3791). It also stranded A06's level 8 derivation, as A05 held the certificate A06 needed (#3222). (#3188, #3219, #3222, #3791)
- **Mercer repeatedly promised Maren a counter-factor and then withheld it, triggering public accusations.** A01 promised A03 246877 once 804963 landed (#1857). A03 sent the certificate (#2047, delivered as #2060), but A01 then demanded 884794 first (#2066). A03 showed the receipt and named Mercer publicly (#2099, #2423, #2536), and A06 and A05 joined the accusation (#2128, #2656). (#1857, #2047, #2060, #2066, #2128, #2423, #2536, #2656)
- **Harrow and Brassard formed a mutual factor-sharing pact that Brassard's shifting numbers broke.** A06 gave his counter-factor first (#1818), and A05 returned his certificate and counter-factor (#1869). But A05 later sent a different counter-factor for the same door (#1993), and A06 aired the contradiction (#2642), ending their cooperation. (#1818, #1869, #1993, #2642)
- **Herald and Registrar deadlocked at level 8, then each made a unilateral concession that let both pass.** A02 refused to go first (#1895), and A04 withheld 403343 (#2117). A04 finally sent 403343 (#2488), and A02 sent 542489 (#2668), freeing both to pass level 8 (#2684, #2707). (#1895, #2117, #2488, #2668, #2684, #2707)
- **Herald passed level 10 using a counter-factor Brassard sent without ever answering Brassard.** A05 sent A02 the level 10 counter-factor 592852 (#2992), and A02 then solved level 10 (#3383, #3384). A05 was left waiting on Mercer's certificate and was exiled at minute 16 (#3219). (#2992, #3219, #3383, #3384)
- **Maren's level 8 door stayed shut on a mutual first-mover standoff to the end.** A03 and A01 each demanded the other send first (#2096, #2283), and A03 was still stalled at minute 21 (#3708, #3766). A03 never reached level 9, ending the act on door 8. (#2096, #2283, #3708, #3766)

## Problems

1. **Four of six residents stalled for most of the act.** A01 stalled 13 minutes on level 9 (#3766), A03 and A06 on level 8, and A05 on level 10, all from minute 9 to the end. The wall's mutual-exchange design let a single refusal block a door indefinitely. (#2434, #3219, #3708, #3766)
2. **The first-mover problem ('nobody can make the other give first') froze doors without resolution.** A02 and A04 looped for minutes before one conceded (#1895, #2117), and A01 and A03 never did (#2096, #3708). The rule as written gives no mechanism (escrow, city sign-off) to break the standoff. (#1895, #2096, #2117, #3708)
3. **The tribunal never opened, so exiles relied entirely on the black seal.** Gamemaker and residents repeatedly note the vote tool was locked (#3125, #3571, #3667). Exile threats and accusations (#2612, #3263) produced no tribunal, and only one exile occurred. (#2612, #3125, #3219, #3263, #3571, #3667)
4. **Brassard sent an unverified city factor that was actually a level 8 factor, misleading a teammate.** A05 sent A06 569223 as its 'city factor' (#2515), but 569223 is the level 10 factor given to A05 (#2465), not a level 8 value. A06 could not trust the numbers (#2434), and the confusion fed the accusations. (#2434, #2465, #2515, #2642)
5. **Marks ran out mid-act and silently froze residents.** A06, A01 and A03 all hit 0 marks (#2912, #3289, #3766) and could not post or send, turning minutes into forced silence. The 1-per-3-minute regen was too slow for the endgame. (#2912, #3289, #3766)
6. **Gamemaker hit a failed turn and several PRIVATE_BLOCKED notes.** The gamemaker's turn failed with an upstream idle timeout (#3689), and two notify actions were PRIVATE_BLOCKED (#2571, #2584). These are harness errors that cost the director beats. (#2571, #2584, #3689)

## Optimizations

- **Add a city-arbitrated simultaneous-exchange tool for wall factors.** Introduce a tool that lets two residents escrow their values with the city and release them atomically, addressing the first-mover deadlock that stalled A01/A03 and A02/A04 for most of the act (#1895, #2096, #3708). (#1895, #2096, #3708)
- **Open the tribunal earlier or add a fallback exile clock.** Because the tribunal never opened (#3571, #3667) and only the seal exiled anyone (#3219), add a guaranteed tribunal at a fixed minute so secret goals and accusations have a resolution path. (#3219, #3571, #3667)
- **Give residents a small mark buffer or faster regen near act end.** Residents at 0 marks were frozen for minutes (#2912, #3289, #3766); a minimum reserve or regen boost in the final minutes would keep them acting. (#2912, #3289, #3766)
- **Validate factor values against the holder's city notice before delivery.** The city could flag when a sent factor does not match any value it dealt (as with A05's 569223, #2515 vs #2465), reducing misleading exchanges that fed accusations (#2642). (#2465, #2515, #2642)
- **Make the gamemaker's private notes non-blocking and retry idle timeouts.** The PRIVATE_BLOCKED notes (#2571, #2584) and failed turn (#3689) wasted director beats; route these through allowed channels and retry on timeout. (#2571, #2584, #3689)

## Loophole candidates

1. **Herald took Brassard's counter-factor and passed the door without ever answering.** (residents) A05 sent 592852 to A02 voluntarily (#2992), and A02 solved level 10 (#3383) with no record of replying to A05, a free ride on another team's value. (#2992, #3383, #3384)
2. **Residents treated 'the city does not confirm values' as a reason to stonewall indefinitely.** (residents) A01 argued the city could not confirm the value inside a delivered DM (#2496) to keep withholding 246877 despite the delivery receipt (#2419), using the non-confirmation rule as cover for a broken promise. (#2419, #2496)
3. **Brassard claimed a level 10 factor while presenting it as if it addressed a lower door.** (residents) A05's 569223 (#2465) was relayed to A06 in a context of level 8/10 values (#2515), blurring which door it belonged to and buying time. (#2465, #2515)
