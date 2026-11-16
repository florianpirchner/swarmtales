// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * `swt doctor --online` (section 5 of the M6 specification): per provider with a key, or only the one of
 * `--provider`, the estimated cost of one minimal request is printed first, then that request goes to the
 * provider's cheapest alias under the cost meter's cap (`--budget`, 0.01 USD when left out). With `--ledger` the
 * cap is reserved before the first request and replaced by the cost after the last, as for a run.
 */
import { resolve } from "node:path";
import { SwtError, type Redact } from "@swarmtales/contracts";
import { createCostMeter, createKeyBroker, createModelSource, createProviderRegistry, formatUsd, KEY_VARIABLES, probeEstimateUsd, REQUEST_TIMEOUT_MS, resolveModelSettings, sendProbe, type CostMeter, type KeyBroker, type ModelBinding, type ModelSettings, type ModelSource, type ProviderRegistry } from "@swarmtales/models";
import type { DoctorCheck } from "./doctor.ts";
import { badUsage } from "./errors.ts";
import { liveFlags, type Flags } from "./flags.ts";
import { openLedger } from "./ledger.ts";
import type { CliIo } from "./main.ts";

/**
 * The cap of `swt doctor --online` when `--budget` is left out, in USD.
 *
 * @public
 */
export const ONLINE_BUDGET_USD = 0.01;

/**
 * What `--online`, `--provider`, `--budget` and `--ledger` of `swt doctor` say, checked.
 *
 * @public
 */
export interface OnlineFlags {
	/** `--provider`: the one provider to ask; every provider with a key when absent. */
	readonly provider?: string;
	/** `--budget`: the cap of all requests, in USD. */
	readonly budget: number;
	/** `--ledger`: the spend ledger the cap is reserved in; none when absent. */
	readonly ledger?: string;
}

/**
 * Reads the flags of `swt doctor` beyond `--json`.
 *
 * @param flags - The flags as written.
 * @returns The online flags with `--online`; undefined without it.
 * @throws SwtError `SWT-C003` for `--provider`, `--budget` or `--ledger` without `--online`, and for a `--budget`
 * that is no amount in US dollars.
 *
 * @public
 */
export function onlineFlags(flags: Flags): OnlineFlags | undefined {
	const { provider, budget, ledger } = liveFlags(flags);
	if (flags.online !== true) {
		const stray = (["provider", "budget", "ledger"] as const).filter((name) => flags[name] !== undefined);
		if (stray.length > 0) throw new SwtError(stray.map((name) => badUsage({ problem: `\`--${name}\` of \`swt doctor\` needs \`--online\`` })));
		return undefined;
	}
	return { ...(provider === undefined ? {} : { provider }), budget: budget ?? ONLINE_BUDGET_USD, ...(ledger === undefined ? {} : { ledger }) };
}

/** The model source of one provider's settings; a test passes a fake one through `CliIo.models`. */
type SourceOf = (settings: ModelSettings, broker: KeyBroker) => ModelSource;

interface Asked {
	readonly id: string;
	readonly usable: boolean;
}

// The providers to ask, each with whether its key can be used: a key that the broker refuses (`SWT-X006`) cannot.
function askedOf(flags: OnlineFlags, registry: ProviderRegistry, env: Readonly<Record<string, string | undefined>>): readonly Asked[] {
	const ids = flags.provider === undefined ? registry.ids() : [registry.require(flags.provider).id];
	return ids.flatMap((id): Asked[] => {
		const names = KEY_VARIABLES[id] ?? [];
		if (!names.some((name) => (env[name] ?? "") !== "")) return flags.provider === undefined ? [] : [{ id, usable: false }];
		try {
			createKeyBroker(env, { [id]: names });
			return [{ id, usable: true }];
		} catch (error) {
			if (!(error instanceof SwtError)) throw error;
			return [{ id, usable: false }];
		}
	});
}

// The ids of the providers to ask; a fail for each without a key that can be used, a warning when there is none at all.
function usableOf(asked: readonly Asked[], emit: (check: DoctorCheck) => void): readonly string[] {
	for (const { id } of asked.filter((provider) => !provider.usable)) emit({ check: `online ${id}`, status: "fail", detail: `not asked: no key that can be used is set in ${(KEY_VARIABLES[id] ?? []).join(", ")}` });
	if (asked.length === 0) emit({ check: "online", status: "warn", detail: "nothing was asked: no provider has a key" });
	return asked.filter((provider) => provider.usable).map(({ id }) => id);
}

