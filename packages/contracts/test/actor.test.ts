// SPDX-License-Identifier: Apache-2.0
import { describe, expect, it } from "vitest";
import { actorId, kindOf, nameOf, type ActorId } from "../src/kernel/index.ts";

const RESERVED: readonly ActorId[] = ["human", "script", "kernel"];

describe("actor ids", () => {
	it("joins a kind and a name with a colon", () => {
		expect(actorId("resident", "A03")).toBe("resident:A03");
		expect(actorId("director", "night-watch")).toBe("director:night-watch");
	});

	it("reads the kind and the name back", () => {
		const id = actorId("resident", "A03");
		expect(kindOf(id)).toBe("resident");
		expect(nameOf(id)).toBe("A03");
	});

	it("splits at the first colon only", () => {
		expect(kindOf("resident:a:b")).toBe("resident");
		expect(nameOf("resident:a:b")).toBe("a:b");
	});

	it("gives a reserved id as its own kind and its own name", () => {
		for (const id of RESERVED) {
			expect(kindOf(id)).toBe(id);
			expect(nameOf(id)).toBe(id);
		}
	});
});
