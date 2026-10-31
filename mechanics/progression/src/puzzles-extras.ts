/**
 * `puzzles-extras` as progression calls it: an identical copy of `mechanics/puzzles/src/extras.ts`
 * (a mechanic never imports another; docs/design/carve-requests-T3.md, requests 1 to 4).
 * `test/mechanics/progression/extras.test.ts` keeps both equal until the integration owner folds
 * them into `mechanics/shared`.
 */
import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";

const Resident = Type.String();
const Level = Type.Integer({ minimum: 1 });

export const PuzzlesExtrasApi = defineApi({
	name: "puzzles-extras",
	summary: "What progression, standoff and the script need from the deal beyond the shared puzzles API.",
	methods: {
		kindOf: {
			kind: "query",
			summary: "The puzzle kind of a dealt level, or none.",
			input: Type.Object({ level: Level }),
			output: Type.Union([Type.Literal("fragments"), Type.Literal("additive"), Type.Literal("none")]),
		},
		taskValues: {
			kind: "query",
			summary: "The task placeholders a puzzle fills for a resident (old `#puzzleValues`); empty strings on a level not dealt.",
			input: Type.Object({ resident: Resident, level: Level }),
			output: Type.Object({ length: Type.String(), overlap: Type.String(), fragment: Type.String(), digits: Type.String(), factors: Type.String() }),
		},
		holders: {
			kind: "query",
			summary: "Who holds what the resident needs on an additive level, besides itself (old `#holdersOf`).",
			input: Type.Object({ resident: Resident, level: Level }),
			output: Type.Array(Type.Object({ holder: Resident, piece: Type.Union([Type.Literal("counter-factor"), Type.Literal("team certificate")]), value: Type.String() })),
		},
		revealFactor: {
			kind: "command",
			summary: "Releases the city factor of an additive level (old `revealFactor`); writes `factor_revealed`.",
			input: Type.Object({ level: Level, target: Type.Union([Type.Literal("board"), Type.Array(Resident)]) }),
			output: Type.Union([Type.Object({ ok: Type.Literal(true), agents: Type.Array(Resident) }), Type.Object({ ok: Type.Literal(false), code: Type.String(), detail: Type.String() })]),
		},
	},
});
