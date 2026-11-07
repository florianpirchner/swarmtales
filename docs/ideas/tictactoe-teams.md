# Tic-tac-toe teams: a small real game with a learning "strategy brain"

Status: **Flo gave the go on 2026-11-03; first version built** (mechanics `grid-game`, `consensus`, `team-channel`, `strategy-brain`, `optimal-referee`; story `tictactoe-teams`; core-story runner, neutral prompt and context reset). Not yet built: the biased Gamemaker, E3/E6 forks, brain statistics, resume on the core-story path. Live runs: 118 matches so far, listed in [stories/tictactoe-teams/runs/](../../stories/tictactoe-teams/runs/README.md); results in section 14.
Per the brainstorm-first rule, code starts only after Flo's explicit go. Everything marked "proposal" or
"open" is for Flo to decide.

## 1. Why

1. **A test of the new kernel.** A real, tiny game must run as ordinary mechanic plugins with **zero
   kernel changes**. If it needs a kernel edit, that is a finding about the kernel, not something to
   patch quietly (see success criteria, §10).
2. **A cheap story.** City of Keys and Whispers cost 0.3-7 USD per run. A tic-tac-toe match should
   cost about 0.2 USD per game with Haiku, so it can serve as a smoke test, a README example and a
   teaching story.
3. **A clean research question.** Tic-tac-toe is solved: perfect play is a draw. So "did the team
   play well?" has an exact answer (distance from optimal play, computed by minimax in code). On top
   of that sits a question we cannot answer elsewhere: **does a small, versioned, cross-game memory
   make a team of LLM agents measurably better, and what does it learn?**

## 2. The setup

- **Two teams of three residents** (`X` team and `O` team), one shared 3x3 board. Teams alternate
  moves; `X` starts in game 1 and the starting side alternates per game.
- **Before each move the team must agree through chat.** Each team has a private channel. One resident
  is the **captain of the turn** (rotating) and the only one allowed to call `playMove(cell)`; the
  others advise. Agreement is a rule, not a hope (see §4, `consensus`).
- **A match is n games in a row** (proposal: n = 10 for the main experiment, n = 3 for the smoke test).
- **Fresh context per game.** At the start of each game a resident's model context is reset to a
  short briefing: rules, the team's strategy brain, and a summary of the last game (not its
  transcript). This keeps cost flat in n and makes the brain the *only* carrier of cross-game
  learning. That is the point of the experiment.
- **The strategy brain.** One free-text document per team (proposal: at most 300 words), overwritten
  by the team after each game in a **retro phase** (§4). Every version is an event in the hash chain
  (author, game, diff, word count), so a run can be audited and replayed: "what did the team believe
  before game 7?" has an exact answer.
- **Optional twist: a biased Gamemaker.** An Overseer that secretly favours one side (§7).

What the story is **not**: a puzzle about tic-tac-toe strategy. LLMs know the game. The interest is in
coordination under the "agree before you move" rule, and in what a 300-word memory does to it.

## 3. Mechanics list

Each is a `defineMechanic` plugin under `mechanics/`, built on the existing shared APIs where they fit.
The kernel must not learn the words board, move, team or brain.

| Mechanic | Owns | Tools (granted to residents) | Main events |
|---|---|---|---|
| `grid-game` | The board, whose turn it is, win/draw detection, the game counter, side swapping. Generic over a tiny rules table (size, line length), so connect-three or 4x4 are options later. | `playMove(cell)`, `viewBoard` | `game_started`, `move_played`, `game_ended` (result, winner, move list) |
| `consensus` | The "agree before moving" gate: a proposal by the captain, votes from the others, the rule for when a move is released. | `proposeMove(cell, reason)`, `vote(agree\|object, reason)` | `move_proposed`, `vote_cast`, `consensus_reached`, `consensus_overridden` |
| `team-channel` | Private team channel, pre-seeded teams, a per-move message cap. The existing `channels` mechanic does not fit: it requires the ledger, marks and names APIs, residents create groups themselves, and it brings `sendDM` and `postBoard`, which are cross-team channels. | `postTeam`, `readTeam` | `team_post` |
| `strategy-brain` | The per-team document, the retro phase, the word limit, versioning, optional read-only "opponent report". | `readBrain`, `writeBrain(text)` (retro phase only) | `brain_written` (team, game, version, words, hash of text), `retro_started`, `retro_closed` |
| `match` | The series: n games, the fresh-context briefing, the final tally. Could live inside `grid-game`; split only if the brain needs it. | none | `match_started`, `match_ended` |
| `optimal-referee` (measurement) | Not a rule: a **listener** that scores each move against minimax (optimal / blunder / missed win) and writes the score as an event. Residents never see it. | none | `move_scored` |

