/**
 * The callers and helpers of the pipeline (docs/design/mechanic-api.md §4): names for ids
 * (presentation), tools that wait for a role (consult), secrets in the guard question, calls the
 * script stages from jobs and listeners, tools per role (a resident's and the gamemaker's variant
 * of one name) and the `between` slot where the gamemaker looks after the turns.
 */
import { Type } from "typebox";
import { describe, expect, it } from "vitest";
import { createHost, defineCoreStory, defineMechanic, defineTool, refuse, reply } from "@swarmtales/kernel";
import { checkDeterminism, checkSnapshotRoundTrip, idleAgent, playStory, scriptedAgent } from "@swarmtales/testkit";
import type { EventEnvelope, GuardModel, GuardModelQuestion, Host, MechanicUse, RoleCaller, RoleQuestion } from "@swarmtales/contracts";

const NAMES: Readonly<Record<string, string>> = { A01: "Ada", A02: "Bea", A03: "Cyd", A04: "Dov" };

/** Names for ids: `to` takes a name, every text shows names. */
const names = defineMechanic({ id: "names", summary: "A test mechanic: names for ids.", options: Type.Object({}), state: () => undefined, events: {} }, () => ({
	presentation: {
		resolve: ({ params }) => {
			if (typeof params !== "object" || params === null) return params;
			return Object.fromEntries(Object.entries(params).map(([key, value]: [string, unknown]) => [key, key === "to" && typeof value === "string" ? (Object.entries(NAMES).find(([, name]) => name === value)?.[0] ?? value) : value]));
		},
		display: (text) => text.replace(/\bA0[1-4]\b/g, (id) => NAMES[id] ?? id),
	},
}));

/** Messages with a guarded text, each resident's own code as its guard secret, and a resident `announce`. */
const mail = defineMechanic(
	{
		id: "mail",
		summary: "A test mechanic: messages, secrets and a resident's announce.",
		options: Type.Object({}),
		state: (): { inbox: string[] } => ({ inbox: [] }),
		events: { mail_sent: Type.Object({ from: Type.String(), to: Type.String(), text: Type.String() }), announced: Type.Object({ by: Type.String(), text: Type.String() }) },
		prompts: { "mail/send": [], "mail/announce": [] },
	},
	(kit) => ({
		tools: [
			kit.tool({
				name: "send",
				description: "mail/send",
				parameters: Type.Object({ to: Type.String(), text: Type.String() }),
				guardText: (params) => params.text,
				rule: (params, ctx) => (ctx.residents.has(params.to) ? undefined : refuse("UNKNOWN_RESIDENT", `nobody called ${params.to}`)),
				execute: (params, ctx) => {
					ctx.emit("mail_sent", { from: ctx.resident ?? "", to: params.to, text: params.text });
					ctx.state.inbox.push(`${params.to}:from ${ctx.resident ?? ""}`);
					return reply(`sent to ${params.to}`);
				},
			}),
			kit.tool({ name: "announce", description: "mail/announce", serves: ["resident"], parameters: Type.Object({ text: Type.String() }), execute: (params, ctx) => {
				ctx.emit("announced", { by: ctx.actor, text: params.text });
				return reply("announced by a resident");
			} }),
		],
		hooks: {
			turnInputs: (resident, ctx) => {
				const mine = ctx.state.inbox.filter((entry) => entry.startsWith(`${resident}:`));
				ctx.state.inbox = ctx.state.inbox.filter((entry) => !entry.startsWith(`${resident}:`));
				return mine.map((entry) => entry.slice(4));
			},
		},
		guard: {
			secrets: (resident) => [{ label: "your code", value: `CODE${resident}` }],
			leaks: (text, secrets, minRun) => (secrets.some((secret) => [...Array(Math.max(0, secret.value.length - minRun + 1)).keys()].some((start) => text.includes(secret.value.slice(start, start + minRun)))) ? "carries a code" : undefined),
		},
		snapshot: kit.snapshot({ version: 1, schema: Type.Object({ inbox: Type.Array(Type.String()) }), save: (state) => ({ inbox: [...state.inbox] }), load: (data) => ({ inbox: [...data.inbox] }) }),
	}),
);

