/**
 * Tool definition and the tool gateway.
 *
 * Every tool is bound to every competitor and every schema reaches the model in
 * every request, so the cached request prefix never changes (P46). The world's
 * unlock set decides which calls the gateway accepts; locked calls are answered
 * with `TOOL_LOCKED`. Errors are structured codes, never stack traces.
 */
import type { AgentToolResult } from "@earendil-works/pi-agent-core";
import type { Static, TSchema } from "typebox";
import { Parse } from "typebox/value";
import type { CompetitorId } from "../core/ids.ts";
import type { World } from "../engine/world.ts";
import type { DeliveryJudge } from "../interpret/judge.ts";
import { render, text } from "../prompts/library.ts";
import type { ToolName } from "./catalog.ts";
import { GUARD_BLOCKED, guardedText, type ToolGuard } from "./guard.ts";

export const TOOL_LOCKED = "TOOL_LOCKED";
export const INVALID_ARGUMENTS = "INVALID_ARGUMENTS";
/** Why a locked call failed, for the model: the tool exists, it is just not open to this resident now. */
export const LOCKED_DETAIL = text("replies/locked");
/** The full text of a locked call's reply. */
export const LOCKED_REPLY = `${TOOL_LOCKED}: ${LOCKED_DETAIL}`;

/** What a tool may touch: its caller's identity, the world's public methods and the city's judge. */
export interface ToolContext {
	readonly self: CompetitorId;
	readonly world: World;
	/** Decides `blame` claims; absent without a key or in an offline run. */
	readonly judge?: DeliveryJudge;
	/** Checks guarded tools' texts before they run (SPEC 20); absent in a story without guards. */
	readonly guard?: ToolGuard;
}

/** Result of a tool: text for the model, or a structured error code. */
export type ToolOutcome =
	| { readonly ok: true; readonly text: string }
	| { readonly ok: false; readonly code: string; readonly detail?: string };

export function success(text: string): ToolOutcome {
	return { ok: true, text };
}

export function failure(code: string, detail?: string): ToolOutcome {
	return detail === undefined ? { ok: false, code } : { ok: false, code, detail };
}

/** Turns an engine `Result` error into a tool failure. */
export function fromError(result: { readonly error: string; readonly detail?: string }): ToolOutcome {
	return failure(result.error, result.detail);
}

export interface ToolDefinition<N extends ToolName, S extends TSchema> {
	readonly name: N;
	readonly description: string;
	readonly parameters: S;
	/** Synchronous, except where a tool must wait for a model (the judge of `blame`). */
	readonly execute: (params: Static<S>, context: ToolContext) => ToolOutcome | Promise<ToolOutcome>;
	/** The tool's own cheap checks, run before a tool guard asks its model (a failure here costs no guard call). */
	readonly precheck?: (params: Static<S>, context: ToolContext) => ToolOutcome | undefined;
}

/** The shape pi executes. */
export interface BoundTool {
	readonly name: string;
	readonly label: string;
	readonly description: string;
	readonly parameters: TSchema;
	readonly execute: (toolCallId: string, params: unknown) => Promise<AgentToolResult<undefined>>;
}

/** A tool without its schema generic, for the catalog. */
export interface ArenaTool<N extends ToolName = ToolName> {
	readonly name: N;
	readonly description: string;
	readonly parameters: TSchema;
	readonly bind: (context: ToolContext) => BoundTool;
}

export function defineTool<const N extends ToolName, S extends TSchema>(definition: ToolDefinition<N, S>): ArenaTool<N> {
	return {
		name: definition.name,
		description: definition.description,
		parameters: definition.parameters,
		bind: (context) => ({
			name: definition.name,
			label: definition.name,
			description: definition.description,
			parameters: definition.parameters,
			execute(_toolCallId, rawParams) {
				// Residents read names, not IDs (v08): the reply shows them as well.
				return Promise.resolve(gateway(definition, context, rawParams)).then((outcome) => toResult(outcome, (text) => context.world.display(text)));
			},
		}),
	};
}

function gateway<N extends ToolName, S extends TSchema>(
	definition: ToolDefinition<N, S>,
	context: ToolContext,
	rawParams: unknown,
): ToolOutcome | Promise<ToolOutcome> {
	if (!context.world.isToolEnabled(context.self, definition.name)) return failure(TOOL_LOCKED, LOCKED_DETAIL);
	let params: Static<S>;
	try {
		// pi validates against the schema already; Parse keeps the boundary typed without a cast.
		params = Parse(definition.parameters, withResidents(rawParams, (value) => context.world.resolveResident(value)));
	} catch {
		return failure(INVALID_ARGUMENTS);
	}
	// The tool guard (SPEC 20), a preHook: a blocked call never runs, so it posts and costs nothing.
	const guard = context.guard;
	const text = guard?.guards(definition.name) === true ? guardedText(definition.name, params) : undefined;
	if (guard === undefined || text === undefined) return definition.execute(params, context);
	const refused = definition.precheck?.(params, context);
	if (refused !== undefined) return refused;
	return guard.review(context.self, definition.name, text).then((decision) => (decision.allowed ? definition.execute(params, context) : failure(GUARD_BLOCKED, decision.reason)));
}

/** Parameters that name a resident; each takes a name as well as an ID (v08). */
export const RESIDENT_PARAMS: readonly string[] = ["target", "agent", "accused", "leader", "to"];

/**
 * `raw` with every resident parameter, at any depth (a will's bequests),
 * replaced by the ID it stands for. Anything else is left for the schema.
 */
export function withResidents(raw: unknown, resolve: (value: string) => string): unknown {
	if (Array.isArray(raw)) return raw.map((item: unknown) => withResidents(item, resolve));
	if (typeof raw !== "object" || raw === null) return raw;
	return Object.fromEntries(
		Object.entries(raw).map(([key, value]: [string, unknown]) => [key, typeof value === "string" && RESIDENT_PARAMS.includes(key) ? resolve(value) : withResidents(value, resolve)]),
	);
}

function toResult(outcome: ToolOutcome, display: (text: string) => string): AgentToolResult<undefined> {
	if (outcome.ok) return { content: [{ type: "text", text: display(outcome.text) }], details: undefined };
	const text = outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
	return { content: [{ type: "text", text: display(text) }], details: undefined, isError: true };
}

/** Short suffix for tool replies while marks apply. */
export function marksSuffix(marks: { readonly remaining: number; readonly budget: number } | undefined): string {
	return marks === undefined ? "" : ` · ${render("replies/marks-left", { remaining: marks.remaining, budget: marks.budget })}`;
}
