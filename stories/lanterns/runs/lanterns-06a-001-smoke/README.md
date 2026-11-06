# lanterns-06a-001-smoke

First live run of `lanterns` (core story, `swt run --story lanterns-g2 --provider anthropic --model haiku`):
6 Haiku residents in two teams of three, seed 31, two games (each team starts once), team brains on (200
words), keepers A01 and A04 in game 1, A02 and A05 in game 2. Run on 2026-11-06. A short smoke test; longer
runs come later.

**Result.** The match finished in 11 virtual minutes (205 allowed): 16 clues, none missed, 21 guesses, no
guess refused, no keeper tried to post during a game. The signed log is in `run/`. Both games ended early
because one team had all its words revealed. Match points: **teal 17, amber 9**.
**Cost 0.045 USD**, 175 requests (cache reads 1.02M tokens). The reporter draft cost 0.0026 USD more
(OpenRouter); it is `run/REPORT.md`, city-shaped as usual (P89), and this README is the reviewed report.

| Game | Starts | Points (amber, teal) | Clues (amber, teal) | Mean number (amber, teal) | Recall (amber, teal) | Precision (amber, teal) | Ended by |
|---|---|---|---|---|---|---|---|
| 1 | amber | 10, 6 | 5, 4 | 1.4, 1.5 | 0.86, 0.83 | 1.00, 0.83 | amber's words all found |
| 2 | teal | -1, 11 | 3, 4 | 1.0, 1.5 | 0.67, 1.00 | 0.67, 1.00 | teal's words all found |

Recall: the keeper's declared targets that the seekers revealed, over the sum of the clue numbers.
Precision: guesses that hit an own word.

## Digest highlights

- **Clean first clues.** A01 opens with "instrument" 2 for fiddle and flute (#187), both found and the clue
  lands (#255); A04 answers "fruit" 1 for grape (#271) and "desert" 2 for fox and canyon (#526, landed #591).
- **A grid word named "shadow" fooled a seeker.** Teal's "spooky" 2 meant ghost and clock (#678). After
  ghost, A05 warned that "shadow" is "one of the grid's shadow words candidates" (#699); A06 went for it
  anyway as the only spooky word left (#723) and hit fog (#725). The word was in the pool and also the name
  of a card type (P190, fixed).
- **The keeper saw the danger and clued into it.** In game 2 A02 gave "fruit" 1 for apple and wrote in the
  sealed reason that it "avoids grape (shadow)" (#986), but grape was on the grid; both seekers agreed "grape
  is the more obvious fruit" (#1030, #1044), A01 revealed the shadow (#1046) and amber lost 3. The silent
  keeper knew it at once: "A03's advice is wrong. Grape is a shadow ... I can't post in the team chat" (#1036).
  This is the gap between intent and reading the game is meant to measure (P192).
- **Brains learn caution, not conventions.** Both team brains after game 1 say "default to 1, give a 2 only
  when both links are obvious" and quote game-1 clues as examples ("desert": canyon, fox). Amber's brain
  records a wrong fact: "Teal's weak second link on a 2-clue hit shadow" (it was fog, #725).
- **Timid play.** 10 of 16 clues carry the number 1, 6 carry 2 (4 of them landed), none more; no caller ever
  takes the extra guess (one stopped below the number, #629), so a game takes only 7-9 clues (P191).

## Loopholes

None seen. The keepers' targets, reasons and the key stayed sealed (`clue_intent`, `clue_key_dealt`,
`clue_closed` have audience `human`); no keeper tried to post during a game (0 `KEEPER_SILENT`); the brains
carry example words from the last grid, which does not help on a new grid. The reporter's two loophole
candidates are wrong: writing a brain before game 1 is the design, and the "fruit" clue was a mistake, not
a trap.

## Problems

| # | Problem | Solution |
|---|---|---|
| P190 | **A grid word was also the name of a card type.** "shadow" was in the word pool; seekers read the word as a hint that it is a shadow card (#699, #723). | built: "shadow" removed from the pool; a test keeps owner names (amber, teal, fog, shadow) out of it |
| P191 | **Keepers are timid and seekers never take the extra guess.** Mean number 1.0-1.5, no clue above 2; the extra guess was never taken. A game is over after 7-9 clues, so the clue cap (8) and the landed bonus barely matter. | open: proposal: landed bonus of number - 1 (a 3 pays 2), a lower clue cap (5 per team) so ones cannot finish, then a run against this one |
| P192 | **A clue pointed at a visible shadow.** "fruit" for apple with grape on the grid as a shadow (#986); the keeper had checked the shadows and still chose it. | open, by design: it is the skill the game measures; proposal: count in the reference how often a clue's strongest other reading is a shadow or an opponent word (a judge model, report only) |
| P193 | **Brains overrun the word cap** (as P96, P120): 2 of 4 retro writes were refused at 254 and 259 words against 200 (#797, #816). | open (as P120) |
| P194 | **A keeper called giveClue out of turn.** A02 tried a clue during teal's turn (#1335); the lock held (`TOOL_LOCKED`, #1337). Also: in the offline test a caller who used its steps in the minute its guess ended the game could not write the brain (`STEP_LIMIT`). | built: the step limit is 12 a minute (was 8); the out-of-turn call is harmless and stays open |
| P89 | (existing) The run reporter is city-shaped: levels, submissions and "stuck on level 1" for a word game. | open (as before) |

## Optimizations (proposals, not built)

- Make ambition pay (P191): a landed bonus that grows with the number, a lower clue cap, then compare the
  mean number and recall with this run on the same seed.
- Run the full three-game match and the `lanterns-nobrain` arm on the same seeds, so every member keeps once
  and the question "do conventions survive a change of keeper" gets data.
- A mixed table later: the keeper on another model than its seekers, to see whether clue conventions
  transfer between models.
