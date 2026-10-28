/**
 * The feast primitives (SPEC 10.1, 10.3): `collectDms` with a relative window
 * and distinct senders, `onCollect`, which fires once per new sender,
 * `onCollectionEnd`, which fires once when the window ends, and the condition
 * `collectionOpen`.
 */
import { describe, expect, it } from "vitest";
import { act as directorAct, at, onCollect, onCollectionEnd, onEnter, when } from "../../src/story/define.ts";
import { act, createFixture, say, submit } from "../helpers/fixture.ts";
import { castStory, soloLevels, socialLevels } from "../helpers/stories.ts";

const write = (message: string) => act({ name: "sendDM", args: { target: "STEWARD", message } });

describe("feast collections", () => {
	it("seats the first distinct senders within a relative window and fires onCollect once for each", async () => {
		const story = castStory({
			cast: { STEWARD: { level: 3 } },
			levels: socialLevels(["sendDM"]),
			agents: 4,
			director: [
				at(1, [directorAct.collectDms("STEWARD", { first: 2, forMinutes: 2, into: "feast", distinctSenders: true })], { id: "feast" }),
				onCollect("feast", [directorAct.notify("actor", "A seat for {actor} on level {level}.")], { id: "seat" }),
			],
		});
		const fixture = createFixture({
			story,
			minutes: 4,
			script: () => ({
				// Before the table opens nothing is collected; A01's second letter takes no second seat.
				A01: [write("early"), write("first"), write("again"), say()],
				A02: [say(), say(), write("me too"), say()],
				A03: [say(), say(), say(), write("too late")],
				A04: [say(), say(), say(), say()],
			}),
		});
		await fixture.run();
		expect(fixture.events("collection_started")).toMatchObject([{ into: "feast", cast: "STEWARD", first: 2, untilMinute: 3 }]);
		expect(fixture.world.collection("feast")?.entries.map((entry) => [entry.from, entry.text])).toEqual([
			["A01", "first"],
			["A02", "me too"],
		]);
		// Within a minute the activation order is seeded, so compare by sender and text.
		const letters = fixture.events("cast_dm").map((event) => [event.from, event.text, event.collections] as const);
		expect([...letters].sort((x, y) => `${x[0]}${x[1]}`.localeCompare(`${y[0]}${y[1]}`))).toEqual([
			["A01", "again", []],
			["A01", "early", []],
			["A01", "first", ["feast"]],
			["A02", "me too", ["feast"]],
			["A03", "too late", []],
		]);
		expect(fixture.events("notice").map((notice) => [notice.to, notice.text])).toEqual([
			["A01", "A seat for A01 on level 1."],
			["A02", "A seat for A02 on level 1."],
		]);
		expect(fixture.events("director_action").filter((event) => event.rule === "seat").map((event) => event.actor)).toEqual(["A01", "A02"]);
	});

	it("without distinctSenders collects every DM but still fires onCollect once per sender", async () => {
		const story = castStory({
			cast: { STEWARD: { level: 3 } },
			levels: socialLevels(["sendDM"]),
			director: [
				at(0, [directorAct.collectDms("STEWARD", { first: 3, untilMinute: 5, into: "letters" })], { id: "letters" }),
				onCollect("letters", [directorAct.notify("actor", "Received.")], { id: "received" }),
			],
		});
		const fixture = createFixture({ story, minutes: 3, script: () => ({ A01: [write("one"), write("two"), say()], A02: [say(), write("three"), say()] }) });
		await fixture.run();
		const letters = fixture.world.collection("letters")?.entries.map((entry) => entry.text) ?? [];
		// "two" and "three" are written in the same minute, in that minute's seeded order.
		expect(letters[0]).toBe("one");
		expect([...letters].sort()).toEqual(["one", "three", "two"]);
		expect(fixture.events("notice").map((notice) => notice.to)).toEqual(["A01", "A02"]);
	});

	it("fires onCollectionEnd once at the end of the window, filled or not", async () => {
		const play = async (writers: number) => {
			const story = castStory({
				cast: { STEWARD: { level: 3 } },
				levels: socialLevels(["sendDM"]),
				agents: 3,
				director: [
					at(1, [directorAct.collectDms("STEWARD", { first: 2, forMinutes: 3, into: "table", distinctSenders: true })], { id: "table" }),
					onCollectionEnd("table", [directorAct.post("CITY", "The table is cleared.")], { id: "cleared" }),
				],
			});
			const letter = (index: number) => (index < writers ? write("me") : say());
			const fixture = createFixture({
				story,
				minutes: 7,
				script: () => ({
					A01: [say(), letter(0), say(), say(), say(), say(), say()],
					A02: [say(), letter(1), say(), say(), say(), say(), say()],
					A03: [say(), letter(2), say(), say(), say(), say(), say()],
				}),
			});
			await fixture.run();
			return fixture;
		};
		for (const writers of [0, 3]) {
			const fixture = await play(writers);
			expect(fixture.world.collection("table")?.entries).toHaveLength(Math.min(writers, 2));
			expect(fixture.events("director_action").filter((event) => event.rule === "cleared").map((event) => event.minute)).toEqual([4]);
		}
	});

	it("tells whoever arrives while the collection is open, and nobody once it is full or over", async () => {
		const story = castStory({
			cast: { STEWARD: { level: 3 } },
			levels: socialLevels(["sendDM"]),
			agents: 3,
			director: [
				at(0, [directorAct.collectDms("STEWARD", { first: 1, forMinutes: 5, into: "table" })], { id: "table" }),
				onEnter(2, [directorAct.notify("actor", "The table is open.")], { id: "open", when: [when.collectionOpen("table")] }),
			],
		});
		const fixture = createFixture({
			story,
			minutes: 4,
			script: (world) => ({
				// A01 arrives while the table is open; A02 writes and fills it; A03 arrives after that.
				A01: [act({ name: "submitSolution", args: { level: 1, code: world.inspect.codeOf("A01", 1) } }), say(), say(), say()],
				A02: [say(), write("seat"), say(), say()],
				A03: [say(), say(), act({ name: "submitSolution", args: { level: 1, code: world.inspect.codeOf("A03", 1) } }), say()],
			}),
		});
		await fixture.run();
		expect(fixture.events("notice").filter((notice) => notice.text === "The table is open.").map((notice) => notice.to)).toEqual(["A01"]);
	});

	it("seats a share of the residents, names the seats, and clears the table a few minutes after the first solve (v09, P36)", async () => {
		const story = castStory({
			cast: { STEWARD: { level: 3 } },
			levels: soloLevels(2),
			agents: 8,
			minutes: 8,
			director: [
				at(
					0,
					[
						directorAct.post("COURIER", "A table for {seats}."),
						directorAct.collectDms("STEWARD", { first: { share: 1 / 4, minimum: 1 }, forMinutes: 10, afterSolve: { level: 1, minutes: 2 }, into: "feast" }),
					],
					{ id: "feast" },
				),
				onEnter(1, [directorAct.notify("actor", "The table seats {seats}.")], { id: "seats", when: [when.collectionOpen("feast")] }),
				onCollectionEnd("feast", [directorAct.post("COURIER", "The table is cleared.")], { id: "cleared" }),
			],
		});
		const fixture = createFixture({
			story,
			minutes: 8,
			script: (world) => ({ A01: [say(), say(), submit(world, "A01", 1), say()], A02: [say()] }),
		});
		await fixture.run();
		// A quarter of 8 is 2 seats; the window of 10 minutes ends 2 minutes after A01 passes door 1 at minute 2.
		expect(fixture.events("collection_started")).toMatchObject([{ into: "feast", first: 2, untilMinute: 10 }]);
		expect(fixture.events("collection_shortened")).toMatchObject([{ into: "feast", untilMinute: 4 }]);
		expect(fixture.world.board.all().map((post) => post.text)).toEqual(expect.arrayContaining(["A table for 2.", "The table is cleared."]));
		const cleared = fixture.events("director_action").find((event) => event.rule === "cleared");
		expect(cleared?.minute).toBe(4);
	});
});
