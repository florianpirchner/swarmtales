/** Command-line parsing for `pnpm start`. Pure, so it is testable offline. */
import { parseArgs } from "node:util";
import { MAX_PASSES_PER_MINUTE } from "@swarmtales/sdk";
import { JUDGE_TEMPERS, type JudgeTemper } from "@swarmtales/roles";
import type { RunOverrides } from "./run-options.ts";

export class UsageError extends Error {
	override readonly name = "UsageError";
}

export interface StartArgs {
	/** Absent only with `--resume`, which then plays the snapshot's story. */
	readonly story?: string;
	readonly overrides: RunOverrides;
	readonly provider?: string;
	readonly model?: string;
	readonly gamemakerProvider?: string;
	readonly gamemakerModel?: string;
	readonly classifierProvider?: string;
	readonly classifierModel?: string;
	/** The weaver's provider and model (`--weaver`); the classifier's by default. */
	readonly weaverProvider?: string;
	readonly weaverModel?: string;
	/** How the city's judge rules and speaks (default fair). */
	readonly judgeTemper?: JudgeTemper;
	/** Write `REPORT.md` with the run reporter at the end of the run (default on). */
	readonly reporter: boolean;
	readonly reporterProvider?: string;
	readonly reporterModel?: string;
	readonly runsDirectory: string;
	/** Write `snapshot-L<n>.json` once every competitor has passed level n (SPEC 17). */
	readonly snapshotAfter?: number;
	/** Write `snapshot-M<m>.json` at the first round boundary at or after minute m (prompt experiments). */
	readonly snapshotAt?: number;
	/** End the run right after that snapshot. */
	readonly stopAfterSnapshot?: true;
	/** Files whose text is appended to the system prompt (prompt experiments, `lab/`): of every competitor, or of `agent` alone. */
	readonly promptAddenda?: readonly PromptAddendumFile[];
	/** Snapshot file to continue from. */
	readonly resume?: string;
	/** A document registered outside before the run; the genesis commits to its sha256 (docs/design/event-log-signing.md). */
	readonly preregistration?: string;
}

export interface PromptAddendumFile {
	readonly agent?: string;
	readonly file: string;
}

