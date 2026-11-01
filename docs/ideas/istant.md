# ISTAnt in swarmtales: a 1:1 replica of the ant grooming experiment

Status: **go from Flo on 2026-11-01** (build the setup, following the paper 1:1). Not built
yet. This paper fixes the protocol before code exists.

## Why

Francesco Locatello's group at ISTA (with Sylvia Cremer's social immunity group) published
*Smoke and Mirrors in Causal Downstream Tasks* (Cadei, Lindorfer, Cremer, Schmid, Locatello,
NeurIPS 2024, arXiv 2405.17151) with the ISTAnt dataset. It is a randomized controlled trial on real
ants, and the outcome is only available as video. Its finding: an annotation model with high
accuracy can still give a biased treatment effect, depending on how training data is sampled and
which model is picked.

We rebuild the same experiment with LLM agents. The difference is that our engine knows the true
outcome of every frame. So we get the paper's setting plus a ground truth the real experiment
cannot have, and the data in the same shape as ISTAnt, so their pipeline can run on it.

## The original protocol (from the ISTAnt README and code)

Sources: <https://github.com/CausalLearningAI/ISTAnt> (README, `src/data.py`), dataset DOI
10.6084/m9.figshare.26484934.v2.

| Part | Original |
|---|---|
| Unit | A group of three *Lasius neglectus* workers in a small container (28 mm diameter, PTFE walls, no climbing). |
| Roles | One **focal** ant (treated) and two **nestmates**, colour-coded **blue** and **orange**. |
| Treatment | The focal ant's body surface is treated with a suspension of one of **two microparticle types** (~5 µm). There is no untreated control: T ∈ {1, 2}. The paper does not name the particle types in the README. |
| Question | ATE := E[Y \| do(T=2)] − E[Y \| do(T=1)]. |
| Outcome | Per frame, binary: blue grooms focal (Y1), orange grooms focal (Y2). Tasks: each one, their sum, or "any". |
| Duration | 10 minutes per video, 30 fps (the pipeline subsamples by a factor of 10-15). |
| Design | Nine groups per **setup**, both treatments in every setup, placed randomly on positions 1-9 in a 3x3 grid. Five setups over two days. |
| Data kept | 44 videos (24 of T1, 20 of T2); one video discarded (a nestmate's leg stuck during colour-coding). |
| Covariates | setup (1-5), position (1-9) and grid coordinates (x, y ∈ {-1, 0, 1}), treatment, start hour, day (A/B), crop coordinates, annotator (A/B/C), annotation day and order. Per frame: minute of the experiment. |
| Annotation | Three observers, not involved in the setup and **blind to treatment**, mark start and end frames of behaviours with a tool; output is one `.csv` per video. |
| Analysis | Train an annotation model (frozen vision encoder + MLP) on a subset, predict the rest, estimate the ATE. Subsets: one setup (`experiment`, 1/5), one position (`position`, 1/9), random, and "easy" variants (4/5, 8/9). Estimators: difference in means (`ead`) and AIPW with covariates (position x/y, experiment minute). Reported: treatment effect bias (TEB) = ATE from predictions − ATE from annotations. |

## The mapping

| Original | swarmtales |
|---|---|
| Container of three ants | One **colony**: three residents in a closed `nest`, no channel to any other colony. |
| Focal, blue, orange | Fixed roles per colony. The residents play ants (in-fiction worker ants, no names, no human goals). |
| Microparticles type 1 / type 2 | The `contamination` mechanic applies one of two **particle types** to the focal ant at minute 0. Each type has its own cue: what the focal ant feels on its body, and what a nestmate perceives on contact or nearby. The texts are fixed in the story, not written by a model. Whether the LLM ants react differently is exactly what we measure. |
| Randomization | `drawLot` (seeded) assigns the treatment within each setup so both types appear in every setup, as in the original. |
| Setup, 3x3 grid, day, hour | Kept as recorded covariates: a setup is one batch of nine colonies started together; position and grid coordinates are assigned at random; "day" and "hour" are the real start time. Optional nuisance (see open questions): the position changes something small, like light in the original. |
| 10 minutes at 30 fps | A fixed number of **ticks** per colony (proposal: 60 ticks, one tick = 10 in-fiction seconds). In every tick each ant picks one action. |
| Grooming | The `care` tools: `groom(target)`, `selfGroom`, `move(direction)`, `rest`, `antennate(target)`. Grooming runs until the ant does something else, so it has a start and an end tick like the annotated behaviours. The tool calls are the **engine ground truth**. |
| Video | A **camera** overseer writes one short scene per tick from the engine state (positions, contacts, movements), in the plain style of a camera, without behaviour labels and without the treatment. This text is the high-dimensional observation. Lesson 11: the camera never sees the treatment. |
| Three blind human observers | Three **annotator** overseers (A, B, C: same task, different prompts or models) read only the camera text and mark start and end ticks of "blue grooms focal" and "orange grooms focal". They are blind to treatment. Their output is the "annotation" as in the paper; the engine ground truth is extra. |
| Discarded video | Colonies whose run broke (model error, refusal, timeout) are dropped with the reason recorded, never silently. |
| Annotation model + ATE | `pnpm istant:analyse`: text encoder embeddings per tick + a small classifier trained on the same subsets (setup, position, random, easy variants), then `ead` and AIPW, TEB against both the annotations and the engine truth. |

## Data export (same shape as ISTAnt)

- `experiments_settings.csv`: one row per colony with the original columns (set, position, pos_x,
  pos_y, treatment, hour, day, annotator, annotation day, annotation order), plus `seed`,
  `model`, `dropped_reason`.
- `annotations/<colony>.csv`: start and end tick per behaviour, one file per annotator.
- `truth/<colony>.csv`: the same format from the engine tool calls.
- `frames/<colony>.jsonl`: the camera text per tick (our "video").
- Raw run data as usual under `stories/istant/runs/<run>/` with `events.jsonl`.

## Scale and cost

The original has 5 setups x 9 colonies (44 kept). We copy that. Rough count with 60 ticks:
45 colonies x 3 ants x 60 ticks = 8,100 resident calls, 2,700 camera calls, 3 x 2,700 annotator
calls. With Haiku and short contexts that is an estimate of 20-40 USD, about half with the Batch
API for the annotators. To be checked against current prices before the run. **Pilot first:** one
setup (9 colonies), well under 10 USD, to see whether grooming happens at all.

## Build plan

1. Story `stories/istant/` (`story.ts`, `README.md`), registered in `stories/index.ts`.
2. Mechanics `contamination`, `care`, `nest` (tick loop, isolation of colonies).
3. Overseers `camera` and `annotator`; batch runner for a setup of nine colonies; export.
4. Analysis script (`ead`, AIPW, splits, TEB) with offline tests on synthetic logs.
5. Pilot (one setup), run report, then the full five setups.

Where it is built (the old engine on `main` or as plugins on the rewrite branch) is Flo's call; see
the thread of 2026-11-01.

## Open questions

1. **Cue texts of the two particle types.** The paper does not name its particles. Proposal: two
   neutral, physically plausible cues of different strength (for example "fine dry dust" and
   "a sticky film with a sharp smell"), so a difference is possible but not forced.
2. **Does the focal ant know?** Real ants feel the particles. Proposal: the focal ant gets its body
   cue, with no explanation and no rule; nestmates only get the contact cue.
3. **Position nuisance.** The original grid may matter through light or vibration. A 1:1 copy keeps
   position as a covariate; a small position effect (for example a warmer corner) would make the
   paper's position split meaningful.
4. **Annotator diversity.** Three prompts on Haiku, or three models (one via OpenRouter)?
5. **Ticks.** 60 ticks of 10 s or 30 ticks of 20 s.