/** The gamemaker's and script's `announce`, declared apart so the script stages it typed. */
const Announce = defineTool("announce", Type.Object({ text: Type.String() }));

/** A tool that waits for the judge, and the gamemaker's and script's `announce` and `draw`. */
const court = defineMechanic(
	{
		id: "court",
		summary: "A test mechanic: a consulted judge and tools for the gamemaker.",
		options: Type.Object({}),
		state: () => undefined,
		events: { judged: Type.Object({ accused: Type.String(), guilty: Type.Boolean() }), proclaimed: Type.Object({ by: Type.String(), text: Type.String() }), drawn: Type.Object({ drawn: Type.String() }) },
		prompts: { "court/accuse": [], "court/announce": [], "court/draw": [] },
	},
	(kit) => ({
		tools: [
			kit.tool({
				name: "accuse",
				description: "court/accuse",
				parameters: Type.Object({ to: Type.String(), claim: Type.String() }),
				consult: {
					role: "judge",
					question: Type.Object({ accused: Type.String(), claim: Type.String() }),
					answer: Type.Object({ guilty: Type.Boolean() }),
					ask: (params, ctx) => (params.to === ctx.resident ? refuse("SELF_ACCUSE") : { accused: params.to, claim: params.claim }),
				},
				execute: (params, ctx, consulted) => {
					if (!consulted.ok) return refuse(consulted.reason === "absent" ? "JUDGE_ABSENT" : "JUDGE_FAILED", consulted.error);
					ctx.emit("judged", { accused: params.to, guilty: consulted.answer.guilty });
					return reply(consulted.answer.guilty ? `${params.to} is guilty` : `${params.to} is cleared`);
				},
			}),
			kit.tool({ name: "announce", description: "court/announce", serves: ["gamemaker", "script"], parameters: Announce.parameters, execute: (params, ctx) => {
				ctx.emit("proclaimed", { by: ctx.actor, text: params.text });
				return reply("proclaimed");
			} }),
			kit.tool({ name: "draw", description: "court/draw", serves: ["gamemaker"], parameters: Type.Object({ candidates: Type.Array(Type.String(), { minItems: 1 }) }), execute: (params, ctx) => {
				// The code draws with the run's seed; the model never rolls.
				const drawn = ctx.random().pick(params.candidates);
				ctx.emit("drawn", { drawn });
				return reply(`drawn: ${drawn}`);
			} }),
		],
	}),
);

/** The script: a job that stages a call, a listener that stages one, and a `then` job. */
const script = defineMechanic(
	{
		id: "script",
		summary: "A test mechanic: staged calls by the script.",
		options: Type.Object({}),
		state: (): { outcomes: string[] } => ({ outcomes: [] }),
		events: { outcome_noted: Type.Object({ outcome: Type.String() }) },
	},
	(kit) => ({
		hooks: {
			runStarted: (ctx) => {
				ctx.schedule.at(1, "herald");
			},
		},
		jobs: {
			herald: (ctx) => {
				ctx.stage(Announce, { text: "minute one" }, { then: "noted" });
			},
			noted: (ctx, data) => {
				const outcome = JSON.stringify(data);
				ctx.state.outcomes.push(outcome);
				ctx.emit("outcome_noted", { outcome });
			},
		},
		listeners: [
			kit.listen(mail, "mail_sent", (payload, ctx) => {
				ctx.stage(Announce, { text: `${payload.from} wrote` });
			}),
		],
		facts: { outcomes: kit.fact(Type.Array(Type.String()), (view) => [...view.state.outcomes]) },
		snapshot: kit.snapshot({ version: 1, schema: Type.Object({ outcomes: Type.Array(Type.String()) }), save: (state) => ({ outcomes: [...state.outcomes] }), load: (data) => ({ outcomes: [...data.outcomes] }) }),
	}),
);

