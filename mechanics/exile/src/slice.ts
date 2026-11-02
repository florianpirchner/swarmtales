/**
 * The exile's snapshot slice: version 1, migrated from the converter's version-0 slice
 * `{ tribunal?: { gates, exiled, ransomed }, holdout?: { struck } }` (the old world's
 * `tribunal` fields and the copy of the holdout's struck residents, wave 3.5 T4 R6).
 */
import { Type, type Static } from "typebox";
import { Parse } from "typebox/value";
import type { ExileState } from "./state.ts";

const Id = Type.String();
const Payment = Type.Object({ payer: Id, amount: Type.Number() });
const Will = Type.Object({ text: Type.String(), factors: Type.Array(Type.String()) });

export const ExileSlice = Type.Object({
	gates: Type.Array(
		Type.Object({
			resident: Id,
			since: Type.Integer(),
			until: Type.Integer(),
			ransomable: Type.Boolean(),
			voters: Type.Array(Id),
			/** Absent only for a gate of an old snapshot from before the median ransom (old `restore` set them). */
			price: Type.Optional(Type.Number()),
			selfPrice: Type.Optional(Type.Number()),
			payments: Type.Array(Payment),
			will: Type.Optional(Will),
		}),
	),
	gone: Type.Array(
		Type.Object({
			resident: Id,
			by: Type.Union([Type.Literal("tribunal"), Type.Literal("seal"), Type.Literal("holdout")]),
			minute: Type.Optional(Type.Integer()),
		}),
	),
	ransomed: Type.Array(Id),
});

/** The old world's tribunal fields (packages/engine tribunal.ts `TribunalSnapshot`) the converter gives the exile. */
const Old = Type.Object({
	tribunal: Type.Optional(
		Type.Object({
			gates: Type.Array(
				Type.Object({
					agent: Id,
					since: Type.Integer(),
					until: Type.Integer(),
					ransomable: Type.Boolean(),
					price: Type.Optional(Type.Number()),
					selfPrice: Type.Optional(Type.Number()),
					voters: Type.Array(Id),
					payments: Type.Array(Payment),
					will: Type.Optional(Will),
				}),
			),
			exiled: Type.Array(Id),
			ransomed: Type.Array(Id),
		}),
	),
	holdout: Type.Optional(Type.Object({ struck: Type.Array(Id) })),
});

export const exileSnapshot = {
	version: 1,
	schema: ExileSlice,
	save: (state: ExileState): Static<typeof ExileSlice> => ({
		gates: state.gates.map((gate) => ({
			resident: gate.resident,
			since: gate.since,
			until: gate.until,
			ransomable: gate.ransomable,
			voters: [...gate.voters],
			...(gate.price === undefined || gate.selfPrice === undefined ? {} : { price: gate.price, selfPrice: gate.selfPrice }),
			payments: gate.payments.map((payment) => ({ ...payment })),
			...(gate.will === undefined ? {} : { will: { text: gate.will.text, factors: [...gate.will.factors] } }),
		})),
		gone: state.gone.map((entry) => ({ ...entry })),
		ransomed: [...state.ransomed],
	}),
	load: (data: Static<typeof ExileSlice>): ExileState => ({
		gates: data.gates.map((gate) => ({
			resident: gate.resident,
			since: gate.since,
			until: gate.until,
			ransomable: gate.ransomable,
			voters: [...gate.voters],
			price: gate.price,
			selfPrice: gate.selfPrice,
			payments: gate.payments.map((payment) => ({ ...payment })),
			will: gate.will === undefined ? undefined : { text: gate.will.text, factors: [...gate.will.factors] },
		})),
		gone: data.gone.map((entry) => ({ ...entry })),
		ransomed: [...data.ransomed],
	}),
	migrations: {
		/**
		 * The old file cannot tell a seal's strike from an exile through the gate (both are in the
		 * tribunal's `exiled`): they read as `tribunal`, which counts the same for the register, the
		 * target and the prices. The holdout's struck follow them, so the leaving order between the two
		 * lists is lost; nothing reads it across them.
		 */
		0: (old: unknown): Static<typeof ExileSlice> => {
			const { tribunal, holdout } = Parse(Old, old);
			return {
				gates: (tribunal?.gates ?? []).map((gate) => ({
					resident: gate.agent,
					since: gate.since,
					until: gate.until,
					ransomable: gate.ransomable,
					voters: gate.voters,
					...(gate.price === undefined || gate.selfPrice === undefined ? {} : { price: gate.price, selfPrice: gate.selfPrice }),
					payments: gate.payments,
					...(gate.will === undefined ? {} : { will: gate.will }),
				})),
				gone: [...(tribunal?.exiled ?? []).map((resident) => ({ resident, by: "tribunal" as const })), ...(holdout?.struck ?? []).map((resident) => ({ resident, by: "holdout" as const }))],
				ransomed: tribunal?.ransomed ?? [],
			};
		},
	},
} as const;
