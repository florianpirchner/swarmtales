/**
 * Typebox schema of a competitor's persistent context: the pi agent messages
 * of a run snapshot (SPEC 17). System messages are not part of it; a resumed
 * run rebuilds them from its own prompt and tools. Every field pi keeps on a
 * message is modelled, so provider data such as thinking signatures, tool
 * call IDs and response IDs survive the file.
 */
import type { AgentMessage } from "@earendil-works/pi-agent-core";
import { Type, type Static } from "typebox";

/** Any JSON value; tool arguments and tool details are JSON. */
export const JsonValueSchema = Type.Cyclic(
	{
		Json: Type.Union([
			Type.Null(),
			Type.Boolean(),
			Type.Number(),
			Type.String(),
			Type.Array(Type.Ref("Json")),
			Type.Record(Type.String(), Type.Ref("Json")),
		]),
	},
	"Json",
);
const JsonObject = Type.Record(Type.String(), JsonValueSchema);

const TextContent = Type.Object({ type: Type.Literal("text"), text: Type.String(), textSignature: Type.Optional(Type.String()) });
const ThinkingContent = Type.Object({
	type: Type.Literal("thinking"),
	thinking: Type.String(),
	thinkingSignature: Type.Optional(Type.String()),
	redacted: Type.Optional(Type.Boolean()),
});
const ImageContent = Type.Object({ type: Type.Literal("image"), data: Type.String(), mimeType: Type.String() });
const ToolCall = Type.Object({
	type: Type.Literal("toolCall"),
	id: Type.String(),
	name: Type.String(),
	arguments: JsonObject,
	thoughtSignature: Type.Optional(Type.String()),
	namespace: Type.Optional(Type.String()),
	argumentsError: Type.Optional(Type.String()),
});

const Usage = Type.Object({
	input: Type.Number(),
	output: Type.Number(),
	cacheRead: Type.Number(),
	cacheWrite: Type.Number(),
	cacheWrite1h: Type.Optional(Type.Number()),
	reasoning: Type.Optional(Type.Number()),
	totalTokens: Type.Number(),
	cost: Type.Object({ input: Type.Number(), output: Type.Number(), cacheRead: Type.Number(), cacheWrite: Type.Number(), total: Type.Number() }),
});

// Enums, not mapped literal unions: a mapped array has the static type never, which would make the
// assistant message schema assignable to anything and the compile-time check below vacuous.
const StopReason = Type.Enum(["pending", "stop", "length", "toolUse", "error", "aborted", "deferred"]);
const ThinkingLevel = Type.Enum(["off", "minimal", "low", "medium", "high", "xhigh", "max"]);

const Diagnostic = Type.Object({
	type: Type.String(),
	timestamp: Type.Number(),
	error: Type.Optional(
		Type.Object({
			name: Type.Optional(Type.String()),
			message: Type.String(),
			stack: Type.Optional(Type.String()),
			code: Type.Optional(Type.Union([Type.String(), Type.Number()])),
		}),
	),
	details: Type.Optional(JsonObject),
});
const Deferred = Type.Object({
	provider: Type.String(),
	modelId: Type.String(),
	api: Type.String(),
	id: Type.String(),
	expiresAt: Type.Optional(Type.Number()),
	pollAfterMs: Type.Optional(Type.Number()),
	data: Type.Optional(JsonValueSchema),
});

const UserMessage = Type.Object({
	role: Type.Literal("user"),
	content: Type.Union([Type.String(), Type.Array(Type.Union([TextContent, ImageContent]))]),
	timestamp: Type.Number(),
});

const AssistantMessage = Type.Object({
	role: Type.Literal("assistant"),
	content: Type.Array(Type.Union([TextContent, ThinkingContent, ToolCall])),
	api: Type.String(),
	provider: Type.String(),
	model: Type.String(),
	responseModel: Type.Optional(Type.String()),
	responseId: Type.Optional(Type.String()),
	providerThinkingLevel: Type.Optional(Type.String()),
	thinkingLevel: Type.Optional(ThinkingLevel),
	diagnostics: Type.Optional(Type.Array(Diagnostic)),
	usage: Usage,
	stopReason: StopReason,
	deferred: Type.Optional(Deferred),
	errorMessage: Type.Optional(Type.String()),
	rawStopReason: Type.Optional(Type.String()),
	endTurn: Type.Optional(Type.Boolean()),
	timestamp: Type.Number(),
	durationMs: Type.Optional(Type.Number()),
});

const ToolResultMessage = Type.Object({
	role: Type.Literal("toolResult"),
	toolCallId: Type.String(),
	toolName: Type.String(),
	content: Type.Array(Type.Union([TextContent, ImageContent])),
	details: Type.Optional(JsonValueSchema),
	usage: Type.Optional(Usage),
	nestedCalls: Type.Optional(
		Type.Object({
			calls: Type.Array(
				Type.Object({
					id: Type.String(),
					name: Type.String(),
					arguments: Type.Optional(JsonObject),
					argumentsBytes: Type.Optional(Type.Number()),
					status: Type.Union([Type.Literal("ok"), Type.Literal("error"), Type.Literal("unfinished")]),
					durationMs: Type.Optional(Type.Number()),
					error: Type.Optional(Type.String()),
				}),
			),
			complete: Type.Boolean(),
		}),
	),
	isError: Type.Boolean(),
	timestamp: Type.Number(),
	durationMs: Type.Optional(Type.Number()),
});

export const ContextMessageSchema = Type.Union([UserMessage, AssistantMessage, ToolResultMessage]);

// A checked message is a pi agent message, so a runner takes it without a cast.
const checkedIsAgentMessage = (message: Static<typeof ContextMessageSchema>): AgentMessage => message;
// ... and every message pi keeps in a context (all but system messages) has a schema, so a real
// context never fails the check for want of a field, a stop reason or a content block.
const contextMessageIsModelled = (message: Writable<Exclude<AgentMessage, { readonly role: "system" }>>): Static<typeof ContextMessageSchema> => message;

export const messageSchemaChecks = [checkedIsAgentMessage, contextMessageIsModelled] as const;

/** `T` without `readonly`, deeply; typebox statics are mutable. */
export type Writable<T> = T extends string | number | boolean | null | undefined
	? T
	: T extends readonly (infer U)[]
		? Writable<U>[]
		: T extends object
			? { -readonly [K in keyof T]: Writable<T[K]> }
			: T;