function story(mechanics: readonly MechanicUse[], extra: { readonly guard?: boolean } = {}) {
	return defineCoreStory({
		id: "callers",
		seed: 7,
		minutes: 3,
		residents: 4,
		mechanics,
		grants: { resident: ["send", "accuse", "announce"], gamemaker: ["announce", "draw"], script: ["announce"] },
		...(extra.guard === true ? { tools: { resident: { send: { guard: { id: "no-codes", rule: "No codes.", on: "block" as const, secrets: { minRun: 3 } } } } } } : {}),
	});
}

const ALL = [names.with(), mail.with(), court.with(), script.with()];
const payloadOf = (event: EventEnvelope | undefined): Record<string, unknown> => (typeof event?.payload === "object" && event.payload !== null ? Object.fromEntries(Object.entries(event.payload)) : {});
const started = (): Host => {
	const host = createHost({ story: story(ALL) });
	host.start();
	return host;
};

describe("names for ids", () => {
	it("resolves a name where an id goes and shows names in replies, details and inputs", async () => {
		const host = started();
		expect(await host.call("resident:A01", "send", { to: "Bea", text: "hi" })).toEqual({ ok: true, reply: "sent to Bea" });
		expect(payloadOf(host.log.ofType("mail", "mail_sent")[0])).toEqual({ from: "A01", to: "A02", text: "hi" });
		expect(await host.call("resident:A01", "send", { to: "A09", text: "hi" })).toEqual({ ok: false, code: "UNKNOWN_RESIDENT", detail: "nobody called A09" });
		expect(host.display("A03 meets A04")).toBe("Cyd meets Dov");
		const inputs: string[] = [];
		await host.playMinute((turn) => {
			if (turn.resident === "A02") inputs.push(...turn.inputs.map((note) => note.text));
			return Promise.resolve();
		});
		expect(inputs).toEqual(["from Ada"]);
	});
});

describe("tools that wait for a role", () => {
	const judge = (answer: (question: RoleQuestion) => Promise<unknown>): RoleCaller => ({
		ask: async (question) => ({ ok: true, answer: await answer(question), costUsd: 0.25 }),
	});

	it("asks the role after the guard, logs question, answer and cost, and hands the answer to execute", async () => {
		const host = createHost({ story: story(ALL), roles: { judge: judge(() => Promise.resolve({ guilty: true })) } });
		host.start();
		expect(await host.call("resident:A01", "accuse", { to: "Bea", claim: "she lied" })).toEqual({ ok: true, reply: "Bea is guilty" });
		const chain = host.log.all().filter((event) => event.causedBy === 2 || event.seq === 2);
		expect(chain.map((event) => `${event.type} ${event.actor}`)).toEqual(["tool_called resident:A01", "role_asked resident:A01", "role_answered resident:A01", "judged resident:A01"]);
		expect(payloadOf(chain[1])).toEqual({ role: "judge", tool: "accuse", question: { accused: "A02", claim: "she lied" } });
		expect(payloadOf(chain[2])).toEqual({ role: "judge", ok: true, answer: { guilty: true }, costUsd: 0.25 });
		expect(host.snapshot().referee.costUsd).toBe(0.25);
	});

	it("refuses at stage consult before asking, and passes absence and failures to execute", async () => {
		const absent = started();
		expect(await absent.call("resident:A01", "accuse", { to: "A01", claim: "me" })).toEqual({ ok: false, code: "SELF_ACCUSE" });
		expect(payloadOf(absent.log.ofType("core", "tool_refused")[0])).toMatchObject({ stage: "consult", code: "SELF_ACCUSE" });
		expect(await absent.call("resident:A01", "accuse", { to: "A02", claim: "x" })).toEqual({ ok: false, code: "JUDGE_ABSENT", detail: 'no role "judge" in this run' });
		expect(absent.log.ofType("core", "role_asked")).toHaveLength(0);
		const thrown = createHost({ story: story(ALL), roles: { judge: { ask: () => Promise.reject(new Error("offline")) } } });
		thrown.start();
		expect(await thrown.call("resident:A01", "accuse", { to: "A02", claim: "x" })).toEqual({ ok: false, code: "JUDGE_FAILED", detail: "offline" });
		const sloppy = createHost({ story: story(ALL), roles: { judge: judge(() => Promise.resolve({ guilty: "maybe" })) } });
		sloppy.start();
		expect(await sloppy.call("resident:A01", "accuse", { to: "A02", claim: "x" })).toMatchObject({ ok: false, code: "JUDGE_FAILED" });
		expect(sloppy.log.ofType("court", "judged")).toHaveLength(0);
	});
});

