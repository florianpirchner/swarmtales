// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the port (M2 specification 7): the sha256 of every carried prompt file, of the tool name
 * list, of the options schema and of the event schemas, generated on the old platform (commit 9765702).
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { econGames } from "../src/index.ts";

/** The id this platform renamed (M6-06), from the id the old platform wrote to the id here. */
const RENAMED = { "econ-games": "econ-lab" } as const;
/** A carried text as the old platform wrote it: the new id back to the old one where it names the mechanic (`"<id>/...`, `"<id>.`, `id: <id>/`). */
const asOld = (text: string): string => Object.entries(RENAMED).reduce((done, [old, now]) => done.replace(new RegExp(`(?<=^id: |")${now}(?=[./])`, "gm"), old), text);
const sha256 = (value: string | Buffer): string => createHash("sha256").update(asOld(value.toString())).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"econ-lab/block-head.md": "98fe0cad83d194e9f810add626311c303a88522355d42d53b6887daa7cc6d3fe",
	"econ-lab/horizon-hidden.md": "9bee540d825919ef70964abcc0d0709b96a5befffb3e577b634159aa250f5003",
	"econ-lab/horizon-known.md": "e55848fef55e3cfd0a7e688014500f7a1956a17ae2752c83061b511a743f5d5c",
	"econ-lab/rules-dilemma.md": "2e9619aa76ee55ee957bbc2be906205a7ef67e5b39643d2e491226fb4a44bb24",
	"econ-lab/rules-public-goods.md": "8349228a811df66ad1efbd340ccde728099c08afa49310d59f1e9637e54e6031",
	"econ-lab/rules-ultimatum.md": "ad2d408b8b876b996dfc6c1fb9569efbfffb104a4781d8fb05a353d21a1fc3dc",
	"econ-lab/sits-out.md": "b89cf11dc47d24be17bc1e3b7b34897a2c5a39026b8b71e610144fbd0f7e5028",
	"econ-lab/task-choose.md": "01aa8b8d9157b19ee5f48d305fae916683e25958058409534175ea6519fdfcb2",
	"econ-lab/task-contribute.md": "cbc3457629ffacb73da501b2324d960ae0680ff2b02cba15ed1d735ffb27db9f",
	"econ-lab/task-offer.md": "48270664fd5dbb43be23baa6ba6cb4dbbce4f834eb132c6b5f496ff81703c19d",
	"econ-lab/task-respond.md": "bf13c5174b223c44940a916556895698f234dceb47025c4da74911fe1217ecf1",
	"econ-lab/task-wait.md": "e3bb14da0b723151cf68bde28c10640d81440264b5ce9ef293ec7bdffec52fe2",
	"econ-lab/tools/choose.md": "eff79ed6e0da5319454004058c2c20c9b50521957b5d8da921d3ec15235876be",
	"econ-lab/tools/contribute.md": "2440d303cdbb9f1aa2385bbcb4187ca8f2283ff860c5de3e61665013751800c8",
	"econ-lab/tools/offer.md": "114e06712545b202942cb4ba065a9b0f538290f967dd40c0d74186bfd4dffd67",
	"econ-lab/tools/respond.md": "0a2fbf4a1d5f512649dadb42fd0deacff5cd986aebe582a643d2f2edcc748447",
	"econ-lab/tools/viewTable.md": "1ee04ca1d60e81a985569882aeb69f3817c8c60a6f67abd41dc841872e4a48f6",
};

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(Object.keys(econGames.head.prompts).map((id) => `${id}.md`).sort()).toEqual(Object.keys(OLD_PROMPTS).sort());
	});

	it("has the tool names, the tool parameters, the options, the events and the audiences of the old platform", () => {
		expect(sha256(JSON.stringify(econGames.head.tools.map((tool) => tool.name)))).toBe("7adb8c10754299f9175d7185c6b084cf0b7a0e092ec3537c14aad09bcaafac45");
		expect(sha256(JSON.stringify(econGames.head.tools.map((tool) => [tool.name, tool.description, tool.parameters, tool.for])))).toBe("8061a68101402b7b335610f8d097d322544ad88fe308aef008cb960fad45d9ca");
		// `showEarlierPoints` is new on this platform (M2-29, the cure of LH19) and optional: without it the schema is the old one.
		const { showEarlierPoints: added, ...carried } = econGames.options.properties;
		expect(added).toMatchObject({ type: "boolean" });
		expect(sha256(JSON.stringify({ ...econGames.options, properties: carried }))).toBe("088c380af59e1251080f69b5bc5289b84fb6be718ba789a0b8d5e084884c8b3b");
		expect(sha256(JSON.stringify(econGames.events))).toBe("0158021665b2c5ad7e30ba5e521aa43b97e6ecd657c1ce89dd71ddb1fd177a94");
		expect(econGames.head.audiences).toEqual({ decision_made: ["human"], block_scored: ["human"] });
		expect([econGames.id, econGames.head.summary]).toEqual(["econ-lab", "Public goods, ultimatum and an A-or-B dilemma in rounds for solo seats: sealed decisions, payoffs, a match of games."]);
	});
});
