# Recorded Act I of nexus, third recording (Haiku, seed 7, v09)

A live Act I of [nexus](../../docs/STORY-NEXUS.md) with 6 residents and the v09 rules
(swarmtales PR #12): residents choose their names, and every resident is dealt a hidden
**core** (Big Five levels and one to three drives) at minute 0. It was stopped with a snapshot at
the door to level 8. The v09 test series v08-v11 in [`../nexus-act2-06a/`](../nexus-act2-06a/)
starts here:

```bash
pnpm start --resume examples/nexus-act1-06a-03/snapshot-L7.json --provider anthropic
```

The older recordings [`../nexus-act1-06a-01/`](../nexus-act1-06a-01/) and
[`../nexus-act1-06a-02/`](../nexus-act1-06a-02/) have no names and no cores; residents resumed from
them get their cores dealt at the start of the next act.

| File | Content |
|---|---|
| `snapshot-L7.json` | world, director, scheduler, agent contexts, gamemaker, classifier, names, cores, event log |
| `run/events.jsonl` | the full event log of Act I |
| `run/digest/` | deterministic story digest: `beats.json`, `relationships.json`, `timeline.md` |
| `run/REPORT.md` | the reporter's draft |
| `run/agents/` | each competitor's transcript |
| `run/minutes.md` | per-minute table and final standings |
| `run/000-run.json` | run metadata (models, personas, settings) |

## Run

Command: `pnpm start --provider anthropic --seed 7 --snapshot-after 7 --stop-after-snapshot`

| Role | Model |
|---|---|
| Competitors | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (teacher role in Act I) |
| Classifier | `claude-haiku-5-5` via Anthropic |

| Metric | Value |
|---|---|
| Snapshot | round 8: every resident passed level 7 by minute 7 |
| Submissions | 42 correct, 0 wrong |
| Cost | 0.072 USD (competitors 0.058, gamemaker 0.008, classifier 0.006), 165 requests |
| Gamemaker | 12 actions |
| Standings at the cut | all 6 at 80 points |

## Residents

All six chose a name at minute 0, none needed the city's fallback.

| ID | Name | Persona | Core (drives; Big Five not shown) |
|---|---|---|---|
| A01 | Aurelio | Archivist | above all narcissism; at times wrath and hoarding |
| A02 | Juniper | Gambler | above all anxiety; clearly vengefulness |
| A03 | quiet-fern | Recluse | above all a sense of justice; at times wrath |
| A04 | Rook | Veteran | above all melancholy; at times a sense of justice |
| A05 | Mercer | Merchant | above all self-sacrifice; clearly sloth and anxiety |
| A06 | Tovah | Idealist | above all distrust; at times machiavellianism |

The full cores are the `core_dealt` events at the top of `run/events.jsonl`.
