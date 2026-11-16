// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * Carried from `legacy` `stories/cityofkeys/story.ts` (`12-m5-spec.md` 3.1): the story data of the City as typed
 * constants, its texts byte for byte; `carried.test.ts` pins that it serialises to
 * `oracles/cityofkeys/setup/cityofkeys.story.json`. The old `defineStory` and the sdk helpers are carried in
 * `story/define.ts`, the characters in `story/characters.ts`; the old `satisfies` of the sdk types is dropped. The
 * old file is split by the file limit, its parts in their old order: `story/rules.ts` (tools, marks, rules, puzzles
 * and shared texts), `story/feast.ts`, `story/tribunal.ts`, `story/levels.ts` and `story/director.ts`.
 *
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
import { classifier, defineCity, gamemaker } from "./story/define.ts";
import { MOTIVES, GOALS, SEAL } from "./story/characters.ts";
import { DIRECTOR } from "./story/director.ts";
import { LEVELS } from "./story/levels.ts";
import { RULES } from "./story/rules.ts";
import { TRIBUNAL } from "./story/tribunal.ts";

/** Characters, never strategies (SPEC 5.2): temperament, values and voice only. */
const PERSONAS = [
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


/** The story data of the City (the old default export of `stories/cityofkeys/story.ts`). */
export const CITY = defineCity({
	id: "cityofkeys",
	title: "The City of Keys",
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
	// v09: a core motive for every resident from the first act on, a secret goal and the black seal in Act II.
	coreMotives: MOTIVES,
	goals: GOALS,
	seal: SEAL,
	finishedNotice:
		"You have passed the wall, the last door the city has built so far. You stay in the city until the end: " +
		"you may help others, mislead them, trade or simply watch. No new tasks will come for you.",

	levels: LEVELS,


	acts: [
		// v08: a brake; whoever is still behind after 25 minutes starts the wall a door behind (Act I v2 took 12 with 6).
		{ title: "Act I - Learning to talk", fromLevel: 1, maxMinutes: 25 },
		{ title: "Act II - The wall", fromLevel: 8 },
	],

	// The same model in every run, whoever plays, so compared runs share their gamemaker.
	gamemaker: gamemaker({
		// P52: high thinking needs room for the tool calls after it; at 4000 the turn ended before any call.
		// 393216 is the most OpenRouter allows for this model (Flo: no tight cap).
		model: { provider: "openrouter", id: "deepseek/deepseek-v4.1-flash-1017", thinking: "high", maxOutputTokens: 393_216 },
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
Every resident has a core motive (who it is: temperament and drives), and at the start of Act II the city deals each one a
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


	director: DIRECTOR,
});
