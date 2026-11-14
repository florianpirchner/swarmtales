// SPDX-License-Identifier: Apache-2.0
/**
 * The runtime revision: a number that changes only when the kernel changes how a run plays (when an actor is
 * activated, what it is shown, how tool notices and answers arrive), not with every commit. Runs of one revision
 * are comparable; runs of different revisions are not mixed in a comparison without saying so. Every run writes
 * it into its manifest. Raise it in the same pull request as such a change, add a row to
 * `docs/RUNTIME-REVISIONS.md` and set the tag `runtime-rN` at the merge commit. The rewritten kernel starts at 3.
 *
 * @public
 */
export const RUNTIME_REVISION = 3;
