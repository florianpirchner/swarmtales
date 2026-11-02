/**
 * What touches a resident (the weaver, `--weaver`): code, not a model, reads every event and names
 * the residents a hard fact hit, each with a plain sentence, the kind of trigger and the event's
 * `seq`. Only they go to the weaver's model; a quiet minute costs nothing. This is the old
 * `FateTriggers` (interpret/fate-triggers.ts) reading envelopes instead of the flat legacy events;
 * the triggers are the same (SPEC 10.6):
 *
 * - `blame`: the loser, branded a liar (upheld) or a false accuser (rejected);
 * - `interpretation`: the residents a classifier `accusation` label in a message names, when they
 *   could read the message (a board or cast post counts for every target, a DM only for its
 *   recipient, a group post only for those in the group when it was posted; never a thought or an
 *   aside). Without the classifier no accusation counts;
 * - `tribunal_opened`: every accused; `exile_gate`: the resident sent to the gate; `ransomed`: the
 *   one bought back;
 * - `exiled`: the allies of the exiled (or struck) resident still in the city;
 * - `ultimatum_resolved`: each holder who paid; `piece_kept` with cause `ultimatum`: the holder
 *   whose piece the city seized.
 *
 * Secret events (votes, nominations, seal bids and the seal's winner) never trigger, and no hit's
 * text names a voter. Everything it remembers is rebuilt from the events alone, so a resumed run
 * replays its prefix through {@link FateTriggers.observe} and needs nothing in the snapshot.
 */
import { Type, type Static } from "typebox";
import { Check } from "typebox/value";
import type { EventEnvelope } from "@swarmtales/contracts";

export const FATE_TRIGGER_NAMES = ["blame", "accusation", "tribunal", "gate", "ransom", "ally_exiled", "ultimatum", "seized", "act_end"] as const;
export type FateTrigger = (typeof FATE_TRIGGER_NAMES)[number];

/** A resident a hard fact touched: what happened, as a sentence, what kind of event it was, and its number. */
export const FateHitSchema = Type.Object({ agent: Type.String(), seq: Type.Integer(), text: Type.String(), trigger: Type.Enum(FATE_TRIGGER_NAMES) });
export type FateHit = Static<typeof FateHitSchema>;

/** The prompts the hits are written with (the weaver's head declares them). */
export const HIT_PROMPTS = {
	"weaver/hit-blame-upheld": ["caller", "accused", "dm", "penalty"],
	"weaver/hit-blame-rejected": ["caller", "accused", "dm", "penalty"],
	"weaver/hit-accusation": ["agent", "target", "source", "ref"],
	"weaver/hit-tribunal": ["agent", "accused"],
	"weaver/hit-gate": ["agent"],
	"weaver/hit-ransom": ["payers", "agent"],
	"weaver/hit-ally-seal": ["ally", "agent"],
	"weaver/hit-ally-holdout": ["ally", "agent"],
	"weaver/hit-ally-exiled": ["ally", "agent"],
	"weaver/hit-ultimatum": ["agent", "number", "points"],
	"weaver/hit-seized": ["agent", "needers"],
	"weaver/source-dm": [],
	"weaver/source-board": [],
	"weaver/source-group": [],
	"weaver/source-cast": [],
	"weaver/source-private": [],
} as const;

/** Renders one of the hit prompts through the host's lookup. */
export type HitRenderer = <K extends keyof typeof HIT_PROMPTS>(id: K, variables: Readonly<Record<(typeof HIT_PROMPTS)[K][number], string | number>>) => string;

const Strings = Type.Array(Type.String());
const GroupCreated = Type.Object({ group: Type.String(), founder: Type.String() });
const GroupMembership = Type.Object({ group: Type.String(), agent: Type.String(), change: Type.String() });
const GroupRemoved = Type.Object({ group: Type.String() });
const FactionsFormed = Type.Object({ factions: Type.Array(Type.Object({ leader: Type.String(), members: Strings })) });
const DmSent = Type.Object({ to: Type.String() });
const GroupPost = Type.Object({ group: Type.String() });
const Interpretation = Type.Object({ ref: Type.Integer(), agent: Type.String(), source: Type.String(), labels: Strings, targets: Strings });
const Blame = Type.Object({ caller: Type.String(), accused: Type.String(), dm: Type.Integer(), outcome: Type.String(), penalty: Type.Integer() });
const TribunalOpened = Type.Object({ accused: Strings });
const AgentOnly = Type.Object({ agent: Type.String() });
const Ransomed = Type.Object({ agent: Type.String(), payers: Strings });
const Exiled = Type.Object({ agent: Type.String(), by: Type.Optional(Type.String()) });
const UltimatumResolved = Type.Object({ number: Type.Integer(), paid: Type.Array(Type.Object({ agent: Type.String(), points: Type.Integer() })) });
const PieceKept = Type.Object({ agent: Type.String(), cause: Type.String(), needers: Strings });

const PRIVATE_SOURCES: readonly string[] = ["thought", "aside"];

export class FateTriggers {
	readonly #isCompetitor: (id: string) => boolean;
	/** Members of every group a resident founded (city groups are no alliance). */
	readonly #groups = new Map<string, Set<string>>();
	/** Members of every group, the city's too: who can read a group post. */
	readonly #members = new Map<string, Set<string>>();
	/** Who could read a message, by its `seq`: a DM's recipient, a group post's members at the time. */
	readonly #readers = new Map<number, ReadonlySet<string>>();
	/** The factions of the last tribunal's draft. */
	#factions: (readonly string[])[] = [];

