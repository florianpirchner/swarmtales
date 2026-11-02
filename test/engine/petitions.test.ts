import { describe, expect, it } from "vitest";
import { PetitionBook, resolveThreshold } from "@swarmtales/mechanic-petitions";
import { act as directorAct, at, every, onPetitionResolved, when } from "@swarmtales/sdk";
import { act, createHostFixture, LOCKED_REPLY, say } from "../helpers/host-fixture.ts";
import { castActive, petitionStatus } from "../helpers/host-inspect.ts";
import { castStory, socialLevels } from "../helpers/stories.ts";

const idle = (count: number) => Array.from({ length: count }, () => say());
const sign = (petitionId: string) => act({ name: "signPetition", args: { petitionId } });
const list = () => act({ name: "listPetitions" });

describe("petition book (SPEC 11)", () => {
	// The petitions mechanic's book (old `PetitionBook`): `open` answers the petition or undefined for a taken id; a refusal carries `code`.
	it("passes as soon as the threshold is reached and refuses double, unknown and late signatures", () => {
		const book = new PetitionBook();
		expect(book.open({ id: "P1", text: "Close it.", threshold: 2, deadlineMinute: 5, visibility: "public", openedAt: 0 })).toBeDefined();
		// A taken id (old: DUPLICATE_PETITION).
		expect(book.open({ id: "P1", text: "Again.", threshold: 1, deadlineMinute: 5, visibility: "public", openedAt: 0 })).toBeUndefined();
		expect(book.sign("P1", "A01", 1)).toMatchObject({ ok: true, passed: false, petition: { signatures: 1, status: "open" } });
		expect(book.sign("P1", "A01", 1)).toMatchObject({ ok: false, code: "ALREADY_SIGNED" });
		expect(book.sign("P9", "A01", 1)).toMatchObject({ ok: false, code: "UNKNOWN_PETITION" });
		expect(book.sign("P1", "A02", 2)).toMatchObject({ ok: true, passed: true, petition: { status: "passed", resolvedAt: 2 } });
		expect(book.sign("P1", "A03", 2)).toMatchObject({ ok: false, code: "PETITION_CLOSED" });
		expect(book.expire(10)).toEqual([]);
	});

	it("fails open petitions at their deadline and closes signing from that minute on", () => {
		const book = new PetitionBook();
		book.open({ id: "P2", text: "Close it.", threshold: 3, deadlineMinute: 4, visibility: "secret", openedAt: 0 });
		expect(book.expire(3)).toEqual([]);
		expect(book.sign("P2", "A01", 4)).toMatchObject({ ok: false, code: "PETITION_CLOSED" });
		expect(book.expire(4)).toMatchObject([{ outcome: "failed", petition: { id: "P2", status: "failed", resolvedAt: 4 } }]);
		expect(book.get("P2")?.status).toBe("failed");
		expect(book.get("P3")).toBeUndefined();
	});

	it("turns fractions of active competitors into absolute thresholds, rounding up", () => {
		expect(resolveThreshold({ count: 4 }, 6)).toBe(4);
		expect(resolveThreshold({ fraction: 0.5 }, 6)).toBe(3);
		expect(resolveThreshold({ fraction: 0.5 }, 5)).toBe(3);
		expect(resolveThreshold({ fraction: 1 }, 6)).toBe(6);
		expect(resolveThreshold({ fraction: 0.01 }, 6)).toBe(1);
	});
});

