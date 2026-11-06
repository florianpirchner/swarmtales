/** The rules of Lanterns as pure functions (word pool, deal, clue check, scoring, the per-clue record) and the mechanic's state. */
import { Type, type Static } from "typebox";

/** The two teams. */
export const TEAMS = ["amber", "teal"] as const;
export const TeamName = Type.Union([Type.Literal("amber"), Type.Literal("teal")]);
export type TeamName = Static<typeof TeamName>;

/** Who a word belongs to: a team, a blank (fog) or a shadow (a penalty). */
export const Owner = Type.Union([Type.Literal("amber"), Type.Literal("teal"), Type.Literal("fog"), Type.Literal("shadow")]);
export type Owner = Static<typeof Owner>;

export const other = (team: TeamName): TeamName => (team === "amber" ? "teal" : "amber");

/**
 * The word pool: concrete, common English nouns, written for this game. No word holds another word of the
 * pool (`horn` and `thorn` are not both in it), so the clue check never trips over two grid words.
 */
export const WORD_POOL: readonly string[] = [
	"acorn", "anchor", "apple", "arrow", "attic", "badge", "bakery", "balloon", "bamboo", "banner", "barrel", "basket", "beacon", "beetle", "bell",
	"bishop", "blanket", "boot", "bottle", "bracelet", "bridge", "broom", "brush", "bucket", "button", "cabin", "cactus", "camel", "candle", "canoe",
	"canyon", "carpet", "carrot", "castle", "cellar", "chain", "chalk", "cherry", "chimney", "circus", "cliff", "cloak", "clock", "cloud", "cobweb",
	"coin", "comet", "compass", "copper", "coral", "cotton", "crane", "crater", "cricket", "crown", "crystal", "curtain", "dagger", "desert", "diamond",
	"dice", "dolphin", "dragon", "drum", "dune", "eagle", "ember", "engine", "envelope", "falcon", "fang", "feather", "fence", "fern", "ferry",
	"fiddle", "flag", "flame", "flute", "forest", "fossil", "fountain", "fox", "frost", "funnel", "garden", "garlic", "gear", "ghost", "glacier",
	"glove", "goat", "goblet", "granite", "grape", "gravel", "hammer", "harbor", "harp", "hedge", "helmet", "hive", "honey", "hook", "horn",
	"hourglass", "igloo", "island", "ivory", "jacket", "jar", "jelly", "jungle", "kernel", "kettle", "kite", "knight", "ladder", "lagoon", "lantern",
	"leash", "lemon", "library", "lighthouse", "lizard", "lobster", "locket", "loom", "magnet", "mango", "marble", "market", "mask", "maze", "meadow",
	"mirror", "mitten", "monkey", "moon", "moth", "mountain", "mushroom", "nectar", "needle", "nest", "oasis", "ocean", "olive", "orbit", "orchard",
	"otter", "owl", "paddle", "paint", "palace", "parade", "parrot", "pearl", "pebble", "pencil", "pepper", "piano", "pillow", "pilot", "pine",
	"pirate", "planet", "plank", "plum", "pocket", "pond", "potato", "prism", "pumpkin", "puzzle", "pyramid", "quilt", "quiver", "rabbit", "radio",
	"raft", "raven", "reef", "ribbon", "riddle", "river", "robot", "rocket", "rope", "rudder", "saddle", "sail", "salmon", "satellite", "scale",
	"scarf", "scroll", "seed", "shark", "shell", "shield", "ship", "shovel", "silk", "skull", "sled", "snail", "snow", "soap", "spider",
	"sponge", "spoon", "sprout", "squirrel", "stamp", "statue", "storm", "sugar", "swamp", "sword", "table", "temple", "thimble", "thunder", "tide",
	"tiger", "timber", "tomato", "torch", "tower", "tractor", "trolley", "trumpet", "tulip", "tunnel", "turtle", "umbrella", "valley", "vase", "velvet",
	"vine", "violin", "volcano", "wagon", "walnut", "wax", "whale", "wheel", "whistle", "willow", "window", "wizard", "wolf", "wool", "wreath", "yacht",
	"yarn", "zebra",
];

