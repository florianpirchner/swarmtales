/**
 * White-box readers for tests on the new host (step 18): what the old tests asked the old `World`
 * (`world.inspect.codeOf`, `world.levelOf`, `world.ledger.balance`, `world.board.all`, ...), read
 * from the host's facts and log instead. Facts are untrusted `unknown` values, so every reader parses
 * them with Typebox.
 */
import type { AssistantMessage } from "@earendil-works/pi-ai";
import { Type, type Static, type TSchema } from "typebox";
import { Check } from "typebox/value";
import type { Host, ResidentId } from "@swarmtales/contracts";
import { solutionsFrom } from "@swarmtales/mechanic-puzzles";
import { act, type Script } from "@swarmtales/models";

type FactsHost = Pick<Host, "fact">;

/** One fact, parsed; throws when the fact is missing or has another shape. */
export function factOf<T extends TSchema>(host: FactsHost, key: string, schema: T): Static<T> {
	const value = host.fact(key);
	if (!Check(schema, value)) throw new Error(`fact ${key} is missing or has an unexpected shape: ${JSON.stringify(value)}`);
	return value;
}

/** A resident's own fragment of a dealt fragments level (old `world.inspect.fragmentOf`). */
export function fragmentOf(host: FactsHost, agent: ResidentId, level: number): string {
	const fragment = solutionsFrom(host.fact("puzzles.solutions")).find((entry) => entry.agent === agent && entry.level === level)?.fragment;
	if (fragment === undefined || fragment === null) throw new Error(`${agent} has no fragment on level ${String(level)}`);
	return fragment;
}

/** A resident's code of a dealt level (old `world.inspect.codeOf`). */
export function codeOf(host: FactsHost, agent: ResidentId, level: number): string {
	const code = solutionsFrom(host.fact("puzzles.solutions")).find((entry) => entry.agent === agent && entry.level === level)?.code;
	if (code === undefined || code === null) throw new Error(`${agent} has no code on level ${String(level)}`);
	return code;
}

/** One assistant message that submits the resident's own solution (password or code) for `level`. */
export function submit(host: FactsHost, agent: ResidentId, level: number): AssistantMessage {
	return act({ name: "submitSolution", args: { level, code: codeOf(host, agent, level) } });
}

/** Every resident submits its own solution, one level per minute. */
export function solveEveryLevel(host: Pick<Host, "fact" | "residents">, levels: readonly number[]): Script {
	const script: Record<string, AssistantMessage[]> = {};
	for (const id of host.residents) script[id] = levels.map((level) => submit(host, id, level));
	return script;
}

/** Same length as the password but certainly wrong. */
export function wrongCodeOf(password: string): string {
	return (password.startsWith("A") ? "B" : "A") + password.slice(1);
}

const Levels = Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer(), held: Type.Boolean() }));

/** A resident's current level (old `world.levelOf`). */
export function levelOf(host: FactsHost, agent: ResidentId): number {
	const entry = factOf(host, "progression.levels", Levels).find((row) => row.agent === agent);
	if (entry === undefined) throw new Error(`${agent} has no level`);
	return entry.level;
}

const Balances = Type.Record(Type.String(), Type.Number());

const Rewards = Type.Object({ rules: Type.Object({ rewards: Type.Array(Type.Object({ level: Type.Integer(), reward: Type.Number() })) }, { additionalProperties: true }) }, { additionalProperties: true });

/** A level's reward (old `world.currentProblem(agent).reward`). */
export function rewardOf(host: FactsHost, level: number): number | undefined {
	return factOf(host, "progression.section", Rewards).rules.rewards.find((entry) => entry.level === level)?.reward;
}

/** A resident's points (old `world.ledger.balance`). */
export function balanceOf(host: FactsHost, agent: ResidentId): number {
	return factOf(host, "ledger.balances", Balances)[agent] ?? 0;
}

/** The points of every resident together (old `world.ledger.total`). */
export function totalPoints(host: FactsHost): number {
	return Object.values(factOf(host, "ledger.balances", Balances)).reduce((sum, points) => sum + points, 0);
}

/** Whether a resident has passed the run's last level (old `world.isFinished`). */
export function isFinished(run: { readonly host: FactsHost; readonly effective: { readonly lastLevel: number } }, agent: ResidentId): boolean {
	return levelOf(run.host, agent) > run.effective.lastLevel;
}

const Receipt = Type.Object({ receipt: Type.String(), kind: Type.String(), parties: Type.Array(Type.String()) }, { additionalProperties: true });

/** The receipt of the first DM `from` sent `to` (old `world.receiptsOf`). */
export function dmReceiptOf(host: Pick<Host, "log">, from: ResidentId, to: ResidentId): string | undefined {
	for (const event of host.log.ofType("receipts", "receipt_issued")) {
		const payload = event.payload;
		if (Check(Receipt, payload) && payload.kind === "dm" && payload.parties[0] === from && payload.parties[1] === to) return payload.receipt;
	}
	return undefined;
}

