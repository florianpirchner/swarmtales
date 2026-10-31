/**
 * A local adapter of carve round 3 (docs/design/carve-requests-round3-T2.md, request 1): the shared
 * `CastApi` is frozen and has no `active` yet (R2-D19). Until the integrator adds it there, cast
 * provides it as its own small API; the host matches an API by name, so a reader (progression's
 * `listAgents`) may declare the same definition now and switch to `CastApi.active` later.
 */
import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";

/** The cast members that may speak now, with the public level `listAgents` shows. */
export const CastExtrasApi = defineApi({
	name: "cast-extras",
	summary: "The active cast members and their public levels.",
	methods: {
		active: {
			kind: "query" as const,
			summary: "Declared, revealed and not retired cast members in the story's order, with their public level (old `cast.active()`, world.ts:1407-1413).",
			input: Type.Object({}),
			output: Type.Array(Type.Object({ id: Type.String(), level: Type.Integer() })),
		},
	},
});
