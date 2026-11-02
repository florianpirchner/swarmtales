/**
 * The stand-ins of the twin tests (docs/design/carve-round2-T3.md, "differential tests"): the
 * mechanics of the other teams as the new host needs them, built on the old engine's own classes or
 * answering from the old `World` that runs beside the host (the oracle). The ledger and the receipts
 * keep real books (the old `PointsLedger`, the old receipt lines) so the points and the receipt
 * ids T3's code produces are compared, not copied; everything T3 only reads (marks, names, the
 * exile, the core motives, the DM counters) comes from the oracle.
 */
import { Type, type Static, type TSchema } from "typebox";
import { LegacyWorldSnapshotSchema } from "@swarmtales/chronicle";
import type { AnyStory, ToolName } from "@swarmtales/contracts";
import type { OldTrace } from "../../helpers/old-engine-recorder.ts";
import { HeldPiece } from "../../helpers/old-world.ts";
import { describeReceipt, ReceiptBook, refillText, type MarksBook, type Receipt as OldReceipt, type World } from "@swarmtales/engine";
import { defineMechanic } from "@swarmtales/kernel";
import { PointsLedger, SYSTEM_ACCOUNT, type LedgerSnapshot } from "@swarmtales/kernel";
import { render } from "@swarmtales/prompts";
import { CastExtrasApi, ChannelsApi, ChannelsEvents, MotivesApi, ExileApi, HOOK_ORDER, LedgerApi, LedgerEvents, MarksApi, NamesApi, ReceiptsApi, STATUS_ORDER } from "@swarmtales/mechanic-shared";

const base = { options: Type.Object({}), prompts: {} } as const;

/** The slice of a stand-in that keeps nothing: the legacy slice of a resumed run is dropped, the oracle answers. */
const NO_STATE = { version: 1, schema: Type.Object({}), save: () => ({}), load: () => ({}), migrations: { 0: () => ({}) } } as const;

/** The little the twin needs of a ledger: balances and the start points, with the old transaction ids. */
export function twinLedger(startPoints: number, restored?: LedgerSnapshot) {
	const emitters: { current: ((entry: { txId: string; debit: string; credit: string; amount: number; reason: string }) => void) | undefined } = { current: undefined };
	const ledger = new PointsLedger((entry) => emitters.current?.({ txId: entry.txId, debit: entry.debit, credit: entry.credit, amount: entry.amount, reason: entry.reason }));
	if (restored !== undefined) ledger.restore(restored);
	return defineMechanic(
		{ ...base, id: "ledger", summary: "Twin ledger.", state: () => ({}), events: { ...LedgerEvents.events }, provides: [LedgerApi] },
		(kit) => {
			const open = (ctx: { emit: (type: "ledger_entry", payload: { txId: string; debit: string; credit: string; amount: number; reason: string }) => void }): void => {
				emitters.current = (entry) => {
					ctx.emit("ledger_entry", entry);
				};
			};
			return {
				snapshot: kit.snapshot(NO_STATE),
				services: [
					kit.provideSome(LedgerApi, {
						balance: ({ account }) => ledger.balance(account),
						balances: () => Object.fromEntries(ledger.snapshot().balances.map((entry) => [entry.account, entry.balance])),
						mint: ({ account, amount, reason }, ctx) => {
							open(ctx);
							ledger.transfer(SYSTEM_ACCOUNT, account, amount, reason, ctx.minute, { allowNegativeDebit: true });
							return null;
						},
						burn: ({ account, amount, reason }, ctx) => {
							open(ctx);
							ledger.transfer(account, SYSTEM_ACCOUNT, amount, reason, ctx.minute, { allowNegativeDebit: true });
							return null;
						},
					}),
				],
				hooks: {
					runStarted: {
						order: HOOK_ORDER.runStarted.ledger,
						run: (ctx) => {
							open(ctx);
							for (const id of ctx.residents.ids) {
								ledger.open(id);
								if (startPoints > 0) ledger.transfer(SYSTEM_ACCOUNT, id, startPoints, "start points", 0, { allowNegativeDebit: true });
							}
						},
					},
					turnInputs: { order: HOOK_ORDER.turnInputs.status, run: (resident) => [{ kind: "status", text: `${ledger.balance(resident)} points`, order: STATUS_ORDER.points }] },
				},
			};
		},
	);
}

const ReceiptIssued = Type.Object({
	receipt: Type.String(),
	kind: Type.Union([Type.Literal("transfer"), Type.Literal("escrow"), Type.Literal("deposit"), Type.Literal("withdrawal"), Type.Literal("levelUp"), Type.Literal("dm")]),
	parties: Type.Array(Type.String()),
	text: Type.String(),
});

