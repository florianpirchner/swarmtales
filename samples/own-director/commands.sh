# SPDX-License-Identifier: Apache-2.0
# The commands of the tutorial docs/tutorials/director.md, run from the root of the repository.
# test/tutorial.test.ts runs every line in process, in this order, and checks what each prints.
node --conditions development apps/cli/src/bin.ts run samples/own-director/game.ts --fake --hand samples/own-director/hands/amend.jsonl
node --conditions development apps/cli/src/bin.ts log verify runs/own-director-001
node --conditions development apps/cli/src/bin.ts resume runs/own-director-001 --game samples/own-director/game.ts --hand samples/own-director/hands/amend.jsonl
node --conditions development apps/cli/src/bin.ts log verify runs/own-director-002 --previous runs/own-director-001
node --conditions development apps/cli/src/bin.ts replay runs/own-director-002 --game samples/own-director/game.ts
