// SPDX-License-Identifier: Apache-2.0
/**
 * The envelope reader: a run of the new platform, recognised by its `manifest.json`. A line of its
 * `events.jsonl` is a stored envelope with the payload nested; the reader turns it into the same
 * {@link RunEvent} record the views work on, and the manifest into the run's header.
 */
import { EnvelopeSchema, LOG_FORMAT, nameOf, RunManifestSchema, StoredEnvelopeSchema, type RunManifest } from "@swarmtales/contracts";
import type { Static } from "typebox";
import { Check } from "typebox/value";
import { isRecord, linesOf, type LoadIssue, type RunEvent } from "./events.ts";
import type { RunMeta } from "./files.ts";

/** The manifest of a run, canonical JSON; only a run of the new platform has one. */
export const MANIFEST_FILE = "manifest.json";

type Line = Static<typeof EnvelopeSchema>;

/**
 * Says whether a parsed JSON value is the manifest of a run whose log holds envelopes.
 *
 * @param value - The parsed text of `manifest.json`.
 * @returns True for a run manifest whose `log.format` is the envelope log.
 */
export function isEnvelopeManifest(value: unknown): value is RunManifest {
	return Check(RunManifestSchema, value) && value.log.format === LOG_FORMAT;
}

// The envelope's own fields that the views read beside the payload's; the ones a line leaves out are left out.
function envelopeFields(envelope: Line, at: string | undefined): Readonly<Record<string, unknown>> {
	return {
		type: envelope.type,
		seq: envelope.seq,
		minute: envelope.tick,
		source: envelope.source,
		actor: nameOf(envelope.actor),
		...(envelope.causedBy === undefined ? {} : { causedBy: envelope.causedBy }),
		...(envelope.basis === undefined ? {} : { basis: envelope.basis }),
		...(envelope.tool === undefined ? {} : { tool: envelope.tool }),
		...(at === undefined ? {} : { at }),
	};
}

function eventOf(envelope: Line, line: number, at?: string): RunEvent {
	const { payload } = envelope;
	// A payload that is no object has no fields to lay beside the envelope's: it stays whole under `payload`.
	const fields = isRecord(payload) ? payload : { payload };
	return {
		seq: envelope.seq,
		minute: envelope.tick,
		type: envelope.type,
		...(at === undefined ? {} : { at }),
		actor: nameOf(envelope.actor),
		line,
		data: { ...fields, ...envelopeFields(envelope, at) },
		actorId: envelope.actor,
		payload,
	};
}

function parsed(raw: string): unknown {
	try {
		const value: unknown = JSON.parse(raw);
		return value;
	} catch {
		return undefined;
	}
}

/**
 * Parses the parsed lines of an envelope log, for the checks that read every line as JSON.
 *
 * @param text - The text of `events.jsonl`.
 * @returns One value per line; `undefined` for a line that is no JSON.
 */
export function envelopeLines(text: string): readonly unknown[] {
	return linesOf(text).map(parsed);
}

/**
 * Parses the `events.jsonl` of a run of the new platform. A line that is no envelope becomes an issue,
 * never an exception. The tick is the event's `minute`, and the actor is the name of the actor id.
 *
 * @param text - The text of `events.jsonl`.
 * @param file - The path of the file, for the issues.
 * @returns The events in file order and the lines that could not be read.
 */
export function parseEnvelopes(text: string, file = "events.jsonl"): { readonly events: readonly RunEvent[]; readonly issues: readonly LoadIssue[] } {
	const events: RunEvent[] = [];
	const issues: LoadIssue[] = [];
	envelopeLines(text).forEach((value, index) => {
		const line = index + 1;
		if (Check(StoredEnvelopeSchema, value)) events.push(eventOf(value, line, value.at));
		else if (Check(EnvelopeSchema, value)) events.push(eventOf(value, line));
		else issues.push({ file, line, reason: "not an envelope" });
	});
	return { events, issues };
}

/**
 * Reads the run's header from its manifest, in the shape the views know from `000-run.json`.
 *
 * @param manifest - The manifest of the run.
 * @returns The run id, the game id and title, the seed, the start, and each actor with its driver and model.
 */
export function headerOf(manifest: RunManifest): RunMeta {
	return {
		run: manifest.run.id,
		startedAt: manifest.run.startedAt,
		storyId: manifest.game.id,
		...(manifest.game.title === undefined ? {} : { title: manifest.game.title }),
		effective: { agents: manifest.actors.length, seed: manifest.seed },
		agents: manifest.actors.map((actor) => ({
			agent: actor.id.slice(actor.id.indexOf(":") + 1),
			driver: actor.driver,
			...(actor.model === undefined ? {} : { provider: actor.model.provider, model: actor.model.resolvedId }),
		})),
	};
}
