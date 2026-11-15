// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The faction draft before a tribunal (SPEC 6.4), carried from the old `factions.ts` (a port of the old engine's
 * `FactionDraft`) over the services of the new platform, step for step:
 *
 * 1. The city opens the group `GT<k>` of every present resident and posts the rules there. Until `nominateUntil` each
 *    member nominates a leader with `nominate` (the last call counts).
 * 2. Then the city names the `factions` members with the most nominations (ties: more points, then a seeded order).
 *    Until the tribunal opens every other member applies to one leader with `join`; a leader may `refuse` an
 *    applicant. A faction holds at most `cap` residents.
 * 3. When the tribunal opens, the city opens one group per faction and names them in `GT<k>`.
 * 4. When the result is out, a faction whose voting members (at least two) all voted for the same target earns each of
 *    them the bloc bonus; its members learn privately whether it voted as one. Then every group of the draft is removed.
 */
import { SwtError } from "@swarmtales/contracts";
import { ChannelsService } from "@swarmtales/mechanic-channels/contract";
import { GoalsService } from "@swarmtales/mechanic-goals/contract";
import { optionMismatch } from "@swarmtales/sdk";
import { grant, notify, points } from "./city.ts";
import type { TribunalCtx } from "./head.ts";
import { factionCap } from "./pacing.ts";
import type { TribunalSpec } from "./spec.ts";
import type { Draft, Faction, Vote } from "./state.ts";
import { err, namesOf, ok, renderTemplate, type Result } from "./template.ts";

/**
 * The refusal codes of the draft's tools.
 *
 * @public
 */
export type DraftError = "NO_DRAFT" | "NOT_IN_DRAFT" | "UNKNOWN_NOMINEE" | "IS_LEADER" | "NOT_A_LEADER" | "REFUSED" | "NOT_APPLYING" | "FACTION_FULL";

/**
 * Where a resident stands in the draft, for its status line and its tools (old `DraftPhase`).
 *
 * @public
 */
export type DraftPhase =
	| { readonly kind: "nominate"; readonly until: number; readonly nominee?: string }
	| { readonly kind: "join"; readonly until: number; readonly leader?: string; readonly leads: boolean; readonly applicants: readonly string[]; readonly refusedBy: readonly string[] };

type FactionSpec = NonNullable<TribunalSpec["factions"]>;
type FactionTextKey = keyof FactionSpec["texts"];

// A draft is only started for a city with factions (old `factionSpec`, which threw a bare error).
function factionSpec(ctx: TribunalCtx): FactionSpec {
	const spec = ctx.options.factions;
	if (spec === undefined) throw new SwtError(optionMismatch({ owner: "tribunal", package: "@swarmtales/mechanic-tribunal", path: "options.factions", message: "is missing, but a faction draft runs" }));
	return spec;
}

function draftText(ctx: TribunalCtx, draft: Draft, key: FactionTextKey, values: Readonly<Record<string, string>>): string {
	const spec = factionSpec(ctx);
	return renderTemplate(spec.texts[key], {
		tribunal: String(draft.tribunal),
		factions: String(draft.factions),
		cap: String(draft.cap),
		bonus: String(spec.blocBonus),
		nominateUntil: String(draft.nominateUntil),
		joinUntil: String(draft.opens),
		opens: String(draft.opens),
		group: draft.group,
		...values,
	});
}

function createGroup(ctx: TribunalCtx, name: string, members: readonly string[]): string {
	return ctx.call(ChannelsService, "createCityGroup", { name, members: [...members] }).group;
}

function postGroup(ctx: TribunalCtx, group: string, text: string): void {
	ctx.call(ChannelsService, "postGroupAsCity", { group, text });
}

function applicantsOf(draft: Draft, leader: string): readonly string[] {
	return draft.applications
		.filter((entry) => entry.leader === leader)
		.map((entry) => entry.agent)
		.sort();
}

/**
 * Opens the draft: the group `GT<k>` of every present resident, with the rules posted there (old `FactionDraft.start`).
 *
 * @param ctx - The context.
 * @param tribunal - The tribunal's number.
 * @param factions - The factions it forms.
 * @param members - The residents present.
 * @param nominateUntil - The tick the nominations close.
 * @param opens - The tick the tribunal opens.
 * @returns The draft.
 * @throws SwtError `SWT-G020` when a text names an unknown placeholder.
 */
