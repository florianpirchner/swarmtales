/**
 * The strict golden replay of the T2 mechanics (carve-round2-T2.md, "Gate"): a golden log is played
 * on a host with the turn loop of the old engine (`legacyTurns`), the real channels, cast,
 * petitions, receipts, names, marks and ledger, and stand-ins only for what is not carved here
 * (progression: the level a golden `level_up` left and the doors' tool locks; the script and the
 * seal: the lines they wrote). Every resident call of a channels tool is made in its golden turn;
 * what the other mechanics did in that turn (level-ups, receipts of solved levels, the city's posts
 * and notices, the script's actions) is handed to the host in the golden order through the
 * stand-in `drive` tool, which calls the real APIs (`ChannelsApi.post`, `notify`, `ReceiptsApi.issue`,
 * `CastApi.reveal`, ...). Nothing channels writes is injected: DMs, their delivery, receipts and
 * notices, numbers, the mailbox, marks and the status parts come out of the real mechanics.
 */
import { fileURLToPath } from "node:url";
import { Type, type Static } from "typebox";
import type { AnyStory, Host, MechanicUse, ToolOutcome, TurnTaker } from "@swarmtales/contracts";
import { createHost, defineCoreStory, defineMechanic, reply, resolveCount } from "@swarmtales/kernel";
import { cast, castOptionsFromStory } from "@swarmtales/mechanic-cast";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { names } from "@swarmtales/mechanic-names";
import { petitions } from "@swarmtales/mechanic-petitions";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { receipts } from "@swarmtales/mechanic-receipts";
import { CastApi, ChannelsApi, HOOK_ORDER, MarksApi, ProgressionApi, ProgressionEvents, ReceiptBody, ReceiptsApi, legacyTurns } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import { dropJustified, goldenCalls, type GoldenCall, type LegacyLine, type Reply } from "@swarmtales/testkit";
import cityOfKeys from "../../../stories/cityofkeys/story.ts";
import whispers from "../../../stories/whispers/story.ts";
import { namesStandIn, marksStandIn } from "../channels/stand-ins.ts";
import { goldenLog, puzzleOptions, type GoldenName } from "../puzzles/harness.ts";
import { exileStandIn } from "../t1/stand-ins.ts";
import { linesOf } from "../t1/support.ts";
import { planOf, turnKey, type GoldenPlan, type Placed } from "./golden-plan.ts";

export { goldenLog, type GoldenName };

export const CHANNEL_TOOLS = ["readBoard", "postBoard", "sendDM", "createGroup", "addGroupMember", "removeGroupMember", "leaveGroup", "listMyGroups", "postGroup", "readGroup", "depositGroup", "withdrawGroup", "setTreasurer"] as const;
const DELIVERY = /^DM #\d+ delivered to /;
const LEVEL_UP_RECEIPT = /^R-\d+: (\S+) solved level (\d+), \+(\d+) points/;

export const storyOf = (name: GoldenName): AnyStory => (name.startsWith("whispers") ? whispers : cityOfKeys);

const Op = Type.Union([
	Type.Object({ op: Type.Literal("post"), author: Type.String(), text: Type.String() }),
	Type.Object({ op: Type.Literal("notify"), to: Type.String(), author: Type.String(), text: Type.String() }),
	Type.Object({ op: Type.Literal("emit"), type: Type.String(), fields: Type.Record(Type.String(), Type.Unknown()) }),
	Type.Object({ op: Type.Literal("receipt"), body: ReceiptBody }),
	Type.Object({ op: Type.Literal("level"), agent: Type.String(), to: Type.Integer() }),
	Type.Object({ op: Type.Literal("reveal"), cast: Type.String() }),
	/** The mark a forged receipt costs (the whisperer's `forgeReceipt`, team T1, is not played here). */
	Type.Object({ op: Type.Literal("spend"), resident: Type.String() }),
	Type.Object({ op: Type.Literal("collect"), into: Type.String(), cast: Type.String(), first: Type.Integer(), untilMinute: Type.Integer(), distinctSenders: Type.Boolean(), afterSolve: Type.Optional(Type.Object({ level: Type.Integer(), minutes: Type.Integer() })) }),
]);

