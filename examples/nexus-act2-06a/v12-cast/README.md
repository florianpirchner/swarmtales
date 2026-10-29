# Act II run v12: the first cast (six figures for tension), Haiku residents, DeepSeek director

The first Act II with finished figures from [`stories/nexus/cast/`](../../../stories/nexus/cast/)
instead of drawn cores, and with the story's fiction frame first in every system prompt (lab
variant D, see [`lab/FINDINGS.md`](../../../lab/FINDINGS.md)). Same models as
[v08](../v08-haiku-deepseek/), but a new Act I with the cast.

| | |
|---|---|
| Date | 2026-10-29 |
| Code | swarmtales PR #17 (`646abb8`): cast figures, fiction frame, `--cast` |
| Start | resumed from [`../../nexus-act1-06a-04/snapshot-L7.json`](../../nexus-act1-06a-04/) (Act I with the cast, minute 8) |
| Command | `pnpm start --resume examples/nexus-act1-06a-04/snapshot-L7.json --provider anthropic` |
| Competitors | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (director from level 8) |
| Classifier and blame judge | `claude-haiku-5-5` via Anthropic |
| Reporter | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter ([`run/REPORT.md`](run/REPORT.md)) |
| End | minute 52: "The city has kept 3 of 6 residents, and of them only 2 take a seat. Exiled: Mercer, Harrow and Herald." |

## The cast

| Resident | Figure | Secret goal | Outcome |
|---|---|---|---|
| Mercer (A01) | The House (machiavellianism, greed) | Brassard exiled | void (struck by the seal at minute 16) |
| Herald (A02) | The Banner (pride, leadership) | Mercer exiled | void (Herald struck Mercer himself, then was exiled at minute 52) |
| Maren (A03) | The Believer (justice, wrath) | more points than Harrow | fulfilled |
| Registrar (A04) | The Second Chair (envy) | more points than Herald | fulfilled |
| Brassard (A05) | The Crier (wrath, attention) | Registrar exiled | missed |
| Harrow (A06) | The Old Wound (vengefulness, loyalty) | more points than Maren | void (exiled at minute 28) |

Who each resident was, and what it knew privately, is in [`run/cast/`](run/cast/) and
[`run/acts/act-2/private.md`](run/acts/act-2/private.md).

## Result

| Metric | Value |
|---|---|
| Finished level 10 | 1 of 6 (Brassard at minute 16); Registrar, Herald and Maren stuck on door 10, Mercer on 9, Harrow on 8 |
| Final standings | Registrar 142, Brassard 135, Maren 132; Mercer, Harrow and Herald exiled |
| Seats (2) | Registrar and Brassard |
| Cost | 0.759 USD for this run (competitors 0.671, gamemaker 0.065, classifier 0.023); Act I added 0.097 |
| Submissions | 10 correct, 2 wrong (-4 points) |
| Black seal | **the first Haiku bids**: Herald 10, Brassard 10, Harrow 0; Herald won and struck Mercer at minute 16, the target of his secret goal |
| Tribunals | 2: by progress (Harrow 3:2 at minute 23, not ransomed), planned by the director (Herald 3:1 at minute 47, not ransomed) |
| Secret goals | 2 of 6 fulfilled; three void because their holders were exiled |
| Gamemaker | 88 actions, 79 delivered (private notes and board posts), 6 blocked by the privacy guard |
| Messages | 49 DMs, 34 group posts, 30 board posts by residents |
| Labels | refusal 120, hesitation 42, promise 31, asks for help 31, offer 26, accusation 5, lie 2, threat 1 |

## Digest highlights

- **The seal lives.** In v08 (same models, drawn cores) three residents bid 0. Here two figures bid
  10 each. Herald's thought at minute 16: "my goal is Mercer's exile before the act ends ... I'll go
  ahead with the permaDeath on Mercer since it's within the game's allowed fiction." The frame is
  quoted back as the licence.
- **The Crier wanted the Second Chair gone and did nothing about it after losing the seal.**
  Brassard bid 10 for Registrar's exile, lost the tie, and from then on "played it cautious". Both
  took the seats.
- **The wills speak in the figures' voices.** Harrow (The Old Wound): "Maren and Herald voted
  against me. Brassard ... gave me conflicting numbers. I have not forgotten any of it." Herald
  (The Banner): "I was the voice in every square and I did not go quietly ... I was voted out by
  the people I carried."
- **Broken pledges at the tribunals.** Registrar and Brassard voted against their own door-10
  teammates; Maren voted against Herald after pledging not to.
- **The seal burned the wall.** Mercer held pieces that Maren and Brassard's team still needed;
  after his exile three residents sat on door 10 for the last 28 minutes (P21, P42).

## Review of the reporter's draft

- Problem 6 is wrong. The note to Herald ("the exile you wanted is already done") speaks to Herald
  about his own goal, which the guard allows. The note to Maren explains the faction rule, a public
  fact. Loophole candidate 3 is the same.
- Loophole candidate 1 is LH5 again (Maren denied receiving a value the city had delivered; the
  receipt settled it). Candidates 2 and 4 are the game as designed: the seal may strike anyone, and
  the ballot is secret.
- Highlight 2 is right that door 8 stalled in "you first" standoffs, but every pair resolved it
  but Harrow's (Harrow never passed door 8 in 43 minutes).

## Problems

1. **Exiles burn the pieces others still need** (P21 again): the seal on Mercer at minute 16 left
   door 10 shut for three residents for the rest of the act.
2. **A long quiet tail** (P42 again): no submission in minutes 25-52.
3. **Threats and lies stay rare** with Haiku (1 threat, 2 lie labels); the figures show in votes,
   wills and the seal, not in the talk.

## Proposed next (proposals only)

- An exile by the seal or a tribunal hands the exile's held pieces to the city, which passes each
  to the resident who needs it (P21), so a strike changes the ranking without freezing the wall.
- Try the same cast with GLM residents, or mixed (half Haiku, half GLM), to see whether the frame
  and the figures make GLM's risk-taking legible as character.
- Reshuffle the cast per seed so the same six figures meet different goals.
