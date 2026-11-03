/**
 * `swt doctor`: is this machine ready to play? Node version, the prompt library, and which provider
 * keys are present. Keys are reported as set or missing, never printed. Nothing here calls a
 * provider, so a key being present says nothing about whether it works; `swt run` with the
 * `scripted` provider is the offline check of the whole pipeline.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadEnvFile } from "node:process";
import { BUILTIN_PROVIDERS } from "@swarmtales/models";
import { libraryRoot } from "@swarmtales/prompts";
import { json, parseFlags, table, type CommandRun } from "./io.ts";

/** `engines.node` of the root package.json. */
const MINIMUM_NODE = [22, 19] as const;

interface Check {
	readonly name: string;
	readonly status: "ok" | "warn" | "fail";
	readonly detail: string;
}

function nodeIsRecent(version: string): boolean {
	const [major = 0, minor = 0] = version.split(".").map(Number);
	return major > MINIMUM_NODE[0] || (major === MINIMUM_NODE[0] && minor >= MINIMUM_NODE[1]);
}

function checks(env: Readonly<Partial<Record<string, string>>>): readonly Check[] {
	const result: Check[] = [{ name: "node", status: nodeIsRecent(process.versions.node) ? "ok" : "fail", detail: `${process.versions.node} (needs >= ${MINIMUM_NODE.join(".")})` }];
	try {
		result.push({ name: "library", status: "ok", detail: libraryRoot() });
	} catch (error) {
		result.push({ name: "library", status: "fail", detail: error instanceof Error ? error.message : String(error) });
	}
	for (const provider of BUILTIN_PROVIDERS) {
		if (provider.apiKeyEnv.length === 0) {
			result.push({ name: `provider ${provider.id}`, status: "ok", detail: "needs no key" });
			continue;
		}
		const missing = provider.apiKeyEnv.filter((name) => (env[name] ?? "").length === 0);
		result.push({ name: `provider ${provider.id}`, status: missing.length === 0 ? "ok" : "warn", detail: missing.length === 0 ? `${provider.apiKeyEnv.join(", ")} set` : `${missing.join(", ")} not set` });
	}
	if ((env.ANTHROPIC_API_KEY ?? "").length > 0 && (env.ARENA_ANTHROPIC_API_KEY ?? "").length === 0) {
		result.push({ name: "anthropic key", status: "warn", detail: "ANTHROPIC_API_KEY is set, but the arena reads ARENA_ANTHROPIC_API_KEY only" });
	}
	return result;
}

export const doctorCommand: CommandRun = (argv, io) => {
	const { flags } = parseFlags(argv);
	// Like `swt run`: a .env in the working directory fills what the environment lacks.
	if (existsSync(join(process.cwd(), ".env"))) loadEnvFile(join(process.cwd(), ".env"));
	const results = checks(process.env);
	io.out(flags.json === true ? json(results) : table(["check", "status", "detail"], results.map((check) => [check.name, check.status, check.detail])));
	return results.some((check) => check.status === "fail") ? 1 : 0;
};