export const START_USAGE = [
	"Usage: pnpm start [--story cityofkeys] [options]",
	"",
	"  --story <name>       story from the registry (default: cityofkeys)",
	"  --agents <n>         number of competitors",
	"  --minutes <n>        virtual minutes (= rounds)",
	"  --seed <n>           run seed",
	"  --provider <id>      openrouter | anthropic | deepseek | zai | scripted | custom",
	"  --model <id>         provider model ID or alias (e.g. glm-flash, haiku)",
	"  --level <n>          start every competitor on level n, then keep playing",
	"  --only <n>           play only level n and stop once everyone passed it",
	"  --stop-when-done     stop once every competitor passed the last level",
	`  --passes <n>         passes per minute, 1 to ${MAX_PASSES_PER_MINUTE} (one step per competitor and pass)`,
	"  --block-size <n>     competitors per block; a block's model calls run concurrently (story default; \"auto\" = agents / 6)",
	"  --no-personas        play without personas (control group)",
	"  --no-names           keep resident IDs; nobody chooses a name",
	"  --no-core-motives    play without core motives (the old name --no-cores still works)",
	"  --no-whisperer       play without the story's whisperer (Whispers: the control run)",
	"  --no-guards          play without the story's tool guards (no post is checked)",
	"  --cast <ids>         the story's cast figures to play, comma-separated (default: a seeded pick)",
	"  --figure-direction <0-10>  how strongly a cast figure's (and the Whispers whisperer's) prompt steers it (default 4; 6, 8, 10 add more, see docs)",
	"  --gm-direction <0-10>      how strongly the gamemaker steers (default 4; 10 = it orders scenes)",
	"  --no-gamemaker       play without the story's gamemaker",
	"  --gamemaker-provider <id>  gamemaker provider (default: the story's, e.g. openrouter)",
	"  --gamemaker-model <id>     gamemaker model, e.g. sonnet (claude-sonnet-5-5) on anthropic",
	"  --no-classifier      play without the story's statement classifier (no labels)",
	"  --classifier-provider <id>  classifier provider (default: the story's, e.g. anthropic)",
	"  --classifier-model <id>     classifier model, e.g. perplexity/pplx-decider-v1.2 on openrouter",
	"  --budget <usd>       the run's spending cap in USD (default: the story's, cityofkeys 3)",
	"  --weaver             let the weaver change who residents are after events that touch them (off by default)",
	"  --weaver-provider <id>      weaver provider (default: the classifier's, e.g. anthropic)",
	"  --weaver-model <id>         weaver model (default: the classifier's, e.g. haiku)",
	`  --judge-temper <t>   how the city's judge rules: ${JUDGE_TEMPERS.join(", ")} (default fair)`,
	"  --no-reporter        write no REPORT.md at the end of the run",
	"  --reporter-provider <id>    run reporter provider (default: openrouter)",
	"  --reporter-model <id>       run reporter model (default: deepseek/deepseek-v4.1-flash-1017)",
	"  --runs <dir>         directory for run artifacts (default: runs)",
	"  --snapshot-after <n> write snapshot-L<n>.json into the run directory once every competitor passed level n",
	"  --snapshot-at <m>    write snapshot-M<m>.json at the end of minute m instead (a cut inside an act)",
	"  --stop-after-snapshot  end the run right after that snapshot",
	"  --prompt-addendum [<ID>=]<file>  append the file's text to every competitor's system prompt, or to <ID>'s; repeatable (lab/)",
	"  --resume <file>      continue from a snapshot: its story, seed and agents; models may differ,",
	"                       --minutes counts from minute 0 of the snapshot's run",
	"  --preregistration <file>  a document registered outside before the run (its nonce, the declared runs);",
	"                       the signed log's genesis commits to its sha256 (docs/design/event-log-signing.md)",
].join("\n");

function parseValues(argv: readonly string[]) {
	try {
		return parseArgs({
			args: [...argv],
			options: {
				story: { type: "string" },
				agents: { type: "string" },
				minutes: { type: "string" },
				seed: { type: "string" },
				provider: { type: "string" },
				model: { type: "string" },
				level: { type: "string" },
				only: { type: "string" },
				"stop-when-done": { type: "boolean" },
				passes: { type: "string" },
				"block-size": { type: "string" },
				"no-personas": { type: "boolean" },
				"no-names": { type: "boolean" },
				"no-core-motives": { type: "boolean" },
				"no-cores": { type: "boolean" },
				"no-whisperer": { type: "boolean" },
				"no-guards": { type: "boolean" },
				cast: { type: "string" },
				"figure-direction": { type: "string" },
				"gm-direction": { type: "string" },
				"no-gamemaker": { type: "boolean" },
				"no-classifier": { type: "boolean" },
				"gamemaker-provider": { type: "string" },
				"gamemaker-model": { type: "string" },
				// The names before the gamemaker was renamed (2026-10-29), still accepted.
				"no-gamemaster": { type: "boolean" },
				"gamemaster-provider": { type: "string" },
				"gamemaster-model": { type: "string" },
				"classifier-provider": { type: "string" },
				"classifier-model": { type: "string" },
				"judge-temper": { type: "string" },
				budget: { type: "string" },
				weaver: { type: "boolean" },
				"weaver-provider": { type: "string" },
				"weaver-model": { type: "string" },
				"no-reporter": { type: "boolean" },
				"reporter-provider": { type: "string" },
				"reporter-model": { type: "string" },
				runs: { type: "string" },
				"snapshot-after": { type: "string" },
				"stop-after-snapshot": { type: "boolean" },
				"snapshot-at": { type: "string" },
				"prompt-addendum": { type: "string", multiple: true },
				resume: { type: "string" },
				preregistration: { type: "string" },
			},
			allowPositionals: false,
			strict: true,
		}).values;
	} catch (error) {
		throw new UsageError(error instanceof Error ? error.message : String(error));
	}
}

