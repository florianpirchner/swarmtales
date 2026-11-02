/**
 * The APIs of team T3 (progress): puzzles, progression, goals. FROZEN in wave 3.0; a change goes
 * through the integration owner (docs/design/carve-plan.md, "Shared files"). Each method names the
 * old `World` code it replaces.
 */
import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";
import { command, query } from "./method.ts";
import { HeldPiece, OfResident, RankEntry, ResidentId } from "./schemas.ts";

const Level = Type.Integer({ minimum: 1 });

/** A team of a level (old `Team`, teams.ts). */
export const Team = Type.Object({ members: Type.Array(ResidentId), leader: ResidentId });

/** Deals, secrets and exclusions (step 6). */
export const PuzzlesApi = defineApi({
	name: "puzzles",
	summary: "The deal of each level: fragments, factors, teams and who is excluded.",
	methods: {
		deal: command("Deals a level once (old `#dealLevel`, stream `puzzle`, level); writes `fragments_dealt` or `factors_dealt`.", Type.Object({ level: Level }), Type.Null()),
		isDealt: query("Old `isDealt`.", Type.Object({ level: Level }), Type.Boolean()),
		solutionOf: query("The code that passes the level for the resident, or null (old `#solutionOf`).", Type.Object({ resident: ResidentId, level: Level }), Type.Union([Type.String(), Type.Null()])),
		teamOf: query("The resident's team on a level (old `teamOf`).", Type.Object({ resident: ResidentId, level: Level }), Team),
		passwordPiece: query("Whether a token is part of a dealt password, so names leaves it as written (old `#isPasswordPiece`).", Type.Object({ token: Type.String() }), Type.Boolean()),
		lacking: query("Who still lacks the holder's fragment of a level (old `lackingFragment`).", Type.Object({ level: Level, holder: ResidentId }), Type.Array(ResidentId)),
		carriesSecret: query("Whether a text carries a run of the resident's secrets (old `receiptCarriesFragment`, the leaked-run check).", Type.Object({ resident: ResidentId, text: Type.String(), minRun: Type.Integer({ minimum: 1 }) }), Type.Boolean()),
		burn: command(
			"A piece burns with its exiled holder (old `#onExiled`); writes `factor_burned`.",
			Type.Object({ agent: ResidentId, level: Level, piece: Type.String(), needers: Type.Array(ResidentId) }),
			Type.Null(),
		),
		contract: command("After an exile, the roles of the excluded pass on for a level nobody left has reached (old `#onExiled`); writes `level_contracted`.", Type.Object({ level: Level, excluded: Type.Array(ResidentId) }), Type.Null()),
		kindOf: query("The puzzle kind of a level: `none` while it is not dealt (T3 request 1).", Type.Object({ level: Level }), Type.Union([Type.Literal("fragments"), Type.Literal("additive"), Type.Literal("none")])),
		taskValues: query(
			"The task placeholders a puzzle fills for a resident (old `#puzzleValues`); empty strings on a level not dealt (T3 request 2).",
			Type.Object({ resident: ResidentId, level: Level }),
			Type.Object({ length: Type.String(), overlap: Type.String(), fragment: Type.String(), digits: Type.String(), factors: Type.String() }),
		),
		holders: query(
			"Who holds what the resident needs on an additive level, besides itself (old `#holdersOf`; T3 request 3).",
			Type.Object({ resident: ResidentId, level: Level }),
			Type.Array(Type.Object({ holder: ResidentId, piece: Type.Union([Type.Literal("counter-factor"), Type.Literal("team certificate")]), value: Type.String() })),
		),
		revealFactor: command(
			"Releases the city factor of an additive level (old `revealFactor`); writes `factor_revealed` (T3 request 4).",
			Type.Object({ level: Level, target: Type.Union([Type.Literal("board"), Type.Array(ResidentId)]) }),
			Type.Union([Type.Object({ ok: Type.Literal(true), agents: Type.Array(ResidentId) }), Type.Object({ ok: Type.Literal(false), code: Type.String(), detail: Type.String() })]),
		),
		heldPieces: query(
			"Old `heldPieces`: every piece the resident holds for others, by level; needers in team-member order (fragments) or holding order (certificates, counters). Uses `ProgressionApi.levelOf` (T4 request R1).",
			OfResident,
			Type.Array(HeldPiece),
		),
		fragmentOf: query("The resident's own fragment of a fragments level, or null.", Type.Object({ resident: ResidentId, level: Level }), Type.Union([Type.String(), Type.Null()])),
		inherited: query(
			"Fragments of excluded or struck teammates the resident holds now (old `#inheritedFragments`): `[from, fragment]` in order.",
			Type.Object({ resident: ResidentId, level: Level }),
			Type.Array(Type.Object({ from: ResidentId, fragment: Type.String() })),
		),
		openFragmentDoors: query("Every fragments level whose door is open on the clock, ascending (old `#openFragmentDoors`, the holdout's doors).", Type.Object({}), Type.Array(Type.Integer())),
		secrets: query(
			"Every secret of the dealt levels, ascending by level (old gamemaker `#secretGuard`): the passwords of fragment levels and the all-digit values of additive deals (old `dealValues`); the note desk's leak check (round 2, R2-D8).",
			Type.Object({}),
			Type.Object({ passwords: Type.Array(Type.String()), numbers: Type.Array(Type.String()) }),
		),
		isHandover: query("Whether a text hands over a dealt fragment (old `isHandover`: a run of `HANDOVER_RUN` of any fragment, in its code-like forms); the whisper tally leaves such DMs out (T1 request 13).", Type.Object({ text: Type.String() }), Type.Boolean()),
	},
});

