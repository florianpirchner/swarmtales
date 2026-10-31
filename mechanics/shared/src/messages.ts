/**
 * The APIs of team T2 (messages): channels, petitions, cast. FROZEN in wave 3.0; a change goes
 * through the integration owner (docs/design/carve-plan.md, "Shared files"). Each method names the
 * old `World` code it replaces.
 */
import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";
import { command, query } from "./method.ts";
import { DmRecord, Done, OfResident, ResidentId } from "./schemas.ts";

const Author = Type.String({ description: "A resident id, a cast member or a system author (CITY, COURIER)." });

/** The DM cap's current window (old `DmWindow`): `sent` DMs and memo transfers since `from`, at most `limit` until `until`. */
export const DmWindow = Type.Object({ sent: Type.Integer(), limit: Type.Integer(), from: Type.Integer(), until: Type.Integer() });

/** Board, DMs, notices and groups (step 4). */
export const ChannelsApi = defineApi({
	name: "channels",
	summary: "The board, direct messages, notices and groups.",
	methods: {
		post: command("A post by the city, the courier or a cast member (old `postAsSystem`); writes `board_post` with kind `city`.", Type.Object({ author: Author, text: Type.String() }), Type.Object({ postSeq: Type.Integer() })),
		notify: command("A private city notice (old `notify`); writes `notice` without a number.", Type.Object({ to: ResidentId, author: Author, text: Type.String() }), Type.Null()),
		note: command("A numbered private notice, the gamemaker's (old `note`); writes `notice` with the next message number.", Type.Object({ to: ResidentId, author: Author, text: Type.String() }), Type.Object({ number: Type.Integer() })),
		deliver: command(
			"A DM from someone who is not a resident, a cast member say (old `castDm`): delivered always, no cap or marks; writes `dm_sent` with the next message number.",
			Type.Object({ from: Author, to: ResidentId, text: Type.String() }),
			Type.Object({ number: Type.Integer() }),
		),
		takeNumber: command("The next message number, for a message another mechanic writes (old `#numbers.next`, the cast's `cast_dm`).", Type.Object({}), Type.Integer()),
		dmWindow: query("The resident's DM cap window, or null without a cap (old `dmWindow`).", OfResident, Type.Union([DmWindow, Type.Null()])),
		dmRecords: query("Every DM the city recorded (old `dmRecords`).", Type.Object({}), Type.Array(DmRecord)),
		createCityGroup: command("A group the city founds (old `createCityGroup`); writes `group_created`.", Type.Object({ name: Type.String(), members: Type.Array(ResidentId) }), Type.Object({ group: Type.String() })),
		removeCityGroup: command("Removes a city group (old `removeCityGroup`); writes `group_removed`.", Type.Object({ group: Type.String() }), Type.Null()),
		postGroupAsCity: command("The city posts in a group (old `postGroupAsCity`); writes `group_post`.", Type.Object({ group: Type.String(), text: Type.String() }), Type.Null()),
	},
});

/** Petitions (step 9). The script opens them and runs their `onPass`/`onFail` actions on `petition_resolved`. */
export const PetitionsApi = defineApi({
	name: "petitions",
	summary: "Petitions residents sign.",
	methods: {
		open: command(
			"Opens a petition (old `openPetition`); writes `petition_opened`.",
			Type.Object({
				id: Type.String(),
				text: Type.String(),
				threshold: Type.Union([Type.Object({ count: Type.Integer({ minimum: 1 }) }), Type.Object({ fraction: Type.Number({ exclusiveMinimum: 0, maximum: 1 }) })]),
				deadlineMinute: Type.Integer(),
				visibility: Type.Union([Type.Literal("public"), Type.Literal("secret")]),
				against: Type.Optional(Type.Array(Type.String())),
			}),
			Done,
		),
	},
});

/** Cast members (step 8): figures the director plays, their collections and lotteries. */
export const CastApi = defineApi({
	name: "cast",
	summary: "The cast: figures, their escrow, collections and lotteries.",
	methods: {
		isActive: query("Whether a resident may write to this cast member now (old `cast.isActive`); channels routes such DMs here.", Type.Object({ cast: Type.String() }), Type.Boolean()),
		receive: command(
			"A resident's DM to a cast member (old `#dmToCast` after the checks): collected while a collection runs; writes `cast_dm` with the number channels took.",
			Type.Object({ from: ResidentId, cast: Type.String(), text: Type.String(), number: Type.Integer() }),
			Type.Object({ collections: Type.Array(Type.String()), newSender: Type.Array(Type.String()) }),
		),
		setLevel: command("Old `setCastLevel`; writes `cast_level_set`.", Type.Object({ cast: Type.String(), level: Type.Integer() }), Type.Null()),
		reveal: command("Old `revealCast`; writes `cast_revealed`.", Type.Object({ cast: Type.String() }), Type.Boolean()),
		retire: command("Old `retireCast`; writes `cast_retired`.", Type.Object({ cast: Type.String() }), Type.Boolean()),
		escrow: command("Pays a resident from the cast member's escrow (old `escrowTransfer`).", Type.Object({ cast: Type.String(), to: ResidentId, amount: Type.Number({ exclusiveMinimum: 0 }) }), Done),
		startCollection: command(
			"Old `startCollection`; writes `collection_started`.",
			Type.Object({
				into: Type.String(),
				cast: Type.String(),
				first: Type.Integer(),
				untilMinute: Type.Integer(),
				distinctSenders: Type.Boolean(),
				afterSolve: Type.Optional(Type.Object({ level: Type.Integer(), minutes: Type.Integer() })),
			}),
			Type.Boolean(),
		),
		shortenCollection: command("Old `shortenCollection`; writes `collection_shortened`.", Type.Object({ into: Type.String(), untilMinute: Type.Integer() }), Type.Null()),
		revealCollection: command("Old `revealCollection`; writes `collection_revealed`.", Type.Object({ into: Type.String(), header: Type.Optional(Type.String()) }), Done),
		drawLottery: command("Old `drawLottery` (stream `lottery`, into, salt, minute); writes `lottery_drawn`.", Type.Object({ into: Type.String(), salt: Type.String() }), Type.Union([ResidentId, Type.Null()])),
	},
});
