/**
 * The runtime revision: a number that changes only when the runtime changes how a run plays (when a
 * resident is woken, what stays in its context, how tool notices arrive), not with every commit. Runs of
 * one revision are comparable; runs of different revisions are not mixed in a comparison without saying so.
 * Every run writes it into its genesis and `000-run.json`; a run that does not name one is revision 1.
 * Raise it in the same PR as such a change and add a row to docs/RUNTIME-REVISIONS.md.
 */
export const RUNTIME_REVISION = 2;

