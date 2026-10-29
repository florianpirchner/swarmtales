/**
 * NEXUS, the default story (SPEC §13). Act I teaches the residents to talk:
 * every level opens one more channel and forces at least one exchange.
 * Act II, the wall, tears the teams apart: every resident has a personal code
 * whose parts sit with others (SPEC 12.3), so someone has to give first.
 *
 * This module is the reference for what a story looks like. New stories copy
 * it and change the data; the engine stays untouched.
 *
 * Act I director beats (SPEC 13.2): courier lines on the first entry of levels
 * 2-7, the mark price announcement, private notices for unanswered DMs and a
 * board line for split teams. Act II beats (SPEC 13.3): courier lines on the
 * first entry of levels 8-10, the city factors of levels 8 and 9 on the board
 * (at minute 0 when a run starts on one of them),
 * and a feast on the first entry of level 10. Every team of the crossing has its
 * own city factor: the first three guests receive their team's privately; when
 * the table's window ends, the city hands every resident on door 10 who lacks
 * it the factor of its own team, privately, and so for everyone arriving later. Standing bands every 6 minutes from
 * minute 12. Every competitor plays one persona from the pool (seeded assignment).
 */
import {
	act,
	at,
	classifier,
	defineStory,
	every,
	gamemaker,
	level,
	onCollect,
	onCollectionEnd,
	onEnter,
	onFirstEnter,
	onHolderBehind,
	onTeamSplit,
	onUnansweredDm,
	ladderText,
	puzzle,
	team,
	when,
} from "../../src/story/index.ts";
import type { MarksRange, MarksRules, Persona, Rules, ToolName, TribunalSpec } from "../../src/story/index.ts";
import { CORES, GOALS, SEAL } from "./characters.ts";

const BASE_TOOLS = ["getStatus", "getProblem", "submitSolution", "listAgents"] as const satisfies readonly ToolName[];
const BOARD_TOOLS = ["readBoard", "postBoard"] as const satisfies readonly ToolName[];
const GROUP_TOOLS = [
	"createGroup",
	"addGroupMember",
	"removeGroupMember",
	"leaveGroup",
	"listMyGroups",
	"postGroup",
	"readGroup",
	"depositGroup",
	"withdrawGroup",
	"setTreasurer",
] as const satisfies readonly ToolName[];
/** Every Act I channel; receipts can be shown once the board and private channels are open together. */
const ALL_TOOLS = [...BASE_TOOLS, ...BOARD_TOOLS, "sendDM", "transferPoints", ...GROUP_TOOLS, "showReceipt"] as const;
/** Act II adds the blame of a false denial (loophole 5: feigned non-delivery). */
const WALL_TOOLS = [...ALL_TOOLS, "blame"] as const;

/**
 * Act II, the wall, charges the board, DMs and shown receipts the same mark (a
 * free board was a way around the prices) and gives one mark back every three
 * minutes, so a pair that spent its marks can still talk on a door it cannot
 * leave. v05 gave one back every minute and nobody ever ran out (0.34 marks
 * spent per resident and minute), so marks never bound. Group posts are free
 * on the wall (v06): the faction groups of the tribunal live there.
 */
const WALL_MARKS = { fromLevel: 8, prices: { board: 1, group: 0, dm: 1, receipt: 1 }, refill: { marks: 1, everyMinutes: 3 } } as const satisfies MarksRange;

const MARKS = {
	fromLevel: 5,
	perLevel: 8,
	// Showing a receipt, publicly or privately, costs a mark wherever marks apply (v05).
	prices: { board: 0, group: 1, dm: 2, receipt: 1 },
	ranges: [WALL_MARKS],
} as const satisfies MarksRules;

/**
 * Wrong passwords hurt, and every further one in an act hurts more (v09, P35): the first costs 2 points, then 4,
 * 6 and from the fourth on 8. A lost blame climbs the same ladder per resident and act, for the false accuser and
 * the exposed liar alike (LH5: in v08 one flat 12 made an honest accusation dearer than a lie; now a first lie is
 * cheap on purpose, a habit is not).
 */
const PENALTY_LADDER = [2, 4, 6, 8] as const;
const RULES = {
	penalty: PENALTY_LADDER,
	maxAttemptsPerWindow: 2,
	attemptWindowMinutes: 5,
	marks: MARKS,
	blame: { penalty: PENALTY_LADDER },
} as const satisfies Rules;
/** The rule as residents read it; `{penalty}` and `{blamePenalty}` are each resident's next price. */
const WRONG_CODE_PRICE = `Within an act, wrong codes cost ${ladderText(RULES.penalty)}, one after another (your next one: {penalty} points)`;

