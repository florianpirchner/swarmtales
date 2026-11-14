# Oracles: City of Keys, the City slice (`stories/cityofkeys`)

Format and rules of comparison: [../README.md](../README.md).

The City of Keys is not exported whole. These files are the slice that
`docs/refactoring-before-release/05-challenge.md` section 5.5 asks for: six scripted residents and the parts no
tabletop game touches.

| File | Variant | Source | Covers |
|---|---|---|---|
| `cityofkeys-act1-s7.json`, `cityofkeys-act1-s11.json` | the story from its start, six residents, 12 minutes | scripted (`cityActOne`, `cityGamemaker`) | talk on the board and by DM with delivery and receipts, transfers on the ledger, rewards and penalties, wrong codes (`INCORRECT`, `INVALID_FORMAT`), locked tools, names chosen, levels 1 to 7 passed, the end of act one and the start of act two with its deal, the scripted director's actions, one board post of the gamemaker |
| `cityofkeys-act1-s7-resumed.json` | the same run, saved after minute 6 and continued on a fresh instance | the same script | save and resume: one `resume` entry; every other entry equals `cityofkeys-act1-s7.json` |
| `cityofkeys-act2-s7.json` | act two with a target of half the residents, continued from a saved first act | scripted (`actTwoResidents`, `actTwoGamemaker`) | delivery receipts, two blames judged by a model role (`role_asked`, `role_answered`), a faction draft, three tribunals with votes (`SELF_VOTE` refused), a ransom that brings a resident back, a last will (one refused: `UNKNOWN_FACTOR`), three exiles and what follows each, and a gamemaker that plans the second tribunal (one plan refused: `INVALID_COUNT`) |

Source of the calls. All three scripts play through the app's own path with scripted models: one turn per
resident and minute, one answer with tool calls or none. The act-two script is the scenario of
`test/stories/cityofkeys-tribunal.test.ts`.

The setup is a story definition: `setup.definition.file` names it (`setup/cityofkeys.story.json`;
`setup/cityofkeys-act2.story.json` differs in the tribunal's target, first call and length) and
`setup.definition.effective` holds the run dials.

**The starting state of the act-two file is not in the file.** Its timeline begins with a `resume` entry: the run
continues from `examples/cityofkeys-act1-06a-01/snapshot-L7.json`, the saved first act of a recorded live run. A
platform that cannot load that state uses the file as the reference for the order and the content of the events
of a tribunal and an exile; the act-one files are replayable from their inputs alone.

What follows an exile in the file, in this order: the city's board posts (the closed gate, the last will),
`exiled`, `resident_suspended`, `piece_kept` (the city keeps a counter-factor or a certificate that a resident
still needs, and sells it) with a notice to the resident who needs it, the ledger entry that burns the exiled
resident's points, `goal_resolved` with its board post, and `level_contracted` for every level nobody has
reached. A piece given away by a last will shows as `piece_given` before the exile.

Not covered, and why:

- **A burned puzzle piece (`factor_burned`).** Under today's rules a certificate or counter-factor no longer burns
  when a tribunal exiles its holder (P43); only a fragment burns, and no scripted run here exiles a resident on a
  fragment level. `test/mechanics/exile` covers the burn on stand-ins.
- **A decision with a window (`decision_proposed`, `decision_settled`).** No mechanic of the story opens one in
  these runs. The gamemaker's part is its tool calls and its looks (`overseer_called`, `overseer_answered`).
- The human's hand (pause, instruction, amendment), the classifier, the weaver, the seal's auction beyond its
  opening, levels 8 to 10 played to their end, 12 or more residents.
- Model text: the scripted models answer with fixed words, which are not in the file.
