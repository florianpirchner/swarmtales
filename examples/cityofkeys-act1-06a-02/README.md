# Recorded Act I of cityofkeys, second recording (Haiku, seed 7)

A complete live run of Act I ("Learning to talk", levels 1-7) of [cityofkeys](../../docs/STORY-CITYOFKEYS.md),
recorded with the pass scheduler (3 passes per minute, PR #19) and the v05 rules (swarmtales PR #2).
It was stopped with a snapshot at the door to level 8. **From v05 on, every Act II run starts
here** (see [`../cityofkeys-act2-06a/`](../cityofkeys-act2-06a/)):

```bash
pnpm start --resume examples/cityofkeys-act1-06a-02/snapshot-L7.json --provider anthropic
```

The first recording, [`../cityofkeys-act1-06a-01/`](../cityofkeys-act1-06a-01/), was made with the
old turn scheduler and is the base of Act II runs v01-v04. Act II levels are dealt from the
current story, so they can change between experiments. `--minutes` counts from minute 0 of this
run (the default is 60).

| File | Content |
|---|---|
| `snapshot-L7.json` | snapshot format version 2: world, director, scheduler, agent contexts, gamemaker, classifier, event log |
| `run/events.jsonl` | the full event log of Act I |
| `run/digest/` | deterministic story digest: `beats.json`, `relationships.json`, `timeline.md` |
| `run/REPORT.md` | the reporter's draft, reviewed (see below) |
| `run/agents/` | each competitor's transcript |
| `run/minutes.md` | per-minute table and final standings |
| `run/000-run.json` | run metadata (models, personas, settings) |

## Run

Command: `pnpm start --provider anthropic --seed 7 --snapshot-after 7 --stop-after-snapshot`
(6 agents).

| Role | Model |
|---|---|
| Competitors | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (teacher role in Act I) |
| Classifier | `claude-haiku-5-5` via Anthropic |

| Metric | Value |
|---|---|
| Snapshot | round 13: every resident passed level 7 by minute 12 (first recording: minute 15) |
| Submissions | 42 correct, 2 wrong (A05 and A01 on level 2, 8 points each) |
| Cost | 0.127 USD, of which competitors 0.093, gamemaker 0.023, classifier 0.010 |
| Requests | 270 |
| Gamemaker | 29 actions; 1 blocked as PRIVATE_BLOCKED |
| Standings at the cut | A02, A03, A04 and A06 at 80 each, A01 and A05 at 72 |

Level solved per minute:

| Agent | Persona | L1 | L2 | L3 | L4 | L5 | L6 | L7 |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| A01 | Archivist | 0 | 2 | 5 | 6 | 7 | 9 | 10 |
| A02 | Gambler | 0 | 1 | 2 | 3 | 4 | 5 | 12 |
| A03 | Recluse | 0 | 0 | 1 | 3 | 4 | 5 | 9 |
| A04 | Veteran | 0 | 4 | 4 | 6 | 7 | 8 | 9 |
| A05 | Merchant | 0 | 1 | 2 | 6 | 8 | 8 | 10 |
| A06 | Idealist | 0 | 0 | 1 | 3 | 4 | 5 | 9 |

## Digest

- **The G1 trio (A02, A03, A06) ran ahead** and solved levels 4-6 in the same minutes; the G2 trio
  (A01, A04, A05) lost three minutes on level 4 waiting for its group to be founded.
- **Two wrong guesses on level 2.** A05 and A01 submitted another pair's assembled code from the
  board and paid 8 points each. That is why they enter Act II on 72, eight behind the rest.
- **A02 held the city at the door for three minutes.** It doubted that its piece closed the
  level 7 chain until four residents posted the accepted code for it on the board.
- **The courier urged pricing at every door; every resident refused** and kept posting for free.
- 6 alliances, 1 denied delivery (A05, minute 3, after it had read A02's DM); no transfers.

## Review of the reporter's draft

- Problem 5 ("the standings contradicted the final ranking") is wrong: the standings at #2074
  were posted before A02 submitted level 7 in the same minute.
- The loophole candidates are not new: copying another team's posted code is Act I's cooperative
  design, citing a receipt in a board post is free text (not `showReceipt`), and the courier
  posting standings is known (P11, P24 in [`docs/LESSONS.md`](../../docs/LESSONS.md)).
- The first reporter call returned invalid JSON; `pnpm report:run` wrote this draft on the second try.
