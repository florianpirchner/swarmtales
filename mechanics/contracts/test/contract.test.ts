// SPDX-License-Identifier: LicenseRef-SUL-1.0
/** The proof that the carried service contracts are what the old platform had. */
import { createHash } from "node:crypto";
import type { ServiceDefinition } from "@swarmtales/contracts";
import { describe, expect, it } from "vitest";
import { AllowanceService, BrainSourceService, ConsensusSourceService, FiguresService, IdentityService, ReceiptSourceService } from "../src/index.ts";

const sha256 = (value: unknown): string => createHash("sha256").update(JSON.stringify(value)).digest("hex");

describe("the carried contract", () => {
	// The sha256 of JSON.stringify of each definition, generated on the old platform (commit 9765702).
	it("is byte-identical to the old platform", () => {
		expect(ConsensusSourceService.name).toBe("consensus-source");
		expect(sha256(ConsensusSourceService)).toBe("a341c85083364fb040bce18b98e141c9ddf4bd9e8044ac44955ab2ab00faf383");
		expect(BrainSourceService.name).toBe("brain-source");
		expect(sha256(BrainSourceService)).toBe("eabaa44c94bf50007ca2ccd377160d9a78eeb9eba3b0010c841bcb4b65351dae");
	});
});

describe("the contracts of M5 (12-m5-spec.md, section 2.2, pattern 4)", () => {
	const contracts: readonly ServiceDefinition[] = [IdentityService, AllowanceService, ReceiptSourceService];

	it("names the three services and their read-only methods", () => {
		expect(contracts.map((service) => [service.name, Object.keys(service.methods)])).toEqual([
			["identity", ["nameOf", "display", "resolve"]],
			["allowance", ["left", "priceOf"]],
			["receipt-source", ["ofTransfer", "ofMessage", "ofLevel", "textsOf"]],
		]);
		for (const service of contracts) for (const method of Object.values(service.methods)) expect(method.kind).toBe("query");
	});

	it("describes every input and output schema", () => {
		for (const service of contracts) {
			for (const [name, method] of Object.entries(service.methods)) {
				expect(method.input, `${service.name}.${name} input`).toHaveProperty("description", expect.any(String));
				expect(method.output, `${service.name}.${name} output`).toHaveProperty("description", expect.any(String));
			}
		}
	});
});

describe("the contract figures (decision A72)", () => {
	it("names the old three methods of the cast that the router asks", () => {
		expect(FiguresService.name).toBe("figures");
		expect(Object.entries(FiguresService.methods).map(([name, method]) => [name, method.kind])).toEqual([
			["isActive", "query"],
			["receive", "command"],
			["collected", "command"],
		]);
	});

	it("describes every input and output schema", () => {
		for (const [name, method] of Object.entries(FiguresService.methods)) {
			expect(method.input, `figures.${name} input`).toHaveProperty("description", expect.any(String));
			expect(method.output, `figures.${name} output`).toHaveProperty("description", expect.any(String));
		}
	});
});
