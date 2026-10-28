/**
 * The faction draft before a tribunal (SPEC 6.4). The tribunal starts one
 * when it calls a tribunal and drives it at the start of every minute:
 *
 * 1. The city opens the group `GT<k>` of every present resident and posts the
 *    rules there. Until `nominateUntil` each member nominates a leader with
 *    `nominate` (itself allowed; the last call counts).
 * 2. Then the city names the `factions` members with the most nominations
 *    (ties: more points, then a seeded order). Until the tribunal opens every
 *    other member applies to one leader with `join` (the last call counts); a
 *    leader may `refuse` an applicant, who may then apply elsewhere.
 * 3. When the tribunal opens, the city opens one group per faction and names
 *    the factions and everyone without one in `GT<k>`.
 * 4. When the result is out, a faction whose voting members (at least two)
 *    all voted for the same target earns each of them the bloc bonus. Only its
 *    members learn, privately, whether it voted as one; never who broke ranks.
 *    Then every group of the draft is removed.
 *
 * Nominations, applications and votes are in the log for the digest; the
 * game master's view never shows them.
 */
import type { CompetitorId } from "../core/ids.ts";
import { rngFor } from "../core/random.ts";
import { err, ok, type Result } from "../core/result.ts";
import { renderTemplate } from "../story/templates.ts";
import type { FactionSpec, FactionTexts } from "../story/types.ts";
import type { ArenaEvent } from "./events.ts";

export type FactionEvent = Extract<
	ArenaEvent,
	{ readonly type: "faction_nominated" | "faction_leaders" | "faction_applied" | "faction_refused" | "factions_formed" | "bloc_result" }
>;

/** What the draft reads and does in the world. */
export interface FactionPorts {
	readonly spec: FactionSpec;
	readonly seed: number;
	readonly points: (agent: CompetitorId) => number;
	/** Opens a group of the city with these members; returns its id. */
	readonly createGroup: (name: string, members: readonly CompetitorId[]) => string;
	readonly removeGroup: (group: string) => void;
	readonly postGroup: (group: string, text: string) => void;
	readonly notify: (agent: CompetitorId, text: string) => void;
	readonly grant: (agent: CompetitorId, points: number, reason: string) => void;
	readonly emit: (event: FactionEvent) => void;
}

export type DraftError = "NO_DRAFT" | "NOT_IN_DRAFT" | "UNKNOWN_NOMINEE" | "IS_LEADER" | "NOT_A_LEADER" | "REFUSED" | "NOT_APPLYING";

export interface Faction {
	readonly leader: CompetitorId;
	readonly group: string;
	readonly members: readonly CompetitorId[];
}

/** One draft as a run snapshot keeps it (SPEC 17). */
export interface DraftSnapshot {
	readonly tribunal: number;
	readonly factions: number;
	readonly group: string;
	readonly members: readonly CompetitorId[];
	readonly nominateUntil: number;
	readonly opens: number;
	readonly nominations: readonly { readonly voter: CompetitorId; readonly nominee: CompetitorId }[];
	readonly leaders?: readonly CompetitorId[];
	readonly applications: readonly { readonly agent: CompetitorId; readonly leader: CompetitorId }[];
	readonly refusals: readonly { readonly leader: CompetitorId; readonly agent: CompetitorId }[];
	readonly formed?: readonly Faction[];
}

/** Where a resident stands in the draft, for its status line. */
export type DraftPhase =
	| { readonly kind: "nominate"; readonly until: number; readonly nominee?: CompetitorId }
	| {
			readonly kind: "join";
			readonly until: number;
			readonly leader?: CompetitorId;
			readonly leads: boolean;
			readonly applicants: readonly CompetitorId[];
			/** Leaders who refused this resident; it cannot apply to them again. */
			readonly refusedBy: readonly CompetitorId[];
	  };

/** "A04", "A04 and A05", "A02, A04 and A05"; `nobody` for none. */
export function namesOf(ids: readonly string[]): string {
	if (ids.length === 0) return "nobody";
	const last = ids.at(-1) ?? "";
	return ids.length === 1 ? last : `${ids.slice(0, -1).join(", ")} and ${last}`;
}

