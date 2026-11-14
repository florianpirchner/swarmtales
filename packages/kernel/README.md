# @swarmtales/kernel

The single-writer state machine over an append-only log.

Holds `createKernel`: the log, the tool dispatch and its pipeline, services, the clock, actors and suspensions,
access locks, the seeded random streams, and snapshot and restore. Its place in the layer table is in
[`docs/LAYERS.md`](../../docs/LAYERS.md).
