// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the port (M4 specification 2.2): the sha256 of every carried prompt file, of the prompt
 * table, of the tool name list, of the tools with their parameters, of the options, event and state schemas,
 * computed on the old platform (branch `legacy`, from the schemas of its `mechanics/blind-bid/src`).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { sealedAuction } from "../src/index.ts";

/** The id this platform renamed (M6-06), from the id the old platform wrote to the id here. */
const RENAMED = { "sealed-auction": "blind-bid" } as const;
/** A carried text as the old platform wrote it: the new id back to the old one where it names the mechanic (`"<id>/...`, `"<id>.`, `id: <id>/`). */
const asOld = (text: string): string => Object.entries(RENAMED).reduce((done, [old, now]) => done.replace(new RegExp(`(?<=^id: |")${now}(?=[./])`, "gm"), old), text);
const sha256 = (value: string | Buffer): string => createHash("sha256").update(asOld(value.toString())).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"blind-bid/game-head.md": "2afc03d1000859d02b3b0d338323b5e829f5d0d096cecd4785bcac5af00489c0",
	"blind-bid/rules.md": "963bd0750737b95d29e6c6c09065ffabb1b086f7a180919a6358dfb00b4802d3",
	"blind-bid/task-common.md": "f718ab079b4f3eb73a5b49f5f0cd3a44a2b58d0b0c7ad9cbcc0eacfc48519a99",
	"blind-bid/task-first-price.md": "a4b192a77e29ed17899c9ba4b6ba51aac78392f263ac9007ba7011cd1c3a1a0d",
	"blind-bid/task-second-price.md": "a238bf172c93b7858561c1501a1295da62272876eb756ec49928a7a1ca571937",
	"blind-bid/tools/bid.md": "3a2e0b8f43669dff8e69ba515f23754637a34b8dcc1204ba387faa58724800aa",
	"blind-bid/tools/viewAuction.md": "2fdda52775655baa2c9f0dbe9314d743b8a125fc012f3ab2937acbe0f5f97366",
};

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(sha256(JSON.stringify(sealedAuction.head.prompts))).toBe("a7a9179ec5ea4a2af5f40b0a76f0b67801bf10fde659b597a59fd18f374196e2");
		expect(Object.keys(sealedAuction.head.prompts).map((id) => `${id}.md`).sort()).toEqual(Object.keys(OLD_PROMPTS).sort());
	});

	it("has the tool names, the tool parameters, the options, the events, the state and the audiences of the old platform", () => {
		expect(sha256(JSON.stringify(sealedAuction.head.tools.map((tool) => tool.name)))).toBe("38cf0eaac5407a2b79f0a6160110aaf1d6a0da736032879e8af47168e5acf8d2");
		expect(sha256(JSON.stringify(sealedAuction.head.tools.map((tool) => [tool.name, tool.description, tool.parameters, tool.for])))).toBe("9689d779dfce02d42610f5a170c2434c5188fa28757653caa9a8b0140f39f88b");
		expect(sha256(JSON.stringify(sealedAuction.options))).toBe("40821fc96a1b2fa35cd6f74d43a7f8ecb658b9ba23d23674345f5446c1a8c35e");
		expect(sha256(JSON.stringify(sealedAuction.events))).toBe("5e8f59f0c4f314c2ef75a1997b1af43ad21bc2ab4800ee1c31be1deeaaa14b83");
		expect(sha256(JSON.stringify(sealedAuction.head.state))).toBe("bacd53e27dc368818c4c6a69c6979aeb6b1e36d061594796a53380afdfa2ff39");
		expect(JSON.stringify(sealedAuction.head.audiences)).toBe('{"lots_dealt":["human"],"bid_placed":["human"],"game_scored":["human"]}');
		expect([sealedAuction.id, sealedAuction.head.summary]).toEqual(["blind-bid", "Sealed bids on a series of lots (pay-your-bid, pay-the-runner-up, shared worth) with a purse per game, private values and a winner's-curse reference."]);
	});
});
