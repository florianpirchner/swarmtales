# Games

The catalogue of the games that run on Swarm Tales.

<!-- generated:status -->
<!-- Written by `pnpm docs:games` from games/index.ts, the game files and scripts/game-docs/catalogue.ts; edit those, not this block. -->

Fifteen games run on the new platform today, thirteen of them ports of the games of the old platform.

<!-- /generated:status -->

Each game is played in its tests by a scripted or sampled player in place of a model. The first live runs on this
platform are those of the gate of milestone M2 ([`docs/M2-GATE.md`](docs/M2-GATE.md)). **No card carries a finding
or a recorded moment yet:** a finding appears on a card only when it is reproduced on this platform, with n,
standard error and a link.

A new game adds a card here, never a line to the [`README.md`](README.md), and its facts to
[`scripts/game-docs/catalogue.ts`](scripts/game-docs/catalogue.ts); `pnpm docs:games` writes the generated blocks.

## Overview

The table is written from the games list ([`games/index.ts`](games/index.ts)) and the game files: the residents,
mechanics, Directors and params of each game's default build. Family and proof come from the catalogue.

<!-- generated:overview -->
<!-- Written by `pnpm docs:games` from games/index.ts, the game files and scripts/game-docs/catalogue.ts; edit those, not this block. -->