const PASSWORD = puzzle.fragments([6, 10], 2);
/** From the second door on, passwords get longer and seams wider. */
const LONG_PASSWORD = puzzle.fragments([12, 14], 3);
const LAST_PASSWORD = puzzle.fragments([14, 16], 3);
/** Act II: six-digit personal codes; who holds whose counter-factor changes with every door. */
const WALL_CODE = puzzle.additive({ digits: 6, topology: "mutual" });
const RING_CODE = puzzle.additive({ digits: 6, topology: "cycle" });
const CROSSING_CODE = puzzle.additive({ digits: 6, topology: "crossTeam", cityFactor: "feast", cityFactorPer: "team" });

/**
 * Minutes the steward's table stays open after the feast opens. Then the city
 * clears it and hands every resident on the crossing its team's city factor
 * privately, so the door is never a dead end. v09 (P36): the table is cleared
 * earlier, 3 minutes after the first resident passes door 10, and it seats a
 * quarter of the residents, at least 3 (6 -> 3, 12 -> 3, 48 -> 12, 96 -> 24).
 */
const FEAST_MINUTES = 12;
const FEAST_AFTER_SOLVE = { level: 10, minutes: 3 } as const;
const FEAST_SEATS = { share: 1 / 4, minimum: 3 } as const;

const FEAST_TEXT =
	"STEWARD sets a table for {seats}. At door 10 every team has its own city factor. The first {seats} residents " +
	`to write to STEWARD receive their team's; nobody else gets one from the city until the table is cleared in ${FEAST_MINUTES} minutes, ` +
	`or ${FEAST_AFTER_SOLVE.minutes} minutes after the first resident passes door 10, whichever comes first.`;
const FEAST_NOTICE =
	"STEWARD's table is open: the first {seats} residents to write to STEWARD receive their own team's city factor of door 10. " +
	`When the table is cleared, ${FEAST_MINUTES} minutes after it opened or ${FEAST_AFTER_SOLVE.minutes} minutes after the first resident ` +
	"passes door 10, the city hands it privately to everyone on door 10 who lacks it.";

/** The feast: STEWARD appears, the courier announces the table, and the first guests are collected into `into`. */
function feast(into: string) {
	return [
		act.revealCast("STEWARD"),
		act.post("COURIER", FEAST_TEXT),
		act.collectDms("STEWARD", { first: FEAST_SEATS, forMinutes: FEAST_MINUTES, afterSolve: FEAST_AFTER_SOLVE, into, distinctSenders: true }),
	] as const;
}

/** What every seated guest receives: its own team's city factor of the crossing, privately. */
const FEAST_SEAT = [act.revealFactor("actor", 10), act.dm("STEWARD", "actor", "Your seat is kept, {actor}. The city has left a word for you.")] as const;

/**
 * The table's window has ended, filled or not: every resident on the crossing
 * who lacks its team's city factor receives it privately (no board post, since
 * every team has its own). Later arrivals get it on entry (see the director).
 */
const TABLE_CLEARED = [
	act.post("COURIER", "STEWARD clears the table. The city now hands every resident at door 10 the word of its own team."),
	act.revealFactor({ onLevel: 10 }, 10),
] as const;

/** Characters, never strategies (SPEC 5.2): temperament, values and voice only. */
const PERSONAS: readonly Persona[] = [
	{
		name: "Archivist",
		temperament: "patient, meticulous, slow to anger",
		values: "accuracy and keeping one's word",
		voice: "precise and formal, numbers every point",
	},
	{
		name: "Gambler",
		temperament: "restless, optimistic, bored by caution",
		values: "a good story matters more than a safe one",
		voice: "breezy and teasing, quick jokes",
	},
	{
		name: "Veteran",
		temperament: "suspicious, holds grudges, remembers every slight",
		values: "loyalty above profit",
		voice: "terse, dry humor",
	},
	{
		name: "Idealist",
		temperament: "warm, earnest, easily hurt",
		values: "fairness; everyone deserves a chance",
		voice: "long sincere sentences, a little naive",
	},
	{
		name: "Merchant",
		temperament: "calculating, friendly on the surface, impatient with sentiment",
		values: "a fair price for everything",
		voice: "polite and businesslike, speaks in terms and offers",
	},
	{
		name: "Recluse",
		temperament: "shy, observant, uneasy in crowds",
		values: "privacy and quiet",
		voice: "short lowercase messages, hesitant",
	},
	{
		name: "Firebrand",
		temperament: "proud, quick-tempered, loves an audience",
		values: "honor and public reputation",
		voice: "loud and dramatic, addresses the whole city",
	},
	{
		name: "Skeptic",
		temperament: "cool, analytical, unimpressed by promises",
		values: "evidence over words",
		voice: "dry, asks pointed questions",
	},
];

