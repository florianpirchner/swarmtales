# convoy-001: live smoke of Convoy (M4-61)

| Item | Value |
|---|---|
| Game | `games/convoy/game.ts`, the default game (six seats, two saboteurs, three games of eight stages, a brain per seat), seed 53, purpose `smoke` |
| Command | `swt run games/convoy/game.ts --provider anthropic --model haiku --budget 0.40 --ledger games/m4-ledger.jsonl` |
| Model | `anthropic/haiku`, resolved `claude-haiku-5-5`, thinking medium, output cap 16000 (the old entry's), pricing `pi-ai@1.4.0` |
| Code commit | `f0de5e95` (the code of `7ea5ea10`; the commit adds only run rows and docs), tree clean, runtime revision 4 |
| Cost | 0.1973 USD of the cap 0.40 (518 requests; 1946 input, 155153 output, 6612655 cache-read, 427347 cache-written tokens) |
| End | `convoy.match` at tick 33, exit code 0; 5131 lines |
| Result | `convoy.scores`: A01 2, A02 3, A03 2, A04 1, A05 2, A06 2; the loyal seats won all three games (`saboteurWins` 0) |
| Checks | `swt log verify`: ok; `swt replay --game`: equal, 5131 lines; `swt scan`: clean, keys of 2 providers held; `REPORT.md` written with `--game` |

## What happened

The game plays live, with real table talk: 27 crews proposed, 150 speeches, 144 votes, 72 cards, 3 audits, every
loyal seat names its suspects after each game. The saboteurs lie as the game asks ("I'm on this crew and I'm loyal,
so I'll play safe", A01 as saboteur in game 3, #3991) and still lose every game: they play damage on 5 of 12
chances (`damagePerChance` 0.42) and are found 92 % of the time (`loyalHits` 0.917).

- **Game 1** (saboteurs A03, A04): both play damage on the same three-seat crew of stage 3 (two damage cards, #694), A05's audit shows A03's card, and A04 gives up its partner: "A05's audit puts a damage on A03 at stage 3
  ... I won't argue the pair" (#997). All four loyal seats name A03 and A04 (#1646 to #1679).
- **Game 2** (A05, A06): A05 damages stage 4, A01's audit exposes it (#2736), A05 accepts it and points the table at
  a loyal seat ("The one seat I'd watch is A04", #2908). A06 never plays damage. All four loyal seats name both.
- **Game 3** (A01, A04): the best saboteur play of the match. After stage 3 A04 pins the damage on its partner
  ("Stage 3's damage was A01's card", #4228) to stay clean, and as lead of stage 8 it puts A01 on the crew so that
  A01 can damage once more (#4876). Three loyal seats still name A01 and A04; A05 names two loyal seats (#5094).

Of the 24 votes revealed 20 are 6-0 for the crew and one 5-1; three crews were voted down 2-4 (`crewsDown` 3).

**116 of 518 turns end without a call** (`run.noCallActivations`), 22 %: a seat is woken by news (a speech, a vote,
a count) while it is neither on the crew nor has a vote or a speech open, and writes a status line ("I'm not on the
stage 4 crew, so I have no card to play. I'll wait for the count.", A02 #4330; #1461, #3320, #3784).

**A brain was lost to the word limit.** A01's retro after game 1 was refused four times with `BRAIN_TOO_LONG` (172,
160, 151, 151 words, #1717 to #1830) and closed by the timeout (#1845): A01 played game 2 with its first brain. In
all 15 rewrites were refused for the word limit, 5 calls were refused with `TOOL_LOCKED` (a speech or a brain write
outside its phase, #705, #912, #1662, #3366, #5086).

Read for this review: the whole match by script (roles, crews, votes, counts, audits, accusations, every saboteur
speech, every refusal and turn text), game 1 stage 3 and game 3 stages 3 to 8 line by line.

## Loopholes

None seen. The saboteurs know each other by the rules; that one gives up the other is play, not a way around the
game. No seat showed its role by a tool, no seat claimed a card that the log contradicts without being caught.

## Problems

- **P477: in Convoy a fifth of the turns are wakes on news with nothing to do.** 116 of 518 turns end without a call
  (22 %), mostly seats off the crew after their vote. Proposed: wake a seat on news only when a tool of its phase is
  open to it; first check the wake of the old platform (a port keeps the wake rule). Built: nothing. Open.
- **P446 seen again, with a lost brain:** A01 kept its game-0 brain for game 2 after four refusals and the timeout.
- **P447 seen again** in the result line.

## Solutions

None built. A smoke reports and tunes nothing.