export function parseStartArgs(argv: readonly string[]): StartArgs {
	const parsed = parseValues(argv);
	const values = {
		...parsed,
		"no-gamemaker": parsed["no-gamemaker"] ?? parsed["no-gamemaster"],
		"gamemaker-provider": parsed["gamemaker-provider"] ?? parsed["gamemaster-provider"],
		"gamemaker-model": parsed["gamemaker-model"] ?? parsed["gamemaster-model"],
	};
	const passes = optionalInt("passes", values.passes, 1).passes;
	if (passes !== undefined && passes > MAX_PASSES_PER_MINUTE) {
		throw new UsageError(`--passes must be at most ${MAX_PASSES_PER_MINUTE}, got "${passes}"`);
	}
	const blockSize = optionalInt("block-size", values["block-size"], 1)["block-size"];
	const overrides: RunOverrides = {
		...optionalInt("agents", values.agents, 1),
		...optionalInt("minutes", values.minutes, 1),
		...optionalInt("seed", values.seed, 0),
		...optionalInt("level", values.level, 1),
		...optionalInt("only", values.only, 1),
		...(passes === undefined ? {} : { passesPerMinute: passes }),
		...(blockSize === undefined ? {} : { blockSize }),
		...(values["stop-when-done"] === true ? { stopWhenDone: true } : {}),
		...(values["no-personas"] === true ? { personas: false } : {}),
		...(values["no-names"] === true ? { names: false } : {}),
		...(values["no-core-motives"] === true || values["no-cores"] === true ? { coreMotives: false } : {}),
		...(values["no-whisperer"] === true ? { whisperer: false } : {}),
		...(values["no-guards"] === true ? { guards: false } : {}),
		...(values.cast === undefined ? {} : { cast: castList(values.cast) }),
		...direction("figure-direction", "figureDirection", values["figure-direction"]),
		...direction("gm-direction", "gmDirection", values["gm-direction"]),
		...(values["no-gamemaker"] === true ? { gamemaker: false } : {}),
		...(values["no-classifier"] === true ? { classifier: false } : {}),
		...(values.weaver === true ? { weaver: true } : {}),
		...budget(values.budget),
	};
	if (values.weaver !== true && (values["weaver-provider"] !== undefined || values["weaver-model"] !== undefined)) {
		throw new UsageError("--weaver-provider and --weaver-model need --weaver");
	}
	if (overrides.cast !== undefined && overrides.coreMotives === false) throw new UsageError("--cast needs core motives; drop --no-core-motives");
	if (overrides.figureDirection !== undefined && overrides.coreMotives === false) throw new UsageError("--figure-direction steers cast figures and the whisperer by their core motives; drop --no-core-motives");
	if (overrides.level !== undefined && overrides.only !== undefined) {
		throw new UsageError("Use either --level or --only, not both");
	}
	const snapshotAfter = optionalInt("snapshot-after", values["snapshot-after"], 1)["snapshot-after"];
	const snapshotAt = optionalInt("snapshot-at", values["snapshot-at"], 0)["snapshot-at"];
	if (snapshotAfter !== undefined && snapshotAt !== undefined) {
		throw new UsageError("Use either --snapshot-after or --snapshot-at, not both");
	}
	if (values["stop-after-snapshot"] === true && snapshotAfter === undefined && snapshotAt === undefined) {
		throw new UsageError("--stop-after-snapshot needs --snapshot-after <level> or --snapshot-at <minute>");
	}
	if (values["no-reporter"] === true && (values["reporter-provider"] !== undefined || values["reporter-model"] !== undefined)) {
		throw new UsageError("--no-reporter switches the reporter off; --reporter-provider and --reporter-model do not apply");
	}
	const resume = values.resume;
	if (resume !== undefined && (overrides.level !== undefined || overrides.only !== undefined)) {
		throw new UsageError("--resume continues where the snapshot stopped; --level and --only do not apply");
	}
	const story = values.story ?? (resume === undefined ? "cityofkeys" : undefined);
	return {
		...(story === undefined ? {} : { story }),
		overrides,
		...(values.provider === undefined ? {} : { provider: values.provider }),
		...(values.model === undefined ? {} : { model: values.model }),
		...(values["gamemaker-provider"] === undefined ? {} : { gamemakerProvider: values["gamemaker-provider"] }),
		...(values["gamemaker-model"] === undefined ? {} : { gamemakerModel: values["gamemaker-model"] }),
		...(values["classifier-provider"] === undefined ? {} : { classifierProvider: values["classifier-provider"] }),
		...(values["classifier-model"] === undefined ? {} : { classifierModel: values["classifier-model"] }),
		...(values["weaver-provider"] === undefined ? {} : { weaverProvider: values["weaver-provider"] }),
		...(values["weaver-model"] === undefined ? {} : { weaverModel: values["weaver-model"] }),
		...(values["judge-temper"] === undefined ? {} : { judgeTemper: judgeTemper(values["judge-temper"]) }),
		reporter: values["no-reporter"] !== true,
		...(values["reporter-provider"] === undefined ? {} : { reporterProvider: values["reporter-provider"] }),
		...(values["reporter-model"] === undefined ? {} : { reporterModel: values["reporter-model"] }),
		runsDirectory: values.runs ?? "runs",
		...(snapshotAfter === undefined ? {} : { snapshotAfter }),
		...(snapshotAt === undefined ? {} : { snapshotAt }),
		...(values["prompt-addendum"] === undefined ? {} : { promptAddenda: values["prompt-addendum"].map(addendumFile) }),
		...(values["stop-after-snapshot"] === true ? { stopAfterSnapshot: true } : {}),
		...(resume === undefined ? {} : { resume }),
		...(values.preregistration === undefined ? {} : { preregistration: values.preregistration }),
	};
}

