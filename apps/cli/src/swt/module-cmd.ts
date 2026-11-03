/**
 * `swt module list|show <id>`: the mechanics a story can load (docs/ideas/monorepo.md §3c). A
 * module's tools exist only once it is instantiated for a run, so `show` lists what its definition
 * declares: options (as JSON Schema), events, the APIs it needs and gives, decisions and prompts.
 */
import type { MechanicDefinition } from "@swarmtales/contracts";
import { arena } from "@swarmtales/mechanic-arena";
import { cast } from "@swarmtales/mechanic-cast";
import { channels } from "@swarmtales/mechanic-channels";
import { exile } from "@swarmtales/mechanic-exile";
import { goals } from "@swarmtales/mechanic-goals";
import { ledger } from "@swarmtales/mechanic-ledger";
import { marks } from "@swarmtales/mechanic-marks";
import { motives } from "@swarmtales/mechanic-motives";
import { names } from "@swarmtales/mechanic-names";
import { petitions } from "@swarmtales/mechanic-petitions";
import { progression } from "@swarmtales/mechanic-progression";
import { puzzles } from "@swarmtales/mechanic-puzzles";
import { receipts } from "@swarmtales/mechanic-receipts";
import { script } from "@swarmtales/mechanic-script";
import { seal } from "@swarmtales/mechanic-seal";
import { standoff } from "@swarmtales/mechanic-standoff";
import { standoffTribunal } from "@swarmtales/mechanic-standoff-tribunal";
import { tribunal } from "@swarmtales/mechanic-tribunal";
import { whispers } from "@swarmtales/mechanic-whispers";
import { UsageError } from "../args.ts";
import { json, parseFlags, table, type CommandRun, type Noun } from "./io.ts";

const MODULES: readonly MechanicDefinition[] = [arena, cast, channels, exile, goals, ledger, marks, motives, names, petitions, progression, puzzles, receipts, script, seal, standoff, standoffTribunal, tribunal, whispers];

const apiNames = (apis: readonly { readonly name: string }[]) => apis.map((api) => api.name);
const plain = (schema: unknown): unknown => JSON.parse(JSON.stringify(schema));

const list: CommandRun = (argv, io) => {
	const { flags } = parseFlags(argv);
	const rows = MODULES.map((module) => ({ id: module.id, summary: module.summary }));
	io.out(flags.json === true ? json(rows) : table(["id", "summary"], rows.map((row) => [row.id, row.summary])));
	return 0;
};

const show: CommandRun = (argv, io) => {
	const { positionals, flags } = parseFlags(argv);
	const [id, ...rest] = positionals;
	if (id === undefined || rest.length > 0) throw new UsageError("show takes one module id");
	const module = MODULES.find((candidate) => candidate.id === id);
	if (module === undefined) {
		io.err(`Unknown module "${id}". Known: ${MODULES.map((candidate) => candidate.id).join(", ")}`);
		return 1;
	}
	const events = Object.entries(module.events).map(([type, schema]) => ({ type, schema: plain(schema) }));
	const info = {
		id: module.id,
		summary: module.summary,
		requires: apiNames(module.requires),
		provides: apiNames(module.provides),
		uses: apiNames(module.uses),
		options: plain(module.options),
		events,
		decisions: Object.keys(module.decisions),
		prompts: Object.fromEntries(Object.entries(module.prompts).map(([key, variables]) => [key, [...variables]])),
	};
	if (flags.json === true) {
		io.out(json(info));
		return 0;
	}
	const options = plain(module.options);
	const properties = typeof options === "object" && options !== null && "properties" in options && typeof options.properties === "object" && options.properties !== null ? Object.keys(options.properties) : [];
	io.out(
		[
			`${info.id}: ${info.summary}`,
			`requires: ${info.requires.join(", ") || "-"}`,
			`provides: ${info.provides.join(", ") || "-"}`,
			`uses: ${info.uses.join(", ") || "-"}`,
			`options: ${properties.join(", ") || "-"}   (full schema: --json)`,
			`events: ${events.map((event) => event.type).join(", ") || "-"}`,
			`decisions: ${info.decisions.join(", ") || "-"}`,
			`prompts: ${Object.keys(info.prompts).join(", ") || "-"}`,
		].join("\n"),
	);
	return 0;
};

export const moduleNoun: Noun = {
	name: "module",
	verbs: {
		list: { args: "[--json]", summary: "the mechanics, with what each does", run: list },
		show: { args: "<id> [--json]", summary: "options (JSON Schema), events, APIs, decisions and prompts of one mechanic", run: show },
	},
};