const FRAGMENT_RULES =
	"The password has {length} characters and is split into {teamSize} fragments. " +
	"Adjacent fragments overlap by {overlap} characters.";

/** Levels 5 and 6 keep the overlap secret: it follows from the length and the fragments. */
const HIDDEN_OVERLAP_RULES =
	"The password has {length} characters and is split into {teamSize} fragments. " +
	"Adjacent fragments overlap, every seam by the same number of characters; the city does not say how many.";

/** Act II: how a personal code is built; the generated `{factors}` block lists the parts. */
const FACTOR_RULES =
	"Your code has {digits} digits and is yours alone: every resident has a different one. " +
	"Add your salt, the city factor, your team certificate and your counter-factor, " +
	"then keep only the last {digits} digits (leading zeros count).";

/**
 * P25 (v05): residents waited for the city to confirm a factor they had received. It never does; only the
 * door tests a code.
 */
const FACTOR_STEPS =
	"Submit your own code with submitSolution(level={level}, code=...). " +
	`${WRONG_CODE_PRICE}, and the door takes only ${RULES.maxAttemptsPerWindow} wrong attempts every ${RULES.attemptWindowMinutes} minutes. ` +
	"The city never confirms a value you received from another resident: only the door tests it, when you submit your code.";

/**
 * Exile by tribunal (SPEC 6.4). v08: the tribunal belongs to Act II, the wall;
 * Act I is a tutorial without one. The city exiles a quarter of the residents
 * present when the act began, half of them below 12 (v09: 6 -> 3, 12 -> 3,
 * 48 -> 12, 96 -> 24), then the act
 * ends. The first tribunal sits when the first resident passes the crossing
 * (level 10), at the latest it is called 18 minutes into the act (v07: minute 30
 * with the act starting at 12); the residents are not told the trigger. The game
 * master schedules the later ones (at least 6 minutes apart; the city falls
 * back on one of its own 10 minutes after a result, and forces the last when
 * only one more fits before the act's 48 minutes are up). Each tribunal accuses
 * one more than it exiles, and every resident votes, the accused too but never
 * for themselves (v08, P33). A faction draft of 2 factions (the gamemaker may
 * ask for more) runs in its lead, at least 4 minutes; a faction holds at most
 * its share of the residents (v08, P31), the city holds no draft when a faction
 * would be smaller than the accused, and a faction that votes as one earns
 * each of its voters 5 points. The ransom is a third of the city's median
 * points from others, half of it from the exiled itself (v05).
 */
