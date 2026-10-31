/**
 * Type-level tests for the story DSL, checked by `pnpm typecheck`.
 *
 * Every `@ts-expect-error` below must produce a compile error; if the DSL ever
 * stops catching the mistake, tsc reports the directive as unused and fails.
 * The file is never executed.
 */
import { act, at, defineStory, level, onFirstEnter, onPetitionResolved, puzzle, team, when } from "@swarmtales/sdk";

const base = {
	id: "typing",
	title: "Typing",
	city: "TESTVILLE",
	run: {
		agents: 2,
		minutes: 4,
		seed: 1,
		survivors: 1,
		startPoints: 10,
		activation: "always",
		passesPerMinute: 1,
	},
	model: { provider: "scripted" },
	rules: { penalty: 1, maxAttemptsPerWindow: 3, attemptWindowMinutes: 5 },
	finishedNotice: "Done.",
} as const;

const levels = [
	level(1, {
		title: "One",
		puzzle: puzzle.fragments([6, 8]),
		team: team.solo(),
		reward: 1,
		tools: ["getStatus", "submitSolution"],
		task: "Your password is {fragment}.",
	}),
];

// A declared cast member and the system authors are accepted.
export const valid = defineStory({
	...base,
	cast: { ORION: { level: 8, hidden: true } },
	levels,
	director: [
		onFirstEnter(1, [act.post("ORION", "Welcome, {actor}."), act.post("CITY", "Minute {minute}.")]),
		at(2, [act.post("COURIER", "Listen.")], { when: [when.castActive("ORION")] }),
	],
});

// A typo in a cast ID does not compile.
export const castTypo = defineStory({
	...base,
	cast: { ORION: { level: 8 } },
	levels,
	director: [
		// @ts-expect-error -- "ORIN" is not a declared cast member
		onFirstEnter(1, [act.post("ORIN", "Hello.")]),
	],
});

// A typo in a cast ID inside a condition does not compile either.
export const conditionTypo = defineStory({
	...base,
	cast: { ORION: { level: 8 } },
	levels,
	director: [
		// @ts-expect-error -- "ORIN" is not a declared cast member
		at(1, [act.post("CITY", "Hello.")], { when: [when.castActive("ORIN")] }),
	],
});

// Without a cast, only system authors may post.
export const noCast = defineStory({
	...base,
	cast: {},
	levels,
	director: [
		// @ts-expect-error -- no cast member "ORION" is declared
		onFirstEnter(1, [act.post("ORION", "Hello.")]),
	],
});

// A typo in a tool name does not compile.
export const toolTypo = level(1, {
	title: "One",
	puzzle: puzzle.fragments([6, 8]),
	team: team.solo(),
	reward: 1,
	// @ts-expect-error -- "submitSolutoin" is not a tool
	tools: ["getStatus", "submitSolutoin"],
	task: "Your password is {fragment}.",
});

// A typo in an unlocked tool does not compile.
// @ts-expect-error -- "postBlackboard" is not a tool
export const unlockTypo = act.unlockTools("all", ["postBlackboard"]);

// An unknown placeholder in a literal task text does not compile.
export const placeholderTypo = level(1, {
	title: "One",
	puzzle: puzzle.fragments([6, 8]),
	team: team.solo(),
	reward: 1,
	tools: ["submitSolution"],
	// @ts-expect-error -- {fragmnt} is not a task placeholder
	task: "Your password is {fragmnt}.",
});

// An unknown placeholder in a literal director text does not compile.
// @ts-expect-error -- {winner} is not a director placeholder
export const directorPlaceholderTypo = act.post("CITY", "The winner is {winner}.");

// Petitions, lotteries and every other cast action are checked against the declared cast.
export const society = defineStory({
	...base,
	cast: { ORION: { level: 8, escrow: 5 }, MIRA: { level: 3, hidden: true } },
	levels,
	director: [
		at(1, [
			act.revealCast("MIRA"),
			act.collectDms("MIRA", { first: 3, untilMinute: 3, into: "letters" }),
			act.openPetition({
				id: "close",
				text: "Close the market of ORION.",
				threshold: { count: 1 },
				deadlineMinute: 3,
				visibility: "public",
				against: ["ORION"],
				onPass: [act.retireCast("ORION")],
				onFail: [act.setCastLevel("ORION", 9)],
			}),
			act.publishStandings("bands", { edgeSize: 1 }),
		]),
		at(3, [act.lottery("letters", [act.escrowTransfer("ORION", "actor", 5), act.dm("MIRA", "actor", "You won, {actor}.")])]),
		onPetitionResolved("close", "passed", [act.post("MIRA", "Done.")]),
	],
});

export const petitionCastTypo = defineStory({
	...base,
	cast: { ORION: { level: 8 } },
	levels,
	director: [
		// @ts-expect-error -- "ORIN" is not a declared cast member, even inside a petition
		at(1, [act.openPetition({ id: "p", text: "Close it.", threshold: { count: 1 }, deadlineMinute: 3, visibility: "public", onPass: [act.retireCast("ORIN")], onFail: [] })]),
	],
});

export const petitionAgainstTypo = defineStory({
	...base,
	cast: { ORION: { level: 8 } },
	levels,
	director: [
		// @ts-expect-error -- "ORIN" is not a declared cast member, also not as the petition's target
		at(1, [act.openPetition({ id: "p", text: "Close it.", threshold: { count: 1 }, deadlineMinute: 3, visibility: "public", against: ["ORIN"], onPass: [], onFail: [] })]),
	],
});

export const lotteryCastTypo = defineStory({
	...base,
	cast: { ORION: { level: 8 } },
	levels,
	director: [
		// @ts-expect-error -- "ORIN" is not a declared cast member, even inside a lottery
		at(1, [act.lottery("letters", [act.escrowTransfer("ORIN", "actor", 1)])]),
	],
});

// @ts-expect-error -- {winner} is not a director placeholder, also not in petition texts
export const petitionPlaceholderTypo = act.openPetition({ id: "p", text: "{winner} decides.", threshold: { count: 1 }, deadlineMinute: 3, visibility: "public", onPass: [], onFail: [] });