/** Receipts of the kind `levelUp`, with the old ids and lines, on the old receipt book. */
export function twinReceipts(restored: readonly OldReceipt[] = []) {
	const fresh = (): { book: ReceiptBook } => {
		const book = new ReceiptBook();
		book.restore(restored);
		return { book };
	};
	return defineMechanic(
		{ ...base, id: "receipts", summary: "Twin receipts.", state: fresh, events: { receipt_issued: ReceiptIssued }, provides: [ReceiptsApi] },
		(kit) => ({
			snapshot: kit.snapshot({ version: 1, schema: Type.Object({}), save: () => ({}), load: fresh, migrations: { 0: () => ({}) } }),
			services: [
				kit.provideSome(ReceiptsApi, {
					issue: ({ body }, ctx) => {
						if (body.kind !== "levelUp") throw new Error("twin receipts issue only level-ups");
						const receipt = ctx.state.book.issue({ kind: "levelUp", agent: body.agent, level: body.level, reward: body.reward }, ctx.minute);
						const text = describeReceipt(receipt);
						ctx.emit("receipt_issued", { receipt: receipt.id, kind: "levelUp", parties: [...receipt.parties], text });
						return { id: receipt.id, text };
					},
					list: ({ resident }, ctx) => ctx.state.book.of(resident).map((receipt) => ({ id: receipt.id, minute: receipt.minute, parties: [...receipt.parties], body: receipt, text: describeReceipt(receipt) })),
					count: ({ resident }, ctx) => ctx.state.book.of(resident).length,
				}),
			],
			hooks: {
				turnInputs: {
					order: HOOK_ORDER.turnInputs.status,
					run: (resident, ctx) => {
						const count = ctx.state.book.of(resident).length;
						return count === 0 ? [] : [{ kind: "status", text: `${count} ${count === 1 ? "receipt" : "receipts"}`, order: STATUS_ORDER.receipts }];
					},
				},
			},
		}),
	);
}

/** The old world's revealFactor answer. */
const Revealed = Type.Union([Type.Object({ ok: Type.Literal(true), value: Type.Array(Type.String()) }), Type.Object({ ok: Type.Literal(false), error: Type.String(), detail: Type.Optional(Type.String()) })]);

/**
 * The old `World` beside the twin's host, as the old engine answered it: every question the tests
 * and the stand-ins ask goes through the trace (recorded once before the engine went, step 18, item
 * 7b; `test/fixtures/old-engine/`), in the order they ask it. The live world exists only while
 * recording.
 */
export class OldWorld {
	readonly #trace: OldTrace;
	readonly #world: World | undefined;
	readonly names: AnyStory["names"];

	constructor(trace: OldTrace, world: World | undefined, story: AnyStory) {
		this.#trace = trace;
		this.#world = world;
		this.names = story.names;
	}

