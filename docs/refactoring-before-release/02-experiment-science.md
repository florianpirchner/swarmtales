# 02 Experiment science: what the rewrite must guarantee so that a run counts as evidence

Role: multi-agent-systems and experiment scientist. Phase 1 paper, analysis only. Terms follow the brief: Game (was story), Director (was
overseer); old names are used where a current file is cited.

## 0. Summary

The current platform records runs very well and compares them weakly. The log, the hash chain and the runtime revision are worth carrying
over almost unchanged. What is missing is everything between "a run" and "a claim": a complete manifest, a declared experiment (arms, seeds,
metrics fixed before the run), statistics that the code computes, and a report in which a model cannot state a fact.

Five findings carry the paper:

1. **The seed controls the world, never the players.** No request to a model carries a seed or a temperature (zero matches for `temperature`
   in the TypeScript of `packages/`, `apps/`, `mechanics/`, `lab/`). In chess the seed draws nothing but the forfeit move, so the "seeds" of
   the chess series are replicate labels and pairing on them pairs nothing.
2. **The noise floor was never measured.** No series ran the same game, arm and seed twice on purpose. Without that, nobody knows how much
   of a paired difference is sampling noise of the model.
3. **Many lesson rows rest on one run.** 655 recorded runs cost 157.21 USD (sum of every `usage.json` under `stories/` and `examples/`), but
   the firm results are six paired series of 2026-11-11/12.
4. **The report's facts are not safe either.** In `chess-02a-051` the *code-computed* table says "Submissions: 0 correct, 0 wrong" and
   "Levels solved: none", and the model then writes "never submitted a single move"; the log has 299 `move_played` events. A missing metric
   was printed as zero.
5. **An async scheduler ends reproducibility by seed, not by log.** With a single ordered commit point and a record of what each agent had
   seen, every run stays replayable from its log.

Recommended new packages (none inside the kernel): `@swarmtales/manifest`, `@swarmtales/metrics`, `@swarmtales/stats`,
`@swarmtales/experiment`, `@swarmtales/report`, `@swarmtales/replay`. The rerun of all 15 games is proposed at about 35 USD of Haiku spend
with a cap of 50 USD, after a free stage of offline replays.

## 1. Current state of scientific rigour

### 1.1 What a seed controls

`packages/kernel/src/random.ts` (81 lines) holds Mulberry32, an FNV-1a `seedFrom`, and `deriveSeed(seed, ...parts)`: every draw has a
labelled stream (`rngFor(seed, "deal", 3)`). This is good design: a labelled stream does not move when other events are logged
(`packages/contracts/src/core/context.ts`, the comment on `rng`, contrasts it with `random()`, which does move).

What the seed reaches today:

| Draw | Where | Seeded |
|---|---|---|
| Order of residents per pass | `packages/kernel/src/host/turns.ts` (`rngFor(seed, "turns", minute, pass)`) | yes |
| Deals, grids, decks, dice | `mechanics/holdem`, `trick-play`, `draft-rounds`, `clue-grid`, `liars-dice`, `salt-market`, `puzzles` | yes |
| Personas, model mix | `apps/cli/src/host/residents.ts` (`assignPersonas`, `assignModels`) | yes |
| Lots, ties | `mechanics/seal`, `standoff-tribunal` | yes |
| Chess | one call: `ctx.rng("chess", "forfeit", ...)` in `mechanics/chess/src/index.ts` | only the forfeit move |
| `econ-games`, `grid-game`, `hint-towers` | no `rng(` call in `src/` | nothing game-side |
| Model sampling | `packages/models/src/` | **no**: no seed, no temperature, no top-p is sent |
| Thinking level | `--thinking`, story default, else `medium` (`apps/cli/src/host/core-run.ts`) | a setting, not always recorded (1.2) |
| Wall clock | every event carries `at`; latency decides nothing in the turn scheduler | not applicable |

Consequences:

- "Same seed" means "same deal and same turn order", never "same run". `docs/HOW-IT-WORKS.md` line 629 ("Determinism: all randomness flows
  from the run seed") is true for game code only; the sentence in `random.ts` ("a run can be reproduced exactly from its seed and story") is
  not true for a live run.
- Pairing on seeds reduces variance only where the seed fixes something that matters. In Quarry, Lanterns, Hold'em and Harbor Lights it
  fixes the deal, and pairing is right. In chess the start position is fixed, so `-s41` against `-s41` shares nothing; the "paired
  difference 16, SE about 9" of `stories/chess/runs/README.md` (r2 section) is an unpaired difference written as a paired one.
- Sampling parameters are provider defaults that nobody wrote down. A provider that changes a default changes every result silently.

### 1.2 What a run records

Taken from `stories/chess/runs/chess-02a-051-fresh-compact-g4-s53-r2/run/`:

| File | Content | Signed |
|---|---|---|
| `events.jsonl` | 3259 lines: `turn_input`, `request`, `tool_call`, `tool_result`, `thinking`, `text`, `usage`, mechanic events (`move_played`, `move_scored` ...), each with `seq`, `minute`, `at` | yes (chain) |
| `events.chain.jsonl`, `run.pub` | genesis (format, key, `commit`, `runtime`, `story`, `storyHash`, `seed`, `models`, optional `preregistration` and `commitments`), one hash per line, a signed head (`packages/chain`, 579 lines) | is the signature |
| `000-run.json` | run name, start time, `runtime`, provider, model, story id, `effective` (agents, minutes, seed), per-agent model | no |
| `usage.json` | requests, input, output, cache read and write, cost: totals, per agent, `prefix` and `own` for resumed runs, reporter spend | no |
| `agents/A01.md`, `A01.prompt.md` | transcript and system prompt per resident | no |
| `REPORT.md` | reporter draft (1.6) | no |
| `analysis.json`, `ANALYSIS.md` | Stockfish analysis from `lab/chess.ts` (chess only) | no |

Strong points: the log is complete down to private thinking; `turn_input` holds what woke a resident; `usage` is per request; the chain
design (`docs/design/event-log-signing.md`) already names its own limit (integrity after publication, not authenticity; selection of the
best of N runs) and already has a `preregistration` hash and free `commitments` in the genesis.

Gaps, each one a hole in a later claim:

1. **No sampling parameters and no thinking level in the manifest** unless overridden: run 051's `000-run.json` has `effective: {agents,
   minutes, seed}` only. Runs 052-055 differ from 048-051 by `--thinking low`, and the story id in the index is the same
   (`chess-fresh-compact-g4-p80`).
2. **The model id is the requested id.** `usage` and `agent_profile` carry `claude-haiku-5-5`; the aliases `haiku` and `sonnet` resolve
   through constants in `packages/models/src/providers.ts`, so the same command line means another model after a constant changes. No
   response-side model id, no provider request id, no OpenRouter upstream provider per request.
3. **The system prompts are not hashed.** The signing paper says so: they are "built after the chain starts" and follow from commit, story,
   seed, options and addenda. An outside reader must trust the commit; `+dirty` says the tree had changes, not which.
4. **No plugin versions.** All 39 mechanics move with the commit; a market of plugins (`docs/ideas/plugin-market.md`) breaks that.
5. **No stop reason, no latency, no context size per request.** Context size is derived afterwards from `usage`; latency only from the `at`
   of `request` and `usage`; a turn that ended at the output cap is found by a side script (`apps/cli/src/host/run-notes.ts`, lesson
   P52/P94: about 680 turns of Gemma and GLM ended at the cap unseen and voided runs 006-008 of tic-tac-toe).
6. **Derived files are unsigned** and one of them, `REPORT.md`, contains claims.
7. **Concurrency and rate-limit losses are not in the manifest.** P431: about 70 parallel runs lost 54 turns in one econ-lab series to 429
   errors. The run looks normal unless someone counts.
8. **No machine-readable result.** The numbers of a series live in Markdown tables of `stories/<name>/runs/README.md`, typed by an agent
   from an analysis nobody can rerun from the index (the chess engine numbers are the exception: `analysis.json`).

### 1.3 Runtime revisions

`packages/kernel/src/revision.ts` holds `RUNTIME_REVISION = 2`; `docs/RUNTIME-REVISIONS.md` has two rows. r2 (PR #145) lets a tool answer
end the turn; under r1 a chess seat was woken during the opponent's move, 114-133 extra requests per four-game match, about 15% of the cost.
The revision is in the genesis, in `000-run.json`, in the folder suffix (`-r2`) and in a `Runtime` column of every runs index.

This is the right idea and the most important methodological asset of the repository: it admits that *context management is a treatment*.
The same series then proved it: a fresh context per half-move makes Haiku write 1,620 output tokens per half-move against about 700 (P340),
and Sonnet does not (P343). Its limits:

- One integer for everything. Scheduler, wake rule, context policy, tool-notice format and prompt text are different treatments; a change in
  one mechanic's prompt raises nothing.
- It is raised by hand, by rule in `CLAUDE.md`. Nothing fails when someone forgets.
- "Runs of one revision are comparable" is necessary, not sufficient: models and prompts also move.

### 1.4 How runs were compared so far

| Source | Method | Verdict |
|---|---|---|
| `examples/cityofkeys-act2-06a/README.md` (v01-v12) | one run per version, each with other rules, three different Act I bases | a development diary; no two runs are comparable |
| `stories/whispers/runs/` (001-008) | one run per version | the same |
| `stories/chess/runs/README.md` | 57 runs; five "seeds" per arm, ACPL by Stockfish 10 at depth 14 (`lab/chess.ts`), CI by resampling matches, permutation p over games | the best-instrumented series; but games inside a match are not independent (the brain carries over), so the permutation over 16-20 games overstates n; real n is 4-5 matches |
| `docs/CROSS-GAME-FINDINGS.md` section 5 | paired seeds, 8-24 per comparison, paired difference with SE | the first sound design; SE only, no interval, no pre-declared metric, several metrics per series |
| `lab/FINDINGS.md` | forks from one snapshot (`lab/scenes/cityofkeys-06a-M11.json`), 1-3 forks per cell, labels by a Haiku classifier, "carried out = read by hand" | the right instrument (a fork holds the state fixed), cells too small, no blind reading |
| `lab/judge.ts` batch 4 | 72 hearings, 3 per cell | a clean factorial; 3 per cell |

Common weaknesses: the metric is chosen after looking; arms were run in sequence, not interleaved, so time (model drift, rate limits) is
confounded with the arm; stopped runs are recorded (good) but the exclusion rule was made afterwards; rules changed between series ("Harbor
Lights changed strike rules twice", findings section 3); two series stayed unmerged and one was lost with a container.

### 1.5 Sample sizes and conclusions that rest on n = 1

The repository is honest about this (P334: "The evidence base is too thin for most claims"; P230: "Seed sets swing more than the arms").
Rows of `docs/LESSONS-LEARNED.md` and checklist lines that state a finding from one run or one seed:

| Claim | Evidence | Status |
|---|---|---|
| Checklist 23 "Models differ more than rules" (P40, P41) | v08-v11: four runs, one per model pair | n = 1 per cell |
| Checklist 25 "Steering trades progress for drama" (P43) | single direction-10 runs | n = 1 |
| P115 chess brain effect (ACPL 148 against 191) | seed 37, one match per arm | later shown to be noise by P320 (five matches) |
| P116 chess teams better without the list (98 against 167) | one team run | n = 1, still quoted in the findings table |
| P326 Sonnet and Opus chess level, "lists do not help them" | one match each, seed 41 | n = 1 per cell |
| P341 compact board does not help | 047 against 045 | n = 1, marked "one seed" |
| P343 Sonnet does not think longer on a fresh context | 056 against 057 | n = 1 |
| r2 effect "about 15% fewer requests" | 045 against 013 | n = 1 per side (a mechanical count, so more credible than an outcome) |
| P71 "Haiku targets forgive every whisper" | whispers-06a-005 | n = 1 |
| P45 order refusal at minute 49 | run 013, then 24 forks that did not reproduce it | the forks are the better evidence |
| Liar's Dice "Opus wins 8 of 12 at a Haiku table" | 4 + 2 runs | small; series lost |
| Blind Bid | one smoke run on `main` | no result |

The chess brain case is the model lesson: an effect of 43 ACPL on one seed vanished on five. The best and worst match of one chess arm
differ by 30-80 ACPL (chess runs README). A single run is an anecdote in every game here.

### 1.6 The reporter

`packages/chronicle/src/report/` (1428 lines): `facts.ts` computes the header and tables, a model (DeepSeek via OpenRouter) writes
highlights, problems, optimizations and loophole candidates, and items that cite an unknown `#seq` are dropped. Two independent defects,
both visible in run 051:

