# @swarmtales/testkit

Scripted and fake drivers, play, fixture mechanic, conformance checks and the oracle runner.

Holds the scripted, fake and idle drivers, `testKernel` and `play`, `replay`, the fixture mechanic, the conformance
checks, the standing checks (`checkReplay`, `checkResumeEveryBoundary`; `answeringReview` answers the stage `review` the
same way on both sides) and the oracle projection. Its place in the layer table is in [`docs/LAYERS.md`](../../docs/LAYERS.md).
