/**
 * The order of the short overseers in the `between` slot: the classifier first (the gamemaker reads
 * the labels of the round it looks at), then the weaver (it reads the classifier's labels and the
 * round's hard facts), then the gamemaker, as the old observers ran. A trigger without an order
 * sorts at 0, before all three; the integrator moves this table to `mechanics/shared/src/order.ts`
 * (docs/design/step18-requests-C1.md).
 */
export const OVERSEER_ORDER = { classifier: 100, weaver: 200, gamemaker: 300 } as const;