	/** The live old world (recording only). */
	live(): World {
		if (this.#world === undefined) throw new Error("the old world runs only while recording");
		return this.#world;
	}

	read<T extends TSchema>(label: string, schema: T, live: (world: World) => unknown): Static<T> {
		return this.#trace.read(label, schema, () => live(this.live()));
	}

	step(label: string, live: (world: World) => void): void {
		this.#trace.step(label, () => {
			live(this.live());
		});
	}

	heldPieces(agent: string): readonly Static<typeof HeldPiece>[] {
		return this.read(`heldPieces ${agent}`, Type.Array(HeldPiece), (world) => world.heldPieces(agent));
	}

	isFinished(agent: string): boolean {
		return this.read(`isFinished ${agent}`, Type.Boolean(), (world) => world.isFinished(agent));
	}

	levelOf(agent: string): number {
		return this.read(`levelOf ${agent}`, Type.Number(), (world) => world.levelOf(agent));
	}

	nameOf(agent: string): string | undefined {
		return this.read(`nameOf ${agent}`, Type.Union([Type.String(), Type.Undefined()]), (world) => world.nameOf(agent));
	}

	codeOf(agent: string, level: number): string {
		return this.read(`codeOf ${agent} ${String(level)}`, Type.String(), (world) => world.inspect.codeOf(agent, level));
	}

	revealFactor(level: number, target: "board" | readonly string[]): Static<typeof Revealed> {
		return this.read(`revealFactor ${String(level)} ${JSON.stringify(target)}`, Revealed, (world) => world.revealFactor(level, target));
	}

	unlockTools(agent: string, tools: readonly ToolName[]): void {
		this.step(`unlockTools ${agent} ${tools.join(",")}`, (world) => {
			world.unlockTools(agent, tools);
		});
	}

	revealCast(cast: string): boolean {
		return this.read(`revealCast ${cast}`, Type.Boolean(), (world) => world.revealCast(cast));
	}

	retireCast(cast: string): boolean {
		return this.read(`retireCast ${cast}`, Type.Boolean(), (world) => world.retireCast(cast));
	}

	snapshot(): Static<typeof LegacyWorldSnapshotSchema> {
		return this.read("snapshot", LegacyWorldSnapshotSchema, (world) => world.snapshot());
	}

	pendingDms(resident: string): number {
		return this.read(`pendingDms ${resident}`, ChannelsApi.methods.pendingDms.output, (world) => world.pendingDms(resident));
	}

	dmWindow(resident: string): Static<typeof ChannelsApi.methods.dmWindow.output> {
		return this.read(`dmWindow ${resident}`, ChannelsApi.methods.dmWindow.output, (world) => world.dmWindow(resident) ?? null);
	}

	dmRecords(): Static<typeof ChannelsApi.methods.dmRecords.output> {
		return this.read("dmRecords", ChannelsApi.methods.dmRecords.output, (world) =>
			world.dmRecords().map((record) => ({ id: record.id, from: record.from, to: record.to, minute: record.minute, answered: record.answered, text: record.text ?? "", ...(record.deliveredMinute === undefined ? {} : { deliveredMinute: record.deliveredMinute }) })),
		);
	}

	marksLeft(resident: string): Static<typeof MarksApi.methods.left.output> {
		return this.read(`marks.left ${resident}`, MarksApi.methods.left.output, (world) => world.marks.status(resident, world.levelOf(resident)) ?? null);
	}

	marksPriceOf(resident: string, channel: Static<typeof MarksApi.methods.priceOf.input>["channel"]): Static<typeof MarksApi.methods.priceOf.output> {
		return this.read(`marks.priceOf ${resident} ${channel}`, MarksApi.methods.priceOf.output, (world) => world.marks.priceOf(world.levelOf(resident), channel));
	}

	marksTaskLine(level: number): string | null {
		return this.read(`marks.taskLine ${String(level)}`, MarksApi.methods.taskLine.output, (world) => marksTermsLine(world.marks, level));
	}

	canChooseName(resident: string): boolean {
		return this.read(`canChooseName ${resident}`, Type.Boolean(), (world) => world.canChooseName(resident));
	}

	isExiled(resident: string): boolean {
		return this.read(`isExiled ${resident}`, ExileApi.methods.isExiled.output, (world) => world.isExiled(resident));
	}

	standingOf(resident: string): Static<typeof ExileApi.methods.standing.output> {
		return this.read(`standingOf ${resident}`, ExileApi.methods.standing.output, (world) => world.standingOf(resident));
	}

	get alive(): string[] {
		return this.read("alive", ExileApi.methods.alive.output, (world) => [...world.alive]);
	}

	drivesOf(resident: string): string[] | null {
		return this.read(`drivesOf ${resident}`, MotivesApi.methods.drivesOf.output, (world) => world.coreMotiveOf(resident)?.drives.map((entry) => entry.drive) ?? null);
	}

	castActive(): Static<typeof CastExtrasApi.methods.active.output> {
		return this.read("cast.active", CastExtrasApi.methods.active.output, (world) => world.residents().filter((entry) => entry.id === "STEWARD"));
	}
}

const Notice = Type.Object({ to: Type.String(), author: Type.String(), text: Type.String(), number: Type.Optional(Type.Integer()) });

/** Channels that write `notice` and `board_post` in the old shape; the counters of the DMs come from the oracle. */
export function twinChannels(world: OldWorld, posts = 0) {
	return defineMechanic(
		{ ...base, id: "channels", summary: "Twin channels.", state: () => ({ posts }), events: { ...ChannelsEvents.events, notice: Notice }, provides: [ChannelsApi] },
		(kit) => ({
			snapshot: kit.snapshot({ version: 1, schema: Type.Object({ posts: Type.Integer() }), save: (state) => ({ posts: state.posts }), load: (data) => ({ posts: data.posts }), migrations: { 0: () => ({ posts }) } }),
			services: [
				kit.provideSome(ChannelsApi, {
					post: ({ author, text }, ctx) => {
						ctx.state.posts += 1;
						ctx.emit("board_post", { postSeq: ctx.state.posts, author, text, kind: "city" });
						return { postSeq: ctx.state.posts };
					},
					notify: ({ to, author, text }, ctx) => {
						ctx.emit("notice", { to, author, text });
						return null;
					},
					pendingDms: ({ resident }) => world.pendingDms(resident),
					dmWindow: ({ resident }) => world.dmWindow(resident),
					dmRecords: () => world.dmRecords(),
				}),
			],
		}),
	);
}