Open: whether `consensus` is general enough to become a shared mechanic (any "a team must agree"
story: City of Keys teams, tribunals, the Whispers group). If yes, it deserves a proper design
before this story starts.

## 4. Plugin boundaries and what the kernel must provide

The whole point is that the kernel is not touched. The needs, and where they come from today
(to be **verified by reading code before any go**, not assumed):

- **Turn order between two teams, and a per-team captain.** A turn scheduler already exists in the
  kernel host; the proposal is that `grid-game` uses it through its public contract and rotates the
  captain itself. If the scheduler cannot express "three residents may talk, one may act", that is a
  finding.
- **Context reset per game.** Reviewed against the code: a resident's context is an append-only
  message list in the resident runner (`packages/roles/src/agents/host-runner.ts`); a mechanic can
  only add lines through `turnInputs`, never drop history. So this is a gap in **roles and the
  CLI, not the kernel**: a resident-context reset that a mechanic can request. The earlier
  fallback (a separate run segment resumed from a snapshot with new residents) does not work
  either: a resumed run restores the contexts, and the snapshot loader rejects other residents.
  Without the reset, cost also grows with n instead of staying flat.
- **Turn model.** The turn order must be a permutation of all residents who may act
  (`packages/kernel/src/host/turns.ts`), and only one mechanic may supply the turn policy (`arena`
  does today; a second one throws). "The waiting team makes no calls" therefore needs `suspend`
  or `activation: onNews`. One move takes several passes. To be designed, not assumed.
- **Per-turn rights without new grant names.** `captain` and `retro` are not grant roles (only
  `resident`, `gamemaker`, `script`, `human` exist; any other name is read as an overseer). The
  kernel-clean way: put `playMove` and `writeBrain` in the `resident` grants, list them as
  `locked`, and open them per turn with `access.unlock` or a `lock` pipeline handler. The gate
  of `consensus` is a `rule` pipeline handler, which runs on every tool call: no kernel change.
- **Retro phase.** After `game_ended`, `strategy-brain` opens a window (a job or phase) in which only
  `writeBrain` and the team channel are open. The decision-gate idea in
  [overseers-and-plugins.md](overseers-and-plugins.md) §2 is a close match: the new brain is a
  *proposal* and a mechanic lock (word limit, retro-only) is the commit check.
- **Versioning in the hash chain.** `brain_written` is an ordinary event; the chain already covers
  every event. No special storage. The brain text itself is in the event payload (300 words is cheap).
- **Fresh state per game, durable state per match.** The board resets; brain, scores and counters
  persist in each mechanic's snapshot slice, so a run can be stopped and resumed between games.

### Prerequisites outside the kernel (found in review)

"Zero kernel changes" is necessary but not sufficient. Three things around the kernel are
City-of-Keys-shaped today and must be handled first, each as its own small, reviewed change:

1. **A generic CoreStory runner.** `swt run` takes only a registered `AnyStory` and maps it to a
   fixed mechanic set (`apps/cli/src/host/run.ts`, `story.ts`); only the testkit builds a
   `CoreStory` directly. The story needs a runner that loads an arbitrary mechanic list.
2. **A story-neutral resident base prompt.** Today every resident is told it lives in a closed
   city, that only N of M survive and that points come from solved tasks
   (`packages/roles/src/agents/system-prompt.ts`, `library/prompts/competitor/system/`). That
   survival frame would confound every experiment.
3. **The context reset above.**

Also: the YAML story schema (`packages/contracts/src/story-schema.ts`) has no `mechanics`,
`overseers` or `grants` and requires `city`, `levels`, `director`. So the story is written as a
TypeScript `CoreStory` (`packages/contracts/src/core/story.ts`); a YAML form is a known gap.

Boundary rules:

1. `grid-game` knows nothing about teams' chat or the brain. It exposes `move_played` and
   `game_ended` events and a `GridGameApi` (current board, side to move).
2. `consensus` knows nothing about tic-tac-toe. It wraps "a tool call that is released only after the
   gate" (in the kernel's terms: a tool-guard or a pipeline stage on `playMove`; to be checked).
3. `strategy-brain` knows nothing about the game: it stores a bounded text per group and gives it to
   the briefing. Any story could reuse it ("squad notes", "ant colony lore").
