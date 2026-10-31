/**
 * The APIs of team T2 (messages): channels, petitions, cast. FROZEN in wave 3.0; a change goes
 * through the integration owner (docs/design/carve-plan.md, "Shared files"). Each method names the
 * old `World` code it replaces.
 */
import { Type } from "typebox";
import { defineApi } from "@swarmtales/kernel";
import { command, query } from "./method.ts";
import { BoardPost, DmRecord, Done, GroupPost, OfResident, ResidentId } from "./schemas.ts";

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
		dmRecord: query("The DM with this message number, or null (old `#dms.find`); a cast member's DM has none.", Type.Object({ number: Type.Integer() }), Type.Union([DmRecord, Type.Null()])),
		boardPost: query("The board post with this message number, or null (old `board.get`).", Type.Object({ number: Type.Integer() }), Type.Union([BoardPost, Type.Null()])),
		groupPost: query("The group post with this message number, or null (old `groups.postByNumber`).", Type.Object({ number: Type.Integer() }), Type.Union([GroupPost, Type.Null()])),
		couldRead: query("Whether `reader` could read post `number` of `group` (a member then; old `groups.couldRead`).", Type.Object({ group: Type.String(), reader: ResidentId, number: Type.Integer() }), Type.Boolean()),
		lastNumber: query("The city's last message number, over DMs, notes, board and group posts (old `#numbers.last`).", Type.Object({}), Type.Integer()),
		pendingDms: query("DMs waiting in the resident's inbox (old `pendingDms`; `getStatus` shows them).", OfResident, Type.Integer()),
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

/** Character cores (step 9): what the goals and the gamemaker's privacy check read of a core. */
export const MotivesApi = defineApi({
	name: "motives",
	summary: "The character core of each resident.",
	methods: {
		drivesOf: query("The drive ids of the resident's core, the strongest first, or null without a core (the goals deal follows them).", OfResident, Type.Union([Type.Array(Type.String()), Type.Null()])),
		cuesOf: query("The lower-case cue words of the resident's drives (the gamemaker's `characterLeaks` check).", OfResident, Type.Array(Type.String())),
	},
});

/** Where a gamemaker note goes: a resident, the board, or a tribunal's lines (old `NoteTarget`). */
export const NoteTarget = Type.Union([ResidentId, Type.Literal("board"), Type.Literal("tribunal")]);

/**
 * The gamemaker's note desk (step 17, provided by channels): the old `#checked` text checks, the
 * note budgets (a sliding window per recipient, not a host limit) and `gamemaker_note`. Every
 * gamemaker tool of every mechanic that writes a text calls `check` in its `rule` and `record`
 * after it wrote.
 */
export const NotesApi = defineApi({
	name: "notes",
	summary: "The gamemaker's notes: text checks, budgets and the note log.",
	methods: {
		check: query(
			"Old `#checked`: trims the text, strips a signature or `<author|CITY|city> minute N:` heading, and refuses an empty or long text, a dealt secret, a private thought, a core or goal, the whisperer's role, or a repeat to `as` (default `to`).",
			Type.Object({ text: Type.String(), to: NoteTarget, as: Type.Optional(NoteTarget) }),
			Type.Union([Type.Object({ ok: Type.Literal(true), text: Type.String() }), Type.Object({ ok: Type.Literal(false), code: Type.String(), detail: Type.String() })]),
		),
		budget: query("Notes to `to` within the current sliding window and the limit (old `#used`, `notesPerAgent` or `boardPosts`).", Type.Object({ to: NoteTarget }), Type.Object({ used: Type.Integer(), limit: Type.Integer() })),
		record: command(
			"Records a note under `to` (its budget and repeats) and writes `gamemaker_note` as sent to `shown` (default `to`; the board for a tribunal's lines) (old `#deliver`).",
			Type.Object({ to: NoteTarget, text: Type.String(), number: Type.Integer(), shown: Type.Optional(NoteTarget) }),
			Type.Null(),
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
		collected: command(
			"Channels spent the DM's marks: `from` is a new sender in `into` (the `newSender` of `receive`); writes the silent `cast_collected` the script's `onCollect` rules react to.",
			Type.Object({ from: ResidentId, cast: Type.String(), into: Type.Array(Type.String()) }),
			Type.Null(),
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
