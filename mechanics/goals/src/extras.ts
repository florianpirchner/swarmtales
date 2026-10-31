/**
 * `goals-extras`: what progression, the tribunals and the wills tell the goals beyond `GoalsApi`
 * (docs/design/carve-requests-T3.md, request 11). The old world dealt and resolved the goals of an
 * act inside `#noteActStarts` and `#endAct`; `GoalsApi` has no method for that. Progression keeps an
 * identical copy (`mechanics/progression/src/goals-extras.ts`); `test/mechanics/goals/extras.test.ts`
 * keeps both equal.
 */
import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";

const Resident = Type.String();

export const GoalsExtrasApi = defineApi({
	name: "goals-extras",
	summary: "The acts and the leaders and heirs the goals count.",
	methods: {
		actStarted: {
			kind: "command",
			summary: "The act starting at `act` has begun: its goals are dealt to `residents` (old `goals.deal`); writes `goal_dealt`.",
			input: Type.Object({ act: Type.Integer({ minimum: 1 }), residents: Type.Array(Resident) }),
			output: Type.Null(),
		},
		actEnded: {
			kind: "command",
			summary: "The act starting at `act` is over: its goals are checked, paid and read out (old `goals.resolve`); writes `goal_resolved`.",
			input: Type.Object({ act: Type.Integer({ minimum: 1 }) }),
			output: Type.Null(),
		},
		noteLeaders: {
			kind: "command",
			summary: "Faction leaders of a tribunal: one more leadership each in every running act (old `noteLeaders`).",
			input: Type.Object({ leaders: Type.Array(Resident) }),
			output: Type.Null(),
		},
		noteHeir: {
			kind: "command",
			summary: "A last will left the resident something (old `noteHeir`).",
			input: Type.Object({ heir: Resident }),
			output: Type.Null(),
		},
		goalOf: {
			kind: "query",
			summary: "The goal the resident holds in an act that is still running, in the story's words (old `goalOf`).",
			input: Type.Object({ resident: Resident }),
			output: Type.Union([Type.Object({ act: Type.Integer(), text: Type.String() }), Type.Null()]),
		},
	},
});
