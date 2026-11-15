// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * What a base mechanic (`channels`) asks before it refuses a direct message past the cap of its window (`DM_LIMIT`):
 * whether this message is exempt (old `StandoffTribunalApi.exemptFromCap`, asked by the old `sendDm`). The holdout
 * tribunal (`standoff-tribunal`) provides it: its accused may always write to those who still lack its fragment, during
 * the grace and the votes. An exempt message is still counted in the window. When no provider is loaded, the caller's
 * `tryCall` comes back empty and the cap refuses as before (decision A75, errata J50 and J135 of `12-m5-spec.md`).
 * It lives here because `standoff-tribunal` requires `channels`: an import the other way would close a cycle.
 */
import { Type } from "typebox";
import { defineService } from "@swarmtales/sdk";

/**
 * The exemptions from the cap on direct messages: the service `cap-exemption`.
 *
 * @public
 */
export const CapExemptionService = defineService({
	name: "cap-exemption",
	summary: "Whether a resident's direct message passes the cap of the window although the window is full.",
	methods: {
		exempt: {
			kind: "query",
			summary: "True when the message from `from` to `to` is exempt from the cap (old `exemptFromCap`: the accused of a holdout tribunal to those who lack its fragment).",
			input: Type.Object(
				{ from: Type.String({ description: "The resident that sends the message" }), to: Type.String({ description: "The resident it is for" }) },
				{ additionalProperties: false, description: "The sender and the receiver" },
			),
			output: Type.Boolean({ description: "True when the cap does not refuse the message" }),
		},
	},
});
