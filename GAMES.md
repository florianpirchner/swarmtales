# Games

The catalogue of the games that run on Swarm Tales. Six games run on the new platform today, each with a scripted
or sampled player in place of a model. The first live runs on this platform are those of the gate of milestone M2
([`docs/M2-GATE.md`](docs/M2-GATE.md)). **No card carries a finding or a recorded moment yet:** a finding appears
on a card only when it is reproduced on this platform, with n, standard error and a link.

A new game adds a card here, never a line to the [`README.md`](README.md).

## Overview

The table is written by hand for now; the plan is to generate it from the registered games.

| Game | Family | Residents | Mechanics | Params | How it is proven |
|---|---|---|---|---|---|
| [Hello Game](#hello-game) | none (sample 1 of the README) | 2 | `grid-game` | none | its test plays it with the sampled player and with `swt run --fake`, and verifies the log |
| [Tic-tac-toe teams](#tic-tac-toe-teams) | board games, all information public | 6 (two teams of three) | `grid-game`, `consensus`, `team-channel`, `strategy-brain`, `optimal-referee` | none; variants are options of `tictactoeGame` | nine oracle files match at level 3 |
| [Quarry](#quarry) | markets, bids and economics | 4 | `draft-rounds`, `strategy-brain` | a game family with nine params | six oracle files match at level 3 |
| [Econ Lab](#econ-lab) | markets, bids and economics | 4 | `econ-games`, `strategy-brain` | a game family with five params | five oracle files match at level 3 |
| [Harbor Lights](#harbor-lights) | cooperation under hidden information | 4 | `card-table`, `hint-towers`, `team-channel`, `strategy-brain` | a game family with five params | the oracle files of the arms `solo` and `nobrain` match at level 3; the silent file of the crew arm at level 3 |
| [The city slice](#the-city-slice) | societies (a slice of City of Keys, not the game) | 6 | `ledger`, `channels`, `exile`, `decisions`, `humanHand`, `puzzles`, `court` | none | three committed timelines; replay and resume give the same log; projections of the City's oracle files prove the ported rules |
| [Liar's dice](#liars-dice) | hidden information and bluff | 4 (2 to 6) | `liars-dice`, `strategy-brain` | none; variants are options of `liarsDiceGame` | six oracle files match at level 3 |

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
- Proof: the three oracle files of the arms `solo` and `nobrain` match at level 3, one of them up to its cut; the
  silent file of the crew arm matches at level 2 (level 3 waits for the lock events of M4-64); the briefings are
  byte-identical.
- Links: [folder](games/harbor-lights/), [README](games/harbor-lights/README.md),
  [oracle files](oracles/harbor-lights/).

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

- Variants are options of `liarsDiceGame`: the seats (2 to 6, heads-up at 2), the games, the dice, no brain (the
  control arm), no table talk.
- Proof: the six oracle files match at level 3, three of them up to their cut, with one declared mapping (the files
  lack the flag `endsTurn`, which follows from the reply); the briefings are byte-identical.
- Links: [folder](games/liars-dice/), [README](games/liars-dice/README.md), [oracle files](oracles/liars-dice/).

## The fifteen games to port

All fifteen games of the old platform are ported: thirteen tabletop games, Whispers and City of Keys. They come in
five families. Four are ported so far, marked in bold; the Hello Game and the city slice are new and are
not among the fifteen.

| Family | Games |
|---|---|
| Societies | City of Keys, Whispers |
| Board games, all information public | chess, nine men's morris, **tic-tac-toe teams (ported)** |
| Hidden information and bluff | Hold'em, **Liar's Dice (ported)**, Convoy |
| Cooperation under hidden information | **Harbor Lights (ported)**, Lanterns |
| Markets, bids and economics | **Econ Lab (ported)**, Salt Market, Blind Bid, **Quarry (ported)**, Ember Tricks |

Until a game is ported, its rules, runs and findings are readable at the tag
[`v0-final`](https://github.com/florianpirchner/swarmtales/tree/v0-final) under `stories/<name>/`.
