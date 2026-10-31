/**
 * Tools that wait for a model (stage `consult`), names for ids (presentation), secrets for the
 * guard question, and calls a mechanic stages. The host runs them; mechanics only declare them.
 */
import type { Static, TSchema } from "typebox";
import type { GuardSecret } from "../roles.ts";
import type { MechanicContext, MechanicShape, ToolContext } from "./context.ts";
import type { Refusal } from "./tools.ts";
import type { Actor, ResidentId } from "./values.ts";

/** What the host asks a role on a tool's behalf (a judge, for example). */
export interface RoleQuestion {
	readonly role: string;
	readonly tool: string;
	readonly actor: Actor;
	/** Checked against the tool's `question` schema before it is asked. */
	readonly question: unknown;
}

/** A role's answer; `answer` is untrusted and checked against the tool's `answer` schema. */
export type RoleReply =
	| { readonly ok: true; readonly answer: unknown; readonly costUsd: number }
	| { readonly ok: false; readonly error: string; readonly costUsd: number };

/** A model-backed role as the host calls it; the app builds it (`defineRole`, roles package). */
export interface RoleCaller {
	ask(question: RoleQuestion): Promise<RoleReply>;
}

/** What `execute` gets from the consult stage: the parsed answer, or why there is none. */
export type Consulted<A> =
	| { readonly ok: true; readonly answer: A }
	/** `absent`: the run has no such role; `failed`: it erred, threw or answered off its schema. */
	| { readonly ok: false; readonly reason: "absent" | "failed"; readonly error: string };

/**
 * A tool's question to a role, asked after the guard and before `execute`. `ask` may refuse
 * (stage `consult`) before any model is called. Calls are serialised, so nothing changes between
 * `ask` and `execute`.
 */
export interface ConsultDefinition<M extends MechanicShape, P extends TSchema, Q extends TSchema, A extends TSchema> {
	readonly role: string;
	readonly question: Q;
	readonly answer: A;
	ask(params: Static<P>, ctx: ToolContext<M>): Static<Q> | Refusal;
}

/** A tool's consult with its types erased, bound to one call. */
export interface PreparedConsult {
	readonly role: string;
	/** The question, or a refusal. */
	ask(): { readonly question: unknown } | Refusal;
	/** Checks the role's raw reply (undefined: no such role) against the answer schema; `execute` gets the result. */
	read(reply: RoleReply | undefined): Consulted<unknown>;
}

/** Names for ids (a `names` mechanic): how arguments are read and texts written for the caller. */
export interface PresentationHandlers<M extends MechanicShape> {
	/** Rewrites raw arguments before the schema checks them (a name where an id goes); in load order. */
	resolve?(call: { readonly tool: string; readonly actor: Actor; readonly params: unknown }, ctx: MechanicContext<M>): unknown;
	/** Formats every text a caller reads: replies, refusal details, turn inputs; in load order. Events keep ids. */
	display?(text: string, ctx: MechanicContext<M>): string;
}

/** What a mechanic adds to the guard question of a resident's call (its own pieces of a secret, say). */
export interface GuardHandlers<M extends MechanicShape> {
	/** Values the resident legitimately knows that the guard must keep off the guarded text. */
	secrets(resident: ResidentId, minRun: number, ctx: MechanicContext<M>): readonly GuardSecret[];
	/** A check without a model: the reason to block when `text` carries a run of a secret, else undefined. */
	leaks?(text: string, secrets: readonly GuardSecret[], minRun: number, ctx: MechanicContext<M>): string | undefined;
}

