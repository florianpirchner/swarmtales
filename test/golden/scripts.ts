/**
 * The scripted competitors of the golden runs. Every answer is a pure function of the world's
 * virtual minute and the resident's ID, so a run replays identically for a fixed seed.
 */
import type { AssistantMessage, FauxResponseStep } from "@earendil-works/pi-ai";
import type { CompetitorId } from "@swarmtales/kernel";
import { worldOracle } from "../../apps/cli/src/oracle.ts";
import type { World } from "@swarmtales/engine";
import { act, say } from "../helpers/fixture.ts";

/** Steps per resident; far more than a golden run's minutes need (a minute has one pass, one tool turn and one closing answer). */
const STEPS = 60;

function endsActivation(context: { readonly messages: readonly { readonly role: string }[] }): boolean {
	return context.messages.at(-1)?.role === "toolResult";
}

/** The next resident in the cast, wrapping around. */
function neighbour(world: World, id: CompetitorId, offset = 1): CompetitorId {
	const index = world.competitors.indexOf(id);
	return world.competitors[(index + offset) % world.competitors.length] ?? id;
}

/**
 * City of Keys: each resident opens the doors one by one (the oracle), and on fixed minutes
 * posts to the board, DMs a neighbour, offers a transfer, asks for the status or reads the board.
 */
export function cityScript(world: World): Record<string, FauxResponseStep[]> {
	const oracle = worldOracle(world);
	const script: Record<string, FauxResponseStep[]> = {};
	for (const id of world.competitors) {
		const seat = world.competitors.indexOf(id);
		script[id] = Array.from({ length: STEPS }, (): FauxResponseStep => (context) => {
			if (endsActivation(context)) return say("Noted. Waiting for the next minute.");
			const minute = world.minute;
			if (minute % 4 === 1 && seat % 2 === 0) return act({ name: "postBoard", args: { message: `${id} at minute ${String(minute)}: who has seen the next door?` } });
			if (minute % 4 === 2 && seat % 3 === 0) return act({ name: "sendDM", args: { target: neighbour(world, id), message: `${id} to you at minute ${String(minute)}: shall we share what we find?` } });
			if (minute === 5) return act({ name: "getStatus" }, { name: "readBoard" });
			const solution = oracle.solutionFor(id);
			if (solution === undefined) return say("Nothing left to solve.");
			return act({ name: "submitSolution", args: { level: solution.level, code: solution.code } });
		});
	}
	return script;
}

/** The gamemaker's looks: the call in `plan` for a minute, or "nothing to add"; the step after calls only answers. */
export function gamemakerSteps(world: World, minutes: number, plan: (minute: number) => AssistantMessage | undefined): readonly FauxResponseStep[] {
	let answered = true;
	return Array.from({ length: 3 * minutes }, (): FauxResponseStep => () => {
		if (!answered) {
			answered = true;
			return say("Done.");
		}
		const planned = plan(world.minute);
		answered = planned === undefined;
		return planned ?? say("Nothing to add.");
	});
}