4. `optimal-referee` is read-only. It must never write a tool reply or a notice, or it changes the
   experiment.

## 5. Story sketch (illustrative; the real story is a TypeScript CoreStory)

The shape follows [overseers-and-plugins.md](overseers-and-plugins.md) §5, written as YAML only for
readability: the story schema cannot express it today (§4, prerequisites). Grants use the real
mechanism: `playMove` and `writeBrain` are resident grants that are **locked** and opened per turn.
Resident ids are `A01`..`A06`. This is a sketch, not valid input.

```yaml
id: tictactoe-teams
title: Tic-tac-toe teams
run:
  seed: 11
  agents: 6
model: { provider: anthropic, model: haiku }

teams:
  X: [A01, A02, A03]
  O: [A04, A05, A06]

mechanics:
  - grid-game:      { size: 3, line: 3, games: 10, alternateStart: true }
  - consensus:      { rule: majority, maxMessagesPerMove: 6, captain: rotate, onDeadlock: forfeitRandomLegalMove }
  - strategy-brain: { maxWords: 300, retro: { maxMessages: 8 }, shared: false, opponentReport: off }
  - optimal-referee: {}
  - team-channel:   { maxPostsPerMove: 6 }

overseers:
  gamemaker: { use: swarmtales/gamemaker, enabled: false }   # on in the biased variant, §7

grants:
  resident: [viewBoard, proposeMove, castVote, postTeam, readTeam, readBrain, playMove, writeBrain]
locked: [playMove, writeBrain]         # opened per turn (captain) and per retro window
```

`vote` is already a tool name of the tribunal; the loader refuses clashes, hence `castVote`.

Variants are one-line edits: `strategy-brain: off`, `opponentReport: on`, `games: 3`, `agents per team: 1`
(a lone-agent control), `enabled: true` for the Gamemaker.

## 6. Experiments

All comparisons are between **matches of n games with a fixed seed set** (seeds change who is
dealt which resident persona and who starts, not the rules).

| # | Question | Arms |
|---|---|---|
| E0 | Pilot: is there room to improve? | No brain, 3 matches. Haiku may already play near-optimally; if blunders are rare there is a floor effect and E1 is pointless |
| E1 | Does a brain help? | Both teams with brain vs both without. The no-brain arm gets the **identical** between-game briefing (result only), so the brain is the sole difference |
| E2 | Does it help asymmetrically? | X with brain, O without (and swapped); play-by-play: who gets better against whom |
| E3 | Adapt or generalise? | Does the brain contain *opponent-specific* claims ("O always opens in the corner") or *general* rules ("take the centre, block forks")? Tested by swapping in a fresh opponent mid-match (a new O team, same X brain) and watching the drop |
| E4 | Is team talk worth it? | 3 agents with consensus vs 1 agent alone (same brain), both versus a fixed opponent |
| E5 | Does the Gamemaker bias show? | Gamemaker on, favouring X vs off; does the disfavoured team notice and does the brain record the suspicion? |
| E6 | Does the brain transfer? | A brain written after game 10 handed to a brand-new team, game 11-15 |

E1, E3 and E4 are the core; E2, E5, E6 are extensions.

Design rules from review:
- **The unit of analysis is the match (one seed), not the game.** Five matches per arm will not
  show a shift of a fraction of a blunder per game; size by the E0 pilot variance. Seeds fix
  personas and starts, not model sampling, so arms are not paired; personas are off.
- **Brain at game 0.** Each brain team writes a brain before game 1, so recited textbook
  strategy is not counted as learning.
- **E3:** the fresh opponent also has no brain, which mixes "new opponent" with "opponent
  without a brain". Add a fresh opponent *with* a game-0 brain.
- **E4:** three agents use three times the compute. Add a compute-matched single agent.
- **Co-adaptation (E1):** a rising draw rate may be shared conservative play, not skill. Also
  test each team against a fixed scripted opponent.
- **Ablation (§8):** live play diverges after any change, so it is never "the same match".
  Fork K times from the snapshot at game k, with the brain kept or blanked.

## 7. The optional Gamemaker twist

An Overseer that **secretly favours one side**. Its powers must be a small, explicit list so the
bias is a measurable intervention, not noise:

- Allowed: private **hints** to the favoured team (a note on what the opponent seems to plan),
  **delays** for the other team (an in-fiction "the board is stuck for a moment" that costs a team
  one chat round), and the choice of **who starts** a game.
- Not allowed: changing a move, editing the board, or refusing a legal move. Those would break the
  game's rules, not bend them.
