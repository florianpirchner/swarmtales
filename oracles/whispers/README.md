# Oracles: Whispers (`stories/whispers`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `whispers-s7.json`, `whispers-s11.json` | default: six residents, receipts on, 20 minutes | scripted (`whispersResidents`, `whispersGamemaker`) | the seeded whisperer and its duties, three popularity votes with ballots and results, DMs with delivery, a forged receipt, board posts, doors opened and refused (`DOOR_CLOSED`), a message stopped by a tool guard (`GUARD_BLOCKED`), blockers found by the standoff, the ledger entries of rewards, one private notice of the gamemaker |
| `whispers-rumours-s7.json` | no receipts to show (`whispers-rumours`) | the same script | the second factor of the story: word against word |

Source of the calls: the script of the golden run `whispers-f10-grudge` (`test/golden/host-scripts.ts`), played
through the app's own path with scripted models: every resident takes one turn per minute and answers with one
tool call or none. The gamemaker is a scripted model too; its one call (`notify`) is a `call` entry of actor
`gamemaker`, and each of its looks shows as `overseer_called` and `overseer_answered` (source `core`).

The setup is a story definition, not a list of mechanic options: `setup.definition.file` names the definition
(`setup/whispers.story.json`, `setup/whispers-rumours.story.json`) and `setup.definition.effective` the run dials.
The golden run's prompt dials (figure direction 10, the grudge addendum) are not applied: they change system
prompts only, which an oracle does not hold.

Hidden information: who the whisperer is shows in `whisperer_chosen`; fragments are in `fragments_dealt`.

Why not a recorded run: the eight recorded runs were played with live gamemaker, classifier and guard models
whose answers are not tool calls of residents; a replay would need those answers scripted as well.

Not covered: text of real models, the classifier and its labels, the weaver, a tribunal, runs longer than 20
minutes, a save and a resume (see `../cityofkeys`).
