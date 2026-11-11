# tictactoe-teams-04a-013-team-vs-solo

2026-11-11. Head to head on the 5x5 board (four in a row): **a team of three Haiku agents against one
Haiku agent alone**, the same model on both sides, no brain (`-nobrain`), six rounds of proposal and vote
per move (`-r6`). 25 matches of three games (seeds 201-213), the starting side alternates by game. New
variant for this run: `soloSide` (story names `-solo-o`, one agent O against the team X, and `-solo-x`,
one agent X against the team O). Run for the cross-game analysis
([docs/CROSS-GAME-FINDINGS.md](../../../../docs/CROSS-GAME-FINDINGS.md)): earlier runs compared team
against team (draws 22 of 48 games) with solo against solo (0 of 18), so they could not say whether a team
plays better, only that two teams draw more.

Cost 3.22 USD for 75 games (0.06-0.21 USD a match; the team side 2.49 USD, the lone side 0.74 USD), plus
0.12 USD for the reporter drafts. Each match folder holds `000-run.json`, the gzipped events and signed
chain, the public key, usage and the reporter's first draft `REPORT.md`; the numbers below come from the
events.

## Digest highlights

- **The team is ahead, but not firmly.** Team 31 wins, lone agent 23, draws 21 (75 games). The team
  takes 57 % of the decided games (95 % interval about 44-71 %) and 55 % of the points (win 1, draw
  0.5); it is ahead in 12 matches, behind in 7, level in 6. Either orientation gives the same picture
  (team X 15 / 13 / 11, team O 16 / 10 / 10).
- **The starting side matters more than the team.** The starter wins 34 of the 54 decided games. When the
  team starts it wins 18 and loses 7; when the lone agent starts the lone agent wins 16 and loses 13.
- **The team edge costs 3.4 times the calls.** 7604 requests for the team side against 2549 for the lone
  agent, 1191 team posts, 2.49 against 0.74 USD.
- **Teams draw where single agents decide.** 21 draws in 75 games here, between team against team (22 of
  48) and solo against solo (0 of 18, run 009): a team mostly adds defence, a second look that blocks a
  line, not a win the lone agent misses.
- **Team overhead: chat replaces tool state.** Members claim actions they never took ("I've cast my agree
  vote for 7", A06 in solo-x-s206 #2142, before any vote) and vote on proposals that were only posted in
  chat: 55 `NO_OPEN_PROPOSAL`, 16 `NOT_CAPTAIN`, 14 `NO_CONSENSUS`, 17 `TOOL_LOCKED` refusals on the team
  side, against none of these for the lone agent. Four team moves forfeited (none for the lone agent).

| Pairing | Games | Team wins | Lone wins | Draws | Team share of decided | Cost per match |
|---|---:|---:|---:|---:|---:|---:|
| team X against lone O (`-solo-o`) | 39 | 15 | 13 | 11 | 54 % | 0.13 USD |
| lone X against team O (`-solo-x`) | 36 | 16 | 10 | 10 | 62 % | 0.13 USD |
| all | 75 | **31** | **23** | 21 | 57 % | 0.13 USD |
| for comparison: team against team (runs 007, 011, 012) | 48 | | | 22 | | 0.23-0.28 USD |
| for comparison: solo against solo (run 009) | 18 | | | 0 | | 0.03 USD |

Per match (T team win, S lone win, d draw; games 1, 2, 3):

| Seed | `-solo-o` (team X) | `-solo-x` (team O) |
|---:|---|---|
| 201 | T S T | |
| 202 | S S d | S d d |
| 203 | S S S | T T T |
| 204 | S S d | S T T |
| 205 | T S d | T S S |
| 206 | T S d | d S S |
| 207 | T S T | d T d |
| 208 | d T d | S T d |
| 209 | T T T | d T S |
| 210 | d S d | d T S |
| 211 | d T T | T T S |
| 212 | S T d | T d T |
| 213 | d T T | d T T |

## Problems

- **P332: a team of three beats one agent of the same model only slightly, at 3.4 times the cost.** See the
  highlights; the starter edge is larger than the team edge.
- (existing, P89) The reporter drafts read the match as a city ("no submission", "levels solved: none")
  and report a vote bypass in solo-x-s206 that the events refute: A04 voted at #2169 and the consensus
  was reached (#2170) before the move (#2184).

## Loopholes

None new. The reporter's loophole candidates (votes on proposals made only in chat, a lone captain who
needs no vote) are the rules working: votes without a proposal are refused, and a side of one has nobody
to vote by design.

## Solutions

- Built for this run: `soloSide` in the story (`-solo-o`, `-solo-x`), with its own briefing lines ("against
  a team of three", "against a single player") and a scripted test.
- Proposed (not built): to separate the team edge from the starter edge, play an even number of games
  per match (2 or 4) so each side starts equally often; a larger series only if the team question is
  reopened.
