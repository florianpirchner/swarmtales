# Quarry

Four solo seats (A01-A04, seated in that order around a table) play a match of **drafting games**, one
after another. In each game every seat opens a pack of cards, keeps one card (`pick`) and passes the rest
on; the next pack comes from the seat on the other side. When every pack is empty the next pack round
starts and the passing turns direction. The cards are four resources (amber, basalt, cobalt, jade) and a
wild ore (lodestone). At the end of a game each quarry scores:

- every resource the **square** of its cards (1, 4, 9, 16, ...), so one lane pays and a contested lane
  pays nobody;
- a **lodestone** joins one set as one more card, at most one per set, on the biggest sets;
- **5 points** for strictly the most cards of a resource (lodestones do not count; a tie scores nothing,
  so a hate pick can cost a neighbour its bonus);
- **burns** (only in the arm `quarry-burn`; off by default since P125): with a pick a seat may destroy one
  more card of the pack before it moves on, twice a game at most, for free. At the game's end every seat
  is told each burn and whether its pack came back to the burner later, so the burned card could have
  been its own (P126);
- a **place bonus** per game: 10 points for the best quarry, 5 for the second (a tie shares the better
  place). It is what makes denial pay: in a points-only game a burn only helps the two other rivals.

Picks are sealed and simultaneous. A seat sees only its own pack, its own quarry and who passed the pack
to it; every quarry is shown when the game ends. There is no table talk. A seat that does not pick in
time gets the first card of its pack. The game is an original design (working title from
[docs/ideas/game-roadmap.md](../../docs/ideas/game-roadmap.md) §2.4); it copies no published draft game.

Every game starts from a fresh context. The only memory a seat carries from one game to the next is its
private **strategy brain**, a short text it writes before the first game and rewrites after each game. The
question is whether a seat learns to read what its neighbours pass and to stay out of their lanes. The
`draft-rounds` mechanic scores every pick against the greedy pick (`regret`: set points left on the table;
`denied`: the card was the receiver's best, a hate pick) and every game against four greedy seats on the
same deal, in the event `draft_game_scored`, for the human and the reporter only.

Scripted bots on 2000 deals (default rules) show the shape of the game: four greedy seats score about 75
each, four seats in four different lanes about 86, two seats fighting over one lane about 61 against 85 for
the others, and random picks about 49. Greedy is not optimal; avoiding a neighbour's lane is. For the burn
(P123): a burn that destroys a card the pack would have brought back costs the burner itself 2-6 points; a
late burn (the pack cannot come back) at no cost is worth exactly nothing in points alone, because it
hurts every rival but helps nobody; with the place bonus a late free burn of the receiver's best card pays
the burner about 1-2 points a game. `test/stories/quarry.test.ts` keeps this check.

```
swt run --story quarry --provider scripted     # offline, no model
swt run --story quarry                         # Haiku via Anthropic, three games of 2 packs of 6
```

Registered arms: `quarry` (brain on), `quarry-nobrain` (the same briefings, no brain, no retro),
`quarry-open` (every quarry visible during the game), `quarry-burn` (free burns, the hate-drafting arm; the
default until P125 showed that Haiku's burns cost the table 13 %; `quarry-noburn` is the old name of today's default). Further variants are factory options of
`quarryStory` in `story.ts`: `games`, `packs`, `packSize`, `openHands`, `maxWords`, `seed`; the scoring
numbers are options of the `draft-rounds` mechanic (`wilds`, `majorityBonus`, `burnCost`, `maxBurns`,
`placeBonus`, `deadline`). Mechanics: `draft-rounds`, `strategy-brain` (solo seats). Runs and results:
[runs/README.md](runs/README.md).
