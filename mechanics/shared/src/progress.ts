/**
 * The APIs of team T3 (progress): puzzles, progression, goals. FROZEN in wave 3.0; a change goes
 * through the integration owner (docs/design/carve-plan.md, "Shared files"). Each method names the
 * old `World` code it replaces.
 */
import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";
import { command, query } from "./method.ts";
import { OfResident, RankEntry, ResidentId } from "./schemas.ts";

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
	},
});

/** Goals (step 8). */
export const GoalsApi = defineApi({
	name: "goals",
	summary: "Secret goals per resident.",
	methods: {
		onExiled: command("A resident left the city: its goal is void and read out (old `goals.onExiled`); writes `goal_resolved`.", OfResident, Type.Null()),
	},
});