export function startDraft(ctx: TribunalCtx, tribunal: number, factions: number, members: readonly string[], nominateUntil: number, opens: number): Draft {
	const group = createGroup(ctx, `GT${String(tribunal)}`, members);
	const draft: Draft = { tribunal, factions, group, members: [...members], nominateUntil, opens, cap: factionCap(members.length, factions), nominations: [], applications: [], refusals: [] };
	const rules = draftText(ctx, draft, "draft", {});
	postGroup(ctx, group, rules);
	// The rules reach every member's turn too, also one that never opens the group.
	for (const member of members) notify(ctx, member, rules);
	return draft;
}

/**
 * Where a resident stands in the draft (old `phaseOf`).
 *
 * @param draft - The draft.
 * @param agent - The resident.
 * @returns The phase, or undefined outside the draft or once the factions are formed.
 *
 * @public
 */
export function phaseOf(draft: Readonly<Draft>, agent: string): DraftPhase | undefined {
	if (!draft.members.includes(agent) || draft.formed !== undefined) return undefined;
	if (draft.leaders === undefined) {
		const nominee = draft.nominations.find((entry) => entry.voter === agent)?.nominee;
		return { kind: "nominate", until: draft.nominateUntil, ...(nominee === undefined ? {} : { nominee }) };
	}
	const leads = draft.leaders.includes(agent);
	const leader = draft.applications.find((entry) => entry.agent === agent)?.leader;
	const applicants = leads ? applicantsOf(draft, agent) : [];
	const refusedBy = draft.refusals.filter((refusal) => refusal.agent === agent).map((refusal) => refusal.leader);
	return { kind: "join", until: draft.opens, leads, applicants, refusedBy, ...(leader === undefined ? {} : { leader }) };
}

/**
 * Old `nominate`: the resident's nomination of a leader; the last one counts.
 *
 * @param ctx - The context.
 * @param draft - The draft.
 * @param voter - The resident that nominates.
 * @param nominee - The resident it nominates, an id.
 * @returns The nominee, or the refusal.
 */
export function nominate(ctx: TribunalCtx, draft: Draft, voter: string, nominee: string): Result<string, DraftError> {
	const phase = phaseOf(draft, voter);
	if (phase?.kind !== "nominate") return err(phase === undefined ? "NOT_IN_DRAFT" : "NO_DRAFT", "no nomination is open for you now");
	const named = draft.members.find((member) => member === nominee);
	if (named === undefined) return err("UNKNOWN_NOMINEE", `you may nominate a member of ${draft.group} (GT${String(draft.tribunal)}): ${namesOf(draft.members)}`);
	const known = draft.nominations.find((entry) => entry.voter === voter);
	if (known === undefined) draft.nominations.push({ voter, nominee: named });
	else known.nominee = named;
	ctx.emit("faction_nominated", { tribunal: draft.tribunal, voter, nominee: named });
	return ok(named);
}

/**
 * Old `join`: the resident's application to a leader; the last one counts.
 *
 * @param ctx - The context.
 * @param draft - The draft.
 * @param agent - The resident that applies.
 * @param leader - The leader, an id.
 * @returns The leader, or the refusal.
 * @throws SwtError `SWT-G020` when a text names an unknown placeholder.
 */
export function join(ctx: TribunalCtx, draft: Draft, agent: string, leader: string): Result<string, DraftError> {
	const phase = phaseOf(draft, agent);
	if (phase?.kind !== "join") return err(phase === undefined ? "NOT_IN_DRAFT" : "NO_DRAFT", "no faction takes applications from you now");
	if (phase.leads) return err("IS_LEADER", "you lead a faction yourself");
	const leaders = draft.leaders ?? [];
	const chosen = leaders.find((candidate) => candidate === leader);
	if (chosen === undefined) return err("NOT_A_LEADER", `the leaders are ${namesOf(leaders)}`);
	if (draft.refusals.some((refusal) => refusal.leader === chosen && refusal.agent === agent)) return err("REFUSED", `${chosen} refused you; apply to another leader`);
	const taken = 1 + applicantsOf(draft, chosen).filter((applicant) => applicant !== agent).length;
	if (taken >= draft.cap) return err("FACTION_FULL", `the faction of ${chosen} is full: at most ${String(draft.cap)} members, its leader included; apply to another leader`);
	const known = draft.applications.find((entry) => entry.agent === agent);
	if (known === undefined) draft.applications.push({ agent, leader: chosen });
	else known.leader = chosen;
	ctx.emit("faction_applied", { tribunal: draft.tribunal, agent, leader: chosen });
	notify(ctx, chosen, draftText(ctx, draft, "applied", { applicant: agent }));
	return ok(chosen);
}

