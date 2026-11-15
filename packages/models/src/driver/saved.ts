// SPDX-License-Identifier: Apache-2.0
/**
 * A saved session: the conversation of one actor as its model sees it, for the section `sessions` of a snapshot
 * file, so that a resumed run asks the request the straight run would have asked (M5 spec 4.5, decision A55). The
 * leading system message is left out, because the game gives it again (the system prompt and the tools declared at
 * the start); a key never enters it, and every text goes through the run's redaction first.
 *
 * Each message is kept as its own JSON text. A snapshot file is canonical JSON with its keys sorted (A43), and the
 * key order of a tool call's arguments and of a later tool declaration is part of the request a provider is sent:
 * the provider library compares declarations by their JSON text, so a sorted copy would read as a changed tool.
 */
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { Type, type Static, type TSchema } from "typebox";
import { Check, Errors } from "typebox/value";
import { redactValue, type ActorId, type Redact } from "@swarmtales/contracts";
import { savedSessionInvalid, thrown } from "../errors.ts";

/**
 * The version of the saved session format.
 *
 * @public
 */
export const SAVED_SESSION_FORMAT = 1;

const text = (description: string) => Type.String({ description });
const num = (description: string) => Type.Number({ description });
const names = (description: string) => Type.Array(text("A shown tool name"), { description });
const open = (description: string) => ({ description });

/**
 * The schema of a saved session.
 *
 * @public
 */
export const SavedSessionSchema = Type.Object(
	{
		format: Type.Literal(SAVED_SESSION_FORMAT, { description: "The version of the saved session format" }),
		initial: names("The tools of the leading system message, in its order: the tools open when the session started"),
		declared: names("Every tool declared to the model when the session was saved, in the order declared"),
		notice: Type.Optional(names("The open tools the last tools notice named; left out: no notice since the start or the last context reset")),
		messages: Type.Array(text("One message as JSON text, with the key order the session held"), { description: "The conversation after the leading system message, in order" }),
	},
	{ additionalProperties: false, description: "The conversation of one actor with its model, without the system text the game gives again and without a key" },
);

/**
 * A saved session.
 *
 * @public
 */
export type SavedSession = Static<typeof SavedSessionSchema>;

/**
 * The schema of the section `sessions` of a snapshot file: actor id to its saved session.
 *
 * @public
 */
export const SavedSessionsSchema = Type.Record(Type.String({ description: "The actor id" }), SavedSessionSchema, { description: "The saved session of every model actor of the run" });

/**
 * The section `sessions` of a snapshot file.
 *
 * @public
 */
export type SavedSessions = Static<typeof SavedSessionsSchema>;

const Usage = Type.Object(
	{
		input: num("Input tokens"),
		output: num("Output tokens"),
		cacheRead: num("Tokens read from the cache"),
		cacheWrite: num("Tokens written to the cache"),
		totalTokens: num("All tokens"),
		cost: Type.Object({ input: num("USD of the input"), output: num("USD of the output"), cacheRead: num("USD of the cache reads"), cacheWrite: num("USD of the cache writes"), total: num("USD in all") }, open("The cost")),
	},
	open("The usage of an answer"),
);
const Part = Type.Union(
	[
		Type.Object({ type: Type.Literal("text"), text: text("The text") }, open("A text block")),
		Type.Object({ type: Type.Literal("thinking"), thinking: text("The thinking") }, open("A thinking block")),
		Type.Object({ type: Type.Literal("image"), data: text("The image, base64"), mimeType: text("Its media type") }, open("An image block")),
		Type.Object({ type: Type.Literal("toolCall"), id: text("The call id"), name: text("The tool"), arguments: Type.Record(text("A name"), Type.Unknown({ description: "A JSON value" }), open("The arguments")) }, open("A tool call")),
	],
	open("One block of a message"),
);
const Content = Type.Union([text("The text"), Type.Array(Part, open("The blocks"))], open("The content of a message"));
const STOP = ["pending", "stop", "length", "toolUse", "error", "aborted", "deferred"] as const;

