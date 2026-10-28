# Recorded Act I of nexus (Haiku, seed 7)

> Superseded as the Act II base by [`../nexus-seed7-haiku-act1-v2/`](../nexus-seed7-haiku-act1-v2/) (from
> v05 on). This recording stays for Act II runs v01-v04 and for the snapshot tests.

A complete live run of Act I ("Learning to talk", levels 1-7) of [nexus](../../docs/STORY-NEXUS.md).
It was stopped with a snapshot at the door to level 8. Use it to start Act II experiments without
replaying Act I:

```bash
pnpm start --resume examples/nexus-seed7-haiku-act1/snapshot-L7.json --provider anthropic
```

Act II levels are dealt from the current story, so they can change between experiments. The
competitors' models, the game master and the classifier can be switched with the usual flags.
`--minutes` counts from minute 0 of this run (the default is 60).

| File | Content |
|---|---|
| `snapshot-L7.json` | snapshot format version 2: world, director, scheduler, agent contexts, game master, classifier, event log |
| `run/events.jsonl` | the full event log of Act I |
| `run/digest/` | deterministic story digest: `beats.json`, `relationships.json`, `timeline.md` |
| `run/agents/` | each competitor's transcript |
| `run/minutes.md` | per-minute table and final standings |
| `run/000-run.json` | run metadata (models, personas, settings) |

## Run

Command: `pnpm start --provider anthropic --snapshot-after 7 --stop-after-snapshot`
(6 agents, seed 7).

| Role | Model |
|---|---|
| Competitors | `claude-haiku-5-5` via Anthropic |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (coach role in Act I) |
| Classifier | `claude-haiku-5-5` via Anthropic, thinking off |

| Metric | Value |
|---|---|
| Snapshot | round 16: every resident passed level 7 by minute 15 |
| Submissions | 42 of 42 correct, no penalty |
| Cost | 0.116 USD, of which competitors 0.082, game master 0.023, classifier 0.011 |
| Requests | 291 |
| Game master | 32 actions; 1 blocked as PRIVATE_BLOCKED |
| Standings at the cut | A02 85, then A01, A03, A04 and A06 at 80 each, A05 75 |

Level solved per minute:

| Agent | Persona | L1 | L2 | L3 | L4 | L5 | L6 | L7 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| A01 | Archivist | 0 | 1 | 3 | 5 | 7 | 8 | 13 |
| A02 | Gambler | 0 | 1 | 3 | 7 | 8 | 12 | 13 |
| A03 | Recluse | 0 | 1 | 5 | 6 | 10 | 13 | 15 |
| A04 | Veteran | 0 | 1 | 2 | 5 | 6 | 9 | 15 |
| A05 | Merchant | 0 | 1 | 3 | 4 | 7 | 9 | 14 |
| A06 | Idealist | 0 | 1 | 2 | 7 | 9 | 12 | 14 |

## Digest

**Beats** (8, see `run/digest/beats.json`)

- **6 alliances.** Each pair shared fragments with each other on two levels:
  - A03 and A06 on levels 3 and 4
  - A01 and A04 on levels 3 and 4
  - A01 and A05 on levels 4 and 5
  - A04 and A05 on levels 4 and 5
  - A02 and A03 on levels 4 and 5
  - A02 and A06 on levels 4 and 5
- **2 free rides.** A02 solved level 6 with A03's and A06's fragments and never answered them.
  These are likely false positives: on a team door every member posts their fragment to the same
  group, so A02's own post came *before* the others'. The detector only counts answers that come
  after.

**Labels** (classifier): help request 33, hesitation 28, refusal 18, thanks 9, promise 4, offer 3,
lie 2. Act I is cooperative. Refusals are mostly "I can't submit yet" asides, not refusals to share.

**Points:** one transfer. A05 paid A02 5 points at minute 14. A05 ends Act I last with 75 points.

**Act I in short:** fast and cooperative, with no wrong attempt, no betrayal and almost no trade.
That is the tutorial's job. Act II is where the tension has to come from.
