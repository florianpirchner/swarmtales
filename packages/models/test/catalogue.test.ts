// SPDX-License-Identifier: Apache-2.0
/** The X catalogue and the record schemas of the model driver (M2 spec 2.6 and 4.4). */
import { Check } from "typebox/value";
import { describe, expect, it } from "vitest";
import { formatIssue, SwtError, SwtIssueSchema, type SwtIssue } from "@swarmtales/contracts";
import * as errors from "../src/errors.ts";
import { RESIDENT_RECORDS, residentRecord, type ResidentRecords } from "../src/records.ts";

const CATALOGUE: Readonly<Record<string, SwtIssue>> = {
	"SWT-X001": errors.noKey("anthropic", ["SWT_ANTHROPIC_API_KEY", "ARENA_ANTHROPIC_API_KEY"]),
	"SWT-X002": errors.unknownProvider("antropic", ["anthropic", "openrouter"]),
	"SWT-X003": errors.unknownModel("anthropic", "haiku-9", ["a", "b"]),
	"SWT-X004": errors.emptyModel("anthropic"),
	"SWT-X005": errors.noCostCap(),
	"SWT-X006": errors.shortKey("SWT_ANTHROPIC_API_KEY"),
	"SWT-X007": errors.noPrice("openrouter", "free-model"),
	"SWT-X030": errors.keyLeaked(["events.jsonl"]),
	"SWT-X040": errors.recordMismatch("response", "/input", "must be >= 0"),
};

const RECORDS: ResidentRecords = {
	prompt_fixed: { system: "You are r1.", systemHash: "a".repeat(64), tools: [{ name: "playMove", description: "Plays.", parameters: { type: "object" } }], declared: ["playMove"] },
	request: { inputs: ["Tick 1."], tools: ["playMove"], messages: 0 },
	context_reset: { messages: 4 },
	thinking: { text: "hm" },
	text: { text: "I play." },
	response: { provider: "anthropic", model: "m", stopReason: "stop", input: 10, output: 2, cacheRead: 0, cacheWrite: 0, costUsd: 0.0001 },
	request_failed: { message: "overloaded", refusal: false },
};

describe("the X catalogue", () => {
	it("has one function per code and `thrown`", () => {
		expect(Object.keys(errors)).toHaveLength(Object.keys(CATALOGUE).length + 1);
	});

	it.each(Object.entries(CATALOGUE))("%s is a valid issue with its own code", (code, issue) => {
		expect(issue.code).toBe(code);
		expect(Check(SwtIssueSchema, issue)).toBe(true);
		for (const text of [issue.summary, issue.why, issue.fix]) expect(text.trim().length).toBeGreaterThan(10);
		expect(new SwtError(issue).message).toBe(formatIssue(issue));
	});

	it("lists at most 12 model ids in SWT-X003", () => {
		const known = Array.from({ length: 15 }, (_, index) => `model-${index}`);
		const fix = errors.unknownModel("anthropic", "x", known).fix;
		expect(fix).toContain("model-11, and 3 more");
		expect(fix).not.toContain("model-12");
	});

	it("redacts every text of an issue before it is thrown", () => {
		const secret = "held-value-of-no-shape";
		const error = errors.thrown(errors.unknownModel("anthropic", secret, [secret]), (text) => text.split(secret).join("[redacted]"));
		expect(error.code).toBe("SWT-X003");
		expect(JSON.stringify(error.issues) + error.message).not.toContain(secret);
		expect(error.message).toContain("[redacted]");
	});
});

describe("the records of the model driver", () => {
	it("declare the seven types of the source, every schema closed and described", () => {
		expect(RESIDENT_RECORDS.id).toBe("@swarmtales/models/resident");
		expect(Object.keys(RESIDENT_RECORDS.events)).toEqual(["prompt_fixed", "request", "context_reset", "thinking", "text", "response", "request_failed"]);
		const undescribed = JSON.stringify(RESIDENT_RECORDS.events, (_key, value: unknown) => (typeof value === "object" && value !== null && "type" in value && !("description" in value) ? "UNDESCRIBED" : value));
		expect(undescribed).not.toContain("UNDESCRIBED");
	});

	it.each(Object.entries(RECORDS))("%s takes its payload and refuses an unknown field", (type, payload) => {
		const schema = RESIDENT_RECORDS.events[type];
		expect(schema !== undefined && Check(schema, payload)).toBe(true);
		expect(schema !== undefined && Check(schema, { ...payload, extra: 1 })).toBe(false);
	});

	it("returns a matching payload and throws SWT-X040 with the place, never the value", () => {
		expect(residentRecord("text", RECORDS.text)).toBe(RECORDS.text);
		const wrong = { ...RECORDS.response, input: -77123 };
		let error: unknown;
		try {
			residentRecord("response", wrong);
		} catch (thrown) {
			error = thrown;
		}
		expect(error).toBeInstanceOf(SwtError);
		if (!(error instanceof SwtError)) return;
		expect(error.code).toBe("SWT-X040");
		expect(error.issues[0]?.where?.path).toBe("response/input");
		expect(error.message).not.toContain("77123");
	});
});