// The cheapest alias of a provider by the price table, bound with an output cap of one token; its default model when it has no alias.
function cheapest(id: string, registry: ProviderRegistry, broker: KeyBroker, sourceOf: SourceOf): { readonly settings: ModelSettings; readonly binding: ModelBinding } | undefined {
	const spec = registry.require(id);
	const candidates = Object.keys(spec.modelAliases ?? {}).flatMap((alias) => {
		const settings = resolveModelSettings({ provider: id, modelId: alias }, {}, undefined, registry);
		try {
			return [{ settings, binding: sourceOf(settings, broker).bind(`doctor:${id}`, { maxOutputTokens: 1, timeoutMs: REQUEST_TIMEOUT_MS }) }];
		} catch (error) {
			// A model without a price (`SWT-X007`) or not in the table (`SWT-X003`) is no candidate.
			if (!(error instanceof SwtError)) throw error;
			return [];
		}
	});
	return candidates.sort((one, two) => probeEstimateUsd(one.binding) - probeEstimateUsd(two.binding))[0];
}

interface Ask {
	readonly id: string;
	readonly meter: CostMeter;
	readonly redact: Redact;
	readonly now: () => Date;
	readonly emit: (check: DoctorCheck) => void;
}

// One provider: the estimate first, then the request, or a skip when the estimate does not fit under what is left of the cap.
async function askOne(chosen: { readonly settings: ModelSettings; readonly binding: ModelBinding }, ask: Ask): Promise<void> {
	const { id, meter, emit } = ask;
	const check = `online ${id}`;
	const model = `${id}/${chosen.settings.modelId}`;
	const estimate = probeEstimateUsd(chosen.binding);
	const left = meter.capUsd - meter.total.costUsd;
	if (estimate > left || meter.limit.check() !== undefined) {
		emit({ check, status: "warn", detail: `skipped: one request to ${model} is estimated at ${formatUsd(estimate)} USD, above the ${formatUsd(Math.max(left, 0))} USD left of the budget` });
		return;
	}
	emit({ check, status: "ok", detail: `one request to ${model} (one input line, at most 1 output token) is estimated at ${formatUsd(estimate)} USD; sending it` });
	const started = ask.now().getTime();
	const answer = await sendProbe(chosen.binding, `doctor:${id}`);
	const ms = ask.now().getTime() - started;
	meter.add(`doctor:${id}`, answer.usage);
	const cost = `${String(answer.usage.input)} input and ${String(answer.usage.output)} output tokens, ${formatUsd(answer.usage.costUsd)} USD`;
	if (answer.ok) emit({ check, status: "ok", detail: `${model} answered in ${String(ms)} ms: ${cost}` });
	else emit({ check, status: "fail", detail: ask.redact(`${model} did not answer (a refused key or an unreachable provider) after ${String(ms)} ms: ${answer.detail}; ${cost}`) });
}

/**
 * The online checks of `swt doctor --online`, each handed to `emit` as soon as it is known, so that an estimate is
 * printed before its request is sent.
 *
 * @param flags - The provider, the cap and the ledger.
 * @param io - The current directory, the clock, the environment, and for a test the model source (`models`).
 * @param emit - Takes each check.
 * @returns When every request is answered.
 * @throws SwtError `SWT-X002` for an unknown `--provider`, `SWT-X005` for a cap that is not above zero, `SWT-C025`
 * when the ledger cannot be read or has no room for the cap.
 *
 * @public
 */
export async function online(flags: OnlineFlags, io: CliIo & { readonly env: NonNullable<CliIo["env"]> }, emit: (check: DoctorCheck) => void): Promise<void> {
	const registry = createProviderRegistry();
	const meter = createCostMeter(flags.budget);
	const usable = usableOf(askedOf(flags, registry, io.env), emit);
	if (usable.length === 0) return;
	const broker = createKeyBroker(io.env, Object.fromEntries(usable.map((id) => [id, KEY_VARIABLES[id] ?? []])));
	const sourceOf: SourceOf = io.models ?? ((settings, held) => createModelSource(settings, registry, held));
	const ledger = flags.ledger === undefined ? undefined : openLedger(resolve(io.cwd, flags.ledger), io.now);
	ledger?.reserve("doctor/online", flags.budget);
	for (const id of usable) {
		const chosen = cheapest(id, registry, broker, sourceOf);
		if (chosen === undefined) emit({ check: `online ${id}`, status: "fail", detail: "not asked: no alias of the provider has a price in the price table" });
		else await askOne(chosen, { id, meter, redact: broker.redact, now: io.now, emit });
	}
	ledger?.settle("doctor/online", meter.total.costUsd);
}
