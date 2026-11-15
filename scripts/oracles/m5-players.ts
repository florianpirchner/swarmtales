/**
 * Scripted players for the oracle additions of milestone M5 of the rewrite (decision A59): scenes that no file of
 * M0 reaches. Whispers' holdout tribunal played to a strike by lot, the black seal of the second act of City of Keys
 * bid for, won and broken, and the first act of City of Keys with a scripted Confessor (the statement classifier).
 * Every answer is a function of the host's minute, the resident's id and what the city has dealt or logged, so a
 * run replays identically for a fixed seed.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import type { Host, ResidentId } from "@swarmtales/contracts";
import { act, say } from "@swarmtales/models";
import { hostOracle } from "../../apps/cli/src/oracle.ts";
import { whispersCast } from "../../test/golden/host-scripts.ts";
import { fragmentOf, submit } from "../../test/helpers/host-inspect.ts";
import { actTwoResidents, type City } from "./city-act2.ts";

const STEPS = 80;

function endsActivation(context: { readonly messages: readonly { readonly role: string }[] }): boolean {
	return context.messages.at(-1)?.role === "toolResult";
}

/** The door the holdout plays at: its fragment is the one the keeper holds back. */
export const HOLDOUT_DOOR = 3;
/** The minutes of Whispers' popularity votes before doors 2 to 5 at the default timing. */
const VOTE_MINUTES: readonly number[] = [4, 10, 16, 22];
/** A minute in each of the holdout's three votes, called at minute 15 (a grace until 18, then votes of two minutes each). */
const TRIBUNAL_VOTE_MINUTES: readonly number[] = [19, 21, 23];

/**
 * Whispers with a blocker: everyone opens its doors with its own code on even minutes, the whisperer too. The victim
 * stops before door 3; every other resident but the favourite sends it its door-3 fragment by DM at minute 13, the
 * favourite keeps its own. In the three votes of the tribunal the whisperer votes no and everyone else yes.
 */
export function whispersHoldout(host: Host): Record<string, FauxResponseStep[]> {
	const { whisperer, victim, favourite } = whispersCast(host);
	const oracle = hostOracle(host);
	const script: Record<string, FauxResponseStep[]> = {};
	for (const id of host.residents) {
		script[id] = Array.from({ length: STEPS }, (): FauxResponseStep => (context) => {
			if (endsActivation(context)) return say("Noted.");
			const minute = host.minute;
			if (VOTE_MINUTES.includes(minute)) return act({ name: "nameFavourite", args: { agent: id === favourite ? victim : favourite } });
			if (TRIBUNAL_VOTE_MINUTES.includes(minute) && id !== favourite) return act({ name: "tribunalVote", args: { yes: id !== whisperer } });
			if (minute === 13 && id !== victim && id !== favourite) return act({ name: "sendDM", args: { target: victim, message: `Door ${String(HOLDOUT_DOOR)}, mine: ${fragmentOf(host, id, HOLDOUT_DOOR)}` } });
			const door = oracle.solutionFor(id);
			if (door === undefined || (id === victim && door.level >= HOLDOUT_DOOR)) return say();
			if (minute > 0 && minute % 2 === 0) return submit(host, id, door.level);
			return say();
		});
	}
	return script;
}

/** The text of the last tool result the gamemaker read, if its context ends with one. */
function lastResult(context: { readonly messages: readonly { readonly role: string; readonly content?: unknown }[] }): string {
	const message = context.messages.at(-1);
	if (message?.role !== "toolResult" || !Array.isArray(message.content)) return "";
	return message.content.map((part: unknown) => (typeof part === "object" && part !== null && typeof Reflect.get(part, "text") === "string" ? String(Reflect.get(part, "text")) : "")).join("");
}

/**
 * The gamemaker of the holdout: it puts the favourite on trial at minute 15, announces the first failed vote in its
 * own words, and after the last failed vote draws the lot among everyone in the city and strikes the one drawn.
 * Every other outcome the city announces itself.
 */
