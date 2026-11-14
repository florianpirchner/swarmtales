// SPDX-License-Identifier: Apache-2.0
/** The events the kernel writes itself. Their source is `kernel`. */
import { Type, type TProperties } from "typebox";
import { InputNoteSchema } from "./schemas.ts";

const text = (description: string): { readonly description: string } => ({ description });

const actor = (description = "The id of the actor"): ReturnType<typeof Type.String> => Type.String(text(description));

const by = (did: string): ReturnType<typeof Type.String> => Type.String(text(`The id of the plugin that ${did}`));

const tool = (): ReturnType<typeof Type.String> => Type.String(text("The canonical name of the tool"));

const shown = (): ReturnType<typeof Type.String> => Type.String(text("The name of the tool as the caller was shown it"));

// A closed payload schema: a field the schema does not name is refused.
const payload = <P extends TProperties>(description: string, properties: P) => Type.Object(properties, { additionalProperties: false, description });

/**
 * The payload schemas of the kernel's events, by event type.
 *
 * @public
 */
export const KERNEL_EVENTS = {
	run_started: payload("The run starts", {
		game: Type.String(text("The id of the game")),
		seed: Type.Integer({ minimum: 0, maximum: 4294967295, description: "The seed of the run" }),
		maxTicks: Type.Integer(text("The run ends after this many ticks")),
		actors: Type.Array(actor("An actor id"), text("The ids of the actors, in the definition's order")),
		plugins: Type.Array(Type.String(text("A plugin id")), text("The ids of the plugins, in load order")),
	}),
	tick_started: payload("A tick starts", {}),
	tick_ended: payload("A tick ends", {}),
	job_ran: payload("A scheduled job of a plugin ran", {
		owner: Type.String(text("The id of the plugin that owns the job")),
		job: Type.String(text("The name of the job in its plugin")),
	}),
	activation_opened: payload("An actor is activated", {
		actor: actor("The id of the actor that is activated"),
		inputs: Type.Array(InputNoteSchema, text("The lines the actor is shown, in their order")),
		detail: Type.Optional(Type.Record(Type.String(text("A key of the scheduler")), Type.Unknown(text("The value of one key")), text("What the scheduler says about the activation, for example its reason"))),
	}),
	activation_closed: payload("An activation is over", {
		actor: actor("The id of the actor that was activated"),
		calls: Type.Integer(text("The number of tool calls of the activation")),
		outcome: Type.Union([Type.Literal("acted"), Type.Literal("no-call"), Type.Literal("error")], text("How the activation went: with a call, without one, or with a failure of the driver")),
	}),
	tool_called: payload("An actor calls a tool", {
		as: shown(),
		params: Type.Unknown(text("The arguments as the caller gave them, before they are parsed")),
	}),
	tool_refused: payload("A tool call was refused", {
		as: shown(),
		stage: Type.String(text("The stage that refused the call")),
		code: Type.String(text("The refusal code")),
		detail: Type.Optional(Type.String(text("What the caller is told beside the code"))),
	}),
	tool_result: payload("A tool call was carried out", {
		as: shown(),
		reply: Type.String(text("The text the caller got back")),
		endsTurn: Type.Optional(Type.Boolean(text("Whether the call closes the activation; written only when true"))),
	}),
	service_called: payload("A plugin called a command of a service", {
		service: Type.String(text("The name of the service")),
		method: Type.String(text("The name of the method")),
		caller: Type.String(text("The id of the plugin that called")),
		input: Type.Unknown(text("The input of the call")),
	}),
	actor_suspended: payload("A plugin suspended an actor", {
		actor: actor(),
		by: by("suspended it"),
		reason: Type.String(text("Why it is suspended")),
	}),
	actor_resumed: payload("A plugin lifted its suspension of an actor", { actor: actor(), by: by("lifted its suspension") }),
	tool_locked: payload("A plugin locked a tool of an actor", { actor: actor(), tool: tool(), by: by("locked it") }),
	tool_unlocked: payload("A plugin unlocked a tool of an actor", { actor: actor(), tool: tool(), by: by("unlocked it") }),
	limit_reached: payload("A run limit was reached", {
		limit: Type.String(text("The id of the limit, `<plugin id>.<limit id>`")),
		reason: Type.String(text("What the limit says about its breach")),
	}),
	run_ended: payload("The run is over", {
		reason: Type.String(text("Why the run ended")),
		detail: Type.Optional(Type.String(text("More about the end, for example the failure"))),
	}),
} as const;