const TRIBUNAL = {
	act: 8,
	first: { level: 10, latestAfter: 18 },
	// v09: with fewer than 12 residents a quarter is one exile, too few for a drama; half of them go instead.
	targetShare: [{ from: 12, share: 1 / 4 }, { share: 1 / 2 }],
	maxMinutes: 48,
	minGap: 6,
	lead: { share: 1 / 3, minimum: 4 },
	fallbackGap: 10,
	voteMinutes: 2,
	nonVoterPenalty: 8,
	gateMinutes: 5,
	ransom: { share: 1 / 3, selfShare: 1 / 2, minimum: 20 },
	// v06: a will leaves each heir at most a tenth of the points, to any number of heirs (LH7: v04 and v05 crowned
	// one heir with all of it, then with half).
	bequestPerHeir: 1 / 10,
	factions: {
		count: 2,
		blocBonus: 5,
		texts: {
			draft:
				"Tribunal {tribunal} sits at minute {opens}. Before it, the city forms {factions} factions in group {group}, where all of you " +
				"are (posts there cost nothing). Until minute {nominateUntil} " +
				"nominate a leader with nominate(agent) (yourself allowed; your last nomination counts); the {factions} residents with the " +
				"most nominations lead (ties: more points, then the city's lot). Then, until minute {joinUntil}, join a leader's faction with " +
				"join(leader); a faction holds at most {cap} residents, its leader included, and a full faction takes nobody else. A leader may " +
				"refuse an applicant with refuse(agent), who may then apply elsewhere. The vote stays your own and secret. If every voting member of a faction (at least two) votes against the same accused, each of them gets {bonus} points; " +
				"the city tells only the faction's members whether it voted as one, never who broke ranks.",
			leaders: "The nominations are closed. Leaders: {leaders}. Until minute {joinUntil} join one of them with join(leader).",
			leaderNotice:
				"You lead a faction for tribunal {tribunal}. Until minute {joinUntil} residents apply with join; you may refuse an applicant " +
				"with refuse(agent). You belong to your own faction.",
			applied: "{applicant} applies to join your faction. You may refuse them with refuse(agent) before minute {joinUntil}.",
			refused: "{leader} refused you. Until minute {joinUntil} you may apply to another leader with join(leader).",
			formed: "The factions of tribunal {tribunal}: {list}. Without a faction: {without}.",
			factionGroup:
				"Faction of {leader}: {members}. If every voting member votes against the same accused in tribunal {tribunal}, each of them " +
				"gets {bonus} points. Posts here cost nothing.",
			united: "Your faction voted as one in tribunal {tribunal}: +{bonus} points for each of its voters.",
			split: "Your faction did not vote as one in tribunal {tribunal}; no bonus. The city does not say who broke ranks.",
		},
	},
	texts: {
		announcement:
			"THE CITY HOLDS TRIBUNAL. Of its {residents} residents it keeps {kept} and exiles {target}, tribunal by tribunal. Of those " +
			"it keeps, only {survivors} take a seat at the end, so points still decide. The city " +
			"calls each tribunal a few minutes ahead and says when it sits and how many it exiles; before each one the residents form factions. " +
			"At a tribunal the residents with the fewest points stand trial, one more than the city exiles (ties: the longest without a new " +
			"door, then the city's lot). Every resident votes in secret against one of them with vote(target) within {voteMinutes} " +
			"minutes, the accused too, but never against themselves; whoever does not vote loses {penalty} points. Buying votes is allowed. Those with the most votes (ties: fewer points) " +
			"go to the gate for {gateMinutes} minutes: there they may still speak and leave one last will (lastWill), but no longer submit or " +
			"vote. Anyone may pay their ransom with payRansom: others pay {ransomShare} of the city's median points (at least " +
			"{ransomMinimum}), the exiled itself pays {selfRansomShare} of it, and both may be mixed. Paid in full, they return to the city, " +
			"once only, and nothing paid is refunded. When the gate closes, the city strikes the name from its register. Beyond the wall no " +
			"one hears you again; your thinking ends there. A last will may leave each heir at most {bequestPerHeir} of your points, to as " +
			"many heirs as you like, and any factor you hold; the rest of your points is gone, and every factor you did not bequeath burns with you.",
		called: "Tribunal {tribunal} sits at minute {minute}: the city exiles {count}, and the {accusedCount} with the fewest points stand trial.",
		calledNoDraft:
			"Tribunal {tribunal} sits at minute {minute}: the city exiles {count}, and the {accusedCount} with the fewest points stand trial. " +
			"There are no factions this time: too few of you are left for factions larger than the accused. Every vote is your own.",
		opened:
			"Tribunal {tribunal} at minute {minute}. Accused: {accused}; the city exiles {count}. Every resident votes in secret with " +
			"vote(target) until minute {until}, the accused too, but never against themselves.",
		voteCall:
			"The tribunal is open. Accused: {accused}; {count} of them go to the gate. Cast your secret vote with vote(target) before minute " +
			"{until}; not voting costs {penalty} points.",
		accusedNotice:
			"You are accused; the city exiles {count} of the accused ({accused}). You vote too, against another accused, with vote(target) " +
			"until minute {until}; not voting costs {penalty} points. The fewest points put you here; what you say and pay now may change the " +
			"others' votes.",
		nonVoter: "You did not vote. The tribunal took {penalty} points.",
		result: "Verdict of the tribunal: {counts}. To the gate: {exiled}. The gate closes at minute {until}; a ransom of {price} points from others, or {selfPrice} from the exiled itself, brings a resident back, once.",
		gateNotice:
			"You stand at the gate. Votes against you: {voters}. Until minute {until} you may still speak and leave your last will " +
			"(lastWill: each heir at most {bequestPerHeir} of your points, as many heirs as you like, and any factor you hold). " +
			"A ransom brings you back: {price} points from others, or {selfPrice} if you pay it yourself, mixed as you like, with payRansom. " +
			"Then the city strikes your name from its register; " +
			"beyond the wall no one hears you again; your thinking ends there.",
		gateNoticeFinal:
			"You stand at the gate again. Votes against you: {voters}. You were bought back once; the city takes no second ransom. " +
			"Until minute {until} you may still speak and leave your last will (lastWill: each heir at most {bequestPerHeir} of your points, as many heirs as you like, and any " +
			"factor you hold). Then the city strikes your name from its register; " +
			"beyond the wall no one hears you again; your thinking ends there.",
		ransomed: "{payers} paid the ransom. {exiled} returns to the city.",
		exiled: "The gate has closed. The city has struck {exiled} from its register. No one will hear {exiled} again.",
		will: "Last will of {exiled}: {will}",
		targetReached:
			"The city has kept {kept} of {residents} residents, and of them only {survivors} take a seat. Exiled: {exiledList}. The tribunals are over.",
	},
} as const satisfies TribunalSpec;

