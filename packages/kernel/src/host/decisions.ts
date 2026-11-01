/**
 * The decision gate (docs/design/overseer-api.md §3). A mechanic proposes with `ctx.decide`; when
 * nobody can hold the right or the window is 0, the commit runs at once inside `decide`, in the
 * caller's frame, and nothing is written (so every story of today logs what it logged). Otherwise
 * the host writes `decision_proposed`, keeps the decision open and schedules a core job at the
 * deadline; the holders amend it with the core tool `amendDecision`, which runs through the whole
 * pipeline (every mechanic's `lock` handler sees it). At the start of the deadline's minute,
 * before the mechanics' jobs, the host writes `decision_settled` and runs the commit with the
 * proposal that stands: the human's last amendment, else the last of any other holder, else the
 * original. Open decisions are part of the snapshot.
 */
import type { TSchema } from "typebox";
import { Check, Clone, Errors, Parse } from "typebox/value";
import {
	AmendDecisionParams,
	DECISION_TOOL,
	type Actor,
	type AmendDecisionInput,
	type DecideOptions,
	type DecisionOutcome,
	type DecisionSnapshot,
	type DecisionsView,
	type JsonValue,
	type MechanicTool,
	type OpenDecision,
	type PreparedCall,
	type Refusal,
	type Settlement,
	type ToolOutcome,
} from "@swarmtales/contracts";
import type { AccessControl } from "./access.ts";
import { refuse } from "./define.ts";
import type { EventBus } from "./log.ts";
import type { Names } from "./names.ts";
import type { Scheduler } from "./scheduler.ts";

export const DECISION_CLOSED = "DECISION_CLOSED";
export const DECISION_NOT_HELD = "DECISION_NOT_HELD";
export const DECISION_HUMAN = "DECISION_HUMAN";
export const PROPOSAL_INVALID = "PROPOSAL_INVALID";

/** The owner and job name of a deadline in the scheduler. */
export const CORE_OWNER = "core";
const DEADLINE_JOB = "decision";

interface Amendment {
	readonly by: string;
	/** The `tool_called` of the amending call. */
	readonly seq: number;
	readonly proposal: unknown;
	readonly reason: string;
}

interface Decision {
	readonly id: number;
	/** `<owner>.<kind>`. */
	readonly kind: string;
	readonly owner: string;
	/** The kind within its mechanic, the key of its schema. */
	readonly local: string;
	readonly commit: string;
	readonly proposal: unknown;
	readonly schema: TSchema | undefined;
	readonly opened: number;
	readonly deadline: number;
	readonly holders: readonly string[];
	readonly amendments: Amendment[];
}

export interface GateParts {
	readonly bus: EventBus;
	readonly scheduler: Scheduler;
	readonly minute: () => number;
	readonly names: Names;
	readonly access: AccessControl;
	/** The story's narrowing per full kind. */
	readonly policies: Readonly<Record<string, { readonly holders?: readonly string[]; readonly window?: number } | undefined>>;
	/** Whether the host can reach a holder of this name in this run (§3.2 rule 1). */
	readonly reachable: (name: string) => boolean;
	/** The head's schema of a mechanic's decision kind. */
	readonly schemaOf: (owner: string, kind: string) => TSchema | undefined;
	/** Runs a mechanic's commit (its instance checks the proposal against the kind's schema). */
	readonly commit: (owner: string, commit: string, proposal: unknown, settled: Settlement) => void;
	readonly reply: (code: string) => string | undefined;
	/** The amended reply, or undefined without a prompt lookup. */
	readonly amended: (decision: number, proposal: string) => string | undefined;
}

function isSchema(value: unknown): value is TSchema {
	return typeof value === "object" && value !== null;
}

/** The first Typebox error of a value against a schema, as `PROPOSAL_INVALID` reports it. */
function firstError(schema: TSchema, value: unknown): string | undefined {
	if (Check(schema, value)) return undefined;
	const [error] = Errors(schema, value);
	return error === undefined ? "the proposal does not match the schema" : `${error.instancePath === "" ? "/" : error.instancePath} ${error.message}`;
}

function sameJson(a: unknown, b: unknown): boolean {
	return JSON.stringify(a) === JSON.stringify(b);
}

/** The amendment that stands (§3.2 rule 5): the human's last, else the last of any other holder. */
function standing(decision: Decision): Amendment | undefined {
	return decision.amendments.findLast((amendment) => amendment.by === "human") ?? decision.amendments.at(-1);
}