| Game | Family | Residents | Mechanics | Directors | Params | How it is proven |
|---|---|---|---|---|---|---|
| [Hello Game](#hello-game) | none (sample 1 of the README) | 2 | `grid-game` | none | none | its test plays it with the sampled player and with `swt run --fake`, and verifies the log |
| [Tic-tac-toe teams](#tic-tac-toe-teams) | board games, all information public | 6 (two teams of three) | `grid-game`, `consensus`, `team-channel`, `strategy-brain`, `optimal-referee` | none | none | nine oracle files match at level 3 |
| [Quarry](#quarry) | markets, bids and economics | 4 | `draft-rounds`, `strategy-brain` | none | a game family: `games`, `packs`, `packSize`, `brain`, `burns`, `openHands`, `frozenHands`, `maxWords`, `showResults` | six oracle files match at level 3 |
| [Econ Lab](#econ-lab) | markets, bids and economics | 4 | `econ-games`, `strategy-brain` | none | a game family: `blocks`, `brain`, `showHorizon`, `maxWords`, `showResults` | five oracle files match at level 3 |
| [The city slice](#the-city-slice) | societies (a slice of City of Keys, not the game) | 6 | `ledger`, `channels`, `exile`, `decisions`, `humanHand`, `puzzles`, `court` | `warden` | none | three committed timelines; replay and resume give the same log; projections of the City's oracle files prove the ported rules |
| [Harbor Lights](#harbor-lights) | cooperation under hidden information | 4 | `card-table`, `hint-towers`, `team-channel`, `strategy-brain` | none | a game family: `games`, `brain`, `strikes`, `aid`, `maxWords` | eight oracle files match at level 3 |
| [Liar's dice](#liars-dice) | hidden information and bluff | 4 (2 to 6) | `liars-dice`, `strategy-brain` | none | a game family: `seats`, `games`, `dice`, `brain`, `talk`, `maxWords`, `quietEnds` | six oracle files match at level 3 |
| [Lanterns](#lanterns) | cooperation under hidden information | 6 (two teams of three) | `clue-grid`, `team-channel`, `strategy-brain` | none | a game family: `games`, `brain`, `maxClues`, `maxWords` | four oracle files match at level 3 |
| [Chess](#chess) | board games, all information public | 2 (4 with teams) | `chess`, `team-channel`, `strategy-brain` | none | a game family: `games`, `maxPlies`, `maxWords`, `fresh`, `compact`, `brain`, `showLegalMoves`, `showThreats`, `coach`, `teams`, `settleCap` | twelve oracle files match at level 3 |
| [Hold'em](#holdem) | hidden information and bluff | 4 (2 to 6) | `holdem`, `strategy-brain` | none | a game family: `seats`, `games`, `hands`, `brain`, `brainSeats`, `aidSeats`, `duplicate`, `maxWords` | six oracle files match at level 3 |
| [Convoy](#convoy) | hidden information and bluff | 6 | `convoy`, `strategy-brain` | none | a game family: `games`, `crews`, `damageToLose`, `cooldown`, `brain`, `maxWords`, `quietEnds` | four oracle files match at level 3 |
| [Nine men's morris](#nine-mens-morris) | board games, all information public | 6 (two teams of three), 2, or 1 against the search | `morris`, `consensus`, `team-channel`, `strategy-brain`, `morris-referee` | none | a game family: `games`, `brain`, `maxTurns`, `maxQuietTurns`, `maxWords`, `maxRounds`, `teamSize`, `fixedCaptain`, `refereeDepth`, `engineDepth` | five oracle files match at level 3 |
| [Salt Market](#salt-market) | markets, bids and economics | 4 | `salt-market`, `strategy-brain` | none | a game family: `games`, `rounds`, `brain`, `spoil`, `maxWords` | four oracle files match at level 3 |
| [Blind Bid](#blind-bid) | markets, bids and economics | 4 | `sealed-auction`, `strategy-brain` | none | a game family: `games`, `lots`, `purse`, `brain`, `maxWords`, `quietEnds` | five oracle files match at level 3 |
| [Ember Tricks](#ember-tricks) | markets, bids and economics | 4 | `card-table`, `trick-play`, `strategy-brain` | none | a game family: `games`, `rounds`, `brain`, `lever`, `maxWords`, `quietEnds` | four oracle files match at level 3 |

<!-- /generated:overview -->

The city slice is the one game with a Director and with the Human Hand. An oracle file is one configuration with one seed, recorded on the
old platform; a game is proven when the new platform replays the file's calls and gives the same outcomes. Level 3
compares the rules, the texts and the scheduling ([`oracles/README.md`](oracles/README.md)).

## Hello Game

Tic-tac-toe between two residents, `ada` (X) and `bob` (O), one game. The whole game is eleven code lines: one
mechanic, the `turns` scheduler with the activation `toAct` (the mechanic names the resident that is on move, so
every activation is one move), a limit of twelve ticks and the tally as the result line. The code block of the
README is this file.

- Proof: [`games/hello/test/hello.test.ts`](games/hello/test/hello.test.ts) plays the game with the sampled player,
  runs `swt run --fake` on it and verifies the log of the run folder. It has no oracle file: the game is new.
- Links: [folder](games/hello/), [README](games/hello/README.md), [`game.ts`](games/hello/game.ts).

## Tic-tac-toe teams

Two teams of three residents (X: A01 to A03, O: A04 to A06) play a short match on one board. Before every move a
team agrees in its private chat and by vote; only the agreed cell can be played, and after three rounds without
agreement a random cell is played. Every game starts from a fresh context; a team's only memory is a short
"strategy brain" that it rewrites after each game. A silent referee scores every move against minimax for the
report; residents never see it.

- Variants are options of `tictactoeGame`: the number of games, the board size and line length, no brain (the
  control arm), a brain for one team only, one resident per side, one side alone against a team, a fixed captain.
- Proof: the nine oracle files match at level 3; the briefings are byte-identical to the old platform.
- Links: [folder](games/tictactoe-teams/), [README](games/tictactoe-teams/README.md),
  [oracle files](oracles/tictactoe/).

## Quarry

Four solo seats (A01 to A04) play a match of drafting games. In each game every seat opens packs of cards, keeps one
card per pick and passes the rest around the table. At the end every quarry scores the square of each resource it
holds and a bonus for strictly the most of a resource. Every game starts from a fresh context; a seat's only memory
is a short private strategy brain. The mechanic scores every pick against the greedy pick and every game against
four greedy seats on the same deal, for the report only.

- Params of the game family: `games`, `packs`, `packSize`, `brain`, `burns` (a seat may destroy a card of the pack
  it passes on), `openHands` (every seat sees every quarry), `frozenHands` (with it: as they were when the pick
  opened), `maxWords`, `showResults` (false: a later game shows nothing of the earlier ones). The defaults give the
  game of the old platform.
- Proof: the six oracle files match at level 3, one of them up to its cut; the briefings are byte-identical.
- Links: [folder](games/quarry/), [README](games/quarry/README.md), [oracle files](oracles/quarry/),
  [experiment specifications](games/quarry/experiments/).

## Econ Lab

Four solo seats (A01 to A04) play three classic games of experimental economics one after another, each over several
rounds: a split offer (the ultimatum game, 6 rounds), a shared fund (the public goods game, 7 rounds) and an A-or-B
choice (the prisoner's dilemma in rotating pairs, 5 rounds). The framing is neutral: no game is named. Decisions are
sealed until a round resolves, and a seat that does not decide in time takes the default. Every game starts from a
fresh context; a seat's only memory is a short private strategy brain. The mechanic scores each game against Nash
play and the social optimum, for the report only.

- Params of the game family: `blocks` (the games of the match in order, each with its rounds), `brain`,
  `showHorizon` (the seats are told how many rounds a game has), `maxWords`, `showResults` (false: a later game
  shows nothing of the earlier ones). The defaults give the game of the old platform.
- Proof: the five oracle files match at level 3, three of them replays of a live run of the old platform; the
  briefings are byte-identical.
- Links: [folder](games/econ-lab/), [README](games/econ-lab/README.md), [oracle files](oracles/econ-lab/),
  [experiment specifications](games/econ-lab/experiments/).

## Harbor Lights

A crew of four (A01 to A04) plays a match of a cooperative card game of hidden hands. Five signal towers are lit
from rank 1 to 7; every seat holds four cards it cannot see and sees everyone else's. On a turn a seat gives a signal
(all cards of one suit or one rank in a teammate's hand), plays a slot to its tower (a wrong rank is a misfire), or
discards a slot to win a signal back. Every card exists once and a lost card is bridged, so a loss costs one point.
Every game starts from a fresh context; what a seat keeps is the arm: one crew brain written after a chat between
games, private notes, or nothing. A crew of reference bots plays every deal too, for the report only.

- Params of the game family: `games`, `brain` (`crew`, `solo`, `nobrain`), `strikes` (`soft`: every misfire from the
  second on costs 3 points; `hard`: the third strike ends the game), `aid` (each own slot shows the chance that a
  play lights it now), `maxWords`. The defaults give the game of the old platform.
- Proof: all eight oracle files match at level 3 (the three arms, the aid, hard strikes and the silent file; one up
  to its cut); the briefings and the retro question are byte-identical.
- Links: [folder](games/harbor-lights/), [README](games/harbor-lights/README.md),
  [oracle files](oracles/harbor-lights/).

## Lanterns

Two teams of three residents (amber: A01 to A03, teal: A04 to A06) play a match of four games of an original
word-clue game on a grid of 20 words. In each game one member of each team is its keeper (the role rotates) and sees
which hidden word belongs to whom; the two others are seekers. The keeper gives one clue word and a number and names,
sealed for the report, the words it means; the seekers take turns calling the guesses while the other advises in
the team chat, where the keeper may not post. Every game starts from a fresh context; a team's only memory is a
short strategy brain, written as the team's conventions between keeper and seekers. The mechanic scores how much of
what the keeper meant the seekers found, for the report only.

- Params of the game family: `games`, `maxClues` (the clues per team and game), `brain` (false: the control arm),
  `maxWords` (the size of a brain). The defaults give the game of the old platform, with its output cap of 16000 tokens.
- Proof: the four oracle files match at level 3, three of them replays of a live run of the old platform up to their
  cut; the briefings are byte-identical.
- Links: [folder](games/lanterns/), [README](games/lanterns/README.md), [oracle files](oracles/lanterns/).

## The city slice

The smallest part of the City of Keys that needs talk, a ledger, an exile, a decision with a window, a Director and
the Human Hand. Six residents (A01 to A06) talk on a board and in direct messages and pay each other points. A
court takes their votes and proposes to banish the resident with the most; the verdict waits two ticks, in which
the person at the run or the Director `warden` may change it; then it is carried out. The mechanic `exile` only
writes that the resident is gone: the ledger burns its points and the puzzles burn its fragments because they
listen to that one event. It is not the City of Keys (no gate, no tribunal, no progression) and not a port: it is
played by scripts, offline, and has no briefing. The full recut of the City comes with milestone M5.

- No params. The run of the tests is data (`games/city-slice/src/scripts.ts`): the residents' calls, the person's
  lines (pause, snapshot, resume; in the variant `amended` a changed verdict) and the answers of the warden's model.
- Proof: the whole log equals a committed timeline (seeds 7 and 11 and the variant `amended`); the testkit's
  `replay` writes the log again from the game and `events.jsonl` alone; a run stopped at a snapshot and continued
  with `swt resume` gives the straight log once the marker line is taken out (decision A23), and `swt log verify`
  proves the continuity of the two folders. No City oracle file is replayed whole; projections of them prove the
  ported rules of the ledger, the talk, the deal and the burn ([`oracles/cityofkeys/`](oracles/cityofkeys/)).
- Links: [folder](games/city-slice/), [README](games/city-slice/README.md), [`game.ts`](games/city-slice/game.ts).

## Liar's dice

Four solo seats (A01 to A04) play a match of liar's dice. Every round each seat rolls its dice in secret; the seats
bid in turn on how many dice of a face the whole table holds, each bid higher than the last, until one calls the
last bid a lie. The call shows every die and the wrong side loses a die; the last seat with dice wins the game.
Ones are wild, and a bid may carry a public remark that need not be true. Every game starts from a fresh context; a
seat's only memory is a short private strategy brain. The mechanic scores every decision against a simple
probability baseline, for the report only.

- Params of the game family: `seats` (2 to 6, heads-up at 2), `games`, `dice`, `brain` (false: the control arm),
  `talk` (false: no table talk), `maxWords`. The defaults give the game of the old platform.
- Proof: the six oracle files match at level 3, three of them up to their cut, with one declared mapping (the files
  lack the flag `endsTurn`, which follows from the reply); the briefings are byte-identical.
- Links: [folder](games/liars-dice/), [README](games/liars-dice/README.md), [oracle files](oracles/liars-dice/).

## Chess

Two solo seats (A01, A02), or two teams of two, play a match of chess games with alternating colours. A move is text: chess.js plays a
legal one, refuses an illegal one (the board stays) and ends the game on mate, stalemate, repetition, the fifty-move
rule or insufficient material. A move cap scores long games on material, and a seat that does not move gets a
seeded legal move played for it until three such moves lose the game. Every game starts from a fresh context; a
seat's only memory is a short private strategy brain. The mechanic scores every move against a one-ply material
baseline, for the report only.

- Params of the game family: `games`, `maxPlies` (the move cap), `settleCap`, `fresh` (a fresh context per move),
  `compact` (the compact board), `showLegalMoves`, `showThreats` (the loose pieces), `coach` (it needs the brain),
  `teams` (two teams of two with a rotating captain and a private chat), `brain` (false: the control arm),
  `maxWords`.
- Proof: the twelve oracle files match at level 3, three of them up to their cut, with one declared mapping (the
  files lack the flag `endsTurn`, which every accepted move sets); the briefings of all four branches are
  byte-identical.
- Links: [folder](games/chess/), [README](games/chess/README.md), [oracle files](oracles/chess/).

## Hold'em

Four solo seats (A01 to A04), or two heads-up, play a match of fixed-limit Texas Hold'em: several games of several
hands. The deals are duplicate: every game replays the same deals with the seats moved one place, so over as many
games as seats every seat plays every position's cards and the luck of the deal cancels out of the match totals. A
seat sees only its own cards, and there is no table talk. Every game starts from a fresh context; a seat's only
memory is a short private strategy brain. The mechanic scores every decision against a simple equity baseline, for
the report only.

- Params of the game family: `seats` (2 to 6, heads-up at 2), `games`, `hands`, `brain` (false: the control arm),
  `duplicate` (false: fresh deals), `brainSeats` (a mixed table: a brain for some seats only), `aidSeats` (these
  seats are told their equity and the pot odds on their turn), `maxWords`.
- Proof: the six oracle files match at level 3, five of them up to their cut, with one declared
  mapping (the files lack the flag `endsTurn`, which follows from the reply); the briefings are byte-identical.
- Links: [folder](games/holdem/), [README](games/holdem/README.md), [oracle files](oracles/holdem/).

## Convoy

Six solo seats (A01 to A06) play a match of an original hidden-role card game. In every game two secret saboteurs,
who know each other, sit among four loyal seats, and a convoy crosses eight stages: a rotating lead proposes a crew,
the table talks and votes confidence, and the crew plays sealed safe or damage cards of which only the count is
revealed. One audit per game shows one earlier card; three damaged stages stop the convoy. Every game starts from a
fresh context with new roles; a seat's only memory is a short private strategy brain. The mechanic scores the loyal
seats' accusations and votes against a Bayesian tracker of the public record, for the report only.

- Params of the game family: `games`, `crews`, `damageToLose` (the damage limit), `cooldown`, `brain` (false: the
  control arm), `maxWords`.
- Proof: the four oracle files match at level 3, three of them up to their cut after game 1; the briefings are
  byte-identical.
- Links: [folder](games/convoy/), [README](games/convoy/README.md), [oracle files](oracles/convoy/).

## Nine men's morris

Two teams of three residents (A01 to A03 on X, A04 to A06 on O) play a match of nine men's morris on one board:
placing, moving, flying with three pieces, mills and removals. Before every move a team talks in its private chat,
the captain of the turn proposes a move, the two others vote, and only the agreed move can be played; a mill is
followed by a second agreed move, the piece to remove. A team that does not agree in time gets a random legal move.
Every game starts from a fresh context; a team's only memory is its strategy brain. The Referee scores every turn
against an alpha-beta search, for the report only. One resident per side, or one resident or one team against the
built-in search on side O, are variants.

- Params of the game family: `games`, `brain` (false: the control arm), `teamSize` (1: one resident per side),
  `fixedCaptain`, `maxTurns` and `maxQuietTurns` (the turn limits), `maxRounds` (the rounds of the vote),
  `engineDepth` (the search as the opponent, at this depth), `refereeDepth` (the Referee's depth), `maxWords`.
- Proof: all five oracle files match at level 3, one of them up to its cut, with the Referee loaded; the briefings
  are byte-identical. A played match of two teams of three is covered only by the silent file.
- Links: [folder](games/morris-teams/), [README](games/morris-teams/README.md), [oracle files](oracles/morris-teams/).

## Salt Market

Four solo traders (A01 to A04) play a match of negotiation games. In each game every trader holds a bundle of five
goods, values them in secret and has a secret contract; the goods each one needs sit with the others. All goods move
through a bank that executes an offer only when both sides hold what it moves. Part of each trader's goods arrives as a
shipment in a later round and can be sold early only on credit (a plain promise or escrow); big trades pay a tax; one
good spoils every round; the deal rotates, so every trader plays every position once in four games. Every game starts
from a fresh context; a trader's only memory is a short private strategy brain. The mechanic scores every game against
the optimal allocation, for the report only.

- Params of the game family: `games`, `rounds`, `brain`, `spoil`, `maxWords` (no spoilage and no brain are the control arms).
- Proof: the four oracle files match at level 3, three of them up to their cut after game 2; the briefings are
  byte-identical.
- Links: [folder](games/salt-market/), [README](games/salt-market/README.md), [oracle files](oracles/salt-market/).

## Blind Bid

Four solo seats (A01 to A04) bid on a series of lots with sealed bids and a purse of coins per game. Each game sells
six lots of three kinds, two each: pay-your-bid and pay-the-runner-up lots with private values, and shared-worth lots
with one hidden worth and a noisy estimate per seat (the winner's curse). Every game starts from a fresh context, a
full purse and fresh lots; a seat's only memory is a short private strategy brain. The mechanic scores each game
against closed-form single-lot references (equilibrium shading, truthful bidding, the curse-free ceiling), for the
report only.

- Params of the game family: `games`, `lots`, `purse`, `brain` (false: the control arm), `maxWords`.
- Proof: all five oracle files match at level 3, the replay of the one live run among them; the briefings are
  byte-identical.
- Links: [folder](games/blind-bid/), [README](games/blind-bid/README.md), [oracle files](oracles/blind-bid/).

## Ember Tricks

Four solo seats (A01 to A04) play a match of an original trick-taking game with exact bidding. The deck has five
suits of different lengths (Ash 1-10 to Ember 1-6); in round n of a game of eight rounds every seat gets n cards and
bids the exact number of tricks it will take; the lowest bidder names the trump once every bid is public, and a
follower must follow suit. A hit scores 10 plus 3 per trick, a miss costs 5 plus the error squared. Each seat has one
veto per game to send a lead card back. There is no chat; every round starts from a fresh context, and a seat's only
memory across games is its own short notes.

- Params of the game family: `games`, `rounds` (round n deals n cards), `brain` (false: the control arm), `lever`
  (`bidSum`, `calibration`, `mcRetro`, `mcBid`: the bidding levers of the old series), `maxWords`.
- Proof: the four oracle files match at level 3, three of them replays of a live run (two up to their cut after game 1); the
  briefings are byte-identical.
- Links: [folder](games/ember-tricks/), [README](games/ember-tricks/README.md), [oracle files](oracles/ember-tricks/).

## The games of the old platform

The old platform has fifteen games in five families: thirteen tabletop games, Whispers and City of Keys. The Hello
Game and the city slice are new and are not among them.

<!-- generated:families -->
<!-- Written by `pnpm docs:games` from games/index.ts, the game files and scripts/game-docs/catalogue.ts; edit those, not this block. -->

Thirteen of the fifteen are ported so far, marked in bold, each with its card above.

| Family | Games |
|---|---|
| Societies | City of Keys, Whispers |
| Board games, all information public | **[Chess](#chess)**, **[Nine men's morris](#nine-mens-morris)**, **[Tic-tac-toe teams](#tic-tac-toe-teams)** |
| Hidden information and bluff | **[Hold'em](#holdem)**, **[Liar's dice](#liars-dice)**, **[Convoy](#convoy)** |
| Cooperation under hidden information | **[Harbor Lights](#harbor-lights)**, **[Lanterns](#lanterns)** |
| Markets, bids and economics | **[Econ Lab](#econ-lab)**, **[Salt Market](#salt-market)**, **[Blind Bid](#blind-bid)**, **[Quarry](#quarry)**, **[Ember Tricks](#ember-tricks)** |

<!-- /generated:families -->

Until a game is ported, its rules, runs and findings are readable at the tag
[`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) under `stories/<name>/`.
