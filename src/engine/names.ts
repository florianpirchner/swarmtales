/**
 * Resident names (v08, SPEC 18). In the first minutes of a fresh run every
 * resident chooses the name the city knows it by (`chooseName`); whoever has
 * none when the choice closes gets a seeded one from the story's word list.
 * IDs stay the engine's keys: events, snapshots and tests keep them. Every
 * text a resident (or the game master) reads shows names instead
 * ({@link NameBook.display}), and every tool that takes a resident accepts
 * the name as well as the ID ({@link NameBook.resolve}).
 */
import type { CompetitorId } from "../core/ids.ts";
import { err, ok, type Result } from "../core/result.ts";
import { rngFor } from "../core/random.ts";
import type { NamesSpec } from "../story/types.ts";

export type NameError = "NAME_INVALID" | "NAME_ID" | "NAME_RESERVED" | "NAME_TAKEN" | "NAME_CHOSEN" | "NAME_CLOSED";

/** 3 to 16 characters: letters, digits and hyphens, starting with a letter. */
const NAME = /^[A-Za-z][A-Za-z0-9-]{2,15}$/;
/** A resident ID, e.g. `A07` (any case). */
const ID = /^a\d+$/i;
/** A resident ID inside a text: not part of a longer word, a code or a piece reference like `L8-counter-A02`. */
const ID_IN_TEXT = /(?<![A-Za-z0-9-])A\d{2,}(?![A-Za-z0-9-])/g;
/** The city's own announcement keeps the ID it renames. */
const ANNOUNCED = " is now called ";

export interface NameEntry {
	readonly agent: CompetitorId;
	readonly name: string;
	readonly fallback: boolean;
}

/** The names of a run, as a snapshot keeps them. */
export interface NamesSnapshot {
	readonly entries: readonly NameEntry[];
	/** The choice has closed: every resident has a name. */
	readonly settled: boolean;
}

export interface NameBookOptions {
	readonly spec: NamesSpec;
	readonly ids: readonly CompetitorId[];
	readonly seed: number;
	/** Names nobody may take (system authors, the cast, the city), compared without case. */
	readonly reserved: readonly string[];
	readonly announce: (entry: NameEntry) => void;
}

export class NameBook {
	readonly #options: NameBookOptions;
	readonly #names = new Map<CompetitorId, NameEntry>();
	readonly #byName = new Map<string, CompetitorId>();
	readonly #reserved: ReadonlySet<string>;
	#settled = false;

	constructor(options: NameBookOptions) {
		this.#options = options;
		this.#reserved = new Set(options.reserved.map((name) => name.toLowerCase()));
	}

	/** The minute at whose start the city names whoever has not chosen. */
	get untilMinute(): number {
		return this.#options.spec.untilMinute;
	}

	get settled(): boolean {
		return this.#settled;
	}

	nameOf(agent: CompetitorId): string | undefined {
		return this.#names.get(agent)?.name;
	}

	/** Whether the choice is open: the city offers `chooseName` (a second call is refused with `NAME_CHOSEN`). */
	isOpen(minute: number): boolean {
		return !this.#settled && minute < this.untilMinute;
	}

	/** Whether `agent` may still choose: it has no name and the choice is open. */
	canChoose(agent: CompetitorId, minute: number): boolean {
		return this.isOpen(minute) && !this.#names.has(agent) && this.#options.ids.includes(agent);
	}

	/** Why `name` is not available to anyone; undefined when it is. */
	refusal(name: string): { readonly error: NameError; readonly detail: string } | undefined {
		if (!NAME.test(name)) return { error: "NAME_INVALID", detail: "3 to 16 characters: letters, digits and hyphens, starting with a letter" };
		if (name.split("-").some((part) => ID.test(part))) return { error: "NAME_ID", detail: "a name must not look like a resident ID such as A01" };
		if (this.#reserved.has(name.toLowerCase())) return { error: "NAME_RESERVED", detail: `${name} belongs to the city or its cast` };
		const holder = this.#byName.get(name.toLowerCase());
		if (holder !== undefined) return { error: "NAME_TAKEN", detail: `another resident is called ${this.nameOf(holder) ?? name}` };
		return undefined;
	}

	choose(agent: CompetitorId, name: string, minute: number): Result<NameEntry, NameError> {
		const chosen = this.nameOf(agent);
		if (chosen !== undefined) return err("NAME_CHOSEN", `you are called ${chosen}; a name is chosen once`);
		if (!this.canChoose(agent, minute)) return err("NAME_CLOSED", "the city has closed the choice of names");
		const refused = this.refusal(name);
		if (refused !== undefined) return err(refused.error, refused.detail);
		return ok(this.#give({ agent, name, fallback: false }));
	}

	/** At the start of `minute`: once the choice closes, the city names every resident without a name. */
	settle(minute: number): void {
		if (this.#settled || minute < this.untilMinute) return;
		this.#settled = true;
		const rng = rngFor(this.#options.seed, "names");
		const words = this.#options.spec.fallbackWords;
		for (const agent of this.#options.ids) {
			if (this.#names.has(agent)) continue;
			for (;;) {
				const name = `${rng.pick(words)}-${String(rng.int(1000, 9999))}`;
				if (this.refusal(name) !== undefined) continue;
				this.#give({ agent, name, fallback: true });
				break;
			}
		}
	}

	/** The resident a name or an ID stands for (any case); undefined when nobody is called so. */
	resolve(nameOrId: string): CompetitorId | undefined {
		const trimmed = nameOrId.trim();
		return this.#byName.get(trimmed.toLowerCase()) ?? this.#options.ids.find((id) => id.toLowerCase() === trimmed.toLowerCase());
	}

	/**
	 * `text` as residents read it: every resident ID replaced by its name.
	 * `keep` spares a token that is something else as well (a password
	 * fragment that happens to look like an ID).
	 */
	display(text: string, keep: (token: string) => boolean = () => false): string {
		if (this.#names.size === 0) return text;
		return text.replace(ID_IN_TEXT, (token: string, offset: number) => {
			const name = this.nameOf(token);
			if (name === undefined || keep(token) || text.startsWith(ANNOUNCED, offset + token.length)) return token;
			return name;
		});
	}

	/** `Mira (A03)` for reports; the bare ID without a name. */
	label(agent: CompetitorId): string {
		const name = this.nameOf(agent);
		return name === undefined ? agent : `${name} (${agent})`;
	}

	snapshot(): NamesSnapshot {
		return { entries: [...this.#names.values()], settled: this.#settled };
	}

	restore(state: NamesSnapshot): void {
		for (const entry of state.entries) this.#store(entry);
		this.#settled = state.settled;
	}

	#give(entry: NameEntry): NameEntry {
		this.#store(entry);
		this.#options.announce(entry);
		return entry;
	}

	#store(entry: NameEntry): void {
		this.#names.set(entry.agent, entry);
		this.#byName.set(entry.name.toLowerCase(), entry.agent);
	}
}