/** `<file>` for every competitor, `<ID>=<file>` for one. */
function addendumFile(value: string): PromptAddendumFile {
	const match = /^(A\d+)=(.+)$/.exec(value);
	return match?.[1] === undefined || match[2] === undefined ? { file: value } : { agent: match[1], file: match[2] };
}

/** `--budget <usd>`: a positive number of dollars. */
function budget(raw: string | undefined): { readonly budgetUsd?: number } {
	if (raw === undefined) return {};
	const value = Number(raw);
	if (!Number.isFinite(value) || value <= 0) throw new UsageError(`--budget must be a positive number of USD, got "${raw}"`);
	return { budgetUsd: value };
}

function optionalInt<K extends string>(name: K, raw: string | undefined, minimum: number): Partial<Record<K, number>> {
	if (raw === undefined) return {};
	const value = Number(raw);
	if (!Number.isInteger(value) || value < minimum) {
		throw new UsageError(`--${name} must be an integer >= ${minimum}, got "${raw}"`);
	}
	const result: Partial<Record<K, number>> = {};
	result[name] = value;
	return result;
}

/** A dial from 0 to 10 (packages/engine/src/direction.ts). */
function direction<K extends "figureDirection" | "gmDirection">(flag: string, key: K, raw: string | undefined): Partial<Record<K, number>> {
	if (raw === undefined) return {};
	const value = Number(raw);
	if (!Number.isInteger(value) || value < 0 || value > 10) throw new UsageError(`--${flag} must be an integer from 0 to 10, got "${raw}"`);
	const result: Partial<Record<K, number>> = {};
	result[key] = value;
	return result;
}

function castList(value: string): readonly string[] {
	const ids = value.split(",").map((id) => id.trim()).filter((id) => id.length > 0);
	if (ids.length === 0) throw new UsageError("--cast needs at least one figure ID");
	if (new Set(ids).size !== ids.length) throw new UsageError("--cast names a figure twice");
	return ids;
}

function judgeTemper(value: string): JudgeTemper {
	const temper = JUDGE_TEMPERS.find((entry) => entry === value);
	if (temper === undefined) throw new UsageError(`--judge-temper must be one of ${JUDGE_TEMPERS.join(", ")}`);
	return temper;
}