	constructor(isCompetitor: (id: string) => boolean) {
		this.#isCompetitor = isCompetitor;
	}

	/** Who else shares a group or a faction with `agent`, sorted. */
	alliesOf(agent: string): readonly string[] {
		const allies = new Set<string>();
		for (const members of [...this.#groups.values(), ...this.#factions]) {
			const list = [...members];
			if (!list.includes(agent)) continue;
			for (const member of list) if (member !== agent) allies.add(member);
		}
		return [...allies].sort();
	}

	/** Keeps the alliances and readers up to date; every event passes through here, the prefix of a resumed run too. */
	observe(event: EventEnvelope): void {
		const payload = event.payload;
		if (event.type === "group_created" && Check(GroupCreated, payload)) {
			const founder = this.#isCompetitor(payload.founder) ? [payload.founder] : [];
			this.#members.set(payload.group, new Set(founder));
			if (founder.length > 0) this.#groups.set(payload.group, new Set(founder));
		} else if (event.type === "group_membership" && Check(GroupMembership, payload)) {
			for (const members of [this.#groups.get(payload.group), this.#members.get(payload.group)]) {
				if (members === undefined) continue;
				if (payload.change === "added") members.add(payload.agent);
				else members.delete(payload.agent);
			}
		} else if (event.type === "group_removed" && Check(GroupRemoved, payload)) {
			this.#groups.delete(payload.group);
			this.#members.delete(payload.group);
		} else if (event.type === "factions_formed" && Check(FactionsFormed, payload)) {
			this.#factions = payload.factions.map((faction) => [...new Set([faction.leader, ...faction.members])].sort());
		} else if (event.type === "dm_sent" && Check(DmSent, payload)) {
			this.#readers.set(event.seq, new Set([payload.to]));
		} else if (event.type === "group_post" && Check(GroupPost, payload)) {
			this.#readers.set(event.seq, new Set(this.#members.get(payload.group) ?? []));
		} else if (event.type === "interpretation" && Check(Interpretation, payload)) {
			// One interpretation per message: once it is read, its readers are no longer needed.
			this.#readers.delete(payload.ref);
		}
	}

	/** The residents `event` touched, with what happened to them. Call it before {@link observe} for the same event. */
	hitsOf(event: EventEnvelope, render: HitRenderer): readonly FateHit[] {
		const payload = event.payload;
		const hit = (agent: string, trigger: FateTrigger, text: string): FateHit => ({ agent, seq: event.seq, text, trigger });
		if (event.type === "blame" && Check(Blame, payload)) {
			return payload.outcome === "upheld"
				? [hit(payload.accused, "blame", render("weaver/hit-blame-upheld", { caller: payload.caller, accused: payload.accused, dm: payload.dm, penalty: payload.penalty }))]
				: [hit(payload.caller, "blame", render("weaver/hit-blame-rejected", { caller: payload.caller, accused: payload.accused, dm: payload.dm, penalty: payload.penalty }))];
		}
		if (event.type === "interpretation" && Check(Interpretation, payload)) {
			if (PRIVATE_SOURCES.includes(payload.source) || !payload.labels.includes("accusation")) return [];
			const readers = payload.source === "dm" || payload.source === "group" ? this.#readers.get(payload.ref) : undefined;
			const sawIt = (target: string): boolean => (payload.source === "dm" || payload.source === "group" ? readers?.has(target) === true : true);
			return payload.targets
				.filter((target) => target !== payload.agent && this.#isCompetitor(target) && sawIt(target))
				.map((target) => hit(target, "accusation", render("weaver/hit-accusation", { agent: payload.agent, target, source: sourceText(payload.source, render), ref: payload.ref })));
		}
		if (event.type === "tribunal_opened" && Check(TribunalOpened, payload)) {
			return payload.accused.map((agent) => hit(agent, "tribunal", render("weaver/hit-tribunal", { agent, accused: payload.accused.join(", ") })));
		}
		if (event.type === "exile_gate" && Check(AgentOnly, payload)) return [hit(payload.agent, "gate", render("weaver/hit-gate", { agent: payload.agent }))];
		if (event.type === "ransomed" && Check(Ransomed, payload)) return [hit(payload.agent, "ransom", render("weaver/hit-ransom", { payers: payload.payers.join(", "), agent: payload.agent }))];
		if (event.type === "exiled" && Check(Exiled, payload)) {
			const id = payload.by === "seal" ? "weaver/hit-ally-seal" : payload.by === "holdout" ? "weaver/hit-ally-holdout" : "weaver/hit-ally-exiled";
			return this.alliesOf(payload.agent).map((ally) => hit(ally, "ally_exiled", render(id, { ally, agent: payload.agent })));
		}
		if (event.type === "ultimatum_resolved" && Check(UltimatumResolved, payload)) {
			return payload.paid.map((entry) => hit(entry.agent, "ultimatum", render("weaver/hit-ultimatum", { agent: entry.agent, number: payload.number, points: entry.points })));
		}
		if (event.type === "piece_kept" && Check(PieceKept, payload) && payload.cause === "ultimatum") {
			return [hit(payload.agent, "seized", render("weaver/hit-seized", { agent: payload.agent, needers: payload.needers.join(", ") }))];
		}
		return [];
	}
}

function sourceText(source: string, render: HitRenderer): string {
	switch (source) {
		case "dm":
			return render("weaver/source-dm", {});
		case "board":
			return render("weaver/source-board", {});
		case "group":
			return render("weaver/source-group", {});
		case "cast":
			return render("weaver/source-cast", {});
		default:
			return render("weaver/source-private", {});
	}
}