function proposalOf(decision: Decision): unknown {
	return standing(decision)?.proposal ?? decision.proposal;
}

export class DecisionGate implements DecisionsView {
	readonly #parts: GateParts;
	/** In the order they were opened (ascending id). */
	#open: Decision[] = [];

	constructor(parts: GateParts) {
		this.#parts = parts;
	}

	pending(kind?: string): readonly OpenDecision[] {
		return this.#open
			.filter((decision) => kind === undefined || decision.kind === kind)
			.map((decision) => ({ id: decision.id, kind: decision.kind, owner: decision.owner, proposal: Clone(proposalOf(decision)), deadline: decision.deadline, holders: [...decision.holders] }));
	}

	/** The names that hold a kind now: granted `amendDecision`, named by the story's policy if it has one, and reachable. */
	holdersOf(kind: string): readonly string[] {
		const listed = this.#parts.policies[kind]?.holders;
		return this.#parts.names.all.filter((name) => this.#parts.access.granted(name, DECISION_TOOL) && (listed === undefined || listed.includes(name)) && this.#parts.reachable(name));
	}

	decide(owner: string, local: string, proposal: unknown, options: DecideOptions, commit: string): DecisionOutcome {
		const parts = this.#parts;
		const kind = `${owner}.${local}`;
		const schema = parts.schemaOf(owner, local);
		if (schema === undefined) throw new Error(`${owner}: decides "${local}", which it does not declare`);
		const window = parts.policies[kind]?.window ?? options.window;
		if (!Number.isInteger(window) || window < 0) throw new RangeError(`${owner}: invalid window ${String(window)} for ${kind}`);
		const invalid = firstError(schema, proposal) ?? (options.schema === undefined ? undefined : firstError(options.schema, proposal));
		if (invalid !== undefined) throw new Error(`${owner}: the proposal of ${kind} does not match its schema (${invalid})`);
		const holders = window === 0 ? [] : this.holdersOf(kind);
		if (holders.length === 0) {
			// Rule 2: the old path, in the caller's frame; no event, no job.
			parts.commit(owner, commit, proposal, { changed: false });
			return { committed: true };
		}
		const minute = parts.minute();
		const deadline = minute + window;
		const id = parts.bus.lastSeq + 1;
		const stored = Clone(proposal);
		const json: unknown = options.schema === undefined ? undefined : JSON.parse(JSON.stringify(options.schema));
		const narrowed = isSchema(json) ? json : undefined;
		const proposed = parts.bus.emit("core", "decision_proposed", {
			decision: id,
			kind,
			owner,
			proposal: stored,
			...(narrowed === undefined ? {} : { schema: narrowed }),
			deadline,
			holders: [...holders],
		});
		if (proposed.seq !== id) throw new Error(`decisions: ${kind} opened at seq ${String(proposed.seq)}, expected ${String(id)}`);
		this.#open.push({ id, kind, owner, local, commit, proposal: stored, schema: narrowed, opened: minute, deadline, holders, amendments: [] });
		parts.scheduler.portFor(CORE_OWNER, { has: (job) => job === DEADLINE_JOB }, parts.minute).at(deadline, DEADLINE_JOB, { decision: id });
		return { open: id };
	}

	/** A deadline job: writes `decision_settled` and runs the commit caused by it, with the proposal that stands. */
	settle(data: JsonValue | undefined): void {
		const { bus } = this.#parts;
		const id = typeof data === "object" && data !== null && "decision" in data ? data.decision : undefined;
		const decision = this.#open.find((entry) => entry.id === id);
		if (decision === undefined) throw new Error(`decisions: a deadline of decision ${JSON.stringify(id)}, which is not open`);
		this.#open = this.#open.filter((entry) => entry !== decision);
		const winner = standing(decision);
		const proposal = winner?.proposal ?? decision.proposal;
		const changed = winner !== undefined && !sameJson(winner.proposal, decision.proposal);
		const by = winner === undefined ? {} : { by: winner.by, reason: winner.reason };
		bus.run({ actor: "host" }, () => {
			const settled = bus.emit("core", "decision_settled", {
				decision: decision.id,
				kind: decision.kind,
				changed,
				...by,
				proposal,
				amendments: decision.amendments.map((amendment) => ({ by: amendment.by, seq: amendment.seq })),
			});
			bus.run({ actor: "host", cause: settled.seq }, () => {
				this.#parts.commit(decision.owner, decision.commit, Clone(proposal), { decision: decision.id, changed, ...by });
			});
		});
	}

