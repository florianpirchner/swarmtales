# Game roadmap: which games come after tic-tac-toe teams

Status: **idea, not approved for building** (2026-11-03, from the chat with Flo). Nothing here is built.
Per the brainstorm-first rule, code starts only after Flo's explicit go. All costs, efforts and
rankings are rough planning figures, to be replaced by measured numbers from the first smoke runs.

## 1. What this paper is

[tictactoe-teams.md](tictactoe-teams.md) proposes a small game on the new kernel with a **strategy
brain**: a short, versioned document per team that is rewritten after every game and is the only
thing carried from one game to the next. This paper asks the next question: **which games can we
plan after it**, in which order, at what effort and cost.

Selection criteria (all must hold):

1. **Haiku-sized.** A game fits in a short briefing; a move is one tool call with a small argument.
2. **4-player-friendly.** Four seats (2 v 2, or 4 solo), or a family of games where four is natural.
3. **Multi-game learning.** The game is played in matches of n games, so a cross-game brain can be
   measured: does it learn, and what does it learn? The "strategy brain" of the tic-tac-toe paper
   generalises to a **cross-game strategy brain** (see §3).
4. **Exact or computable reference.** Wherever possible a reference solver in code (minimax, Monte
   Carlo equity, game-theoretic equilibrium) scores moves, so "played well" has a number.
5. **No kernel changes.** Everything is mechanic plugins (§4). A needed kernel edit is a finding, as in
   the tic-tac-toe paper.

**Rules for names and rights.** Traditional games without a single owner (chess, checkers, Go, nine
men's morris, Texas Hold'em) are fine as genres. **Branded or commercial titles (Wizard, Catan,
Codenames, Werewolf-style products and the like) are not recreated 1:1.** Where this paper wants such a
genre, it describes an *original* game with its own deck, its own trump logic, its own scoring and at
least one extra mechanic that changes the strategy. The originals below carry working names only.

## 2. The candidates

Effort: **S** = about a day of builder work once the shared pieces exist, **M** = a few days,
**L** = a week or more. "New" means a mechanic that does not exist yet (existing ones in
`mechanics/`: arena, cast, channels, exile, goals, ledger, marks, motives, names, petitions,
progression, puzzles, receipts, script, seal, shared, standoff, standoff-tribunal, tribunal,
whispers).

### 2.1 Tic-tac-toe teams (baseline, already papered)

Covered in [tictactoe-teams.md](tictactoe-teams.md). Listed here as step 0 because every other game
reuses its parts: `strategy-brain`, `match`, `team-channel`, `consensus`, the reference-solver listener
(there called `optimal-referee`), and the three prerequisites outside the kernel (generic CoreStory
runner, story-neutral base prompt, context reset). Nothing below can start before those exist.

### 2.2 Economic games lab: public goods, ultimatum, prisoner's dilemma

Four residents, repeated rounds of three classic experimental-economics games, in one story with
the game as a parameter.

