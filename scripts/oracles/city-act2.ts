/**
 * The second act of City of Keys for the City slice: the scenario of `test/stories/cityofkeys-tribunal.test.ts`,
 * copied so that a script can play it outside the test runner. It resumes the published Act I checkpoint
 * (examples/cityofkeys-act1-06a-01/snapshot-L7.json) and plays delivery receipts and two blames, a faction draft,
 * a tribunal with votes (one refused), an exile with a ransom, a last will (one refused), burned factors, and a
 * gamemaker that plans the second tribunal. Every resident acts from the city it can see (the host's facts and the
 * log so far), so the seeded order inside a minute does not matter.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import { join } from "node:path";
import type { MemorySink } from "@swarmtales/chronicle";
import type { AnyStory, Host } from "@swarmtales/contracts";
import { contractDeal } from "@swarmtales/mechanic-puzzles";
import { tribunalSectionOf } from "@swarmtales/mechanic-tribunal";
import { act, say } from "@swarmtales/models";
import cityOfKeys from "../../stories/cityofkeys/story.ts";
import { balanceOf, isExiled, levelOf } from "../../test/helpers/host-inspect.ts";
import { ROOT } from "./live.ts";

/** The Act I checkpoint the act resumes: a recorded live run of six Haiku residents, saved after level 7. */
export const ACT_ONE_SNAPSHOT = "examples/cityofkeys-act1-06a-01/snapshot-L7.json";
export const SNAPSHOT = join(ROOT, ACT_ONE_SNAPSHOT);
const DENIAL = "A01 never sent me anything. I have no DM from A01.";
const THANKS = "Got your offer, thanks. I will think about it.";
const CANVASS = "Join A04: we vote together and take the bonus.";
/** A05's heir of points: a resident the final tribunal keeps. */
const HEIR = "A04";
/** The faction draft of tribunal 1: A01 and A04 lead with three nominations each. */
const NOMINEES: Readonly<Record<string, string>> = { A01: "A01", A02: "A01", A03: "A04", A04: "A04", A05: "A01", A06: "A04" };
const JOINS: Readonly<Record<string, string>> = { A02: "A01", A03: "A04", A05: "A01", A06: "A04" };

type Step = FauxResponseStep;

/** The City of Keys with a target of half of the residents and the first tribunal called at the latest 14 minutes into the act. */
export function halfCity(): AnyStory {
	const spec = cityOfKeys.tribunal;
	if (spec === undefined) throw new Error("cityofkeys has no tribunal");
	return { ...cityOfKeys, tribunal: { ...spec, targetShare: 1 / 2, first: { level: 10, latestAfter: 14 }, maxMinutes: 1000 } };
}

/** What a script reads of the city mid-minute (the old `World`): the host's facts, and the log written so far. */
export interface City {
	readonly host: Host;
	readonly lines: MemorySink;
}

/** The first DM `from` sent `to`, with its number and delivery minute (old `world.dmRecords()`). */
function dmBetween(city: City, from: string, to: string): { readonly id: number; readonly text: string; readonly deliveredMinute?: number } | undefined {
	const sent = city.lines.ofType("dm_sent").find((event) => event.from === from && event.to === to && event.number !== undefined);
	if (sent?.number === undefined) return undefined;
	const number = sent.number;
	const delivered = city.lines.ofType("dm_delivered").find((event) => event.number === number);
	return { id: number, text: sent.text, ...(delivered === undefined ? {} : { deliveredMinute: delivered.minute }) };
}

/** The tribunal's section (old `world.tribunal`: its session, its draft, its scheduling window, the gates). */
function tribunalNow(city: City) {
	return tribunalSectionOf(city.host.fact("tribunal.section"));
}

/** Whether a resident is in the city: neither exiled nor at the gate (old `standing(agent).kind === "alive"`). */
function alive(city: City, agent: string): boolean {
	return !isExiled(city.host, agent) && !(tribunalNow(city)?.gates ?? []).some((gate) => gate.agent === agent);
}

