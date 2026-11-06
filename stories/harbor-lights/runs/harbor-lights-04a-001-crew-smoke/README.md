# harbor-lights-04a-001-crew-smoke

First live run of `harbor-lights` (core story, `swt run --story harbor-lights-g2 --provider anthropic --model haiku`):
4 Haiku seats, seed 31, two games, the **crew arm**: one shared crew brain (150 words), a team chat open only
between games (and once before game 1), the retro captain rotating. Run on 2026-11-06 with the first end rule
(the game ended after a whole round without a lit card; changed after this run, P171). A short smoke test.

**Result.** The match finished in 10 virtual minutes (73 allowed): no forfeit, no move timer action; 37 plays,
32 signals, 24 discards. **Game 1: 11 of 35 lit** (the bot crew on the same deal: 21), ended dark with 9 cards
still in hands. **Game 2: 22 of 35** (bot crew 22), every card lit or lost. The signed log verifies.
**Cost 0.098 USD**, 206 requests; the reporter draft cost 0.0083 USD more (OpenRouter).

| Game | Lit | Bot crew | Lost (discarded + misfires) | Signals (rank) | End |
|---|---:|---:|---|---|---|
| 1 | 11 | 21 | 15 (13 + 2) | 15 (11) | dark round |
| 2 | 22 | 22 | 13 (11 + 2) | 17 (10) | complete |

## Digest highlights

- **The crew agrees on "a signal means play it" before game 1.** In the opening chat A02 proposes "a rank or suit
  signal means this card is playable now" (#48), A03 and A04 sharpen it to "a signal should only name a card that
  is the next playable rank" (#56, #63); A01 writes brain v1 with it (#92).
- **Two guesses in game 1.** A02 plays a one-in-three: "Rose 2 is the only one I can play now ... I'll take the
  one-in-three chance" (#257, Rose 6, a strike). A03 plays its slot on an "Amber" signal and it is Amber 5 (#276).
- **The retro diagnoses the game well.** A03: "I played slot 4 on a suit-only signal ... Only play when the rank is
  certain" (#706); A04: "Rank signals were the real unlocks" (#713); A01: "Discards were the biggest leak: 13 of 35"
  (#725). Brain v2 (#784) says "signal with rank first" and "never discard unknown cards". Game 2 doubles the score
  to 22, level with the bot crew.
- **They try to talk during play.** Three `postTeam` calls in a game were refused (`TOOL_LOCKED`, #156, #286, #825);
  A02: "The team channel is locked during the game, so the note didn't post" (#838). The signals stayed the only
  message during a game.
- **A wrong rule from the prior.** Both brains keep "discard dead slots (rank already lit, below its tower)", which
  cannot happen in this deck (P170).

## Loopholes

None. The chat lock held (three attempts refused), no seat acted out of turn successfully (2 `NOT_YOUR_TURN`), and
no resident ever saw its own cards: the deal and the draws (`deal_revealed`, `card_drawn`) have audience `human`.
The draft's two loophole candidates are wrong: "the brain as a substitute for playing" was the retro window,
which holds the game by design, and blind plays with spare strikes are a choice the rules allow (P172).

## Problems

| # | Problem | Solution |
|---|---|---|
| P170 | Brains discard "dead" cards that cannot exist; blind discards are the main loss. | built after the run: the rules line says no card is ever dead and every loss costs a point (not measured live) |
| P171 | The dark round ended game 1 right after two setup signals, with 9 cards in hands. | built after the run: a signal also resets the dark count (bot crew 22.3 -> 22.5) |
| P172 | Suit-only signals and spare strikes invite guesses; at least 3 of 4 misfires were guesses. | open: a guess measure (plays with more than one candidate) for the report |
| P173 | Crew against solo cannot be read from one match. | open: more matches per arm on several seeds |
| P120 | (existing) Brains overrun the word cap: 7 `BRAIN_TOO_LONG`, A02 needed six tries for v2 (#732-#784). | open, as before |
| P89, P103 | (existing) The reporter is city-shaped (levels, submissions, "stuck on level 1"). | open, as before; this README is the reviewed report |