type Driven = Static<typeof Op>;

/** What the replay shares with its stand-ins: the levels the golden run left and the tools each level opens. */
interface Progress {
	readonly levels: Map<string, number>;
	readonly firstSolve: Map<number, number>;
	/** `resident:level` of every level a resident passed. */
	readonly passed: Set<string>;
	readonly toolsAt: (level: number) => readonly string[];
}

/** Stand-in progression: the level of every resident, the first solve of a level, the tool locks of the doors and `act_ended` at the run's end. */
function progressionStandIn(progress: Progress, actEnds: boolean) {
	return defineMechanic(
		{ id: "progression", summary: "Stand-in progression: levels from the golden run.", options: Type.Object({}), state: (): undefined => undefined, events: ProgressionEvents.events, provides: [ProgressionApi] },
		(kit) => ({
			services: [
				kit.provideSome(ProgressionApi, {
					levelOf: ({ resident }) => progress.levels.get(resident) ?? 1,
					firstSolveMinute: ({ level }) => progress.firstSolve.get(level) ?? null,
					hasPassed: ({ resident, level }) => progress.passed.has(`${resident}:${String(level)}`),
					currentAct: () => 1,
				}),
			],
			hooks: {
				// The doors: a resident starts with the tools of the first level (old `enabledTools`).
				runStarted: {
					order: HOOK_ORDER.runStarted.progression,
					run: (ctx) => {
						for (const resident of ctx.residents.ids) for (const tool of CHANNEL_TOOLS) if (!progress.toolsAt(1).includes(tool)) ctx.access.lock(resident, tool);
					},
				},
				runEnded: {
					order: HOOK_ORDER.runEnded.progression,
					run: (_reason, ctx) => {
						if (actEnds) ctx.emit("act_ended", { fromLevel: 1 });
					},
				},
			},
		}),
	);
}

function fieldsOf(line: LegacyLine): Readonly<Record<string, unknown>> {
	return Object.fromEntries(Object.entries(line).filter(([key]) => !["type", "seq", "minute", "at"].includes(key)));
}