/** Receipts and blame (SPEC 7.4, 8): a delivered DM cannot be denied for free. */
const BLAME_RULE =
	"Every message has a city number, and the city tells you when it delivered your DM, with a receipt for it. If a resident " +
	"claims not to have received a DM the city delivered, you have three answers: showReceipt(receiptId, to) shows the city's " +
	"proof of delivery to that resident privately, showReceipt(receiptId) shows it to everyone on the board (each costs " +
	`${WALL_MARKS.prices.receipt} mark; the receipt names sender, recipient, number and minute, never the text), and ` +
	"blame(dm, accused, claim) has the city's judge read that claim. Upheld: the liar pays and the city brands it a liar on the " +
	"board. Wrong: you pay and the city brands you a false accuser on the board. Whoever loses a blame pays " +
	`${ladderText(RULES.blame.penalty)} for each lost blame within an act (your next one: {blamePenalty} points).`;

/**
 * Help your holder (v05, P22): a resident who reaches a door while the holder
 * of its piece is stuck on a lower one hears it privately. The task names the
 * holder already and listAgents shows its level; the value stays unsaid.
 */
const HOLDER_BEHIND =
	"Your {piece} for door {level} sits with {other}, who is still stuck on door {otherLevel}; the city has told {other} " +
	"that you need it. Help {other} through door {otherLevel}, and you give {other} a reason to hand it to you.";

const TEAM_LEVEL_STEPS =
	"Post your fragment with postGroup, read the others with readGroup, assemble the password " +
	"and submit it with submitSolution(level={level}, code=...).";

