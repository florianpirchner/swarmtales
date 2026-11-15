// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The byte-identity list of the port (M4 specification 2.2): the sha256 of every carried prompt file, of the options
 * schema, of the event schemas, of the prompt keys and of each tool's parameters, computed on the old platform
 * (branch `legacy`, `mechanics/salt-market`), and the tool names, descriptions and grants as the old body declared them.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { saltMarketHead } from "../src/head.ts";

const sha256 = (value: string | Buffer): string => createHash("sha256").update(value).digest("hex");
const PROMPTS = join(import.meta.dirname, "..", "prompts");
const filesOf = (folder: string): readonly string[] => readdirSync(folder, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? filesOf(join(folder, entry.name)) : [join(folder, entry.name)]));

const OLD_PROMPTS: Readonly<Record<string, string>> = {
	"salt-market/game-head.md": "3153ef63397edb5eb5a6b39e3a62a51defadc2bda0b56b82ff6550283305cff0",
	"salt-market/round.md": "1effab33bbff111fbf8f0753af9b5181982631854cbaa9966af48004399c076e",
	"salt-market/rules.md": "8fab36b72fe8a3486f57b0cf4b25ae108456ac78d285cd53996d697e61db50f0",
	"salt-market/tools/accept.md": "b3b7c1094b0b044b71caf9edf15091ad12feb35f8d5deeb6c473ff2b7f15f343",
	"salt-market/tools/decline.md": "83e9c6d72809ff37e2aaec4c0b8842ffb0dfea491b55885fe1317b4f06810c06",
	"salt-market/tools/give.md": "aa680db4d63ecfa7aeea63126ae48c98e9f612c66169b800b629a85da818a877",
	"salt-market/tools/offer.md": "518a98bed4947e46dea386a2256790101d56bdae979cc31752621dc484fe21d2",
	"salt-market/tools/say.md": "2b0eb9adbe0dcf56ffb7695298b84c957309bae42261587f5b8e20212074b18c",
	"salt-market/tools/viewMarket.md": "f525a56b242d1edbb6424fbd667857b09ef48345e8221f9c0b0ae8ae6a192231",
	"salt-market/tools/withdraw.md": "3b7e0edd57b288b2df97bf9728678491b748e601f3439f33558f1abe29d236a1",
};

// The parameters of each tool on the old platform, as sha256 of their JSON.
const OLD_TOOLS: Readonly<Record<string, string>> = {
	viewMarket: "8243f0af367f188a376f2c17b5eabe872a2f7a979813e0d4e2be6d594c2aa259",
	offer: "f7eb5ac7a586f307112239969c1b9e5a0b29534540b1f6ecd3b0757aec68702d",
	accept: "ffbfd6c3f62fcacaf8de99a594f7517905c4a53b07d670584d5cb55a53b11166",
	decline: "b9b9f8adce9d06d4f784753ea39614b716f508219125b183dba2663aeceeaa87",
	withdraw: "7e600c3c0039316ad06a0fef875322a67245fef00c61415dabbccfd2ea64ee5f",
	give: "a17852a850c34bf5c11a23a9e1dc8cf319bd4a0abb5c0147480df324eb1a2925",
	say: "9b3e619a115ae0535f0195302aa48ad87198b0199522dff8fed14729e6ddf5f0",
};

describe("carried byte for byte", () => {
	it("has the prompt files of the old platform and no other, with their keys", () => {
		const found = Object.fromEntries(filesOf(PROMPTS).map((file) => [relative(PROMPTS, file).split("\\").join("/"), sha256(readFileSync(file))]));
		expect(found).toEqual(OLD_PROMPTS);
		expect(sha256(JSON.stringify(saltMarketHead.prompts))).toBe("2f914c97fc716d610d2624015cc16a5de56ac7732b77354635f47851081bf951");
	});

	it("has the tools, the options, the events and the audiences of the old platform", () => {
		const tools = Object.entries(saltMarketHead.tools ?? {});
		expect(tools.map(([name, tool]) => [name, tool.description, tool.for])).toEqual(Object.keys(OLD_TOOLS).map((name) => [name, `salt-market/tools/${name}`, ["resident"]]));
		expect(Object.fromEntries(tools.map(([name, tool]) => [name, sha256(JSON.stringify(tool.params))]))).toEqual(OLD_TOOLS);
		// The one option of this platform, `markOwnOffers` (A46, M4-70), is optional and has no default; without it the options are the old ones.
		const shown = JSON.stringify(saltMarketHead.options);
		expect(JSON.parse(shown)).toMatchObject({ properties: { markOwnOffers: { type: "boolean" } } });
		expect(shown).not.toMatch(/"markOwnOffers":\{[^}]*"default"/);
		expect(shown).not.toMatch(/"required":\[[^\]]*"markOwnOffers"/);
		expect(sha256(JSON.stringify(saltMarketHead.options, (key, value: unknown) => (key === "markOwnOffers" ? undefined : value)))).toBe("d200530ea072b70b62c8553c238015e080fb136ff6e461f66ca6328b6a2e50f6");
		expect(sha256(JSON.stringify(saltMarketHead.events))).toBe("84bf18b737488eed9f8c72a02829599c16133902d1d37c8a5dd9d795e8da2a9e");
		expect(JSON.stringify(saltMarketHead.audiences)).toBe('{"market_game_started":["human"],"market_said":["human"],"market_game_scored":["human"]}');
		expect([saltMarketHead.id, saltMarketHead.summary]).toEqual(["salt-market", "The negotiation game Salt Market for solo seats: five goods, secret values and contracts, offers through a bank, escrowed or plain promises, spoilage and a trade tax."]);
	});
});