/** The golden world: the plan's slots (the seal's and the script's lines, the posts and notices others wrote) and the `drive` tool. */
function worldStandIn(plan: GoldenPlan, progress: Progress) {
	const placed: readonly Placed[] = [...plan.starts.values(), plan.end].flat();
	const slotsOf = (hook: "minuteStarted" | "act_ended") => [...new Map(placed.filter((entry) => entry.slot.hook === hook).map((entry) => [`${entry.slot.key}:${String(entry.slot.order)}`, entry.slot])).values()];
	const emitted = [...new Set(placed.filter((entry) => entry.how === "emit").map((entry) => String(entry.line.type)))];
	const entriesOf = (hook: "minuteStarted" | "act_ended", key: string, order: number) => placed.filter((entry) => entry.slot.hook === hook && entry.slot.key === key && entry.slot.order === order);
	return defineMechanic(
		{
			id: "gold",
			summary: "The golden world: slots and drive.",
			options: Type.Object({}),
			state: (): undefined => undefined,
			events: Object.fromEntries([...emitted, "director_action"].map((type) => [type, Type.Object({})])),
			requires: [ChannelsApi, ReceiptsApi, CastApi, MarksApi],
			prompts: { "tools/readBoard": [] },
		},
		(kit) => {
			type Context = Parameters<Parameters<typeof kit.listen<typeof ProgressionEvents, "act_ended">>[2]>[1];
			const write = (entry: Placed, ctx: Context) => {
				if (entry.how === "emit") ctx.emit(String(entry.line.type), fieldsOf(entry.line));
				else if (entry.line.type === "board_post") ctx.call(ChannelsApi, "post", { author: String(entry.line.author), text: String(entry.line.text) });
				else ctx.call(ChannelsApi, "notify", { to: String(entry.line.to), author: String(entry.line.author), text: String(entry.line.text) });
			};
			return {
				tools: [
					kit.tool({
						name: "drive",
						description: "tools/readBoard",
						parameters: Op,
						execute: (params: Driven, ctx) => {
							switch (params.op) {
								case "post":
									ctx.call(ChannelsApi, "post", { author: params.author, text: params.text });
									return reply("ok");
								case "notify":
									ctx.call(ChannelsApi, "notify", { to: params.to, author: params.author, text: params.text });
									return reply("ok");
								case "emit":
									ctx.emit(params.type, params.fields);
									return reply("ok");
								case "receipt":
									ctx.call(ReceiptsApi, "issue", { body: params.body });
									return reply("ok");
								case "level": {
									const before = progress.levels.get(params.agent) ?? 1;
									progress.levels.set(params.agent, params.to);
									for (const tool of CHANNEL_TOOLS) {
										if (progress.toolsAt(params.to).includes(tool)) ctx.access.unlock(params.agent, tool);
										else ctx.access.lock(params.agent, tool);
									}
									progress.passed.add(`${params.agent}:${String(before)}`);
									progress.firstSolve.set(before, Math.min(progress.firstSolve.get(before) ?? ctx.minute, ctx.minute));
									return reply("ok");
								}
								case "spend":
									ctx.call(MarksApi, "spend", { resident: params.resident, channel: "receipt" });
									return reply("ok");
								case "reveal":
									ctx.call(CastApi, "reveal", { cast: params.cast });
									return reply("ok");
								case "collect":
									ctx.call(CastApi, "startCollection", { into: params.into, cast: params.cast, first: params.first, untilMinute: params.untilMinute, distinctSenders: params.distinctSenders, ...(params.afterSolve === undefined ? {} : { afterSolve: params.afterSolve }) });
									return reply("ok");
								default:
									return params satisfies never;
							}
						},
					}),
				],
				hooks: {
					minuteStarted: slotsOf("minuteStarted").map(({ key, order }) => ({
						order,
						run: (ctx) => {
							for (const entry of entriesOf("minuteStarted", key, order)) if (entry.line.minute === ctx.minute) write(entry, ctx);
						},
					})),
				},
				listeners: slotsOf("act_ended").map(({ key, order }) =>
					kit.listen(ProgressionEvents, "act_ended", (_payload, ctx) => {
						for (const entry of entriesOf("act_ended", key, order)) write(entry, ctx);
					}, { order }),
				),
			};
		},
	);
}

/** The marks options a story gives (`rules.marks`), as the marks mechanic takes them. */
export function marksOptions(story: AnyStory) {
	const rules = story.rules.marks;
	if (rules === undefined) return undefined;
	const { ranges, ...base } = rules;
	const copied = ranges === undefined ? base : { ...base, ranges: ranges.map((range) => ({ ...range })) };
	return { rules: copied, levels: story.levels.flatMap((level) => (level.marks?.perLevel === undefined ? [] : [{ level: level.number, perLevel: level.marks.perLevel }])) };
}

/** The options of channels a story gives: the DM cap, receipts that quote, the gamemaker's courier and budgets. */
export function channelsOptionsOf(story: AnyStory) {
	const cap = story.rules.dmLimit;
	const gamemaker = story.gamemaker;
	return {
		...(cap === undefined ? {} : { dmLimit: { windowMinutes: cap.windowMinutes, perWindow: cap.perWindow } }),
		city: story.city,
		...(gamemaker === undefined ? {} : { noteAuthor: gamemaker.author, notesPerAgent: gamemaker.notesPerAgent, boardPosts: gamemaker.boardPosts, windowMinutes: gamemaker.windowMinutes }),
	};
}

/** The story's guards as the host takes them: per tool, the rules that name it (the old `guards.rules`). */
function guardPolicies(story: AnyStory) {
	const resident: Record<string, { guard: { id: string; rule: string; on: "block"; secrets?: { minRun: number } } }> = {};
	for (const rule of story.guards?.rules ?? []) {
		for (const tool of rule.tools) resident[tool] = { guard: { id: rule.id, rule: rule.rule, on: rule.on, ...(rule.secrets === undefined ? {} : { secrets: { minRun: rule.secrets.minRun } }) } };
	}
	return { resident };
}

