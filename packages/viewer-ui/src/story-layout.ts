/**
 * Where the Story tab puts the folded graph (`story-fold.ts`). The backbone (start, the levels or
 * mechanics in order, the endings) runs top to bottom in one column; each backbone node owns a band
 * to its right, where the rules it fires hang in columns by distance (rule, then what the rule opens:
 * a petition, a collection, then the outcomes and the rules those fire). Gamemaker roles and cast
 * members sit left of the level they belong to. Acts are boxes around the bands of their levels.
 * The layout is plain arithmetic: deterministic, synchronous, and columns line up across bands.
 */
import type { FoldedGraph, ViewEdge, ViewNode } from "./story-fold.ts";

export interface Box {
	readonly x: number;
	readonly y: number;
	readonly width: number;
	readonly height: number;
}

export interface ActBox extends Box {
	readonly id: string;
	readonly label: string;
}

export interface StoryLayout {
	readonly boxes: ReadonlyMap<string, Box>;
	readonly acts: readonly ActBox[];
	/** The backbone node ids, top to bottom. */
	readonly backbone: readonly string[];
	/** Where a node sits: the backbone, left of it, or in a band's column (1 = next to the backbone). */
	readonly column: ReadonlyMap<string, number>;
	readonly width: number;
	readonly height: number;
}

const GAP_X = 70;
/** Room between the backbone and the first rule column, for the trigger labels. */
const GAP_BACKBONE = 120;
const GAP_Y = 14;
const BAND_GAP = 30;
const ACT_TOP = 40;
const ACT_BOTTOM = 18;
const MARGIN = 16;
const CHAR = 6.7;

/** Rows of chips a card of `width` needs. */
function chipRows(node: ViewNode, width: number): number {
	let rows = node.chips.length === 0 ? 0 : 1;
	let used = 0;
	for (const chip of node.chips) {
		const size = chip.label.length * 6.9 + 26;
		if (used > 0 && used + size > width - 24) {
			rows += 1;
			used = 0;
		}
		used += size + 4;
	}
	return rows;
}

/** The size a node needs: label, subtitle, conditions and chips. */
export function sizeOf(node: ViewNode): { readonly width: number; readonly height: number } {
	if (node.kind === "start" || node.kind === "end") return { width: 220, height: 50 };
	if (node.kind === "level" || node.kind === "mechanic") return { width: 270, height: 58 };
	// The label shares its line with the run's badges (minute, count, skipped).
	const longest = Math.max(node.label.length * 7.6 + 70, node.subtitle.length * CHAR, ...node.conditions.map((line) => line.length * 6.2));
	const width = node.kind === "rule" ? Math.max(250, Math.min(300, Math.round(longest + 28))) : Math.max(140, Math.min(260, Math.round(longest + 28)));
	const height = 54 + node.conditions.length * 15 + chipRows(node, width) * 26;
	return { width, height };
}

const SIDE_KINDS: ReadonlySet<string> = new Set(["role", "cast"]);
const FOLLOWED: ReadonlySet<ViewEdge["kind"]> = new Set(["trigger", "condition", "action", "branch", "collection", "time"]);

function backboneOf(graph: FoldedGraph): readonly string[] {
	const next = new Map(graph.edges.filter((edge) => edge.kind === "sequence").map((edge) => [edge.from, edge.to]));
	const ids = new Set(graph.nodes.map((node) => node.id));
	const chain: string[] = [];
	let at: string | undefined = ids.has("start") ? "start" : graph.nodes[0]?.id;
	while (at !== undefined && !chain.includes(at)) {
		chain.push(at);
		at = next.get(at);
	}
	if (ids.has("end:run") && !chain.includes("end:run")) chain.push("end:run");
	return chain;
}

