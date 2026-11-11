import type { RunIndex } from "@swarmtales/viewer-core";
import { viewText, type ViewDescriptor } from "../views.ts";
import { BoardFen } from "./BoardFen.tsx";

interface Props {
	readonly views: readonly ViewDescriptor[];
	readonly index: RunIndex;
	readonly seq: number;
}

/** The story-specific views whose event type occurs in this run, each drawn from the last such event at or before `seq`. */
export function ViewsPanel({ views, index, seq }: Props) {
	const applicable = views.filter((view) => view.kind === "board-fen" && index.byType(view.event).length > 0);
	return (
		<>
			{applicable.map((view) => {
				const event = index.latest(view.event, seq);
				const fen = event === undefined ? undefined : viewText(view, "fen", event.data);
				const lastMove = event === undefined ? undefined : viewText(view, "lastMove", event.data);
				const caption = event === undefined ? undefined : viewText(view, "caption", event.data);
				return (
					<div className="stv-card" key={view.id}>
						<h3>{view.title ?? view.id}</h3>
						{fen === undefined || event === undefined ? <p className="muted small">Nothing yet at this point.</p> : <BoardFen fen={fen} {...(lastMove === undefined ? {} : { lastMove })} caption={`${caption ?? ""} (#${String(event.seq)})`.trim()} />}
					</div>
				);
			})}
		</>
	);
}
