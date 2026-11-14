/**
 * Criterion 2 of DECISIONS.md D1, second half: how long a completion inside a tool handler takes.
 * Drives the TypeScript language service the way an editor does: the project is opened from its
 * sources (dependencies resolve to their `.ts` files through the `development` condition, as
 * tsserver does for referenced projects), `ctx.` is typed on a new line inside a tool handler and
 * `getCompletionsAtPosition` is timed. Cold: a fresh service, first request. Warm: the median of
 * five further requests, each after one more typed character (a new file version); the part of it
 * the service needs to bring its program up to date is given apart (`program`), and the processor
 * time of the request (`cpu`, all threads of the process: above the wall time when the garbage
 * collector works in parallel, below it when other processes take the cores).
 * Also asks for the completion of `ctx.emit("` and reports the names offered.
 * Run from the repository root: `node spike/define-mechanic/measure/completion-time.mjs [--dts]`
 * (`--dts` after `tsc -b mechanics/channels mechanics/chess mechanics/marks`).
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import ts from "typescript";

const DTS = process.argv.includes("--dts");

const CASES = [
	["head-and-body", "channels", "mechanics/channels/tsconfig.json", "mechanics/channels/src/tools.ts", "const self = selfOf(ctx);"],
	["head-and-body", "chess", "mechanics/chess/tsconfig.json", "mechanics/chess/src/index.ts", "const game = ctx.state.game;"],
	["one-object", "channels", "spike/define-mechanic/tsconfig.one-channels.json", "spike/define-mechanic/src/channels/index.ts", "const self = selfOf(ctx);"],
	["one-object", "chess", "spike/define-mechanic/tsconfig.one-chess.json", "spike/define-mechanic/src/chess/index.ts", "const game = ctx.state.game;"],
	["declared-head", "channels", "spike/define-mechanic/tsconfig.declared-channels.json", "spike/define-mechanic/src/channels-declared/index.ts", "const self = selfOf(ctx);"],
	["declared-head", "chess", "spike/define-mechanic/tsconfig.declared-chess.json", "spike/define-mechanic/src/chess-declared/index.ts", "const game = ctx.state.game;"],
	["head-apart", "chess", "spike/define-mechanic/tsconfig.one-chess-head-apart.json", "spike/define-mechanic/src/chess-head-apart/index.ts", "const game = ctx.state.game;"],
	// The floor: the 40-line first mechanic of paper 04, and the small `marks` mechanic of today.
	["one-object", "guess", "spike/define-mechanic/tsconfig.probe.json", "spike/define-mechanic/src/probes/guess-number.ts", "const hint = value ==="],
	["head-and-body", "marks", "mechanics/marks/tsconfig.json", "mechanics/marks/src/index.ts", "const status = spend(ctx.state, book, input.resident, input.channel);"],
];

function measure(project, file, anchor, typed) {
	const configPath = resolve(project);
	const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: (diagnostic) => { throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")); } });
	const target = resolve(file);
	const original = readFileSync(target, "utf8");
	const at = original.indexOf(anchor);
	if (at === -1 || original.indexOf(anchor, at + 1) !== -1) throw new Error(`${file}: the anchor must occur exactly once`);
	const snapshots = new Map();
	let extra = "";
	let version = 0;
	const text = () => `${original.slice(0, at)}${typed}${extra}\n${original.slice(at)}`;
	const host = {
		getCompilationSettings: () => parsed.options,
		// With `--dts` the dependencies are read from their built declaration files, as for an installed package.
		...(DTS ? { getProjectReferences: () => parsed.projectReferences } : {}),
		getScriptFileNames: () => parsed.fileNames,
		getScriptVersion: (name) => (name === target ? String(version) : "0"),
		getScriptSnapshot: (name) => {
			if (name === target) return ts.ScriptSnapshot.fromString(text());
			// An editor keeps unchanged files in memory.
			if (!snapshots.has(name)) snapshots.set(name, ts.sys.fileExists(name) ? ts.ScriptSnapshot.fromString(readFileSync(name, "utf8")) : undefined);
			return snapshots.get(name);
		},
		getCurrentDirectory: () => dirname(configPath),
		getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
		fileExists: ts.sys.fileExists,
		readFile: ts.sys.readFile,
		readDirectory: ts.sys.readDirectory,
		directoryExists: ts.sys.directoryExists,
		getDirectories: ts.sys.getDirectories,
		realpath: ts.sys.realpath,
	};
	const service = ts.createLanguageService(host, ts.createDocumentRegistry());
	const ask = () => {
		const position = at + typed.length + extra.length;
		const cpu = process.cpuUsage();
		const started = performance.now();
		service.getProgram();
		const synced = performance.now();
		const found = service.getCompletionsAtPosition(target, position, { includeCompletionsForModuleExports: false });
		const used = process.cpuUsage(cpu);
		return { ms: performance.now() - started, syncMs: synced - started, cpuMs: (used.user + used.system) / 1000, names: (found?.entries ?? []).map((entry) => entry.name) };
	};
	const cold = ask();
	const warm = [];
	const more = typed.endsWith('"') ? "gro" : "sta";
	for (let step = 0; step < 5; step += 1) {
		extra = more.slice(0, (step % more.length) + 1);
		version += 1;
		warm.push(ask());
	}
	warm.sort((a, b) => a.ms - b.ms);
	service.dispose();
	return { cold: cold.ms, warm: warm[2].ms, warmSync: warm[2].syncMs, warmCpu: warm[2].cpuMs, names: cold.names };
}

for (const [form, name, project, file, anchor] of CASES) {
	const member = measure(project, file, anchor, "ctx.");
	const event = measure(project, file, anchor, 'ctx.emit("');
	console.log(`${form.padEnd(14)} ${name.padEnd(9)} ctx.        cold ${(member.cold / 1000).toFixed(2)}s  warm ${member.warm.toFixed(0)}ms (program ${member.warmSync.toFixed(0)}ms, cpu ${member.warmCpu.toFixed(0)}ms)  ${String(member.names.length)} entries (${member.names.slice(0, 6).join(", ")}, ...)`);
	console.log(`${form.padEnd(14)} ${name.padEnd(9)} ctx.emit("  cold ${(event.cold / 1000).toFixed(2)}s  warm ${event.warm.toFixed(0)}ms (program ${event.warmSync.toFixed(0)}ms, cpu ${event.warmCpu.toFixed(0)}ms)  ${String(event.names.length)} entries (${event.names.slice(0, 4).join(", ")}, ...)`);
}