/** Lays the folded graph out (see the file comment). */
export function layoutStory(graph: FoldedGraph): StoryLayout {
	const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
	const size = new Map(graph.nodes.map((node) => [node.id, sizeOf(node)]));
	const backbone = backboneOf(graph);
	const bandOf = new Map(backbone.map((id, index) => [id, index]));
	const column = new Map<string, number>(backbone.map((id) => [id, 0]));
	// Roles and cast members sit left of the first backbone node they point at.
	const left = new Map<number, string[]>();
	for (const edge of graph.edges) {
		const node = nodes.get(edge.from);
		const band = bandOf.get(edge.to);
		if (node === undefined || band === undefined || !SIDE_KINDS.has(node.kind) || column.has(node.id)) continue;
		column.set(node.id, -1);
		bandOf.set(node.id, band);
		left.set(band, [...(left.get(band) ?? []), node.id]);
	}
	// Everything else is claimed by the first band that reaches it; time edges and loose nodes go last, to the start.
	const outgoing = new Map<string, ViewEdge[]>();
	for (const edge of graph.edges) outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge]);
	const order: string[] = [];
	const claim = (roots: readonly string[], band: number, kinds: (edge: ViewEdge) => boolean) => {
		const queue = [...roots];
		while (queue.length > 0) {
			const id = queue.shift();
			if (id === undefined) break;
			for (const edge of outgoing.get(id) ?? []) {
				// A collection is reached from the rule that fills it, not from what reads it.
				if (!kinds(edge) || column.has(edge.to) || nodes.get(edge.to)?.kind === "act" || (edge.kind === "collection" && nodes.get(id)?.kind === "collection")) continue;
				column.set(edge.to, Math.max(0, column.get(id) ?? 0) + 1);
				bandOf.set(edge.to, band);
				order.push(edge.to);
				queue.push(edge.to);
			}
		}
	};
	for (const [band, id] of backbone.entries()) claim([id], band, (edge) => FOLLOWED.has(edge.kind) && edge.kind !== "time");
	claim([backbone[0] ?? ""], 0, (edge) => FOLLOWED.has(edge.kind));
	for (const node of graph.nodes) {
		if (column.has(node.id) || node.kind === "act") continue;
		column.set(node.id, 1);
		bandOf.set(node.id, 0);
		order.push(node.id);
		claim([node.id], 0, (edge) => FOLLOWED.has(edge.kind));
	}
	// Column widths are shared by all bands, so the columns line up.
	const width = (id: string) => size.get(id)?.width ?? 0;
	const columnWidth = new Map<number, number>();
	for (const [id, at] of column) columnWidth.set(at, Math.max(columnWidth.get(at) ?? 0, width(id)));
	const deepest = Math.max(0, ...column.values());
	const columnX = new Map<number, number>([[-1, MARGIN]]);
	columnX.set(0, MARGIN + (columnWidth.has(-1) ? (columnWidth.get(-1) ?? 0) + GAP_X : 0));
	for (let at = 1; at <= deepest; at += 1) columnX.set(at, (columnX.get(at - 1) ?? 0) + (columnWidth.get(at - 1) ?? 0) + (at === 1 ? GAP_BACKBONE : GAP_X));
	const totalWidth = (columnX.get(deepest) ?? 0) + (columnWidth.get(deepest) ?? 0) + MARGIN;
	// Bands top to bottom; an act adds room for its title above its first level and a margin below its last.
	const acts = graph.nodes.filter((node) => node.kind === "act");
	const actOf = (index: number) => nodes.get(backbone[index] ?? "")?.parent;
	const boxes = new Map<string, Box>();
	const bandTop: number[] = [];
	const bandBottom: number[] = [];
	let y = MARGIN;
	for (const [index, id] of backbone.entries()) {
		const act = actOf(index);
		if (act !== undefined && act !== actOf(index - 1)) y += ACT_TOP;
		bandTop.push(y);
		const stacks = new Map<number, string[]>([[0, [id]], [-1, left.get(index) ?? []]]);
		for (const member of order) if (bandOf.get(member) === index) stacks.set(column.get(member) ?? 1, [...(stacks.get(column.get(member) ?? 1) ?? []), member]);
		let bottom = y;
		for (const [at, members] of stacks) {
			let top = y;
			for (const member of members) {
				const box = size.get(member) ?? { width: 0, height: 0 };
				const x = (columnX.get(at) ?? 0) + (at === 0 ? ((columnWidth.get(0) ?? 0) - box.width) / 2 : at === -1 ? (columnWidth.get(-1) ?? 0) - box.width : 0);
				boxes.set(member, { x, y: top, ...box });
				top += box.height + GAP_Y;
			}
			bottom = Math.max(bottom, top - GAP_Y);
		}
		bandBottom.push(bottom);
		y = bottom + BAND_GAP;
		if (act !== undefined && act !== actOf(index + 1)) y += ACT_BOTTOM;
	}
	const actBoxes = acts.flatMap((act): ActBox[] => {
		const members = backbone.flatMap((id, index) => (nodes.get(id)?.parent === act.id ? [index] : []));
		const first = members[0];
		const last = members.at(-1);
		if (first === undefined || last === undefined) return [];
		const top = (bandTop[first] ?? 0) - ACT_TOP + 8;
		const bottom = (bandBottom[last] ?? y) + ACT_BOTTOM - 4;
		return [{ id: act.id, label: act.label, x: 4, y: top, width: totalWidth - 8, height: bottom - top }];
	});
	return { boxes, acts: actBoxes, backbone, column, width: totalWidth, height: y };
}