describe("guard secrets", () => {
	it("puts the author's secrets into the question, blocks a run of one without a model, and says when no model ran", async () => {
		const questions: GuardModelQuestion[] = [];
		const guard: GuardModel = { label: "test", judge: (question) => {
			questions.push(question);
			return Promise.resolve({ ok: true, allowed: true, reason: "fine", usage: [{ provider: "t", model: "t", input: 1, output: 1, cacheRead: 0, cacheWrite: 0, costUsd: 0.5 }] });
		} };
		const host = createHost({ story: story(ALL, { guard: true }), guard });
		host.start();
		expect(await host.call("resident:A01", "send", { to: "A02", text: "hello" })).toMatchObject({ ok: true });
		expect(questions).toEqual([{ resident: "A01", tool: "send", rule: "No codes.", text: "hello", secrets: [{ label: "your code", value: "CODEA01" }] }]);
		expect(await host.call("resident:A01", "send", { to: "A02", text: "mine is DEA0" })).toEqual({ ok: false, code: "GUARD_BLOCKED", detail: "carries a code" });
		expect(questions).toHaveLength(1);
		expect(host.log.ofType("core", "guard_verdict").map(payloadOf)).toEqual([
			{ tool: "send", rule: "no-codes", allowed: true, reason: "fine", by: "model" },
			{ tool: "send", rule: "no-codes", allowed: false, reason: "carries a code", by: "check" },
		]);
		expect(host.snapshot().referee.costUsd).toBe(0.5);
		const offline = createHost({ story: story(ALL, { guard: true }) });
		offline.start();
		await offline.call("resident:A01", "send", { to: "A02", text: "hello" });
		expect(payloadOf(offline.log.ofType("core", "guard_verdict")[0])).toEqual({ tool: "send", rule: "no-codes", allowed: true, reason: "no guard model in this run; only the check ran", by: "none" });
	});
});

describe("the script as a caller", () => {
	it("runs a call staged by a job through the pipeline as the script and hands its outcome to the then job", async () => {
		const run = await playStory({ story: story(ALL) }, idleAgent);
		const called = run.events.find((event) => event.type === "tool_called" && event.actor === "script");
		const job = run.events.find((event) => event.type === "job_ran");
		expect(called?.causedBy).toBe(job?.seq);
		expect(payloadOf(run.events.find((event) => event.type === "proclaimed"))).toEqual({ by: "script", text: "minute one" });
		expect(run.host.facts()).toEqual({ "script.outcomes": ['{"ok":true,"reply":"proclaimed"}'] });
		expect(run.events.find((event) => event.type === "outcome_noted")?.causedBy).toBe(called?.seq);
	});

	it("runs a call staged by a listener right after the resident's call, before the call returns", async () => {
		const host = started();
		await host.call("resident:A01", "send", { to: "A02", text: "hi" });
		const types = host.log.all().map((event) => `${event.type}:${event.actor}`);
		expect(types).toEqual(["run_started:host", "tool_called:resident:A01", "mail_sent:resident:A01", "tool_called:script", "proclaimed:script"]);
		expect(host.log.all()[3]?.causedBy).toBe(3);
	});

	it("refuses to stage an unknown tool or then job, and stays deterministic and resumable", async () => {
		const careless = defineMechanic({ id: "careless", summary: "Stages nonsense.", options: Type.Object({}), state: () => undefined, events: {} }, () => ({
			hooks: { runStarted: (ctx) => {
				ctx.stage(defineTool("fly", Type.Object({})), {});
			} },
		}));
		expect(() => {
			createHost({ story: story([...ALL, careless.with()]) }).start();
		}).toThrow(/stages "fly"/);
		const agent = () => scriptedAgent((turn) => (turn.minute < 2 ? [{ tool: "send", params: { to: "Cyd", text: `minute ${String(turn.minute)}` } }] : []));
		expect(await checkDeterminism({ story: story(ALL) }, agent)).toEqual([]);
		expect(await checkSnapshotRoundTrip({ story: story(ALL) }, agent, 1)).toEqual([]);
	});
});

