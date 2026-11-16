// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `pnpm release:names [--owner <npm user>]`: asks the registry, read-only, whether each planned name is free or held
 * (`13-m6-spec.md` 6.3, O2): every listed package, `create-swarmtales`, and the scope `@swarmtales` (an organisation
 * or a user). One HTTPS `GET` per name with Node's `fetch` (not `npm view`: the npm command line is not on the
 * licence allowlist). Run by hand only, never in a test, never in the check. Reserving a name is the owner's (O2).
 */
import { Type } from "typebox";
import { Value } from "typebox/value";
import { REPO_ROOT } from "../lib/files.ts";
import { readList } from "./list.ts";

/** The registry the names are asked of. */
export const REGISTRY = "https://registry.npmjs.org";

/** The scope of the published packages. */
export const SCOPE = "swarmtales";

/** Names planned beside the published list (O2). */
export const EXTRA_NAMES: readonly string[] = ["create-swarmtales"];

/** Reads a URL: its status and its JSON body (`undefined` when it has none). */
export type Fetcher = (url: string) => Promise<{ readonly status: number; readonly body: unknown }>;

/** What the registry says of one name. */
export interface NameState { readonly name: string; readonly state: "free" | "held by the owner" | "held by another" | "held" | "unknown"; readonly detail: string }

const Maintainer = Type.Object({ name: Type.String({ description: "An npm user" }) }, { description: "A maintainer" });
const Packument = Type.Object({ maintainers: Type.Optional(Type.Array(Maintainer, { description: "Who may publish" })) }, { description: "The part of a registry document that names its maintainers" });

/**
 * Asks the registry about one package name.
 *
 * @param name - The package name.
 * @param fetcher - The read of a URL.
 * @param owner - The owner's npm user, when known.
 * @returns The state of the name.
 */
export async function nameState(name: string, fetcher: Fetcher, owner?: string): Promise<NameState> {
	const { status, body } = await fetcher(`${REGISTRY}/${name.replace("/", "%2f")}`);
	if (status === 404) return { name, state: "free", detail: "no package of that name" };
	if (status !== 200 || !Value.Check(Packument, body)) return { name, state: "unknown", detail: `the registry answered ${String(status)}` };
	const maintainers = (body.maintainers ?? []).map((user) => user.name);
	const state = owner === undefined ? "held" : maintainers.includes(owner) ? "held by the owner" : "held by another";
	return { name, state, detail: `maintainers: ${maintainers.join(", ") || "none listed"}` };
}

/**
 * Asks the registry about the scope: the list of its packages answers 404 ("Scope not found") when no organisation and
 * no user of that name exists.
 *
 * @param fetcher - The read of a URL.
 * @returns The state of the scope; a held scope does not say whose it is.
 */
export async function scopeState(fetcher: Fetcher): Promise<NameState> {
	const name = `@${SCOPE}`;
	const { status } = await fetcher(`${REGISTRY}/-/org/${SCOPE}/package`);
	if (status === 404) return { name, state: "free", detail: `no organisation and no user ${SCOPE}` };
	return status === 200 ? { name, state: "held", detail: `the scope exists; check at https://www.npmjs.com/~${SCOPE} or https://www.npmjs.com/org/${SCOPE} that it is the owner's` } : { name, state: "unknown", detail: `the registry answered ${String(status)}` };
}

/** The read of the command: Node's `fetch`, a `GET` with a plain client name. */
const httpFetcher: Fetcher = async (url) => {
	const answer = await fetch(url, { headers: { accept: "application/json", "user-agent": "swarmtales-release-names" } });
	const body: unknown = answer.status === 200 ? await answer.json() : undefined;
	return { status: answer.status, body };
};

async function main(args: readonly string[]): Promise<number> {
	const at = args.indexOf("--owner");
	const owner = at >= 0 ? args[at + 1] : undefined;
	const names = [...readList(REPO_ROOT).map((entry) => entry.name), ...EXTRA_NAMES];
	const states = [await scopeState(httpFetcher)];
	for (const name of names) states.push(await nameState(name, httpFetcher, owner));
	for (const state of states) console.log(`${state.name}: ${state.state} (${state.detail})`);
	const blocked = states.filter((state) => state.state === "held by another" || state.state === "unknown");
	console.log(`release:names: ${String(states.length)} names asked, ${String(blocked.length)} held by another or unknown; reserving is the owner's (O2)`);
	return blocked.length === 0 ? 0 : 1;
}

if (process.argv[1] === import.meta.filename) process.exitCode = await main(process.argv.slice(2));