**Built (2026-11-06, Flo's go):** story `econ-lab` ([stories/econ-lab/](../../stories/econ-lab/README.md)) on the
new mechanic `econ-games` (sealed decisions, rotating pairs, payoffs and the reference score in one
plugin; no separate `sealed-commit` or `payoff-table` was needed, `seal` is the City of Keys auction and
unrelated) and the `strategy-brain`, which now plugs into any game through `BrainSourceApi` /
`StrategyBrainApi` and has solo seats. Neutral framing (no game named), unknown horizon, no chat, no
punishment round yet. No kernel change. Runs: [stories/econ-lab/runs/](../../stories/econ-lab/runs/README.md).

- **Public goods game:** each of 4 gets an endowment, secretly contributes, the pool is multiplied
  (for example by 1.6) and shared equally. Optional: a costly-punishment round.
- **Ultimatum game:** proposer splits a sum, responder accepts or rejects (both get nothing).
  Rotating pairs among the four.
- **Prisoner's dilemma:** simultaneous cooperate/defect in rotating pairs, or the four-player
  variant.
- **Research angle.** Whether a model learns *norms* across games: does the brain converge to
  tit-for-tat, to fairness, to exploitation? Compares to the human baseline (ultimatum rejects below
  about 20-30 percent; public-goods contributions decay without punishment). Cross-game question: does
  a norm learned in game A (ultimatum) transfer to game B (public goods) through a shared brain?
- **Mechanics needed.** `sealed-commit` (simultaneous hidden choices revealed together; check whether the
  existing `seal` mechanic already is this before building), `payoff-table` (a rules table, generic
  over matrix games), `strategy-brain`, `match`. New: `payoff-table` (S), the rest reused.
- **Kernel changes.** None expected. Simultaneous moves need the turn model to allow "all act, then
  reveal", the same open point as tic-tac-toe's turn model.
- **Reference.** Closed-form: Nash play (contribute nothing, offer minimum, defect) and the social
  optimum. Score = distance from both.
- **Cost (Haiku).** Tiny: a round is one call per resident without long chat. Roughly 0.02-0.05 USD
  per round-block; 20 games x 10 rounds about 3-8 USD per arm.
- **Loophole risks.** Prompt knowledge: models know these games by name and recite textbook answers
  (counter: disguised framing, changed numbers). Collusion by chat if chat is allowed (decide chat
  on/off as an experiment arm, not a default). Round-count end-game defection (counter: unknown or
  random horizon). Brain as transcript (as in tic-tac-toe §11).
- **Effort: S.** The cheapest next step and a good second test of "no kernel changes".

### 2.3 Original trick-taking game with exact bidding (working title "Ember Tricks")

**Built (2026-11-06, Flo's go):** `mechanics/card-table` (deck, seeded deal, private hands), `mechanics/trick-play`
(bids, named trump, follow suit, veto, scoring, move timer) and the story `stories/ember-tricks/`; the strategy brain
now also serves trick play (one team of one per seat, reset every round). Not built yet: the Monte Carlo reference
listener. First run: [ember-tricks-04a-001-smoke](../../stories/ember-tricks/runs/ember-tricks-04a-001-smoke/).

Not Wizard. A genre sibling with real differences, so nothing is a 1:1 copy:

- **Own deck:** five suits (Ash, Brine, Cinder, Dust, Ember) of 1-10, with no jokers and no
  fixed "wild" cards. Different counts per suit, so card counting is a skill.
- **Own trump logic:** trump is **not** turned from the deck. Each round, the player with the
  lowest bid *names* the trump suit after all bids are public (so bidding tells the table something
  and low bidders gain power).
- **Own scoring:** a hit is worth 10 + 3 per trick; a miss costs the **square of the error** (a bid of 3
  with 5 taken is -4), which punishes a systematic over- or underbidder.
- **Extra mechanic:** each player has one **veto token** per game to void a single lead suit at the
  start of a trick (forcing the leader to lead another suit).
- **Format.** 4 solo seats, 1 card to 8 cards per round. A game is 8 rounds; a match is n games.
- **Research angle.** *Calibration*: how well does a Haiku player estimate its own tricks, and does a
  cross-game brain correct a systematic bias ("I overbid by 1 on average")? Also opponent modelling
  from public bids and the named trump.
- **Mechanics needed.** `card-table` (deck, deal, hands visible only to the owner, play legality),
  `bidding` (exact bid commitments plus a hit/miss scorer), `trick-play` (follow-suit, trump rule),
  `veto-token` (can be a field of the rules table), reused `strategy-brain`, `match`. New: `card-table`
  (M, reusable by §2.4-2.7), `bidding` and `trick-play` (S each).
- **Kernel changes.** None expected. Private hands rely on the per-resident audience/visibility
  support that the Whispers DMs already use; verify.
- **Reference.** Monte Carlo in code: given a hand and the public information, the distribution of
  tricks, so "bid error versus the Monte Carlo expectation" is computable per round. Exact
  best-response is not needed.
- **Cost (Haiku).** One round is bid plus play, 4 players: roughly 1 + 1-8 calls per player, about
  12-40 calls; a game of 8 rounds is about 150-250 calls, about 0.2-0.5 USD; a 10-game match about 2-5 USD.
- **Loophole risks.** Illegal plays (not following suit) and miscounted tricks: the engine, not the
  model, counts and enforces. Signalling by table talk (no chat in this game; communication only through
  cards and bids). The lowest-bidder-names-trump rule can be gamed by a deliberate low bid to control
  trump; that is a feature to measure, but it may degenerate: watch bid distributions. Memorising a
  fixed deal order if seeds repeat (seeds change the deal per game).
- **Effort: M** (the card table is the long pole).

### 2.4 Drafting game (original, "Quarry")

Not a copy of any published draft game. Four players each open packs of 8 cards, keep one, pass the
rest, until all cards are taken, then score a tableau.

**Built (2026-11-06, Flo's go):** story `quarry` ([stories/quarry/](../../stories/quarry/README.md)) on the new
mechanic `draft-rounds` (pack passing, sealed picks, the tableau score and the greedy reference in one plugin;
no separate `card-table` or `tableau-scorer`: it was built in parallel with Ember Tricks, so moving its deck
and packs onto `card-table` is a follow-up). Rules as
built: four resources (amber, basalt, cobalt, jade) scored as squares, a wild lodestone (at most one per set,
on the biggest sets), 5 points for strictly the most of a resource (a tie scores nothing), up to two burns
per game at 2 points each, 2 pack rounds of 6 cards, passing direction turns. The "last card passed decides
a tie-break" idea below was dropped for the majority bonus, which gives hate-drafting a clearer target.
Solo seats with the strategy brain (`BrainSourceApi` / `StrategyBrainApi`), no chat, no kernel change. Runs:
[stories/quarry/runs/](../../stories/quarry/runs/README.md).

- **Own scoring:** sets of one of four resources score quadratically; a *wild* ore counts for the
  best set only once; the leftover-pile rule is original: the *last card passed to you* decides a
  tie-break bonus.
- **Extra mechanic:** a limited **burn** action (discard one card from the pack before passing) that
  denies, at a cost.
- **Research angle.** Signal reading (what the neighbour passes tells what it is not drafting),
  hate-drafting versus own-value drafting, and whether the brain discovers a stable pick order.
- **Mechanics needed.** `card-table` (reused), `draft-rounds` (pack passing), `tableau-scorer`
  (rules table). New: `draft-rounds` (S) and `tableau-scorer` (S).
- **Kernel changes.** None expected; the pass order is a fixed rotation.
- **Reference.** A greedy value baseline and an exhaustive best-first search over a small pack
  (8 cards, 4 players is tractable with pruning). Score = value lost against the greedy baseline and
  against the search.
- **Cost (Haiku).** One pick = one call; a game is about 32 picks plus a retro, about 40-60 calls,
  roughly 0.05-0.10 USD. A 20-game match about 1-2 USD. Cheap.
- **Loophole risks.** Prompt recall of a known draft strategy; trivial dominant strategy if the
  scoring is unbalanced (playtest by scripted bots first); communication outside the table (none
  allowed, no chat).
- **Effort: M** if §2.3 exists first (the card table is shared), otherwise M-L.

### 2.5 Texas Hold'em poker (heads-up and 4-handed)

A traditional game, fine as a genre. Fixed-limit, to keep the action small.

- **Research angle.** Bluffing, hidden information, risk calibration; does the brain learn opponent
  *tendencies* across hands (the E3 adapt-versus-generalise question, but in a game where adapting is
  the whole point).
- **Mechanics needed.** `card-table` (reused), `betting-rounds` (blinds, raise cap, side pots are
  avoided by fixed stacks per hand), `showdown` (hand ranking). New: `betting-rounds` (M),
  `showdown` (S).
- **Kernel changes.** None expected.
- **Reference.** Monte Carlo hand equity versus a random hand and a fold-or-call baseline: score each
  decision by expected-value loss against a simple equity policy. This is a *baseline*, not a solver;
  state that limit, and never claim "optimal".
- **Cost (Haiku).** A hand is up to 4 betting rounds x up to 4 players, about 15-25 calls, about
  0.03 USD. A match needs hundreds of hands for any signal, so 100 hands is about 3 USD per arm. Variance is
  high, so seeds must be many; use duplicate deals (the same hole cards swapped between seats) to cut
  luck.
- **Loophole risks.** Collusion between seats of one team (counter: solo seats or a team tally
  with known partners as an explicit arm); chip dumping; slow-play loops; players ignoring the stack
  size. Models tend to be passive and call too much: expect a floor effect.
- **Effort: M** (after the card table).

### 2.6 Social-deduction card game with hidden roles (original, "Convoy")

Not a copy of any published title. Five to six players (four is too few for a good hidden-role game:
list 4 as a degenerate arm). A convoy crosses ten stages; two hidden **saboteurs** among five.
Each stage the lead picks a crew, everyone plays a card face down (safe or damage), the crew's
cards are shuffled and revealed as a count only.

- **Own mechanics:** a *role card for each seat* secretly dealt; saboteurs may play at most one
  damage card per three stages (so they must be patient); one **audit** token per game to reveal a
  single played card to the table; a **vote of confidence** that ends a lead's term.
- **Research angle.** Deception and detection: does the saboteur lie well, does the town detect it;
  does a brain over games build a *detection model* ("a seat that always proposes itself")? It
  overlaps with Whispers (a secret whisperer, rumour DMs); this is the structured, card-based
  comparison.
- **Mechanics needed.** `hidden-roles` (secret deal, role knowledge audiences), `crew-vote`,
  `card-table` (reused), `public-channel` (a table-wide channel with a message cap), the existing
  `channels` possibly. New: `hidden-roles` (M), `crew-vote` (S).
- **Kernel changes.** None expected; audiences for private role knowledge exist.
- **Reference.** Weaker than the others: a Bayesian suspicion tracker in code computes, from the
  public record, the posterior that each seat is a saboteur; "detection accuracy" is the distance of
  a player's stated accusations from it. No game-theoretic optimum.
- **Cost (Haiku).** Chat-heavy: about 6 players x 10 stages x 3-4 calls plus talk: about 250-400
  calls a game, 0.4-1.0 USD per game. A 10-game match about 5-10 USD per arm.
- **Loophole risks.** Out-of-character leaks (a model announcing its role); refusal to play the
  saboteur (seen in Whispers run 007, P73); metagaming the role split from the system prompt;
  always-vote-no stalemates; accusation spirals. Needs a role-compliance check as in Whispers.
- **Effort: M-L.**

### 2.7 Negotiation and trading (original, "Salt Market")

Not a board game, not Catan. Four traders hold different bundles of five goods; each has a secret
**contract** (a target bundle worth points). Bilateral and multilateral offers, a short round clock,
a bank that executes only what both sides confirm.

- **Own mechanics:** goods **spoil** (one of the five loses value every round); a **tax** on trades above
  a size; an *escrow* tool, so a promise to deliver later can be made binding for a fee.
- **Research angle.** Negotiation quality, fairness, deception about the contract, and whether
  promises are kept. Compared against the Pareto-optimal allocation computed by an optimiser. Cross-game:
  does the brain learn a trading style (generous, tough) and does it pay off?
- **Mechanics needed.** `offers` (a structured offer/counter/accept protocol), `ledger` (existing, for
  holdings; check its API), `escrow` (S), `contracts`. New: `offers` (M), `escrow` (S),
  `contracts` (S).
- **Kernel changes.** None expected.
- **Reference.** Linear program for the best joint allocation; score = efficiency (achieved joint
  value over the optimum) and fairness (Gini of surplus).
- **Cost (Haiku).** Free-form bargaining is the most expensive of the lot: about 4 traders x 8 rounds
  x 3 calls plus replies, about 150-300 calls, 0.3-0.8 USD per game.
- **Loophole risks.** Side payments that the bank cannot see (counter: all transfers through the
  bank); promises outside escrow; collusion against the fourth trader (a 3-against-1 coalition is the
  expected failure and a research result in itself); degenerate "no trade is safe" equilibrium;
  invented goods or rules in chat (the bank refuses anything it did not create).
- **Effort: L.**

### 2.8 Traditional two-player boards as team games: nine men's morris, checkers, Go, chess

All traditional, no owner, so the genres are free. Two teams of two (or three) with a captain and
consensus, exactly the tic-tac-toe setup on a bigger board.

| Game | Reference | Fit | Effort |
|---|---|---|---|
| Nine men's morris | Solved (a draw); an exact solver is possible but heavy; a depth-limited alpha-beta works for scoring | Best of the four: small rules, phases (place, move, fly), real tactics | M |
| Checkers (draughts, 8x8) | Solved (a draw); an alpha-beta engine scores moves | Good; forced captures are a nice test of "read the rules" | M |
| Go (5x5 or 7x7) | A small-board engine (for example a Monte Carlo tree search in code) is needed to score; scoring the end position needs a counting rule | Hard for Haiku to even stay legal; interesting but expensive to adjudicate | L |
| Chess | An external engine (for example Stockfish) would score centipawn loss | Models make illegal moves often; needs a legality filter and a board renderer; the cost per game is high (60+ moves, long contexts) | L |

- **Mechanics needed.** Extend `grid-game` into a generic `board-game` with a rules module per game
  (placement, movement, capture); `move-validator` (the engine, not the model, checks legality);
  `reference-engine` listener (generalised `optimal-referee`). Rules modules are the bulk.
- **Research angle.** Team consensus versus a lone agent on a hard game; transfer of a brain between
  games of the same family (nine men's morris to checkers: do general principles carry?).
- **Cost (Haiku).** A morris game is 25-60 moves; at 5 calls per move for the moving team that is 125-300
  calls, 0.2-0.5 USD. Chess and Go are two to five times that, mainly through long contexts.
- **Loophole risks.** Illegal moves (refuse and re-ask, bounded, as in tic-tac-toe §11); engine licences
  and install weight (external engines are an extra dependency; keep them out of tests, which are offline);
  endless draw shuffles (move cap and repetition rule).

## 3. The cross-game strategy brain

The tic-tac-toe brain is *per team, per game type*. For a multi-game roadmap, three versions of the same
mechanic are worth separating (all are configuration of `strategy-brain`, not new kernel):

1. **Game-local brain:** one document per game type. The baseline.
2. **Cross-game brain:** one document that persists across *different* games (for example from the
   economic lab to the trick-taking game to poker), with a word cap, so the team has to keep only
   what generalises. Research question: does it hold general reasoning habits ("count what is
   public", "assume the opponent is not random") or just tune to one game?
3. **Library-fed brain:** the brain starts from a curated, hand-written set of principles (the
   `library/` idea of the monorepo paper). A control arm: does a human-written head start beat
   self-learned notes?

All three use the same events (`brain_written` in the hash chain), the same retro window, the same
word limit, so the audit trail is uniform. The cost of cross-game comparisons is the number of
matches: a full matrix of games x brain types is large, so run it only for two or three games chosen
for the most different skills (for example the economic lab, trick-taking, poker).

## 4. Shared building blocks (the actual work)

Most of the effort sits in a few reusable plugins, not in the games:

| Block | Used by | Effort | Note |
|---|---|---|---|
| Prerequisites (generic CoreStory runner, neutral prompt, context reset) | all | M | From the tic-tac-toe paper §4; start there. |
| `strategy-brain`, `match`, `team-channel`, `consensus` | all | per that paper | |
| `reference-solver` listener (generalised `optimal-referee`), event `move_scored` | all | S per game | Read-only; audience must exclude the Gamemaker and the residents. |
| `card-table` (deck, deal, private hands, play legality) | trick-taking, drafting, poker, convoy | M | The most reusable new piece. |
| `sealed-commit` (simultaneous hidden choices) | econ lab, convoy, bidding | S | Check `mechanics/seal` first. |
| `board-game` (rules modules) | tic-tac-toe, morris, checkers, Go, chess | M | Generalises `grid-game`. |
| `offers` / `escrow` | negotiation | M | |

Each new mechanic stays free of game words in the kernel and follows the boundary rules in the
tic-tac-toe paper §4: one thing per plugin, read-only measurement listeners, no resident ever sees the
reference score.

## 5. Ranking and recommendation

**Priority note (Flo, 2026-11-03):** right after tic-tac-toe teams comes the **tool naming** work ([tool-naming.md](tool-naming.md), HIGH), before any game in the table below, because third-party mechanics will collide on tool names such as `say`.

Ranked by value for the research question (does a memory make a team better, and what does it
learn) divided by effort and risk, assuming the tic-tac-toe prerequisites exist.

| # | Game | Effort | Cost per 10-game match (Haiku) | Why here |
|---|---|---|---|---|
| 0 | Tic-tac-toe teams | M + prerequisites | about 1 USD | Kernel test; everything else reuses it. |
| 1 | **Economic games lab** (public goods, ultimatum, PD) | S | 3-8 USD per arm | Cheapest; exact reference; first real test of cross-game transfer of a norm. |
| 2 | **Original trick-taking with exact bidding** ("Ember Tricks") | M | 2-5 USD | Best learning curve to measure (bid calibration); builds the card table. |
| 3 | **Drafting** ("Quarry") | M | 1-2 USD | Almost free once the card table exists; clean signal-reading measure. |
| 4 | **Nine men's morris** (board family) | M | 2-5 USD | Reuses the whole tic-tac-toe stack with a bigger rules module; checkers follows. |
| 5 | **Texas Hold'em** | M | about 3 USD per 100 hands | Hidden information and opponent modelling, but high variance and floor effects. |
| 6 | **Hidden-role card game** ("Convoy") | M-L | 5-10 USD | Overlaps with Whispers; deception research, noisy, needs a role-compliance guard. |
| 7 | **Negotiation and trading** ("Salt Market") | L | 3-8 USD | Richest, hardest to adjudicate; best done once the offers protocol exists. |
| 8 | Checkers, then Go (small), then chess | M, L, L | 2-10 USD | Board family extensions; chess and Go only with an external engine and legality filter. |

**Recommendation.** After tic-tac-toe teams, build **1 (economic lab)** next: it needs almost no new
plugins, it exposes the cross-game brain question at once, and it is cheap enough to run many seeds.
Then **2 (trick-taking)**, which builds the card table that **3 (drafting)** and **5 (poker)** reuse.
Hold **6 and 7** until the cheaper games show that the brain measurably learns anything; they cost the
most and have the weakest reference scores. Chess and Go are the least attractive per effort here.

## 6. Cross-cutting risks

- **Prompt recall instead of learning.** The models know these games. Every arm needs a game-0 brain
  and, where possible, disguised numbers or names, as in tic-tac-toe §6.
- **Floor and ceiling effects.** Poker (too passive) and tic-tac-toe (too solved) may show nothing.
  Run the pilot (E0) before any arm.
- **Variance.** One match is never a result; at least five seeds per arm, medians and ranges.
- **Co-adaptation.** Teams that learn from each other can converge on mutual passivity. Test against a
  fixed scripted opponent as in the tic-tac-toe paper.
- **Rights.** Keep every original game original in deck, trump logic, scoring and an extra mechanic;
  no rulebook text, no card art or names from a commercial game. Review the final rules once
  before any public release.
- **Costs here are placeholders.** They use the Haiku prices from `docs/MODELS.md` and the call counts
  guessed above. The first smoke run of each game replaces them.

## 7. Open questions for Flo

1. **Order.** Is the recommended order (economic lab, trick-taking, drafting, then the rest) right, or
   should poker or the hidden-role game come earlier because they are the more eye-catching stories?
2. **Cross-game brain.** Should the economic lab be the first test of a brain shared across different
   games (§3), or stay game-local at first?
3. **Seats.** Solo seats (4 players) or teams of two with a captain for the card games? Teams add
   consensus and chat cost but reuse the tic-tac-toe stack.
4. **Chat.** Silent games (cards and bids only) or table talk? Silent is cheaper and cleaner; talk is
   where the loopholes and the drama are.
5. **Engines.** Is an external engine (Stockfish, a Go engine) acceptable as a dependency, or only
   pure TypeScript references?
6. **Names.** Are the working titles (Ember Tricks, Quarry, Convoy, Salt Market) fine as placeholders,
   or do you want a naming pass with a trademark check before anything public?
7. **Reviewer pass.** Should a challenger review each game paper's rules for originality before
   building?
