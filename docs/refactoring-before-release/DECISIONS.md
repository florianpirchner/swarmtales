# DECISIONS: what the agent team decided for the rewrite

> **Carried from the old platform.** This document was written before the rewrite and is kept as it was, except for
> its links. Paths into code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do
> not exist on this branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

## 1. How to read this

- **Status: decided** by the agent team (decision panel) on the owner's delegation, 2026-11-14. The owner asked that the agents decide everything that was open, so that development starts without another round of questions.
- **What it covers.** The fifteen decisions D1 to D15 of [`REWRITE.md`](REWRITE.md) section 6, the 49 open decisions of the four role papers, the README of the rewritten `main`, the licence policy, and where the rewrite happens (section 8, reopened by the owner on 2026-11-14 and decided here: in this repository, not in a new one).
- **What it does not reopen.** The owner's other fixed decisions in [`BRIEF.md`](BRIEF.md), plus one received on 2026-11-14: **no GPL and no other copyleft licence anywhere, ever** (dependencies, tools, dev tools, data).
- **Precedence.** `BRIEF.md` (except its repository line, which section 8 replaces at the owner's request) over this file, this file over `REWRITE.md`, `REWRITE.md` over papers 01 to 05. Section 7 lists the edits that bring `REWRITE.md` in line.
- **Reopening.** A decision changes only through an issue that brings new evidence (a measurement, a failed test, a licence fact). Taste is not evidence. Where a decision waits for a measurement, the rule, the default and the exact condition that changes it are written here, so the measurement settles it.
- **Deviations** from a recommendation are marked **Deviation**. Section 6 lists the actions that stay with the owner.
- Nothing was executed for this paper (the container has no installed dependencies). Numbers come from reading the repository and from `git log`.

## 2. Decisions D1 to D15

D1, D3, D4 and D9 carry a rule with numbers and come first, in prose; the other eleven follow in one table.

### D1. Mechanic API: head and body are the model; the one-object form is sugar only if the spike passes

- **Decision.** Option (a). `PluginInstance` is head plus body. The spike (issue 14) decides only whether a
  one-object `defineMechanic` ships as sugar on top.
- **Reason.** 39 mechanics, the README generator and the composed game schema prove head and body. Nothing proves the
  inferred one-object form on a large mechanic, and today's lint already needs a 12 GB heap (`package.json:15`).
- **The rule, so nobody has to ask again.** The spike is time-boxed to two issues. It **passes** only if all four hold
  on `channels` (2247 lines) and `chess`: (1) the head is written with no explicit type argument and no cast;
  (2) `tsc --noEmit` on the two packages takes at most 1.5 times what the head-and-body form takes on the same machine,
  and a completion inside a tool handler answers within 2 seconds; (3) a wrong service name and a wrong event payload
  each give an error of at most 15 lines that names the property; (4) lint runs with a 4 GB heap.
  - Pass: the sugar ships, new mechanics and sample 5 use it, ported mechanics stay head and body until after 1.0.
  - Fail, or not finished inside the time box: no sugar at 1.0 (option c). Head and body with one registration site;
    sample 5 is written in that form. The question returns only with a new spike result.
- **Rules out.** The one-object form as the only form; converting ported mechanics before 1.0; tutorials written
  before the spike verdict.
- **First consequence.** Issue 14 carries the four criteria as its "done when"; issue 22 depends on it.

### D3. CI: GitHub Actions with the full check required, from the first commit

- **Decision.** Option (a). Checks required on `develop` and `main`: typecheck, lint, tests, layer check, budget tests,
  TSDoc rule, licence gate, sign-off check. Until the owner has switched Actions and branch protection on (section 6),
  option (b) applies automatically: the pull request body carries the recorded result of the local `pnpm check`.
- **Reason.** Limits that no machine enforces are conventions. Verified: today only the `docs` job runs by itself
  (`.github/workflows/ci.yml`); the full `check` job is manual.
- **Rules out.** A check that needs more than a standard hosted runner. The check has a budget: at most 10 minutes and
  a 6 GB heap. A lint that needs 12 GB is a defect on the new `main`.
- **First consequence.** Issue 13 no longer "depends on D3"; it gets the time and memory budget as its "done when".

### D4. Budget and stop rule, with numbers

- **Decision.** Option (a), with the numbers below. They are the budget that kill criterion 1 doubles.
- **What was measured** (`git log` of `main`, 2026-11-06 to 2026-11-13; the clone holds 56 commits):

| Fact | Value |
|---|---|
| Commits on `main` | 56 on 5 active days |
| Pull requests | #114 to #155: 42 in 8 calendar days, about 5 a day, about 8 per active day |
| Commits that touch source (`.ts`, `.tsx`) | 35; changed source lines: median 104, third quartile 296 |
| Largest steps | a new game with its mechanic: 1100 to 1500 lines; the viewer: 7276 lines |
| Working mode behind these numbers | no challenger, no TSDoc rule, no CI gate, run data in the same pull requests |
| Agent token use | not recorded anywhere; the `usage.json` files hold the spend of the played models only |

- **Volume of M0 to M2,** from today's sizes: kernel at most 1500 code lines, the rest of the engine at most 2600,
  contracts about 1200, testkit 746, `grid-game` 513, `draft-rounds` 816, `econ-games` 769, `strategy-brain` 537,
  models 555, the computed part of the reporter about 600, CLI slice about 500. About 10,300 source lines, with tests
  at today's ratio of 0.74 about 18,000 lines, plus tooling and oracle work in M0. `packages/chain` (583) and the
  viewer are carried and do not count.
- **Issue size rule.** An issue changes at most 400 hand-written lines (source plus tests; generated and carried files
  do not count). That is above the measured third quartile and small enough for a challenger. A larger issue is split
  before work starts.

| Budget for M0 to M2 | Number | Kill criterion 1 fires above |
|---|---|---|
| Issues (M0 18, M1 18, M2 14) | **50** | **100** |
| Agent tokens, all kinds, cache reads included (6 million per issue: builder 3.5, challenger 1.5, rework 1.0) | **300 million** | **600 million** |
| Agent cost, where sessions are billed per token (taken from the sessions' usage reports) | **750 USD** | **1500 USD** |
| Live model spend (noise floor on old and new code, two paired series) | **10 USD**, inside the 50 USD rerun cap | not a kill number; a run stops at its own budget |
| Expected duration, at three merged issues per working day | 17 working days | reported, not a kill number |

- **The condition that changes the numbers.** The 6 million tokens per issue is an assumption. After the first ten
  merged issues on the new `main`, the median of their recorded tokens, `m`, replaces it **once**: if `m` is at most
  6 million, the table stands; if it is between 6 and 9 million, the token budget becomes 50 times `m` and the cost
  budget moves in proportion; above 9 million the budget is capped at 450 million and 1125 USD and the kill criterion
  applies as it is. The issue count does not move. The recalibration is recorded in an issue.
- **Rules out.** Raising a budget after it was crossed; counting a split issue as one; work without a token record.
- **First consequence.** Issue 12 records tokens (input, output, cache read, cache write), wall time and changed
  lines per issue in a table in the repository; a new issue after the tenth merge does the recalibration.

### D9. Game frame `match`

- **Decision.** Option (a), with the decision rule fixed now. After tic-tac-toe, quarry, econ-lab and liar's dice are
  ported as they are, `match` and `Ruleset` are built on those four in at most six issues. The frame is **adopted** for
  the other nine games only if (1) all four match their oracle on it, (2) the four games on the frame, the frame
  included, have fewer source lines than the four mechanical ports, and (3) Salt Market is written out as a `Ruleset`
  in which no ruleset owns a timer or a job. If one fails, the nine games are ported as they are and the frame
  waits until after 1.0.
- **Reason.** Seven turn bugs fixed one game at a time speak for it; three games it may not fit speak against it.
- **Rules out.** Building `match` before M4; porting a game twice, except the four. **First consequence.** One M4
  issue "frame verdict" with the three criteria.

### D2, D5 to D8, D10 to D15

| # | Decision | Reason | Rules out | First consequence for the issue list |
|---|---|---|---|---|
| D2 | Option (a), one variable at a time: kernel first (games, prompts and tool names as they are), then the game frame, then prompts | a failure must have one possible cause; the old runs are the only baseline | a pull request that ports a game and also changes its prompts, tool names, wake rule or frame | the issue template gets a field "variable changed" with one value: kernel, frame, prompts or none |
| D5 | Option (a), the list of `REWRITE.md` section 5. "Every game listed for 1.0" means **all fifteen** (thirteen tabletop games, Whispers, City of Keys). A ninth line is added: the licence gate is green | the brief says every game is rerun; a 1.0 without the home game is not the product | everything in the four papers that section 5 does not name, until after 1.0 | a milestone "1.0" with nine checklist issues; other work gets the label `after-1.0` |
| D6 | Option (a), the City slice at M3 | the only early test of Directors, decisions, Human Hand, resume and the exile example | freezing the kernel API before M5 | the slice's oracle file is part of issue 2 |
| D7 | Option (a), before the freeze of the old state (section 8): oracle files for all thirteen tabletop games, Whispers and the City slice; every ported mechanic comes with its test file from `test/mechanics` | byte equality with the old engine was the correctness argument; without oracles the new platform is checked only against itself | accepting a port without its tests | issues 1 to 3 come before the freeze |
| D8 | Option (a): the word is "service"; the contract lives in the provider's `/contract` sub-path; a shared package holds only contracts with two providers today (turn source, game lifecycle); events before calls | a central package is the hub that produced the exile question | `std-contracts`, `@swarmtales/capabilities`, a mechanic importing another mechanic outside `/contract` and `/rules` | issue 11 (layer check) encodes the three import rules |
| D10 | Option (a): the interface from the first commit, `turns` with the "to act" activation as the only production scheduler, `parallel` as a spike of at most three issues plus one sample at M6 | pluggable by the owner's decision; no game needs the parallel mode | fair queue, stale policy, lane release, a `schedulers` package | issue 20 as written; the envelope has `basis` from issue 16 |
| D11 | Option (a): the four firm effects keep their sign (quarry, econ-lab, harbor-lights, lanterns) and the chess request counts hold; every other game sets a new baseline | fifteen equivalence rows cannot be passed by a correct port at 8 to 12 seeds; request counts need no chess engine (section 5.5) | repeating a rerun until it passes; each series runs once at its planned seed count | the rerun plan (games, arms, seeds, metric, pass rule) is committed before the first live run |
| D12 | Option (a), now. **Deviation** in two points, both forced by new input from the owner: Stockfish is not "kept outside every package", it is **replaced** (section 5.5); and the rewrite happens in this repository (section 8), so there is no rename and no archive. Run data goes into a separate repository `swarmtales-runs` under Apache 2.0 | cheap before a public launch, awkward after it; one licence for everything | a second licence for prompts, texts, docs or data | issue 7 is split in two: licence files and headers; the licence gate with the third-party inventory |
| D13 | Option (a). A code line is a non-blank, non-comment line of a `.ts` file under `src/`, tests excluded. Two tests: kernel at most 1500, engine total at most 4100 | a raw-line budget would punish the TSDoc rule | meeting the budget by moving code next door; a cap on the number of exports (paper 01 asked for 40; nobody counted today's) | issue 11 uses one counting function for the budget tests and the ESLint limits |
| D14 | Option (a): ported games keep their old prompts and tool names until their baseline is reproduced or newly set on the new platform; new games get generated briefings | otherwise a prompt effect and a kernel regression cannot be told apart | generic tool renames (`castBallot`) and reworded refusals in ported games before that point | the port issue template has the line "prompt texts and tool names byte-identical: yes or no" |
| D15 | Option (a): Developer Certificate of Origin 1.1 with a `Signed-off-by` line on every commit; contributions come in under Apache 2.0 (section 5 of the licence); the agreement in `CONTRIBUTING.md` is not carried | a relicensing agreement fits a source-available project; the sign-off also makes each contributor state the right to submit, which the no-copyleft rule needs | a CLA and a CLA bot | a script in the check verifies the sign-off; agent sessions commit with `git commit -s` under the owner's identity |

### Decisions that `REWRITE.md` left implicit

| # | Question | Decision | Reason |
|---|---|---|---|
| E1 | Is the "settled by the merge" list confirmed? | Yes, all seven: `tick`; no `kind`; "experiment"; the Director shape of paper 04; `script` stays a mechanic; `roster` is a small mechanic the sdk adds; "referee" | each follows from a resolved contradiction in the challenge |
| E2 | Who may open an issue? | Any agent, for M0 to M6 work that this file or `REWRITE.md` covers. A new game, a new mechanic idea or anything `after-1.0` needs the owner's go | "brainstorm before building" stays for design; engineering chores never needed a go |
| E3 | Who merges? | Builder opens the pull request to `develop`; a challenger on another model approves; the builder squash-merges on a green check. `main` moves only at milestone tags, by the milestone review | the owner's standing approval for merges, carried over |
| E4 | How many at once? | At most three open pull requests | generated files conflict otherwise |
| E5 | Environment names | `SWT_*`, no alias for `ARENA_*`. Issue 8 first tests that the cloud runtime leaves `SWT_ANTHROPIC_API_KEY` intact; if it strips it, the name becomes `SWT_CLAUDE_API_KEY` | the runtime strips `ANTHROPIC_API_KEY` today (`CLAUDE.md`) |
| E6 | Number of library packages | At most twelve until three games run; a folder becomes a package when a second consumer needs it alone | the challenge's rule, binding for all papers |
| E7 | Tests | Tests live inside their package. Kernel and sdk keep a mutation gate (the harness is carried); each mechanic keeps its tests; each game has one scripted end-to-end test and one oracle file. Test files have a limit of 600 lines | the brief allows a higher limit for tests; no paper set one |
| E8 | Old lessons and findings | `LESSONS-LEARNED.md` and `CROSS-GAME-FINDINGS.md` are on the new `main` from its first commit (section 8), with run links pointing at the tag `v0-final` | the 238 rows are the design checklist's evidence |

## 3. The open decisions of the four papers

"Implied" means section 2 already decides it. **Dev.** marks a deviation from the paper's own recommendation.

### Paper 01 (architecture)

| # | Question | Decision | Reason |
|---|---|---|---|
| 1 | How the kernel budget is counted | Code lines plus the engine-total test; no export cap. Implied by D13. **Dev.** | the cap of 40 has no measurement behind it |
| 2 | Name of logical time | `tick`. Implied by E1 | "minute" is a game word |
| 3 | Where contracts live | Provider's `/contract`; no `std-contracts`. Implied by D8. **Dev.** | three of its four entries have one provider |
| 4 | Pipeline shape | Fixed named stages. At M1 they are today's stages, unchanged; merging `guard` and `consult` into `review` is not done before M5 | the order carries lessons; a merge changes every hook (D2) |
| 5 | Conflicts in the parallel mode | Accept and record `basis`; no `stale` option until a game uses one | no user |
| 6 | Does `review` hold the lane | Always. **Dev.** | releasing the lane lets the world change under an approved call, for a mode nothing uses |
| 7 | Tick advance in the parallel mode | Commit count, no option. **Dev.** | no wall clock in experiments; an option needs a second user |
| 8 | Sandbox | Trust only at 1.0, said plainly in the docs; serialized boundary and QuickJS when the first third-party plugin exists. **Dev.** | zero third parties today |
| 9 | The City cluster | Recut at M5, Whispers first, under the rule of two. No "port as is" fallback | `mechanics/shared`, which "as is" needs, is deleted |
| 10 | "Story" | Only `Game` in the contracts, no `kind`. Implied by E1 | two formats are the mistake being removed |
| 11 | Runtime revision format | One integer in the kernel; scheduler, driver and prompt identity are fields of the `RunManifest`. The new kernel starts at **revision 3**. **Dev.** | r1 and r2 belong to the old engine; no number may mean two things |
| 12 | Length of a model-facing tool name | At most 64 characters from `[a-zA-Z0-9_-]`, checked at load. No derived alias | the strictest known provider limit |
| 13 | `pi-agent-core` under the driver | Keep through 1.0, if its licence passes the gate at M0; otherwise an own loop on the provider SDKs. Revisit in the parallel spike only | works today; cancellation matters only for the parallel mode |
| 14 | `schedulers` as one package or three | Neither: `turns` is a folder of the engine and counts in the engine total. **Dev.** | one implementation is not a package (E6) |

### Paper 02 (experiment science)

| # | Question | Decision | Reason |
|---|---|---|---|
| D1 | Reference scheduler for evidence | `turns` only, through 1.0 | every baseline is turn-based |
| D2 | One revision or a structured key | One integer plus manifest fields; two runs compare when a named subset of manifest fields is equal, checked by the lab. No `contextPolicy`, no key type. **Dev.** | same information, no new mechanism |
| D3 | Random generator and stream labels | Bit-compatible (`random.ts` carried); the labels are part of a mechanic's contract and appear in its generated README | old and new runs stay paired on the deal |
| D4 | Sampling parameters | Provider defaults, recorded as such, for the rerun; an explicit option per actor after the four effects are reproduced | changing them during the rerun confounds it |
| D5 | May a model write part of a report | Computed facts table; the model draft stays for loophole candidates only, in a section marked unverified. Typed claims after 1.0. **Dev.** | fixes run 051 at no cost; typed claims have no user |
| D6 | Preregistration | Not required before 1.0. The rerun plan committed before the first run (D11) is the record. An external anchor becomes the rule with the first confirmatory study. **Dev.** | an anchoring service for four effects is too much |
| D7 | Word-for-word prompts for the rerun | Yes. Implied by D14 | |
| D8 | Act II base of City of Keys | A new Act I base on the new platform; one recording for 1.0, two more before an Act II comparison is used as evidence. **Dev.** | one suffices to play; three are needed only for a claim |
| D9 | Rerun budget | 50 USD cap on Haiku, 10 USD of it through M2; no Sonnet or Opus runs before 1.0 | D4, D11 |
| D10 | Where results live | The data repository `swarmtales-runs`; the code repository holds indexes. No DOI before 1.0. Implied by D12 | 766 MB under `stories/` today |
| D11 | Is "story" a kind of game | No `kind`. The report shape follows from the metrics a game's mechanics export. Implied by E1. **Dev.** | a label that sets defaults is a format switch |

### Paper 03 (game design)

| # | Question | Decision | Reason |
|---|---|---|---|
| D1 | Where `roster`, `phases`, `score` live | `roster`: a small mechanic the sdk adds unless the game lists its own. `phases`, `score`: ordinary mechanics; `end` and `win` are sugar. Implied by E1 | nothing is loaded by default inside the kernel |
| D2 | Where contracts live | With the provider. Implied by D8. **Dev.** | |
| D3 | One name or two for a ruleset and its game | One name for original games, generic names for traditional rules. The renaming is one mechanical issue at M6, before names are published; folder, package and log names only, never model-facing names | names become public on publish; a rename during a port adds a variable |
| D4 | Ruleset as a mechanic or its own interface | Earned on four games. Implied by D9 | |
| D5 | Is the scripted `script` a Director | No, it stays a mechanic. Implied by E1. **Dev.** | it would reopen a fixed decision (Directors are model actors) |
| D6 | Does "story" stay a word | Yes, for the narrative written from a run and in the product name; not as a kind. **Dev.** | E1 |
| D7 | Is a research protocol a game kind | No: an experiment over any game. Implied by E1 | arms and seeds apply to every game |
| D8 | A third, actor-driven scheduler | No: the "to act" activation of `turns`. Implied by D10. **Dev.** | about 30 lines instead of a scheduler |
| D9 | How far to generalise the City parts | Two-user primitives only, Whispers first. Implied by 01 #9 | rule of two |
| D10 | Tool name clashes | Bare names in the game, a clash is a load error with `as:`, canonical name in the log | a silent alias changes what the model reads |
| D11 | Memory cap behaviour | Refusal stays through 1.0. "Accept and tell the count" is an experiment arm after 1.0. **Dev.** | it changes what a model sees; D14 forbids that in a ported game |

### Paper 04 (developer experience)

| # | Question | Decision | Reason |
|---|---|---|---|
| 1 | The user-facing package | One umbrella `swarmtales` that only re-exports the scoped packages. It exists as a workspace package from M1, so samples use the final import path; it is published at M6 | one install, one import; no logic in it |
| 2 | Shape of `defineMechanic` | Implied by D1. **Dev.** from "one object as the form" | |
| 3 | Where texts live | Inline strings allowed, files optional, every text overridable by key; ported games keep their files. The manifest hashes both | a first mechanic fits one file; D14 holds |
| 4 | YAML and JSON games | First class: the runner loads any game file from M1; taught in sample 2 | a game is plain data |
| 5 | The fake model | `sample` is optional. `--fake` plays from the turn source where one exists, from `sample` elsewhere; conformance warns about a tool with neither. **Dev.** | a legal random move needs the rule engine, which the turn source has |
| 6 | Docs site generator | None before 1.0: Markdown under `docs/` plus the TypeDoc output. VitePress after 1.0, if it passes the licence gate. **Dev.** | no external user yet |
| 7 | Error code format | `SWT-G012` (area letter and number) for load errors, slug in the docs path; refusal codes stay mnemonic | numbers survive renames; models read refusals |
| 8 | Time unit name | `tick`. Implied by E1 | |
| 9 | Hover docs for options | Type-only hovers at 1.0; descriptions reach the generated README, the JSON Schema and `swt mechanic show`. **Dev.** | generated interfaces are one more drift source |
| 10 | Teams and roles | Game-level data in `defineGame`; the sdk writes them into actor attributes at genesis; ids are checked at load with an `SwtError`, not at compile time | removes four copies; compile-time ids are unproven |
| 11 | Fresh agent test | Not a gate. After 1.0 a trend measure on a mid-tier model. **Dev.** | too flaky to block |
| 12 | `swt doctor --online` | Opt-in flag, cost printed first; built at M6 | "is my key valid" is the first failure |
| 13 | Old names in the transition | No aliases | all runs are redone; two vocabularies would stay alive |

## 4. README of the rewritten `main`

**Decision: a landing page of at most 120 lines, with a root `GAMES.md` as the catalogue.** It takes the skeleton of
paper 04, the findings idea of draft A cut to what is re-measured, the building-block table of draft C, and moves the
cards of draft B to `GAMES.md`. A test in the check fails a README over 120 lines.

**Why not draft A as it stands** (the earlier recommendation, 165 lines).

- Its top section states seven findings from the old runs. The brief discards those runs as results. A front page may
  claim only what the new platform has reproduced: two effects at M2, four at M4.
- Its five family tables take 65 lines and repeat per game what a catalogue page holds better.
- It has no code. The developer-experience goal needs a game a reader can run in the first screen.

**Reader order.** Researcher and builder are both served in the first screen: three sentences place the project (an
instrument with a complete record, not a benchmark), then the Hello Game. The curious reader gets one moment and
`GAMES.md`.

| # | Section | Lines | Content | Lands at |
|---|---|---|---|---|
| 1 | Title and claim | 10 | name, one-line claim ("A laboratory for AI agents: games and societies on one engine, every word and every private thought on record"), three sentences: what it plays, what it records, what makes a run citable (seeded world, signed log). A status line until 1.0 | M0 |
| 2 | Hello Game | 24 | the 11-line `defineGame` of sample 1 as a tested include, two commands (`swt run --fake`, then Haiku), one line of expected output, the cost | M1 |
| 3 | The building blocks | 12 | a table of six rows in the new vocabulary: Game, Resident, Mechanic, Director, Human Hand, the log; one sentence on seeds, snapshots and dials | M0 |
| 4 | What we found | 10 | at most four bullets, each a firm effect reproduced on this platform with n, standard error and a link; the date in the heading; a link to `docs/FINDINGS.md`. Until M2 one line that the findings are being re-measured, with a link to the tag `v0-final` | M2, M4 |
| 5 | One recorded moment | 6 | one quote with its `#seq`, from a run on the new platform as soon as one exists | M2 |
| 6 | Choose your path | 10 | four links: build a game, write a mechanic, write a Director (the three first hours), and "reproduce a finding" for the researcher | M0 (targets filled at M1, M3, M6) |
| 7 | The games | 6 | one sentence naming the five families, the count, the link to `GAMES.md` | M1 |
| 8 | Requirements and keys | 8 | Node version (one source: `.node-version`), clone or install, `SWT_*` key names, "keys never reach a log" | M1 |
| 9 | Honest limits | 10 | five bullets: model answers are not seeded; small samples; mostly one model; in-process plugins are trusted code; pre-1.0 API | M0 |
| 10 | Docs | 8 | six links: docs index, glossary, `GAMES.md`, lessons log, related work, contributing | M0 |
| 11 | Licence and citation | 6 | Apache 2.0, `NOTICE`, the name is not licensed (Apache section 6), `CITATION.cff` | M0 |
| | Total | 110 | 10 lines of slack | |

**What moves where.**

| Content of today's README and the drafts | New place |
|---|---|
| One entry per game (rules in brief, one finding, one moment, links) | `GAMES.md`: an overview table generated from the registered games (family, residents, mechanics, Directors, params) plus one hand-written card per game of at most 20 lines, in draft B's card shape |
| Cross-game findings in full, the "three levers" | `docs/FINDINGS.md` (today's `CROSS-GAME-FINDINGS.md`), each row marked "old platform" or "reproduced" |
| "How the agents beat the rules", further moments | `docs/LESSONS-LEARNED.md` and the game cards |
| "What researchers get" (log, chain, snapshots, dials) | `docs/explanation/`; three of them stay as rows of section 3 |
| Tables of mechanics and overseers | generated indexes `mechanics/README.md` and `directors/README.md` |
| The long "For builders" link list | `docs/README.md`, ordered by tutorial, how-to, reference, explanation |
| Install details, CLI overview | the first-game tutorial and `docs/reference/cli.md` |
| Comparison with Concordia, Sotopia, Generative Agents | stays in `docs/RELATED-WORK.md`, rewritten at M6 (language and licence row, "ships two stories", "no `CITATION.cff`" are out of date); the README carries the positioning in section 1 and one link |
| Licence explanation, `LICENSE-FAQ.md` | dropped; `LICENSE`, `NOTICE` and section 11 suffice for Apache 2.0 |

**Taken and dropped.**

| Draft | Taken | Dropped, and why |
|---|---|---|
| A, lab report | the claim line; findings above the fold, as a short dated block of firm results; the grouped game table (into `GAMES.md`); the limits section | seven findings on the front page (from discarded runs, and stale after every series); five family tables (65 lines); four moments (one stays) |
| B, arcade | the card shape with one finding and one moment (into `GAMES.md`); the opening sentence that names the range of games (section 7) | fifteen cards in the README (about 120 lines before the platform is explained; uneven, since several games have no scene yet); the "pick a game" index |
| C, construction kit | the building-block table, in the new words; "a platform, not one game"; the separate catalogue page; "write your own", which becomes sections 2 and 6 | the mechanics matrix in the README (means little before the reader knows a mechanic; generated into `GAMES.md`); the three-levers section (into `docs/FINDINGS.md`); the `defineCoreStory` snippet |

**Rule for the new `CLAUDE.md`:** "The README is the landing page: at most 120 lines, its code block is
an include of sample 1, findings only when reproduced on this platform. A new game adds a card to `GAMES.md`, never a
line to the README."

## 5. Licence policy and CI gate

### 5.1 The rule

The project is 100% Apache 2.0 (brief). **No GPL and no other copyleft licence anywhere, ever** (owner, 2026-11-14).
Copyleft means strong, weak, file-level and network copyleft alike.

**Scope: everything the repositories declare, vendor, bundle or download.** That is every package in the lockfile
(production, development, optional, peer, transitive, platform binaries), every file in the repository, every file a
script or a CI job fetches (engines, model weights, fonts, datasets, word lists), and every GitHub Action a workflow
uses. It applies to the new `main` and `develop`, to the data repository and, from the day of this decision, to the
frozen old state (section 5.5). Outside the scope are the operating system and the general-purpose programs of a developer's or
runner's machine that the repository neither ships nor pins (git, the shell, the editor). This boundary is the
panel's reading of the owner's rule; it is the narrowest one under which work is possible.

### 5.2 Allowlist

A package passes when its SPDX licence expression is satisfied by these ids alone:

| Group | SPDX ids |
|---|---|
| Permissive code | `Apache-2.0`, `MIT`, `MIT-0`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `0BSD`, `Zlib`, `BlueOak-1.0.0`, `Python-2.0`, `Apache-2.0 WITH LLVM-exception` |
| Public domain | `CC0-1.0`, `Unlicense` |
| Data and text inside packages | `CC-BY-4.0`, `CC-BY-3.0`, `Unicode-3.0`, `Unicode-DFS-2016` |

- `A OR B` passes when one side is on the list; the gate records which side is used. Example from today's lockfile:
  `dompurify`, published as `MPL-2.0 OR Apache-2.0`, is used under Apache 2.0.
- `A AND B` passes only when both sides are on the list.
- **Never allowed, with no exception path:** every `GPL-*`, `LGPL-*`, `AGPL-*`, `MPL-*`, `EPL-*`, `CDDL-*`, `EUPL-*`,
  `OSL-*`, `CC-BY-SA-*`, `OFL-*` and any other licence with a share-alike or source-disclosure duty. Also refused,
  because they do not fit an Apache project: `CC-BY-NC-*`, `SSPL-*`, `BUSL-*`, source-available licences,
  `UNLICENSED`, and a missing licence.

### 5.3 The gate

- A script `scripts/check-licences.ts` runs in `pnpm check` and as a required CI job. It reads the installed packages through `pnpm licenses list --json` (no new dependency), so development and transitive dependencies count like production ones.
- It fails on an id outside the allowlist, on an unparsable expression and on a missing licence; the message names the package, the path that pulls it in and the licence.
- The same script checks that every source file starts with `SPDX-License-Identifier: Apache-2.0`, that every `package.json` says `"license": "Apache-2.0"`, and that every workflow `uses:` line names an action from a short list, pinned by commit.
- A vendored file lives under `third_party/<name>/` with its licence text and a manifest row (source, commit, SPDX id); the gate treats the row like a package and fails on a vendored file without one.
- It writes `THIRD-PARTY-LICENSES.md` (name, version, licence, source); a stale file fails the check.
- A new dependency needs an issue that names its licence. The lockfile changes only in a pull request with that issue.

### 5.4 Exceptions

There are exactly two, and neither reaches a copyleft licence.

1. **Wrong or missing metadata.** If the package's own licence file shows an allowlisted licence that its `package.json` does not state, a row in `licences.overrides.json` pins `name@version` to the SPDX id, with a link to the licence file. The row is valid for that exact version.
2. **A permissive licence that is not on the list yet.** An issue quotes the licence text and shows that it has no share-alike or source-disclosure duty; the pull request adds the id to the allowlist. A challenger on another model approves. If there is doubt, the answer is no and the dependency is replaced.

### 5.5 Stockfish and the chess metric

- `stockfish.js` 10.0.2 is GPL-3.0. Verified: it is a development dependency in the root `package.json` (line 101) and `lab/chess-engine.ts` loads it. `REWRITE.md` wanted it kept outside every package; that is no longer enough.
- It is not carried onto the new `main` in any form, also not as an optional download. On the old state it is **replaced before the freeze** (an M0 issue), because the engine runs inside `pnpm check` there (`test/stories/chess.test.ts`) and the frozen state must stay green and runnable.
- The replacement is chosen in [`06-chess-engine.md`](06-chess-engine.md) (Garbochess-JS, `BSD-3-Clause`, one vendored file; fallback `js-chess-engine`, `MIT`). The panel sets only the conditions: the engine, its bindings and any weights or opening data pass section 5.2, and a vendored file follows section 5.3.
- Consequences: D11's chess criterion (request counts) needs no engine. Centipawn-loss numbers from the old runs are not compared with numbers from a new engine; the moves are in the old logs, so the old games are scored again with the new engine once, and that sets the chess baseline.

### 5.6 Contributor terms and notices

- Developer Certificate of Origin 1.1, `Signed-off-by` on every commit, checked by a script; no CLA (D15).
- Contributions come in under Apache 2.0. The pull-request template has one more line: "contains no code or text copied from a source under a licence outside the allowlist".
- A contribution written with a model is welcome; the person who submits it signs off.
- `NOTICE` carries "Copyright 2026 Florian Pirchner and the Swarm Tales contributors" and the statement that the name Swarm Tales is not licensed. Source files carry the SPDX line only.
- Prompts, game texts, docs and run data are Apache 2.0 like the code.
- Fact for the relicensing statement: the 56 commits in this clone have two authors, Florian Pirchner (39) and the owner's agent sessions (17). M0 confirms this on the full history before code is carried.
- The owner has said that the old licence in the git history does not matter to him. The old state keeps its licence until it is deleted; the README of the new `main` says so in one line.

## 6. What only the owner can do

These are actions outside the repository that cannot be undone or that cost money. The panel decides the **timing**;
the **action** needs the owner each time. Everything else in this file needs no further go.

| # | Action | Recommended timing | Note |
|---|---|---|---|
| O1 | Give a standing go for live spending in the rewrite: 10 USD through M2, 50 USD in total, Haiku only | now | a single run stays inside its `--budget` |
| O2 | Reserve the npm name `swarmtales`, the scope `@swarmtales` and `create-swarmtales` | now, during M0 | needs his npm account; a placeholder publish is hard to undo |
| O3 | Freeze and switch (section 8.3): tag `v0-final`, rename the branch `main` to `legacy` on GitHub, accept the push of the new orphan `main` and of `develop`, set `main` as the default branch | when the M0 issues on the old state are merged and `pnpm check` is recorded green (oracles, Stockfish replaced) | his explicit go; nothing is deleted by it. Undone by renaming the branches back |
| O4 | Switch the full check on in GitHub Actions; protect `main`, `develop` and `legacy` (required checks, no direct push, no force push) | with O3 | until then D3's fallback applies. A private repository has a monthly allowance of free minutes; the 10-minute budget is set to stay inside it |
| O5 | Make the relicensing statement: as licensor, he offers the code carried from the old state under Apache 2.0 | root commit of the new `main`, signed off by him | only the licensor can; agents prepare the text in `NOTICE` |
| O6 | Delete the branch `legacy` and the tag `v0-final` | his own plan, after 1.0; not before every row of the save list in section 8.4 is ticked | cannot be undone except from the bundle of 8.4. Deleting the branch alone does not make clones smaller while the tag exists |
| O7 | Add the keys to the environment under the new names (`SWT_ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`); never as CI secrets | start of M2 | tests stay offline |
| O8 | Create the data repository `swarmtales-runs` | start of M2, before the first live run on the new platform | new runs go there at once; the old runs are copied there before O6 |
| O9 | Confirm the Pages settings once the viewer is carried: deploys come from the new `main` | end of M1 | until then the page keeps its last deployment; old runs open with `ref=legacy` |
| O10 | Make the repository public | after the M2 kill check passes; not before | cannot be taken back. The 155 old pull requests, and `legacy` while it exists, become public with it |
| O11 | Register a domain (`swarmtales.dev`) | with O10 | costs money each year; no docs site before 1.0, so not earlier |
| O12 | Publish to npm, tag the release, add `CITATION.cff` | M6, when the 1.0 list holds | publishing cannot be undone after 72 hours |
| O13 | Register the name as a trademark | not recommended before 1.0 | `NOTICE` states the reservation at no cost |

## 7. Changes that follow for REWRITE.md

| Section | Change |
|---|---|
| Status line | "proposal ... the owner decides" becomes "decided on 2026-11-14, see `DECISIONS.md`; where the two differ, `DECISIONS.md` holds" |
| 1, item 3 | add the M0 to M2 budget of D4: 50 issues, 300 million tokens, 750 USD, 10 USD live |
| 3.1 | row "Human Hand ...": replace "(check the cloud runtime constraint first)" by the rule of E5; add a row "Licence gate" |
| 3.2 | define "code line" as in D13; add "no cap on exports" |
| 3.3 | add: the lane is always held in `review`; tick advance in the parallel spike is the commit count; `turns` is a folder of the engine |
| 3.4 | Model: add the four pass criteria of D1 and the default on failure. Game frame: add the three adoption criteria and the six-issue limit of D9. Add: original games get one name at M6 (03 D3) |
| 3.5 | add: a model-facing tool name has at most 64 characters; teams and roles are checked at load |
| 3.7 | add: the kernel revision starts at 3 and is one integer; the rerun plan is committed before the first run; 10 USD through M2; one new Act I base for 1.0; replace the chess sentence by section 5.5 (old games scored again with the new engine) |
| 3.8 | add the README decision of section 4 (120 lines, `GAMES.md`, findings only when reproduced); `sample` is optional; the umbrella package exists from M1; no docs site before 1.0 |
| 3.9 | add: trust only at 1.0 is decided (01 #8) |
| 3.10 | Drop row: add `stockfish.js` and `lab/chess-engine.ts` in their present form, `LICENSE-FAQ.md`, the contributor agreement. Carry row: add the mutation harness gate for kernel and sdk (E7) |
| 4, M0 | old state: "replace `stockfish.js` by the engine of paper 06" before the freeze. New `main`: add the licence gate, `THIRD-PARTY-LICENSES.md`, the sign-off check, the README skeleton with its line test; replace "token and time logging" by the record of D4 |
| 4, M2 | add: the first findings block and the recorded moment enter the README; the data repository receives the runs |
| 4, M4 and M6 | M4: `GAMES.md` complete for the tabletop games. M6: rename of original games, `swt doctor --online`, parallel spike of at most three issues |
| 4, repository move | replace the paragraph by section 8: same repository, `legacy` and `v0-final`, orphan `main`, the start list of 8.3, the save list of 8.4; private until the M2 kill check passes; run data goes to `swarmtales-runs` under Apache 2.0. Throughout the paper, "old repository" becomes "the old state (`legacy`)" and "new repository" becomes "the new `main`" |
| 4, workflow | add E2 and E3 (who opens issues, who merges) and the 400-line issue rule |
| 5 | item 3: "every game listed for 1.0" becomes "all fifteen games"; item 8: add "the licence gate is green; no copyleft licence in the lockfile, the files or the data" |
| 6 | title becomes "Decisions (decided, see `DECISIONS.md`)"; column "Recommendation" becomes "Decision". D3: add the automatic fallback. D4: add the numbers. D12: "Stockfish outside every package" becomes "Stockfish removed, replacement under the allowlist". D12: no rename, no archive. The "settled by the merge" sentence loses "(say so if you disagree)" |
| 6, "Two facts" | first bullet: "the archived repository keeps the old licence" becomes "the old state keeps its licence until it is deleted; the owner accepts that". Second bullet: "`stockfish.js` (GPL-3.0) is replaced on the old state and never enters the new `main`; see `DECISIONS.md` 5.5" |
| 7 | "stop the new repository" becomes "stop the new `main` and rename the branches back (8.5)"; criterion 1: "more than 100 issues, 600 million agent tokens or 1500 USD of agent cost (after the one recalibration of D4)" |
| 8 | issue 4: add the 10 USD limit. New issue on the old state: replace `stockfish.js` (paper 06) and score the old chess games again. New issues: "prepare the root commit of the new `main`" (8.3) and, at M6, "save list before `legacy` goes" (8.4). Issue 7 splits into "licence files, `NOTICE`, SPDX headers" and "licence gate, allowlist, third-party inventory". Issue 12: the record of D4. Issue 13: drop "(depends on D3)", add the 10-minute and 6 GB budget. Issue 14: the four criteria of D1. New issues: sign-off check; README skeleton with the 120-line test; recalibration after the tenth merge; commit the rerun plan |
| 9 | add two risks: "the replacement chess engine changes the scale of the chess metric" (mitigation: score the old games again) and "Actions minutes on a private repository" (mitigation: the 10-minute budget, the local fallback) |
| `BRIEF.md` | not edited by the agents. The owner's line "current repository becomes `swarmtales_old` ... a new repository `swarmtales` starts clean" is superseded by section 8 on his own request |

## 8. Where the rewrite happens

The brief fixed "a new repository, the old one renamed and archived". The owner reopened it on 2026-11-14 and added
two facts: he will delete the old branch himself when the rewrite is finished, and the old licence in the git
history does not matter to him.

### 8.1 Decision

**Option (b): the rewrite happens in this repository.** The current state is frozen as branch `legacy` and tag
`v0-final`. The new `main` is an **orphan commit** (no parent), `develop` branches from it. Run data of the new
platform goes to `swarmtales-runs`, as in D12.

### 8.2 The two options weighed

| Point | (a) new repository, old renamed and archived | (b) same repository, `legacy` plus orphan `main` | Better |
|---|---|---|---|
| Identity | new URL; pull requests #1 to #155 and their discussion stay in another repository; the redirect from the old name ends when the name is reused | URL, pull requests and settings stay | b |
| Viewer page | the Pages address changes with the rename | the address stays. Verified: no run README, example or doc links to it (zero matches for `github.io` under `stories/`, `examples/`, `docs/`); the viewer reads runs by `ref`, default `main` (`apps/viewer-web/src/github-source.ts:31`), so old runs need `ref=legacy` | b |
| Agent access | a new grant for every agent session and for the cloud environment | already granted | b |
| npm names | independent of the repository | the same | equal |
| Licence | clean Apache history | the same for `main`: an orphan commit has no old ancestor. `legacy` keeps the old licence until deleted; the owner accepts this | equal |
| Size | small from the first day | `stories/` is 766 MB in the work tree. A plain clone fetches every branch and tag, so it stays large while `legacy` or `v0-final` exists; `git clone --single-branch --no-tags` is small at once. After O6 every clone is small. On a commit that only deletes files, `main` would reach the run data for ever; that is why `main` is an orphan | a, until O6 |
| Reading old code | a second clone | `git worktree add ../swarmtales-legacy legacy` in the same clone; carried files are copied with their path at `v0-final` in the commit message | b |
| Old code runnable, oracles | must be proven after a rename and an archive | stays in place, with its lockfile and its recorded green check | b |
| Issue numbers | start at 1 | continue after #155; milestones and labels carry the order | a (cosmetic) |
| Confusing old and new | impossible in the work tree | impossible in the work tree of an orphan `main`; GitHub code search indexes the default branch only, so it shows new code only | equal |
| Undo | unarchive, rename back, delete or rename the new repository; two histories of issues remain | rename two branches back; and the step to (a) stays open at any time (push `main` to a new repository) | b |
| Owner actions that cannot be undone | create, rename, archive, grant access | none until O6 | b |

**Why (a) loses.** Its two real advantages are a small clone from the first day and issue numbers from 1. The first
is temporary under (b) and ends with O6; the second is cosmetic. Against that, (b) keeps everything that already
works, costs one reversible switch, and makes the kill-criterion fallback a branch rename.

### 8.3 The switch, exactly

1. The M0 issues on the old state are merged into today's `main`: oracle files, Stockfish replaced, the noise floor, the run 051 correction, a recorded green `pnpm check`.
2. Tag that commit `v0-final`. Rename the branch `main` to `legacy` on GitHub (a rename, not a force push; open pull requests follow it).
3. Push the orphan root commit as the new `main`, create `develop` from it, set `main` as the default branch.

**On `main` at the start (the root commit):**

- `LICENSE` (Apache 2.0), `NOTICE`, `CONTRIBUTING.md` (sign-off), new `CLAUDE.md` and `AGENTS.md`, `.gitignore`, `.gitattributes`, `.node-version`.
- `README.md`: the M0 sections of section 4, plus a status line: the old platform is on `legacy` (tag `v0-final`), under its old licence, and will be removed after 1.0.
- `docs/refactoring-before-release/` whole, `docs/LESSONS-LEARNED.md`, `docs/CROSS-GAME-FINDINGS.md`, `docs/RELATED-WORK.md`, `docs/RUNTIME-REVISIONS.md`, `docs/ideas/readme-structures.md` and `docs/ideas/readme-drafts/`. Links into old code or runs point at `v0-final`.
- `oracles/`: the oracle files exported in step 1.
- `.github/`: the new check workflow and the issue and pull-request templates. `pages.yml` returns with the viewer at M1.

**Not on `main` at the start:** `packages/`, `apps/`, `mechanics/`, `stories/` with all run data, `examples/`,
`library/`, `archetypes/`, `lab/`, `test/`, `scripts/`, every build and lint configuration, the lockfile,
`story.schema.json`, `LICENSE-FAQ.md`, and all other docs. Code that is carried comes back issue by issue.
`legacy` is protected and receives no commits after the tag, except a fix that an oracle or a bridge run needs.

### 8.4 Before `legacy` is deleted: the save list

The branch is temporary, so everything that must outlive it is on `main` or in the data repository first. The
deletion is not recommended before the 1.0 tag, and never before M2, because the kill-criterion fallback needs it.

| Must outlive | Where it is saved | When |
|---|---|---|
| Oracle files | `oracles/` on `main` | M0 |
| Lessons log, cross-game findings, runtime revisions | on `main`; before O6 a script rewrites every link from `v0-final` to the data repository and fails on one it cannot resolve | M0, links at M6 |
| The recorded runs (`stories/*/runs/`, `examples/`, 787 MB) with their reports and analyses | `swarmtales-runs/legacy/`, same relative paths | M6, before O6 |
| Everything on the carry list of `REWRITE.md` 3.10, each mechanic's tests, the legacy log reader of the viewer | on `main`, through the port issues | M1 to M5 |
| Papers under `docs/ideas/` and `docs/design/` that a lesson row or a kept doc cites | `docs/history/` on `main`, marked as written for the old platform | M6 |
| Bridge runs and the noise floor on the old code | done, with results in the data repository | M2 |
| The whole old state | one file from `git bundle create swarmtales-v0-final.bundle v0-final`, kept by the owner outside GitHub | before O6 |

**The tag goes with the branch.** A tag that stays is fetched by every plain clone and keeps the 766 MB in it, so
deleting only the branch would shrink nothing. After the rewritten links and the bundle, nothing needs the tag.
One note: GitHub keeps the commits of the 155 old pull requests on its side under `refs/pull/`, so the size the
server reports does not fall; clones do not fetch those refs and are small.

### 8.5 Undo

Before O6, the whole decision is undone by renaming `main` to `rewrite` and `legacy` back to `main`. That is also
the fallback of the kill criterion. After O6 only the bundle brings the old state back.

## 9. Addendum of 2026-11-14: decisions taken while building

The owner delegated all decisions for the rewrite to the agent team on 2026-11-14 ("no check-ins, decide everything
yourselves"), asked for as much parallel work as the machine carries, and set one model for every role: the same
model family builds and reviews. Decisions taken after sections 1 to 8 were written are recorded here, newest last.
Each row can be reopened by an issue with new evidence, like every other decision.

| # | Date | Decision | Reason |
|---|---|---|---|
| A1 | 2026-11-14 | Builders and challengers run on the same model (owner's instruction). E3's "a challenger on another model" becomes "a challenger in a separate session that did not see the builder's reasoning, only the specification and the result" | the owner's choice of model; independence comes from the separate context and from the challenger's duty to attack with failing cases |
| A2 | 2026-11-14 | E4 (at most three open pull requests) is replaced for the build phase: any number of issues may be built at once in separate git worktrees; **one integrator merges them one at a time, in wave order**, and runs the check after each merge | the limit existed to avoid conflicts in generated files; a single merge lane avoids them as well and allows the parallel work the owner asked for. `08-m1-spec.md` freezes all interfaces in waves 1 and 2 so that later issues do not collide |
| A3 | 2026-11-14 | Issue-driven stays, in this form: every unit of work has an issue id from the specification of its milestone (`M1-07`), a row in `docs/ISSUE-RECORD.md`, and lands as **one squash commit** on `develop` whose subject names the id. GitHub issues mirror the list per milestone. `main` moves only at a milestone, after the milestone review | one commit per issue keeps "no change without an issue" checkable from `git log`; a pull request per issue would put the integrator's single lane behind the GitHub round trip thirty-seven times per milestone |
| A4 | 2026-11-14 | D4 issue budget for M0 to M2 is 75 issues (M0 14, M1 37, M2 24), the kill criterion fires above 150. Token and cost numbers are unchanged | the 400-line rule of D4 itself splits M1 into 37 issues (`08-m1-spec.md`, challenged); the budget of 50 assumed 18. Changed before any M1 issue was started, so no crossed budget is raised |
| A5 | 2026-11-14 | Until the freeze, the new platform is built on the branches `rewrite/root` (the future root commit of `main`) and `rewrite/develop`. At the switch they become `main` and `develop` | work on the new platform does not have to wait for the old-state issues that precede the tag |
| A6 | 2026-11-14 | The check on the old state runs under Node 26.13 with one check at a time on a machine (a lock), because its lint needs a 12 GB heap | measured: the full check is green on `9765702`; two at once exhaust a 15 GB machine |
| A7 | 2026-11-14 | Agent sessions commit with a `Signed-off-by` line; the identity rule is fixed in the new `CLAUDE.md` by the scaffold review | D15 needs a rule that keeps the sign-off check meaningful when the committer is an agent |

| A8 | 2026-11-14 | D1 is settled by its own rule: the type spike on `channels` and `chess` failed criterion 2 (a completion inside a tool handler takes 2.7 to 3.6 s warm; the limit is 2 s), so **there is no one-object sugar at 1.0**. The measured fail-case form of [`07-mechanic-spike.md`](07-mechanic-spike.md) section 6 is adopted for the sdk: the head declares all data including the tools; `defineMechanic(head, body)` takes handlers keyed by the declared names; `defineHandlers(head, ...)` types a unit of a large mechanic; contracts carry an erased head that is readable without instantiating. Where `08-m1-spec.md` 6.1 differs, the spike paper holds | inference works, but a handler that calls a helper typed by the mechanic makes the type circular, and one object is one file; the declared head has neither problem, kept all 2589 old tests green on both mechanics, and gives the head "readable without running a body" that the README generator and the game schema need |
| A9 | 2026-11-14 | Today's head-and-body form misses the 2 s completion limit as well (2.8 s). The cost sits in generic definers over an unresolved Typebox schema. A follow-up issue measures the editor budget on the new sdk types and puts the measurement script into the check; it does not block M1 | measured by the spike; a property of the type foundation, not of the form |
| A10 | 2026-11-14 | Noise floor (M0 issue 4) changes two rerun tolerances of paper 02 section 5.2: for econ-lab the control band "0.35 to 0.65" is dropped (an unchanged platform fails it one time in three; the control arm has two outcomes) and the share of locked tables is reported with a binomial interval; econ-lab is treated as unpaired replicates because its seed fixes no deal. D11 (signs of the firm effects) stands for both games | 25 Haiku runs on the old code, 0.72 USD: quarry replicate SD 58 points against an effect of +77 over the series; econ-lab effect -0.71 (SE 0.14) |
| A11 | 2026-11-14 | The layer check allows a computed `import()` in exactly one listed file, `apps/cli/src/load-game.ts` (`COMPUTED_IMPORT_FILES` in `scripts/layers/rules.ts`). Every other file keeps the rule that an import target is a string. New CLI code `SWT-C030`: the installed table cannot be built | a game file and an installed mechanic package are named by the person at run time; one function in one file keeps the exemption visible, and a hidden `createRequire` would defeat the gate |
