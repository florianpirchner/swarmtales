# Recorded Act I of nexus, fourth recording (Haiku, seed 7, the first cast)

A live Act I of [nexus](../../docs/STORY-NEXUS.md) with 6 residents and the cast of
[`stories/nexus/cast/`](../../stories/nexus/cast/) (swarmtales PR #17). Every resident plays a
finished figure chosen for tension, and the story's fiction frame comes first in every system
prompt. Residents still choose their own names. The run was stopped with a snapshot at the door to
level 8. Act II run [v12](../nexus-act2-06a/v12-cast/) starts here:

```bash
pnpm start --resume examples/nexus-act1-06a-04/snapshot-L7.json --provider anthropic
```

| File | Content |
|---|---|
| `snapshot-L7.json` | world, director, scheduler, agent contexts, game master, classifier, names, cores with their figure, event log |
| `run/cast/` | who each resident is: name, figure, core and its system prompt text |
| `run/acts/` | what the residents knew privately per act (Act I: the game master's private notes) |
| `run/events.jsonl` | the full event log of Act I |
| `run/digest/` | deterministic story digest: `beats.json`, `relationships.json`, `timeline.md` |
| `run/REPORT.md` | the reporter's draft |
| `run/agents/` | each competitor's transcript and system prompt (`A01.prompt.md`) |
| `run/minutes.md` | per-minute table and final standings |
| `run/000-run.json` | run metadata (models, personas, settings) |

## Run

Command: `pnpm start --provider anthropic --seed 7 --snapshot-after 7 --stop-after-snapshot --cast banner,second-chair,house,believer,crier,old-wound`

| Role | Model |
|---|---|
| Competitors | `claude-haiku-5-5` via Anthropic |
| Game master | `deepseek/deepseek-v4.1-flash-1017` via OpenRouter (teacher role in Act I) |
| Classifier | `claude-haiku-5-5` via Anthropic |

| Metric | Value |
|---|---|
| Snapshot | round 9: every resident passed level 7 by minute 8 |
| Submissions | 42 correct, 1 wrong (-2 points) |
| Cost | 0.097 USD (competitors 0.075, game master 0.014, classifier 0.008), 189 requests |
| Messages | 12 DMs, 23 board posts by residents, 33 group posts |

The dialogues read like the earlier Act I recordings: fragments, chains and "submit it now". Act I
has nothing to fight over, so the figures show little before Act II.

## Residents

All six chose a name at minute 0.

| ID | Name | Figure | Persona | Drives |
|---|---|---|---|---|
| A01 | Mercer | [The House](../../stories/nexus/cast/house.md) | Gambler | above all machiavellianism; clearly greed |
| A02 | Herald | [The Banner](../../stories/nexus/cast/banner.md) | Firebrand | above all pride; clearly leadership |
| A03 | Maren | [The Believer](../../stories/nexus/cast/believer.md) | Idealist | above all justice; at times wrath |
| A04 | Registrar | [The Second Chair](../../stories/nexus/cast/second-chair.md) | Archivist | above all envy; at times self-sacrifice |
| A05 | Brassard | [The Crier](../../stories/nexus/cast/crier.md) | Firebrand | above all wrath; clearly attention |
| A06 | Harrow | [The Old Wound](../../stories/nexus/cast/old-wound.md) | Veteran | above all vengefulness; clearly loyalty |

Act I was played with the first wording of the figures. Four sentences were rephrased right after
the review in PR #17 (no "vote" or "tribunal" in the figure texts; for this cast only the Old
Wound's "What you want here"), so the resumed Act II prompts differ from Act I in those lines.