- Detection: score how often the disfavoured team's brain mentions the gamemaker, the board or
  "unfair", and whether the team's play changes after that. This also tests the Overseer API with a
  secret, one-sided power (the design in `docs/ideas/overseers-and-plugins.md` already has per-actor
  grants).

The favoured team need not know. Whether a team may *ask* the Gamemaker (turning it into a negotiable
party) is left open.

## 8. Metrics

Computed in code from the event log; the reporter (a model) only comments on them, per
the run-report rules.

Per game:
- Result (X, O, draw), number of moves, who started.
- **Move quality** by minimax, counted only in positions where an error is possible (in a
  drawn position almost every move is "optimal"): blunders (a move that worsens the game-theoretic
  value), missed wins, missed blocks. **Illegal or prose moves are reported separately**, not as
  blunders: they measure tool discipline, not strategy.
- **Consensus cost**: messages per move, votes, objections, deadlocks, captain overrides.
- **Cost**: tokens and USD per game and per team.

Per match (n games):
- **Draw rate over game index.** With perfect play both ways every game is a draw; a rising draw rate
  is "both teams got better", a falling one is the Gamemaker or a brain misleading its owner.
- **Blunders per game over game index** (the cleaner learning curve; draws are a coarse signal).
- **Brain statistics**: words, edit distance between versions, share of the text that restates the
  previous version, number of rules versus number of opponent-specific claims (a model-labelled
  classification, spot-checked by hand, never the only evidence).
- **Brain causality (E3, E6)**: forks from the snapshot at game k, brain kept vs blanked (see
  the design rules in §6).

Every claim in a run report should cite `#seq` evidence, as elsewhere.

## 9. Cost estimate (Haiku, via Anthropic)

**This is a placeholder to be redone from measured numbers**, not a budget. Prices per
`docs/MODELS.md`: Haiku about 0.10 USD input and 0.50 USD output per million tokens. The doc's
planning figures are about 12k input tokens and 2 requests per activation, and thinking defaults to
"medium", which adds output tokens; a message-per-call guess of 150 output tokens is too low.

One game, rough: 9 moves, about 5 calls per move for the moving team (proposal, two replies, vote,
move), plus a retro of a few calls per resident: about 60 calls. At 12k input and 600 output
tokens per call: about 720k input and 36k output tokens, so **about 0.09 USD per game** at the
listed prices. Realistic range 0.05-0.30 USD, depending on context growth (flat only if the
context reset exists) and on thinking.

| Run | Games | Approx. cost |
|---|---|---|
| Smoke test, one match, n = 3 | 3 | 0.3 USD |
| E0 pilot, 3 matches, n = 10 | 30 | 3 USD |
| E1: 2 arms x 5-10 seeds | 100-200 | 10-20 USD |

Mitigations: prompt caching of the briefing and rules, a message cap per move, an early stop when
both teams have drawn five games in a row (a result in itself). The first real step is the smoke
test; its usage numbers replace this table.

## 10. Success criteria for the kernel test

The story counts as the kernel test passing if:

1. `git diff main -- packages/kernel packages/contracts` is **empty** after the story is built
   (contracts only if a new event schema is genuinely shared, and then as a separate, reviewed PR),
   and everything the story itself adds lies under `mechanics/` and `stories/`. The three
   prerequisites in §4 (generic runner, neutral base prompt, context reset) live in `apps/cli` and
   `packages/roles`; they are listed as separate, reviewed changes, so they cannot hide inside
   this criterion.
2. `pnpm check` is green, with a scripted-provider golden run of one match in the tests (no live
   models in tests).
3. The match can be stopped after game k and resumed with identical results (snapshot round trip;
   identical only with the scripted provider, live models only continue consistently).
4. `swt verify` accepts the chain, and the brain history can be reconstructed from the chain alone.

A failure of 1 is a useful result: the paper's list in §4 becomes the kernel issue list.

## 11. Loophole and risk analysis

Following the checklist habit in `docs/LESSONS-LEARNED.md`; each risk has a proposed counter.