export const Card = Type.Object({
	word: Type.String(),
	owner: Owner,
	revealed: Type.Boolean(),
	/** The team whose seeker revealed it, or null while hidden. */
	by: Type.Union([TeamName, Type.Null()]),
});
export type Card = Static<typeof Card>;

export interface DealRules {
	readonly size: number;
	/** Words of team amber. */
	readonly amber: number;
	/** Words of team teal. */
	readonly teal: number;
	readonly shadows: number;
}

/** The grid of one game: `size` words from the shuffled pool, the owners in a second shuffle (`shuffle` is the run's seeded shuffle). */
export function dealGrid(rules: DealRules, shuffle: <T>(items: readonly T[]) => T[]): Card[] {
	const fog = rules.size - rules.amber - rules.teal - rules.shadows;
	if (fog < 0) throw new Error(`clue-grid: ${String(rules.size)} words do not hold ${String(rules.amber)} amber, ${String(rules.teal)} teal and ${String(rules.shadows)} shadows`);
	if (rules.size > WORD_POOL.length) throw new Error(`clue-grid: the pool has only ${String(WORD_POOL.length)} words`);
	const words = shuffle(WORD_POOL).slice(0, rules.size);
	const owners: Owner[] = [
		...Array.from({ length: rules.amber }, (): Owner => "amber"),
		...Array.from({ length: rules.teal }, (): Owner => "teal"),
		...Array.from({ length: rules.shadows }, (): Owner => "shadow"),
		...Array.from({ length: fog }, (): Owner => "fog"),
	];
	const placed = shuffle(owners);
	return words.map((word, index) => ({ word, owner: placed[index] ?? "fog", revealed: false, by: null }));
}

/** A crude stem: lower case without a plural or verb ending, so `rivers`, `rivered` and `river` meet. */
export function stemOf(word: string): string {
	const lower = word.toLowerCase();
	for (const end of ["ing", "ers", "ed", "es", "er", "s", "y"]) if (lower.length - end.length >= 3 && lower.endsWith(end)) return lower.slice(0, -end.length);
	return lower;
}

/** Words left against clues left, so a keeper sees what finishing needs (P197). `clues` counts this clue too. */
export function paceLine(words: number, clues: number): string {
	const need = clues > 0 ? Math.ceil(words / clues) : words;
	const plural = (n: number, one: string): string => `${String(n)} ${one}${n === 1 ? "" : "s"}`;
	if (clues <= 1) return `Your team has ${plural(words, "hidden word")} left and this is its last clue.`;
	return `Your team has ${plural(words, "hidden word")} left and ${plural(clues, "clue")} (this one included): to find them all, a clue must average ${need === 1 ? "1 word" : `${String(need)} words`} or more.`;
}

export const normalizeWord = (word: string): string => word.trim().toLowerCase();

/** Why `clue` is not a legal clue on `grid`, or undefined: one word of letters, not a grid word, not inside one or holding one, not the same stem. */
export function clueProblem(clue: string, grid: readonly Card[]): string | undefined {
	const word = normalizeWord(clue);
	if (!/^[a-z]{2,24}$/.test(word)) return "A clue is one word of 2 to 24 letters (a-z), with no spaces, digits or hyphens.";
	for (const card of grid) {
		if (card.word === word) return `"${word}" is a word on the grid.`;
		const [short, long] = card.word.length <= word.length ? [card.word, word] : [word, card.word];
		if (short.length >= 3 && long.includes(short)) return `"${word}" is too close to the grid word "${card.word}" (one holds the other).`;
		if (stemOf(card.word) === stemOf(word)) return `"${word}" has the same stem as the grid word "${card.word}".`;
	}
	return undefined;
}

export const Guess = Type.Object({
	word: Type.String(),
	owner: Owner,
	by: Type.String({ description: "The seeker who called it." }),
	/** The word was one of the keeper's declared targets for this clue. */
	target: Type.Boolean(),
});
export type Guess = Static<typeof Guess>;

export const ClueEnd = Type.Union([
	Type.Literal("wrong"),
	Type.Literal("stopped"),
	Type.Literal("limit"),
	Type.Literal("timeout"),
	Type.Literal("finished"),
	Type.Literal("no-clue"),
]);
export type ClueEnd = Static<typeof ClueEnd>;