export class FactionDraft {
	readonly #ports: FactionPorts;
	readonly tribunal: number;
	readonly factions: number;
	readonly group: string;
	readonly members: readonly CompetitorId[];
	readonly nominateUntil: number;
	readonly opens: number;
	readonly #nominations = new Map<CompetitorId, CompetitorId>();
	#leaders: readonly CompetitorId[] | undefined;
	readonly #applications = new Map<CompetitorId, CompetitorId>();
	readonly #refusals: { readonly leader: CompetitorId; readonly agent: CompetitorId }[] = [];
	#formed: readonly Faction[] | undefined;

	private constructor(ports: FactionPorts, state: Omit<DraftSnapshot, "nominations" | "applications" | "refusals">) {
		this.#ports = ports;
		this.tribunal = state.tribunal;
		this.factions = state.factions;
		this.group = state.group;
		this.members = [...state.members];
		this.nominateUntil = state.nominateUntil;
		this.opens = state.opens;
		this.#leaders = state.leaders;
		this.#formed = state.formed;
	}

	/** Opens the draft: the group `GT<k>` of every present resident, with the rules posted there. */
	static start(ports: FactionPorts, tribunal: number, factions: number, members: readonly CompetitorId[], nominateUntil: number, opens: number): FactionDraft {
		const group = ports.createGroup(`GT${tribunal}`, members);
		const draft = new FactionDraft(ports, { tribunal, factions, group, members, nominateUntil, opens });
		const rules = draft.#text("draft", {});
		ports.postGroup(group, rules);
		// The rules reach every member's turn too, also one that never opens the group.
		for (const member of members) ports.notify(member, rules);
		return draft;
	}

	static restore(ports: FactionPorts, state: DraftSnapshot): FactionDraft {
		const draft = new FactionDraft(ports, state);
		for (const entry of state.nominations) draft.#nominations.set(entry.voter, entry.nominee);
		for (const entry of state.applications) draft.#applications.set(entry.agent, entry.leader);
		draft.#refusals.push(...state.refusals);
		return draft;
	}

	get leaders(): readonly CompetitorId[] {
		return this.#leaders ?? [];
	}

	/** The factions since the tribunal opened; empty before. */
	get formed(): readonly Faction[] {
		return this.#formed ?? [];
	}