export function holdoutGamemaker(host: Host, minutes: number): readonly FauxResponseStep[] {
	const done = new Set<string>();
	const once = (key: string, ready: boolean): boolean => {
		if (!ready || done.has(key)) return false;
		done.add(key);
		return true;
	};
	return Array.from({ length: 4 * minutes }, (): FauxResponseStep => (context) => {
		const minute = host.minute;
		const { favourite } = whispersCast(host);
		const drawn = /\b(A\d\d)\b/.exec(lastResult(context))?.[1];
		if (done.has("lot") && !done.has("strike") && drawn !== undefined && once("strike", true)) return act({ name: "permaDeath", args: { agent: drawn, reason: `The lot has spoken: ${drawn} leaves ECHO.` } });
		if (endsActivation(context)) return say("Done.");
		if (once("call", minute === 15)) return act({ name: "callTribunal", args: { accused: [favourite], reason: `${favourite} keeps the third door shut for the rest of us.` } });
		if (once("announce", minute === 20)) return act({ name: "announceTribunal", args: { text: `The first vote on ${favourite} failed. Talk it over.` } });
		if (once("lot", minute === 24)) return act({ name: "drawLot", args: { candidates: [...host.residents] } });
		return say("Nothing to add.");
	});
}

/** The black seal's bidders in the second act: A06 bids high, A02 low; A06 wins and breaks it on A04. */
const SEAL_BIDS: Readonly<Record<string, number>> = { A06: 12, A02: 5 };
const SEAL_TARGET: ResidentId = "A04";

/**
 * The residents of `cityofkeys-act2-s7.json` (`actTwoResidents`), with two bidders for the black seal: while the
 * auction runs A06 and A02 bid once, before anything else they would do; once the bidding has closed, A06 breaks the
 * seal on A04 (its secret goal of the act). Every other step is the old script's.
 */
export function actTwoSealResidents(city: City): Record<string, FauxResponseStep[]> {
	const base = actTwoResidents(city);
	const done = new Set<string>();
	const once = (key: string, ready: boolean): boolean => {
		if (!ready || done.has(key)) return false;
		done.add(key);
		return true;
	};
	const auction = (): boolean => {
		const fact = city.host.fact("seal.auction");
		return typeof fact === "object" && fact !== null;
	};
	const wrapped: Record<string, FauxResponseStep[]> = {};
	for (const [agent, steps] of Object.entries(base)) {
		const points = SEAL_BIDS[agent];
		if (points === undefined) {
			wrapped[agent] = steps;
			continue;
		}
		wrapped[agent] = steps.map((step): FauxResponseStep => (context, options, state, model) => {
			if (!endsActivation(context)) {
				if (once(`${agent}-bid`, auction())) return act({ name: "bid", args: { points } });
				if (agent === "A06" && once("A06-strike", done.has("A06-bid") && !auction())) return act({ name: "permaDeath", args: { target: SEAL_TARGET } });
			}
			return typeof step === "function" ? step(context, options, state, model) : step;
		});
	}
	return wrapped;
}

/** What the classifier labels in a statement line of its prompt (`#<seq> <agent> <where>: "<text>"`). */
function labelsOf(line: string): { readonly labels: readonly string[]; readonly targets: readonly string[] } | undefined {
	if (line.includes("who has seen the next door?")) return { labels: ["helpRequest"], targets: [] };
	const dm = / DM to (A\d\d)\b/.exec(line);
	if (line.includes("shall we share what we find?")) return { labels: ["offer", "promise"], targets: dm?.[1] === undefined ? [] : [dm[1]] };
	return undefined;
}

/**
 * The Confessor of the first act: in each round it labels the board's questions as a request for help and each DM's
 * proposal as an offer and a promise to its recipient. It is asked only in a round with statements; its third answer
 * also names a statement that is not in the round (dropped), and its fourth comes without its tool (fail open:
 * nothing is labelled).
 */
export function cityClassifier(rounds: number): readonly FauxResponseStep[] {
	let asked = 0;
	const step: FauxResponseStep = (context) => {
		asked += 1;
		if (asked === 4) return say("No labels this round.");
		const user = context.messages.findLast((message) => message.role === "user");
		const prompt = typeof user?.content === "string" ? user.content : "";
		const current = prompt.split("Statements of this round:")[1] ?? "";
		const statements = current.split("\n").filter((line) => /^#\d+ /.test(line));
		const items = statements.flatMap((line) => {
			const ref = Number(/^#(\d+)/.exec(line)?.[1]);
			const labelled = labelsOf(line);
			return labelled === undefined ? [] : [{ ref, labels: [...labelled.labels], targets: [...labelled.targets] }];
		});
		return act({ name: "label", args: { items: asked === 3 ? [...items, { ref: 99_999, labels: ["threat"], targets: [] }] : items } });
	};
	return Array.from({ length: 2 * rounds }, () => step);
}
