# Oracles: Whispers (`stories/whispers`)

Format and rules of comparison: [../README.md](../README.md).

| File | Variant | Source | Covers |
|---|---|---|---|
| `whispers-s7.json`, `whispers-s11.json` | default: six residents, receipts on, 20 minutes | scripted (`whispersResidents`, `whispersGamemaker`) | the seeded whisperer and its duties, three popularity votes with ballots and results, DMs with delivery, a forged receipt, board posts, doors opened and refused (`DOOR_CLOSED`), a message stopped by a tool guard (`GUARD_BLOCKED`), blockers found by the standoff, the ledger entries of rewards, one private notice of the gamemaker |
| `whispers-rumours-s7.json` | no receipts to show (`whispers-rumours`) | the same script | the second factor of the story: word against word |
| `whispers-holdout-s7.json` | default, 26 minutes, with a blocker | scripted (`whispersHoldout`, `holdoutGamemaker` of `scripts/oracles/m5-players.ts`) | the holdout tribunal to its end: everyone opens its doors with its own code (the whisperer too), the victim `A02` stops before door 3 and gets every door-3 fragment by DM but the favourite's; `blocker_found` (door 3, `A03`, lacking `A02`) at minute 15, `callTribunal` by the gamemaker, the grace runs out (`graceFailed`, announced by the city), three votes of 4 yes and 1 no (the whisperer votes no; `tribunalVote` and `holdout_ballot`), the first failure announced by the gamemaker (`announceTribunal`), the second by the city, then `drawLot` (the lot falls on the accused, `A03`) and `permaDeath`: `holdout_ended` with outcome `lot`, `exiled` (`by: "holdout"`), the suspension, and the struck resident's fragment released to `A02`; recorded for M5-11 |

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

The holdout file was recorded for M5-11 (`12-m5-spec.md`, section 3.4, addition 1, decision A59) on the branch
`oracle/m5` of the old platform; `../m5-catalog.patch` holds its catalogue entry and the players. Its scripted
gamemaker's replies are not in the file (a call of a caller that is no resident carries no `reply`).

Not covered: text of real models, the classifier and its labels (see `../cityofkeys`), the weaver; of the holdout
tribunal: a grace that is used (`dropped`), a unanimous vote (`banished`), a tribunal `spared` because the lot has
struck at its door before, the strike by the city itself after `fallbackMinutes`, an accused drawn among several
blockers, the accused's DMs exempt from the cap, `blocker_cleared`; runs longer than 26 minutes (doors 5 to 7, the
final vote), a save and a resume (see `../cityofkeys`).
