/**
 * Local adapters of carve round 2 (docs/design/carve-requests-round2-T4a.md, requests 1 and 2):
 * what the tribunal and the exile read of each other beyond the frozen `ExileApi` and
 * `TribunalApi`. A mechanic never imports another, so the exile and the tribunal hold this file
 * word for word (mechanics/exile/src/extras.ts, mechanics/tribunal/src/extras.ts) and the host
 * matches the APIs by name; test/mechanics/exile/extras.test.ts keeps both copies equal.
 */
import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";

const Resident = Type.String();

/** A gate as the tribunal and the gamemaker see it (old `GateView`, tribunal.ts). */
export const GateView = Type.Object({
	agent: Resident,
	since: Type.Integer(),
	until: Type.Integer(),
	ransomable: Type.Boolean(),
	price: Type.Number(),
	selfPrice: Type.Number(),
	paid: Type.Number(),
	covered: Type.Integer(),
	willDone: Type.Boolean(),
});

/** Exile's side: the gates, the order of the exiled and who was bought back (request 1). */
export const ExileExtrasApi = defineApi({
	name: "exile-extras",
	summary: "The gates, the exiled in the order they left, and who was bought back once.",
	methods: {
		gates: {
			kind: "query",
			summary: "Every gate in the order it opened (old `Tribunal.gates()`).",
			input: Type.Object({}),
			output: Type.Array(GateView),
		},
		exiled: {
			kind: "query",
			summary: "Who left through the gate or by the seal, in the order they left (old `Tribunal#exiled`); the holdout's struck are not in it.",
			input: Type.Object({}),
			output: Type.Array(Resident),
		},
		ransomed: {
			kind: "query",
			summary: "Whether the resident was bought back from the gate once (old `Tribunal#ransomed`): a second gate takes no ransom.",
			input: Type.Object({ resident: Resident }),
			output: Type.Boolean(),
		},
	},
});

/** The tribunal's texts the exile writes. */
export const ExileTextKey = Type.Union([Type.Literal("gateNotice"), Type.Literal("gateNoticeFinal"), Type.Literal("ransomed"), Type.Literal("exiled"), Type.Literal("will")]);

/** Tribunal's side: its texts with the rule values, and the will's cap (request 2). */
export const TribunalExtrasApi = defineApi({
	name: "tribunal-extras",
	summary: "The tribunal's texts the exile writes, and the share a last will may leave each heir.",
	methods: {
		text: {
			kind: "query",
			summary: "One of the story's tribunal texts, rendered with the rule values and `values` (old `Tribunal#text`).",
			input: Type.Object({ key: ExileTextKey, values: Type.Record(Type.String(), Type.String()) }),
			output: Type.String(),
		},
		bequestPerHeir: {
			kind: "query",
			summary: "The share of its points a resident at the gate may leave each heir (`tribunal.bequestPerHeir`).",
			input: Type.Object({}),
			output: Type.Number(),
		},
	},
});
