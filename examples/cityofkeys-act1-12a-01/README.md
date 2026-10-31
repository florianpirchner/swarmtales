# Recorded Act I of cityofkeys, 12 residents (Haiku, seed 7)

The first live Act I of [cityofkeys](../../docs/STORY-CITYOFKEYS.md) with 12 residents and the v08 rules
(swarmtales PR #7): residents choose their own names, and Act I is a tutorial with no tribunal.
It was stopped with a snapshot at the door to level 8. Act II runs with 12 residents start here
(see [`../cityofkeys-act2-12a/`](../cityofkeys-act2-12a/)):

```bash
pnpm start --resume examples/cityofkeys-act1-12a-01/snapshot-L7.json --provider anthropic
```

| File | Content |
|---|---|
| `snapshot-L7.json` | world, director, scheduler, agent contexts, gamemaker, classifier, names, event log |
| `run/events.jsonl` | the full event log of Act I |
| `run/digest/` | deterministic story digest: `beats.json`, `relationships.json`, `timeline.md` |
| `run/REPORT.md` | the reporter's draft, reviewed (see below) |
| `run/agents/` | each competitor's transcript |
| `run/minutes.md` | per-minute table and final standings |
| `run/000-run.json` | run metadata (models, personas, settings) |

## Run

Command: `pnpm start --provider anthropic --agents 12 --seed 7 --snapshot-after 7 --stop-after-snapshot`
(block size auto: 2).

| Role | Model |
|---|---|
| Competitors | `claude-haiku-5-5` via Anthropic |
| Gamemaker | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (teacher role in Act I) |
| Classifier | `claude-haiku-5-5` via Anthropic |

| Metric | Value |
|---|---|
| Snapshot | round 8: every resident passed level 7 by minute 7 (6 residents in 06a-02: minute 12) |
| Submissions | 84 correct, 0 wrong |
| Cost | 0.148 USD, of which competitors 0.123, gamemaker 0.015, classifier 0.010 |
| Requests | 308 |
| Gamemaker | 13 actions, all delivered |
| Standings at the cut | all 12 at 80 points |
| Act brake | not needed (limit 25 minutes) |

Names (chosen at minute 0; one fallback):

| ID | Name | Persona | ID | Name | Persona |
|---|---|---|---|---|---|
| A01 | Ansgar | Archivist | A07 | Vesper | Skeptic |
| A02 | Jestrel | Gambler | A08 | Valorous | Firebrand |
| A03 | quietmoth | Recluse | A09 | Anselm | Archivist |
| A04 | Slate-5923 (city's fallback) | Veteran | A10 | Zippy-Ace | Gambler |
| A05 | Calder | Merchant | A11 | quiet-owl | Recluse |
| A06 | Liora06 | Idealist | A12 | Vigil | Veteran |

## Digest

- **Twice as many residents, twice as fast.** All twelve passed levels 1-7 in seven minutes without
  a single wrong code. Four fixed trios (G1-G4) carried levels 4-6; level 7's reshuffled teams
  matched their seams on the board.
- **Naming worked, mostly.** Eleven residents chose a name. A07 first tried "A07", and A04 tried
  "Vigil" (taken) and "Vigil-A04" (an ID part), then got the city's fallback "Slate-5923".
- **The courier urged pricing pieces at every door; nobody priced anything** and no transfer went
  through. The last courier line before the wall points at the tie of twelve on 80.

## Review of the reporter's draft

- The loophole candidates are Act I's cooperative design, not loopholes (posting fragments and
  chains on the board is how levels 5-7 are meant to be solved).
- Problem 4 points at a real bug: the NAME_ID refusal read "a name must not look like a resident
  ID such as Ansgar", because the city renders every ID in a text as its name. Fixed after this
  run (P34 in [`docs/LESSONS-LEARNED.md`](../../docs/LESSONS-LEARNED.md)).
- Problem 5 ("stopped before levels 8-10") is the intended checkpoint, not a problem.