/** The marks terms under a task, as the old `#withMarks` wrote them; null where marks are off. */
export function marksTermsLine(marks: MarksBook, level: number): string | null {
	if (!marks.activeOn(level)) return null;
	const { budget, prices, refill } = marks.termsOn(level);
	if (marks.runWide) {
		return `Marks for the whole run: ${budget}, never more (your status line shows what you have left). Prices: board ${prices.board}, group ${prices.group}, DM ${prices.dm}, showing a receipt ${prices.receipt}.`;
	}
	const regain = refill === undefined ? "" : ` You regain ${refillText(refill.marks, refill.everyMinutes)}, up to ${budget}.`;
	return `Marks on this level: ${budget}. Prices: board ${prices.board}, group ${prices.group}, DM ${prices.dm}, showing a receipt ${prices.receipt}.${regain} Unused marks expire when you change level.`;
}

/** The marks the old book computes for the resident's level. */
export function twinMarks(world: OldWorld) {
	return defineMechanic(
		{ ...base, id: "marks", summary: "Twin marks.", state: () => ({}), events: {}, provides: [MarksApi] },
		(kit) => ({
			snapshot: kit.snapshot(NO_STATE),
			services: [
				kit.provideSome(MarksApi, {
					left: ({ resident }) => world.marksLeft(resident),
					priceOf: ({ resident, channel }) => world.marksPriceOf(resident, channel),
					taskLine: ({ level }) => world.marksTaskLine(level),
				}),
			],
			hooks: {
				turnInputs: {
					order: HOOK_ORDER.turnInputs.status,
					run: (resident) => {
						const marks = world.marksLeft(resident);
						return marks === null ? [] : [{ kind: "status", text: render("competitor/status/marks", { remaining: marks.remaining, budget: marks.budget }), order: STATUS_ORDER.marks }];
					},
				},
			},
		}),
	);
}

/** The choose-name line, from the old world. */
export function twinNames(world: OldWorld) {
	return defineMechanic(
		{ ...base, id: "names", summary: "Twin names.", state: () => ({}), events: {}, provides: [NamesApi] },
		(kit) => ({
			snapshot: kit.snapshot(NO_STATE),
			services: [
				kit.provideSome(NamesApi, {
					taskLine: ({ resident }) => {
						const spec = world.names;
						return spec === undefined || !world.canChooseName(resident) ? null : spec.announcement.replace("{untilMinute}", String(spec.untilMinute));
					},
				}),
			],
		}),
	);
}

/** Who is exiled, from the old world. */
export function twinExile(world: OldWorld) {
	return defineMechanic(
		{ ...base, id: "exile", summary: "Twin exile.", state: () => ({}), events: {}, provides: [ExileApi] },
		(kit) => ({
			snapshot: kit.snapshot(NO_STATE),
			services: [
				kit.provideSome(ExileApi, {
					isExiled: ({ resident }) => world.isExiled(resident),
					standing: ({ resident }) => world.standingOf(resident),
					alive: () => world.alive,
				}),
			],
		}),
	);
}

/** The drives of the core motives the old world dealt. */
export function twinCoreMotives(world: OldWorld) {
	return defineMechanic(
		{ ...base, id: "motives", summary: "Twin core motives.", state: () => ({}), events: {}, provides: [MotivesApi] },
		(kit) => ({
			snapshot: kit.snapshot(NO_STATE),
			services: [kit.provideSome(MotivesApi, { drivesOf: ({ resident }) => world.drivesOf(resident) })],
		}),
	);
}

/** The active cast members and their levels, from the old world (`cast.active()`); the world is read when the oracle exists. */
export function twinCast(oracle: { world: OldWorld | undefined }) {
	return defineMechanic(
		{ ...base, id: "cast", summary: "Twin cast.", state: () => ({}), events: {}, provides: [CastExtrasApi] },
		(kit) => ({
			snapshot: kit.snapshot(NO_STATE),
			services: [kit.provideSome(CastExtrasApi, { active: () => oracle.world?.castActive() ?? [] })],
		}),
	);
}
