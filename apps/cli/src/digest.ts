/**
 * `pnpm digest runs/run-NNN [--chronicle]`: turns a run into a readable story
 * (SPEC 15). The deterministic digest always runs offline; the chronicle
 * needs a model and its API key and is skipped gracefully without them.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { analyzeRun, type Beat, DIGEST_DIRECTORY, DIGEST_FILES, DigestError, resolveNarrativeModel, writeChronicle, writeDigest } from "@swarmtales/chronicle";
import { createProviderRegistry } from "@swarmtales/models";
import { UsageError } from "./args.ts";
import { DIGEST_USAGE, parseDigestArgs } from "./digest-args.ts";

const envFile = join(process.cwd(), ".env");
// Existing environment variables win; the file only fills gaps.
if (existsSync(envFile)) loadEnvFile(envFile);

function fail(message: string): never {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

let args;
try {
	args = parseDigestArgs(process.argv.slice(2));
} catch (error) {
	if (error instanceof UsageError) fail(`${error.message}\n\n${DIGEST_USAGE}`);
	throw error;
}

const directory = resolve(args.runDirectory);
let analysis;
try {
	analysis = analyzeRun(directory);
} catch (error) {
	if (error instanceof DigestError) fail(error.message);
	throw error;
}
for (const issue of analysis.issues) process.stderr.write(`warning: events.jsonl ${issue}\n`);

let narrative: readonly Beat[] = [];
let chroniclePath: string | undefined;
if (args.chronicle) {
	const choice = resolveNarrativeModel(
		{ ...(args.provider === undefined ? {} : { provider: args.provider }), ...(args.model === undefined ? {} : { model: args.model }) },
		process.env,
		createProviderRegistry(),
	);
	if (!choice.ok) {
		process.stdout.write(`chronicle skipped: ${choice.reason}\n`);
	} else {
		process.stdout.write(`chronicle: asking ${choice.model.label} ...\n`);
		try {
			const chronicle = await writeChronicle(analysis, choice.model);
			narrative = chronicle.beats;
			mkdirSync(join(directory, DIGEST_DIRECTORY), { recursive: true });
			chroniclePath = join(directory, DIGEST_DIRECTORY, DIGEST_FILES.chronicle);
			writeFileSync(chroniclePath, chronicle.markdown);
			for (const warning of chronicle.warnings) process.stderr.write(`warning: chronicle ${warning}\n`);
		} catch (error) {
			process.stdout.write(`chronicle skipped: ${error instanceof Error ? error.message : String(error)}\n`);
		}
	}
}

const written = writeDigest(directory, analysis, narrative);
const counts = new Map<string, number>();
for (const beat of written.documents.allBeats) counts.set(beat.kind, (counts.get(beat.kind) ?? 0) + 1);
process.stdout.write(
	[
		`beats:         ${written.beats} (${written.documents.allBeats.length}${counts.size > 0 ? `: ${[...counts].map(([kind, count]) => `${count} ${kind}`).join(", ")}` : ""})`,
		`relationships: ${written.relationships} (${written.documents.graph.pairs.length} pairs)`,
		`timeline:      ${written.timeline}`,
		...(chroniclePath === undefined ? [] : [`chronicle:     ${chroniclePath}`]),
		"",
	].join("\n"),
);