/** The receipts a resident is a party of, in issue order (old `world.receiptsOf`), from the log's `receipt_issued` lines. */
export function receiptsOf(host: Pick<Host, "log">, agent: ResidentId): readonly Static<typeof Receipt>[] {
	return host.log
		.ofType("receipts", "receipt_issued")
		.map((event) => event.payload)
		.filter((payload): payload is Static<typeof Receipt> => Check(Receipt, payload) && payload.parties.includes(agent));
}

/** The final standings' order (old `world.ranking()`): the last `round_end` line's rows. */
export function rankingOf(run: { readonly events: (type: "round_end") => readonly { readonly standings: readonly { readonly agent: string }[] }[] }): readonly string[] {
	return run.events("round_end").at(-1)?.standings.map((row) => row.agent) ?? [];
}

/** The whisperer (old `world.whisperer`); `undefined` without one. */
export function whispererOf(host: FactsHost): ResidentId | undefined {
	const value = host.fact("whispers.whisperer");
	return typeof value === "string" ? value : undefined;
}

const CoreMotiveFact = Type.Record(
	Type.String(),
	Type.Object(
		{
			bigFive: Type.Array(Type.Object({ axis: Type.String(), level: Type.String() })),
			drives: Type.Array(Type.Object({ drive: Type.String(), intensity: Type.String() })),
			figure: Type.Optional(Type.String()),
		},
		{ additionalProperties: true },
	),
);

/** A resident's dealt core motive (old `world.coreMotiveOf`); `undefined` without one. */
export function coreMotiveOf(host: FactsHost, agent: ResidentId): Static<typeof CoreMotiveFact>[string] | undefined {
	const value = host.fact("motives.coreMotives");
	return Check(CoreMotiveFact, value) ? value[agent] : undefined;
}

/**
 * The task text of a resident's current level (old `world.currentProblem(agent).text`), asked through
 * its own `getProblem` call (which writes the call to the log): `undefined` when the call is refused.
 */
export async function problemText(host: Pick<Host, "fact" | "call">, agent: ResidentId, level = levelOf(host, agent)): Promise<string | undefined> {
	const outcome = await host.call(`resident:${agent}`, "getProblem", { level });
	return outcome.ok ? outcome.reply : undefined;
}

/** A mechanic's snapshot slice (between minutes only): the white-box state the old `World` showed through `inspect`. */
export function sliceOf<T extends TSchema>(host: Pick<Host, "snapshot">, mechanic: string, schema: T): Static<T> {
	const data = host.snapshot().mechanics[mechanic]?.data;
	if (!Check(schema, data)) throw new Error(`slice ${mechanic} is missing or has an unexpected shape`);
	return data;
}

const Team = Type.Object({ members: Type.Array(Type.String()), leader: Type.String() });
const FragmentPuzzle = Type.Object({ password: Type.String(), fragments: Type.Array(Type.String()), overlap: Type.Integer() });
const FactorDealSchema = Type.Object({
	digits: Type.Integer(),
	cityFactor: Type.String(),
	teams: Type.Array(Type.Object({ team: Type.Integer(), certificate: Type.String(), certificateHolder: Type.String(), cityFactor: Type.Optional(Type.String()) })),
	holdings: Type.Array(Type.Object({ agent: Type.String(), team: Type.Integer(), salt: Type.String(), counterFactor: Type.String(), counterHolder: Type.String(), code: Type.String() })),
});
export type FactorDeal = Static<typeof FactorDealSchema>;
const PuzzleLevel = Type.Object(
	{ level: Type.Integer(), teams: Type.Array(Team), kind: Type.String(), puzzles: Type.Optional(Type.Array(FragmentPuzzle)), deal: Type.Optional(FactorDealSchema) },
	{ additionalProperties: true },
);
const PuzzlesSlice = Type.Object({ levels: Type.Array(PuzzleLevel) }, { additionalProperties: true });

function puzzleLevel(host: Pick<Host, "snapshot">, level: number): Static<typeof PuzzleLevel> | undefined {
	return sliceOf(host, "puzzles", PuzzlesSlice).levels.find((entry) => entry.level === level);
}

/** The teams of a dealt level (old `world.teamsOf`). */
export function teamsOf(host: Pick<Host, "snapshot">, level: number): readonly Static<typeof Team>[] {
	return puzzleLevel(host, level)?.teams ?? [];
}

/** The team of a resident on a dealt level (old `world.teamOf`). */
export function teamOf(host: Pick<Host, "snapshot">, level: number, agent: ResidentId): Static<typeof Team> {
	const team = teamsOf(host, level).find((entry) => entry.members.includes(agent));
	if (team === undefined) throw new Error(`${agent} has no team on level ${String(level)}`);
	return team;
}