	/** What `agent` may do in the draft now, if anything; `undefined` once the factions are formed. */
	phaseOf(agent: CompetitorId): DraftPhase | undefined {
		if (!this.members.includes(agent) || this.#formed !== undefined) return undefined;
		if (this.#leaders === undefined) {
			const nominee = this.#nominations.get(agent);
			return { kind: "nominate", until: this.nominateUntil, ...(nominee === undefined ? {} : { nominee }) };
		}
		const leads = this.#leaders.includes(agent);
		const leader = this.#applications.get(agent);
		const applicants = leads ? this.#applicantsOf(agent) : [];
		const refusedBy = this.#refusals.filter((refusal) => refusal.agent === agent).map((refusal) => refusal.leader);
		return { kind: "join", until: this.opens, leads, applicants, refusedBy, ...(leader === undefined ? {} : { leader }) };
	}

	nominate(voter: CompetitorId, nominee: string): Result<CompetitorId, DraftError> {
		const phase = this.phaseOf(voter);
		if (phase?.kind !== "nominate") return err(phase === undefined ? "NOT_IN_DRAFT" : "NO_DRAFT", "no nomination is open for you now");
		const named = this.members.find((member) => member === nominee);
		if (named === undefined) return err("UNKNOWN_NOMINEE", `you may nominate a member of ${this.group} (GT${this.tribunal}): ${namesOf(this.members)}`);
		this.#nominations.set(voter, named);
		this.#ports.emit({ type: "faction_nominated", tribunal: this.tribunal, voter, nominee: named });
		return ok(named);
	}

	join(agent: CompetitorId, leader: string): Result<CompetitorId, DraftError> {
		const phase = this.phaseOf(agent);
		if (phase?.kind !== "join") return err(phase === undefined ? "NOT_IN_DRAFT" : "NO_DRAFT", "no faction takes applications from you now");
		if (phase.leads) return err("IS_LEADER", "you lead a faction yourself");
		const chosen = this.leaders.find((candidate) => candidate === leader);
		if (chosen === undefined) return err("NOT_A_LEADER", `the leaders are ${namesOf(this.leaders)}`);
		if (this.#refusals.some((refusal) => refusal.leader === chosen && refusal.agent === agent)) return err("REFUSED", `${chosen} refused you; apply to another leader`);
		this.#applications.set(agent, chosen);
		this.#ports.emit({ type: "faction_applied", tribunal: this.tribunal, agent, leader: chosen });
		this.#ports.notify(chosen, this.#text("applied", { applicant: agent }));
		return ok(chosen);
	}

	refuse(leader: CompetitorId, agent: string): Result<CompetitorId, DraftError> {
		const phase = this.phaseOf(leader);
		if (phase?.kind !== "join" || !phase.leads) return err("NOT_A_LEADER", "only a leader refuses applicants, until the tribunal opens");
		const applicant = phase.applicants.find((candidate) => candidate === agent);
		if (applicant === undefined) return err("NOT_APPLYING", `your applicants: ${namesOf(phase.applicants)}`);
		this.#applications.delete(applicant);
		this.#refusals.push({ leader, agent: applicant });
		this.#ports.emit({ type: "faction_refused", tribunal: this.tribunal, leader, agent: applicant });
		this.#ports.notify(applicant, this.#text("refused", { leader }));
		return ok(applicant);
	}

	/** Start of a minute: closes the nominations once their window ended and names the leaders among `present`. */
	tick(minute: number, present: readonly CompetitorId[]): void {
		if (this.#leaders !== undefined || minute < this.nominateUntil) return;
		const candidates = this.members.filter((member) => present.includes(member));
		const counts = new Map<CompetitorId, number>();
		for (const [voter, nominee] of this.#nominations) {
			if (present.includes(voter) && candidates.includes(nominee)) counts.set(nominee, (counts.get(nominee) ?? 0) + 1);
		}
		const seeded = rngFor(this.#ports.seed, "factions", this.tribunal).shuffle([...candidates].sort());
		const ranked = [...candidates].sort(
			(a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || this.#ports.points(b) - this.#ports.points(a) || seeded.indexOf(a) - seeded.indexOf(b),
		);
		const leaders = ranked.slice(0, this.factions);
		this.#leaders = leaders;
		const nominations = [...counts].map(([agent, count]) => ({ agent, count })).sort((a, b) => b.count - a.count || a.agent.localeCompare(b.agent));
		this.#ports.emit({ type: "faction_leaders", tribunal: this.tribunal, leaders, nominations });
		this.#ports.postGroup(this.group, this.#text("leaders", { leaders: namesOf(leaders) }));
		for (const leader of leaders) this.#ports.notify(leader, this.#text("leaderNotice", {}));
	}

	/** The tribunal opens: one group per faction (leader and applicants still present); `GT<k>` names them and everyone without one. */
	form(present: readonly CompetitorId[]): readonly Faction[] {
		if (this.#formed !== undefined) return this.#formed;
		// A draft that never reached its leaders (a tribunal opening early) names them now.
		if (this.#leaders === undefined) this.tick(this.nominateUntil, present);
		const factions: Faction[] = [];
		for (const leader of this.leaders) {
			if (!present.includes(leader)) continue;
			const members = [leader, ...this.#applicantsOf(leader).filter((agent) => present.includes(agent))];
			const group = this.#ports.createGroup(`Faction of ${leader}`, members);
			this.#ports.postGroup(group, this.#text("factionGroup", { leader, members: namesOf(members) }));
			factions.push({ leader, group, members });
		}
		this.#formed = factions;
		const inFaction = new Set(factions.flatMap((faction) => faction.members));
		// Everyone present without a faction, a resident bought back from the gate during the draft included.
		const without = present.filter((agent) => !inFaction.has(agent));
		const list = factions.map((faction) => `faction of ${faction.leader} (group ${faction.group}): ${namesOf(faction.members)}`).join("; ");
		this.#ports.emit({ type: "factions_formed", tribunal: this.tribunal, factions, without });
		this.#ports.postGroup(this.group, this.#text("formed", { list: list.length === 0 ? "no faction" : list, without: namesOf(without) }));
		return factions;
	}

	/**
	 * The result is out: the bloc bonus for every faction whose voting members
	 * (at least two of the tribunal's voters) all voted for the same target,
	 * a private notice to the members of every faction with at least two
	 * voting members, then every group of the draft is removed.
	 */
	settle(voters: readonly CompetitorId[], votes: ReadonlyMap<CompetitorId, CompetitorId>, informed: (agent: CompetitorId) => boolean): void {
		const bonus = this.#ports.spec.blocBonus;
		for (const faction of this.formed) {
			const voting = faction.members.filter((member) => voters.includes(member));
			const targets = voting.map((member) => votes.get(member));
			const tally = new Map<CompetitorId, number>();
			for (const target of targets) if (target !== undefined) tally.set(target, (tally.get(target) ?? 0) + 1);
			const top = [...tally].sort(([a, x], [b, y]) => y - x || a.localeCompare(b))[0]?.[0];
			const united = voting.length >= 2 && top !== undefined && targets.every((target) => target === top);
			const defectors = voting.length < 2 ? [] : voting.filter((member) => top === undefined || votes.get(member) !== top);
			if (united && bonus > 0) for (const member of voting) this.#ports.grant(member, bonus, `faction of ${faction.leader} voted as one`);
			this.#ports.emit({
				type: "bloc_result",
				tribunal: this.tribunal,
				leader: faction.leader,
				voting,
				united,
				...(top === undefined ? {} : { target: top }),
				defectors,
				bonus: united ? bonus : 0,
			});
			if (voting.length < 2) continue;
			// Every member hears the outcome, the accused among them too; nobody hears who broke ranks.
			for (const member of faction.members) if (informed(member)) this.#ports.notify(member, this.#text(united ? "united" : "split", {}));
		}
		this.dissolve();
	}

	/** Removes `GT<k>` and every faction group. */
	dissolve(): void {
		for (const faction of this.formed) this.#ports.removeGroup(faction.group);
		this.#ports.removeGroup(this.group);
	}

	snapshot(): DraftSnapshot {
		return {
			tribunal: this.tribunal,
			factions: this.factions,
			group: this.group,
			members: [...this.members],
			nominateUntil: this.nominateUntil,
			opens: this.opens,
			nominations: [...this.#nominations].map(([voter, nominee]) => ({ voter, nominee })),
			...(this.#leaders === undefined ? {} : { leaders: [...this.#leaders] }),
			applications: [...this.#applications].map(([agent, leader]) => ({ agent, leader })),
			refusals: this.#refusals.map((refusal) => ({ ...refusal })),
			...(this.#formed === undefined ? {} : { formed: this.#formed.map((faction) => ({ ...faction, members: [...faction.members] })) }),
		};
	}

	#applicantsOf(leader: CompetitorId): readonly CompetitorId[] {
		return [...this.#applications].filter(([, chosen]) => chosen === leader).map(([agent]) => agent).sort();
	}

	#text(key: keyof FactionTexts, values: Readonly<Record<string, string>>): string {
		return renderTemplate(this.#ports.spec.texts[key], {
			tribunal: String(this.tribunal),
			factions: String(this.factions),
			bonus: String(this.#ports.spec.blocBonus),
			nominateUntil: String(this.nominateUntil),
			joinUntil: String(this.opens),
			opens: String(this.opens),
			group: this.group,
			...values,
		});
	}
}