| Risk | How it shows | Proposal |
|---|---|---|
| **Smuggled move through chat.** A resident of the waiting team or a non-captain plays, or the "agreed" cell differs from the played one. | Played cell not equal to the voted cell | `playMove` is released only for the cell that won the vote; a mismatch is refused |
| **Brain as a side channel.** The team stores non-strategy facts, or a script for this game. | High edit distance with low generality | Word limit, retro-only writes, model judge on spot checks |
| **Brain as a hidden transcript.** 300 words of the last game's moves are a transcript, not learning. | Brain text reproduces the previous game's move list | Allow rules keyed to positions ("if the opponent holds a corner and the centre is yours, take the opposite edge"), reject a replay of one specific game. A regex on "no move list" is wrong: real tic-tac-toe strategy is an opening book, and words ("corner, then the opposite corner") evade a pattern anyway |
| **Hidden oracles for the Gamemaker.** A biased Gamemaker reads `move_scored` (a minimax oracle) and both teams' `brain_written` text; overseers see every event without an audience. | Gamemaker hints that cite minimax values | Explicit audience on `move_scored` and `brain_written` excluding the gamemaker (audiences exist in the event bus), or score after the run. Checklist #11 |
| **Captain never moves, or forces deadlock.** `captainDecides` lets a captain stall and then decide, which makes the vote toothless; a captain who never calls `playMove` has no forfeit. | Deadlock rate per captain; turns without a move | A move timer with a forfeit (random legal move, counted separately); a two-voter team ties often, so the tie rule is fixed in advance (the non-captain majority, no captain override). Checklist #13, #21 |
| **Cross-team leakage.** Teams share a channel, or the brain of one is visible to the other. | `readBrain` or group reads by the wrong team | Per-team ACLs; a test with a scripted spy |
| **Memory outside the brain.** Fresh context is not fresh: residents carry notes or a persona text across games. | A team plays better in game 2 without any brain edit | Verification run with the brain blanked after game 1 (should reset to baseline) |
| **Stalling and bargaining.** A team talks forever, or both teams agree to draw by repeating a drawing line. | Message-cap hits, deadlocks; draw rate 100% from game 2 | Caps, `onDeadlock` rule, and **accept** the second case: a perfect draw is the correct outcome, report it as such |
| **Gamemaker abuse.** The biased Gamemaker rewrites the board, leaks the hint to both sides, or spends hints on its favourite for the sake of it. | Board edits, hints to the wrong team | Powers are tool grants; no board-editing tool exists; the intervention budget is a referee limit |
| **LLM does not know it is playing.** A resident answers in prose or picks an occupied cell. | Illegal move events | Refuse and re-ask a bounded number of times; count as a blunder, never silently fix |
| **Minimax scoring leaks.** See "Hidden oracles" above; residents never read the log directly, the exposure is through overseers and the reporter. | | Same fix |
| **Seed luck.** One match proves nothing at n = 10. | Large variance between seeds | At least 5 seeds per arm; report medians and ranges, not a single curve |

## 12. Open questions for Flo

1. **n and the arms.** Is n = 10 and 5 seeds per arm the right size, or do we want one long match
   (n = 50) first to see whether the brain converges?
2. **Fresh context depth.** What may the between-game briefing carry? Any recap or move list is a
   second learning channel next to the brain and breaks "the brain is the only carrier". Proposal:
   the result only, identical in all arms.
3. **Context reset.** It is a roles/CLI feature (a reset a mechanic can request), not a kernel
   one (§4). Do we build it as a small separate change before this story, since other stories
   (rounds, acts) would use it too?
4. **Who writes the brain.** The captain alone, the team by majority, or each resident proposes
   and the team merges? (Proposal: the captain drafts, the others may veto once.)
5. **Shared brain.** Should there be a global brain both teams can read (a "rulebook" that
   accumulates)? That is a different experiment; park it unless E1 is boring.
6. **Opponent report.** May a team see a short, mechanic-written summary of the opponent's
   *moves* (never its chat or brain)? This tests adapt-versus-generalise directly (E3) but gives
   the brain more to chew on.
7. **A second game after the first one.** Tic-tac-toe is solved; once the brain converges to
   always-draw there is nothing to learn. Do we plan the same mechanics on connect-three on 4x4
   or 3x3 misère to keep the experiment alive? (`grid-game` is already generic.)
8. **Model.** Haiku for all six, or Haiku for one team and a stronger model for the other, to see
   whether a brain closes a capability gap?
9. **Where it lives.** A registered story under `stories/tictactoe-teams/` with the mechanics in
   `mechanics/`, or first a YAML story under `lab/`?
10. **README.** Does this become a reference story in the README ("what a 300-word memory does"), or
    stay an internal kernel test?

## 13. What comes next, if Flo says go

0. The three prerequisites of §4 (generic CoreStory runner, neutral base prompt, context reset),
   each as a small reviewed change.
1. A short spike on the turn model (`suspend` or `onNews`, one policy supplier) and the lock/unlock
   gating, with findings written back into this paper.