/** The mechanics of the replay, in no particular order (the host orders them). */
export function mechanicsOf(story: AnyStory, plan: GoldenPlan, progress: Progress): readonly MechanicUse[] {
	const marksUse = marksOptions(story);
	// The whispers golden was played without the city naming anyone; the same story file would name them.
	const naming = plan.namesChosen ? story.names : undefined;
	return [
		channels.with(channelsOptionsOf(story)),
		cast.with(castOptionsFromStory(story)),
		petitions.with({}),
		receipts.with({ quoteDms: story.rules.receipts?.quoteDms === true }),
		ledger.with({ startPoints: story.run.startPoints }),
		marksUse === undefined ? marksStandIn().with() : marks.with(marksUse),
		naming === undefined ? namesStandIn(new Map<string, string>()).with() : names.with({ ...naming, fallbackWords: [...naming.fallbackWords], reserved: ["STEWARD", story.city] }),
		puzzles.with(puzzleOptions(story)),
		exileStandIn([]),
		progressionStandIn(progress, plan.end.some((entry) => entry.slot.hook === "act_ended")).with(),
		worldStandIn(plan, progress).with(),
	];
}

/** What a golden replay leaves: the host, the replies of the channel calls, the inputs every turn showed, the gamemaker's replies. */
export interface GoldenRun {
	readonly host: Host;
	readonly golden: readonly LegacyLine[];
	readonly plan: GoldenPlan;
	readonly replies: readonly Reply[];
	readonly calls: readonly GoldenCall[];
	readonly inputs: ReadonlyMap<string, readonly { readonly source: string; readonly kind?: string; readonly text: string }[]>;
	readonly gamemaker: readonly { readonly want: string; readonly got: string }[];
	written(): readonly LegacyLine[];
}

function textOf(outcome: ToolOutcome): string {
	if (outcome.ok) return outcome.reply;
	return outcome.detail === undefined ? outcome.code : `${outcome.code}: ${outcome.detail}`;
}

function receiptBody(line: LegacyLine) {
	const found = LEVEL_UP_RECEIPT.exec(String(line.text));
	if (found?.[1] === undefined || found[2] === undefined || found[3] === undefined) return undefined;
	return { kind: "levelUp" as const, agent: found[1], level: Number(found[2]), reward: Number(found[3]) };
}