- **Facts in the wrong vocabulary.** The fact table is shaped for City of Keys (P89, P103, P155, P425, all open). On chess it prints zeros
  for levels, submissions, messages. A zero is a claim.
- **A citation check proves existence, not support.** "Both residents never submitted a single move" cites #39, #45, #96, #3259; all four
  exist. P68 is the same failure in Whispers (a true statement called a lie because the model ignored `#seq` order).

The human-reviewed `README.md` beside each run is the real report today, and `CLAUDE.md` demands that review. That works with one careful
owner; it does not scale to an outside group.

## 2. What the new platform must guarantee

### 2.1 The run manifest

One document, written before the first event, hashed into the genesis, and complete enough that a stranger can say whether two runs are
comparable without reading code. It replaces `000-run.json` and the genesis fields. Sketch (Typebox in the real code, every field with a
description):

```ts
/** Everything that defines a run, fixed before its first event. Its hash is in the chain genesis. */
interface RunManifest {
  readonly format: "swarmtales-run/1";
  readonly run: { id: string; startedAt: string; purpose: "smoke" | "pilot" | "exploratory" | "confirmatory" };
  /** sha256 of the canonical JSON of the serialised game definition (today: storyHash). */
  readonly game: { id: string; hash: string; options: Readonly<Record<string, JsonValue>> };
  readonly kernel: { version: string; behaviourRevision: number; commit: string; dirty: boolean; lockfileHash: string; node: string };
  readonly scheduler: { kind: "seeded-turns" | "async-parallel"; version: number; params: Readonly<Record<string, JsonValue>> };
  readonly contextPolicy: { id: string; version: number; params: Readonly<Record<string, JsonValue>> };
  readonly plugins: readonly { name: string; version: string; contentHash: string; kind: "mechanic" | "director" | "model" }[];
  readonly actors: readonly ActorManifest[];
  /** World seed (deals, order, lots) and the replicate index: same seed, other sampling. */
  readonly seed: number;
  readonly replicate: number;
  readonly limits: { budgetUsd: number; maxConcurrentRequests: number; retries: number };
  readonly resumedFrom?: { snapshotHash: string; checkpoint: ChainCheckpoint };
  readonly experiment?: { id: string; specHash: string; arm: string; block: string; preregistration?: string };
}

interface ActorManifest {
  readonly id: string;                         // "A01", "director:gamemaker", "judge:1"
  readonly role: "resident" | "director" | "judge";
  readonly model: {
    provider: string;
    requestedId: string;                       // what the command said, alias included
    resolvedId: string;                        // after alias resolution
    route?: string;                            // e.g. a fixed OpenRouter upstream
    /** Every sampling field is a value or the literal "provider-default"; never absent. */
    params: { temperature: number | "provider-default"; topP: number | "provider-default";
              thinking: string; maxOutputTokens: number; toolChoice: string; seed: number | "unsupported" };
  };
  /** sha256 per prompt part: system prompt, tool schema list, persona, addenda. */
  readonly promptHashes: Readonly<Record<string, string>>;
}
```

Rules:

- **Prompts are fixed before genesis.** The system prompt and tool list of every actor are built in a preparation step, hashed into the
  manifest, and the texts are written as the first events (`prompt_fixed`). This closes gap 3 of 1.2. Anything that changes later (a tool
  notice, a brain briefing) is an event anyway.
- **`confirmatory` runs need a clean tree** (`dirty: false`), an experiment block and a preregistration hash. The CLI refuses otherwise.
  `smoke` runs need nothing.
- **`provider-default` is written down.** Where a model rejects a sampling field, the model plugin's capability table says so and the
  manifest records `"provider-default"` or `"unsupported"`.
- **The response-side model id, the request id and the stop reason go into the per-request event** (section 6), not into the manifest: they
  are observations.
- **Comparability is computed.** `comparabilityKey(manifest)` hashes kernel behaviour revision, scheduler kind/version/params, context
  policy, resolved model ids, sampling params and prompt hashes. Results of two runs may be pooled only when the keys match, or when the
  experiment spec names the differing field as its factor. The `Runtime` column becomes this key.

