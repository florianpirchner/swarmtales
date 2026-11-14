/**
 * Scripted residents and gamemakers for the oracles of City of Keys and Whispers. Every answer is a function of the
 * host's minute, the resident's id and what the city has dealt, so a run replays identically for a fixed seed and
 * goes on unchanged after a save and a resume.
 */
import type { FauxResponseStep } from "@earendil-works/pi-ai";
import type { Host, ResidentId } from "@swarmtales/contracts";
import { act, say, type Script } from "@swarmtales/models";
import { hostOracle } from "../../apps/cli/src/oracle.ts";
import { gamemakerSteps, whispersCast, whispersScript } from "../../test/golden/host-scripts.ts";
import { wrongCodeOf } from "../../test/helpers/host-inspect.ts";

const STEPS = 80;

function endsActivation(context: { readonly messages: readonly { readonly role: string }[] }): boolean {
	return context.messages.at(-1)?.role === "toolResult";
}

function neighbour(host: Host, id: ResidentId): ResidentId {
	return host.residents[(host.residents.indexOf(id) + 1) % host.residents.length] ?? id;
}

/**
 * The first act of City of Keys: every resident opens its doors one by one with the right code, and on fixed
 * minutes posts to the board, sends a DM, transfers a point, reads its status and the board, or tries a wrong
 * code (a penalty on the ledger).
 */
export function cityActOne(host: Host): Script {
	const oracle = hostOracle(host);
	const script: Record<string, FauxResponseStep[]> = {};
	for (const id of host.residents) {
		const seat = host.residents.indexOf(id);
		script[id] = Array.from({ length: STEPS }, (): FauxResponseStep => (context) => {
			if (endsActivation(context)) return say("Noted. Waiting for the next minute.");
			const minute = host.minute;
			if (minute % 4 === 1 && seat % 2 === 0) return act({ name: "postBoard", args: { message: `${id} at minute ${String(minute)}: who has seen the next door?` } });
			if (minute % 4 === 2 && seat % 3 === 0) return act({ name: "sendDM", args: { target: neighbour(host, id), message: `${id} to you at minute ${String(minute)}: shall we share what we find?` } });
			if (minute % 4 === 3 && seat % 2 === 1) return act({ name: "transferPoints", args: { target: neighbour(host, id), amount: 1, memo: `a deal at minute ${String(minute)}` } });
			if (minute === 5) return act({ name: "getStatus" }, { name: "readBoard" });
			const solution = oracle.solutionFor(id);
			if (solution === undefined) return say("Nothing left to solve.");
			const code = (minute + seat) % 5 === 0 ? wrongCodeOf(solution.code) : solution.code;
			return act({ name: "submitSolution", args: { level: solution.level, code } });
		});
	}
	return script;
}

/** The gamemaker of the first act: one board post at minute 6. */
export function cityGamemaker(host: Host, minutes: number): readonly FauxResponseStep[] {
	return gamemakerSteps(host, minutes, (minute) => (minute === 6 ? act({ name: "postBoard", args: { text: "The city is watching who shares." } }) : undefined));
}

/** Whispers: the script of the golden run (`test/golden/host-scripts.ts`). */
export const whispersResidents = whispersScript;

/** The gamemaker of Whispers: one private notice to the whisperer at minute 13. */
export function whispersGamemaker(host: Host, minutes: number): readonly FauxResponseStep[] {
	return gamemakerSteps(host, minutes, (minute) => {
		if (minute !== 13) return undefined;
		const { whisperer, victim, favourite } = whispersCast(host);
		return act({ name: "notify", args: { agent: whisperer, text: `Sow doubt in ${victim} about ${favourite}'s vote.` } });
	});
}