	/** The core tool `amendDecision` (owner `core`), for the catalog. */
	tool(): MechanicTool<typeof DECISION_TOOL> {
		return {
			name: DECISION_TOOL,
			description: "core/tools/amendDecision",
			parameters: AmendDecisionParams,
			limit: undefined,
			suggest: ["human"],
			serves: undefined,
			prepare: (raw, actor) => this.#prepare(raw, actor),
		};
	}

	#prepare(raw: unknown, actor: Actor): PreparedCall | undefined {
		let params: AmendDecisionInput;
		try {
			params = Parse(AmendDecisionParams, raw);
		} catch {
			return undefined;
		}
		const { decision: id, proposal, reason } = params;
		const by = this.#parts.names.callerOf(actor)?.name ?? actor;
		const decision = (): Decision | undefined => this.#open.find((entry) => entry.id === id);
		return {
			params,
			rule: () => this.#rule(decision(), by, proposal),
			guardText: () => undefined,
			consult: undefined,
			execute: () => {
				const open = decision();
				return open === undefined ? this.#refusal(DECISION_CLOSED) : this.#amend(open, by, proposal, reason);
			},
		};
	}

	/** Stage `rule`: open, held, not taken by the human, and a proposal of the kind's and the decision's schema. */
	#rule(decision: Decision | undefined, by: string, proposal: unknown): Refusal | undefined {
		if (decision === undefined) return this.#refusal(DECISION_CLOSED);
		if (!decision.holders.includes(by)) return this.#refusal(DECISION_NOT_HELD);
		if (by !== "human" && decision.amendments.some((amendment) => amendment.by === "human")) return this.#refusal(DECISION_HUMAN);
		const schema = this.#parts.schemaOf(decision.owner, decision.local);
		const invalid = (schema === undefined ? undefined : firstError(schema, proposal)) ?? (decision.schema === undefined ? undefined : firstError(decision.schema, proposal));
		return invalid === undefined ? undefined : refuse(PROPOSAL_INVALID, invalid);
	}

	#amend(decision: Decision, by: string, proposal: unknown, reason: string): ToolOutcome {
		const { bus } = this.#parts;
		const seq = bus.frame().cause ?? bus.lastSeq;
		decision.amendments.push({ by, seq, proposal: Clone(proposal), reason });
		if (by === "human") bus.emit("core", "human_amend", { decision: decision.id, proposal: Clone(proposal), reason });
		const shown = JSON.stringify(proposalOf(decision));
		return { ok: true, reply: this.#parts.amended(decision.id, shown) ?? `amended decision ${String(decision.id)}: ${shown}` };
	}

	#refusal(code: string): Refusal {
		return refuse(code, this.#parts.reply(code));
	}

	save(): readonly DecisionSnapshot[] {
		return this.#open.map((decision) => ({
			id: decision.id,
			kind: decision.kind,
			owner: decision.owner,
			commit: decision.commit,
			proposal: Clone(decision.proposal),
			...(decision.schema === undefined ? {} : { schema: Clone(decision.schema) }),
			opened: decision.opened,
			deadline: decision.deadline,
			holders: [...decision.holders],
			amendments: decision.amendments.map((amendment) => ({ ...amendment, proposal: Clone(amendment.proposal) })),
		}));
	}

	load(saved: readonly DecisionSnapshot[]): void {
		this.#open = saved.map((entry) => {
			const prefix = `${entry.owner}.`;
			if (!entry.kind.startsWith(prefix)) throw new Error(`snapshot: decision ${String(entry.id)} of kind ${entry.kind} is not owned by ${entry.owner}`);
			const local = entry.kind.slice(prefix.length);
			if (this.#parts.schemaOf(entry.owner, local) === undefined) throw new Error(`snapshot: decision ${String(entry.id)} of kind ${entry.kind}, which no loaded mechanic declares`);
			const schema = entry.schema === undefined ? undefined : isSchema(entry.schema) ? entry.schema : undefined;
			return { id: entry.id, kind: entry.kind, owner: entry.owner, local, commit: entry.commit, proposal: entry.proposal, schema, opened: entry.opened, deadline: entry.deadline, holders: entry.holders, amendments: [...entry.amendments] };
		}).sort((a, b) => a.id - b.id);
	}
}
