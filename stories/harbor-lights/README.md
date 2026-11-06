# Harbor Lights

An original cooperative card game of hidden hands for a crew of four Haiku seats, on the `hint-towers` and
`card-table` mechanics. The harbour wall has five signal towers (Amber, Cobalt, Moss, Rose, Violet), each lit
from rank 1 to 7. Every seat holds four cards it cannot see and sees everyone else's. On a turn a seat gives a
signal (all cards of one suit or one rank in a teammate's hand; six signal tokens), plays a slot (lit if it is
the tower's next rank, else a misfire and a strike), or discards a slot to win a signal back.

What makes it its own game:

- **Every card exists once** (35 cards), and a lost card is **bridged**: its tower skips the gap, so a loss
  costs exactly one point and never blocks a tower.
- **The dark round.** After the last draw the game goes on until a whole round of turns neither lights a card nor
  gives a signal (since P171; the first runs ended after a round without a lit card, which cut off signalled plays).
- **The engine keeps each seat's knowledge** (what signals told it, which cards a slot can still be) and shows
  it in the status, so a context reset loses nothing and the game measures signalling, not memory.
- **A reference crew of bots** plays every deal too (one convention: the newest card a signal touches is meant
  to be played). Over 2000 deals it lights 22.3 of 35 on average.

Arms (same seed, same deals): `harbor-lights` keeps one shared **crew brain**, discussed in a team chat that is
open only between games and written by a rotating captain (the crew may agree conventions);
`harbor-lights-solo` gives each seat private notes and no chat; `harbor-lights-nobrain` keeps nothing.
`-soft-strikes` (for example `harbor-lights-soft-strikes`) is the soft-strike arm: the third strike no longer
ends the game; it and every later misfire cost 3 points instead (P174). The crew retro is asked to agree
which signal means "play now" and which only informs (P175). Add
`-g<N>` for N games (default 3), for example `harbor-lights-solo-g2`.

```sh
pnpm swt run --story harbor-lights-g2 --provider anthropic --model haiku
```

Runs: [runs/](runs/README.md).
