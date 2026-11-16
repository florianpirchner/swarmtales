# SPDX-License-Identifier: LicenseRef-SUL-1.0
# The commands of sample 4 (README.md, "Run it"), run from the root of the repository.
# test/tutorial.test.ts runs every line in process, in this order, and checks what each prints.
node --conditions development apps/cli/src/bin.ts run samples/shipped-director/game.ts --fake
node --conditions development apps/cli/src/bin.ts run samples/shipped-director/game.ts --fake --set direction=8
node --conditions development apps/cli/src/bin.ts log verify runs/coached-game-002
node --conditions development apps/cli/src/bin.ts replay runs/coached-game-002 --game samples/shipped-director/game.ts
