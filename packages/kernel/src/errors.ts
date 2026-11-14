// SPDX-License-Identifier: Apache-2.0
/**
 * The catalogue of the R codes (run and kernel): one function per code, each returning the issue. A code is never
 * reused or renumbered. `SWT-R010`, `SWT-R011` and `SWT-R014` are raised by the scheduler, which may not import
 * the kernel and builds them itself; they are listed here because they end a run.
 */
import { closest, SwtError, type SwtIssue } from "@swarmtales/contracts";

function textOf(thrown: unknown): string {
	return thrown instanceof Error ? thrown.message : String(thrown);
}

/**
 * `SWT-R001`: the kernel is used after it failed. The first failure is the `cause` of the error.
 *
 * @returns The issue.
 */
export function kernelFailed(): SwtIssue {
	return {
		code: "SWT-R001",
		summary: "the kernel is used after it failed",
		why: "A run that failed is closed: its log ends with `run_ended` and takes no more events.",
		fix: "Solve the first failure (the cause of this error) and create a new kernel.",
	};
}

/**
 * `SWT-R002`: the definition and what was loaded from it, or a snapshot and the definition, do not fit.
 *
 * @param summary - What does not fit, in one sentence.
 * @param fix - What solves it.
 * @returns The issue.
 */
export function misfit(summary: string, fix: string): SwtIssue {
	return { code: "SWT-R002", summary, why: "A kernel runs only a definition whose parts fit each other, and resumes only a snapshot taken from it.", fix };
}

/**
 * `SWT-R003`: plugin code threw, at load or in a run.
 *
 * @param plugin - The plugin id.
 * @param thrown - What was thrown; the caller sets it as the `cause`.
 * @returns The issue; its summary is `<plugin id>: <the thrown message>`.
 */
export function pluginThrew(plugin: string, thrown: unknown): SwtIssue {
	return {
		code: "SWT-R003",
		summary: `${plugin}: ${textOf(thrown)}`,
		why: "The kernel cannot tell what a throw left half done, so it ends the run.",
		fix: `Read the cause and correct the plugin "${plugin}"; a call it wants to decline is answered with a refusal, not with a throw.`,
		details: { plugin },
	};
}

/**
 * `SWT-R010`: the order a scheduler built is no permutation of the actors that may act.
 *
 * @param scheduler - The scheduler id.
 * @returns The issue.
 */
export function orderNoPermutation(scheduler: string): SwtIssue {
	return {
		code: "SWT-R010",
		summary: `${scheduler}: the order is no permutation of the actors that may act`,
		why: "Every actor that may act is activated exactly once in an order.",
		fix: "Return every given actor id once and no other id.",
		details: { scheduler },
	};
}

/**
 * `SWT-R011`: an activated actor has no driver.
 *
 * @param actor - The actor id.
 * @returns The issue.
 */
export function noDriver(actor: string): SwtIssue {
	return {
		code: "SWT-R011",
		summary: `the activated actor "${actor}" has no driver`,
		why: "A driver is looked up by actor id, then by kind; an activation without one cannot be answered.",
		fix: `Add a driver for "${actor}" or for its kind to the driver table.`,
		details: { actor },
	};
}

/**
 * `SWT-R013`: two plugins have a `toAct` hook.
 *
 * @param plugins - The ids of the plugins that have the hook, in load order.
 * @returns The issue.
 */
export function twoToAct(plugins: readonly string[]): SwtIssue {
	return {
		code: "SWT-R013",
		summary: `${plugins.join(" and ")} both have a \`toAct\` hook`,
		why: "One plugin at most says who is to act now.",
		fix: "Load only one of them, or remove the hook from the others.",
		details: { plugins },
	};
}

/**
 * `SWT-R014`: the scheduler activates by `toAct`, and no loaded plugin has the hook.
 *
 * @param scheduler - The scheduler id.
 * @returns The issue.
 */
export function noToAct(scheduler: string): SwtIssue {
	return {
		code: "SWT-R014",
		summary: `${scheduler}: activation \`toAct\` without a plugin that has a \`toAct\` hook`,
		why: "With this activation only the actors a plugin names are activated, so without the hook nobody would ever act.",
		fix: "Load a plugin with a `toAct` hook, or choose another activation.",
		details: { scheduler },
	};
}

/**
 * `SWT-R015`: `kernel.fact` of a key no loaded plugin has.
 *
 * @param key - The key as asked, `<plugin id>.<fact>`.
 * @param known - Every key that exists.
 * @returns The issue, with a "did you mean" when a known key is close.
 */
export function unknownFact(key: string, known: readonly string[]): SwtIssue {
	const near = closest(key, known);
	return {
		code: "SWT-R015",
		summary: `no loaded plugin has the fact "${key}"`,
		why: "A fact is named `<plugin id>.<fact>` and is computed by the plugin that declares it.",
		fix: near === undefined ? `Use one of: ${known.length === 0 ? "(the loaded plugins declare no fact)" : known.join(", ")}.` : `Did you mean "${near}"?`,
		details: { key, known },
	};
}

/**
 * `SWT-R016`: the `after` relations of one hook, or of the listeners of one event, form a cycle.
 *
 * @param plugins - The ids of the plugins in the cycle.
 * @returns The issue.
 */
export function afterCycle(plugins: readonly string[]): SwtIssue {
	return {
		code: "SWT-R016",
		summary: `the \`after\` relations of ${plugins.join(", ")} form a cycle`,
		why: "A registration runs after those of the plugins its `after` names, so one of them must be able to run first.",
		fix: "Remove one `after` entry of the cycle.",
		details: { plugins },
	};
}

/**
 * `SWT-R020`: a sink threw while it took an event or was closed.
 *
 * @param thrown - What was thrown; the caller sets it as the `cause`.
 * @returns The issue.
 */
export function sinkThrew(thrown: unknown): SwtIssue {
	return {
		code: "SWT-R020",
		summary: `a sink threw: ${textOf(thrown)}`,
		why: "A run whose events are not all written cannot be verified, so the kernel ends it.",
		fix: "Read the cause and correct the sink, or free what it writes to.",
	};
}

/**
 * Runs plugin code; what it throws leaves as `SWT-R003` with the thrown value as the cause. An `SwtError` leaves
 * unchanged, so the first failure keeps its code through nested calls.
 *
 * @param plugin - The id of the plugin the code belongs to.
 * @param code - The plugin code.
 * @returns What the code returned.
 * @throws SwtError `SWT-R003` when the code threw anything but an `SwtError`; an `SwtError` as it was thrown.
 */
export function guarded<T>(plugin: string, code: () => T): T {
	try {
		return code();
	} catch (thrown) {
		if (thrown instanceof SwtError) throw thrown;
		throw new SwtError(pluginThrew(plugin, thrown), { cause: thrown });
	}
}
