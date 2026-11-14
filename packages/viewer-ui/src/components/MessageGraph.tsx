// SPDX-License-Identifier: Apache-2.0
import type { MessageGraph as Graph } from "@swarmtales/viewer-core";

interface Props {
	readonly graph: Graph;
}

const WIDTH = 520;
const HEIGHT = 400;

interface Point {
	readonly x: number;
	readonly y: number;
	readonly angle: number;
}

function Arrow({ edge, at, peak }: { readonly edge: Graph["edges"][number]; readonly at: ReadonlyMap<string, Point>; readonly peak: number }) {
	const from = at.get(edge.from);
	const to = at.get(edge.to);
	if (from === undefined || to === undefined) return null;
	const mx = (from.x + to.x) / 2;
	const my = (from.y + to.y) / 2;
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const length = Math.hypot(dx, dy) || 1;
	const bend = 18;
	const cx = mx - (dy / length) * bend;
	const cy = my + (dx / length) * bend;
	return (
		<path d={`M${String(from.x)} ${String(from.y)} Q${String(cx)} ${String(cy)} ${String(to.x)} ${String(to.y)}`} fill="none" stroke="var(--muted)" strokeOpacity={0.55} strokeWidth={0.8 + (edge.count / peak) * 3.2} markerEnd="url(#stv-arrow)">
			<title>{`${edge.from} to ${edge.to}: ${String(edge.count)} messages`}</title>
		</path>
	);
}

function Dot({ name, order, point }: { readonly name: string; readonly order: number; readonly point: Point }) {
	const outside = Math.cos(point.angle) >= 0;
	return (
		<g>
			<circle cx={point.x} cy={point.y} r={7} fill="var(--s1)" stroke="var(--panel)" strokeWidth={2} />
			<text x={point.x + (outside ? 11 : -11)} y={point.y + 4} textAnchor={outside ? "start" : "end"}>{name.length > 10 ? `${name.slice(0, 9)}…` : name}</text>
			<title>{`${name} (${String(order)})`}</title>
		</g>
	);
}

/**
 * Who wrote to whom up to the current point: actors on a circle, one arrow per sender/recipient pair, thicker for more messages.
 *
 * @param props - The message graph.
 * @returns The drawing, or a line that says there are no messages yet.
 */
export function MessageGraph(props: Props) {
	const { graph } = props;
	const nodes = graph.nodes.slice(0, 40);
	const radius = 150;
	const at = new Map(nodes.map((name, index) => {
		const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2 - Math.PI / 2;
		return [name, { x: WIDTH / 2 + radius * Math.cos(angle), y: HEIGHT / 2 + radius * Math.sin(angle), angle }] as const;
	}));
	const peak = Math.max(1, ...graph.edges.map((edge) => edge.count));
	if (nodes.length === 0) return <p className="muted small">No messages yet at this point.</p>;
	return (
		<div className="stv-msg">
			<svg viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`} role="img" aria-label="Who wrote to whom">
				<defs>
					<marker id="stv-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerUnits="userSpaceOnUse" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
						<path d="M0 0 L8 4 L0 8 z" fill="var(--muted)" />
					</marker>
				</defs>
				{graph.edges.map((edge) => <Arrow key={`${edge.from}>${edge.to}`} edge={edge} at={at} peak={peak} />)}
				{nodes.map((name, index) => {
					const point = at.get(name);
					return point === undefined ? null : <Dot key={name} name={name} order={index + 1} point={point} />;
				})}
			</svg>
			<p className="muted small" style={{ margin: 0 }}>{graph.edges.length} pairs, {graph.edges.reduce((sum, edge) => sum + edge.count, 0)} messages</p>
		</div>
	);
}
