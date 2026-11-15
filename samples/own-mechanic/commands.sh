# SPDX-License-Identifier: Apache-2.0
# The commands of the tutorial docs/tutorials/mechanic.md, run from the root of the repository.
# test/tutorial.test.ts runs every line in process, in this order, and checks what each prints.
node --conditions development apps/cli/src/bin.ts run samples/own-mechanic/game.ts --fake
node --conditions development apps/cli/src/bin.ts log verify runs/own-mechanic-001
node --conditions development apps/cli/src/bin.ts replay runs/own-mechanic-001 --game samples/own-mechanic/game.ts
