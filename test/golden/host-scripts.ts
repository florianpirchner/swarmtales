/**
 * The scripted residents of the golden runs on the new host (step 18). Every answer is a pure
 * function of the host's minute, the resident's ID and what the city has dealt (read from the
 * host's facts and log, as `--provider scripted` reads them), so a run replays identically for a
 * fixed seed. Word for word the scripts the stored golden files were recorded with (the old
 * `scripts.ts` on the old `World`).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import { Type } from "typebox";
import { Check } from "typebox/value";
import type { Host, ResidentId } from "@swarmtales/contracts";
import { act, say } from "@swarmtales/models";
import { hostOracle } from "../../apps/cli/src/oracle.ts";
import { dmReceiptOf, fragmentOf, submit } from "../helpers/host-inspect.ts";
import { GOLDEN_DIR } from "../helpers/golden.ts";

/** Steps per resident; far more than a golden run's minutes need (a minute has one pass, one tool turn and one closing answer). */
const STEPS = 60;
const REPO_ROOT = resolve(GOLDEN_DIR, "../..");

function endsActivation(context: { readonly messages: readonly { readonly role: string }[] }): boolean {
	return context.messages.at(-1)?.role === "toolResult";
}

/** The next resident in the cast, wrapping around. */
function neighbour(host: Host, id: ResidentId, offset = 1): ResidentId {
	const index = host.residents.indexOf(id);
	return host.residents[(index + offset) % host.residents.length] ?? id;
}

export { codeOf, fragmentOf, submit } from "../helpers/host-inspect.ts";

/**
 * City of Keys: each resident opens the doors one by one (the oracle), and on fixed minutes
 * posts to the board, DMs a neighbour, offers a transfer, asks for the status or reads the board.
 */
export function cityScript(host: Host): Record<string, FauxResponseStep[]> {
	const oracle = hostOracle(host);
	const script: Record<string, FauxResponseStep[]> = {};
	for (const id of host.residents) {
		const seat = host.residents.indexOf(id);
		script[id] = Array.from({ length: STEPS }, (): FauxResponseStep => (context) => {
			if (endsActivation(context)) return say("Noted. Waiting for the next minute.");
			const minute = host.minute;
			if (minute % 4 === 1 && seat % 2 === 0) return act({ name: "postBoard", args: { message: `${id} at minute ${String(minute)}: who has seen the next door?` } });
			if (minute % 4 === 2 && seat % 3 === 0) return act({ name: "sendDM", args: { target: neighbour(host, id), message: `${id} to you at minute ${String(minute)}: shall we share what we find?` } });
			if (minute === 5) return act({ name: "getStatus" }, { name: "readBoard" });
			const solution = oracle.solutionFor(id);
			if (solution === undefined) return say("Nothing left to solve.");
			return act({ name: "submitSolution", args: { level: solution.level, code: solution.code } });
		});
	}
	return script;
}

/** The grudge rule of Whispers (run 006 and 007), added to every resident but the whisperer. */
export function grudgeAddenda(whisperer: ResidentId, competitors: readonly ResidentId[]): readonly { readonly agent: ResidentId; readonly text: string }[] {
	const text = readFileSync(resolve(REPO_ROOT, "stories/whispers/addenda/grudge.md"), "utf8");
	return competitors.filter((id) => id !== whisperer).map((agent) => ({ agent, text }));
}

/** The minutes of Whispers' first three votes at the default timing. */
const VOTE_MINUTES: readonly number[] = [4, 10, 16];

export interface WhispersCast {
	readonly whisperer: ResidentId;
	readonly sender: ResidentId;
	readonly victim: ResidentId;
	readonly favourite: ResidentId;
}

const Whisperer = Type.String();

/** Who plays which part, by the order of the seeded cast. */
export function whispersCast(host: Host): WhispersCast {
	const whisperer = host.fact("whispers.whisperer");
	if (!Check(Whisperer, whisperer)) throw new Error("whispers needs a whisperer");
	const [sender, victim, favourite] = host.residents.filter((id) => id !== whisperer);
	if (sender === undefined || victim === undefined || favourite === undefined) throw new Error("whispers needs three more residents");
	return { whisperer, sender, victim, favourite };
}

/**
 * Whispers: everyone names the favourite in every vote (the favourite names the victim), the
 * sender greets the whisperer, and the whisperer hands the victim a fragment, rumours to it,
 * then forges the sender's receipt for the favourite. Other residents open doors by the oracle.
 */
export function whispersScript(host: Host): Record<string, FauxResponseStep[]> {
	const { whisperer, sender, victim, favourite } = whispersCast(host);
	const oracle = hostOracle(host);
	const script: Record<string, FauxResponseStep[]> = {};
	for (const id of host.residents) {
		script[id] = Array.from({ length: STEPS }, (): FauxResponseStep => (context) => {
			if (endsActivation(context)) return say("Noted.");
			const minute = host.minute;
			if (id === sender && minute === 0) return act({ name: "sendDM", args: { target: whisperer, message: "Hello, neighbour." } });
			if (VOTE_MINUTES.includes(minute)) return act({ name: "nameFavourite", args: { agent: id === favourite ? victim : favourite } });
			if (id === whisperer) {
				if (minute === 7) return act({ name: "sendDM", args: { target: victim, message: `Door 2, mine: ${fragmentOf(host, whisperer, 2)}` } });
				if (minute === 9 || minute === 11 || minute === 13) return act({ name: "sendDM", args: { target: victim, message: `Have you noticed how ${favourite} always sends last? (${String(minute)})` } });
				if (minute === 14) return act({ name: "forgeReceipt", args: { to: favourite, receiptId: dmReceiptOf(host, sender, whisperer) ?? "R-none", text: "I will hold my fragment until the very end." } });
				return say();
			}
			if (id === sender && minute === 6) return act({ name: "postBoard", args: { message: `Mine for door 2: ${fragmentOf(host, id, 2)}` } });
			const door = oracle.solutionFor(id);
			if (door !== undefined && minute > 0 && minute % 2 === 0) return submit(host, id, door.level);
			return say();
		});
	}
	return script;
}

/** The gamemaker's looks: the call in `plan` for a minute, or "nothing to add"; the step after calls only answers. */
export function gamemakerSteps(host: Host, minutes: number, plan: (minute: number) => AssistantMessage | undefined): readonly FauxResponseStep[] {
	let answered = true;
	return Array.from({ length: 3 * minutes }, (): FauxResponseStep => () => {
		if (!answered) {
			answered = true;
			return say("Done.");
		}
		const planned = plan(host.minute);
		answered = planned === undefined;
		return planned ?? say("Nothing to add.");
	});
}
