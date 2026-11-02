/**
 * The weaver (`--weaver`, docs/ideas/fate.md): lets residents' characters
 * change during a run. It is an `EventSink` and a round observer of the
 * arena, after the interpreter (whose labels it reads) and before the
 * gamemaker (who reads a line for every change).
 *
 * After every minute the code picks the residents still in the city whom a
 * hard fact touched ({@link FateTriggers}); only they go to the model, one
 * request each, with a dossier. Its answer:
 *
 * - `soft`: an inner voice, once, at the end of the resident's next step's
 *   inputs, after everything the city shows (the cached prefix stays);
 * - `hard`: who the story has made of the resident; the character part of its
 *   system prompt is rebuilt with it (one cache miss);
 * - `none`, or an answer that does not parse: nothing changes.
 *
 * Per resident and act at most {@link MAX_SOFT} soft and {@link MAX_HARD} hard
 * changes: a hard one beyond its cap becomes soft while soft ones are left,
 * anything beyond both is dropped. When an act is over, every resident still
 * in the city that changed in it gets one text for the next act (`act`); the
 * act's inner voices not heard yet are dropped.
 *
 * Every change is a `fate_shift` event. The hard texts are in the run
 * snapshot, so a resumed run builds the same system prompts.
 */
import type { CompetitorId } from "@swarmtales/kernel";
import {
	type EventBus,
	type EventSink,
	FATE_TRIGGERS,
	type FateShiftKind,
	type FateTrigger,
	type RecordedEvent,
	type RoundObserver,
} from "@swarmtales/engine";
import { FateTriggers, type FateHit } from "./fate-triggers.ts";
import { WEAVER_ID, type Weave, type WeaverAnswer, type WeaverModel, type WeaverQuestion } from "./weaver-model.ts";
import { render } from "@swarmtales/prompts";

/** Inner voices per resident and act. */
export const MAX_SOFT = 6;
/** Rewrites of the character per resident and act (the act's end does not count). */
export const MAX_HARD = 2;
/** How an inner voice opens in a step's inputs. */
export const INNER_VOICE_HEAD = render("weaver/inner-voice", { text: "\u0000" }).split("\u0000")[0] ?? "";

/** The city as the weaver reads it; the world provides all of it. */
export interface WeaverCity {
	readonly competitors: readonly CompetitorId[];
	readonly minute: number;
	/** The first level of the act running now. */
	readonly currentAct: number;
	isExiled(agent: CompetitorId): boolean;
	isActOver(fromLevel: number): boolean;
	/** Text as residents read it: names instead of IDs. */
	display(text: string): string;
}

export interface WeaverOptions {
	readonly model: WeaverModel;
	readonly bus: EventBus;
	readonly city: WeaverCity;
	/** The character part of a resident's prompt without any change: its core motive in prose, or its persona. */
	readonly characterOf: (agent: CompetitorId) => string;
	/** Rebuilds the resident's system prompt with `shift` as who the story has made of it. */
	readonly rewrite: (agent: CompetitorId, shift: string) => void;
	/** The act's title, e.g. "Act II"; "the act from level n" when omitted. */
	readonly actTitle?: (fromLevel: number) => string | undefined;
}

/** A change of one resident in an act that is still running. */
export interface FatePatch {
	readonly agent: CompetitorId;
	/** The first level of the act it belongs to. */
	readonly act: number;
	readonly kind: "soft" | "hard";
	readonly text: string;
	readonly minute: number;
	/** The `seq` of its `fate_shift` event. */
	readonly seq: number;
}

/** What the weaver carries over a run snapshot (SPEC 17). */
export interface WeaverSnapshot {
	/** Residents touched since the last look, not asked about yet. */
	readonly pending: readonly FateHit[];
	readonly patches: readonly FatePatch[];
	/** Each resident's last hard text, as its prompt shows it. */
	readonly shifts: readonly { readonly agent: CompetitorId; readonly text: string }[];
	/** Inner voices its next step has not heard yet. */
	readonly voices: readonly { readonly agent: CompetitorId; readonly text: string }[];
	/** Acts whose end the weaver has written. */
	readonly closed: readonly number[];
}

export class Weaver implements EventSink, RoundObserver {
	readonly #options: WeaverOptions;
	readonly #triggers: FateTriggers;
	#pending: FateHit[] = [];
	#patches: FatePatch[] = [];
	readonly #shifts = new Map<CompetitorId, string>();
	readonly #voices = new Map<CompetitorId, string[]>();
	readonly #closed = new Set<number>();

