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
