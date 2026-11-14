/**
 * Criterion 3 of DECISIONS.md D1: a wrong service name and a wrong event payload, in both forms
 * of `channels` and `chess`. Each mistake is one textual change of one file, made in memory; the
 * project is compiled as `tsc` does and the errors are printed as `tsc` prints them. Reported per
 * mistake: the number of errors, the lines of the whole output, and whether the output names the
 * property that is wrong.
 * Run from the repository root after `tsc -b mechanics/channels mechanics/chess`:
 * `node spike/define-mechanic/measure/error-text.mjs [--print]`.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const ONE = "spike/define-mechanic";
const MISTAKES = [
	// One-object form.
	{ form: "one-object", name: "channels", what: "service key misspelled", project: `${ONE}/tsconfig.one-channels.json`, file: `${ONE}/src/channels/index.ts`, from: "\t\tnotes: {\n", to: "\t\tnotez: {\n", names: ["notez", "notes"] },
	{ form: "one-object", name: "channels", what: "call of a service not in requires", project: `${ONE}/tsconfig.one-channels.json`, file: `${ONE}/src/channels/index.ts`, from: "\t\t\t\tconst text = reason.trim();\n", to: '\t\t\t\tconst text = reason.trim();\n\t\t\t\tctx.call(ReceiptsApi, "issue", {});\n', names: ["receipts"] },
	{ form: "one-object", name: "channels", what: "event payload: wrong type of a field", project: `${ONE}/tsconfig.one-channels.json`, file: `${ONE}/src/channels/index.ts`, from: "{ agent: selfOf(ctx), reason: text,", to: "{ agent: selfOf(ctx), reason: 42,", names: ["reason"] },
	{ form: "one-object", name: "channels", what: "event payload: field missing", project: `${ONE}/tsconfig.one-channels.json`, file: `${ONE}/src/channels/index.ts`, from: "{ agent: selfOf(ctx), reason: text,", to: "{ agent: selfOf(ctx),", names: ["reason"] },
	{ form: "one-object", name: "channels", what: "event name misspelled", project: `${ONE}/tsconfig.one-channels.json`, file: `${ONE}/src/channels/index.ts`, from: 'ctx.emit("gamemaker_defied",', to: 'ctx.emit("gamemaker_defyed",', names: ["gamemaker_defyed"] },
	{ form: "one-object", name: "chess", what: "service key misspelled", project: `${ONE}/tsconfig.one-chess.json`, file: `${ONE}/src/chess/index.ts`, from: '\t\t"brain-source": {\n', to: '\t\t"brain-sauce": {\n', names: ["brain-sauce", "brain-source"] },
	{ form: "one-object", name: "chess", what: "service method misspelled", project: `${ONE}/tsconfig.one-chess.json`, file: `${ONE}/src/chess/index.ts`, from: "\t\t\thold: (_input, ctx) => {", to: "\t\t\thodl: (_input, ctx) => {", names: ["hodl", "hold"] },
	{ form: "one-object", name: "chess", what: "event payload: wrong type of a field", project: `${ONE}/tsconfig.one-chess.json`, file: `${ONE}/src/chess/index.ts`, from: "\t\t\t\tconst game = ctx.state.game;\n", to: '\t\t\t\tconst game = ctx.state.game;\n\t\t\t\tctx.emit("match_ended", { scores: "none" });\n', names: ["scores"] },
	{ form: "one-object", name: "channels", what: "service key misspelled, 16 methods (worst)", project: `${ONE}/tsconfig.one-channels.json`, file: `${ONE}/src/channels/index.ts`, from: "\t\tchannels: {\n", to: "\t\tchanels: {\n", names: ["chanels", "channels"] },
	{ form: "one-object", name: "channels", what: "event payload: unknown field", project: `${ONE}/tsconfig.one-channels.json`, file: `${ONE}/src/channels/index.ts`, from: "{ agent: selfOf(ctx), reason: text,", to: "{ agent: selfOf(ctx), reason: text, mood: 1,", names: ["mood"] },
	// Head-and-body form: the same mistakes.
	{ form: "head-and-body", name: "channels", what: "provides an undeclared API, 16 methods (worst)", project: "mechanics/channels/tsconfig.json", file: "mechanics/channels/src/index.ts", from: "kit.provide(ChannelsApi, {", to: "kit.provide(ExileApi, {", names: ["exile", "ExileApi"], extraImport: 'import { ExileApi } from "@swarmtales/mechanic-shared";\n' },
	{ form: "head-and-body", name: "channels", what: "event payload: unknown field", project: "mechanics/channels/tsconfig.json", file: "mechanics/channels/src/defy.ts", from: "{ agent: selfOf(ctx), reason: text,", to: "{ agent: selfOf(ctx), reason: text, mood: 1,", names: ["mood"] },
	{ form: "head-and-body", name: "channels", what: "provides an API the head does not declare", project: "mechanics/channels/tsconfig.json", file: "mechanics/channels/src/index.ts", from: "kit.provide(NotesApi, {", to: "kit.provide(ExileApi, {", names: ["exile", "ExileApi"], extraImport: 'import { ExileApi } from "@swarmtales/mechanic-shared";\n' },
	{ form: "head-and-body", name: "channels", what: "call of a service not in requires", project: "mechanics/channels/tsconfig.json", file: "mechanics/channels/src/defy.ts", from: "\t\t\tconst text = reason.trim();\n", to: '\t\t\tconst text = reason.trim();\n\t\t\tctx.call(ReceiptsApi, "issue", {});\n', names: ["receipts"], extraImport: 'import { ReceiptsApi } from "@swarmtales/mechanic-shared";\n' },
	{ form: "head-and-body", name: "channels", what: "event payload: wrong type of a field", project: "mechanics/channels/tsconfig.json", file: "mechanics/channels/src/defy.ts", from: "{ agent: selfOf(ctx), reason: text,", to: "{ agent: selfOf(ctx), reason: 42,", names: ["reason"] },
	{ form: "head-and-body", name: "channels", what: "event payload: field missing", project: "mechanics/channels/tsconfig.json", file: "mechanics/channels/src/defy.ts", from: "{ agent: selfOf(ctx), reason: text,", to: "{ agent: selfOf(ctx),", names: ["reason"] },
	{ form: "head-and-body", name: "channels", what: "event name misspelled", project: "mechanics/channels/tsconfig.json", file: "mechanics/channels/src/defy.ts", from: 'ctx.emit("gamemaker_defied",', to: 'ctx.emit("gamemaker_defyed",', names: ["gamemaker_defyed"] },
	{ form: "head-and-body", name: "chess", what: "provides an API the head does not declare", project: "mechanics/chess/tsconfig.json", file: "mechanics/chess/src/index.ts", from: "kit.provide(BrainSourceApi, {", to: "kit.provide(TeamChannelApi, {", names: ["team-channel", "TeamChannelApi"] },
	{ form: "head-and-body", name: "chess", what: "service method misspelled", project: "mechanics/chess/tsconfig.json", file: "mechanics/chess/src/index.ts", from: "\t\t\thold: (_input, ctx) => {", to: "\t\t\thodl: (_input, ctx) => {", names: ["hodl", "hold"] },
	{ form: "head-and-body", name: "chess", what: "event payload: wrong type of a field", project: "mechanics/chess/tsconfig.json", file: "mechanics/chess/src/index.ts", from: "\t\t\t\tconst game = ctx.state.game;\n", to: '\t\t\t\tconst game = ctx.state.game;\n\t\t\t\tctx.emit("match_ended", { scores: "none" });\n', names: ["scores"] },
];

const print = process.argv.includes("--print");
for (const mistake of MISTAKES) {
	const parsed = ts.getParsedCommandLineOfConfigFile(resolve(mistake.project), { noEmit: true }, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined });
	const target = resolve(mistake.file);
	const original = readFileSync(target, "utf8");
	if (original.split(mistake.from).length !== 2) throw new Error(`${mistake.file}: "${mistake.from.trim()}" must occur exactly once`);
	const changed = (mistake.extraImport ?? "") + original.replace(mistake.from, mistake.to);
	const host = ts.createCompilerHost(parsed.options);
	const read = host.readFile.bind(host);
	host.readFile = (name) => (resolve(name) === target ? changed : read(name));
	const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, projectReferences: parsed.projectReferences, host });
	const diagnostics = ts.getPreEmitDiagnostics(program);
	const output = ts.formatDiagnostics(diagnostics, { getCanonicalFileName: (name) => name, getCurrentDirectory: () => process.cwd(), getNewLine: () => "\n" });
	const lines = output.split("\n").filter((line) => line.length > 0);
	const longest = Math.max(0, ...lines.map((line) => line.length));
	const first = diagnostics[0] === undefined ? 0 : ts.flattenDiagnosticMessageText(diagnostics[0].messageText, "\n").split("\n").length;
	const named = mistake.names.filter((name) => output.includes(name));
	console.log(`${mistake.form.padEnd(14)} ${mistake.name.padEnd(9)} ${mistake.what.padEnd(42)} errors ${String(diagnostics.length)}  first error ${String(first)} lines  all ${String(lines.length)} lines  longest line ${String(longest)} chars  names ${named.length > 0 ? named.map((name) => `"${name}"`).join(", ") : "NOTHING"}`);
	if (print) console.log(`${output}\n`);
}
