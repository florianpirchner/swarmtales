# What helps the residents: brains, teams and referees across the game stories

> **Carried from the old platform.** This document was written before the rewrite and is kept as it was, except for
> its links. Paths into code, runs and other docs (`packages/`, `mechanics/`, `stories/`, `examples/`, `docs/`) that do
> not exist on this branch point at the tag [`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) of this repository.

Status: 2026-11-12, with the paired series of section 5 (Hold'em, Harbor Lights, econ lab, Quarry, Salt
Market, Lanterns; lessons P430-P439) on top of the chess and morris results of 2026-11-11 (PR #140, run 01a-007). An analysis of every recorded run of the game stories (tic-tac-toe teams, chess,
nine men's morris, Convoy, Ember Tricks, Hold'em, Salt Market, Harbor Lights, Econ Lab, Blind Bid,
Lanterns, Quarry, Liar's Dice), plus two new experiments run for this paper (section 4). All residents
are Claude Haiku via Anthropic unless a row says otherwise. Numbers come from the reviewed run READMEs
(each computed from `events.jsonl`); data not yet on `main` is marked as such. Lesson rows: P330-P335 in
[LESSONS-LEARNED.md](LESSONS-LEARNED.md); design checklist line 56.

The platform offers three levers on top of a bare model, and every game story tried some of them:

- **The strategy brain** (`strategy-brain`): a short text per seat or team, written before game 1 and
  after each game, handed to the next game's fresh context. It is the only memory across games.
- **Teams**: several residents of the same model share one side, talk in a team chat and agree each
  move (`consensus`, `team-channel`).
- **The referee as a source of information** (a coach, the honest half of a gamemaker): the
  mechanic's own reference (a legal-move list, a loose-piece list, a Monte Carlo hand worth, a
  calibration line, a debrief) shown to the residents, either at the moment of a decision or in the
  retro between games.

Where does each lever change the result, and what does it cost?

## Digest highlights

- **Update 2026-11-12 (section 5): the pattern holds with two corrections.** A number at the decision helped
  again where it answers the decision (Quarry open quarries +77 table points, SE 22; Hold'em equity and pot
  odds: EV loss per decision 0.26 to 0.03, points +2.1, SE 1.25) and hurt where it ranks bad options (Harbor
  Lights: notes + chance -1.7, SE 1.2, more misfires). And the brain *does* work as a memory where the lesson
  is about the other players: Lanterns teams learn a clue code (+0.11 recall from game 2 on, SE 0.03, 12
  seeds), and econ-lab brains carry "free riding pays" into the next game (cooperation -0.40, SE 0.13, -37
  table points). Still no brain effect in Quarry or Salt Market (8 seeds each). Opus plays the econ lab's
  social optimum with or without a brain.
- **Information at the moment of the decision is the only lever that moves results in every game that
  tried it, and by far the most.** Chess over five seeds: the legal-move list takes the engine loss from
  ACPL 138 to 115, legal list plus loose pieces to 92 (p = 0.005), and with a coach's review on top to 78,
  the level of Sonnet and Opus (55-69) at 4-8 % of their cost per move (P321, P323, P326). Ember Tricks: the Monte Carlo hand worth shown at the bid lifts points
  per seat and round from 0.53 to 2.36. Both cost nothing extra; the chess aids even save calls.
- **Across eleven games, the brain as a memory never showed a firm outcome effect.** Tic-tac-toe (Haiku
  and GLM, 3x3 to 5x5, 70+ matches), chess (five seeds, ACPL 138 with and 138 without, P320), morris
  (four setups, 90 games, also with Sonnet and Opus, P402), Ember Tricks, Hold'em (40 mixed-table games: +1.8 points, standard error 2.4), Blind
  Bid and Lanterns (an accuracy gain on one seed set that vanished on the next). The brains do write the
  right lessons; play does not follow them (P115, P137, P177, P250).
- **A coach (the referee reviewing each seat's worst moves in the retro) helps only where the seat can
  act on it, and a stronger model does not make the brain work.** The chess coach alone: ACPL 140 against
  138; with the lists on the board: 78 against 92 (P323). Sonnet and Opus play morris and chess better than
  Haiku but their brains are as ineffective (P402) and the lists add nothing for them (P326).
- **Where a brain did help, the gain was already there in game 1, so it is a plan, not a memory.**
  Convoy saboteurs coordinate from game 1 and the edge is gone by game 3 (P272, P275); the Harbor Lights
  crew edge shrinks game by game (2.3, 1.8, 0.5 points).
- **New experiment 1 (Harbor Lights, 36 one-game matches, 1.84 USD): a private note written before the
  game is worth +3.2 points (standard error 0.8, 9 of 12 deals ahead, none behind); a shared crew
  convention only +1.8 (not firm).** Every private note says "never play an unknown card", and misfires
  fall from 26 to 14. A plan you write yourself beats a convention someone else writes for you (P330,
  P331).
- **New experiment 2 (tic-tac-toe 5x5, a team of three against one agent alone, 75 games, 3.22 USD): the
  team is only slightly ahead, 31 wins to 23 with 21 draws (57 % of decided games, not firm), at 3.4
  times the calls; the starting side matters more (34 of 54)** (P332). Teams cost 2.3 to 9 times a solo seat in every game that had both.
- **The evidence base itself is the biggest problem.** Most comparisons run on 2-4 seeds, seed sets
  swing more than the arms (P230), and two series sit unmerged on branches or in project files (Blind Bid
  v2, Salt Market v3); chess needed five seeds to show that its seed-37 brain effect was noise (P320). A comparison needs 8-12 paired seeds before a claim
  (P334).

## 1. The evidence, game by game

"Brain" is the strategy brain against the same story without it, on the same seeds. "Team" is several
agents per side against one. "Aid" is referee information shown to the residents. Cost ratios are per
game, against the cheapest arm.

| Game | Brain (memory) | Team | Aid / referee feedback | Lessons |
|---|---|---|---|---|
| Tic-tac-toe 3x3, 4x4 | ceiling: every Haiku game a draw, nothing to learn | - | - | P77, P85 |
| Tic-tac-toe 5x5 | Haiku 24 games: X/O/draw 4/2/6 with, 3/5/4 without; rule list 4/2/6; GLM 22 matches no effect, more forfeits | team vs team draws 22 of 48 games, solo vs solo 0 of 18; head to head team 31, lone agent 23, draws 21 (section 4.2); 3.4x calls | - | P146, P211, P261 |
| Chess | five seeds, 20 games per arm: ACPL 138 with, 138 without (p = 0.91); the seed-37 effect (148 vs 191) was one bad match | 2x2 teams: ACPL 98 vs 167 solo without the list (1 run), 132 vs 86 with the list; 2.3-2.4x cost | legal list 115; legal list plus loose pieces 92 (queen blunders 2.5 to 0.5 a game); coach review in the retro alone 140, with the lists 78; Sonnet 63, Opus 55 without aids (one match each), the lists do not help them | P113-P117, P320-P326 |
| Morris | no effect four times: 6+6 games solo, 12+12 vs depth-2 engine (both 7/2/3), 12+12 vs depth 3 (1/10/1 vs 0/11/1); Sonnet 0/12/0 with, 3/8/1 without, Opus 3/8/1 with, 2/4/0 without | team vs depth-2 engine 2 wins, 1 draw in 3 games (solo 7/2/3 per 12); about 4x cost | stronger model: Haiku wins 4 %, Sonnet 13 %, Opus 28 % against depth 3, at 0.02 / 0.20 / 0.65 USD a game | P106, P109, P202, P400-P402 |
| Convoy | saboteurs only: d4 damage on 52 % vs 38 % of chances; d3 saboteur wins 5 vs 3 of 15, by game 1/2/3 3/2/0 vs 0/2/1; loyal detection unchanged (0.79 / 0.79, 0.88 / 0.93) | - | - | P271, P272, P275 |
| Ember Tricks | notes: hits 42 % vs 45 %, the same bid error (-0.68), points 0.13 vs 0.55 per seat and round | - | calibration line in the retro: bid 0.45 to 0.64, points 0.53 to 0.73-1.13; MC worth in the retro 1.39; MC worth at the bid 2.36, hits 50 % | P137, P165, P220 |
| Hold'em | a style, not points: VPIP 0.74 to 0.55 over a match; mixed tables +1.8 points per seat and game (SE 2.4, 40 games); heads-up +0.6 (SE 10) | - | range equity and pot odds at the action (24 mixed tables, 96 games): EV loss per decision 0.03 vs 0.26, points +2.1 per seat and game (SE 1.25); Opus +19 and Sonnet +13 a game against the Haiku seats (4 tables), with EV losses 0.11 and 0.14 | P139, P290, P437, P438 |
| Harbor Lights | 3-game series: crew 20.8, solo 19.5, nobrain 18.9 (hard strikes); crew 19.2 vs nobrain 17.7 (soft); game 1 only: solo +3.2, crew +1.8 (section 4) | the crew is a shared brain, not an in-game team | discard debrief after each game: no change in discards (11.2 vs 10.5); each slot's chance to light at the decision: -0.1 without notes, -1.7 (SE 1.2) with notes, misfires up | P173, P177, P250, P252, P330, P331, P432 |
| Lanterns | recall 0.81 vs 0.65 on seeds 41-53, 0.80 vs 0.78 on seeds 59-71; on 12 paired seeds of the current rules +0.08 recall (SE 0.03): level in game 1, +0.11 in games 2-4; points +0.2 (SE 0.2) | teams by design (no solo arm) | pace line in the keeper's task: 0 of 32 games out of clues (4 of 32 before) | P195, P197, P230, P439 |
| Quarry | 8 paired seeds: 949 with, 961 without (paired -12, SE 28) | - | burn cost shown after the game: burns 66 to 49, still 12 % below the no-burn table; every quarry visible during the draft: +77 over the brain arm (SE 22), +32 in game 1, shared lanes 6 vs 29-35 | P126, P434 |
| Blind Bid | v2: 1349.5 with, 1352.5 without (3 seeds; unmerged) | - | - | P303 (planned) |
| Econ Lab | 8 paired seeds: the brain carries "free riding pays" into the A-or-B game, cooperation 0.11 vs 0.51 (paired -0.40, SE 0.13), table -37 points (SE 11); Sonnet the same (-0.48); Opus cooperates fully with and without | - | stronger model: table points Haiku 438-475, Sonnet 515-552, Opus 628 | P90, P91, P433, P436 |
| Salt Market | v2, 8 paired seeds: gain over idle 0.228 vs 0.223 (paired +0.005, SE 0.025); v3 brain arm stopped, unmerged | - | - | P435 |
| Liar's Dice | not tested as brain vs none (series lost with a container) | - | stronger model: Opus wins 8 of 12 at a Haiku table, Sonnet worse than Haiku | P420, P421 |

## 2. What the pattern says

**2.1 Information beats memory, and information at the decision beats information in the retro.**
The ranking is the same wherever a game tried more than one: a number or list on the screen when the
choice is made (chess legal list, MC worth at the bid) > the referee's number in the retro (Ember's
calibration line, MC worth in the retro) > the seat's own written lesson (notes, brains). Ember Tricks
tried all three on the same seeds (31-33), in points per seat and round: the worth at the bid 2.36; the
worth in the retro 1.39 and the calibration line 0.73-1.13 (two runs); the seats' own notes 0.13 against
0.55 for the control without them (0.53 in a later control run). This is design checklist line 46 seen
across games.

**2.2 The brain fails at the step from text to action, not at learning.** The brains are not wrong:
Ember notes say "not 0 by reflex" from game 3 and game 4 still bids 0 two times in three (P137); every
Harbor crew writes "rank signal = play now" and the misfires stay (P177); 9 of 12 crews keep "discard
only dead cards" next to a debrief that says no card is dead (P250); chess brains write "a pawn on d6
attacks e5" and hang the next piece (P115); Quarry brains praise burns that cost them points (P126). A
rule in a briefing several thousand tokens before the decision is general advice, and general advice is
what the model already plays by.

**2.3 A note before game 1 works as a plan, and a plan you write yourself works best.** The two games
with a brain effect (Convoy, Harbor Lights) show it in game 1, before anything could be learned, and
the edge shrinks over the match. Experiment 1 isolates it: with one game and no feedback, private notes
cut misfires almost in half. Writing the note is cheap deliberation ("think before you play") that the
game's own turn does not invite; it helps where the main loss is an avoidable gamble (a misfire, a doubled
damage card) and not where the loss is a calculation error (a hanging queen, a blocked morris piece).

**2.4 Teams of the same model add opinions, not information.** In chess, tic-tac-toe and morris all
information is public, so a second and third Haiku add only a vote over the same reading of the board.
The vote catches some blunders (chess without the list: ACPL 98 against 167; tic-tac-toe teams draw
where solos decide), but it also misses the same things together (a queen en prise for four moves,
discussed by four players who never named it, P113) and it never beats a cheap aid (chess teams with the
list: 132 against 86 for one seat). Head to head (section 4.2) a team of three wins 31 games to 23 against one agent alone, an edge
smaller than the starting side's, at 3.4 times the calls. Teams cost 2.3 to 9 times as much wherever a
story had both.
Where information is private (Harbor Lights, Lanterns, Convoy), the channel between teammates is the
game itself, and a team is not a lever but the subject.

**2.5 Ceilings and noise hide everything else.** A game where the model already plays perfectly
(tic-tac-toe 3x3/4x4, the ultimatum split at 5/5) cannot show any lever. And a game with a large luck
term (Hold'em, Harbor Lights strike-outs, Lanterns word grids) needs paired seeds in numbers the series
rarely had.

**2.6 The gamemaker.** No game story used a gamemaker yet (the biased tic-tac-toe gamemaker of
[the idea paper §7](https://github.com/florianpirchner/swarmtales/blob/v0-final/docs/ideas/tictactoe-teams.md) is not built). Its honest half, the referee as coach, has now been
tried in chess (`-coach`): after each game every seat gets, in its retro only, its worst moves by the
one-ply baseline with the better move. Alone it changes nothing (ACPL 140 against 138); on top of the
lists it gives the best Haiku chess (78) and almost every blunder is then punished (P323). A coach is
lever 2.1 delivered late: it pays only when the seat also sees the board well enough to act on it. The
hook is reusable: any game can pass `review: {team: text}` to `StrategyBrainApi.gameEnded`.

**2.7 A stronger model.** Sonnet and Opus play chess about twice as well as Haiku (ACPL 55-69 against
124-138) and beat the morris engine more often (13 % and 28 % against 4 %), at 10 to 30 times the cost.
They do not change the pattern: their brains write better playbooks without winning more (P402), and the
board aids that lift Haiku do nothing for them (P326). Haiku with the lists and the coach plays chess at
their level for 4-8 % of their cost per move.

## 3. Problems with the evidence itself

- **Small, unpaired samples (P334).** Most brain comparisons have 2-4 seeds per arm; Lanterns' control
  moved by 0.13 recall between two seed sets while the brain lead moved from 0.16 to 0.02 (P230).
  Harbor Lights needed 12 paired one-game deals for a firm +3.2. Every future comparison: the same seeds
  in both arms, the paired difference with its standard error, 8-12 seeds before a claim.
- **Unmerged data.** Blind Bid v2
  and its brain run (branch), Salt Market v3 (patch in project files), Liar's Dice series (lost with a
  container). The table above marks them; claims rest only on merged data.
- **The brain arm mixes plan and memory (P272).** A brain written before game 1 is compared against no
  text at all, so "brain helps" can mean "a pre-game plan helps". Experiment 1 now splits the two for
  Harbor Lights; other games should compare game 1 apart from the later games.
- **Different rules between series.** Harbor Lights changed strike rules twice, Convoy its damage
  limit, chess its aids; pooled numbers across rule changes are not used here.
- **Forfeits and caps confound some arms** (P81, P94): solo tic-tac-toe Haiku forfeited 7 moves in 3
  no-brain matches of run 009.

## 4. Two new experiments

Both chosen because one cheap series could settle a question the old data left open. Total 5.06 USD for 111 games, plus 0.20 USD for the reporter drafts (DeepSeek via OpenRouter).

### 4.1 Harbor Lights: plan or convention? ([run](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/harbor-lights/runs/harbor-lights-04a-006-game1-plan))

One-game matches (nothing to learn from play) on twelve new deals, three arms on the same deals: the
crew brain written together before the game, private notes per seat, and nothing.

| Arm | Score per game | Paired difference to nothing (SE) | Deals ahead / level / behind | Misfires (12 games) | Lit per game |
|---|---:|---:|---|---:|---:|
| private notes (`-solo-g1`) | **21.6** | **+3.2 (0.8)** | 9 / 3 / 0 | 14 | 22.3 |
| crew brain (`-g1`) | 20.2 | +1.8 (1.4) | 8 / 1 / 3 | 19 | 21.9 |
| nothing (`-nobrain-g1`) | 18.4 | | | 26 | 21.9 |
| bot crew | 22.9 | | | | |

The private notes are the plan: all 48 contain "play only a card you know is next" or "never gamble on
an unknown slot". The crew's shared convention "rank signal = play now" is a trigger, and when a rank
signal touches a card that is not yet playable it produces a misfire (crew 108: three misfires, 14
points). 1.84 USD for 36 games.

### 4.2 Tic-tac-toe 5x5: does a team beat one agent of the same model? ([run](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/tictactoe-teams/runs/tictactoe-teams-04a-013-team-vs-solo))

Earlier runs compared team against team (22 draws in 48 games) with solo against solo (no draw in 18),
which cannot say whether a team plays better. New variant `soloSide`: one Haiku agent alone against a team
of three Haiku agents, both orientations, no brain, six vote rounds per move, the starting side alternating
by game. 25 matches, 75 games.

| | Team wins | Lone wins | Draws | Team share of decided games | Requests | Cost |
|---|---:|---:|---:|---:|---:|---:|
| all 75 games | **31** | **23** | 21 | 57 % (about 44-71 %) | team 7604, lone 2549 | team 2.49, lone 0.74 USD |
| team starts (38) | 18 | 7 | 13 | 72 % | | |
| lone agent starts (37) | 13 | 16 | 8 | 45 % | | |

The team is ahead in 12 matches and behind in 7. Its edge is smaller than the starter's (the starter wins
34 of 54 decided games), it mostly blocks (21 draws, where two single agents never drew), and it pays in
overhead: members claim votes they never cast and vote on proposals posted only in chat (55
`NO_OPEN_PROPOSAL` refusals), and four team moves forfeited against none for the lone agent. A team of the
same model with public information is a second look at 3.4 times the calls, not a stronger player.

## 5. Closing the evidence gaps (2026-11-11/12)

The games with thin evidence got paired series in one night: 8-24 paired seeds or tables per comparison,
Haiku unless named, 20.8 USD in all (plus about 0.5 USD of reporter drafts on OpenRouter and 1.18 USD for
two series lost to 429 errors, P431). Two decision-time aids were built for it (P430, both off by default).

| Game | Comparison | Result (paired, SE) | Run |
|---|---|---|---|
| Hold'em | equity against the action-narrowed ranges and the pot odds at each action, 24 mixed tables | EV loss per decision 0.03 vs 0.26; VPIP 0.41 vs 0.73; points **+2.1 per seat and game (1.25)** | [holdem-04a-006](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/holdem/runs/holdem-04a-006-decision-aid) |
| Hold'em | Sonnet and Opus seats at Haiku tables, 4 tables | Opus **+19 a game (8)**, Sonnet +13 (8) against the Haiku seats; EV loss 0.11 / 0.14 / Haiku 0.28 | [holdem-04a-007](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/holdem/runs/holdem-04a-007-sonnet-opus-seats) |
| Harbor Lights | each own slot's chance to light, 12 one-game deals, without and with private notes | without notes -0.1 (1.6); with notes **-1.7 (1.2)**; misfires 29 vs 26 and 22 vs 14 | [harbor-lights-04a-007](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/harbor-lights/runs/harbor-lights-04a-007-decision-aid) |
| Quarry | brain vs none, and open quarries, 8 seeds | brain -12 (28); open quarries **+77 (22)** over the brain arm, +32 (9) in game 1 | [quarry-04a-007](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/quarry/runs/quarry-04a-007-paired-seeds) |
| Econ Lab | brain vs none, 8 seeds | A-or-B cooperation **-0.40 (0.13)**, table **-37 points (11)** | [econ-lab-04a-003](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/econ-lab/runs/econ-lab-04a-003-brain-vs-nobrain) |
| Econ Lab | Sonnet and Opus tables, brain vs none, 4 seeds | Sonnet -0.48 (0.21) cooperation with a brain; Opus 1.00 in both arms | [econ-lab-04a-004](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/econ-lab/runs/econ-lab-04a-004-sonnet-opus) |
| Salt Market | brain vs none, v2, 8 seeds | gain over idle +0.005 (0.025) | [salt-market-04a-006](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/salt-market/runs/salt-market-04a-006-v2-brain-vs-nobrain) |
| Lanterns | brain vs none, 8 more seeds (12 on the current rules) | recall **+0.08 (0.03)**; game 1 +0.00, games 2-4 **+0.11 (0.03)**; points +0.2 (0.2) | [lanterns-06a-006](https://github.com/florianpirchner/swarmtales/tree/v0-final/stories/lanterns/runs/lanterns-06a-006-more-seeds) |

What it changes in section 2:

- **2.1 holds with a condition: the number must answer the decision.** Open quarries show exactly which
  lane is free, and Hold'em's equity next to the pot odds is the call-or-fold rule itself; both help.
  Harbor Lights' chance per slot is a number about each of several bad options: the seats read it as a
  ranking ("27% beats 20%") and gamble more. The aid there would have to say "play or signal", not "which
  slot".
- **2.2 needs a correction: a brain is a memory when the lesson is about the other players.** In Lanterns
  the brain learns what this keeper means by a clue, which no rule says, and accuracy rises from game 2 on.
  In the econ lab it learns that the others free-ride, and the next game is played selfishly. Where the
  lesson is about the rules (Quarry's squares, Salt Market's bookkeeping) the model already plays by it and
  the brain adds nothing. So the positive control asked for in optimization 7 exists: Lanterns.
- **A reference is not a strength measure until a stronger model has played it.** The Hold'em equity
  baseline ranks aided Haiku (EV loss 0.03) above Opus (0.11), while Opus takes 19 points a game from the
  Haiku seats and aided Haiku about 2: the one-street baseline has no fold equity (P438). The econ lab's
  reference has a ceiling for Opus (P436).
- **Teams and the coach** were not tested again in this round.

Blind Bid v2 (branch `claude/project-thread-80sx9m`, not merged): the code and the six runs of
blind-bid-04a-002 merge cleanly onto `main`; the recommendation is to merge them (with lessons P300-P303
and a `pnpm check`) as the record of Blind Bid, and to add 7 more paired seeds per arm (about 0.2 USD) before
any brain claim. A decision for Flo.

## 6. Optimizations (proposals, not built)

1. **Make "a number at the decision" the first lever to try in every game,** before a brain, a team or a
   stronger model: it is the only one that worked everywhere and it is free; add the coach review
   (`review` in `StrategyBrainApi.gameEnded`) only on top of it. Candidates: Hold'em pot odds and the
   range equity at the action (the baseline exists, P134), Liar's Dice the read baseline at the bid
   (`readBaselineOf`, unmerged), Harbor Lights the chance that a slot is playable (P174), morris the free
   neighbours per piece (P200), Salt Market the contract gap.
2. **Show the brain's rule at the point of use, not only in the briefing.** A brain line tagged with
   the decision it governs ("bid:", "signal:", "discard:") is repeated next to that decision. This
   tests 2.2 directly: if lessons start to bind, the brain is a memory after all.
3. **Keep the pre-game note in every story, also in control arms that study something else.** It cost
   about 20 requests per match and was worth +3.2 points in Harbor Lights. A story that measures memory
   should compare "note before game 1, no retro after" against the full brain, so plan and memory are
   told apart (P272).
4. **Let each team member write its own line** when a team shares a brain: the shared convention lost to
   private notes (P331).
5. **Teams only as the subject of a study, never as a strength lever,** in games with public
   information: at equal information they were never better and cost 2.3-9x.
6. **A comparison standard for every series (P334):** paired seeds, 8-12 per arm, game 1 reported apart,
   the paired difference with its standard error, cost per arm; and merge or discard stopped series
   within a day.
7. **A positive control for memory:** an opponent with a fixed, exploitable habit (P109's proposal),
   so a brain has something to learn that the model does not know already. Without it, "no brain
   effect" cannot tell "nothing to learn" from "cannot learn".

## Problems found in this work

- P330-P335 in [LESSONS-LEARNED.md](LESSONS-LEARNED.md); section 5: P430-P439.
- 429 errors when about 70 runs share the API (P431): run at most about 10 new runs at a time.
- The run reporter is still city-shaped for core stories (P89): the drafts of both new series report
  "levels solved: none".
