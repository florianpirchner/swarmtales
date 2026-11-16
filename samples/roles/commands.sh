# SPDX-License-Identifier: LicenseRef-SUL-1.0
# The commands of sample 3 (README.md, "Run it"), run from the root of the repository.
# test/tutorial.test.ts runs every line in process, in this order, and checks what each prints.
node --conditions development apps/cli/src/bin.ts run samples/roles/game.ts --fake
node --conditions development apps/cli/src/bin.ts log verify runs/roles-001
node --conditions development apps/cli/src/bin.ts replay runs/roles-001 --game samples/roles/game.ts