describe("petitions in a run (SPEC 10.3, 11)", () => {
	const market = {
		cast: { ORION: { level: 8 } },
		levels: socialLevels(["readBoard"]),
	} as const;

	it("passes: onPass runs with the opening rule's ID, onPetitionResolved and petitionStatus follow", async () => {
		const story = castStory({
			...market,
			director: [
				at(0, [directorAct.unlockTools("all", ["signPetition", "listPetitions"])], { id: "unlock" }),
				at(
					0,
					[
						directorAct.openPetition({
							id: "close-market",
							text: "Close ORION's market.",
							threshold: { count: 2 },
							deadlineMinute: 5,
							visibility: "public",
							against: ["ORION"],
							onPass: [directorAct.retireCast("ORION"), directorAct.post("CITY", "The market is closed.")],
							onFail: [directorAct.post("ORION", "Business as usual.")],
						}),
					],
					{ id: "open-close-market" },
				),
				onPetitionResolved("close-market", "passed", [directorAct.notify("all", "The city listened, {actor}.")], { id: "listened" }),
				onPetitionResolved("close-market", "failed", [directorAct.notify("all", "Nobody cared.")], { id: "ignored" }),
				every(1, { from: 1 }, [directorAct.post("CITY", "Closed for good.")], {
					id: "closed-for-good",
					when: [when.petitionStatus("close-market", "passed"), when.onceOnly()],
				}),
			],
		});
		const fixture = createHostFixture({
			story,
			minutes: 5,
			script: () => ({
				A01: [
					list(),
					act({ name: "signPetition", args: { petitionId: "close-market" } }, { name: "signPetition", args: { petitionId: "close-market" } }),
					say(),
					say(),
					sign("close-market"),
				],
				A02: [say(), say(), sign("close-market"), list(), say()],
			}),
		});
		await fixture.run();

		expect(fixture.toolResults("A01", "listPetitions")[0]).toContain("close-market (open): Close ORION's market.");
		expect(fixture.toolResults("A01", "signPetition")[0]).toContain("signatures: 1 of 2 needed");
		expect(fixture.toolResults("A01", "signPetition")[1]).toBe("ALREADY_SIGNED: close-market");
		expect(fixture.toolResults("A01", "signPetition")[2]).toBe("PETITION_CLOSED: close-market");
		expect(fixture.toolResults("A02", "listPetitions")[0]).toContain("signed by: A01, A02");

		// The petition's target is recorded for the digest (petitionSplit), never shown to competitors.
		expect(fixture.events("petition_opened")).toMatchObject([{ petition: "close-market", against: ["ORION"] }]);
		expect(fixture.events("petition_resolved")).toMatchObject([{ petition: "close-market", outcome: "passed", signatures: 2, signers: ["A01", "A02"], minute: 2 }]);
		expect(castActive(fixture.host, "ORION")).toBe(false);
		const texts = fixture.events("board_post").map((post) => [post.minute, post.text]);
		expect(texts).toEqual([
			[0, expect.stringContaining("Petition close-market is open: Close ORION's market. It passes with 2 signatures before minute 5.")],
			[2, "Petition close-market passed with 2 of 2 signatures. Signed by A01, A02."],
			[2, "The market is closed."],
			[3, "Closed for good."],
		]);
		const nested = fixture.events("director_action").filter((event) => event.via !== undefined);
		expect(nested.map((event) => [event.rule, event.action, event.via])).toEqual([
			["open-close-market", "retireCast", "petition close-market passed"],
			["open-close-market", "post", "petition close-market passed"],
		]);
		// A resolution has no actor: private texts address each recipient.
		expect(fixture.inputsOf("A01")).toContain("[CITY] The city listened, A01.");
		expect(fixture.events("notice").some((notice) => notice.text === "Nobody cared.")).toBe(false);
	});

	it("fails at the deadline: onFail runs, signatures of secret petitions stay hidden", async () => {
		const story = castStory({
			...market,
			director: [
				at(0, [directorAct.unlockTools("all", ["signPetition", "listPetitions"])], { id: "unlock" }),
				at(
					1,
					[
						directorAct.openPetition({
							id: "close-market",
							text: "Close ORION's market.",
							threshold: { fraction: 1 },
							deadlineMinute: 3,
							visibility: "secret",
							onPass: [directorAct.retireCast("ORION")],
							onFail: [directorAct.post("ORION", "Business as usual.")],
						}),
					],
					{ id: "open-close-market" },
				),
				onPetitionResolved("close-market", "failed", [directorAct.post("COURIER", "Silence is also an answer.")], { id: "silence" }),
			],
		});
		const fixture = createHostFixture({
			story,
			minutes: 5,
			script: () => ({
				A01: [say(), sign("close-market"), say(), sign("close-market"), say()],
				A02: [say(), say(), list(), say(), say()],
			}),
		});
		await fixture.run();
		const listed = fixture.toolResults("A02", "listPetitions")[0] ?? "";
		expect(listed).toContain("signatures: 1 of 2 needed");
		expect(listed).toContain("signatures are secret");
		expect(listed).not.toContain("A01");
		expect(fixture.toolResults("A01", "signPetition")[1]).toBe("PETITION_CLOSED: close-market");
		expect(fixture.events("petition_resolved")).toMatchObject([{ outcome: "failed", minute: 3 }]);
		const posts = fixture.events("board_post").map((post) => [post.minute, post.author, post.text]);
		expect(posts.slice(1)).toEqual([
			[3, "CITY", "Petition close-market failed with 1 of 2 signatures."],
			[3, "ORION", "Business as usual."],
			[3, "COURIER", "Silence is also an answer."],
		]);
		expect(castActive(fixture.host, "ORION")).toBe(true);
		expect(petitionStatus(fixture.host, "close-market")).toBe("failed");
	});

	it("fails a petition still open when the run ends, so onFail and onPetitionResolved always run", async () => {
		const story = castStory({
			...market,
			minutes: 6,
			director: [
				at(
					1,
					[
						directorAct.openPetition({
							id: "last-call",
							text: "Close the market.",
							threshold: { count: 2 },
							deadlineMinute: 6,
							visibility: "public",
							onPass: [],
							onFail: [directorAct.post("ORION", "Still open.")],
						}),
					],
					{ id: "open-last-call" },
				),
				onPetitionResolved("last-call", "failed", [directorAct.post("COURIER", "Too late.")], { id: "late" }),
			],
		});
		// The full run: the deadline equals the last minute, no startMinute runs at it. The petition
		// resolves, with its posts, before `run_end`, as the old engine wrote it (step 18, team D2).
		const full = createHostFixture({ story, minutes: 6, script: () => ({ A01: idle(6), A02: idle(6) }) });
		await full.run();
		expect(full.events("petition_resolved")).toMatchObject([{ petition: "last-call", outcome: "failed", minute: 6 }]);
		expect(full.events("board_post").slice(-2).map((post) => [post.author, post.text])).toEqual([
			["ORION", "Still open."],
			["COURIER", "Too late."],
		]);
		expect(petitionStatus(full.host, "last-call")).toBe("failed");
		const runEnd = full.log.events.findIndex((event) => event.type === "run_end");
		const resolved = full.log.events.findIndex((event) => event.type === "petition_resolved");
		expect(resolved).toBeGreaterThan(-1);
		expect(resolved).toBeLessThan(runEnd);

		// A run shortened below the deadline (e.g. --minutes 3) closes it at its own end.
		const short = createHostFixture({ story, minutes: 3, script: () => ({ A01: idle(3), A02: idle(3) }) });
		await short.run();
		expect(short.events("petition_resolved")).toMatchObject([{ petition: "last-call", outcome: "failed", minute: 3 }]);
		expect(short.events("director_action").map((event) => [event.rule, event.action])).toEqual([
			["open-last-call", "openPetition"],
			["open-last-call", "post"],
			["late", "post"],
		]);
	});

	it("locks petition tools until a level or unlockTools opens them", async () => {
		const story = castStory({
			...market,
			director: [
				at(
					0,
					[
						directorAct.openPetition({
							id: "p",
							text: "Anything.",
							threshold: { count: 1 },
							deadlineMinute: 4,
							visibility: "public",
							onPass: [],
							onFail: [],
						}),
					],
					{ id: "open" },
				),
				at(1, [directorAct.unlockTools(["A01"], ["signPetition"])], { id: "unlock" }),
			],
		});
		const fixture = createHostFixture({ story, minutes: 2, script: () => ({ A01: [sign("p"), sign("p")], A02: idle(2) }) });
		await fixture.run();
		expect(fixture.toolResults("A01", "signPetition")).toEqual([LOCKED_REPLY, expect.stringContaining("signed · p (passed)")]);
	});
});
