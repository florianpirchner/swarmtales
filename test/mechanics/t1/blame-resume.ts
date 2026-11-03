/**
 * The blame differential after a legacy resume (round 3, T1 must-fix 2 and 6): an old run snapshot
 * (a checkpoint of `examples/`, or a copy a test changed) continues on the old engine (a composed
 * run with scripted competitors and a scripted judge) and, converted by `convertLegacySnapshot`, on
 * the new host with the real channels, receipts, ledger, marks and names. Progression and exile are
 * the stand-ins of the T2 resume harness (they carry the doors' lines of the old continuation and
 * the levels of the snapshot); every other slice is an inert stand-in. The blame ladder is 0 on both
 * sides (the stand-in prices nothing), so the judge's standing and the ladder are proved on the real
 * progression in blame-differential.test.ts.
 */
import { Parse } from "typebox/value";
import { Type } from "typebox";
import { convertLegacySnapshot, parseSnapshot } from "@swarmtales/chronicle";
import type { AnyStory, RoleCaller } from "@swarmtales/contracts";
import { createHost, defineCoreStory } from "@swarmtales/kernel";
import { channels } from "@swarmtales/mechanic-channels";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { names } from "@swarmtales/mechanic-names";
import { receipts } from "@swarmtales/mechanic-receipts";
import { legacyTurns } from "@swarmtales/mechanic-shared";
import { createPromptLookup } from "@swarmtales/prompts";
import { standInsFor } from "@swarmtales/testkit";
import type { DenialQuestion } from "@swarmtales/roles";
import { resolveBlockSize } from "../../../apps/cli/src/run-options.ts";
import { currentScenario, expectFingerprint, fingerprintOf, planTable, recordedOld } from "../../helpers/old-engine.ts";
import { DenialQuestionRecord } from "../../helpers/old-world.ts";
import { namesStandIn } from "../channels/stand-ins.ts";
import { progressionForBlame } from "./progression-carrying.ts";
import { channelsOptionsOf, marksOptions } from "../t2/golden-world.ts";
import { exileStandIn } from "./stand-ins.ts";
import { replyText, type PlanFn } from "./differential.ts";

const TOOLS = ["readBoard", "postBoard", "sendDM", "transferPoints", "showReceipt", "blame", "createGroup", "postGroup", "readGroup"] as const;
const LOADED = ["channels", "receipts", "ledger", "marks", "names", "progression", "exile"];

export interface ResumedSide {
	/** `minute:agent` to the replies in call order (`isError|text`). */
	readonly replies: ReadonlyMap<string, readonly string[]>;
	readonly lines: readonly { readonly type: string; readonly [field: string]: unknown }[];
	readonly asked: readonly unknown[];
}

/** The story with blame open on every level and no price on a lost blame (the stand-in progression has no ladder). */
export function blameStory(story: AnyStory): AnyStory {
	return {
		...story,
		rules: { ...story.rules, blame: { penalty: 0 } },
		levels: story.levels.map((level) => (level.tools.includes("blame") ? level : { ...level, tools: [...level.tools, "blame" as const] })),
	};
}

const OldRecord = Type.Object({
	fingerprint: Type.String(),
	replies: Type.Array(Type.Tuple([Type.String(), Type.Array(Type.String())])),
	lines: Type.Array(Type.Intersect([Type.Object({ type: Type.String() }), Type.Record(Type.String(), Type.Unknown())])),
	questions: Type.Array(DenialQuestionRecord),
});

/**
 * Continues the old run for `minutes` more minutes; the judge answers `answers` in order. As it was
 * recorded once before the engine went (step 18, item 7b; `test/fixtures/old-engine/`).
 */
export function resumeOld(raw: unknown, story: AnyStory, minutes: number, plan: PlanFn, answers: readonly boolean[]): Promise<ResumedSide & { readonly questions: readonly DenialQuestion[] }> {
	const { name, scenario } = currentScenario();
	const start = parseSnapshot(JSON.parse(JSON.stringify(raw))).minute + 1;
	const agents = parseSnapshot(JSON.parse(JSON.stringify(raw))).agents;
	const now = fingerprintOf({ snapshot: fingerprintOf(raw), story, minutes, answers, calls: planTable(agents, minutes, (agent, index) => plan(agent, start + index)) });
	const recorded = recordedOld(name, scenario, OldRecord);
	expectFingerprint(name, scenario, recorded.fingerprint, now);
	return Promise.resolve({ replies: new Map(recorded.replies), lines: recorded.lines, asked: recorded.questions, questions: recorded.questions });
}

const WorldFields = Type.Object({ world: Type.Object({ competitors: Type.Array(Type.Object({ agent: Type.String(), level: Type.Integer() })) }) });

/** Continues the converted snapshot on the new host for `minutes` more minutes. */
export async function resumeNew(raw: unknown, story: AnyStory, minutes: number, plan: PlanFn, answers: readonly boolean[], carried: ResumedSide["lines"]) {
	const converted = convertLegacySnapshot(JSON.parse(JSON.stringify(raw)));
	const rules = marksOptions(story);
	const naming = story.names;
	const levels = Object.fromEntries(Parse(WorldFields, raw).world.competitors.map((entry) => [entry.agent, entry.level]));
	const definition = defineCoreStory({
		id: converted.host.story,
		seed: converted.host.seed,
		minutes: converted.host.minute + minutes,
		residents: converted.host.residents.ids,
		mechanics: [
			channels.with(channelsOptionsOf(story)),
			receipts.with({ quoteDms: story.rules.receipts?.quoteDms === true }),
			ledger.with({ startPoints: story.run.startPoints }),
			...(rules === undefined ? [] : [marks.with(rules)]),
			...(naming === undefined || converted.host.mechanics.names === undefined ? [namesStandIn(new Map<string, string>()).with()] : [names.with({ ...naming, fallbackWords: [...naming.fallbackWords], reserved: ["STEWARD", story.city] })]),
			exileStandIn([]),
			progressionForBlame(carried, levels),
			...standInsFor(converted.host, LOADED),
		],
		grants: { resident: [...TOOLS] },
		turns: legacyTurns({ passesPerMinute: 1, blockSize: resolveBlockSize(story.run.blockSize, converted.host.residents.ids.length), activation: "always" }),
	});
	const questions: unknown[] = [];
	const judge: RoleCaller = {
		ask: (question) => {
			const answer = answers[questions.length];
			questions.push(question.question);
			return Promise.resolve(answer === undefined ? { ok: false, error: "no answer left", costUsd: 0 } : { ok: true, answer: { deniesReceipt: answer }, costUsd: 0 });
		},
	};
	const host = createHost({ story: definition, prompts: createPromptLookup(), roles: { judge }, resume: { snapshot: converted.host, events: converted.events } });
	const cut = host.log.length;
	const replies = new Map<string, string[]>();
	await host.run(async (turn) => {
		for (const call of plan(turn.resident, turn.minute)) {
			const at = `${String(turn.minute)}:${turn.resident}`;
			replies.set(at, [...(replies.get(at) ?? []), replyText(await turn.call(call.tool, call.params))]);
		}
	});
	return { host, replies, cut, asked: questions };
}
