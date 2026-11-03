/**
 * The human hand (docs/design/overseer-api.md §5). The human is an overseer without a model: actor
 * `human`, grant key `grants.human`, and four core tools besides `amendDecision`:
 *
 * - `instruct` writes `human_note` (audience: the target, its copies and the human) and keeps a
 *   standing order for an overseer (§4.2) or, when the story lets the human reach residents, a turn
 *   input of kind `human` for the resident's next turn. Mode `advice` unless an order is chosen.
 * - `pause`, `resume` and `step` halt the host at the next safe stop, go on, or play one block
 *   and halt again; only their `tool_called` is logged.
 *
 * Human calls wait in an inbox and run only at safe stops: before and after each block, in the
 * `between` slot, and while paused there; never inside a turn or an overseer call. So the log
 * records exactly where they landed, and a replay (`HumanChannel.next`, `scriptedHuman` in the
 * testkit) gives each call back where the log had the same length.
 */
import { Type, type Static, type TSchema } from "typebox";
import { Parse } from "typebox/value";
import type { CoreStory, Grants, HumanCall, HumanChannel, HumanHand, MechanicTool, PreparedCall, PromptLookup, Refusal, SafeStop, StandingOrder, ToolOutcome } from "@swarmtales/contracts";
import { refuse } from "./define.ts";
import type { EventBus } from "./log.ts";
import type { OrderBook } from "./orders.ts";

export const TARGET_UNKNOWN = "TARGET_UNKNOWN";
export const RESIDENTS_OFF = "RESIDENTS_OFF";
export const COPY_NOT_ALLOWED = "COPY_NOT_ALLOWED";
export const ORDER_UNKNOWN = "ORDER_UNKNOWN";
export const INSTRUCTION_EMPTY = "INSTRUCTION_EMPTY";
/** What a call still in the inbox gets when the run ends before a safe stop took it. */
export const RUN_ENDED = "RUN_ENDED";

/** The human's own core tools; only `human` may be granted them, and they serve only the human. */
export const HUMAN_TOOLS = ["instruct", "pause", "resume", "step"] as const;

const Lifetime = Type.Union([
	Type.Object({ untilMinute: Type.Integer({ minimum: 0, description: "The last minute it holds" }) }),
	Type.Object({ calls: Type.Integer({ minimum: 1, description: "How many calls carry it" }) }),
	Type.Literal("untilRevoked"),
]);

export const InstructParams = Type.Object({
	target: Type.String({ description: "An overseer's name, the gamemaker, or a resident's id when the story allows it" }),
	text: Type.String({ maxLength: 2000, description: "The instruction; empty only to revoke an order" }),
	mode: Type.Optional(Type.Union([Type.Literal("advice"), Type.Literal("order")], { description: "advice (the default) or order, which the overseer must account for" })),
	lifetime: Type.Optional(Lifetime),
	copy: Type.Optional(Type.Array(Type.String(), { description: "Who also hears it, when the story lets the human choose" })),
	revoke: Type.Optional(Type.Integer({ description: "The order (the seq of its human_note) this one ends" })),
});

type Instruct = Static<typeof InstructParams>;

const NoParams = Type.Object({});

export interface DeskParts {
	readonly story: CoreStory;
	readonly bus: EventBus;
	readonly minute: () => number;
	readonly orders: OrderBook;
	readonly prompts: PromptLookup | undefined;
	readonly residents: readonly string[];
	/** Whether the app drives a gamemaker without an overseer of that name (`HostOptions.between`). */
	readonly gamemakerDriven: boolean;
	/** A call through the gateway as actor `human`. */
	readonly call: (tool: string, params: unknown) => Promise<ToolOutcome>;
	readonly reply: (code: string) => string | undefined;
}

interface Waiting {
	readonly call: HumanCall;
	readonly resolve: (outcome: ToolOutcome) => void;
	readonly reject: (error: unknown) => void;
}

/** A tool of the core for the human; its parameters parse with `schema`. */
function coreTool<S extends TSchema>(name: string, description: string, schema: S, rule: (params: Static<S>) => Refusal | undefined, execute: (params: Static<S>) => ToolOutcome): MechanicTool {
	return {
		name,
		description,
		parameters: schema,
		limit: undefined,
		suggest: ["human"],
		serves: ["human"],
		prepare: (raw): PreparedCall | undefined => {
			let params: Static<S>;
			try {
				params = Parse(schema, raw);
			} catch {
				return undefined;
			}
			return { params, rule: () => rule(params), guardText: () => undefined, consult: undefined, execute: () => execute(params) };
		},
	};
}