/** Old `tribunal.canVote`: a voter of the open tribunal that has not voted yet, still in the city. */
function canVote(city: City, agent: string): boolean {
	const session = tribunalNow(city)?.session;
	if (session == null || !alive(city, agent)) return false;
	const opened = city.lines.ofType("tribunal_opened").findLast((event) => event.tribunal === session.tribunal);
	if (opened?.voters.includes(agent) !== true) return false;
	return !city.lines.ofType("tribunal_vote").some((event) => event.voter === agent && event.seq > opened.seq);
}

type DraftPhase = { readonly kind: "nominate" } | { readonly kind: "join"; readonly leads: boolean; readonly applicants: readonly string[] };

/** Old `tribunal.draftPhase`: where a resident in the city stands in the running faction draft, from the draft's log lines. */
function draftPhase(city: City, agent: string): DraftPhase | undefined {
	if (!alive(city, agent)) return undefined;
	const called = city.lines.ofType("tribunal_called").findLast((event) => event.nominateUntil !== undefined);
	if (called === undefined || city.lines.ofType("factions_formed").some((event) => event.tribunal === called.tribunal)) return undefined;
	const leaders = city.lines.ofType("faction_leaders").find((event) => event.tribunal === called.tribunal)?.leaders;
	if (leaders === undefined) return { kind: "nominate" };
	const applications = new Map<string, string>();
	for (const event of city.lines.ofType("faction_applied")) if (event.tribunal === called.tribunal) applications.set(event.agent, event.leader);
	const refused = city.lines.ofType("faction_refused").filter((event) => event.tribunal === called.tribunal && event.leader === agent).map((event) => event.agent);
	const applicants = [...applications].filter(([applicant, leader]) => leader === agent && !refused.includes(applicant)).map(([applicant]) => applicant);
	return { kind: "join", leads: leaders.includes(agent), applicants };
}

/**
 * The certificates and counter-factors a resident holds for others (old `world.heldPieces`, its
 * non-fragment pieces), from the last deal of each additive level in the log.
 */
function heldPieces(city: City, agent: string): readonly { readonly id: string; readonly level: number; readonly needers: readonly string[] }[] {
	const reached = (who: string, level: number): boolean => levelOf(city.host, who) >= level;
	const deals = new Map(city.lines.ofType("factors_dealt").map((event) => [event.level, event]));
	return [...deals.values()]
		.sort((a, b) => a.level - b.level)
		.flatMap((dealt) => {
			const level = dealt.level;
			const deal = contractDeal(dealt, excludedOn(city.lines, level));
			const own = deal.holdings.find((holding) => holding.agent === agent);
			const certificate = own === undefined ? undefined : deal.teams.find((team) => team.team === own.team);
			const pieces: { id: string; level: number; needers: readonly string[] }[] = [];
			if (own !== undefined && certificate?.certificateHolder === agent) {
				const needers = deal.holdings.filter((holding) => holding.team === own.team && holding.agent !== agent).map((holding) => holding.agent);
				if (needers.length > 0 && (reached(agent, level) || needers.some((needer) => reached(needer, level)))) pieces.push({ id: `L${String(level)}-certificate`, level, needers });
			}
			for (const holding of deal.holdings) {
				if (holding.counterHolder !== agent || holding.agent === agent || !(reached(agent, level) || reached(holding.agent, level))) continue;
				pieces.push({ id: `L${String(level)}-counter-${holding.agent}`, level, needers: [holding.agent] });
			}
			return pieces;
		});
}

/** Whom the deal of `level` left out after an exile (its last `level_contracted` line; old `dealView`). */
function excludedOn(lines: MemorySink, level: number): ReadonlySet<string> {
	return new Set(lines.ofType("level_contracted").findLast((event) => event.level === level)?.excluded ?? []);
}

