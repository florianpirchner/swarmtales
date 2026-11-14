// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { isAgentIdentity, parseLog, signOffProblem, unsigned, type Commit } from "./signoff.ts";

const log = (...commits: readonly (readonly [string, string])[]): string =>
	commits.map(([hash, message]) => `${hash}\u001fAda Lovelace\u001fada@example.org\u001f${message}\n\u001e`).join("\n");

const ADA = "Signed-off-by: Ada Lovelace <ada@example.org>";
const AGENT = "Signed-off-by: Claude <noreply@anthropic.com>";
const byAda = (message: string, hash = "1234567890"): Commit => ({ hash, authorName: "Ada Lovelace", authorEmail: "ada@example.org", message });
const byAgent = (message: string): Commit => ({ hash: "abcdef1234", authorName: "Claude", authorEmail: "noreply@anthropic.com", message });

describe("sign-off check", () => {
	it("parses commits with bodies of several lines", () => {
		expect(parseLog(log(["aaaaaaaa", `Subject\n\nBody line\n\n${ADA}`], ["bbbbbbbb", "Only a subject"]))).toEqual([
			byAda(`Subject\n\nBody line\n\n${ADA}`, "aaaaaaaa"),
			byAda("Only a subject", "bbbbbbbb"),
		]);
		expect(parseLog("")).toEqual([]);
	});

	it("accepts a person's commit that its author signed off, anywhere among the trailers", () => {
		expect(unsigned([byAda(`Subject\n\n${ADA}\nCo-Authored-By: Someone <s@example.org>`)])).toEqual([]);
		expect(signOffProblem({ ...byAda(`Subject\n\n${ADA}`), authorEmail: "Ada@Example.org" })).toBeUndefined();
	});

	it("reports a commit without a sign-off, or with one that has no name or address", () => {
		const commits = [
			byAda("No trailer at all", "1111111aaaa"),
			byAda("Subject\n\nSigned-off-by: <a@b.org>", "2222222bbbb"),
			byAda("Subject\n\nSigned-off-by: Ada Lovelace", "3333333cccc"),
			byAda("Subject\n\nsigned-off-by: Ada Lovelace <ada@example.org> and more", "4444444dddd"),
		];
		expect(unsigned(commits).map((line) => line.split(":")[0])).toEqual(["1111111 No trailer at all", "2222222 Subject", "3333333 Subject", "4444444 Subject"]);
	});

	it("does not take an agent identity for a signer", () => {
		expect(signOffProblem(byAgent(`Subject\n\n${AGENT}`))).toContain("only by an agent identity");
		expect(signOffProblem(byAda(`Subject\n\n${AGENT}`))).toContain("only by an agent identity");
		expect(signOffProblem(byAgent("Subject\n\nSigned-off-by: dependabot[bot] <49699333+dependabot[bot]@users.noreply.github.com>"))).toBeDefined();
	});

	it("accepts an agent's commit that the person who operates the session signed off", () => {
		expect(signOffProblem(byAgent(`Subject\n\n${ADA}\nCo-Authored-By: Claude <noreply@anthropic.com>`))).toBeUndefined();
		expect(signOffProblem(byAgent(`Subject\n\n${AGENT}\n${ADA}`))).toBeUndefined();
	});

	it("needs the author of a person's commit among the signers", () => {
		expect(signOffProblem(byAda("Subject\n\nSigned-off-by: Grace Hopper <grace@example.org>"))).toContain("the author <ada@example.org> is not among the signers");
		expect(signOffProblem(byAda(`Subject\n\nSigned-off-by: Grace Hopper <grace@example.org>\n${ADA}`))).toBeUndefined();
	});

	it("tells persons from programs", () => {
		expect(isAgentIdentity("Claude", "noreply@anthropic.com")).toBe(true);
		expect(isAgentIdentity("github-actions[bot]", "41898282+github-actions[bot]@users.noreply.github.com")).toBe(true);
		expect(isAgentIdentity("Robot", "no-reply@example.org")).toBe(true);
		expect(isAgentIdentity("Ada Lovelace", "1234+ada@users.noreply.github.com")).toBe(false);
		expect(isAgentIdentity("Ada Lovelace", "ada@example.org")).toBe(false);
	});
});
