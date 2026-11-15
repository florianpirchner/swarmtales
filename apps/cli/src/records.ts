// SPDX-License-Identifier: LicenseRef-SUL-1.0
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
				replaced: Type.Optional(
					Type.Record(
						Type.String({ description: "The actor id" }),
						Type.Object({ from: Type.String({ description: "The model the base played: `<provider>/<model id>:<thinking>`" }), to: Type.String({ description: "The model the resumed run plays, in the same form" }) }, { additionalProperties: false, description: "A model that was replaced" }),
						{ description: "A live resume: each actor whose model differs from the base's; absent when none does" },
					),
				),
			},
			{ additionalProperties: false, description: "The run goes on from a snapshot of another run folder" },
		),
	},
};