/** Only `human` may hold the human's tools. */
export function checkHumanGrants(grants: Grants<string, string>): void {
	for (const [name, tools] of Object.entries(grants)) {
		if (name === "human") continue;
		const tool = (tools ?? []).find((granted) => HUMAN_TOOLS.some((own) => own === granted));
		if (tool !== undefined) throw new Error(`story: ${tool} is granted to "${name}", but only the human uses it`);
	}
}

export class HumanDesk {
	readonly #parts: DeskParts;
	readonly #channel: HumanChannel | undefined;
	readonly #inbox: Waiting[] = [];
	#paused = false;
	#steps = 0;
	#closed = false;
	#released = false;
	#wake: (() => void) | undefined;

	/** `channel` undefined: no human is attached; the tools exist, but no hand and no safe stop. */
	constructor(parts: DeskParts, channel: HumanChannel | undefined) {
		this.#parts = parts;
		this.#channel = channel;
	}

	get attached(): boolean {
		return this.#channel !== undefined;
	}

	tools(): readonly MechanicTool[] {
		const free = (): undefined => undefined;
		return [
			coreTool("instruct", "core/tools/instruct", InstructParams, (params) => this.#rule(params), (params) => this.#instruct(params)),
			coreTool("pause", "core/tools/pause", NoParams, free, () => {
				this.#paused = true;
				this.#steps = 0;
				return this.#done("core/replies/paused", "paused");
			}),
			coreTool("resume", "core/tools/resume", NoParams, free, () => {
				this.#paused = false;
				this.#steps = 0;
				return this.#done("core/replies/resumed", "resumed");
			}),
			coreTool("step", "core/tools/step", NoParams, free, () => {
				this.#paused = true;
				this.#steps += 1;
				return this.#done("core/replies/stepped", "one more block, then halted");
			}),
		];
	}

	#done(prompt: string, plain: string): ToolOutcome {
		return { ok: true, reply: this.#parts.prompts?.render("core", prompt, {}, []) ?? plain };
	}

	#refusal(code: string): Refusal {
		return refuse(code, this.#parts.reply(code));
	}

	/** What a target is: an overseer of the story, the gamemaker, a resident, or nothing the human can reach. */
	#targetOf(name: string): { readonly kind: "overseer" | "resident"; readonly lifetime: "long" | "short" } | undefined {
		const use = (this.#parts.story.overseers ?? []).find((entry) => entry.name === name);
		if (use !== undefined) return { kind: "overseer", lifetime: use.overseer.lifetime };
		if (name === "gamemaker" && this.#parts.gamemakerDriven) return { kind: "overseer", lifetime: "long" };
		if (this.#parts.residents.includes(name)) return { kind: "resident", lifetime: "short" };
		return undefined;
	}

	/** Who also hears it, by the story's `copyTo`; a refusal when the call asks for more. */
	#copies(params: Instruct): readonly string[] | Refusal {
		const asked = [...new Set(params.copy ?? [])];
		const policy = this.#parts.story.human?.copyTo ?? "never";
		if (policy === "never") return asked.length === 0 ? [] : this.#refusal(COPY_NOT_ALLOWED);
		if (policy === "gamemaker") {
			if (asked.some((name) => name !== "gamemaker")) return this.#refusal(COPY_NOT_ALLOWED);
			return params.target === "gamemaker" ? [] : ["gamemaker"];
		}
		const wrong = asked.find((name) => name === params.target || this.#targetOf(name)?.kind !== "overseer");
		return wrong === undefined ? asked : this.#refusal(TARGET_UNKNOWN);
	}

	#rule(params: Instruct): Refusal | undefined {
		const target = this.#targetOf(params.target);
		if (target === undefined) return this.#refusal(TARGET_UNKNOWN);
		if (target.kind === "resident" && this.#parts.story.human?.residents !== true) return this.#refusal(RESIDENTS_OFF);
		const copies = this.#copies(params);
		if ("code" in copies) return copies;
		if (params.revoke !== undefined && !this.#parts.orders.has(params.revoke, this.#parts.minute())) return this.#refusal(ORDER_UNKNOWN);
		if (params.text.trim() === "" && params.revoke === undefined) return this.#refusal(INSTRUCTION_EMPTY);
		return undefined;
	}

	#instruct(params: Instruct): ToolOutcome {
		const { bus, orders, prompts } = this.#parts;
		if (params.revoke !== undefined) orders.revoke(params.revoke);
		if (params.text.trim() === "") {
			const revoked = String(params.revoke);
			return { ok: true, reply: prompts?.render("core", "core/replies/revoked", { order: revoked }, ["order"]) ?? `order ${revoked} revoked` };
		}
		const target = this.#targetOf(params.target);
		const copies = this.#copies(params);
		if (target === undefined || "code" in copies) throw new Error("instruct: the rule let an unknown target or copy through");
		const mode = params.mode ?? "advice";
		// A resident hears it once, in its next turn; a long overseer in its next call; a short one until revoked.
		const lifetime: StandingOrder["lifetime"] = target.kind === "resident" ? { calls: 1 } : (params.lifetime ?? (target.lifetime === "long" ? { calls: 1 } : "untilRevoked"));
		const id = bus.lastSeq + 1;
		const note = bus.emit("core", "human_note", { order: id, target: params.target, text: params.text, mode, lifetime, copy: [...copies] }, [params.target, ...copies, "human"]);
		if (note.seq !== id) throw new Error(`instruct: the note was written at seq ${String(note.seq)}, expected ${String(id)}`);
		orders.add({ id, target: params.target, text: params.text, mode, lifetime, issued: this.#parts.minute(), used: 0 });
		return { ok: true, reply: prompts?.render("core", "core/replies/instructed", { order: id, target: params.target }, ["order", "target"]) ?? `order ${String(id)} to ${params.target}` };
	}

	/** The hand the app holds; each call waits for the next safe stop. */
	hand(): HumanHand {
		const send = (tool: string, params: unknown): Promise<ToolOutcome> =>
			new Promise<ToolOutcome>((resolve, reject) => {
				if (this.#closed) {
					resolve(refuse(RUN_ENDED));
					return;
				}
				this.#inbox.push({ call: { tool, params }, resolve, reject });
				this.#wake?.();
			});
		return {
			instruct: (params) => send("instruct", params),
			amendDecision: (params) => send("amendDecision", params),
			pause: () => send("pause", {}),
			resume: () => send("resume", {}),
			step: () => send("step", {}),
		};
	}

	/**
	 * A safe stop: the scripted calls and the inbox run, one after the other; while paused the
	 * host halts here (before a block or in `between`) until a resume or a step arrives.
	 */
	async safeStop(at: SafeStop["at"], pass?: number, block?: number): Promise<void> {
		for (;;) {
			await this.#runWaiting(at, pass, block);
			if (!this.#paused || this.#closed || this.#released || at === "afterBlock") return;
			if (this.#steps > 0) {
				// A step plays one block: it is spent before the block, and a `between` lets it pass to the next one.
				if (at === "beforeBlock") this.#steps -= 1;
				return;
			}
			// A call that arrived since the inbox was emptied (its sender ran in between) is taken at once.
			if (this.#inbox.length > 0) continue;
			await new Promise<void>((resolve) => {
				this.#wake = resolve;
			});
			this.#wake = undefined;
		}
	}

	async #runWaiting(at: SafeStop["at"], pass: number | undefined, block: number | undefined): Promise<void> {
		for (;;) {
			const stop: SafeStop = { minute: this.#parts.minute(), at, ...(pass === undefined ? {} : { pass }), ...(block === undefined ? {} : { block }), seq: this.#parts.bus.lastSeq };
			const scripted = this.#channel?.next?.(stop);
			if (scripted !== undefined) {
				await this.#parts.call(scripted.tool, scripted.params);
				continue;
			}
			const waiting = this.#inbox.shift();
			if (waiting === undefined) return;
			try {
				waiting.resolve(await this.#parts.call(waiting.call.tool, waiting.call.params));
			} catch (error) {
				waiting.reject(error);
				throw error;
			}
		}
	}

	/** A stop was asked for: a halted host is let go, and no later safe stop halts (the inbox still runs). */
	release(): void {
		this.#released = true;
		this.#wake?.();
	}

	/** The run ended: what still waits gets `RUN_ENDED`, and a halted host is let go. */
	close(): void {
		this.#closed = true;
		for (const waiting of this.#inbox.splice(0)) waiting.resolve(refuse(RUN_ENDED));
		this.#wake?.();
	}
}
