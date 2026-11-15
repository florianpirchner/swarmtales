# @swarmtales/mechanic-holdem

Mechanic: fixed-limit hold'em with duplicate deals.

Ported from the old platform in two issues of milestone M4. Issue M4-37 carried the cards (`src/cards.ts`: the deck,
the hand evaluator, the equity and range-equity estimates), the betting model (`src/model.ts`) and the prompt files,
with their old tests (`test/cards.test.ts`, `test/model.test.ts`), and wrote the head (`src/head.ts`); the byte-identity
list is `test/carried.test.ts`. The flow, the texts and the mechanic itself follow with issue M4-38, which also writes
this README's sections. Its place in the layer table is in [`docs/LAYERS.md`](../../docs/LAYERS.md).
