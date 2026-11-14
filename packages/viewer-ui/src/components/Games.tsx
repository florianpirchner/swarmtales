// SPDX-License-Identifier: Apache-2.0
import type { RunSummary } from "@swarmtales/viewer-core";
import { useMemo } from "react";
import { gameOfRun, type GameInfo } from "../games.ts";
import { safeHtml } from "../markdown.ts";

interface Props {
	readonly games: readonly GameInfo[];
	/** The game shown in detail, or undefined for the list. */
	readonly selected: string | undefined;
	readonly onSelect: (id: string | undefined) => void;
	/** The runs of the source, to list a game's own runs. */
	readonly runs: readonly RunSummary[] | undefined;
	readonly onOpenRun: (dir: string) => void;
}

function GameCard({ entry, count, onSelect }: { readonly entry: GameInfo; readonly count: number; readonly onSelect: (id: string) => void }) {
	return (
		<button type="button" className="stv-game-card" onClick={() => { onSelect(entry.id); }}>
			<strong>{entry.title}</strong>
			<span className="stv-game-summary">{plainSummary(entry.summary)}</span>
			<span className="stv-game-meta">
				{entry.residents !== undefined && <span className="stv-chip">{entry.residents} residents</span>}
				{entry.variants.length > 1 && <span className="stv-chip">{entry.variants.length} variants</span>}
				{count > 0 && <span className="stv-chip here">{count} {count === 1 ? "run" : "runs"} here</span>}
			</span>
		</button>
	);
}

/**
 * The games this build describes: a list of cards, and per game its rules, tools, events and runs.
 *
 * @param props - The game descriptions, the game shown in detail, the runs of the source and what a click opens.
 * @returns The list of cards, the detail of one game, or a line that says the build carries no descriptions.
 */
export function Games(props: Props) {
	const { games, selected, onSelect, runs, onOpenRun } = props;
	const runsOf = useMemo(() => {
		const byGame = new Map<string, RunSummary[]>();
		for (const run of runs ?? []) {
			const game = run.story === undefined ? undefined : gameOfRun(games, run.story);
			if (game !== undefined) byGame.set(game.id, [...(byGame.get(game.id) ?? []), run]);
		}
		return byGame;
	}, [games, runs]);
	if (games.length === 0) return <div className="stv-empty">This build carries no game descriptions. The public build leaves them out; a build from the repository has them.</div>;
	const game = games.find((candidate) => candidate.id === selected);
	if (game === undefined) {
		return (
			<div className="stv-games">
				{games.map((entry) => <GameCard key={entry.id} entry={entry} count={runsOf.get(entry.id)?.length ?? 0} onSelect={onSelect} />)}
			</div>
		);
	}
	return <GameDetail game={game} runs={runsOf.get(game.id) ?? []} onBack={() => { onSelect(undefined); }} onOpenRun={onOpenRun} />;
}

// A README paragraph without its Markdown marks, for a card.
function plainSummary(text: string): string {
	return text.replace(/\*\*|__|`/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
}

function GameDetail({ game, runs, onBack, onOpenRun }: { readonly game: GameInfo; readonly runs: readonly RunSummary[]; readonly onBack: () => void; readonly onOpenRun: (dir: string) => void }) {
	const summary = useMemo(() => safeHtml(game.summary), [game.summary]);
	const readme = useMemo(() => safeHtml(game.readme), [game.readme]);
	return (
		<div className="stv-game">
			<button type="button" className="stv-back" onClick={onBack}>← All games</button>
			<div className="stv-card">
				<h2 className="stv-game-title">{game.title}</h2>
				<div className="stv-report" dangerouslySetInnerHTML={{ __html: summary }} />
				<dl className="stv-kv stv-game-facts">
					{game.residents !== undefined && <><dt>residents</dt><dd>{game.residents}</dd></>}
					{game.minutes !== undefined && <><dt>minutes</dt><dd>{game.minutes}</dd></>}
					<dt>story names</dt>
					<dd>{game.variants.map((name) => <span key={name} className="stv-chip">{name}</span>)}{(game.aliases ?? []).map((name) => <span key={name} className="stv-chip" title="earlier name">{name} (old)</span>)}</dd>
				</dl>
			</div>
			{runs.length > 0 && <GameRuns runs={runs} onOpenRun={onOpenRun} />}
			{game.tools.length > 0 && <GameTools game={game} />}
			{game.mechanics.length > 0 && <GameMechanics game={game} />}
			<div className="stv-card">
				<h3>Description</h3>
				<div className="stv-report" dangerouslySetInnerHTML={{ __html: readme }} />
			</div>
		</div>
	);
}

function GameRuns({ runs, onOpenRun }: { readonly runs: readonly RunSummary[]; readonly onOpenRun: (dir: string) => void }) {
	return (
		<div className="stv-card">
			<h3>Runs here</h3>
			<div className="stv-scroll">
				<table className="stv-table">
					<tbody>
						{runs.map((run) => (
							<tr key={run.dir} className="click" onClick={() => { onOpenRun(run.dir); }}>
								<td><strong>{run.name}</strong><br /><small>{run.story ?? ""}</small></td>
								<td className="num">{run.startedAt?.slice(0, 10) ?? ""}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

function GameTools({ game }: { readonly game: GameInfo }) {
	return (
		<div className="stv-card">
			<h3>Tools</h3>
			<p className="stv-note">What the players can call, with the text they read (main story; variants may add or drop some).</p>
			<dl className="stv-tool-list">
				{game.tools.map((tool) => (
					<div key={tool.name}>
						<dt><code>{tool.name}</code>{tool.grantedTo.map((who) => <span key={who} className="stv-chip">{who}</span>)}</dt>
						<dd>{tool.description ?? "No description found."}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}

function GameMechanics({ game }: { readonly game: GameInfo }) {
	return (
		<div className="stv-card">
			<h3>Mechanics and event types</h3>
			<p className="stv-note">The rules the story loads and the events each writes into the log (with its fields).</p>
			{game.mechanics.map((mechanic) => (
				<details key={mechanic.id} className="stv-mechanic" open={game.mechanics.length <= 2}>
					<summary><code>{mechanic.id}</code> <span>{mechanic.summary}</span> <span className="stv-chip">{mechanic.events.length} {mechanic.events.length === 1 ? "event" : "events"}</span></summary>
					<ul className="stv-events">
						{mechanic.events.map((event) => (
							<li key={event.type}>
								<code className="stv-event-type">{event.type}</code>
								<span className="stv-fields">
									{event.fields.map((field) => <span key={field.name} className="stv-field"><code>{field.name}</code>{field.description === undefined ? null : <small> {field.description}</small>}</span>)}
								</span>
							</li>
						))}
					</ul>
				</details>
			))}
		</div>
	);
}
