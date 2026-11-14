# @swarmtales/game-hello

Game: the Hello Game of the README, sample 1. Tic-tac-toe between two residents, `ada` (X) and `bob` (O), one game.

[`game.ts`](game.ts) is the whole game: one mechanic (`grid-game`), the `turns` scheduler with the activation
`toAct` (the mechanic names the resident that is on move, so every activation is one move), a tick limit and the
fact that is the result line. The code block of the root README is this file; `test/hello.test.ts` holds the two
equal, plays the game with the fake driver and runs `swt run --fake` on it.

```bash
node --conditions development apps/cli/src/bin.ts run games/hello/game.ts --fake
```
