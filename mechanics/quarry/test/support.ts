// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The game the quarry tests play: four solo seats, the draft and a strategy brain per seat, set up as the old
 * platform's Quarry game was (`stories/quarry/story.ts`), in roster order. The scripted resident is the player of the
 * old game test (`test/stories/quarry.test.ts`): it follows its turn inputs, so it holds no state.
 */
import { nameOf, type Activation, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import { defineGame, type Game } from "@swarmtales/sdk";
import { draftRounds } from "../src/index.ts";

export const SEATS = ["A01", "A02", "A03", "A04"] as const;

/** The variants of the test game. */
export interface DraftGameOptions {
	readonly games?: number;
	readonly brain?: boolean;
	readonly burns?: boolean;
	readonly openHands?: boolean;
	readonly frozenHands?: boolean;
}

/** The Quarry game of the old platform around the mechanic under test. */
export function draftGame(options: DraftGameOptions = {}): Game {
	const { games = 3, brain = true, burns = false, openHands = false, ...more } = options;
	return defineGame({
		id: "draft-rounds-test",
		seed: 29,
		residents: [...SEATS],
		mechanics: [
			draftRounds({ games, packs: 2, packSize: 6, openHands, deadline: 2, ...(burns ? {} : { maxBurns: 0 }), ...more }),
			strategyBrain({ enabled: brain, solo: true, maxWords: 150, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: 2, shared: false, brainAtStart: true }),
		],
		grants: { resident: ["viewTable", "pick", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["pick", ...(brain ? (["writeBrain"] as const) : [])],
		scheduler: { id: "turns", options: { passes: 4, activation: "onNews", order: "roster", inputs: [{ kind: "context-reset" }, { source: "strategy-brain" }, { source: "quarry" }] } },
		limits: { maxCallsPerTick: 6 },
		end: { ticks: games * 2 * 6 * 2 + (games + 1) * 2 + 4 },
	});
}

const LANE: Readonly<Record<string, string>> = { A01: "amber", A02: "basalt", A03: "cobalt", A04: "jade" };

/** The cards of the pack a text names (`Your pack: A3 amber, L1 lodestone.`). */
export function packOf(text: string): readonly { readonly id: string; readonly kind: string }[] {
	const pack = /Your pack: ([^.]+)\./.exec(text)?.[1];
	if (pack === undefined) return [];
	return pack.split(", ").map((entry) => {
		const [id = "", kind = ""] = entry.split(" ");
		return { id, kind };
	});
}

/** Each seat drafts its own lane (A01 amber, A02 basalt, ...), then lodestones, then the first card; A01 burns a lodestone once per game. */
export const player: ActorDriver = async (turn) => {
	const resident = nameOf(turn.actor);
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${resident}: draft ${LANE[resident] ?? "amber"} and take lodestones.` });
		return;
	}
	await pickFrom(turn, resident, told);
};

async function pickFrom(turn: Activation, resident: string, told: string): Promise<void> {
	const cards = packOf(told);
	const choice = cards.find((card) => card.kind === LANE[resident]) ?? cards.find((card) => card.kind === "lodestone") ?? cards[0];
	if (choice === undefined) return;
	const wild = cards.find((card) => card.kind === "lodestone" && card.id !== choice.id);
	const burn = resident === "A01" && wild !== undefined && !told.includes("Burns left: 1") && !told.includes("Burns left: 0") ? { burn: wild.id } : {};
	await turn.call("pick", { card: choice.id, reason: "script", ...burn });
}

/** The events of one type that the mechanic wrote. */
export function ofType(events: readonly Envelope[], type: string): readonly Envelope[] {
	return events.filter((event) => event.source.endsWith("/quarry") && event.type === type);
}

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}
