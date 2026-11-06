# harbor-lights-04a-003-arm-series

The three arms of `harbor-lights` against each other: 4 matches per arm (seeds 31, 37, 41, 43), 3 games
each, 4 Haiku seats, the rules as merged in PR #117 (P170 briefing line and P171 end rule in). The same
seed deals the same cards in every arm. Run on 2026-11-06, all 12 matches in parallel
(`swt run --story harbor-lights[-solo|-nobrain] --seed <n> --provider anthropic --model haiku`).
Coordinator decision on Flo's delegation: 4 matches per arm, about 3 USD.

**Result.** 36 games, no forfeit, no move timer action, every match finished. **Cost 1.95 USD** for the
12 matches (crew 0.67, solo 0.71, nobrain 0.58), plus about 0.06 USD for the 12 reporter drafts (OpenRouter).
**No arm effect:** mean lit per game crew 20.8, solo 19.5, nobrain 18.9, against the bot crew's 22.9 on the
same deals; the spread (standard deviation 5.5 to 7 per game) is far larger than the gaps. What decides a
match is the **strike-out**: 9 of 36 games end at the third misfire with 12.2 lit on average; the 27 other
games light 22.2, level with the bot crew (22.7 on those deals) in every arm.

| Arm | Games 1 / 2 / 3 (mean lit) | All games | Median | Strike-outs | Completed games | Discards / game | Misfires / game | Rank share of signals |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| crew | 22.8 / 18.2 / 21.2 | 20.8 | 22 | 2 of 12 | 22.5 | 10.5 | 1.9 | 0.65 |
| solo | 17.0 / 20.5 / 21.0 | 19.5 | 20 | 4 of 12 | 21.5 | 10.9 | 2.3 | 0.57 |
| nobrain | 17.0 / 20.5 / 19.2 | 18.9 | 22 | 3 of 12 | 22.6 | 9.4 | 2.3 | 0.62 |
| bot crew (same deals) | 23.2 / 23.0 / 22.5 | 22.9 | | | | | | |

| Match | Game 1 | Game 2 | Game 3 | Bot crew |
|---|---|---|---|---|
| crew 31 | 21 | 19 | 18 (strikes) | 21, 22, 24 |
| crew 37 | 23 | 6 (strikes) | 21 | 24, 24, 22 |
| crew 41 | 25 | 24 | 24 | 23, 24, 23 |
| crew 43 | 22 | 24 | 22 | 25, 22, 21 |
| solo 31 | 19 | 21 | 20 | 21, 22, 24 |
| solo 37 | 20 (strikes) | 17 (strikes) | 21 | 24, 24, 22 |
| solo 41 | 24 | 24 | 20 (strikes) | 23, 24, 23 |
| solo 43 | 5 (strikes) | 20 | 23 | 25, 22, 21 |
| nobrain 31 | 1 (strikes) | 22 | 8 (strikes) | 21, 22, 24 |
| nobrain 37 | 22 | 23 | 23 | 24, 24, 22 |
| nobrain 41 | 24 | 22 | 24 | 23, 24, 23 |
| nobrain 43 | 21 | 15 (strikes) | 22 | 25, 22, 21 |

## Digest highlights

- **The best crew writes a real convention.** Crew 41's brain v3: "A rank/suit named covers only playable cards
  now ... Keep one strike in reserve; don't guess 1/3 odds" (`harbor-lights-41`, #1463). That crew lit 25, 24, 24
  and beat the bot crew in two of three games; it is the only match of the series above the bot overall. One seed.
- **A game lost in eleven turns.** `harbor-lights-nobrain-31` game 1: A02 plays a slot at "about 25%" (#67, Rose 6),
  A03 plays the newest card of a "Moss" signal that was given to inform, not to play (#96, Moss 7), and A03 plays
  after an "Amber" signal (#149, Amber 5): three strikes, 1 card lit. The signal givers meant "this is Moss", the
  receivers read "play this" (P175).
- **At two strikes everyone freezes.** Seats stop playing and signal or discard instead ("a misfire would end the
  game", `nobrain-31` #126; `solo-41` #1961), which is right once a miss ends the game.
- **A harmless signal keeps the game alive.** In `harbor-lights-31` game 3, after the last draw, A02 signals "6"
  and then "Moss" to A03 only "to keep the round going" while A03 plays its 6s (#2315, #2336): since P171 a signal
  resets the dark count (LH14).
- **"Dead" cards survive the fix.** The briefing now says no card is ever dead (P170), yet 8 of 12 crew brains and
  19 of 48 solo notes still say "discard only dead cards" (P170 stays open).
- **The dark round never ends a game any more.** All 36 games ended complete (27) or by strikes (9); P171 holds.

## Loopholes

| # | Loophole | Effect | Status |
|---|---|---|---|
| LH14 | **A harmless signal resets the dark count.** After the last draw a seat with nothing safe to do signals a card the receiver already knows, only to keep the game from ending (`harbor-lights-31`, #2315, #2336). | small: bounded by the signal tokens, and it lets a teammate play out known cards, which is the intent of P171 | kept on purpose |

The reporter's other loophole candidates (discarding to win signals, signalling instead of playing at two
strikes, the pre-game retro) are the rules working as designed. One seat misread the end rule: "a discard gives a
signal, which resets the four-turn count" (`nobrain-43` #1860); a discard does not reset it, the status wording is
ambiguous (P176).

## Problems

| # | Problem | Solution |
|---|---|---|
| P173 | (answered) Crew against solo: no arm effect in 12 matches; crew 20.8, solo 19.5, nobrain 18.9 lit per game, spread 5.5-7. | the series is the answer for now; a difference below about 2 cards would need 30+ matches per arm |
| P174 | **Strike-outs decide the score.** 9 of 36 games end at three strikes with 12.2 lit (bot crew 23.4 on those deals); the other 27 light 22.2, level with the bot crew. | open: proposals for Flo: the status shows each slot's chance to be playable (models compute it anyway, `nobrain-31` #67); or the third strike costs points instead of ending the game |
| P175 | **A signal meant as information is read as "play this".** Givers name a suit to inform, receivers play its newest card (`nobrain-31` #96, #149). Only one crew (41) wrote down what a signal means. | open: proposal: the retro prompt asks the crew to agree on what a signal means |
| P176 | **The dark count's wording is ambiguous.** "Turns in a row that lit no card and gave no signal" was read as "a discard (which gives a signal back) resets it" (`nobrain-43` #1860). | open: proposal: "no card lit and no signal given to a teammate" |
| P170 | (update) "Dead" cards still in 27 of 60 brains despite the briefing line. | open: proposal: the debrief names the discards that were still needed |
| P120 | (existing) Brains overrun the word cap: 22 `BRAIN_TOO_LONG` refusals in 12 matches. | open, as before |
| P89, P103 | (existing) The reporter drafts are city-shaped ("level unsolved", "stuck"). | open; this README is the reviewed report of all 12 drafts |
