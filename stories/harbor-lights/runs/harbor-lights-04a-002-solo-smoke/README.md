# harbor-lights-04a-002-solo-smoke

Second live run of `harbor-lights` (`swt run --story harbor-lights-solo-g2 --provider anthropic --model haiku`):
the **solo arm** on the same seed and deals as [001](../harbor-lights-04a-001-crew-smoke/): private notes per seat
(150 words), no chat at any time. Run on 2026-11-06 in parallel with 001, with the first end rule (P171).

**Result.** 12 virtual minutes (73 allowed), no forfeit. **Game 1: 23 of 35 lit** (bot crew 21), **game 2: 20**
(bot crew 22); both games ended complete (every card lit or lost). 46 plays, 39 signals, 24 discards.
**Cost 0.119 USD**, 252 requests; the reporter draft 0.0040 USD more.

| Game | Lit | Bot crew | Lost (discarded + misfires) | Signals (rank) | End |
|---|---:|---:|---|---|---|
| 1 | 23 | 21 | 12 (11 + 1) | 20 (10) | complete |
| 2 | 20 | 22 | 15 (13 + 2) | 19 (11) | complete |

## Digest highlights

- **Without any chat the seats still signal playable cards.** A04 signals A03 "1" for Cobalt 1 (#310), A01 signals
  A02 "3" for Rose 3 and Amber 3 (#424) and A02 plays Rose 3 right after (#438): the "signal a playable card"
  reading every model brings along is a convention in itself.
- **Game 1 beats the bot crew** (23 against 21) on the deal where the crew arm scored 11.
- **Every seat blames the discards.** After game 1 all four notes say discards were the main loss (#886-#940); A02's
  notes add a rule that is wrong here: "each discard kills a suit's higher ranks" (#893, P170).
- **Game 2 has a misfire chain.** A01 misfires Moss 2 (#1192), A02 Cobalt 4 (#1209); at two strikes A04 refuses to
  play blind and discards instead (#1311, #1332).

## Loopholes

None. No chat tool exists in this arm; no seat saw its own cards. The draft's candidate ("rewriting the brain
instead of playing") is the retro window by design.

## Problems

| # | Problem | Solution |
|---|---|---|
| P170 | Wrong prior rules in the notes ("dead" cards, a discard "kills" higher ranks). | built after the run: the rules line says no card is dead (not measured live) |
| P173 | Solo 23 then 20 against crew 11 then 22 on the same deals: no arm effect readable. | open: more matches per arm |
| - | Turns before a game starts: after writing the first notes, seats were woken while no game ran ("The first game hasn't started yet", #98). | open, minor: costs a few calls per retro |
| - | One `discardSlot` call hit the output token limit (#1335) and was re-issued. | none needed |
| P120 | (existing) 9 `BRAIN_TOO_LONG` refusals. | open, as before |
| P89, P103 | (existing) The reporter is city-shaped; its draft also claims the run "ended with the game still in progress" at 18 of 35, but game 2 ended complete at 20 (#1707) before the run end (#1715). | open; this README is the reviewed report |