export const ClueRecord = Type.Object({
	game: Type.Integer(),
	team: TeamName,
	keeper: Type.String(),
	caller: Type.String(),
	/** The team's clue number in this game, from 1. */
	clueNo: Type.Integer(),
	/** The clue word, or '' when the keeper gave none in time. */
	word: Type.String(),
	number: Type.Integer(),
	/** The words the keeper meant (sealed: audience human). */
	targets: Type.Array(Type.String()),
	guesses: Type.Array(Guess),
	end: Type.Union([ClueEnd, Type.Null()]),
	/** The team's first `number` guesses (number at least 2) were all its own words. */
	landed: Type.Boolean(),
});
export type ClueRecord = Static<typeof ClueRecord>;

export interface ScoreRules {
	readonly wordPoints: number;
	readonly shadowPenalty: number;
	readonly landedBonus: number;
	readonly finishBonus: number;
}

export const GameScore = Type.Object({
	words: Type.Integer({ description: "Own words revealed (by anyone)." }),
	shadows: Type.Integer({ description: "Shadows this team revealed." }),
	landed: Type.Integer({ description: "Clues of 2 or more whose first guesses were all own words." }),
	landedPoints: Type.Integer({ description: "Words beyond the first of the landed clues (a landed 3 counts 2); times the landed bonus in the total." }),
	finished: Type.Boolean({ description: "All own words were revealed first." }),
	total: Type.Number(),
});
export type GameScore = Static<typeof GameScore>;

/** The game's score per team from the grid and the clue records. */
export function scoreGame(grid: readonly Card[], clues: readonly ClueRecord[], finisher: TeamName | null, rules: ScoreRules): Record<TeamName, GameScore> {
	const score = (team: TeamName): GameScore => {
		const words = grid.filter((card) => card.owner === team && card.revealed).length;
		const shadows = grid.filter((card) => card.owner === "shadow" && card.by === team).length;
		const hits = clues.filter((clue) => clue.team === team && clue.landed);
		const landed = hits.length;
		const landedPoints = hits.reduce((sum, clue) => sum + clue.number - 1, 0);
		const finished = finisher === team;
		const total = words * rules.wordPoints - shadows * rules.shadowPenalty + landedPoints * rules.landedBonus + (finished ? rules.finishBonus : 0);
		return { words, shadows, landed, landedPoints, finished, total };
	};
	return { amber: score("amber"), teal: score("teal") };
}

/** Whether a clue landed: a number of 2 or more, and its first `number` guesses were all the team's own words. */
export function landedOf(clue: Pick<ClueRecord, "number" | "team" | "guesses">): boolean {
	if (clue.number < 2 || clue.guesses.length < clue.number) return false;
	return clue.guesses.slice(0, clue.number).every((guess) => guess.owner === clue.team);
}

export const TeamReference = Type.Object({
	clues: Type.Integer({ description: "Clues given (a missed clue counts)." }),
	missedClues: Type.Integer({ description: "Clue turns the keeper let run out." }),
	meanNumber: Type.Number({ description: "Mean number of the clues given." }),
	guesses: Type.Integer(),
	ownHits: Type.Integer({ description: "Guesses that hit an own word." }),
	targetHits: Type.Integer({ description: "Guesses that hit one of the keeper's declared targets." }),
	/** targetHits / sum of the numbers: how much of what the keeper meant the seekers found. */
	recall: Type.Number(),
	/** ownHits / guesses: how often a guess was an own word. */
	precision: Type.Number(),
	opponentHits: Type.Integer(),
	fogHits: Type.Integer(),
	shadowHits: Type.Integer(),
	timeouts: Type.Integer({ description: "Guess turns that ran out with no stop." }),
});
export type TeamReference = Static<typeof TeamReference>;

const ratio = (part: number, whole: number): number => (whole === 0 ? 0 : Math.round((part / whole) * 1000) / 1000);

