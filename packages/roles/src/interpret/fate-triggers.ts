/**
 * What touches a resident (the weaver, `--weaver`): code, not a model, reads
 * every event and names the residents a hard fact hit, each with a plain
 * sentence, the kind of trigger and the event's `seq`. Only they go to the
 * weaver's model; a quiet minute costs nothing.
 *
 * The triggers (SPEC 10.6):
 *
 * - `blame`: the loser, branded a liar (upheld) or a false accuser (rejected);
 * - `interpretation`: the residents a classifier `accusation` label in a
 *   message names, when they could read the message: a board or cast post
 *   counts for every target, a DM only for its recipient, a group post only
 *   for those in the group when it was posted. Never a thought or an aside,
 *   which reach nobody. Without the classifier no accusation counts;
 * - `tribunal_opened`: every accused;
 * - `exile_gate`: the resident sent to the gate (never who voted, which is
 *   secret); `ransomed`: the one bought back;
 * - `exiled`: the allies of the exiled (or struck) resident still in the city;
 *   an ally is one who shared a group founded by a resident, or a faction of
 *   the last tribunal's draft;
 * - `ultimatum_resolved`: each holder who paid; `piece_kept` with cause
 *   `ultimatum`: the holder whose piece the city seized.
 *
 * Secret events (votes, nominations, seal bids and the seal's winner) never
 * trigger, and no hit's text names a voter.
 */
import { assertNever, type CompetitorId } from "@swarmtales/kernel";
import { type FateTrigger, isPrivateSource, type RecordedEvent } from "@swarmtales/engine";
import { render, text } from "@swarmtales/prompts";

/** A resident a hard fact touched: what happened, as a sentence, what kind of event it was, and its number. */
export interface FateHit {
	readonly agent: CompetitorId;
	readonly seq: number;
	readonly text: string;
	readonly trigger: FateTrigger;
}

/**
 * The triggers and what they remember (alliances, group members, who could
 * read a message). All of it is rebuilt from the events alone, so a resumed
 * run replays its prefix through {@link FateTriggers.observe} and needs
 * nothing in the snapshot.
 */
export class FateTriggers {
	readonly #isCompetitor: (id: string) => boolean;
	/** Members of every group a resident founded (city groups are no alliance). */
	readonly #groups = new Map<string, Set<CompetitorId>>();
	/** Members of every group, the city's too: who can read a group post. */
	readonly #members = new Map<string, Set<CompetitorId>>();
	/** Who could read a message, by its `seq`: a DM's recipient, a group post's members at the time. */
	readonly #readers = new Map<number, ReadonlySet<CompetitorId>>();
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

	/** Keeps the alliances and readers up to date; every event passes through here, the prefix of a resumed run too. */
	observe(event: RecordedEvent): void {
		if (event.type === "group_created") {
			const founder = this.#isCompetitor(event.founder) ? [event.founder] : [];
			this.#members.set(event.group, new Set(founder));
			if (founder.length > 0) this.#groups.set(event.group, new Set(founder));
		} else if (event.type === "group_membership") {
			for (const members of [this.#groups.get(event.group), this.#members.get(event.group)]) {
				if (members === undefined) continue;
				if (event.change === "added") members.add(event.agent);
				else members.delete(event.agent);
			}
		} else if (event.type === "group_removed") {
			this.#groups.delete(event.group);
			this.#members.delete(event.group);
		} else if (event.type === "factions_formed") {
			this.#factions = event.factions.map((faction) => [...new Set([faction.leader, ...faction.members])].sort());
		} else if (event.type === "dm_sent") {
			this.#readers.set(event.seq, new Set([event.to]));
		} else if (event.type === "group_post") {
			this.#readers.set(event.seq, new Set(this.#members.get(event.group) ?? []));
		} else if (event.type === "interpretation") {
			// One interpretation per message: once it is read, its readers are no longer needed.
			this.#readers.delete(event.ref);
		}
	}

	/** The residents `event` touched, with what happened to them. Call it before {@link observe} for the same event. */
	hitsOf(event: RecordedEvent): readonly FateHit[] {
		const hit = (agent: CompetitorId, trigger: FateTrigger, text: string): FateHit => ({ agent, seq: event.seq, text, trigger });
		if (event.type === "blame") {
			return event.outcome === "upheld"
				? [hit(event.accused, "blame", render("weaver/hit-blame-upheld", { caller: event.caller, accused: event.accused, dm: event.dm, penalty: event.penalty }))]
				: [hit(event.caller, "blame", render("weaver/hit-blame-rejected", { caller: event.caller, accused: event.accused, dm: event.dm, penalty: event.penalty }))];
		}
		if (event.type === "interpretation") {
			if (isPrivateSource(event.source) || !event.labels.includes("accusation")) return [];
			const readers = event.source === "dm" || event.source === "group" ? this.#readers.get(event.ref) : undefined;
			const sawIt = (target: CompetitorId): boolean => (event.source === "dm" || event.source === "group" ? readers?.has(target) === true : true);
			return event.targets
				.filter((target) => target !== event.agent && this.#isCompetitor(target) && sawIt(target))
				.map((target) => hit(target, "accusation", render("weaver/hit-accusation", { agent: event.agent, target, source: sourceText(event.source), ref: event.ref })));
		}
		if (event.type === "tribunal_opened") {
			return event.accused.map((agent) => hit(agent, "tribunal", render("weaver/hit-tribunal", { agent, accused: event.accused.join(", ") })));
		}
		if (event.type === "exile_gate") return [hit(event.agent, "gate", render("weaver/hit-gate", { agent: event.agent }))];
		if (event.type === "ransomed") return [hit(event.agent, "ransom", render("weaver/hit-ransom", { payers: event.payers.join(", "), agent: event.agent }))];
		if (event.type === "exiled") {
			return this.alliesOf(event.agent).map((ally) =>
				hit(ally, "ally_exiled", render(event.by === "seal" ? "weaver/hit-ally-seal" : event.by === "holdout" ? "weaver/hit-ally-holdout" : "weaver/hit-ally-exiled", { ally, agent: event.agent })),
			);
		}
		if (event.type === "ultimatum_resolved") {
			return event.paid.map((entry) => hit(entry.agent, "ultimatum", render("weaver/hit-ultimatum", { agent: entry.agent, number: event.number, points: entry.points })));
		}
		if (event.type === "piece_kept" && event.cause === "ultimatum") {
			return [hit(event.agent, "seized", render("weaver/hit-seized", { agent: event.agent, needers: event.needers.join(", ") }))];
		}
		return [];
	}
}

function sourceText(source: Extract<RecordedEvent, { type: "interpretation" }>["source"]): string {
	switch (source) {
		case "dm":
			return text("weaver/source-dm");
		case "board":
			return text("weaver/source-board");
		case "group":
			return text("weaver/source-group");
		case "cast":
			return text("weaver/source-cast");
		case "thought":
		case "aside":
			return text("weaver/source-private");
		default:
			return assertNever(source, "statement source");
	}
}
