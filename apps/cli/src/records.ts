// SPDX-License-Identifier: Apache-2.0
/** The record source of the run assembly: the one event the command line itself writes into a log. */
import type { RecordSource } from "@swarmtales/contracts";
import { Type } from "typebox";

/**
 * The record source `@swarmtales/cli/run`. Its one event, `run_resumed`, is the marker a resumed run writes right
 * after the lines of the run it resumed from (specification of M3, section 7.2); continuity asks for it there.
 *
 * @public
 */
export const RUN_RECORDS: RecordSource = {
	id: "@swarmtales/cli/run",
	events: {
		run_resumed: Type.Object(
			{
				from: Type.String({ description: "The id of the run the snapshot was taken from" }),
				snapshotHash: Type.String({ description: "The sha256 of the snapshot file, as the manifest of the resumed run names it" }),
				tick: Type.Integer({ minimum: 0, description: "The number of finished ticks the run goes on from" }),
			},
			{ additionalProperties: false, description: "The run goes on from a snapshot of another run folder" },
		),
	},
};
