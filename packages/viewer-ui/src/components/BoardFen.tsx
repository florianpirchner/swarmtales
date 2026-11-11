import { glyphOf, moveSquares, parseFen } from "../fen.ts";

interface Props {
	readonly fen: string;
	/** A coordinate move such as `e2e4`, drawn as a highlight. */
	readonly lastMove?: string;
	readonly caption?: string;
}

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

/** An 8x8 board from a FEN string, with Unicode pieces. */
export function BoardFen({ fen, lastMove, caption }: Props) {
	const board = parseFen(fen);
	if (board === undefined) return <p className="stv-issue small">Not a FEN position: {fen}</p>;
	const marked = lastMove === undefined ? undefined : moveSquares(lastMove);
	return (
		<figure style={{ margin: 0 }}>
			<svg className="stv-board" viewBox="0 0 8.8 8.8" role="img" aria-label={`Board, ${board.turn === "w" ? "white" : board.turn === "b" ? "black" : "?"} to move`}>
				{board.squares.map((piece, square) => {
					const x = (square % 8) + 0.4;
					const y = Math.floor(square / 8) + 0.2;
					const light = ((square % 8) + Math.floor(square / 8)) % 2 === 0;
					return (
						<g key={String(square)}>
							<rect x={x} y={y} width={1} height={1} fill={light ? "var(--light-sq)" : "var(--dark-sq)"} />
							{marked?.includes(square) === true && <rect x={x} y={y} width={1} height={1} fill="var(--accent)" opacity={0.45} />}
							{piece !== undefined && (
								<text className={piece === piece.toUpperCase() ? "piece white" : "piece black"} x={x + 0.5} y={y + 0.54} style={{ fontSize: 0.86 }}>{glyphOf(piece)}</text>
							)}
						</g>
					);
				})}
				{FILES.map((file, column) => <text key={file} className="coord" x={column + 0.9} y={8.45} style={{ fontSize: 0.28 }}>{file}</text>)}
				{[8, 7, 6, 5, 4, 3, 2, 1].map((rank, row) => <text key={rank} className="coord" x={0.1} y={row + 0.75} style={{ fontSize: 0.28 }}>{rank}</text>)}
			</svg>
			{caption !== undefined && <figcaption className="muted small" style={{ textAlign: "center" }}>{caption}</figcaption>}
		</figure>
	);
}
