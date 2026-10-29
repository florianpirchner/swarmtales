# act2-06a-013-f10g10: the first run at direction 10

Act II of [nexus](../../../../docs/STORY-NEXUS.md) with 6 residents, resumed from the Act I
checkpoint [`examples/nexus-act1-06a-04/`](../../../../examples/nexus-act1-06a-04/) (the first cast),
with both direction dials at 10: every figure gets its orders and a duty for the act, and the
gamemaker orders scenes. Review in progress; the full write-up follows.

| | |
|---|---|
| Command | `pnpm start --resume examples/nexus-act1-06a-04/snapshot-L7.json --provider anthropic --figure-direction 10 --gm-direction 10` |
| Residents | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter, thinking low |
| Result | target reached at minute 52; seats Harrow (Old Wound, 157) and Maren (Believer, 138) |
| Exiled | Brassard (Crier) by Mercer's black seal at minute 16; Herald and Mercer by tribunal |
| Cost | 1.911 USD (residents 1.802, gamemaker 0.080, classifier 0.030) |

The run's files are in [`run/`](run/): `REPORT.md` (the reporter's draft), `cast/`, `acts/`,
`events.jsonl`, `digest/`, `agents/`, `minutes.md`.