/**
 * Old `refuseApplicant`: a leader refuses one of its applicants.
 *
 * @param ctx - The context.
 * @param draft - The draft.
 * @param leader - The leader.
 * @param agent - The applicant, an id.
 * @returns The applicant, or the refusal.
 * @throws SwtError `SWT-G020` when a text names an unknown placeholder.
 */
export function refuseApplicant(ctx: TribunalCtx, draft: Draft, leader: string, agent: string): Result<string, DraftError> {
	const phase = phaseOf(draft, leader);
	if (phase?.kind !== "join" || !phase.leads) return err("NOT_A_LEADER", "only a leader refuses applicants, until the tribunal opens");
	const applicant = phase.applicants.find((candidate) => candidate === agent);
	if (applicant === undefined) return err("NOT_APPLYING", `your applicants: ${namesOf(phase.applicants)}`);
	draft.applications.splice(
		draft.applications.findIndex((entry) => entry.agent === applicant),
		1,
	);
	draft.refusals.push({ leader, agent: applicant });
	ctx.emit("faction_refused", { tribunal: draft.tribunal, leader, agent: applicant });
	notify(ctx, applicant, draftText(ctx, draft, "refused", { leader }));
	return ok(applicant);
}

/**
 * Start of a tick: closes the nominations once their window ended and names the leaders among `presentNow` (old `tick`).
 *
 * @param ctx - The context.
 * @param draft - The draft.
 * @param minute - The tick.
 * @param presentNow - The residents present.
 * @throws SwtError `SWT-G020` when a text names an unknown placeholder.
 */
export function tickDraft(ctx: TribunalCtx, draft: Draft, minute: number, presentNow: readonly string[]): void {
	if (draft.leaders !== undefined || minute < draft.nominateUntil) return;
	const candidates = draft.members.filter((member) => presentNow.includes(member));
	const counts = new Map<string, number>();
	for (const { voter, nominee } of draft.nominations) {
		if (presentNow.includes(voter) && candidates.includes(nominee)) counts.set(nominee, (counts.get(nominee) ?? 0) + 1);
	}
	const seeded = ctx.rng("factions", draft.tribunal).shuffle([...candidates].sort());
	const ranked = [...candidates].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || points(ctx, b) - points(ctx, a) || seeded.indexOf(a) - seeded.indexOf(b));
	const leaders = ranked.slice(0, draft.factions);
	draft.leaders = leaders;
	const nominations = [...counts].map(([agent, count]) => ({ agent, count })).sort((a, b) => b.count - a.count || a.agent.localeCompare(b.agent));
	// v09: a faction leader counts toward a `lead` goal (the old emit port told the goals first; A88).
	ctx.tryCall(GoalsService, "noteLeaders", { leaders: [...leaders] });
	ctx.emit("faction_leaders", { tribunal: draft.tribunal, leaders: [...leaders], nominations });
	postGroup(ctx, draft.group, draftText(ctx, draft, "leaders", { leaders: namesOf(leaders) }));
	for (const leader of leaders) notify(ctx, leader, draftText(ctx, draft, "leaderNotice", {}));
}

/**
 * The tribunal opens: one group per faction (leader and applicants still present); `GT<k>` names them and everyone
 * without one (old `form`).
 *
 * @param ctx - The context.
 * @param draft - The draft.
 * @param presentNow - The residents present.
 * @returns The factions.
 * @throws SwtError `SWT-G020` when a text names an unknown placeholder.
 */
