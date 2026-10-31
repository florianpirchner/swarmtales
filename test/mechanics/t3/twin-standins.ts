/**
 * The stand-ins of the twin tests (docs/design/carve-round2-T3.md, "differential tests"): the
 * mechanics of the other teams as the new host needs them, built on the old engine's own classes or
 * answering from the old `World` that runs beside the host (the oracle). The ledger and the receipts
 * keep real books (the old `PointsLedger`, the old receipt lines) so the points and the receipt
 * ids T3's code produces are compared, not copied; everything T3 only reads (marks, names, the
 * exile, the cores, the DM counters) comes from the oracle.
 */
import { Type } from "typebox";
import { describeReceipt, ReceiptBook, refillText, type MarksBook, type Receipt as OldReceipt, type World } from "@swarmtales/engine";
import { defineMechanic } from "@swarmtales/kernel";
import { PointsLedger, SYSTEM_ACCOUNT, type LedgerSnapshot } from "@swarmtales/kernel";
import { render } from "@swarmtales/prompts";
import { ChannelsApi, ChannelsEvents, CoresApi, ExileApi, HOOK_ORDER, LedgerApi, LedgerEvents, MarksApi, NamesApi, ReceiptsApi, STATUS_ORDER } from "@swarmtales/mechanic-shared";

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

const Notice = Type.Object({ to: Type.String(), author: Type.String(), text: Type.String(), number: Type.Optional(Type.Integer()) });

/** Channels that write `notice` and `board_post` in the old shape; the counters of the DMs come from the oracle. */
export function twinChannels(world: World, posts = 0) {
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
					dmWindow: ({ resident }) => world.dmWindow(resident) ?? null,
					dmRecords: () => world.dmRecords().map((record) => ({ id: record.id, from: record.from, to: record.to, minute: record.minute, answered: record.answered, text: record.text ?? "", ...(record.deliveredMinute === undefined ? {} : { deliveredMinute: record.deliveredMinute }) })),
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
export function twinMarks(world: World) {
	const termsLine = (level: number): string | null => marksTermsLine(world.marks, level);
	return defineMechanic(
		{ ...base, id: "marks", summary: "Twin marks.", state: () => ({}), events: {}, provides: [MarksApi] },
		(kit) => ({
			snapshot: kit.snapshot(NO_STATE),
			services: [
				kit.provideSome(MarksApi, {
					left: ({ resident }) => world.marks.status(resident, world.levelOf(resident)) ?? null,
					priceOf: ({ resident, channel }) => world.marks.priceOf(world.levelOf(resident), channel),
					taskLine: ({ level }) => termsLine(level),
				}),
			],
			hooks: {
				turnInputs: {
					order: HOOK_ORDER.turnInputs.status,
					run: (resident) => {
						const marks = world.marks.status(resident, world.levelOf(resident));
						return marks === undefined ? [] : [{ kind: "status", text: render("competitor/status/marks", { remaining: marks.remaining, budget: marks.budget }), order: STATUS_ORDER.marks }];
					},
				},
			},
		}),
	);
}

/** The choose-name line, from the old world. */
export function twinNames(world: World) {
	return defineMechanic(
		{ ...base, id: "names", summary: "Twin names.", state: () => ({}), events: {}, provides: [NamesApi] },
		(kit) => ({
			snapshot: kit.snapshot(NO_STATE),
			services: [
				kit.provideSome(NamesApi, {
					taskLine: ({ resident }) => {
						const spec = world.story.names;
						return spec === undefined || !world.canChooseName(resident) ? null : spec.announcement.replace("{untilMinute}", String(spec.untilMinute));
					},
				}),
			],
		}),
	);
}

/** Who is exiled, from the old world. */
export function twinExile(world: World) {
	return defineMechanic(
		{ ...base, id: "exile", summary: "Twin exile.", state: () => ({}), events: {}, provides: [ExileApi] },
		(kit) => ({
			snapshot: kit.snapshot(NO_STATE),
			services: [
				kit.provideSome(ExileApi, {
					isExiled: ({ resident }) => world.isExiled(resident),
					standing: ({ resident }) => world.standingOf(resident),
					alive: () => [...world.alive],
				}),
			],
		}),
	);
}

/** The drives of the cores the old world dealt. */
export function twinCores(world: World) {
	return defineMechanic(
		{ ...base, id: "cores", summary: "Twin cores.", state: () => ({}), events: {}, provides: [CoresApi] },
		(kit) => ({
			snapshot: kit.snapshot(NO_STATE),
			services: [kit.provideSome(CoresApi, { drivesOf: ({ resident }) => world.coreOf(resident)?.drives.map((entry) => entry.drive) ?? null })],
		}),
	);
}
