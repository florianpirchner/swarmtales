// SPDX-License-Identifier: Apache-2.0
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { missingDescriptions } from "./descriptions.ts";

const text = (description: string): { description: string } => ({ description });

describe("Typebox description rule", () => {
	it("accepts a schema whose every part is described", () => {
		const schema = Type.Object(
			{
				id: Type.String(text("The actor id")),
				tags: Type.Array(Type.String(text("One tag")), text("The tags")),
				mode: Type.Union([Type.Literal("a"), Type.Literal("b")], text("The mode")),
				extra: Type.Optional(Type.Record(Type.String(text("A key")), Type.Number(text("A count")), text("Counts by key"))),
			},
			text("An actor"),
		);
		expect(missingDescriptions(schema, "Actor")).toEqual([]);
	});

	it("names every place without a description", () => {
		const schema = Type.Object({
			id: Type.String(),
			tags: Type.Array(Type.String(), text("The tags")),
			inner: Type.Object({ n: Type.Number(text("")) }, text("Inner")),
			either: Type.Union([Type.String(), Type.Literal(1)], text("Either")),
			pair: Type.Tuple([Type.String(), Type.Number(text("Second"))], text("A pair")),
		});
		expect(missingDescriptions(schema, "Actor")).toEqual([
			"Actor",
			"Actor.properties.id",
			"Actor.properties.tags.items",
			"Actor.properties.inner.properties.n",
			"Actor.properties.either.anyOf[0]",
			"Actor.properties.pair.items[0]",
		]);
	});

	it("reads plain JSON schemas too, and reports what is no schema", () => {
		expect(missingDescriptions({ type: "object", description: "x", additionalProperties: { type: "string" }, $defs: { a: { type: "number" } } })).toEqual([
			"$.additionalProperties",
			"$.$defs.a",
		]);
		expect(missingDescriptions(undefined, "Missing")).toEqual(["Missing (not a schema)"]);
	});
});