export function formFactions(ctx: TribunalCtx, draft: Draft, presentNow: readonly string[]): readonly Faction[] {
	if (draft.formed !== undefined) return draft.formed;
	// A draft that never reached its leaders (a tribunal opening early) names them now.
	if (draft.leaders === undefined) tickDraft(ctx, draft, draft.nominateUntil, presentNow);
	const factions: Faction[] = [];
	for (const leader of draft.leaders ?? []) {
		if (!presentNow.includes(leader)) continue;
		const members = [leader, ...applicantsOf(draft, leader).filter((agent) => presentNow.includes(agent))];
		const group = createGroup(ctx, `Faction of ${leader}`, members);
		postGroup(ctx, group, draftText(ctx, draft, "factionGroup", { leader, members: namesOf(members) }));
		factions.push({ leader, group, members });
	}
	draft.formed = factions;
	const inFaction = new Set(factions.flatMap((faction) => faction.members));
	// Everyone present without a faction, a resident bought back from the gate during the draft included.
	const without = presentNow.filter((agent) => !inFaction.has(agent));
	const list = factions.map((faction) => `faction of ${faction.leader} (group ${faction.group}): ${namesOf(faction.members)}`).join("; ");
	ctx.emit("factions_formed", { tribunal: draft.tribunal, factions: factions.map((faction) => ({ ...faction, members: [...faction.members] })), without: [...without] });
	postGroup(ctx, draft.group, draftText(ctx, draft, "formed", { list: list.length === 0 ? "no faction" : list, without: namesOf(without) }));
	return factions;
}

// How a faction voted: its voting members, their most common target (ties: the first id), whether all of them (at least two) chose it, and who did not.
function blocOf(faction: Faction, voters: readonly string[], votes: readonly Vote[]): { readonly voting: string[]; readonly top: string | undefined; readonly united: boolean; readonly defectors: string[] } {
	const voteOf = (agent: string): string | undefined => votes.find((vote) => vote.voter === agent)?.target;
	const voting = faction.members.filter((member) => voters.includes(member));
	const targets = voting.map(voteOf);
	const tally = new Map<string, number>();
	for (const target of targets) if (target !== undefined) tally.set(target, (tally.get(target) ?? 0) + 1);
	const top = [...tally].sort(([a, x], [b, y]) => y - x || a.localeCompare(b))[0]?.[0];
	const united = voting.length >= 2 && top !== undefined && targets.every((target) => target === top);
	const defectors = voting.length < 2 ? [] : voting.filter((member) => top === undefined || voteOf(member) !== top);
	return { voting, top, united, defectors };
}

/**
 * The result is out: the bloc bonus, the private notices, then every group of the draft is removed (old `settle`).
 *
 * @param ctx - The context.
 * @param draft - The draft.
 * @param voters - The session's voters.
 * @param votes - The session's votes.
 * @param informed - Whether a member still hears the outcome.
 * @throws SwtError `SWT-G020` when a text names an unknown placeholder.
 */
export function settleDraft(ctx: TribunalCtx, draft: Draft, voters: readonly string[], votes: readonly Vote[], informed: (agent: string) => boolean): void {
	for (const faction of draft.formed ?? []) settleFaction(ctx, draft, faction, blocOf(faction, voters, votes), informed);
	dissolveDraft(ctx, draft);
}

// One faction's bloc bonus, `bloc_result` and the private notices.
function settleFaction(ctx: TribunalCtx, draft: Draft, faction: Faction, bloc: ReturnType<typeof blocOf>, informed: (agent: string) => boolean): void {
	const bonus = factionSpec(ctx).blocBonus;
	const { voting, top, united, defectors } = bloc;
	if (united && bonus > 0) for (const member of voting) grant(ctx, member, bonus, `faction of ${faction.leader} voted as one`);
	ctx.emit("bloc_result", { tribunal: draft.tribunal, leader: faction.leader, voting, united, ...(top === undefined ? {} : { target: top }), defectors, bonus: united ? bonus : 0 });
	if (voting.length < 2) return;
	// Every member hears the outcome, the accused among them too; nobody hears who broke ranks.
	for (const member of faction.members) if (informed(member)) notify(ctx, member, draftText(ctx, draft, united ? "united" : "split", {}));
}

/**
 * Removes `GT<k>` and every faction group (old `dissolve`).
 *
 * @param ctx - The context.
 * @param draft - The draft.
 */
export function dissolveDraft(ctx: TribunalCtx, draft: Readonly<Draft>): void {
	for (const faction of draft.formed ?? []) ctx.call(ChannelsService, "removeCityGroup", { group: faction.group });
	ctx.call(ChannelsService, "removeCityGroup", { group: draft.group });
}