	constructor(options: WeaverOptions) {
		this.#options = options;
		const ids = new Set(options.city.competitors);
		this.#triggers = new FateTriggers((id) => ids.has(id));
	}

	/** Each resident's last hard text: who the story has made of it so far. */
	shiftOf(agent: CompetitorId): string | undefined {
		return this.#shifts.get(agent);
	}

	/** The inner voices due at the end of `agent`'s next step; taking them empties its queue. */
	takeVoices(agent: CompetitorId): readonly string[] {
		const voices = this.#voices.get(agent) ?? [];
		this.#voices.delete(agent);
		return voices;
	}

	/**
	 * Puts back inner voices a step took but its model never kept (a refused
	 * step, or one the souffleur could not rewrite), ahead of any newer ones.
	 */
	returnVoices(agent: CompetitorId, voices: readonly string[]): void {
		if (voices.length === 0) return;
		this.#voices.set(agent, [...voices, ...(this.#voices.get(agent) ?? [])]);
	}

	record(event: RecordedEvent): void {
		// Hits first: a message's readers are read before its interpretation forgets them.
		this.#pending.push(...this.#triggers.hitsOf(event));
		this.#triggers.observe(event);
	}

	snapshot(): WeaverSnapshot {
		return {
			pending: [...this.#pending],
			patches: [...this.#patches],
			shifts: [...this.#shifts].map(([agent, text]) => ({ agent, text })),
			voices: [...this.#voices].flatMap(([agent, texts]) => texts.map((text) => ({ agent, text }))),
			closed: [...this.#closed].sort((a, b) => a - b),
		};
	}

	/**
	 * Continues a snapshot's weaver; its alliances are rebuilt from the prefix.
	 * A run that had no weaver before starts with no changes but knows the alliances.
	 */
	restore(state: WeaverSnapshot | undefined, prefix: readonly RecordedEvent[]): void {
		for (const event of prefix) this.#triggers.observe(event);
		if (state === undefined) return;
		this.#pending = [...state.pending];
		this.#patches = [...state.patches];
		this.#shifts.clear();
		for (const entry of state.shifts) {
			this.#shifts.set(entry.agent, entry.text);
			this.#options.rewrite(entry.agent, entry.text);
		}
		this.#voices.clear();
		for (const entry of state.voices) this.#voices.set(entry.agent, [...(this.#voices.get(entry.agent) ?? []), entry.text]);
		this.#closed.clear();
		for (const act of state.closed) this.#closed.add(act);
	}

	async afterRound(): Promise<void> {
		await this.#closeActs();
		const hits = this.#pending;
		this.#pending = [];
		const { city } = this.#options;
		const touched = city.competitors.filter((agent) => !city.isExiled(agent) && hits.some((entry) => entry.agent === agent));
		if (touched.length === 0) return;
		const act = city.currentAct;
		// The requests run together; their results land in the order of the residents.
		const asked = touched.map((agent) => {
			const own = hits.filter((entry) => entry.agent === agent);
			return { agent, own, answer: this.#ask(this.#question(agent, this.#patchesOf(agent, act), own, undefined)) };
		});
		for (const { agent, own, answer } of asked) this.#apply(agent, act, own, this.#metered(await answer));
	}

	/** Writes the end of every act that is over: one text for the next act per resident that changed in it. */
	async #closeActs(): Promise<void> {
		const { city } = this.#options;
		const acts = [...new Set(this.#patches.map((patch) => patch.act))].filter((act) => !this.#closed.has(act) && city.isActOver(act)).sort((a, b) => a - b);
		for (const act of acts) {
			this.#closed.add(act);
			const patches = this.#patches.filter((patch) => patch.act === act);
			this.#patches = this.#patches.filter((patch) => patch.act !== act);
			const agents = city.competitors.filter((agent) => !city.isExiled(agent) && patches.some((patch) => patch.agent === agent));
			const asked = agents.map((agent) => {
				const own = patches.filter((patch) => patch.agent === agent);
				// The act's inner voices are gone with it.
				this.#voices.delete(agent);
				return { agent, own, answer: this.#ask(this.#question(agent, own, [], act)) };
			});
			for (const { agent, own, answer } of asked) {
				const weave = usable(this.#metered(await answer));
				if (weave === undefined || weave.kind === "none") continue;
				this.#harden(agent, weave, "act", own.map((patch) => patch.seq), ["act_end"]);
			}
		}
	}

	#patchesOf(agent: CompetitorId, act: number): readonly FatePatch[] {
		return this.#patches.filter((patch) => patch.agent === agent && patch.act === act);
	}

	/** Applies one answer within the caps of the act; a hard change beyond its cap becomes soft while soft ones are left. */
	#apply(agent: CompetitorId, act: number, hits: readonly FateHit[], answer: WeaverAnswer): void {
		const weave = usable(answer);
		if (weave === undefined || weave.kind === "none") return;
		const own = this.#patchesOf(agent, act);
		const soft = own.filter((patch) => patch.kind === "soft").length;
		const hard = own.length - soft;
		const kind = weave.kind === "hard" && hard < MAX_HARD ? "hard" : soft < MAX_SOFT ? "soft" : undefined;
		if (kind === undefined) return;
		const evidence = [...new Set(hits.map((entry) => entry.seq))].sort((a, b) => a - b);
		const triggers = FATE_TRIGGERS.filter((trigger) => hits.some((entry) => entry.trigger === trigger));
		const text = kind === "hard" ? this.#harden(agent, weave, "hard", evidence, triggers) : this.#whisper(agent, weave, evidence, triggers);
		this.#patches.push({ agent, act, kind, text, minute: this.#options.city.minute, seq: this.#options.bus.seq });
	}

	/** A soft change: an inner voice at the end of the resident's next step. */
	#whisper(agent: CompetitorId, weave: Weave, evidence: readonly number[], triggers: readonly FateTrigger[]): string {
		const text = this.#options.city.display(weave.text.trim());
		this.#voices.set(agent, [...(this.#voices.get(agent) ?? []), `${INNER_VOICE_HEAD}${text}`]);
		this.#emit(agent, "soft", text, weave.reason, evidence, triggers);
		return text;
	}

	/** A hard change or an act's end: the resident's prompt is rebuilt with the new text. */
	#harden(agent: CompetitorId, weave: Weave, kind: "hard" | "act", evidence: readonly number[], triggers: readonly FateTrigger[]): string {
		const text = this.#options.city.display(weave.text.trim());
		this.#shifts.set(agent, text);
		this.#options.rewrite(agent, text);
		this.#emit(agent, kind, text, weave.reason, evidence, triggers);
		return text;
	}

	/**
	 * The event keeps the model's reason as it wrote it (for the run's record);
	 * the gamemaker reads only `kind`, `triggers` and `evidence`, which the code
	 * built, so nothing the model saw can reach it through the reason.
	 */
	#emit(agent: CompetitorId, kind: FateShiftKind, text: string, reason: string, evidence: readonly number[], triggers: readonly FateTrigger[]): void {
		this.#options.bus.emit({ type: "fate_shift", agent, kind, text, reason: reason.trim(), evidence, triggers });
	}

	#question(agent: CompetitorId, patches: readonly FatePatch[], hits: readonly FateHit[], actEnd: number | undefined): WeaverQuestion {
		const { city, characterOf, actTitle } = this.#options;
		const shift = this.#shifts.get(agent);
		const hard = patches.filter((patch) => patch.kind === "hard").length;
		return {
			resident: city.display(agent),
			minute: city.minute,
			character: city.display(characterOf(agent)),
			...(shift === undefined ? {} : { shift }),
			patches: patches.map((patch) => ({ minute: patch.minute, kind: patch.kind, text: patch.text })),
			events: hits.map((entry) => ({ seq: entry.seq, text: city.display(entry.text) })),
			...(actEnd === undefined ? {} : { actEnd: { title: actTitle?.(actEnd) ?? `The act from level ${actEnd}` } }),
			hardLeft: Math.max(0, MAX_HARD - hard),
		};
	}

	/** One request; a thrown error is a failed answer. */
	async #ask(question: WeaverQuestion): Promise<WeaverAnswer> {
		try {
			return await this.#options.model.weave(question);
		} catch (error) {
			return { ok: false, error: error instanceof Error ? error.message : String(error), usage: [] };
		}
	}

	/** Logs an answer's spend as `usage` of {@link WEAVER_ID}, in the order of the residents. */
	#metered(answer: WeaverAnswer): WeaverAnswer {
		for (const entry of answer.usage) this.#options.bus.emit({ type: "usage", agent: WEAVER_ID, ...entry });
		return answer;
	}
}

/** The answer's weave when it can change anything: parsed, with a text for a change. */
function usable(answer: WeaverAnswer): Weave | undefined {
	if (!answer.ok) return undefined;
	const { weave } = answer;
	return weave.kind !== "none" && weave.text.trim().length === 0 ? undefined : weave;
}
