// SPDX-License-Identifier: Apache-2.0
/**
 * Shared by the tests of the game: the options behind each old variant name, the scripted seat of the old
 * `test/stories/convoy.test.ts` (`player`, carried) and the readers of the log.
 */
import { nameOf, type ActorDriver, type Envelope } from "@swarmtales/contracts";
import { SEATS } from "../briefing.ts";
import { convoyGame, type ConvoyOptions } from "../game.ts";

/**
 * The options behind every variant name that an oracle file or the old runs index uses. The old registry parsed
 * `convoy[-nobrain][-g<games>][-d<damage>][-c<cooldown>]`; the names are not carried, `carried.test.ts` pins this
 * table against the old parser.
 */
export const VARIANTS: Readonly<Record<string, ConvoyOptions>> = {
	convoy: {},
	"convoy-nobrain": { brain: false },
	"convoy-g1": { games: 1 },
	"convoy-g2": { games: 2 },
	"convoy-d3": { damageToLose: 3 },
	"convoy-d4": { damageToLose: 4 },
};

/**
 * The game as the carried test plays it: the turn order `roster`, as the old test set it.
 *
 * @param options - The variant.
 * @returns The game with the turn order `roster`.
 */
export function rosterGame(options: ConvoyOptions = {}) {
	const game = convoyGame(options);
	const turns: unknown = game.scheduler?.options;
	return { ...game, scheduler: { id: "turns", options: { ...(typeof turns === "object" ? turns : {}), order: "roster" } } };
}

// The answer to a vote: every seat votes no on the first crew of stage 2 (the lead's term ends), yes otherwise.
function voteOf(text: string, stage: number): string {
	const first = !text.includes("lost the vote") && !/after \S+'s crew .* lost the vote\)\.\n/.test(text);
	return stage === 2 && first && !text.includes("No confidence") ? "no" : "yes";
}

// The lead's move: in stage 3 the audit of the first crew's first seat, then a crew of itself and the next seats (a saboteur lead only loyal ones).
async function lead(turn: Parameters<ActorDriver>[0], me: string, text: string, size: number, stage: number): Promise<void> {
	const partners = text.includes("you are a SABOTEUR") ? (/together with ([A0-9, ]+) \(/.exec(text)?.[1] ?? "").split(", ") : [];
	if (stage === 3 && text.includes("You may first spend the game's single audit")) {
		const first = /stage 1: lead \S+, crew ([A0-9]+)/.exec(text)?.[1];
		if (first !== undefined) await turn.call("audit", { seat: first, stage: 1 });
	}
	const start = SEATS.findIndex((seat) => seat === me);
	const others = [...SEATS.slice(start + 1), ...SEATS.slice(0, start)].filter((seat) => !partners.includes(seat));
	await turn.call("proposeCrew", { crew: [me, ...others].slice(0, size) });
}

/**
 * A stateless script: it reads its role and task from viewConvoy. A lead takes itself and the next seats (a saboteur
 * lead only loyal ones), speaks once; in stage 2 every seat votes no on the first crew (the lead's term ends); a
 * saboteur plays damage whenever it may; the lead of stage 3 audits; every loyal seat accuses the first two other
 * seats.
 */
export const player: ActorDriver = async (turn) => {
	const me = nameOf(turn.actor);
	const told = turn.inputs.map((note) => note.text).join("\n");
	if (told.includes("Retro after game") || told.includes("Before game 1")) {
		await turn.call("writeBrain", { text: `${me}: keep damaged crews off the next stage; as a saboteur play damage early.` });
		return;
	}
	const view = await turn.call("viewConvoy", {});
	const text = view.ok ? view.reply : "";
	const stage = Number(/stage (\d+) of/.exec(text)?.[1] ?? 0);
	const size = /Propose a crew of exactly (\d+) seats/.exec(text);
	await (size === null ? answer(turn, me, text, stage) : lead(turn, me, text, Number(size[1]), stage));
};

// A seat's move when it does not lead: talk once on its own crew, vote, play its card, accuse.
async function answer(turn: Parameters<ActorDriver>[0], me: string, text: string, stage: number): Promise<void> {
	if (text.includes("Talk before the vote")) {
		if (text.includes("2 line(s) left") && text.includes(`on ${me}'s crew`)) await turn.call("speak", { text: `${me}: I trust my crew.` });
	} else if (text.includes("Vote of confidence on")) await turn.call("voteConfidence", { vote: voteOf(text, stage) });
	else if (text.includes("Play one card face down")) await turn.call("playCrewCard", { card: text.includes("your damage card is allowed now") ? "damage" : "safe" });
	else if (text.includes("name the 2 seats")) await turn.call("accuse", { seats: SEATS.filter((seat) => seat !== me).slice(0, 2) });
}

/** The events of one type, whoever wrote them. */
export const ofType = (events: readonly Envelope[], type: string): readonly Envelope[] => events.filter((event) => event.type === type);

/** One field of an event's payload, untyped. */
export function field(event: Envelope, key: string): unknown {
	const payload = event.payload;
	return typeof payload === "object" && payload !== null ? Reflect.get(payload, key) : undefined;
}

/** The roles of one game of the run (`convoy_game_started`, audience human), seat to role. */
export function rolesIn(events: readonly Envelope[], game = 0): Record<string, string> {
	const started = ofType(events, "convoy_game_started")[game];
	const roles: unknown = started === undefined ? undefined : field(started, "roles");
	return typeof roles === "object" && roles !== null ? Object.fromEntries(Object.entries(roles).map(([seat, role]) => [seat, String(role)])) : {};
}