/** Levels, submissions, doors and acts (step 7). Progression also owns the status line's frame and the `task` input kind. */
export const ProgressionApi = defineApi({
	name: "progression",
	summary: "Levels, submissions, doors, acts and the ranking.",
	methods: {
		levelOf: query("Old `levelOf`.", OfResident, Type.Integer()),
		isFinished: query("Old `isFinished`.", OfResident, Type.Boolean()),
		hasPassed: query("Old `hasPassed`.", Type.Object({ resident: ResidentId, level: Level }), Type.Boolean()),
		hasSolved: query("Whether the resident solved `level` itself (old `solved.includes(level)`); `hasPassed` is also true beyond it or at a shut door without a solve (A1-6, the seats rule).", Type.Object({ resident: ResidentId, level: Level }), Type.Boolean()),
		passed: query("Who passed a level, in the order they passed (the tribunal's `passed`).", Type.Object({ level: Level }), Type.Array(ResidentId)),
		lastProgress: query("The minute the resident last passed a level, or null (the tribunal's `lastProgress`).", OfResident, Type.Union([Type.Integer(), Type.Null()])),
		currentAct: query("Old `currentAct`.", Type.Object({}), Type.Integer()),
		actStart: query("The first minute of the act that starts at `fromLevel`, or null (old `actStartOf`).", Type.Object({ fromLevel: Level }), Type.Union([Type.Integer(), Type.Null()])),
		door: query("The snapshot door, or null (old `door`).", Type.Object({}), Type.Union([Level, Type.Null()])),
		doorShut: query("Whether a door holds residents back now (the tribunal's `doorShut`).", Type.Object({}), Type.Boolean()),
		openDoor: command("Old `openDoor`.", Type.Object({}), Type.Boolean()),
		releaseDoor: command("Old `releaseDoor`.", Type.Object({}), Type.Null()),
		unlock: command("Old `unlockTools` (and `ctx.access.unlock`); writes `tools_unlocked`.", Type.Object({ resident: ResidentId, tools: Type.Array(Type.String()) }), Type.Null()),
		ranking: query("Old `ranking`.", Type.Object({}), Type.Array(RankEntry)),
		holdersBehind: query(
			"Holders of the resident's pieces still below `level` (old `holdersBehind`, the script's `onHolderBehind`).",
			Type.Object({ resident: ResidentId, level: Level }),
			Type.Array(Type.Object({ holder: ResidentId, level: Type.Integer(), piece: Type.String() })),
		),
		firstSolveMinute: query("The minute the first resident passed a level, or null (old `firstSolveMinute`).", Type.Object({ level: Level }), Type.Union([Type.Integer(), Type.Null()])),
		nextPenalty: query("What the resident's next wrong code in this act costs (old `nextPenalty`, the offences ladder; T3 request 5).", OfResident, Type.Number()),
		nextBlamePenalty: query("What the resident pays for its next lost blame in this act (old `nextBlamePenalty`); 0 without a blame ladder. The task's `{blamePenalty}`.", OfResident, Type.Number()),
		chargeBlame: command("A lost blame: returns its price, and the act's count climbs (old `#chargeBlame`; receipts calls it through `uses`, T1 R-7, T3 R-6).", OfResident, Type.Number()),
		endAct: command("The act starting at `fromLevel` is over (old `#endAct`: the tribunal reached its target); writes `act_ended`; false when it was over already (T3 request 7).", Type.Object({ fromLevel: Level }), Type.Boolean()),
		isOpenOnClock: query("Whether the level's door is open on the door clock (old `isOpenOnClock`).", Type.Object({ level: Level }), Type.Boolean()),
		opensAt: query("The minute the level's door opens on the door clock; 0 without one (old `opensAt`).", Type.Object({ level: Level }), Type.Integer()),
		bounds: query("The run's first and last level and how many residents the story keeps (`run.survivors`; T4 request R7).", Type.Object({}), Type.Object({ startLevel: Level, lastLevel: Level, survivors: Type.Integer({ minimum: 0 }) })),
	},
});

/** Goals (step 8). */
export const GoalsApi = defineApi({
	name: "goals",
	summary: "Secret goals per resident.",
	methods: {
		onExiled: command("A resident left the city: its goal is void and read out (old `goals.onExiled`); writes `goal_resolved`.", OfResident, Type.Null()),
		noteLeaders: command("Faction leaders of a tribunal: one more leadership each in every running act (old `noteLeaders`; tribunal calls it on `faction_leaders`).", Type.Object({ leaders: Type.Array(ResidentId) }), Type.Null()),
		noteHeir: command("A last will left the resident something (old `noteHeir`; exile calls it once per heir).", Type.Object({ heir: ResidentId }), Type.Null()),
		goalOf: query("The goal the resident holds in an act still running, in the story's words, or null (old `goalOf`: status part, the gamemaker's privacy check).", OfResident, Type.Union([Type.Object({ act: Type.Integer(), kind: Type.String(), target: Type.Optional(ResidentId), text: Type.String() }), Type.Null()])),
	},
});