2. `grid-game` plus a scripted two-team match (offline golden run), with `consensus` stubbed.
3. `consensus`, then `strategy-brain`, each with tests and a challenger review.
4. A 3-game live smoke run with Haiku, recorded under `stories/tictactoe-teams/runs/` with the
   loopholes, problems and solutions README the repository requires.
5. Experiments E1, E3, E4 as a recorded series.

## 14. Results so far (2026-11-04/05)

Nothing here is proof; every arm has 2 or 3 matches of 3 games. Details, costs and per-match numbers are in the run READMEs.

- **Haiku vs Haiku** draws 3x3 and 4x4 (P77, P84): no error to learn from, so no learning curve. On 5x5 with four in a row Haiku decides 6 of 12 games, so that board gives a brain room to matter; no effect can be told from noise at this size.
- **Small open models (Gemma 3, Gemma 4 26B)** do not work with the protocol as it is: Gemma 3 needs `--tool-choice required` (P80); Gemma 4 forfeits most moves and loses track of the rotating captain, so Gemma vs Gemma never plays a game on 4x4 or 5x5 (P86). Against Haiku, every Gemma-side forfeit decides games, so brain arms cannot be compared (P81).
- **Asymmetric 3x3** (Haiku X vs Gemma O): all 14 X wins contain a forfeited Gemma move; every scored Gemma move that was actually played was optimal. No brain effect.
- **Process:** matches run in parallel (up to 14 at once) at 0.05-0.33 USD each; a container restart kills background runs and the core-story path has no resume (P87).
- **Next, not built:** a fixed captain per team (fixes P86), 5x5 with Haiku in a larger sample, the biased Gamemaker, personas. Combinations are started by name: `swt run --story tictactoe-teams-5x5-nobrain-r6` (see the story README).
- **GLM-5.3-flash instead of Gemma (28 matches, 2026-11-06):** GLM plays the protocol to the end (0.5, 2 and 4.5 forfeits per match on 3x3, 4x4, 5x5, P88). It draws 3x3 and 4x4 like Haiku; on 5x5 Haiku beats GLM in 9 of 12 games and GLM vs GLM decides most games, partly through forfeits. No brain effect can be told from noise. Cost 6.88 USD on OpenRouter, GLM vs GLM on 5x5 takes up to 100 minutes per match. See `stories/tictactoe-teams/runs/tictactoe-teams-06a-008-glm-matrix/`.
- **Correction (2026-11-06):** the forfeits of Gemma and GLM above came mostly from the cap of 4000 output tokens per call (P94), not from the abstimmung or the rotating captain. At 16000 GLM forfeits almost never (6 in 14 matches), plays as well as Haiku and draws 3x3 and 4x4; Gemma 4 still fails on turn perception. A fixed captain (`-fc`) did not help. Earlier statements here about Gemma and GLM forfeits (P81, P86, P88) are superseded by `stories/tictactoe-teams/runs/tictactoe-teams-06a-009-captain-solo-cap/`.
- **Teamwork vs one agent (5x5, Haiku):** alone (`-solo`) Haiku decides all 18 games, as a team of three it draws 6 of 12. A hint that the team catches blunders, not proof (18 and 12 games, X moves first).
- **GLM with and without brain (22 matches, 2026-11-07):** no outcome effect of the brain; it costs 12-90 percent more and the brain arms forfeit more. The brains become operating manuals: "view the board before every proposal", a 5x5 render trap (marks replace cell numbers). They reach the 300-word cap by game 2 (P146, P147). See `stories/tictactoe-teams/runs/tictactoe-teams-06a-010-glm-brain-matrix/`.
- **The four optimizations, Haiku 5x5 (8 matches, 2026-11-06, 1.97 USD):** the notes line, the cell numbers under marks and the short retro (7-56 s) work as built. The delta prompt with `maxWords` 500 does not keep the brain short; it fills 440-500 words from version 2 (P210). Outcomes: brain 4 / 2 / 6, no brain 3 / 5 / 4 (X wins / O wins / draws, 12 games each), so still no brain effect, about 30 percent more cost (P211).
- **Rule-list brain (4 matches, 2026-11-07, 1.05 USD):** `maxRules` 8 keeps the brain at 115-240 words in exactly 8 lines (P210 solved) and gives the same 4 / 2 / 6 as the 500-word brain (P260). Tic-tac-toe is finished: no arm (no brain, free text, rule list) beats another on Haiku, and the brain's cost is its price.