/** Plays a golden log on the new host. */
export async function playGolden(name: GoldenName): Promise<GoldenRun> {
	const story = storyOf(name);
	const golden = goldenLog(name);
	const plan = planOf(golden);
	// A resident past the last level keeps every tool any level lists (old `#finalTools`).
	const lastLevel = Math.max(...story.levels.map((definition) => definition.number));
	const finalTools = [...new Set(story.levels.flatMap((definition) => definition.tools))];
	const toolsAt = (level: number): readonly string[] => (level > lastLevel ? finalTools : (story.levels.find((definition) => definition.number === level)?.tools ?? []));
	const progress: Progress = { levels: new Map(), firstSolve: new Map(), passed: new Set(), toolsAt };
	const coreStory = defineCoreStory({
		id: `golden-${name}`,
		seed: 7,
		minutes: plan.minutes,
		residents: ["A01", "A02", "A03", "A04", "A05", "A06"],
		mechanics: mechanicsOf(story, plan, progress),
		grants: { resident: CHANNEL_TOOLS, gamemaker: ["notify", "postBoard"], script: ["drive", "resolvePetition"] },
		tools: guardPolicies(story),
		turns: legacyTurns({ passesPerMinute: 1, blockSize: 1, activation: "always" }),
	});
	const host = createHost({ story: coreStory, prompts: createPromptLookup({ story: fileURLToPath(new URL("./prompts", import.meta.url)) }) });
	host.start();
	const drive = async (params: Driven): Promise<void> => {
		const outcome = await host.call("script", "drive", params);
		if (!outcome.ok) throw new Error(`drive ${JSON.stringify(params)}: ${textOf(outcome)}`);
	};
	const replies: Reply[] = [];
	const gamemaker: { want: string; got: string }[] = [];
	/** The last golden turn of every minute: the gamemaker's between slot is no hook before step 17, so its calls run at the end of that turn (still in the minute they were made in). */
	const lastTurn = new Map<number, string>();
	for (const window of plan.turns.values()) lastTurn.set(window.minute, window.agent);
	const inputs = new Map<string, readonly { readonly source: string; readonly kind?: string; readonly text: string }[]>();
	const agent: TurnTaker = async (turn) => {
		const window = plan.turns.get(turnKey(turn.minute, turn.resident));
		if (window === undefined) throw new Error(`no golden turn for ${turn.resident} at minute ${String(turn.minute)}`);
		inputs.set(turnKey(turn.minute, turn.resident), turn.inputs.map((input) => ({ source: input.source, ...(input.kind === undefined ? {} : { kind: input.kind }), text: input.text })));
		for (const line of window.lines) {
			const type = String(line.type);
			if (type === "tool_call" && CHANNEL_TOOLS.some((tool) => tool === line.tool)) {
				const outcome = await turn.call(String(line.tool), line.args);
				replies.push({ minute: turn.minute, agent: turn.resident, tool: String(line.tool), isError: !outcome.ok, text: textOf(outcome) });
			} else if (type === "level_up") await drive({ op: "level", agent: String(line.agent), to: Number(line.to) });
			else if (type === "receipt_issued" && line.kind === "levelUp") {
				const body = receiptBody(line);
				if (body !== undefined) await drive({ op: "receipt", body });
			} else if (type === "tool_call" && line.tool === "forgeReceipt") await drive({ op: "spend", resident: turn.resident });
			else if (type === "director_action") {
				await drive({ op: "emit", type: "director_action", fields: fieldsOf(line) });
				const action = story.director.find((rule) => rule.id === line.rule)?.actions.find((entry) => entry.kind === line.action);
				if (action?.kind === "revealCast") await drive({ op: "reveal", cast: action.cast });
				if (action?.kind === "collectDms") {
					const until = action.untilMinute ?? turn.minute + (action.forMinutes ?? 0);
					await drive({ op: "collect", into: action.into, cast: action.cast, first: resolveCount(action.first, 6), untilMinute: until, distinctSenders: action.distinctSenders === true, ...(action.afterSolve === undefined ? {} : { afterSolve: action.afterSolve }) });
				}
			} else if (type === "board_post" && line.kind === "city") await drive({ op: "post", author: String(line.author), text: String(line.text) });
			else if (type === "notice" && !DELIVERY.test(String(line.text))) await drive({ op: "notify", to: String(line.to), author: String(line.author), text: String(line.text) });
		}
		if (lastTurn.get(turn.minute) !== turn.resident) return;
		const between = plan.between.get(turn.minute) ?? [];
		for (const [index, line] of between.entries()) {
			if (line.type !== "gamemaker_call") continue;
			const result = between.slice(index).find((entry) => entry.type === "gamemaker_result");
			const outcome = await host.call("gamemaker", String(line.tool), line.args);
			gamemaker.push({ want: `${String(result?.isError)}|${String(result?.text)}`, got: `${String(!outcome.ok)}|${textOf(outcome)}` });
		}
	};
	for (let minute = 0; minute < plan.minutes; minute++) await host.playMinute(agent);
	const calls = dropJustified(goldenCalls(golden), (call) => !CHANNEL_TOOLS.some((tool) => tool === call.tool), "calls of other mechanics' tools (submitSolution, getStatus, nameFavourite, forgeReceipt); channels answers its own thirteen").kept;
	return { host, golden, plan, replies, calls, inputs, gamemaker, written: () => linesOf(host.log.all()) };
}