const ChannelsSlice = Type.Object(
	{
		groups: Type.Object(
			{ groups: Type.Array(Type.Object({ id: Type.String(), members: Type.Array(Type.Object({ agent: Type.String() }, { additionalProperties: true })), removed: Type.Optional(Type.Literal(true)) }, { additionalProperties: true })) },
			{ additionalProperties: true },
		),
	},
	{ additionalProperties: true },
);

const GroupState = Type.Object(
	{
		id: Type.String(),
		members: Type.Array(Type.Object({ agent: Type.String(), joinedAtSeq: Type.Integer() })),
		reads: Type.Array(Type.Object({ agent: Type.String(), seq: Type.Integer() })),
		posts: Type.Array(Type.Object({ seq: Type.Integer(), author: Type.String() }, { additionalProperties: true })),
		removed: Type.Optional(Type.Literal(true)),
	},
	{ additionalProperties: true },
);
const GroupsState = Type.Object({ groups: Type.Object({ groups: Type.Array(GroupState) }, { additionalProperties: true }) }, { additionalProperties: true });

/** Unread posts by others in a group (old `world.groups.unreadCount`): 0 for a removed group or a non-member. */
export function groupUnread(host: Pick<Host, "snapshot">, groupId: string, reader: ResidentId): number {
	const group = sliceOf(host, "channels", GroupsState).groups.groups.find((entry) => entry.id === groupId);
	const joinedAt = group?.members.find((member) => member.agent === reader)?.joinedAtSeq;
	if (group === undefined || group.removed === true || joinedAt === undefined) return 0;
	const cursor = Math.max(joinedAt, group.reads.find((read) => read.agent === reader)?.seq ?? 0);
	return group.posts.filter((post) => post.seq > cursor && post.author !== reader).length;
}

/** Every group, a removed one included, with its members (old `world.groups.inspect()`). */
export function groupsOf(host: Pick<Host, "snapshot">): readonly { readonly id: string; readonly members: readonly string[] }[] {
	return sliceOf(host, "channels", ChannelsSlice)
		.groups.groups.map((group) => ({ id: group.id, members: group.members.map((member) => member.agent) }));
}

/** The fragment puzzles of a dealt level (old `world.inspect.puzzlesOf`). */
export function puzzlesOf(host: Pick<Host, "snapshot">, level: number): readonly Static<typeof FragmentPuzzle>[] | undefined {
	return puzzleLevel(host, level)?.puzzles;
}

/** The factor deal of an additive level (old `world.inspect.factorsOf`). */
export function factorsOf(host: Pick<Host, "snapshot">, level: number): FactorDeal | undefined {
	return puzzleLevel(host, level)?.deal;
}

/** The city factor a resident's team works with (old `cityFactorOf`). */
export function cityFactorOf(deal: FactorDeal, agent: ResidentId): string {
	const team = deal.holdings.find((holding) => holding.agent === agent)?.team;
	return (team === undefined ? undefined : deal.teams[team]?.cityFactor) ?? deal.cityFactor;
}

const ProgressionSlice = Type.Object(
	{ competitors: Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer(), held: Type.Boolean(), solved: Type.Array(Type.Integer()) }, { additionalProperties: true })) },
	{ additionalProperties: true },
);

/** The levels a resident has solved (old `world.status(id).solvedLevels`). */
export function solvedLevels(host: Pick<Host, "snapshot">, agent: ResidentId): readonly number[] {
	return sliceOf(host, "progression", ProgressionSlice).competitors.find((entry) => entry.agent === agent)?.solved ?? [];
}

const LedgerSlice = Type.Object({ balances: Type.Array(Type.Object({ account: Type.String(), balance: Type.Number() })) }, { additionalProperties: true });

const Collection = Type.Object({ into: Type.String(), cast: Type.String(), entries: Type.Array(Type.Object({ from: Type.String(), text: Type.String(), minute: Type.Integer() })) }, { additionalProperties: true });
const CastSlice = Type.Object({ collections: Type.Array(Collection) }, { additionalProperties: true });

/** A cast member's collection of DMs (old `world.collection(into)`); `undefined` when it never started. */
export function collectionOf(host: Pick<Host, "snapshot">, into: string): Static<typeof Collection> | undefined {
	return sliceOf(host, "cast", CastSlice).collections.find((entry) => entry.into === into);
}

/** Any account's balance, an escrow or the city's included (old `world.ledger.balance` on a non-resident account). */
export function accountBalance(host: Pick<Host, "snapshot">, account: string): number {
	return sliceOf(host, "ledger", LedgerSlice).balances.find((entry) => entry.account === account)?.balance ?? 0;
}

/** The sum over every account, the city's included (old `world.ledger.total`, always 0). */
export function ledgerTotal(host: Pick<Host, "snapshot">): number {
	return sliceOf(host, "ledger", LedgerSlice).balances.reduce((sum, entry) => sum + entry.balance, 0);
}