// The four message kinds of the provider library, checked in what a request is built from. The value is parsed from
// a JSON text, so every nested value is JSON; that is what lets the schema stand for the library's own type.
const MessageSchema = Type.Unsafe<AgentMessage>(
	Type.Union(
		[
			Type.Object({ role: Type.Literal("system"), content: Content, timestamp: num("When it was written") }, open("A later system message: a change of the declared tools")),
			Type.Object({ role: Type.Literal("user"), content: Content, timestamp: num("When it was sent") }, open("An input")),
			Type.Object(
				{
					role: Type.Literal("assistant"),
					content: Type.Array(Part, open("The blocks of the answer")),
					api: text("The provider interface"),
					provider: text("The provider id"),
					model: text("The model id"),
					usage: Usage,
					stopReason: Type.Union(STOP.map((reason) => Type.Literal(reason, open("A stop reason"))), open("Why the answer ended")),
					timestamp: num("When the request started"),
				},
				open("An answer of the model"),
			),
			Type.Object({ role: Type.Literal("toolResult"), toolCallId: text("The call answered"), toolName: text("The tool"), content: Type.Array(Part, open("The blocks")), isError: Type.Boolean(open("A refusal")), timestamp: num("When it was made") }, open("A tool result")),
		],
		open("One message of the conversation"),
	),
);

const reasonOf = (schema: TSchema, value: unknown): string => {
	const first = Errors(schema, value)[0];
	return `${first === undefined || first.instancePath === "" ? "" : `${first.instancePath} `}${first?.message ?? "does not match its schema"}`;
};

/**
 * Saves the conversation of a session: every message after the leading system message, redacted.
 *
 * @param messages - The messages of the session's agent, the leading system message first when it has one.
 * @param leads - True when the session was created with a leading system message (a system prompt or tools).
 * @param redact - The run's redaction; every string value of every message goes through it.
 * @returns The names of the tools of the leading message, and the other messages as JSON texts.
 *
 * @internal
 */
export function saveConversation(messages: readonly AgentMessage[], leads: boolean, redact: Redact): Pick<SavedSession, "initial" | "messages"> {
	const leading = leads && messages[0]?.role === "system" ? messages[0] : undefined;
	const initial = leading?.role === "system" ? (leading.toolsAdded ?? []).map((tool) => tool.name) : [];
	return { initial, messages: messages.slice(leading === undefined ? 0 : 1).map((message) => JSON.stringify(redactValue(message, redact))) };
}

/**
 * Loads the conversation of a saved session.
 *
 * @param actor - The actor of the session.
 * @param saved - The messages as the session saved them.
 * @param redact - The run's redaction, for the error.
 * @returns The messages, in order.
 * @throws SwtError `SWT-X042` when a text is no JSON or no message.
 *
 * @internal
 */
export function loadConversation(actor: ActorId, saved: readonly string[], redact: Redact): readonly AgentMessage[] {
	return saved.map((json, index) => {
		let value: unknown;
		try {
			value = JSON.parse(json);
		} catch {
			throw thrown(savedSessionInvalid(actor, `message ${String(index)} is no JSON`), redact);
		}
		if (Check(MessageSchema, value)) return value;
		throw thrown(savedSessionInvalid(actor, `message ${String(index)}: ${reasonOf(MessageSchema, value)}`), redact);
	});
}

/**
 * Reads the section `sessions` of a snapshot file (untrusted).
 *
 * @param value - The section as the file holds it.
 * @param redact - The run's redaction, for the error.
 * @returns The saved sessions, by actor id.
 * @throws SwtError `SWT-X042` when the section does not match {@link SavedSessionsSchema}.
 * @example
 * ```ts
 * const saved = parseSavedSessions(file.sessions, broker.redact);
 * const models = createModelDrivers({ ...input, saved });
 * ```
 *
 * @public
 */
export function parseSavedSessions(value: unknown, redact: Redact): SavedSessions {
	if (Check(SavedSessionsSchema, value)) return value;
	const first = Errors(SavedSessionsSchema, value)[0];
	const actor = first?.instancePath.split("/")[1] ?? "the run";
	throw thrown(savedSessionInvalid(actor, reasonOf(SavedSessionsSchema, value)), redact);
}
