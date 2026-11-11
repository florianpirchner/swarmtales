/**
 * A RunSource over a GitHub repository: the whole file tree comes in one call of the git trees API (so
 * listing a series of runs costs one request, not one per folder), files from raw.githubusercontent.com,
 * or, with a token, from the contents API (which allows an `Authorization` header across origins).
 */
import { joinPath, memorySource, type RunSource } from "@swarmtales/viewer-core";
import { Type } from "typebox";
import { Check } from "typebox/value";

export interface GithubLocation {
	readonly owner: string;
	readonly repo: string;
	readonly ref: string;
	/** Folder of the repository the source's root is. */
	readonly path: string;
}

export type FetchFn = (url: string, init?: { readonly headers?: Readonly<Record<string, string>> }) => Promise<{ readonly ok: boolean; readonly status: number; json(): Promise<unknown>; text(): Promise<string> }>;

const TreeResponse = Type.Object({
	tree: Type.Array(Type.Object({ path: Type.String(), type: Type.String() })),
	truncated: Type.Optional(Type.Boolean()),
});

/** `owner/name` and the optional ref and path of a viewer URL's query (`?repo=owner/name&ref=main&path=stories/chess/runs`). */
export function locationFromQuery(query: string): GithubLocation | undefined {
	const params = new URLSearchParams(query);
	const [owner, repo, ...extra] = (params.get("repo") ?? "").split("/");
	if (owner === undefined || owner === "" || repo === undefined || repo === "" || extra.length > 0) return undefined;
	const ref = params.get("ref");
	return { owner, repo, ref: ref === null || ref === "" ? "main" : ref, path: joinPath(params.get("path") ?? "") };
}

const encode = (path: string): string => path.split("/").map(encodeURIComponent).join("/");

export function treeUrl(location: GithubLocation): string {
	return `https://api.github.com/repos/${encodeURIComponent(location.owner)}/${encodeURIComponent(location.repo)}/git/trees/${encodeURIComponent(location.ref)}?recursive=1`;
}

export function rawUrl(location: GithubLocation, path: string): string {
	return `https://raw.githubusercontent.com/${encodeURIComponent(location.owner)}/${encodeURIComponent(location.repo)}/${encode(location.ref)}/${encode(joinPath(location.path, path))}`;
}

export function contentsUrl(location: GithubLocation, path: string): string {
	return `https://api.github.com/repos/${encodeURIComponent(location.owner)}/${encodeURIComponent(location.repo)}/contents/${encode(joinPath(location.path, path))}?ref=${encodeURIComponent(location.ref)}`;
}

/**
 * The source for a location. `token` is used for the requests and kept nowhere else (not in storage, not in a URL, not logged);
 * it is never put into an error message either.
 */
export function githubSource(location: GithubLocation, fetchFn: FetchFn, token?: string): RunSource {
	const auth = token === undefined || token === "" ? {} : { Authorization: `Bearer ${token}` };
	let tree: Promise<{ readonly source: RunSource; readonly files: ReadonlySet<string>; readonly truncated: boolean }> | undefined;
	const loadTree = async () => {
		const response = await fetchFn(treeUrl(location), { headers: { Accept: "application/vnd.github+json", ...auth } });
		if (!response.ok) throw new Error(response.status === 404 ? `GitHub: ${location.owner}/${location.repo} at ${location.ref} was not found (a private repository needs a token)` : response.status === 403 || response.status === 429 ? "GitHub refused the request (rate limit reached?); a token raises the limit" : `GitHub answered ${String(response.status)}`);
		const body: unknown = await response.json();
		if (!Check(TreeResponse, body)) throw new Error("GitHub's file tree has an unexpected shape");
		const base = joinPath(location.path);
		const files = new Set(body.tree.filter((entry) => entry.type === "blob" && (base === "" || entry.path.startsWith(`${base}/`))).map((entry) => (base === "" ? entry.path : entry.path.slice(base.length + 1))));
		// Directories are implied by the file paths; the listing is a map of empty texts.
		return { source: memorySource(Object.fromEntries([...files].map((file) => [file, ""]))), files, truncated: body.truncated === true };
	};
	const treeOnce = () => (tree ??= loadTree());
	return {
		async list(dir) {
			return (await treeOnce()).source.list(dir);
		},
		async readText(path) {
			const known = await treeOnce();
			if (!known.files.has(joinPath(path))) return undefined;
			const response = auth.Authorization === undefined ? await fetchFn(rawUrl(location, path)) : await fetchFn(contentsUrl(location, path), { headers: { Accept: "application/vnd.github.raw+json", ...auth } });
			if (response.status === 404) return undefined;
			if (!response.ok) throw new Error(`GitHub answered ${String(response.status)} for ${joinPath(path)}`);
			return response.text();
		},
	};
}
