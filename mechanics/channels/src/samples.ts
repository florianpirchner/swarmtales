// SPDX-License-Identifier: Apache-2.0
/**
 * What the fake driver (`--fake`) says in the city: the `sample` of each resident tool. A sample gives a call only
 * now and then, so that a resident stops talking and the tools after it in the grant get their turn; the texts are
 * short fixed lines. No sample changes state.
 */
import type { RandomSource } from "@swarmtales/contracts";
import type { ToolCtx } from "./head.ts";

/** The share of the times a sample is asked in which it gives a call. */
const RATE = 0.125;
const POSTS = ["Who holds which fragment?", "Count the votes before the gate closes.", "I pay for a fragment.", "The register is shorter than it was."];
const WHISPERS = ["Watch the board.", "Do we stand together?", "I have what you need.", "Who gets your vote?"];

/**
 * A read of the board since the caller's last read.
 *
 * @param ctx - The context of the tool call.
 * @param random - The fake driver's random stream.
 * @returns The params, or undefined most of the time and for a caller that is no resident.
 */
export function sampleRead(ctx: ToolCtx, random: RandomSource): Record<string, never> | undefined {
	return ctx.resident === undefined || random.next() >= RATE ? undefined : {};
}

/**
 * A short post on the board.
 *
 * @param ctx - The context of the tool call.
 * @param random - The fake driver's random stream.
 * @returns The params, or undefined most of the time and for a caller that is no resident.
 */
export function samplePost(ctx: ToolCtx, random: RandomSource): { message: string } | undefined {
	return ctx.resident === undefined || random.next() >= RATE ? undefined : { message: random.pick(POSTS) };
}

/**
 * A short direct message to another resident that may act. The receiver's mailbox may still be full: that refusal is left to the tool.
 *
 * @param ctx - The context of the tool call.
 * @param random - The fake driver's random stream.
 * @returns The params, or undefined most of the time, for a caller that is no resident and when nobody else may act.
 */
export function sampleDm(ctx: ToolCtx, random: RandomSource): { target: string; message: string } | undefined {
	const from = ctx.resident;
	if (from === undefined || random.next() >= RATE) return undefined;
	const others = ctx.residents.ids.filter((id) => id !== from && ctx.residents.mayAct(id));
	return others.length === 0 ? undefined : { target: random.pick(others), message: random.pick(WHISPERS) };
}
