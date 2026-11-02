/**
 * The short-lived overseers carved from the old roles (docs/design/overseer-api.md §1.5): the
 * judge (a consult), the classifier and the weaver (the `between` slot, in that order, before the
 * gamemaker). Exported as the namespace `overseers` of `@swarmtales/roles`, because the old roles
 * keep their own names until the CLI runs the overseers.
 */
export * from "./classifier.ts";
export * from "./fate.ts";
export * from "./judge.ts";
export * from "./order.ts";
export * from "./statements.ts";
export * from "./weaver.ts";