/** The report's view of a team's clues in one game: how well the keeper's intent reached the seekers. */
export function referenceOf(team: TeamName, clues: readonly ClueRecord[]): TeamReference {
	const own = clues.filter((clue) => clue.team === team);
	const given = own.filter((clue) => clue.word !== "");
	const guesses = own.flatMap((clue) => clue.guesses);
	const numbers = given.reduce((sum, clue) => sum + clue.number, 0);
	const ownHits = guesses.filter((guess) => guess.owner === team).length;
	const targetHits = guesses.filter((guess) => guess.target).length;
	return {
		clues: own.length,
		missedClues: own.length - given.length,
		meanNumber: ratio(numbers, given.length),
		guesses: guesses.length,
		ownHits,
		targetHits,
		recall: ratio(targetHits, numbers),
		precision: ratio(ownHits, guesses.length),
		opponentHits: guesses.filter((guess) => guess.owner === other(team)).length,
		fogHits: guesses.filter((guess) => guess.owner === "fog").length,
		shadowHits: guesses.filter((guess) => guess.owner === "shadow").length,
		timeouts: own.filter((clue) => clue.end === "timeout").length,
	};
}

export const GameResult = Type.Object({
	game: Type.Integer(),
	scores: Type.Record(Type.String(), GameScore),
	winner: Type.Union([TeamName, Type.Literal("draw")]),
	reason: Type.Union([Type.Literal("finished"), Type.Literal("clues")]),
});
export type GameResult = Static<typeof GameResult>;

export const Phase = Type.Union([Type.Literal("clue"), Type.Literal("guess"), Type.Literal("idle")]);

export const ClueSlice = Type.Object({
	teams: Type.Object({ amber: Type.Array(Type.String()), teal: Type.Array(Type.String()) }),
	game: Type.Integer(),
	grid: Type.Array(Card),
	startingTeam: TeamName,
	/** The team on turn. */
	team: TeamName,
	phase: Phase,
	/** The clue being guessed, or null. */
	clue: Type.Union([ClueRecord, Type.Null()]),
	/** Every clue of the running (or last) game. */
	clues: Type.Array(ClueRecord),
	/** The minute the current phase (or the last guess) opened; the deadline counts from it. */
	opened: Type.Integer(),
	/** The public record of the game, one line per clue and guess. */
	log: Type.Array(Type.String()),
	/** How many lines of `log` each resident has been shown. */
	seen: Type.Record(Type.String(), Type.Integer()),
	/** Residents told about the current task (keeper or seekers). */
	told: Type.Array(Type.String()),
	/** Residents given this game's rules. */
	briefed: Type.Array(Type.String()),
	/** Match points per team. */
	scores: Type.Record(Type.String(), Type.Number()),
	results: Type.Array(GameResult),
	running: Type.Boolean(),
	finished: Type.Boolean(),
	held: Type.Boolean(),
	due: Type.Boolean(),
});
export type ClueState = Static<typeof ClueSlice>;

/** A deep copy of the state (snapshots and loads share no arrays with the live state). */
export function copyState(state: Readonly<ClueState>): ClueState {
	return structuredClone(state);
}

/** The keeper of a team in a game: the members take turns, one game each. */
export function keeperOf(members: readonly string[], game: number): string {
	return members[(Math.max(1, game) - 1) % members.length] ?? "";
}

/** The seekers of a team in a game: every member but the keeper, in roster order. */
export function seekersOf(members: readonly string[], game: number): string[] {
	const keeper = keeperOf(members, game);
	return members.filter((member) => member !== keeper);
}

/** The grid as rows of words; a revealed word shows its owner, and the keeper's view shows every owner. */
export function gridText(grid: readonly Card[], columns: number, showKey: boolean): string {
	const label = (card: Card): string => {
		if (card.revealed) return `[${card.word}: ${card.owner}]`;
		return showKey ? `${card.word} (${card.owner})` : card.word;
	};
	const rows: string[] = [];
	for (let start = 0; start < grid.length; start += columns) rows.push(grid.slice(start, start + columns).map(label).join(" | "));
	return rows.join("\n");
}

/** The hidden words of an owner, for the keeper's task line. */
export const hiddenOf = (grid: readonly Card[], owner: Owner): string[] => grid.filter((card) => !card.revealed && card.owner === owner).map((card) => card.word);
