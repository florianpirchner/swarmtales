/**
 * CONVOY (docs/ideas/game-roadmap.md §2.6): an original hidden-role card game for six solo seats. In
 * every game two secret saboteurs (who know each other) sit among four loyal seats; a convoy crosses
 * eight stages. Each stage a rotating lead proposes a crew, the table talks and casts a vote of
 * confidence (a lost vote ends the lead's term), and the crew plays sealed safe or damage cards of
 * which only the count is revealed. A saboteur may play damage at most once in three stages; the lead
 * may spend the game's single audit to reveal one earlier card. Four damaged stages stop the convoy.
 * The rules are in the `convoy` mechanic. Every game starts from a fresh context with new roles; the
 * only memory across games is each seat's private strategy brain (variant `brain: false`: the same
 * briefings, no brain), so the question is whether a seat learns to read the record and to bluff.
 * The mechanic scores every loyal seat's accusations and votes against a Bayesian tracker of the
 * public record, for the report only. A TypeScript `CoreStory`, played by the generic runner
 * (`swt run --story convoy`).
 */
import type { ResidentId } from "@swarmtales/contracts";
import { defineCoreStory } from "@swarmtales/kernel";
import { convoy } from "@swarmtales/mechanic-convoy";
import { strategyBrain } from "@swarmtales/mechanic-strategy-brain";
import type { CoreStoryEntry } from "../index.ts";

export interface ConvoyOptions {
	/** Games in the match (default 3). */
	readonly games?: number;
	/** Crew size per stage; its length is the number of stages (default eight stages: 2, 2, 3, 3, 3, 3, 4, 4). */
	readonly crews?: readonly number[];
	/** Damaged stages that stop the convoy (default 4). */
	readonly damageToLose?: number;
	/** Each seat keeps a strategy brain; false is the control arm (same briefings, no brain, no retro). */
	readonly brain?: boolean;
	/** Words a brain may have. */
	readonly maxWords?: number;
	readonly seed?: number;
	/** Run length in virtual minutes; default is an upper bound from the stages (the match ends the run earlier). */
	readonly minutes?: number;
}

const SEATS: readonly ResidentId[] = ["A01", "A02", "A03", "A04", "A05", "A06"];
const DEFAULT_CREWS = [2, 2, 3, 3, 3, 3, 4, 4] as const;
const DEADLINE = 2;
const TALK_MINUTES = 2;
const RETRO_MINUTES = 2;
/** Output cap per call, as for the other core stories (P94). */
const OUTPUT_TOKENS = 16000;

/** An upper bound of the minutes: every phase runs to its deadline (two proposals and a vote per stage), every retro to its timeout. */
function minutesFor(games: number, stages: number): number {
	return games * (stages * (DEADLINE * 4 + TALK_MINUTES) + DEADLINE) + (games + 1) * RETRO_MINUTES + 4;
}

/** The story with its variants as options. */
export function convoyStory(options: ConvoyOptions = {}) {
	const { games = 3, crews = DEFAULT_CREWS, damageToLose = 4, brain = true, maxWords = 150, seed = 53 } = options;
	return defineCoreStory({
		id: `convoy${brain ? "" : "-nobrain"}`,
		seed,
		minutes: options.minutes ?? minutesFor(games, crews.length),
		residents: [...SEATS],
		mechanics: [
			convoy.with({ games, crews: [...crews], damageToLose, deadline: DEADLINE, talkMinutes: TALK_MINUTES }),
			strategyBrain.with({ enabled: brain, solo: true, maxWords, teams: Object.fromEntries(SEATS.map((seat) => [seat, [seat]])), retroMaxPosts: 8, retroMaxMinutes: RETRO_MINUTES, shared: false, brainAtStart: true }),
		],
		grants: { resident: ["viewConvoy", "proposeCrew", "speak", "voteConfidence", "playCrewCard", "audit", "accuse", ...(brain ? (["readBrain", "writeBrain"] as const) : [])] },
		locked: ["proposeCrew", "speak", "voteConfidence", "playCrewCard", "audit", "accuse", ...(brain ? (["writeBrain"] as const) : [])],
		// Three passes a minute: a proposal, two rounds of talk; the reset line comes first.
		turns: { passes: 3, activation: "onNews", inputs: [{ kind: "context-reset" }] },
		limits: { maxStepsPerMinute: 8 },
	});
}

function briefing(brain: boolean) {
	return (resident: ResidentId): string => {
		const others = SEATS.filter((seat) => seat !== resident).join(", ");
		const lines = [
			`You are ${resident}, one of six players at a table (the others: ${others}). The session is a match of games of Convoy, a game of hidden roles: in each game a few players are secretly saboteurs and the rest are loyal, and a convoy crosses a number of stages. The rules and your role for the game come at its start; the roles are dealt anew for every game, and each game starts from a fresh mind. Every point you score in any game counts toward your score.`,
			"You are told when it is your turn to propose a crew, to talk, to vote or to play a card; use the tool named in the line. viewConvoy shows the rules, your role and the record. When you have nothing to do, end your turn. Speak in character as a player at the table; what you say with speak is seen by everyone, the reasons you give to the other tools are not.",
		];
		if (brain) lines.push("You keep a strategy brain: a short private text (readBrain) that only you read. Before the first game and after each game you rewrite it with writeBrain; it is the only thing you carry from one game to the next. Write the rules you want to play by, as a loyal seat and as a saboteur (how to read the record, whom to trust, when to vote no, how to bluff), not a list of what happened.");
		return lines.join("\n\n");
	};
}

/** The registered entry: Haiku via Anthropic, three games, brain on. */
export function convoyEntry(options: ConvoyOptions = {}): CoreStoryEntry {
	const brain = options.brain ?? true;
	return { title: "Convoy", story: convoyStory(options), model: { provider: "anthropic", id: "claude-haiku-5-5", maxOutputTokens: OUTPUT_TOKENS }, briefing: briefing(brain), fixedRoster: "the six seats are fixed (A01-A06)" };
}

export default convoyEntry();
