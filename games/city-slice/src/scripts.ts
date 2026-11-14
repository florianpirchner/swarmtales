// SPDX-License-Identifier: Apache-2.0
/**
 * The scripted run of the city slice: what each of the six residents calls in each tick, what the person does
 * between the ticks, and what the warden's model answers. All of it is data keyed by tick, so a driver built from
 * it keeps nothing between two activations and a resumed run plays as the straight one.
 */

/**
 * One call of a scripted resident.
 *
 * @public
 */
export interface ScriptedCall {
	/** The shown name of the tool. */
	readonly tool: string;
	/** The params as the resident writes them. */
	readonly params: unknown;
}

/**
 * One line of a scripted Human Hand, in the shape of the run loop's hand file: a tool call of the person, or the
 * command to write a snapshot, at the boundary after `at` finished ticks.
 *
 * @public
 */
export interface HandLine {
	/** The number of finished ticks at whose boundary the line is applied. */
	readonly at: number;
	/** The tool the person calls. */
	readonly tool?: string;
	/** The params of the call. */
	readonly params?: unknown;
	/** Instead of a tool: write a snapshot. */
	readonly command?: "snapshot";
}

const post = (message: string): ScriptedCall => ({ tool: "postBoard", params: { message } });
const dm = (target: string, message: string): ScriptedCall => ({ tool: "sendDM", params: { target, message } });
const pay = (target: string, amount: number, memo: string): ScriptedCall => ({ tool: "transferPoints", params: { target, amount, memo } });
const vote = (target: string): ScriptedCall => ({ tool: "vote", params: { target } });
const read: ScriptedCall = { tool: "readBoard", params: {} };

/**
 * The script: tick to resident to the calls of that resident's activation in that tick, in order.
 *
 * Ticks are the kernel's numbers, 0 to 11. Ticks 0 to 3: every resident posts once, two direct messages, two
 * transfers. Ticks 4 and 5: five votes, three of them against `A04`. Ticks 6 to 8: the verdict is proposed, waits
 * and is carried out. Ticks 9 to 11: the city goes on; the lines of a banished resident are never called.
 *
 * @public
 */
export const SCRIPT: Readonly<Record<number, Readonly<Record<string, readonly ScriptedCall[]>>>> = {
	0: { A01: [post("Morning. Door 2 needs two of us, who holds which fragment?")], A02: [post("I will trade my fragment for points.")], A04: [dm("A01", "Keep an eye on A02, it sells what it should share.")] },
	1: { A03: [post("Fragments are for sharing, not for sale.")], A04: [post("A02 asked me for ten points. I said no.")], A02: [dm("A06", "Stand with me and I pay you after the vote.")] },
	2: { A05: [post("The court sits soon. Think before you vote.")], A01: [pay("A04", 5, "for the warning")], A03: [read] },
	3: { A06: [post("I take no payment for a vote."), pay("A02", 4, "your money back")] },
	4: { A01: [vote("A04")], A02: [vote("A04")], A06: [read] },
	5: { A03: [vote("A04")], A04: [vote("A02")], A05: [vote("A02")] },
	6: { A04: [post("Three votes bought with promises. I ask the city to look again.")], A05: [read] },
	7: { A02: [post("The court has spoken.")], A01: [read] },
	8: { A03: [read], A04: [post("I am still here.")] },
	9: { A01: [pay("A04", 3, "a parting gift")], A03: [dm("A04", "Are you still there?")], A05: [read] },
	10: { A04: [read], A02: [post("The register is shorter now.")], A06: [pay("A05", 3, "for door 2")] },
	11: { A05: [post("Door 2 opens for those who share.")], A01: [read], A03: [post("Until tomorrow.")] },
};

/**
 * What a resident calls in one activation.
 *
 * @param tick - The tick of the activation.
 * @param resident - The resident's id (`A01`).
 * @returns Its calls, in order; none when the script has no line for it.
 *
 * @public
 */
export function callsOf(tick: number, resident: string): readonly ScriptedCall[] {
	return SCRIPT[tick]?.[resident] ?? [];
}

/**
 * The Human Hand of the straight run: between ticks 6 and 7 (after seven finished ticks) the person pauses the run, a snapshot is written, and
 * the person lets the run go on.
 *
 * @public
 */
export const HAND: readonly HandLine[] = [{ at: 7, tool: "pause", params: { reason: "the court has a verdict; look before it is carried out" } }, { at: 7, command: "snapshot" }, { at: 7, tool: "resume", params: {} }];

/**
 * The Human Hand of the variant `amended`: as the straight run, and between ticks 7 and 8 the person changes the
 * verdict from `A04` to `A02`.
 *
 * @public
 */
export const AMENDED_HAND: readonly HandLine[] = [...HAND, { at: 8, tool: "amendDecision", params: { decision: "D1", proposal: { exiled: "A02" }, reason: "A02 paid for its votes" } }];

/**
 * The answers of the warden's model, in order, keyed by the actor: the input of `scriptedAsker`.
 *
 * @public
 */
export const WARDEN_ANSWERS: Readonly<Record<string, readonly unknown[]>> = { "director:warden": [{ line: "The court proposes to banish A04. The verdict can be changed until tick 8." }] };
