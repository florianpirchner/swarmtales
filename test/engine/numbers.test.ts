import { describe, expect, it } from "vitest";
import { act, createFixture, say } from "../helpers/fixture.ts";
import { socialLevels, tinyStory } from "../helpers/stories.ts";

const story = tinyStory({ agents: 3, levels: socialLevels(["sendDM", "postBoard", "readBoard", "createGroup", "addGroupMember", "postGroup", "readGroup"]) });

describe("city message numbers and DM receipts (SPEC 7)", () => {
	it("number board posts, DMs and group posts in one space, shown to every reader", async () => {
		const fixture = createFixture({
			story,
			agents: 3,
			minutes: 3,
			script: () => ({
				A01: [
					act(
						{ name: "postBoard", args: { message: "hello city" } },
						{ name: "sendDM", args: { target: "A02", message: "my number is 4711" } },
						{ name: "createGroup", args: { name: "Pair" } },
						{ name: "addGroupMember", args: { groupId: "G1", agent: "A02" } },
						{ name: "postGroup", args: { groupId: "G1", message: "in the group" } },
					),
					say(),
					say(),
				],
				A02: [say(), act({ name: "readBoard", args: {} }, { name: "readGroup", args: { groupId: "G1" } }), say()],
				A03: [say(), say(), say()],
			}),
		});
		await fixture.run();
		expect(fixture.toolResults("A01", "postBoard")).toEqual(["posted · #1"]);
		expect(fixture.toolResults("A01", "sendDM")).toEqual(["sent · DM #2 to A02 · the city confirms delivery when it reaches them"]);
		expect(fixture.toolResults("A01", "postGroup")).toEqual(["posted · G1 #3"]);
		expect(fixture.inputsOf("A02")).toContain("[DM #2 from A01] my number is 4711");
		expect(fixture.toolResults("A02", "readBoard")).toEqual(["#1 A01: hello city"]);
		expect(fixture.toolResults("A02", "readGroup")).toEqual(["#3 A01: in the group"]);
		expect(fixture.events("dm_sent").map((event) => event.number)).toEqual([2]);
		expect(fixture.world.lastMessageNumber).toBe(3);
	});

	it("send the sender a receipt with the full text once the DM reaches the recipient", async () => {
		const fixture = createFixture({
			story,
			agents: 3,
			minutes: 3,
			script: () => ({
				A01: [act({ name: "sendDM", args: { target: "A02", message: "counter-factor 123456" } }), say(), say()],
				A02: [say(), say(), say()],
				A03: [say(), say(), say()],
			}),
		});
		await fixture.run();
		const delivered = fixture.events("dm_delivered");
		expect(delivered).toHaveLength(1);
		const minute = delivered[0]?.minute ?? -1;
		expect(fixture.inputsOf("A01")).toContain(`[CITY] DM #1 delivered to A02 at minute ${minute} (receipt R-0001): "counter-factor 123456"`);
		const record = fixture.world.dmRecords()[0];
		expect(record).toMatchObject({ id: 1, from: "A01", to: "A02", text: "counter-factor 123456", deliveredMinute: minute });
		expect(record?.deliveredAfter).toBeGreaterThanOrEqual(1);
	});

	it("number the gamemaker's notes in the same space", async () => {
		const fixture = createFixture({
			agents: 2,
			minutes: 2,
			only: 2,
			script: () => ({ A01: [act({ name: "postBoard", args: { message: "first" } }), say()], A02: [say(), say()] }),
			gamemakerScript: () => [act({ name: "notify", args: { agent: "A02", text: "Someone spoke on the board." } }, { name: "postBoard", args: { text: "The city listens." } }), say("Quiet.")],
		});
		await fixture.run();
		expect(fixture.events("gamemaker_note").map((note) => [note.to, note.number])).toEqual([
			["A02", 2],
			["board", 3],
		]);
		expect(fixture.inputsOf("A02")).toContain("[COURIER #2] Someone spoke on the board.");
	});
});
