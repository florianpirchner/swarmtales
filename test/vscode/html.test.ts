/** The webview page: a strict CSP with a nonce, no remote origin, the viewer script and nothing else. */
import { describe, expect, it } from "vitest";
import { buildHtml, contentSecurityPolicy, makeNonce } from "../../apps/vscode/src/html.ts";
import { runStoryCommand } from "../../apps/vscode/src/terminal-command.ts";
import { parseStoryFile } from "../../apps/vscode/src/story-file.ts";
import { NO_DATA, parseViewerData } from "../../apps/vscode/src/viewer-data.ts";

const SOURCE = "https://file+.vscode-resource.vscode-cdn.net";

describe("webview html", () => {
	it("makes a nonce of the given length from the random source", () => {
		expect(makeNonce((bytes) => bytes.fill(1), 8)).toBe("BBBBBBBB");
		expect(makeNonce()).toMatch(/^[A-Za-z0-9]{32}$/);
		expect(makeNonce()).not.toBe(makeNonce());
	});
	it("allows one nonced script and no remote origin", () => {
		const policy = contentSecurityPolicy("abc123", SOURCE);
		expect(policy).toContain("default-src 'none'");
		expect(policy).toContain("script-src 'nonce-abc123'");
		expect(policy).not.toMatch(/script-src[^;]*(unsafe|\*|https?:)/);
		expect(policy).not.toMatch(/connect-src|frame-src|object-src/);
		// The chain-check worker comes only from a blob URL of the bundle's own code.
		expect(/worker-src ([^;]*)/.exec(policy)?.[1]).toBe("blob:");
		expect(/https?:\/\/(?!file\+\.vscode-resource)/.exec(policy)).toBeNull();
	});
	it("builds a page with the policy, the script and style from the extension, and an escaped title", () => {
		const html = buildHtml({ nonce: "n0nce", cspSource: SOURCE, scriptUri: `${SOURCE}/dist/webview.js`, styleUri: `${SOURCE}/dist/webview.css`, title: 'a "run" <b>' });
		expect(html).toContain('http-equiv="Content-Security-Policy"');
		expect(html).toContain(`<script nonce="n0nce" src="${SOURCE}/dist/webview.js"></script>`);
		expect(html).toContain(`href="${SOURCE}/dist/webview.css"`);
		expect(html).toContain("<title>a &quot;run&quot; &lt;b&gt;</title>");
		expect(html.match(/<script/g)).toHaveLength(1);
		expect(html).not.toMatch(/<script(?![^>]*nonce)/);
	});
});

describe("terminal command", () => {
	it("prefills pnpm swt run for a plain path and refuses any other", () => {
		expect(runStoryCommand("stories/chess/chess.story.yaml")).toBe("pnpm swt run --story stories/chess/chess.story.yaml");
		expect(runStoryCommand("/home/me/x.story.yaml")).toBe("pnpm swt run --story /home/me/x.story.yaml");
		expect(runStoryCommand("stories/@me/v1.2+x=y,z-w_q.story.json")).toBe("pnpm swt run --story stories/@me/v1.2+x=y,z-w_q.story.json");
		for (const name of ["my stories/it's.story.yaml", "a;rm -rf x.story.yaml", "a&b.story.yaml", "a\\'b.story.yaml", "a\nrm x.story.yaml", "-rf.story.yaml", "dir/--help.story.yaml", "$(id).story.yaml", "`id`.story.yaml", "a|b.story.yaml", "", "//x.story.yaml", "a//b.story.yaml"]) {
			expect(runStoryCommand(name), name).toBeUndefined();
		}
	});
});

describe("story files and bundled data", () => {
	it("reads YAML and JSON story files", () => {
		expect(parseStoryFile("a.story.yaml", "title: A\nlevels: []\n")).toEqual({ title: "A", levels: [] });
		expect(parseStoryFile("a.story.json", '{"title":"A"}')).toEqual({ title: "A" });
	});
	it("reads the bundled data, resolves aliases and survives bad data", () => {
		const data = parseViewerData(JSON.stringify({ stories: { chess: { t: 1 } }, aliases: { "old-chess": "chess" }, views: [{ id: "v", kind: "board-fen", event: "e", fields: { fen: "fen" } }, { bad: true }] }));
		expect(Object.keys(data.stories).sort()).toEqual(["chess", "old-chess"]);
		expect(data.views).toHaveLength(1);
		expect(parseViewerData("not json")).toBe(NO_DATA);
		expect(parseViewerData('{"stories":3}')).toBe(NO_DATA);
	});
});
