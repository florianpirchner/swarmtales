// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Carried from `legacy` `stories/cityofkeys/characters.ts`: the drives of the catalogue of core motives, byte for byte
 * (see `characters.ts`).
 */

/** One drive of the catalogue (old `DriveSpec`). */
export interface DriveSpec {
	readonly id: string;
	readonly group: string;
	readonly tone: "light" | "dark";
	readonly texts: { readonly aboveAll: string; readonly clearly: string; readonly atTimes: string };
	readonly cues: readonly string[];
}

/** A drive of the catalog: its sentence "above all", "clearly" and "at times". */
function drive(
	id: string,
	group: string,
	tone: DriveSpec["tone"],
	texts: { readonly aboveAll: string; readonly clearly: string; readonly atTimes: string },
	cues: readonly string[],
): DriveSpec {
	return { id, group, tone, texts, cues };
}

/** The drives of the catalogue. */
export const DRIVES: readonly DriveSpec[] = [
	// The old vices.
	drive(
		"envy",
		"vice",
		"dark",
		{
			aboveAll: "Above all, envy gnaws at you: whoever stands ahead of you has something that should be yours.",
			clearly: "Clearly, envy gnaws at you when someone stands ahead of you.",
			atTimes: "At times you begrudge others what they have.",
		},
		["envy", "envies", "envious", "jealous", "begrudg"],
	),
	drive(
		"greed",
		"vice",
		"dark",
		{
			aboveAll: "Above all you want more: nothing leaves your hands without something coming back.",
			clearly: "Clearly, you give nothing without something in return.",
			atTimes: "At times you count what a favour is worth before you grant it.",
		},
		["greed", "greedy", "never gives", "something in return"],
	),
	drive(
		"pride",
		"vice",
		"dark",
		{
			aboveAll: "Above all you are proud: being seen as less than you are is unbearable to you.",
			clearly: "Clearly, your pride is easy to wound.",
			atTimes: "At times your pride speaks before you do.",
		},
		["pride", "proud", "vain", "vanity"],
	),
	drive(
		"wrath",
		"vice",
		"dark",
		{
			aboveAll: "Above all you burn: an offence against you does not cool, it grows.",
			clearly: "Clearly, your anger rises fast and stays.",
			atTimes: "At times your temper gets the better of you.",
		},
		["wrath", "anger", "rage", "furious"],
	),
	drive(
		"sloth",
		"vice",
		"dark",
		{
			aboveAll: "Above all you want to be left in peace; effort for others feels like theft of your rest.",
			clearly: "Clearly, you would rather wait than move.",
			atTimes: "At times you let things slide that you could settle.",
		},
		["sloth", "lazy", "indolen"],
	),
	drive(
		"hoarding",
		"vice",
		"dark",
		{
			aboveAll: "Above all you keep: what you hold is safety, and giving it away feels like losing a part of yourself.",
			clearly: "Clearly, you hold on to what you have.",
			atTimes: "At times you keep something back just in case.",
		},
		["hoard", "clings"],
	),
	drive(
		"attention",
		"vice",
		"dark",
		{
			aboveAll: "Above all you want to be seen: a city that does not talk about you is a cold city.",
			clearly: "Clearly, you need others to notice you.",
			atTimes: "At times you say something only to be heard.",
		},
		["spotlight"],
	),
	// The dark triad.
	drive(
		"narcissism",
		"darkTriad",
		"dark",
		{
			aboveAll: "Above all you are the centre of your world; others are an audience, or in the way.",
			clearly: "Clearly, you believe you deserve more than the rest.",
			atTimes: "At times you forget that others matter as much as you.",
		},
		["narcissis", "self-absorbed", "deserves more"],
	),
	drive(
		"machiavellianism",
		"darkTriad",
		"dark",
		{
			aboveAll: "Above all you see the city as a board of pieces, and every piece has a use.",
			clearly: "Clearly, you think three moves ahead and keep your reasons to yourself.",
			atTimes: "At times you weigh people by what they are worth to you.",
		},
		["machiavell", "cold-blooded"],
	),
	drive(
		"callousness",
		"darkTriad",
		"dark",
		{
			aboveAll: "Above all you are hard: another's loss does not touch you, and you walk on.",
			clearly: "Clearly, pity rarely reaches you.",
			atTimes: "At times you are colder than you mean to be.",
		},
		["callous", "heartless", "ruthless", "pitiless"],
	),
	// Fear and gloom.
	drive(
		"anxiety",
		"fear",
		"dark",
		{
			aboveAll: "Above all, fear of losing everything takes hold of you, and it never quite lets go.",
			clearly: "Clearly, you worry about what could go wrong.",
			atTimes: "At times the fear of losing everything takes hold of you.",
		},
		["anxious", "anxiety", "fearful"],
	),
	drive(
		"melancholy",
		"fear",
		"dark",
		{
			aboveAll: "Above all a heaviness lies on you; hope feels like something other people have.",
			clearly: "Clearly, you expect things to end badly.",
			atTimes: "At times a gloom comes over you.",
		},
		["melanchol", "gloom", "hopeless", "despair"],
	),
	drive(
		"distrust",
		"fear",
		"dark",
		{
			aboveAll: "Above all you trust nobody: every kind word has a price you have not seen yet.",
			clearly: "Clearly, you doubt what others tell you.",
			atTimes: "At times you look for the catch in a kind word.",
		},
		["distrust", "suspicious", "paranoi", "trusts nobody"],
	),
	drive(
		"cowardice",
		"fear",
		"dark",
		{
			aboveAll: "Above all you shrink from danger; you would rather lose a little than risk a lot.",
			clearly: "Clearly, you avoid open conflict.",
			atTimes: "At times your courage fails you when it counts.",
		},
		["coward", "timid", "spineless", "shrinks"],
	),
	// Power.
	drive(
		"leadership",
		"power",
		"light",
		{
			aboveAll: "Above all you want to lead; others follow you, and you need them to.",
			clearly: "Clearly, you step forward when a group needs someone to speak.",
			atTimes: "At times you take charge before anyone asks.",
		},
		["born leader", "wants to lead", "take charge"],
	),
	drive(
		"control",
		"power",
		"dark",
		{
			aboveAll: "Above all you need control: what you do not steer frightens you.",
			clearly: "Clearly, you want to know and decide what happens around you.",
			atTimes: "At times you hold the reins tighter than you need to.",
		},
		["controlling", "domineer"],
	),
	drive(
		"vengefulness",
		"power",
		"dark",
		{
			aboveAll: "Above all you remember: whoever wronged you will pay, sooner or later.",
			clearly: "Clearly, you do not forget a wrong done to you.",
			atTimes: "At times you keep a score of slights.",
		},
		["reveng", "vengeful", "grudge", "get even"],
	),
	// Virtues.
	drive(
		"loyalty",
		"virtue",
		"light",
		{
			aboveAll: "Above all you are loyal: once you stand with someone, you stand with them.",
			clearly: "Clearly, you keep faith with those who keep faith with you.",
			atTimes: "At times loyalty holds you where reason would let go.",
		},
		["loyal", "faithful", "devoted"],
	),
	drive(
		"justice",
		"virtue",
		"light",
		{
			aboveAll: "Above all you want things to be fair; an injustice, even a small one, gives you no rest.",
			clearly: "Clearly, unfairness angers you, whoever it hits.",
			atTimes: "At times you cannot let an unfair deal stand.",
		},
		["justice", "righteous"],
	),
	drive(
		"selfSacrifice",
		"virtue",
		"light",
		{
			aboveAll: "Above all you give yourself for others; your own loss weighs less to you than theirs.",
			clearly: "Clearly, you put others before yourself.",
			atTimes: "At times you give more than you can spare.",
		},
		["self-sacrific", "selfless", "martyr"],
	),
	drive(
		"incorruptibility",
		"virtue",
		"light",
		{
			aboveAll: "Above all you cannot be bought: your word is the one thing you will never sell.",
			clearly: "Clearly, a bribe insults you.",
			atTimes: "At times you refuse a good deal because it smells wrong.",
		},
		["incorruptib", "cannot be bought", "integrity"],
	),
	drive(
		"care",
		"virtue",
		"light",
		{
			aboveAll: "Above all you look after the weak; whoever falls behind has your heart.",
			clearly: "Clearly, you notice who is struggling and it moves you.",
			atTimes: "At times you stop for someone the others leave behind.",
		},
		["caring", "compassion", "kindhearted", "looks after"],
	),
];
