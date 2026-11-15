# @swarmtales/lab

Facts of a run, statistics, experiments and the computed run report.

Milestone M2 fills the package issue by issue. So far it holds the experiment spec, the results and noise-floor
schemas and the error catalogue of the codes `SWT-E001` to `SWT-E011`. Its place in the layer table is in
[`docs/LAYERS.md`](../../docs/LAYERS.md).

Since M4-08:

- The facts of a run with a model driver hold two keys per actor, `models.requests.<actor id>` and
  `models.costUsd.<actor id>`; an actor that asked nothing reads 0. A Director's asker counts like the driver.
  The run report shows them in the table "Spend".
- An unpaired estimate of `results.json` carries `nPerArm`; the interval of the mean of one arm is cut at zero
  when no value is negative.
- With `allowedRefusals`, the guardrails of `results.json` end with one row per arm of the metric `run.refusals`:
  held or not, with the `codes` outside the list.
- `experiment.json` holds a `started` line for every run in flight. A line that is still there at the next start
  was left by a killed process: its reservation counts in full against `budget.totalUsd`, its run is played
  again, and the analysis lists it as a deviation. Only a person takes such a line out.