describe("the gamemaker as a role with grants", () => {
	it("keeps a resident's and the gamemaker's tool of one name apart", async () => {
		const host = started();
		expect(host.toolSpecs("resident").map((spec) => `${spec.name}=${spec.description}`)).toEqual(["send=mail/send", "accuse=court/accuse", "announce=mail/announce"]);
		expect(host.toolSpecs("gamemaker").map((spec) => `${spec.name}=${spec.description}`)).toEqual(["announce=court/announce", "draw=court/draw"]);
		expect(await host.call("gamemaker", "announce", { text: "hear me" })).toEqual({ ok: true, reply: "proclaimed" });
		expect(await host.call("resident:A01", "announce", { text: "me too" })).toEqual({ ok: true, reply: "announced by a resident" });
		expect(await host.call("resident:A01", "draw", { candidates: ["A01"] })).toMatchObject({ ok: false, code: "TOOL_NOT_GRANTED" });
		const twice = defineMechanic({ id: "twice", summary: "Clashes.", options: Type.Object({}), state: () => undefined, events: {}, prompts: { "twice/a": [] } }, (kit) => ({
			tools: [kit.tool({ name: "draw", description: "twice/a", serves: ["gamemaker", "script"], parameters: Type.Object({}), execute: () => reply("") })],
		}));
		expect(() => createHost({ story: story([...ALL, twice.with()]) })).toThrow(/same role/);
	});

	it("looks between the turns and minute_ended, with actor gamemaker, and draws with the seed", async () => {
		const drawn: string[] = [];
		const host: Host = createHost({
			story: story(ALL),
			between: async (minute) => {
				const outcome = await host.call("gamemaker", "draw", { candidates: ["A01", "A02", "A03", "A04"] });
				if (outcome.ok) drawn.push(`${String(minute)}:${outcome.reply}`);
			},
		});
		host.start();
		await host.run(idleAgent);
		const events = host.log.all();
		const draws = events.filter((event) => event.type === "drawn");
		expect(draws.map((event) => event.actor)).toEqual(["gamemaker", "gamemaker", "gamemaker"]);
		for (const event of draws) {
			const next = events.slice(event.seq).find((later) => later.source === "core" && (later.type === "minute_ended" || later.type === "turn_started"));
			expect(next?.type).toBe("minute_ended");
		}
		expect(drawn).toHaveLength(3);
		expect(drawn.map((entry) => entry.replace(/^\d+:/, "")).every((entry) => /^drawn: (Ada|Bea|Cyd|Dov)$/.test(entry))).toBe(true);
	});
});

describe("app events", () => {
	it("writes only declared app events, with their schema, as source app", () => {
		const app = { events: { usage: Type.Object({ agent: Type.String(), costUsd: Type.Number() }) } };
		const host = createHost({ story: story(ALL), app });
		host.start();
		host.record("resident:A01", "usage", { agent: "A01", costUsd: 0 });
		expect(host.log.all().at(-1)).toMatchObject({ type: "usage", source: "app", actor: "resident:A01", payload: { agent: "A01", costUsd: 0 } });
		expect(() => {
			host.record("host", "usage", { agent: 1 });
		}).toThrow(/does not match/);
		expect(() => {
			host.record("host", "text", {});
		}).toThrow(/not declared/);
		expect(() => createHost({ story: story(ALL), app: { events: { run_ended: Type.Object({}) } } })).toThrow(/reserved/);
	});
});
