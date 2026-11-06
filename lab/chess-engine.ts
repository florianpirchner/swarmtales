/**
 * Stockfish 10 (the `stockfish.js` package, GPL-3.0) as a reference engine for chess runs, in this
 * process. It is a dev tool for the lab only: no mechanic and no published package imports it, the
 * residents never see it, and it is never part of a live run. The engine is an emscripten web-worker
 * build, so it is driven through the worker globals (`onmessage` / `postMessage`) and loaded once.
 */
import { createRequire } from "node:module";
import { dirname } from "node:path";

/** An evaluation from the side to move: centipawns, or a mate in `mate` moves (negative: being mated). */
export type Score = { readonly cp: number } | { readonly mate: number };

export interface Analysis {
  readonly score: Score;
  /** The engine's best move in UCI (`e2e4`), or "" when the side to move has none. */
  readonly best: string;
}

type Command = (event: { readonly data: string }) => void;

let engine: Promise<Command> | undefined;
const listeners: ((line: string) => void)[] = [];

function load(): Promise<Command> {
  engine ??= new Promise((resolve, reject) => {
    const require = createRequire(import.meta.url);
    const path = require.resolve("stockfish.js/stockfish.wasm.js");
    Reflect.set(globalThis, "postMessage", (line: unknown) => {
      for (const listener of [...listeners]) listener(String(line));
    });
    // The build fetches its .wasm by a relative path when `fetch` exists; without it, it reads the file from the working directory.
    const fetch: unknown = Reflect.get(globalThis, "fetch");
    const cwd = process.cwd();
    Reflect.deleteProperty(globalThis, "fetch");
    process.chdir(dirname(path));
    require(path);
    const ready = (line: string): void => {
      if (line !== "readyok") return;
      listeners.splice(listeners.indexOf(ready), 1);
      process.chdir(cwd);
      Reflect.set(globalThis, "fetch", fetch);
      const command: unknown = Reflect.get(globalThis, "onmessage");
      if (typeof command !== "function")
        reject(new Error("stockfish.js did not install its message handler"));
      else
        resolve((event) => {
          Reflect.apply(command, globalThis, [event]);
        });
    };
    listeners.push(ready);
    // Commands sent before the module is up are queued by the build and run once it is.
    const queue: unknown = Reflect.get(globalThis, "onmessage");
    if (typeof queue !== "function") {
      reject(new Error("stockfish.js did not install its message handler"));
      return;
    }
    for (const data of ["uci", "setoption name Hash value 16", "isready"])
      Reflect.apply(queue, globalThis, [{ data }]);
  });
  return engine;
}

let chain: Promise<unknown> = Promise.resolve();

/** The engine's evaluation of `fen` at `depth` plies. Calls run one after another. */
export function analyse(fen: string, depth: number): Promise<Analysis> {
  const run = async (): Promise<Analysis> => {
    const send = await load();
    return new Promise((resolve) => {
      let score: Score = { cp: 0 };
      const listener = (line: string): void => {
        const info = /^info .*\bscore (cp|mate) (-?\d+)/.exec(line);
        if (
          info !== null &&
          !line.includes(" upperbound") &&
          !line.includes(" lowerbound")
        )
          score =
            info[1] === "mate"
              ? { mate: Number(info[2]) }
              : { cp: Number(info[2]) };
        const done = /^bestmove (\S+)/.exec(line);
        if (done === null) return;
        listeners.splice(listeners.indexOf(listener), 1);
        resolve({ score, best: done[1] === "(none)" ? "" : (done[1] ?? "") });
      };
      listeners.push(listener);
      send({ data: "ucinewgame" });
      send({ data: `position fen ${fen}` });
      send({ data: `go depth ${String(depth)}` });
    });
  };
  const next = chain.then(run, run);
  chain = next;
  return next;
}

/** Mate scores as centipawns, capped as analysis sites do: a mate is worth `cap`, shrinking slightly with its distance. */
export function centipawns(score: Score, cap = 1000): number {
  if ("cp" in score) return Math.max(-cap, Math.min(cap, score.cp));
  if (score.mate === 0) return -cap;
  return score.mate > 0 ? cap - score.mate : -cap - score.mate;
}
