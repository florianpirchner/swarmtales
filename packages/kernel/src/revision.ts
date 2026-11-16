// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The runtime revision: a number that changes only when the kernel changes how a run plays (when an actor is
 * activated, what it is shown, how tool notices and answers arrive), not with every commit. Runs of one revision
 * are comparable; runs of different revisions are not mixed in a comparison without saying so. Every run writes
 * it into its manifest. Raise it in the same pull request as such a change, add a row to
 * `docs/RUNTIME-REVISIONS.md` and set the tag `runtime-rN` at the merge commit. The rewritten kernel started at 3; 4 takes
 * the log positions out of the payloads (decision A34); 5 lets the cost meter reserve the dearest answer so far
 * (decision A46, P472); 6 writes the closing of the cost meter on the log, as the record `cost_unknown` of the
 * model drivers (decision A47, M4-72); 7 reads a Director's answer as the last object in its text that the schema
 * of the answer accepts (decision A100, M5-88).
 *
 * @public
 */
export const RUNTIME_REVISION = 7;