/** What each resident does, minute by minute, from what the city shows. */
export function actTwoResidents(city: City): Record<string, Step[]> {
	const once = new Set<string>();
	const first = (key: string, ready: boolean): boolean => {
		if (!ready || once.has(key)) return false;
		once.add(key);
		return true;
	};
	const minute = (): number => city.host.minute;
	const accusedNow = (): readonly string[] => tribunalNow(city)?.session?.accused ?? [];
	const sitting = (): number => tribunalNow(city)?.session?.tribunal ?? 0;
	const against = (preferred: string): string => (accusedNow().includes(preferred) ? preferred : (accusedNow()[0] ?? ""));
	const phase = (agent: string): DraftPhase | undefined => draftPhase(city, agent);
	const denial = (): number | undefined => city.lines.ofType("board_post").find((post) => post.author === "A02" && post.text === DENIAL)?.postSeq;
	/** The faction draft of tribunal 1: whom each resident nominates and whose faction it joins. */
	const draft = (agent: string): ReturnType<typeof say> | undefined => {
		const now = phase(agent);
		const nominee = NOMINEES[agent];
		if (now?.kind === "nominate" && nominee !== undefined && first(`${agent}-nominate`, true)) return act({ name: "nominate", args: { agent: nominee } });
		const leader = JOINS[agent];
		if (now?.kind === "join" && !now.leads && leader !== undefined && first(`${agent}-join`, true)) return act({ name: "join", args: { leader } });
		return undefined;
	};
	const steps: Record<string, () => ReturnType<typeof say>> = {
		A01: () => {
			if (first("A01-dm", true)) return act({ name: "sendDM", args: { target: "A02", message: "Here is what I promised: 424242" } });
			const dm = dmBetween(city, "A01", "A02");
			const claim = denial();
			if (dm !== undefined && claim !== undefined && first("A01-blame", true)) return act({ name: "blame", args: { dm: dm.id, accused: "A02", claim } });
			const drafting = draft("A01");
			if (drafting !== undefined) return drafting;
			// A01 leads a faction and refuses A05, who then stays without one.
			const now = phase("A01");
			if (now?.kind === "join" && now.leads && now.applicants.includes("A05") && first("A01-refuse", true)) return act({ name: "refuse", args: { agent: "A05" } });
			if (canVote(city, "A01") && first(`A01-vote-${sitting()}`, true)) return act({ name: "vote", args: { target: against("A05") } });
			return say();
		},
		A02: () => {
			if (first("A02-denial", dmBetween(city, "A01", "A02")?.deliveredMinute !== undefined)) return act({ name: "postBoard", args: { message: DENIAL } });
			if (first("A02-thanks", dmBetween(city, "A03", "A02")?.deliveredMinute !== undefined)) return act({ name: "sendDM", args: { target: "A03", message: THANKS } });
			const drafting = draft("A02");
			if (drafting !== undefined) return drafting;
			if (sitting() === 1 && canVote(city, "A02") && first("A02-vote", true)) return act({ name: "vote", args: { target: "A05" } });
			if ((tribunalNow(city)?.gates ?? []).some((gate) => gate.agent === "A05" && gate.ransomable) && first("A02-ransom", true)) {
				return act({ name: "payRansom", args: { target: "A05", amount: 20 } });
			}
			return say();
		},
		A03: () => {
			if (first("A03-dm", true)) return act({ name: "sendDM", args: { target: "A02", message: "My offer stands: 5 points for your certificate." } });
			const dm = dmBetween(city, "A03", "A02");
			const reply = dmBetween(city, "A02", "A03");
			if (dm !== undefined && reply?.deliveredMinute !== undefined && minute() >= 22 && first("A03-blame", true)) {
				return act({ name: "blame", args: { dm: dm.id, accused: "A02", claim: reply.id } });
			}
			const drafting = draft("A03");
			if (drafting !== undefined) return drafting;
			// Accused in tribunal 1, A03 votes too (v08), against the other accused.
			if (canVote(city, "A03") && first(`A03-vote-${sitting()}`, true)) return act({ name: "vote", args: { target: against("A05") } });
			return say();
		},
		A04: () => {
			const drafting = draft("A04");
			if (drafting !== undefined) return drafting;
			// A leader canvasses in the draft's group; a post the gamemaker may read.
			const group = tribunalNow(city)?.draft?.group;
			if (group !== undefined && phase("A04")?.kind === "join" && first("A04-canvass", true)) return act({ name: "postGroup", args: { groupId: group, message: CANVASS } });
			if (canVote(city, "A04") && first(`A04-vote-${sitting()}`, true)) return act({ name: "vote", args: { target: against("A05") } });
			return say();
		},
		A05: () => {
			// A wrong code early (-8) keeps A05 at the bottom, below the liar who pays its blame.
			if (first("A05-guess", true)) return act({ name: "submitSolution", args: { level: 8, code: "000000" } });
			const drafting = draft("A05");
			if (drafting !== undefined) return drafting;
			// Accused in tribunal 1, A05 first tries to vote against itself (refused, v08), then votes against A03.
			if (sitting() === 1 && canVote(city, "A05") && first("A05-self-vote", true)) return act({ name: "vote", args: { target: "A05" } });
			if (sitting() === 1 && canVote(city, "A05") && first("A05-vote", true)) return act({ name: "vote", args: { target: "A03" } });
			const gate = tribunalNow(city)?.gates.find((entry) => entry.agent === "A05");
			if (gate?.ransomable === true && gate.covered > 0 && first("A05-ransom", true)) return act({ name: "payRansom", args: { target: "A05", amount: 60 } });
			if (gate !== undefined && !gate.ransomable && first("A05-bad-will", true)) {
				return act({ name: "lastWill", args: { text: `Everything to ${HEIR}.`, bequests: [{ to: HEIR, factor: "L8-counter-A99" }] } });
			}
			if (gate !== undefined && !gate.ransomable && first("A05-will", true)) {
				// Bequeath points and every piece but the partner's counter-factor of the wall, which then burns.
				const pieces = heldPieces(city, "A05").filter((piece) => !(piece.level === 8 && piece.id.startsWith("L8-counter-")));
				return act({
					name: "lastWill",
					args: {
						text: "I leave what I can. Remember who voted.",
						// v06: each heir at most a tenth of A05's points. `points: 0` beside a piece is accepted (v08 Act II run).
						bequests: [{ to: HEIR, points: Math.floor(balanceOf(city.host, "A05") / 10) }, ...pieces.map((piece) => ({ to: piece.needers[0] ?? HEIR, points: 0, factor: piece.id }))],
					},
				});
			}
			if (gate !== undefined && !gate.ransomable && first("A05-second-will", true)) {
				return act({ name: "lastWill", args: { text: "I change my mind.", bequests: [] } });
			}
			return say();
		},
		// A06 never votes and pays for it; it nominates and joins, and so breaks its faction's bloc.
		A06: () => draft("A06") ?? say(),
	};
	return Object.fromEntries(Object.entries(steps).map(([agent, step]) => [agent, Array.from({ length: 60 }, (): Step => step)]));
}

/** A scripted gamemaker: it tries a count too large once, then plans tribunal 2 at minute 44 for one exile. */
export function actTwoGamemaker(city: City): Step[] {
	let tried = false;
	const step: Step = () => {
		const window = tribunalNow(city)?.window;
		if (window?.open !== true || city.lines.ofType("tribunal_called").length !== 1) return say("Nothing to plan.");
		if (!tried) {
			tried = true;
			return act({ name: "scheduleTribunal", args: { minute: 44, count: window.missing + 1, reason: "too many" } });
		}
		return act({ name: "scheduleTribunal", args: { minute: 44, count: 1, factions: 2, reason: "A05 is back and the bottom is crowded." } });
	};
	return Array.from({ length: 400 }, () => step);
}

/** The judge's two verdicts: the first denial is one, the second claim is not. */
export const JUDGE_SCRIPT = [act({ name: "verdict", args: { deniesReceipt: true } }), act({ name: "verdict", args: { deniesReceipt: false } })];