`behaviourRevision` stays (carry-over of `RUNTIME_REVISION`), but scheduler and context policy get their own version, and a test makes
forgetting hard: a golden run on the scripted model (`packages/models/src/scripted.ts`) is compared event by event; when it differs and the
revision did not rise, `check` fails.

### 2.2 Reproducibility levels

A claim names its level. The platform guarantees L0-L3 by construction and supports L4 with tools.

| Level | Name | Guarantee | Needs |
|---|---|---|---|
| L0 | Audit | the published log is the log that was written; nothing edited, cut or reordered | chain, anchored key (2.4) |
| L1 | State replay | log + game definition give the same game state at every `seq`, with no model call | every nondeterministic input is an event: model output, timer firing, human input, arrival order |
| L2 | Cassette replay | recorded model answers, keyed by request hash, fed to the kernel reproduce the log line by line (without `at`) | request hash in the log; turn scheduler, or recorded arrival order in async mode |
| L3 | Seeded world | same manifest gives the same deals, roles, lots and (turn scheduler) order | labelled streams only |
| L4 | Statistical | same manifest gives the same distribution of each declared metric within a stated tolerance | replicates, the noise floor, section 3 |

Notes:

- **L1 is the cheap regression test of the rewrite**: old logs replayed through new mechanics cost nothing (5.1).
  `packages/testkit/src/golden.ts` already compares mechanic lines against golden logs without `seq` and `at`; this becomes
  `@swarmtales/replay`.
- **L2 makes every fix testable against the run that showed the bug**, and lets a reader rebuild a resident's exact context at any request.
  It needs `request.hash` = sha256 of the canonical provider payload (messages, tools, params). Payload bodies need not be stored twice:
  they follow from L1 state plus prompts; the hash proves it.
- **L3 forbids order-dependent randomness.** The new mechanic API offers `rng(...labels)` only; the moving `random()` of the current context
  is dropped.

### 2.3 Determinism under the async parallel scheduler

With agents running on their own, three things stop being functions of the seed: who acts first, what each agent had seen when it decided,
and how many decisions fit into a period. The design answer is not to fake determinism but to record the race.

1. **One commit point.** Agents think in parallel; effects are applied by a single writer in arrival order. `seq` stays a total order. The
   kernel stays single-threaded where it matters.
2. **Causal stamp on every action.** Each request event records `sawSeq` (the log head when its context was built); each tool call records
   the `request` it came from. Then "stale decision" is a metric (`commitSeq - sawSeq`), and an analyst can tell an agent that ignored news
   from one that could not have known it. Without this stamp async runs cannot be analysed at all.
3. **Stale-action policy is declared in the manifest** (`scheduler.params`): apply, refuse with `STALE`, or re-ask. It is a treatment like
   the wake rule.
4. **Logical time is separate from wall time.** Game deadlines in the async mode run on a clock whose ticks are events (`clock_tick`), so L1
   replay does not depend on how fast a provider answered. `at` stays in the line as an observation.
5. **Latency becomes a confounder and is therefore measured and bounded.** A faster model acts more often. The manifest carries
   `maxConcurrentRequests` and an optional per-actor rate (actions per logical minute); the experiment layer reports actions per actor and
   can equalise them.
6. **Bit equality is possible only by replay.** L1 and L2 hold in async mode because arrival order is in the log. L3 holds for the world
   (deals, roles), not for order. L4 is the level at which async results are compared, and it needs more replicates because order adds
   variance; the noise-floor measurement (3.4) must be done per scheduler.

Recommendation for science: `seeded-turns` is the reference scheduler for every confirmatory comparison of arms; `async-parallel` is itself
an experimental factor (turns against async on the same game) until its variance is known.

### 2.4 The hash-chained log as audit

Carry `packages/chain` over as it is (RFC 8785 canonical JSON, sha256, ed25519 head, checkpoints with state hash for resumed runs). Changes
around it:

- **Genesis commits to the manifest hash** instead of a field list; the manifest is the first line.
- **Anchoring is built in as a command, not as a habit**: `swt experiment register` writes the preregistration (spec hash, nonce, declared
  run count, exclusion rules) and prints one hash to anchor outside (a public commit, a timestamp service). `swt run` in `confirmatory` mode
  requires it. The signing paper already explains why: the chain proves "not edited since", never "this was the only run"; only a declared
  run count makes selection visible.
- **A run registry closes the selection gap further.** Every start of a run in an experiment appends to `experiment/registry.jsonl` (run id,
  public key, manifest hash, start time), itself chained. A missing or stopped run then shows as a registered key without a published log.
- **Derived results are bound to the head.** `results.json` (3.6) names the head hash it was computed from and the hash of the metric code;
  a reader recomputes and compares.
- **What the chain does not prove** stays written in the docs: that the provider served the named model, and that the operator ran no
  unregistered pilot.

## 3. A first-class experiment layer

### 3.1 Packages and dependency rules

| Package | Content | May import |
|---|---|---|
| `@swarmtales/manifest` | manifest schema, hashing, `comparabilityKey` | `contracts`, `chain` |
| `@swarmtales/metrics` | `MetricDefinition`, the extractor that folds a log into metric values, generic metrics (cost, tokens, latency, tool errors) | `contracts` |
| `@swarmtales/stats` | bootstrap, paired and hierarchical resampling, permutation, effect sizes, equivalence test, power by simulation; pure functions, no dependency | nothing |
| `@swarmtales/experiment` | spec schema, planner (arm x block x replicate, randomised order), runner with cost cap and concurrency cap, registry, results writer | `manifest`, `metrics`, `stats`, the public run API |
| `@swarmtales/report` | renders `results.json` and the facts of a run; hosts the quarantined model commentary | `metrics`, `stats` |
| `@swarmtales/replay` | L1 and L2 replay, old-log adapters for the rerun | `contracts`, `chain` |

Rules: the kernel imports none of these. They read the log and the manifest only (no access to live kernel state), so a metric computed
today can be recomputed from the published log by anyone. A mechanic package exports its `metrics` next to its tools; `@swarmtales/metrics`
never names a game.

### 3.2 The experiment spec

```ts
/** A declared experiment. Its canonical hash is the preregistration's core. */
interface ExperimentSpec {
  readonly id: string;                                   // "quarry-open-vs-hidden"
  readonly question: string;
  readonly kind: "exploratory" | "confirmatory" | "equivalence";
  readonly base: { game: string; options: Record<string, JsonValue>; actors: ActorTemplate[]; scheduler: SchedulerChoice };
  /** Each arm overrides the base in exactly the named fields; the diff is the treatment. */
  readonly arms: readonly { id: string; override: Record<string, JsonValue>; control?: boolean }[];
  /** A block is what both arms share: a world seed, a snapshot to fork from, or a table. */
  readonly blocks: { kind: "seed" | "fork" | "none"; values: readonly (number | string)[] };
  readonly replicatesPerCell: number;                    // same arm, same block, new sampling
  readonly metrics: { primary: MetricRef; secondary: readonly MetricRef[]; guardrails: readonly MetricRef[] };
  readonly unit: "run" | "block";                        // the unit that is resampled
  readonly analysis: { estimator: "paired-diff" | "diff-in-means" | "ratio"; interval: "bca-bootstrap" | "percentile-bootstrap";
                       level: 0.95; smallestEffectOfInterest?: number; equivalenceMargin?: number };
  readonly exclusions: readonly ExclusionRule[];         // decided before: lost turns > x%, cap hits > y%, stopped
  readonly stopping: { maxCostUsd: number; maxRuns: number; interim?: "none" | "futility-only" };
  readonly judging?: JudgingPlan;                        // 3.5
}
```

Points that follow from the repository's own lessons:

- **Arms are diffs.** The chess variants are name suffixes (`chess[-nobrain][-moves][-threats]...`), and `--thinking low` is not in the name
  at all. An arm as an explicit override makes "what differs" machine-checkable.
- **Block and replicate are different things.** Chess gets `blocks.kind: "none"` and replicates; Quarry gets seed blocks. The planner
  refuses a `paired-diff` estimator when the game declares that its seed draws nothing relevant (a mechanic exports `seededAspects: ["deal",
  "order"]`).
