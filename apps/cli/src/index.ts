// SPDX-License-Identifier: LicenseRef-SUL-1.0
/**
 * The swt command line. The issues of milestone M1 fill this package.
 *
 * @packageDocumentation
 */

export { GAME_FILE_TYPES, gameFileNotFound, importFile, loadGame, unsupportedGameFile, type GameFileType, type LoadedGame } from "./load-game.ts";
export { installedTable, installedTableBroken, type LoadPackage } from "./installed.ts";
export { badUsage, experimentNotFound, liveRunTooEarly, toolWithoutSample } from "./errors.ts";
export { logVerify } from "./log-verify.ts";
export { main, type CliIo } from "./main.ts";
export { HAND_DRIVER, loopOf, runManifest, type LoopOptions } from "./assembly.ts";
export { HandLineSchema, handEnded, handOf, handRefused } from "./hand.ts";
export { runLoop, type HandCall, type HandLine, type HandSource, type LoopInput, type LoopStop } from "./loop.ts";
export { folderTexts, played, playFake, resolveFile, runFacts, runFake, whyOf, type FakePlay, type ResolvedFile, type Resumed, type RunInput } from "./run.ts";
export { RUN_RECORDS } from "./records.ts";
export { resumeRefused, resumeRun, type ResumeRunInput } from "./resume.ts";
export { ENV_NAMES, readEnv, setNames } from "./env.ts";
export { doctor, PLATFORM_LINE, runDoctor, type DoctorCheck, type DoctorInput } from "./doctor.ts";
export { online, ONLINE_BUDGET_USD, onlineFlags, type OnlineFlags } from "./doctor-online.ts";
export { badSet, liveFlags, loopFlags, paramsOf, readFlags, resumeFlags, seedOf, unknownWord, COMMANDS, FLAGS, helpOf, isCommand, usageOf, type CommandName, type Flags, type LiveFlags } from "./flags.ts";
export { confirmatoryAlone, runLive, type LiveInput, type LiveResult } from "./live.ts";
export { confirmatoryDirty, readSourceTree, type SourceTree } from "./tree.ts";
export { LEAK_FILE, scanFolder } from "./leak-scan.ts";
export { ledgerRefused, openLedger, type Ledger } from "./ledger.ts";
export { jsonFile, metricTable, report, REPORT_FILE, type ReportInput } from "./report.ts";
export { experimentAnalyse, experimentRun, type ExperimentInput } from "./experiment.ts";
export { replayDiffers, replayRun, type ReplayRunInput } from "./replay.ts";
export { scan } from "./scan.ts";
export { handLine, watched, type HandCount } from "./watch.ts";
export { ANALYSIS_FILES, analyseChess, depthOf, type ChessAnalysisInput } from "./chess.ts";
export { analyseSync, DEFAULT_DEPTH, ENGINE, engineFile, GARBOCHESS } from "./chess-engine.ts";