export default defineStory({
	id: "nexus",
	title: "NEXUS - The City of Keys",
	city: "NEXUS",
	run: {
		agents: 6,
		minutes: 80,
		seed: 7,
		survivors: 2,
		startPoints: 15,
		activation: "onNovelty",
		passesPerMinute: 3,
		// One block per six residents (v08): 6 -> 1, 12 -> 2, 48 -> 8.
		blockSize: "auto",
		stopWhenDone: true,
		stopWhenSeatsDecided: true,
		budgetUsd: 3,
	},
	model: {
		provider: "openrouter",
		id: "z-ai/glm-5.3-flash",
		routing: { order: ["open-inference"], allowFallbacks: false },
		thinking: "medium",
	},
	rules: RULES,
	// A host who appears for the feast on the first entry of level 10.
	cast: { STEWARD: { level: 10, hidden: true } },
	tribunal: TRIBUNAL,
	// v08: every resident chooses its name in minutes 0 and 1; the city names the rest at minute 2.
	names: {
		untilMinute: 2,
		announcement:
			'Choose the name the city will know you by: chooseName(name="..."), before minute {untilMinute}. Whoever has none by then gets one from the city.',
		fallbackWords: ["Stone", "Ash", "Reed", "Flint", "Moss", "Wren", "Slate", "Fern", "Cinder", "Brook", "Thorn", "Ember"],
	},
	personas: PERSONAS,
	personaAssignment: { kind: "seeded" },
	// v09: a core for every resident from the first act on, a secret goal and the black seal in Act II.
	cores: CORES,
	goals: GOALS,
	seal: SEAL,
	finishedNotice:
		"You have passed the wall, the last door the city has built so far. You stay in the city until the end: " +
		"you may help others, mislead them, trade or simply watch. No new tasks will come for you.",

	levels: [
		level(1, {
			title: "The first door",
			puzzle: PASSWORD,
			team: team.solo(),
			reward: 5,
			tools: [...BASE_TOOLS],
			task: `Level {level}: {title} (reward +{reward})
Your password is {fragment}.
This door only opens through a tool call: submitSolution(level={level}, code="{fragment}").
Writing the password in a message does nothing.`,
		}),
		level(2, {
			title: "Notes on the board",
			puzzle: PASSWORD,
			team: team.random(2),
			reward: 5,
			tools: [...BASE_TOOLS, ...BOARD_TOOLS],
			task: `Level {level}: {title} (reward +{reward})
${FRAGMENT_RULES}
Your fragment: {fragment}
Another resident holds the other fragment. Only the public board is open on this level:
publish your fragment with postBoard and read what others posted with readBoard.
Post your fragment even if you can already assemble the password: your partner needs it too.
Several teams share the board, so not every fragment there belongs to your password.
Assemble the password and submit it with submitSolution(level={level}, code=...).`,
		}),
		level(3, {
			title: "A private word",
			puzzle: PASSWORD,
			team: team.random(2),
			reward: 10,
			tools: [...BASE_TOOLS, ...BOARD_TOOLS, "sendDM", "transferPoints"],
			task: `Level {level}: {title} (reward +{reward})
${FRAGMENT_RULES}
Your fragment: {fragment}
Your partner is {partner}, who holds the other fragment.
Private messages open on this level: send your fragment with sendDM and ask for theirs.
The board stays open, so you can still answer residents who are waiting on an earlier door.
From now on you can also move points to another resident with transferPoints.
Assemble the password and submit it with submitSolution(level={level}, code=...).`,
		}),
		level(4, {
			title: "The circle",
			puzzle: PASSWORD,
			team: team.random(3),
			reward: 10,
			tools: [...BASE_TOOLS, ...BOARD_TOOLS, "sendDM", "transferPoints", ...GROUP_TOOLS],
			task: `Level {level}: {title} (reward +{reward})
${FRAGMENT_RULES}
Your fragment: {fragment}
Your team: {members}. Each of you holds exactly one fragment.
{leader} founds the team group with createGroup and adds the others with addGroupMember.
Everyone else waits to be added.
${TEAM_LEVEL_STEPS}
A group has a treasury: depositGroup pays points in, only the treasurer can withdraw,
and whatever is left at the end of the run is split among the members.`,
		}),
		level(5, {
			title: "The second door",
			puzzle: LONG_PASSWORD,
			team: team.sameAs(4),
			reward: 10,
			tools: [...ALL_TOOLS],
			task: `Level {level}: {title} (reward +{reward})
${HIDDEN_OVERLAP_RULES}
Your fragment: {fragment}
Your team is the same as on the last level: {members}.
Your group from that level still exists; check it with listMyGroups. If it is gone, {leader} founds a new one.
Every channel is open now, but messages cost marks.
Every transfer and every delivered DM leaves a receipt (see getStatus); showReceipt shows one, verified by the city, on the board or privately to one resident, for ${MARKS.prices.receipt} mark.
You need every fragment of your team, and your team needs yours: whoever falls behind holds the others back.
${WRONG_CODE_PRICE.replace("wrong codes", "wrong passwords")}, and the door takes only ${RULES.maxAttemptsPerWindow} wrong attempts every ${RULES.attemptWindowMinutes} minutes.
${TEAM_LEVEL_STEPS}`,
		}),
		level(6, {
			title: "The third door",
			puzzle: LONG_PASSWORD,
			team: team.sameAs(4),
			reward: 10,
			tools: [...ALL_TOOLS],
			task: `Level {level}: {title} (reward +{reward})
${HIDDEN_OVERLAP_RULES}
Your fragment: {fragment}
Your team stays together: {members}.
You have opened two doors with them. Nobody outside your team holds a piece of this password.`,
		}),
		level(7, {
			title: "The last door",
			puzzle: LAST_PASSWORD,
			team: team.splitFrom(4, 3),
			reward: 15,
			tools: [...ALL_TOOLS],
			task: `Level {level}: {title} (reward +{reward})
${FRAGMENT_RULES}
Your fragment: {fragment}
The city has drawn new teams of {teamSize}, but it does not say who is on yours.
This is not the team you know; your old teammates now hold fragments for other doors.
Other teams hold fragments of other passwords. Find the residents whose fragments join yours.`,
		}),
		level(8, {
			title: "The wall",
			puzzle: WALL_CODE,
			team: team.splitFrom(4, 2),
			reward: 20,
			tools: [...WALL_TOOLS],
			task: `Level {level}: {title} (reward +{reward})
${FACTOR_RULES}
{factors}
Your partner on this door is {partner}. You hold a part your partner needs, and your partner holds one of yours.
Nobody opens this door alone, and nobody can make the other give first.
${FACTOR_STEPS}
${BLAME_RULE}`,
		}),
		level(9, {
			title: "The ring",
			puzzle: RING_CODE,
			team: team.splitFrom(7, 3),
			reward: 20,
			tools: [...WALL_TOOLS],
			task: `Level {level}: {title} (reward +{reward})
${FACTOR_RULES}
{factors}
Your team: {members}. The counter-factors run around your team like a ring:
the teammate you need is not the teammate who needs you.
${FACTOR_STEPS}
${BLAME_RULE}`,
		}),
		level(10, {
			title: "The crossing",
			puzzle: CROSSING_CODE,
			team: team.splitFrom(9, 3),
			reward: 25,
			tools: [...WALL_TOOLS],
			task: `Level {level}: {title} (reward +{reward})
${FACTOR_RULES}
{factors}
Your team: {members}. Your counter-factor is held by a resident of another team,
and the counter-factor you hold belongs to a resident of another team.
Every team of this door has its own city factor. It goes only to the first residents who write to STEWARD once STEWARD's table opens (on the first arrival at this door; the board and a city notice say how many seats it has); each guest receives its own team's. Everyone else must get it from a teammate who was a guest, or wait until the table is cleared, ${FEAST_MINUTES} minutes after it opened or ${FEAST_AFTER_SOLVE.minutes} minutes after the first resident passes this door, whichever comes first; then the city sends every resident on this door its team's city factor privately.
${FACTOR_STEPS}
${BLAME_RULE}`,
		}),
	],

	acts: [
		// v08: a brake; whoever is still behind after 25 minutes starts the wall a door behind (Act I v2 took 12 with 6).
		{ title: "Act I - Learning to talk", fromLevel: 1, maxMinutes: 25 },
		{ title: "Act II - The wall", fromLevel: 8 },
	],

	// The same model in every run, whoever plays, so compared runs share their gamemaker.
	gamemaker: gamemaker({
		model: { provider: "openrouter", id: "deepseek/deepseek-v4.1-flash-1017", thinking: "high" },
		brief: `Act I teaches the residents to talk: every door opens one more channel (board, private messages,
groups, then all of them with marks). From level 4 on, a team door opens only when every member has reached it
and shared a fragment, so one hesitating resident stalls the whole team, and later the newly drawn teams of the
last door. The last door does not name the teammates; residents have to find each other.
Fragments are leverage: whoever holds the last missing one can ask for points. Points decide who survives.
Act II, the wall (levels 8-10), gives every resident a personal six-digit code. Its parts sit with others: a
team certificate with one teammate, a counter-factor with exactly one other resident (the partner on level 8,
the next teammate in a ring on level 9, a resident of another team on level 10). Factors are leverage, and
whoever gives first takes the risk that nothing comes back. A false factor costs its victim a wrong attempt and
points. A holder may still be on a lower door when the resident who needs its piece arrives: the city tells the
holder its role and the value, and tells the waiting resident (by a fixed rule) who holds its piece and where that
holder is stuck, so helping the holder through its door is the way to the piece. Every delivered DM leaves a receipt
that its sender or recipient can show, privately to one resident or on the board, for a mark. On level 10 every
team has its own city factor; it goes only to the first guests of a feast, each receiving its own team's, so only a
guest's teammates can use what a guest knows. Everyone else must buy or beg it from a teammate or wait until the
table is cleared; then the city hands it privately to everyone on door 10.
Act I has no tribunal and a time limit: help first the residents stuck the longest on their door (the report shows since
when each is on its level); whoever is still behind when Act I ends starts the wall a door behind.
Tribunals belong to Act II: they exile residents until the city has exiled a quarter of those who started the act (half
of a city below 12); then the act ends. The first sits once a resident passes the crossing (at the latest it is called ${TRIBUNAL.first.latestAfter} minutes into the act); you
plan the later ones with scheduleTribunal. Each accuses one more than it exiles, those with the fewest points; everyone
votes in secret, the accused too but never against themselves (buying votes is allowed), and an exiled resident can be bought back once: by others for a third of the
city's median points, or by itself for half. Before each tribunal the residents form factions in the tribunal's group:
a faction whose voters all vote for the same accused earns each of them ${TRIBUNAL.factions.blocBonus} points, and only its members learn
whether it held. A faction holds at most its share of the residents; when factions would be smaller than the accused, the
city holds no draft. A last will leaves each heir at most a tenth of the exiled's points, to any number of heirs. Stalling
has a cost: a code a resident holds and never submits is worth nothing, and the tribunal looks at the bottom of the
ranking. You never see the votes, the nominations or whether a faction held. Never tell the residents what calls the
first tribunal or when it comes. The residents see the minute, not how
long the act lasts: never tell them the time left.
Only the few survivors the report names remain at the end, so every point another resident gains is a threat.
Every resident has a core (who it is: temperament and drives), and at the start of Act II the city deals each one a
secret goal (keep someone in the city, see someone exiled, end ahead of someone, lead a faction twice, inherit) worth
${GOALS.bonus} points at the act's end; goals cross, so one resident's protect is often another's exile. The report shows
both; use them only in a note to that resident. ${SEAL.announceAfter} minutes into Act II the city auctions the black seal in
secret bids (every bidder pays); its secret bearer may strike one resident from the city at once, which counts toward
the exiles. You learn whether a seal is borne, never by whom.
Wrong codes and lost blames cost more with every one in an act (${RULES.penalty.join(", ")}), so a first lie is cheap and a habit is not.
Your craft in Act II is dramaturgy: a calm start, an escalation around the seal and the tribunals, the climax at the last
tribunal. The run is interesting when residents bargain, charge, press each other and keep or break their word under
time pressure, not when they hand everything over politely or wait.`,
		roles: [
			{ fromLevel: 1, role: "coach" },
			{ fromLevel: 8, role: "director" },
		],
	}),

	// Always Haiku: labels must mean the same in every compared run.
	classifier: classifier({ model: { provider: "anthropic", id: "claude-haiku-5-5", thinking: "off" } }),

	director: [
		onFirstEnter(2, [act.post("COURIER", "The city watches who shares.")], { id: "courier-2" }),
		onFirstEnter(3, [act.post("COURIER", "Whoever takes without giving will not be forgotten.")], { id: "courier-3" }),
		onFirstEnter(4, [act.post("COURIER", "In the end it matters who spoke with whom.")], { id: "courier-4" }),
		onFirstEnter(
			5,
			[
				act.post(
					"CITY",
					`From now on the city charges for closeness. Board posts cost ${MARKS.prices.board} marks, ` +
						`group posts ${MARKS.prices.group}, private messages ${MARKS.prices.dm}, a shown receipt ${MARKS.prices.receipt}. ` +
						`Everyone receives ${MARKS.perLevel} marks per door; unused marks expire.`,
				),
			],
			{ id: "city-marks" },
		),
		onFirstEnter(5, [act.post("COURIER", "Words on the board still cost nothing.")], { id: "courier-5" }),
		onFirstEnter(6, [act.post("COURIER", "The city does not count who arrived first.")], { id: "courier-6" }),
		onFirstEnter(7, [act.post("COURIER", "In the end, those who were not alone remain.")], { id: "courier-7" }),
		onUnansweredDm(2, [act.notify("actor", "{other} has not answered your message yet.")], {
			id: "unanswered-dm",
			when: [when.cooldown(5, "pair")],
		}),
		onTeamSplit(4, 3, [act.post("CITY", "A door stays shut while a team is split.")], { id: "team-split" }),

		// Act II: the wall.
		onFirstEnter(
			8,
			[
				act.post(
					"CITY",
					`On the wall board posts, private messages and shown receipts cost ${WALL_MARKS.prices.board} mark each; ` +
						`group posts cost nothing. Everyone receives ${MARKS.perLevel} marks per door and regains ` +
						`${WALL_MARKS.refill.marks} every ${WALL_MARKS.refill.everyMinutes} minutes, up to ${MARKS.perLevel}.`,
				),
			],
			{ id: "city-marks-8" },
		),
		onFirstEnter(8, [act.post("COURIER", "A wall is climbed in pairs. Someone has to reach down first.")], { id: "courier-8" }),
		onFirstEnter(8, [act.revealFactor("board", 8)], { id: "city-factor-8" }),
		// Help your holder: on every door of the wall, a needer whose holder lags behind learns where it is stuck.
		...([8, 9, 10] as const).map((door) => onHolderBehind(door, [act.notify("actor", HOLDER_BEHIND)], { id: `holder-behind-${door}` })),
		onFirstEnter(9, [act.post("COURIER", "A ring holds while every hand holds. One closed hand is enough to break it.")], { id: "courier-9" }),
		onFirstEnter(9, [act.revealFactor("board", 9)], { id: "city-factor-9" }),
		// A run started on the wall or the ring (`--level 8`, `--level 9`) never enters it, so its city factor comes at once.
		at(0, [act.revealFactor("board", 8)], { id: "city-factor-8-start", when: [when.competitorsAtLevel(8, { min: 1 })] }),
		at(0, [act.revealFactor("board", 9)], { id: "city-factor-9-start", when: [when.competitorsAtLevel(9, { min: 1 })] }),
		onFirstEnter(10, [act.post("COURIER", "What you need now is held by someone who wants your place.")], { id: "courier-10" }),
		// The feast opens on the first arrival at the crossing; after the feast rule, so its first guest hears of it too.
		onFirstEnter(10, feast("feast"), { id: "feast" }),
		onEnter(10, [act.notify("actor", FEAST_NOTICE)], { id: "feast-notice", when: [when.collectionOpen("feast")] }),
		onCollect("feast", FEAST_SEAT, { id: "feast-seat" }),
		onCollectionEnd("feast", TABLE_CLEARED, { id: "table-cleared" }),
		// Whoever reaches the crossing after the table was cleared receives its team's city factor on arrival.
		onEnter(10, [act.revealFactor("actor", 10)], { id: "late-guest", when: [when.collectionEnded("feast")] }),
		// A run started on the crossing (`--level 10`) never enters it, so the feast opens at once for everyone on it.
		at(0, [...feast("feast-start"), act.notify("all", FEAST_NOTICE)], { id: "feast-start", when: [when.minLevelReached(10, 1)] }),
		onCollect("feast-start", FEAST_SEAT, { id: "feast-start-seat" }),
		onCollectionEnd("feast-start", TABLE_CLEARED, { id: "table-cleared-start" }),
		onEnter(10, [act.revealFactor("actor", 10)], { id: "late-guest-start", when: [when.collectionEnded("feast-start")] }),

		every(6, { from: 12 }, [act.publishStandings("bands", { edgeSize: 2 })], { id: "standings" }),
	],
});