- **Fork blocks** make the lab a first-class design: every arm continues the same signed snapshot (`ChainCheckpoint.state`), which holds the
  whole history fixed. This is the strongest pairing an LLM game can have and the lab already proved its worth (P45 was unpicked by 24
  forks).
- **Run order is randomised and interleaved** over arms, by the planner, with the order stored. This breaks the confound of arm with time,
  drift and rate limits (P431).
- **The control arm keeps everything the treatment arm has except the treatment** (findings optimization 3: the brain arm mixed "plan before
  game 1" with "memory").
- **Exclusions are rules, written before.** A run with lost turns above the threshold is excluded and rerun under the same block; the
  excluded run stays in the registry and the release.

### 3.3 Statistics that fit small n

Defaults, implemented in `@swarmtales/stats`, with no test picked by the author of a series:

- **Report an effect and an interval, not a p value alone.** Paired difference per block with a bootstrap interval (BCa where n >= 8,
  percentile below, and below n = 6 print the per-block values and no interval).
- **Resample the independent unit.** Games in a match, seats at a table and residents in a run are not independent. Hierarchical bootstrap:
  blocks first, then runs within a block. The chess permutation over games becomes a permutation over matches.
- **Sign-flip permutation test** for a paired design; exact for n <= 12.
- **Effect sizes**: standardised paired difference (d_z), Cliff's delta for skewed outcomes, risk difference with a Wilson interval for
  rates (win rates, seal used or not).
- **Equivalence** for "nothing changed" claims (the rerun, and every "no brain effect" row): two one-sided tests against a margin stated
  before. "No significant difference" on 4 seeds is not a finding; P334 says so.
- **Multiplicity**: one primary metric; secondary metrics are labelled exploratory; guardrails (cost, forfeits, cap hits) are checks, not
  hypotheses.
- **Game 1 apart from later games** wherever something carries across games (findings optimization 6).
- **Ceilings and floors are flagged**: a metric at its bound in the control arm cannot show a lever (tic-tac-toe 3x3, Opus in the econ lab,
  P436).

### 3.4 Power, the noise floor and cost

**Measure the noise floor first.** For every game: the same arm on the same block, k = 5 replicates. It gives the within-block variance
(pure model sampling) against the between-block variance (the deal), hence the intraclass correlation, hence whether pairing pays and how
many blocks a difference needs. This was never done; it costs about 2.5 USD for the cheap games (5.3).

**Planning numbers from the recorded paired series.** SD of the paired difference = SE x sqrt(n) from `docs/CROSS-GAME-FINDINGS.md` section
5; blocks needed for 80% power at alpha 0.05 two-sided, n = (2.8 x SD / effect)^2, plus 2 for the small-sample correction:

| Game | Metric | SD of paired difference | Effect to detect | Blocks needed | Cost per block (two arms) |
|---|---|---:|---:|---:|---:|
| Quarry | table points | 79 (SE 28, n 8) | 77 (the open-quarry effect) | 10 | 0.07 USD |
| Quarry | table points | 79 | 40 | 33 | 0.07 USD |
| Harbor Lights | score, one game | 2.8 (SE 0.8, n 12) | 3.2 | 8 | 0.10 USD |
| Harbor Lights | score | 2.8 | 1.5 | 29 | 0.10 USD |
| Lanterns | recall | 0.10 (SE 0.03, n 12) | 0.08 | 14 | 0.14 USD |
| Econ Lab | cooperation | 0.37 (SE 0.13, n 8) | 0.40 | 9 | 0.04 USD |
| Hold'em | points per seat and game | 6.1 (SE 1.25, n 24 tables) | 2.1 | 68 tables | 0.15 USD a table |
| Chess (unpaired) | match ACPL | about 30 between matches of one arm | 46 (lists against default) | 8 per arm | 0.24 USD a match |
| Chess (unpaired) | match ACPL | about 30 | 16 (the fresh-context hint) | 55 per arm | 0.24 USD a match |

Reading: effects the size of the firm ones need 8-14 blocks, which matches P334's "8-12". Effects half that size need about 30, which the
project has never run. Hold'em's +2.1 points is not established at 24 tables; its EV-loss metric is (0.26 to 0.03). The chess fresh-context
hint would cost about 26 USD to settle and is probably not worth it. This table is the argument for choosing a *sensitive* primary metric
(EV loss per decision, ACPL per move, recall) over a noisy outcome (points, wins).

**Power by simulation** is the general tool: `swt experiment power` resamples the pilot's per-block values under an assumed effect and
prints the detection rate per n. It needs a pilot, which the workflow therefore requires.

**Cost control** (the kernel's part is a budget counter only):

- The spec carries `maxCostUsd`; the runner estimates from the pilot's cost per run, refuses to start when the plan exceeds the cap, and
  stops between runs, never inside one (a cut run is an exclusion).
- `--budget` was ignored by core stories until P327 (Opus runs cost 5.93 and 6.87 USD against caps of 6 and 4). In the new kernel the budget
  is one place, tested with the scripted model.
- Concurrency cap per provider in the runner (P431: about 10 new runs at a time), with lost turns as a guardrail metric.
- Sequential designs: `futility-only` interim looks are allowed (stop when the interval excludes the smallest effect of interest); stopping
  early *for success* is not, in confirmatory mode.
- Cheap first: Haiku for the full design; a stronger model only as a small replication of the direction (the project's existing rule, now
  written into the spec as a separate experiment).

### 3.5 Blind judging and annotation

Some outcomes need a reader (threat/offer/lie labels in the lab, "carried out = read by hand", the blame judge, loophole candidates).
Requirements:

- **A judging view is built by code from the log** with a declared redaction: arm id, model names, treatment texts and anything the spec
  lists are removed or replaced by stable pseudonyms; item order is shuffled across arms. The view's hash is stored.
- **Judges never see the manifest.** A judge is an actor with its own manifest entry (model, prompt hash), run after the game, not a
  Director inside it.
- **At least two independent judges** (different model family where the budget allows; never the resident's own model as the only judge),
  plus a human-labelled calibration set per label scheme (50-100 items) with the judge's accuracy on it reported.
- **Agreement is a number in the results**: Cohen's kappa for two, Krippendorff's alpha for more or for interval data, with a bootstrap
  interval. Below a declared threshold the label is not used as a primary metric.
- **Leak test**: a simple classifier tries to predict the arm from the redacted view. Accuracy near chance is reported as evidence that the
  blinding held.

### 3.6 Machine-readable results

One file per experiment, written by code only, validated by a Typebox schema, published with the runs:

```ts
interface ExperimentResults {
  readonly format: "swarmtales-results/1";
  readonly spec: { id: string; hash: string; preregistration?: string };
  readonly code: { metricsHash: string; statsVersion: string; commit: string };
  readonly runs: readonly { id: string; arm: string; block: string; replicate: number; manifestHash: string;
                            headHash: string; status: "included" | "excluded" | "stopped"; reason?: string; costUsd: number }[];
  /** Long format: one row per run and metric; "absent" when the game does not define the metric. */
  readonly values: readonly { run: string; metric: string; value: number | "absent"; n?: number }[];
  readonly estimates: readonly { metric: string; role: "primary" | "secondary" | "guardrail"; contrast: [string, string];
                                 estimator: string; estimate: number; interval: [number, number]; level: number;
                                 effectSize?: { kind: string; value: number }; nUnits: number; test?: { kind: string; p: number } }[];
  readonly judging?: { scheme: string; judges: string[]; agreement: { kind: string; value: number; interval: [number, number] }; leakTestAccuracy: number };
  readonly deviations: readonly { at: string; what: string; why: string }[];
}
```

Also `values.csv` (the same long table) for R and pandas users. The runs index of a game (`stories/<name>/runs/README.md` today) is
generated from these files; nobody types a number.

### 3.7 Reports without model-written facts

The rule: **a number or a state of the world in a report comes from code; a model may only comment, and its comment is checked and marked.**

1. **Facts layer.** Rendered from `MetricDefinition`s that the game's mechanics export. A metric that the game does not define is absent
   from the table. No game-shaped fact code in the report package: this removes the City of Keys vocabulary (P89, open since the first core
   story) by construction. Chess declares `halfMoves`, `refusedMoves`, `result`; the table for run 051 then starts with "half-moves 299".
2. **Claims layer.** The model returns typed claims, not prose: `{ kind: "count" | "order" | "quote" | "absence", query, expected, cites }`.
   Code evaluates each against the log: a count is recounted, an order claim compares `seq`, a quote must be a substring of the cited event,
   an absence claim ("nobody did X") is run as a query over the whole log. A failing claim is dropped and counted. "Never submitted a single
   move" would be an absence claim over `move_played` and fail with 299 counter-examples. P68 would be an order claim and fail.
3. **Commentary layer.** Free interpretation (why something happened, what to try next), printed under a fixed heading "Model commentary,
   unverified", stored in a separate file (`COMMENTARY.md`), never merged into `results.json`, never quoted in a lessons row without a human
   or a claim check.
4. **Loophole candidates** stay model-written (reading for intent is what a model is good at) but each candidate must pass as a claim (the
   cited events show the described action) before it is listed; the judgment "this is against the intent" stays with the reviewer.
5. **The report records its own reliability**: claims made, verified, dropped. A reporter prompt change is tested offline against recorded
   logs with known traps (run 051, whispers-06a-003).
6. **The lessons log** (`docs/LESSONS-LEARNED.md`) gets an `evidence` field per row: `n` units, link to `results.json` or "single run", so n
   = 1 rows are visible as such.

## 4. ISTAnt: what makes the replication convincing to an outside group

`docs/ideas/istant.md` fixes a 1:1 protocol for Cadei et al., NeurIPS 2024: 5 setups x 9 colonies of three ants, two treatments, per-tick
binary outcomes, three blind annotators, an annotation model and the treatment effect bias. `docs/RELATED-WORK.md` states the general
position honestly: "Not a benchmark ... metrics are still to be built", no paper, no `CITATION.cff`. An ISTA reader will test five things;
the rewrite must provide each as a mechanism, not as a promise.

**4.1 Protocol fidelity.**

- The game definition is the protocol. Its hash is in every manifest; the cue texts of the two particle types are fixed strings in the
  definition (the idea paper says so), so they are covered.
- A **fidelity table** generated from the definition: original parameter, replica parameter, same or deviating, reason (ticks for frames,
  text for video, `drawLot` for placement). Deviations decided after registration go into `deviations` of the results.
- **Randomisation is auditable**: the treatment assignment per setup comes from a labelled stream; its hash is a genesis commitment (the
  chain schema already reserves `commitments` for exactly this); the assignment is revealed in the release and anyone can recompute it from
  seed and label.
- **Isolation of units**: nine colonies of a setup must not share anything: no channel, no shared Director state, no shared prompt cache
  content that differs by treatment. Each colony is its own run with its own chain; the setup is an experiment block. The async scheduler is
  not needed inside a colony (ticks are synchronous); parallelism is across colonies, in the runner.
- **Declared run count and nonce** in the preregistration, anchored before the pilot of the full study; the pilot itself is registered as a
  pilot and released.
- **Exclusions as in the original** ("one video discarded"): a colony that broke is dropped by a pre-declared rule (model error, refusal,
  timeout), reported with its reason, and stays in the data with `dropped_reason`. The idea paper already demands this.

**4.2 Blinding, by construction and tested.**

- The camera Director's input is a *typed view* that cannot contain the treatment: the kernel hands a Director only the fields its declared
  view names (positions, contacts, movements). "The camera never sees the treatment" (lesson 11 in the idea paper) must be a type, not a
  prompt line.
- Annotators read only frames. Their manifests show no access to events or other annotators.
- **Leak tests in the release**: (a) a string scan of all frames for cue vocabulary; (b) a classifier that predicts treatment from frames of
  ticks *without* grooming; accuracy near chance supports the blinding. Note the catch: frames may legitimately carry treatment information
  through behaviour; that is the effect itself, so the test is restricted to behaviour-free ticks and the camera's style.
- The camera is a model and can drift in style with the scene. Fix its model, prompt and parameters in the manifest, and ship a
  **deterministic template camera** as a second "video" of the same runs. If the paper's phenomenon appears with both cameras, it is not an
  artefact of the camera model.

**4.3 Annotator agreement.**

- Three annotators as in the original, independent, with per-behaviour agreement (Krippendorff's alpha per tick, and onset/offset tolerance
  in ticks), reported next to the original's if published.
- Unlike the original there is engine truth (`groom` tool calls with start and end tick). Report annotator accuracy against truth *and* keep
  the paper's definition of bias against annotations, so both numbers exist: TEB against annotations (comparable to the paper) and against
  truth (new).
- Annotator diversity (open question 4 of the idea paper) is a science question: three prompts on one model share errors. Recommend two
  model families among the three and report pairwise agreement.
- A small human-annotated subset (two colonies per setup) anchors the model annotators to a human reading. Without it "annotation" means
  "another model's opinion".

**4.4 Data release.**

- The shape of the idea paper (`experiments_settings.csv`, `annotations/<colony>.csv`, `truth/<colony>.csv`, `frames/<colony>.jsonl`) is
  right. Add: a loader check that runs the ISTAnt repository's own `src/data.py` path on the export in CI (offline, synthetic colony), since
  the claim is "their pipeline runs on it".
- Per colony: full run folder with chain, manifest, registry entry; one `results.json` for the study; the analysis script pinned with its
  lockfile; a datasheet (what it is, what it is not, known artefacts), a licence for the data (code is Apache 2.0; the data needs its own
  statement, e.g. CC BY 4.0), `CITATION.cff`, and a DOI-archived snapshot.
- Embeddings for the annotation model are a dependency on a third model: record its id and release the embeddings, or the analysis is not
  reproducible when that model changes.

**4.5 What is claimed.** A replication of the *method question* (does a good annotation model give a biased treatment effect, by sampling
scheme and model choice), with the advantage of ground truth; not a statement about ants. The effect between the two cue texts is itself a
design choice (open question 1), so the study should register a **known-effect arm**: a scripted colony policy with a programmed grooming
rate difference. If the pipeline cannot recover a known effect from the frames, no result on LLM colonies means anything. This also gives an
L1-reproducible, zero-cost test of the whole analysis.

**4.6 What the rewrite must have before ISTAnt starts.** Manifest with prompt hashes; typed Director views; `experiment` runner with blocks
and registry; `preregistration` anchoring command; judging plan with agreement; exclusion rules; `results.json`; template camera. The idea
paper leaves open where it is built; scientifically it should be the first study on the new architecture after the rerun, not on the old
one.

## 5. The rerun plan

All games are rerun on the new architecture; the old runs become the baseline. Bit equality is impossible (models are not seeded, prompts
and tool names will change) and not wanted. The target is **behavioural equivalence**: the same rules, and the same distribution of each
game's primary metric within a margin fixed here.

### 5.1 Three stages, the first two without spending

**Stage 0a: rule replay (L1, free).** For every game, old `events.jsonl` files are replayed through the new mechanics by an adapter in
`@swarmtales/replay`: the recorded `tool_call` sequence goes in, the mechanic events (`move_played`, `game_ended`, scores) must come out
equal after a declared mapping of renamed fields. 655 recorded runs with about 250,000 requests are a free conformance suite. A mismatch is
a rule regression unless it is in the change register (5.4).

**Stage 0b: seeded-world goldens (L3, free).** Mulberry32, `seedFrom` and the stream labels are kept (decision D3), so the same seed gives
the same deal, grid and lot in old and new. A test draws 100 seeds per game and compares with the old engine's draws. This also keeps old
and new runs pairable on the deal.

**Stage 0c: scripted smoke.** Every game plays to its end on the scripted model, with the manifest, the facts table and the generic metrics
present.

**Stage 1: noise floor and bridge (about 5 USD).** (a) Five replicates of one arm on one block for the cheap games and chess. (b) A
**bridge**: 8-12 runs of four games on the *old* architecture in the same week as the new runs. Old baselines date from 2026-11-06 to 11-13;
if the model behind `claude-haiku-5-5` has moved by the time of the rerun, the bridge shows it, and old-against-new is not blamed on the
rewrite. `swarmtales_old` stays runnable for exactly this purpose.

**Stage 2: the rerun proper**, in the **compatibility profile**: the turn scheduler, wake rule and context policy of r2, and resident
prompts ported word for word (tool names may change by the tool-naming decision; that is in the change register and gets its own check). The
async scheduler and any prompt rewrite are tested afterwards as experiments against this new baseline, never mixed into the equivalence run.

### 5.2 Baselines, metrics and tolerances per game

Equivalence rule used below unless a row says otherwise: (i) the control arm's mean lies within the old 95% interval widened by the margin;
(ii) a *firm* old effect keeps its sign and at least half its size; (iii) guardrails hold: no new tool error code, forfeits and lost turns
not above the old rate, requests per decision within +10%, cost per run within +20% (lower is fine). Cost is per run from the recorded
`usage.json` files.

| # | Game | Old baseline runs | Primary metric (old value) | Tolerance | New runs | Est. cost |
|---|---|---|---|---|---|---:|
| 1 | quarry | `quarry-04a-007-paired-seeds` (8 seeds x 3 arms) | table points; open quarries against brain arm +77 (SE 22); brain against none -12 (SE 28) | open effect >= +38 and interval above 0; brain effect inside +/-60 | 12 seeds x 3 arms = 36 | 1.2 |
| 2 | econ-lab | `econ-lab-04a-003-brain-vs-nobrain` (8 seeds) | cooperation in the A-or-B game: 0.51 none, 0.11 brain (-0.40, SE 0.13) | effect <= -0.20; control within 0.35-0.65 | 12 x 2 = 24 | 0.5 |
| 3 | harbor-lights | `harbor-lights-04a-006-game1-plan` (12 deals x 3 arms) | score: nothing 18.4, private notes +3.2 (SE 0.8); misfires 26 against 14 | effect >= +1.6; control 16.5-20.5 | 12 x 2 = 24 | 1.2 |
| 4 | lanterns | `lanterns-06a-006-more-seeds` with the current-rule seeds of 004/005 (12 seeds) | recall +0.08 (SE 0.03); games 2-4 +0.11 | effect >= +0.04 in games 2-4; 0 games out of clues | 12 x 2 = 24 | 1.7 |
| 5 | chess | r2 runs 045-055 for cost metrics; r1 five-seed table (008-040) for arms | match ACPL (Stockfish 10, depth 14): default 138 (CI 126-149), lists 92, lists + coach 78; requests per half-move 1.13-1.22 on r2 | default 115-160; lists at least 23 lower; requests per half-move <= 1.3; refused per 100 half-moves <= 4 | 8 matches x 3 arms = 24 (replicates, unpaired) | 5.8 |
| 6 | holdem | `holdem-04a-006-decision-aid` (24 mixed tables) | EV loss per decision 0.26 plain, 0.03 aided; VPIP 0.73 / 0.41 | plain 0.18-0.34; aided <= 0.10; out-of-turn `act` <= 10 per run | 12 tables | 1.8 |
| 7 | ember-tricks | `ember-tricks-04a-005-reference`, `-003-levers` (seeds 31-33) | points per seat and round: control 0.53, worth at the bid 2.36; hit rate 50% | aided >= control + 0.9; n was 3 seeds, so this row also *establishes* the baseline | 6 x 2 = 12 | 3.1 |
| 8 | tictactoe-teams | `tictactoe-teams-04a-013-team-vs-solo` (25 matches, 75 games) | team share of decided games 57% (44-71%); starter wins 34 of 54; calls ratio 3.4 | team share 40-75%; starter share > 50%; calls ratio 2.7-4.1; `NO_OPEN_PROPOSAL` not above 55 per 25 matches | 25 matches | 3.2 |
| 9 | convoy | `convoy-06a-004-d3-brain-vs-nobrain` (10 runs) | loyal detection 0.88 / 0.93; saboteur wins 5 against 3 of 15 | detection 0.78-1.0; wins: level only (the old effect is not firm) | 10 | 1.8 |
| 10 | morris-teams | `morris-teams-01a-004-solo-vs-engine` (depth 2: 7/2/3 per 12, both arms) | score rate against the depth-2 engine 0.67 | 0.47-0.87 (binomial, n 24); 0 timer forfeits (P104) | 8 runs, 24 games | 0.8 |
| 11 | salt-market | `salt-market-04a-006-v2-brain-vs-nobrain` (8 seeds) | gain over idle 0.223 / 0.228 (a null result) | control 0.17-0.28; `OPEN_OFFER` handling as built (P140) | 8 x 2 = 16 | 2.6 |
| 12 | blind-bid | `blind-bid-04a-001-smoke` only (v2 series unmerged) | none firm; shade ratio 0.57-0.73 of the estimate | conformance and guardrails only; the new series is the first baseline | 8 x 2 = 16 | 0.5 |
| 13 | liars-dice | `liars-dice-04a-001-smoke`; 002/003 are Opus and Sonnet tables | none firm for Haiku | conformance and guardrails; Opus "8 of 12" is not rerun in the core budget | 4 Haiku matches | 0.8 |
| 14 | whispers | `whispers-06a-007-haiku-defy` (and 003 for the door clock) | structural: all doors pass on the clock, the hold-out procedure ends in bounded time, the guard is not an oracle (LH9) | structural invariants in 3 of 3; counts (rumours, votes) reported, not tested: every old version is n = 1 | 3 | 1.4 |
| 15 | cityofkeys | Act I: `examples/cityofkeys-act1-06a-04`; Act II: v12 in `examples/cityofkeys-act2-06a/`; `act2-12a-003` deferred | structural: levels reachable, tribunal fires, target ends the act; cost 0.10-0.13 (Act I), 0.25-0.66 (Act II, 6 agents) | invariants in 3 of 3; cost within +20%; no numeric outcome test (n = 1 per version) | 3 Act I + 3 Act II | 2.4 |

Remarks:

- **Cost figures are measured, not guessed**: Quarry 0.034 USD a run (24 runs, 0.81), econ-lab 0.018 (16 runs, 0.28), Harbor Lights one-game
  0.05 (36, 1.84), Lanterns 0.07 (16, 1.14), Hold'em 0.15 a table (24, 3.59), chess 0.14-0.36 a four-game Haiku match, tic-tac-toe 0.13 a
  match (25, 3.22), Convoy 0.18, Salt Market 0.165, Whispers 0.20-0.47, the 12-agent Act II 3.68.
- **City of Keys Act II** resumes from a snapshot of the old engine (`examples/cityofkeys-act1-06a-04/snapshot-L7.json`). Either a snapshot
  migration is written, or a new Act I base is recorded on the new architecture and declared as an intended change (decision D8). The
  12-agent run waits, by the owner's standing rule, until 6 agents work.
- **Strong models** (Sonnet, Opus: morris 16.52 USD, chess 19.70, liar's dice 10.55, Hold'em 6.17, econ-lab 5.02 in the old data) are not
  part of equivalence. Every one of those results is n = 1-4. An optional block of 25 USD repeats only the direction checks that the paper
  most relies on.
- **Old runs that are not baselines**: all runs on r1 where r2 changed the count metrics (chess, Hold'em, liar's dice requests), all stopped
  and rate-limited series (`*-stopped`, `*-rate-limited`), tic-tac-toe 006-008 (voided by the output cap, P94),
  `morris-teams-02a-002-solo-forfeit-bug`.

### 5.3 Priority order and budget

| Step | Content | Why here | Haiku USD |
|---|---|---|---:|
| 0 | rule replay, seeded goldens, scripted smoke, all 15 games | free; finds rule regressions before any spend | 0 |
| 1 | noise floor (5 replicates: quarry, econ-lab, harbor-lights, lanterns, chess) and bridge on the old architecture (quarry 12, econ-lab 12, harbor-lights 12, chess 4) | sets the margins and separates model drift from the rewrite | 5.0 |
| 2 | quarry, econ-lab, harbor-lights, lanterns | the four firm paired effects, cheapest signal per dollar; they exercise brain, deals, teams and retro | 4.6 |
| 3 | chess, holdem, ember-tricks | the cost and context telemetry anchors (r2 counts), the decision aids | 10.7 |
| 4 | tictactoe-teams, convoy, morris-teams, salt-market | teams, consensus, engine opponents, a null result | 8.4 |
| 5 | whispers, cityofkeys, blind-bid, liars-dice | narrative games with Directors; structural checks; needs the Director API | 5.1 |
| | subtotal | | 33.8 |
| | reserve for exclusions, reruns and 429 losses (about 30%) | | 10 |
| | **cap, Haiku via Anthropic** | | **50** |
| 6 | optional: Sonnet and Opus direction checks; DeepSeek for the gamemaker in step 5 stays small (old Act II runs: cents of OpenRouter spend) | | 25 |

No reporter spend: the new report is computed. For scale: the old runs cost 157.21 USD in total.

### 5.4 Regression against intended change

A **change register** (one file, issue-linked, written before the rerun) lists every deliberate behavioural difference with its predicted
direction. Anything outside it is a regression.

| Observation | Class |
|---|---|
| Stage 0a replay produces another game event or score, not in the register | regression (rules) |
| Seeded draw differs for the same seed and label | regression, unless D3 is decided otherwise |
| Control-arm metric outside tolerance while the bridge on the old architecture is inside | regression (behavioural) |
| Control-arm metric outside tolerance and the bridge moved the same way | model drift; re-baseline, not a regression |
| Firm effect loses its sign or more than half its size | regression until explained; needs a second series before it is accepted as a finding |
| Requests per decision, tokens per decision or cost above the guardrail | regression (runtime), the r1-to-r2 kind of bug |
| A new tool error code, lost turns, cap hits, schema violations | regression |
| Renamed tools and events, Director instead of overseer texts, manifest fields | intended (register) |
| Removal of the moving `random()`; any draw that used it | intended (register), with the affected games named |
| Facts table differs from the old `REPORT.md` | intended; the old draft is not a baseline for anything |
| Async scheduler results differ from turn results | not part of the rerun; an experiment of its own |
| Prompt rewording for clarity | not allowed in the compatibility profile; later as an arm |

Acceptance of the rewrite, scientifically: stage 0 green for all 15 games; steps 2-4 pass their rows; step 5 passes structurally; every
failure is either fixed or entered as a finding with its own follow-up series. The result of the rerun is itself published as `results.json`
per game.

## 6. Telemetry the kernel must emit, without growing

Principle: the kernel emits **few generic observation events with fixed, game-free fields**; every derived number is computed outside by
`@swarmtales/metrics`. No aggregation, no cost table, no report logic in the kernel. Budget: about 120 lines in the kernel, mostly types and
one emit helper.

| Event | Fields | Answers |
|---|---|---|
| `wake` | actor, `reason` (`news` \| `tool-answer` \| `timer` \| `schedule` \| `retry` \| `director`), `causeSeq[]` | why was a model called at all (the r1 bug was 15% of the cost and invisible without this) |
| `request` | actor, `hash` of the payload, `sawSeq`, `contextTokens` (estimate before the call), `contextMessages`, `tools` offered, `attempt` | what the model saw; context growth; L2 replay key |
| `response` | request ref, `modelEcho` (id the provider returned), `providerRequestId`, `stopReason`, `latencyMs`, `ttftMs` when streamed, tokens `{input, output, thinking, cacheRead, cacheWrite}`, `costUsd`, `priceTable` version | spend; drift signal; cap hits (P52, P94) as a field instead of a side script |
| `request_failed` | request ref, `class` (`rate-limit` \| `overload` \| `refusal` \| `timeout` \| `invalid`), status, `retryInMs`, final or not | lost turns (P431), safeguard refusals (P44) |
| `tool_call` / `tool_result` | as today, plus `errorCode` as a field (today parsed from text), `stale: commitSeq - sawSeq`, `endsTurn` | tool error rates per code; staleness under async |
| `context_edit` | actor, `kind` (`reset` \| `compact` \| `drop`), tokens before and after, `policy` | context management as a recorded treatment (P340-P344) |
| `turn_end` | actor, `outcome` (`acted` \| `no-tool` \| `cap` \| `error` \| `skipped`), tool calls in the turn | turns that did nothing |
| `clock_tick` | logical time | L1 replay under async |

Design notes:

- **Costs are computed from tokens and a versioned price table** in the model plugin, with the table version in the event, so a later price
  change does not rewrite history and totals can be recomputed.
- **Generic metrics** shipped by `@swarmtales/metrics` for every game: cost, requests and output tokens per decision, context tokens (mean,
  max, growth per turn), wake reasons share, tool errors per 100 calls by code, cap hits, lost turns, latency percentiles, staleness
  percentiles, actions per actor per logical minute. "Per decision" needs one thing from a mechanic: it marks its decision events
  (`decision: true` in the event definition).

## 7. Threats to validity specific to LLM agent games

| Threat | Seen in the repository | Mitigation in the design |
|---|---|---|
| **Model drift behind a fixed id; aliases** | `haiku` and `sonnet` are aliases to constants; only the requested id is logged | `resolvedId` in the manifest, `modelEcho` per response; interleaved run order; the bridge and a small **sentinel battery** (fixed recorded turn inputs replayed to the model, action distribution compared with the stored one) at the start of every experiment; results state the calendar window |
| **Unrecorded sampling parameters** | no temperature or seed anywhere; thinking level only when overridden | every parameter a value or `provider-default` in the manifest |
| **Context management as hidden treatment** | r1 against r2 (15% of requests); `-fresh` doubles Haiku's thinking and does not change Sonnet's (P340, P343); cache writes half the cost (P344) | `contextPolicy` and `scheduler` are manifest fields and part of the comparability key; `context_edit` and `wake` events; a golden test that forces a revision bump |
| **Output cap and silent no-ops** | 66 of 68 gamemaker turns ended in thinking (P52); about 680 turns of Gemma and GLM (P94) | `stopReason` and `turn_end.outcome`; cap-hit rate as a default guardrail and exclusion rule |
| **Rate limits as treatment** | P431; the lab's judge batch hit the concurrency limit while runs were live | concurrency in the manifest; `request_failed`; lost-turn guardrail; runner-level cap; randomised order so losses do not align with an arm |
| **Prompt leakage of the design** | arm names in story ids; a refusal that fetched the legal list turned the default arm into the `-moves` arm (LH13); `BRAIN_DISABLED` refusals told seats about the other arm (P138); a filter as oracle (LH9) | prompts hashed and written as events; a **leak lint** over all resident-visible texts for arm ids, metric names and treatment words; typed Director views; tools of an absent mechanic are not offered at all |
| **Loopholes change what is measured** | LH1-LH17; Sonnet won at the cap by a last-move grab (LH17) | loophole candidates per run as checked claims; a loophole found in an arm is an exclusion or a declared deviation, never silently "fixed" between seeds of one series; rule changes close the experiment and open a new spec |
| **Rules changed inside a series** | Harbor Lights strike rules twice, Convoy damage limit, chess cap 80 against 160 (041 against 056: ACPL 63 came from games cut at move 40) | the game hash is in the manifest; the runner refuses to add a run with another hash to an experiment |
| **Training-data familiarity** | chess openings, textbook dominant moves in one-shot games (checklist 35), 5/5 ultimatum splits | prefer generated worlds (deals, grids) to famous positions; report ceilings; a known-habit opponent as positive control (findings optimization 7) |
| **Ceiling and floor** | tic-tac-toe 3x3 all draws; Opus cooperates fully in the econ lab (P436) | automatic flag when the control is at a bound; such a metric cannot be primary |
| **A reference that is not a strength measure** | Hold'em's one-street baseline ranks aided Haiku above Opus while Opus wins 19 points a game (P438) | a reference metric is validated against outcomes with a stronger model before it is used as primary |
| **Pseudo-replication** | permutation over games inside matches; residents of one run counted as n | the spec names the unit; hierarchical resampling is the default |
| **Seed-set luck** | Lanterns control moved 0.65 to 0.78 between two seed sets (P230) | blocks drawn by the planner from a registered range, not picked; noise floor; 8+ blocks |
| **Selection and forking paths** | metric chosen after the run; best-of-N possible (signing paper, "Selection"); a deleted Opus run directory (chess README) | preregistration with run count; run registry; `purpose` in the manifest; nothing from an experiment is deletable from the registry |
| **Judge bias and shared errors** | the label classifier and the blame judge are Haiku judging Haiku; "read by hand" unblinded | 3.5: redacted views, two judges, agreement, calibration set, leak test |
| **Director influence** | "A helper amplifies its prompt" (checklist 11); DeepSeek wrote 81 notes, Sonnet 0 (v08 against v10) | a Director is an actor in the manifest with model, prompt hash and dials; its actions are events with their own metrics (notes per minute, share of residents addressed); Director model is a factor, never a constant left unnamed |
| **Safety behaviour of the provider** | safeguard refusals in bursts in long contexts (P44); "duplicating model outputs" block (P55) | refusals classified in `request_failed`; refusal rate as a guardrail; never silently retried without an event |
| **Latency as an advantage (async)** | not yet seen; follows from the owner's decision | 2.3: causal stamps, rate caps, actions per actor reported, turns as the reference scheduler |

## 8. Open decisions

**D1. Reference scheduler for confirmatory experiments.** Options: (a) seeded turns only; (b) either, declared in the spec; (c) async as
default. Recommendation: (a) until the noise floor of the async scheduler is measured on three games, then (b). Reason: order variance adds
to an already large sampling variance, and every old baseline is turn-based.

**D2. One behaviour revision or a structured key.** Options: (a) keep a single integer; (b) integer for the kernel plus versions of
scheduler and context policy, and a computed comparability key. Recommendation: (b). Reason: the r2 series showed three separate treatments
(wake rule, context reset, board format) that one integer cannot tell apart.

**D3. Keep the random generator and stream labels bit-compatible with the old engine.** Options: (a) keep Mulberry32, FNV `seedFrom` and the
labels; (b) new generator. Recommendation: (a). Reason: old and new runs stay pairable on the same deals and stage 0b becomes a free exact
test; Mulberry32 is adequate for game data. Cost: label strings become part of a mechanic's public contract.

**D4. Where sampling parameters come from.** Options: (a) leave provider defaults and record `provider-default`; (b) set explicit values
wherever the model accepts them. Recommendation: (a) for the rerun (equivalence with the old runs), (b) as an option per actor afterwards.
Reason: changing defaults during the rerun would confound it.

**D5. May a model write any part of a run report?** Options: (a) no model at all; (b) checked typed claims plus a quarantined commentary
file; (c) the current draft with a human review. Recommendation: (b). Reason: loophole spotting by a model has paid off (LH13 came from a
reporter draft), and (c) produced run 051.

**D6. Preregistration and anchoring: required when.** Options: (a) never required; (b) required for `confirmatory`, with an external anchor;
(c) for every live run. Recommendation: (b). Reason: (c) would end the cheap exploratory loop that found most lessons; ISTAnt cannot do
without it. Publishing an anchor is an action outside the repository and needs the owner's go each time, or a standing rule.

**D7. Compatibility profile with word-for-word prompts for the rerun.** Options: (a) port prompts verbatim first, improve later as arms; (b)
rewrite prompts during the port. Recommendation: (a). Reason: without it the rerun cannot tell a kernel regression from a prompt effect.
This constrains the DX work for some weeks; that tension should be decided, not discovered.

**D8. City of Keys Act II base.** Options: (a) migrate the old snapshot format; (b) record a new Act I base on the new architecture.
Recommendation: (b), with three Act I recordings instead of one. Reason: a migration is code written for one file, and every Act II result
so far hangs on a single Act I history.

**D9. Rerun budget and the bridge.** Options: (a) 50 USD cap with bridge and noise floor; (b) a minimal 15 USD rerun of steps 2-3 only; (c)
plus 25 USD of Sonnet and Opus. Recommendation: (a), then (c) only for claims that go into a paper.

**D10. Results files in the repository or beside it.** Options: (a) run folders stay in the code repository (today; City of Keys runs were
already removed once "to keep the repository small"); (b) a data repository or release archive with DOIs, the code repository holds indexes
generated from `results.json`. Recommendation: (b). Reason: citable data, small clone, and the new repository starts clean anyway.

**D11. Is "Story" one kind of Game?** The brief asks for a recommendation. From the science side: yes, and the split is useful. A *game*
with a declared outcome metric can be an experiment unit; a *story* (City of Keys, Whispers) has structural invariants and narrative output
and should be typed as a Game of kind `story` whose results are reported as invariants and counts, not as effects.

## 9. Risks

1. **Second-system effect in the science layer.** Six packages are proposed. Mitigation: `stats` and `metrics` are small pure libraries;
   `experiment` ships first with paired blocks, one estimator and the cost cap, nothing else, and grows only when a real series needs it.
2. **Friction kills exploration.** Most lessons came from fast single runs. Mitigation: `smoke` and `exploratory` runs need no spec; only
   the words "result" and "finding" need an experiment.
3. **The rerun fails equivalence for reasons nobody can separate.** Mitigation: the compatibility profile, the bridge and the free stage 0;
   without the bridge this risk is high.
4. **Model drift between now and the rerun** makes every old number a moving target. Mitigation: the bridge; accept that the new baseline
   replaces the old one rather than matching it.
5. **Prompt-hash churn.** Every small text edit changes the comparability key and fragments the data. Mitigation: prompts frozen during an
   experiment by the runner; the key ignores declared cosmetic parts (a mechanic marks them) only with a test that proves they are not sent
   to a model.
6. **Telemetry grows the kernel.** Mitigation: the eight events of section 6 are the whole list; a line-budget test for the kernel exists by
   the owner's decision; new observations go into plugins.
7. **Async analysis is new ground.** Causal stamps are necessary but nobody has analysed such a run here. Mitigation: D1, and one small
   turns-against-async experiment before any game depends on it.
8. **ISTAnt on an unproven platform** would hurt credibility more than a late ISTAnt. Mitigation: known-effect arm and template camera
   first, both free.
9. **Old logs do not replay** because old events are game-shaped in two generations (legacy flat events and core events,
    `packages/legacy-log`). Mitigation: adapters per mechanic for the baseline series of section 5.2 only, not for all 655 runs.

## 10. Proposed first issues

1. **Run manifest schema and hash in the genesis**: `@swarmtales/manifest` with Typebox schema, canonical hash, `comparabilityKey`.
2. **Fix prompts before genesis**: build system prompt and tool list per actor in a preparation step; `prompt_fixed` events; prompt hashes
   in the manifest.
3. **Record sampling parameters and thinking level for every actor**: value or `provider-default`; capability table in the model plugin.
4. **Kernel telemetry events**: `wake`, `request`, `response`, `request_failed`, `context_edit`, `turn_end`, `clock_tick` with fixed fields;
   kernel line budget unchanged.
5. **Labelled random streams only**: port `random.ts` bit-compatible; remove the moving `random()`; export `seededAspects` per mechanic.
6. **Behaviour-revision golden test**: scripted-model golden run that fails `check` when the event stream changes without a revision bump.
7. **`@swarmtales/replay` L1 and seeded-world goldens**: replay a log through mechanics (adapter for old core-story logs; chess and Quarry
   first); 100 seeds per game against the old engine's draws.
8. **`@swarmtales/metrics`**: `MetricDefinition`, extractor, generic cost and context metrics; `absent` instead of zero; chess, quarry,
   econ-games, clue-grid and harbor-lights export their metrics and decision events.
9. **`@swarmtales/stats`**: paired and hierarchical bootstrap, sign-flip permutation, effect sizes, equivalence test, power by simulation;
    tests against known values.
10. **`@swarmtales/experiment` v0**: spec schema, planner with randomised interleaved order, runner with cost and concurrency caps,
    registry, `results.json` and `values.csv`; runs index per game generated from them.
11. **Computed run report**: facts table from metric definitions; regression test with chess run 051 (must print 299 half-moves).
12. **Typed claims for model commentary**: count, order, quote and absence claims checked against the log; `COMMENTARY.md` quarantine; trap
    tests from run 051 and whispers-06a-003.
13. **Preregistration command and external anchor**: `swt experiment register`; `confirmatory` runs refuse a dirty tree or a missing
    registration.
14. **Causal stamps for the async scheduler**: `sawSeq` on requests, staleness on tool results, stale-action policy in the manifest.
15. **Judging plan**: redacted views built by code, two judges, agreement statistics, calibration set format, leak test.
16. **Change register and compatibility profile**: the list of intended behavioural changes; r2 wake rule and context policy as a selectable
    profile; verbatim prompt port.
17. **Rerun specs per game**: one `ExperimentSpec` for each row of section 5.2 with its tolerance as an equivalence margin; plus the noise-floor and bridge specs.
18. **Sentinel battery for model drift**: fixed recorded turn inputs, stored action distribution, a check at the start of each experiment.
19. **ISTAnt prerequisites**: typed Director views, template camera, known-effect scripted colony, export loader check against the ISTAnt
    data format; data release layout (archive, datasheet, `CITATION.cff`, data licence).
