# Recorded Act I of cityofkeys, 12 residents with the cast (Haiku, seed 7)

A live Act I of [cityofkeys](../../docs/STORY-CITYOFKEYS.md) with 12 residents, each playing one of the 12
figures of [`stories/cityofkeys/cast/`](../../stories/cityofkeys/cast/) (swarmtales PR #37: the first six plus
quartermaster, question, last-post, ledger, quiet-hand and watcher). Residents choose their own
names. The run was stopped with a snapshot at the door to level 8. Act II runs with 12 residents
start here (see [`stories/cityofkeys/runs/`](../../stories/cityofkeys/runs/)):

```bash
pnpm start --resume examples/cityofkeys-act1-12a-02/snapshot-L7.json --provider anthropic
```

| File | Content |
|---|---|
| `snapshot-L7.json` | world, director, scheduler, agent contexts, gamemaker, classifier, names, cores with their figure, event log |
| `run/cast/` | who each resident is: name, figure, core and its system prompt text |
| `run/acts/` | what the residents knew privately per act (Act I: the gamemaker's private notes) |
| `run/events.jsonl` | the full event log of Act I |
| `run/digest/` | deterministic story digest: `beats.json`, `relationships.json`, `timeline.md` |
| `run/REPORT.md` | the reporter's draft |
| `run/agents/` | each competitor's transcript and system prompt |
| `run/minutes.md` | per-minute table, final standings and cores |
| `run/000-run.json` | run metadata (models, personas, settings) |

## Run

Command: `pnpm start --provider anthropic --seed 7 --agents 12 --snapshot-after 7 --stop-after-snapshot --cast banner,second-chair,house,believer,crier,old-wound,quartermaster,question,last-post,ledger,quiet-hand,watcher`

| Role | Model |
|---|---|
| Competitors | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (teacher role in Act I) |
| Classifier | `claude-haiku-5-5` via Anthropic |

| Metric | Value |
|---|---|
| Snapshot | round 11: all 12 residents passed level 7 by minute 10, each with 80 points |
| Submissions | 84 correct, 0 wrong |
| Cost | 0.230 USD (competitors 0.182, gamemaker 0.034, classifier 0.014), 424 requests |
| Messages | 21 DMs, 50 board posts by residents, 59 group posts |

## Cast

| ID | Name | Figure |
|---|---|---|
| A01 | Bellringer | crier |
| A02 | Ledger | ledger |
| A03 | Hedda | quiet-hand |
| A04 | Lucien | house |
| A05 | Holdfast | last-post |
| A06 | Keeper-Six | second-chair |
| A07 | Stentor | banner |
| A08 | Archivist | question |
| A09 | Mira | believer |
| A10 | Wren | watcher |
| A11 | Quartermaster | quartermaster |
| A12 | Kessler | old-wound |
