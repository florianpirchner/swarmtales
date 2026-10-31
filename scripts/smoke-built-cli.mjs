// `pnpm smoke`: runs the built binary (after `pnpm build`), not the sources.
// `swt --help` proves the bundle starts; `swt validate` proves the prompt library resolves from a build.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";

const binary = resolve(import.meta.dirname, "..", "apps", "cli", "dist", "swt.js");
if (!existsSync(binary)) {
	process.stderr.write(`smoke: ${binary} is missing; run \`pnpm build\` first\n`);
	process.exit(1);
}

function swt(...args) {
	return execFileSync(process.execPath, [binary, ...args], { encoding: "utf8", env: { ...process.env, ANTHROPIC_API_KEY: "", OPENROUTER_API_KEY: "" } });
}

const help = swt("--help");
if (!help.startsWith("Usage: swt <command>") || !help.includes("validate")) {
	process.stderr.write(`smoke: unexpected output of \`swt --help\`:\n${help}\n`);
	process.exit(1);
}
const validation = swt("validate");
if (!validation.includes("ok   prompts:")) {
	process.stderr.write(`smoke: unexpected output of \`swt validate\`:\n${validation}\n`);
	process.exit(1);
}
process.stdout.write("ok   smoke: built swt answers --help and validates the stories and the prompt library\n");
