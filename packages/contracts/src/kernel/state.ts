// SPDX-License-Identifier: Apache-2.0
/** The schema of the kernel's saved state. The interface `KernelSnapshot` is in `kernel-def.ts`. */
import { Type } from "typebox";
import { JobSchema } from "./clock.ts";
import { RunEndSchema } from "./schemas.ts";

const text = (description: string): { readonly description: string } => ({ description });

const closed = (description: string): { readonly additionalProperties: false; readonly description: string } => ({ additionalProperties: false, description });

// The saved state of one owner. A function, so each place gets a schema object with its own description.
const slice = (description: string) =>
	Type.Object(
		{
			version: Type.Integer(text("The version of the saved form")),
			data: Type.Unknown(text("The state, as its owner saved it; the owner checks it when it loads")),
		},
		closed(description),
	);

const idList = (key: string, entry: string, description: string) =>
	Type.Record(Type.String(text(key)), Type.Array(Type.String(text(entry)), text(description)), text(`${description}, by actor id`));

/**
 * The schema of `KernelSnapshot`: the state of the kernel between two ticks. The state of a plugin is open here;
 * its own slice checks it.
 *
 * @public
 */
export const KernelSnapshotSchema = Type.Object(
	{
		format: Type.Literal("swarmtales.kernel", text("The format name")),
		version: Type.Literal(1, text("The format version")),
		game: Type.String(text("The id of the game")),
		gameHash: Type.String(text("The hash of the game")),
		seed: Type.Integer({ minimum: 0, maximum: 4294967295, description: "The seed of the run" }),
		tick: Type.Integer({ minimum: 0, description: "The tick the run continues with" }),
		seq: Type.Integer({ minimum: 0, description: "The length of the log at the snapshot" }),
		ended: Type.Optional(RunEndSchema),
		suspensions: idList("An actor id", "A plugin id", "The ids of the plugins that suspend an actor"),
		locks: idList("An actor id", "A canonical tool name", "The locked canonical tools of an actor, sorted"),
		jobs: Type.Array(JobSchema, text("The jobs that wait")),
		plugins: Type.Record(Type.String(text("A plugin id")), slice("The saved state of one plugin"), text("The saved state of the plugins, by plugin id")),
		scheduler: Type.Optional(slice("The saved state of the scheduler, when it keeps some")),
	},
	closed("The state of the kernel between two ticks"),
);
