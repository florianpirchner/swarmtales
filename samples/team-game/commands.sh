# SPDX-License-Identifier: LicenseRef-SUL-1.0
# The commands of sample 2 (README.md, "Run it"), run from the root of the repository.
# test/tutorial.test.ts runs every line in process, in this order, and checks what each prints.
node --conditions development apps/cli/src/bin.ts run samples/team-game/game.ts --fake
node --conditions development apps/cli/src/bin.ts run samples/team-game/game.yaml --fake
node --conditions development apps/cli/src/bin.ts log verify runs/team-game-002
node --conditions development apps/cli/src/bin.ts replay runs/team-game-002 --game samples/team-game/game.ts
node --conditions development apps/cli/src/bin.ts run samples/team-game/game.ts --fake --set games=2
