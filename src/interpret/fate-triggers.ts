/**
 * What touches a resident (the weaver, `--weaver`): code, not a model, reads
 * every event and names the residents a hard fact hit, each with a plain
 * sentence and the event's `seq`. Only they go to the weaver's model; a
 * quiet minute costs nothing.
 *
 * The triggers (SPEC 10.6):
 *
 * - `blame`: the loser, branded a liar (upheld) or a false accuser (rejected);
 * - `interpretation`: the residents a classifier `accusation` label in a
 *   message names (a DM, board, group or cast post; never a thought or an
 *   aside, which reach nobody). Without the classifier no accusation counts;
 * - `tribunal_opened`: every accused;
 * - `exile_gate`: the resident sent to the gate; `ransomed`: the one bought back;
 * - `exiled`: the allies of the exiled (or struck) resident still in the city;
 *   an ally is one who shared a group founded by a resident, or a faction of
 *   the last tribunal's draft;
 * - `ultimatum_resolved`: each holder who paid; `piece_kept` with cause
 *   `ultimatum`: the holder whose piece the city seized.
 *
 * Secret events (votes, nominations, seal bids and the seal's winner) never
 * trigger: the gamemaker reads a line for every change and would learn them.
 */
import type { CompetitorId } from "../core/ids.ts";
import { assertNever } from "../core/result.ts";
import type { RecordedEvent } from "../engine/events.ts";
import { isPrivateSource } from "./labels.ts";

/** A resident a hard fact touched: what happened, as a sentence, and the event's number. */
export interface FateHit {
	readonly agent: CompetitorId;
	readonly seq: number;
	readonly text: string;
}

/**
 * The triggers and the alliances they remember. The alliances are rebuilt
 * from the events alone, so a resumed run replays its prefix through
 * {@link FateTriggers.observe} and needs nothing in the snapshot.
 */
export class FateTriggers {
	readonly #isCompetitor: (id: string) => boolean;
	/** Members of every group a resident founded (city groups are no alliance). */
	readonly #groups = new Map<string, Set<CompetitorId>>();
	/** The factions of the last tribunal's draft. */
	#factions: (readonly CompetitorId[])[] = [];

	constructor(isCompetitor: (id: string) => boolean) {
		this.#isCompetitor = isCompetitor;
	}

	/** Who else shares a group or a faction with `agent`, sorted. */
	alliesOf(agent: CompetitorId): readonly CompetitorId[] {
		const allies = new Set<CompetitorId>();
		for (const members of [...this.#groups.values(), ...this.#factions]) {
			const list = [...members];
			if (!list.includes(agent)) continue;
			for (const member of list) if (member !== agent) allies.add(member);
		}
		return [...allies].sort();
	}

	/** Keeps the alliances up to date; every event passes through here, the prefix of a resumed run too. */
	observe(event: RecordedEvent): void {
		if (event.type === "group_created") {
			if (this.#isCompetitor(event.founder)) this.#groups.set(event.group, new Set([event.founder]));
		} else if (event.type === "group_membership") {
			const members = this.#groups.get(event.group);
			if (members === undefined) return;
			if (event.change === "added") members.add(event.agent);
			else members.delete(event.agent);
		} else if (event.type === "group_removed") {
			this.#groups.delete(event.group);
		} else if (event.type === "factions_formed") {
			this.#factions = event.factions.map((faction) => [...new Set([faction.leader, ...faction.members])].sort());
		}
	}

	/** The residents `event` touched, with what happened to them. */
	hitsOf(event: RecordedEvent): readonly FateHit[] {
		const hit = (agent: CompetitorId, text: string): FateHit => ({ agent, seq: event.seq, text });
		if (event.type === "blame") {
			return event.outcome === "upheld"
				? [hit(event.accused, `${event.caller} blamed ${event.accused} for denying DM #${event.dm}; the city upheld it: ${event.accused} was branded a liar on the board and paid ${event.penalty} points.`)]
				: [hit(event.caller, `${event.caller} blamed ${event.accused} for denying DM #${event.dm}; the city rejected it: ${event.caller} was branded a false accuser and paid ${event.penalty} points.`)];
		}
		if (event.type === "interpretation") {
			if (isPrivateSource(event.source) || !event.labels.includes("accusation")) return [];
			return event.targets
				.filter((target) => target !== event.agent && this.#isCompetitor(target))
				.map((target) => hit(target, `${event.agent} accused ${target} in a ${sourceText(event.source)} (#${event.ref}).`));
		}
		if (event.type === "tribunal_opened") {
			return event.accused.map((agent) => hit(agent, `The tribunal opened with ${agent} among the accused (${event.accused.join(", ")}).`));
		}
		if (event.type === "exile_gate") {
			return [hit(event.agent, `The tribunal sent ${event.agent} to the gate${event.voters.length === 0 ? "" : `; ${event.voters.join(", ")} voted against ${event.agent}`}.`)];
		}
		if (event.type === "ransomed") return [hit(event.agent, `${event.payers.join(", ")} bought ${event.agent} back from the gate.`)];
		if (event.type === "exiled") {
			return this.alliesOf(event.agent).map((ally) =>
				hit(ally, `${ally}'s ally ${event.agent} ${event.by === "seal" ? "was struck from the register by the black seal" : "was exiled"}.`),
			);
		}
		if (event.type === "ultimatum_resolved") {
			return event.paid.map((entry) => hit(entry.agent, `${entry.agent} let ultimatum ${event.number} run out without handing over and paid ${entry.points} points.`));
		}
		if (event.type === "piece_kept" && event.cause === "ultimatum") {
			return [hit(event.agent, `The city seized a piece ${event.agent} held for ${event.needers.join(", ")}, after an ultimatum ran out.`)];
		}
		return [];
	}
}

function sourceText(source: Extract<RecordedEvent, { type: "interpretation" }>["source"]): string {
	switch (source) {
		case "dm":
			return "direct message";
		case "board":
			return "board post";
		case "group":
			return "group post";
		case "cast":
			return "message to the city";
		case "thought":
		case "aside":
			return "private note";
		default:
			return assertNever(source, "statement source");
	}
}
