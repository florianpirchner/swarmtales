# Error codes

<!-- Written by `pnpm docs:errors` from the code catalogues of the packages; edit those, not this file. -->

Every load error and run error is an `SwtError` with a code, a summary, why and a fix, and it prints a link to the section of its code on this page. A refused tool call is a tool outcome with its own mnemonic code, and is not listed here. A code is never reused or renumbered. A part in braces, such as `{tool}`, is filled in by the case that raises the code.

## G: Game

### SWT-G001

The game does not match schema version 1.

- **Why:** A game must match the game definition format, version 1, and may hold no field the format does not know.
- **Fix:** Correct the field; `GameDefinitionSchema` of `@swarmtales/contracts` describes every field of the format.
- **Named in:** `packages/sdk`

### SWT-G002

`schema` is not 1.

- **Why:** This version of the platform reads games of schema version 1 only.
- **Fix:** Set `schema: 1`, or play the game with the platform version it was written for.
- **Named in:** `packages/sdk`

### SWT-G003

`directors` is not empty before milestone M3. Game resolution no longer raises it; the code stays, because a code is never reused.

- **Why:** The field `directors` is reserved: this version of the platform cannot run a Director.
- **Fix:** Remove the entries of `directors`, or leave the field out.
- **Named in:** `packages/sdk`

### SWT-G010

A resident id is doubled or malformed.

- **Why:** A resident id holds only letters, digits, `_`, `.` and `-`, and at least one of them.
- **Fix:** Rename the resident, for example `A01`; or give `residents` as a count to get `A01`, `A02`, ...
- **Named in:** `packages/sdk`

### SWT-G011

A team or a role names an id that is not a resident.

- **Why:** A {kind} holds residents of the game only. The game's residents are: {residents}.
- **Fix:** Add "{id}" to `residents`, or remove it from the {kind}.
- **Named in:** `packages/sdk`

### SWT-G012

A tool is granted or locked but not defined.

- **Why:** A key of `as` is the bare name of a tool of that mechanic, which defines: {defined}.
- **Fix:** Remove "{tool}" from `as`.
- **Named in:** `packages/sdk`

### SWT-G013

Two tools of one grant share a shown name.

- **Why:** A caller names a tool by its shown name, so within one grant a shown name stands for one tool.
- **Fix:** Rename one of them in the game with `as` on its mechanic, for example `as: { "{shown}": "{shown}2" }`, or drop one from the grant.
- **Named in:** `packages/sdk`

### SWT-G014

A shown tool name does not match the pattern.

- **Why:** A shown tool name matches {TOOL_NAME_PATTERN}: model providers accept nothing else.
- **Fix:** Give the tool a name of 1 to 64 letters, digits, `_` or `-`, with `as` on its mechanic in the game or in the mechanic itself.
- **Named in:** `packages/sdk`

### SWT-G015

A mechanic stages a tool that the game does not grant to `script`, or the grant `script` holds a tool with a review.

- **Why:** A staged call is made as the actor `script` and passes the whole pipeline, so the game must grant `script` every tool its mechanics stage.
- **Fix:** Add "{tool}" to `grants.script`, or give the tool `for: ["script"]` in its head.
- **Named in:** `packages/sdk`

### SWT-G020

An option does not match its schema.

- **Why:** The options of a {kind} must match the schema it declares, and may hold no field the schema does not know.
- **Fix:** Correct the option; the README of the {kind}'s package lists every option with its default.
- **Named in:** `packages/sdk`

### SWT-G021

A mechanic is listed twice.

- **Why:** A game loads a mechanic once: its id names its state, its events and its tools.
- **Fix:** Remove one of the two entries of `mechanics`.
- **Named in:** `packages/sdk`

### SWT-G022

A data game names a mechanic that is not installed.

- **Why:** A game file names a mechanic by its id, and the id is looked up among the installed mechanic packages: {installed}.
- **Fix:** Install the package that holds "{mechanic}".
- **Named in:** `packages/sdk`

### SWT-G030

A required service has no provider.

- **Why:** A mechanic runs only when every service it requires is provided by a mechanic of the same game.
- **Fix:** Add a mechanic that provides "{service}" to `mechanics`, or remove "{mechanic}".
- **Named in:** `packages/sdk`

### SWT-G031

A service has two providers.

- **Why:** A service has one provider in a game, so a call of it has one answer.
- **Fix:** Keep one of {providers} in `mechanics` and remove the rest.
- **Named in:** `packages/sdk`

### SWT-G032

`requires` form a cycle.

- **Why:** A mechanic loads after the providers of the services it requires, so no chain of `requires` may lead back to its start.
- **Fix:** In one of these mechanics, move the service from `requires` to `uses` and call it with `ctx.tryCall`, or react to an event of the other mechanic.
- **Named in:** `packages/sdk`

### SWT-G041

An override (`--set`, an arm of an experiment) names no param of the game, or its value has the wrong type.

- **Why:** Only a game family (`defineGameFamily`) has params; a plain game or a data game is played as it is written.
- **Fix:** Remove the override of "{name}", or export the game as a family that declares the param.
- **Named in:** `packages/sdk`

## M: Mechanic

### SWT-M010

An event type is reserved by the kernel or declared twice.

- **Why:** An event type has one owner in a game, so a reader of the log knows who wrote an event.
- **Fix:** Rename the event in the head of "{mechanic}", or remove one of the two mechanics from the game.
- **Named in:** `packages/sdk`

### SWT-M011

The head's `package` is not the package's name.

- **Why:** The head's `package` is part of every canonical tool name and event source, so it must be the name in the package's `package.json`.
- **Fix:** Set `package: "{actual}"` in the head of "{mechanic}".
- **Named in:** `packages/sdk`

### SWT-M012

The body of a mechanic does not fit its head. The types refuse it in an object literal; a spread or plain JavaScript gets past them, so `defineMechanic` checks it again.

- **Why:** The head is read without running a handler, so the body must hold exactly the tools and services the head declares.
- **Fix:** Declare "{name}" in the head's `provides`, or remove it from the body's `services`.
- **Named in:** `packages/sdk`

### SWT-M013

The `options` schema of a mechanic is no object schema (erratum E32, item 5).

- **Why:** A game gives a mechanic its options by name, so the schema of the options is an object with one property per option.
- **Fix:** Declare `options: Type.Object({ ... })` in the head of "{mechanic}", or leave `options` out.
- **Named in:** `packages/sdk`

### SWT-M014

A mechanic keeps state that cannot be started or saved.

- **Why:** A run must stop and resume at any tick, so every state has a schema it is saved under and a function that builds it for a fresh run.
- **Fix:** Declare `state` as a schema in the head of "{mechanic}"; for a state that is not plain JSON, add `snapshot: { save, load }` beside it.
- **Named in:** `packages/sdk`

### SWT-M021

An emitted payload does not match its schema.

- **Why:** An event's payload must match the schema the head declares for it, so every reader of the log can rely on it.
- **Fix:** Correct the `ctx.emit("{type}", ...)` call, or the schema of "{type}" in the head's `events`.
- **Named in:** `packages/sdk`

### SWT-M022

A service input or output does not match its schema.

- **Why:** A service call must match the {side} schema of its method in the service contract.
- **Fix:** Correct the implementation in "{provider}", or the {side} schema of "{method}" in the contract of "{service}".
- **Named in:** `packages/sdk`

### SWT-M023

The value of a fact does not match its schema.

- **Why:** A fact's value must match its `output` schema, so the result line and every reader outside the run can rely on it.
- **Fix:** Correct `compute` of the fact "{fact}" in the body of "{mechanic}", or its `output` schema.
- **Named in:** `packages/sdk`

### SWT-M024

A snapshot slice cannot be saved or loaded. The kernel reports a failed load as `SWT-R002` with this issue as its cause.

- **Why:** A slice is saved and loaded in the form of the head's `state` schema, at a version the head knows.
- **Fix:** Correct `state`, `snapshot`, `version` or `migrations` in the head of "{mechanic}", or resume from a snapshot this version of the mechanic wrote.
- **Named in:** `packages/sdk`

### SWT-M025

A fact or a run limit calls a command of a service. The type of the view refuses it; a cast or plain JavaScript gets past the type, so the view checks it again and the command is not called.

- **Why:** A fact and a run limit only read: they are computed at any moment and any number of times, so they call the `query` methods of a service and never a command.
- **Fix:** Call a query of "{service}" in the fact or the run limit of "{mechanic}", or move the call of "{method}" into a tool, a hook or a listener.
- **Named in:** `packages/sdk`

## D: Director

### SWT-D001

A Director's trigger names an event that no mechanic of the game declares.

- **Why:** The mechanics of the game declare: {declared}.
- **Fix:** Add the mechanic that declares the event, or remove the Director.
- **Named in:** `packages/sdk`

### SWT-D002

The name of a Director is taken, or its `use` names no definition.

- **Why:** The Director definitions of this run are: {known}.
- **Fix:** Put the definition itself into `use`, or pass it to game resolution in `directors`. A data game (a YAML or JSON file) cannot carry a Director definition yet, and `swt` passes none: write a game with a Director in the builder form.
- **Named in:** `packages/sdk`

### SWT-D003

The game has a Director and its scheduler activates no actor of kind `director`.

- **Why:** A Director acts only inside an activation, and a scheduler activates the actor kinds its options name.
- **Fix:** Name the kind in the scheduler options, for `turns`: `afterBlocks: ["director"]`.
- **Named in:** `packages/sdk`

### SWT-D004

A review of a mechanic names an answerer that no Director of the game answers.

- **Why:** A review asks a Director whose head says `answers: "{answerer}"`; the Directors of the game answer: {answered}.
- **Fix:** Add the Director that answers "{answerer}" to `directors`.
- **Named in:** `packages/sdk`

## R: Run and kernel

### SWT-R001

The kernel is used after it failed. The first failure is the `cause` of the error.

- **Why:** A run that failed is closed: its log ends with `run_ended` and takes no more events.
- **Fix:** Solve the first failure (the cause of this error) and create a new kernel.
- **Named in:** `packages/kernel`

### SWT-R002

The definition and what was loaded from it, or a snapshot and the definition, do not fit.

- **Why:** A kernel runs only a definition whose parts fit each other, and resumes only a snapshot taken from it.
- **Fix:** The fix depends on what does not fit; the summary of the error names it.
- **Named in:** `packages/kernel`

### SWT-R003

Plugin code threw, at load or in a run.

- **Why:** The kernel cannot tell what a throw left half done, so it ends the run.
- **Fix:** Read the cause and correct the plugin "{plugin}"; a call it wants to decline is answered with a refusal, not with a throw.
- **Named in:** `packages/kernel`

### SWT-R010

The order of pass {passNumber} is not a permutation of the actors who may act.

- **Why:** A pass activates every actor who may act at most once.
- **Fix:** Fix the order of the scheduler.
- **Named in:** `packages/engine`

### SWT-R011

The actor {id} has no driver in the run manifest.

- **Why:** Every actor needs a driver, by its id or by its kind, and the manifest names it.
- **Fix:** Add a driver id for "{id}" or for the kind "{kind}" to the drivers of the run.
- **Named in:** `packages/engine`, `samples/own-scheduler`

### SWT-R013

Two plugins have a `toAct` hook.

- **Why:** One plugin at most says who is to act now.
- **Fix:** Load only one of them, or remove the hook from the others.
- **Named in:** `packages/kernel`

### SWT-R014

The activation is toAct, but no loaded plugin names who is to act.

- **Why:** With the activation toAct, one plugin's toAct hook says who is woken.
- **Fix:** Load a mechanic with a toAct hook, or set the activation to always or onNews.
- **Named in:** `packages/engine`, `samples/own-scheduler`

### SWT-R015

`kernel.fact` of a key no loaded plugin has.

- **Why:** A fact is named `<plugin id>.<fact>` and is computed by the plugin that declares it.
- **Fix:** Did you mean "{key}"?
- **Named in:** `packages/kernel`

### SWT-R016

The `after` relations of one hook, or of the listeners of one event, form a cycle.

- **Why:** A registration runs after those of the plugins its `after` names, so one of them must be able to run first.
- **Fix:** Remove one `after` entry of the cycle.
- **Named in:** `packages/kernel`

### SWT-R017

A record of a source or a type that is not declared, or at a moment that takes none.

- **Why:** A record is an event of a source the definition declares (`records`), written inside an activation or between two ticks of a started run.
- **Fix:** Declare the source and the type in `records` of the definition, and record only while the activation is open, or after `start()` between two ticks.
- **Named in:** `packages/kernel`

### SWT-R020

A sink threw while it took an event or was closed.

- **Why:** A run whose events are not all written cannot be verified, so the kernel ends it.
- **Fix:** Read the cause and correct the sink, or free what it writes to.
- **Named in:** `packages/kernel`

### SWT-R021

A snapshot that fits the definition names a moment, a plugin or a tool the run does not have.

- **Why:** A resumed run goes on from where the log ends, with the plugins and tools that the snapshot's suspensions and locks name.
- **Fix:** Resume with the snapshot as it was written and the log up to it; a snapshot changed by hand is not resumed.
- **Named in:** `packages/kernel`

## X: Models

### SWT-X001

No key is held for a provider.

- **Why:** A live request needs the provider's key, and a key is read from the environment only.
- **Fix:** Set {variables} in the environment of the command; a key is never typed into a chat or a prompt.
- **Named in:** `packages/models`

### SWT-X002

A provider that does not exist.

- **Why:** A model is asked through one of the provider adapters.
- **Fix:** Use one of: {value}.
- **Named in:** `packages/models`

### SWT-X003

The model does not exist at the provider.

- **Why:** A request is sent only to a model of the provider's table, because the price of a token is read from it.
- **Fix:** Use one of: {value}.
- **Named in:** `packages/models`

### SWT-X004

An empty model id.

- **Why:** A request names its model.
- **Fix:** Give a model id or an alias of the models package.
- **Named in:** `packages/models`

### SWT-X005

A live run without a cost cap.

- **Why:** A cap that code holds is the precondition of every live request.
- **Fix:** Give the run a cap above zero, in USD.
- **Named in:** `packages/models`

### SWT-X006

A key value shorter than 16 characters.

- **Why:** A value that short cannot be told from ordinary text when a line is redacted.
- **Fix:** Set {variable} to the whole key, or remove the variable.
- **Named in:** `packages/models`

### SWT-X007

The price table has no price above zero for the model.

- **Why:** The cost cap counts what the price table says; with a price of zero no cap is ever reached.
- **Fix:** Use a model that has a price in the table.
- **Named in:** `packages/models`

### SWT-X008

The Human Hand cannot be used: the game has no actor `human`, or a line of `--hand` is no line of the Human Hand or names a tool the grant `human` does not hold.

- **Why:** A line of the Human Hand is JSON: `{"at": <finished ticks>, "tool": "<name>", "params": {...}}` for a tool of the grant `human`, or `{"at": <finished ticks>, "command": "snapshot"}`; a game has the actor `human` when its grant `human` holds a tool.
- **Fix:** Write every line in one of the two forms, with a tool the game grants to `human` (the mechanic `humanHand` brings `pause` and `resume`); the format is in docs/reference/cli.md, "The hand file".
- **Named in:** `apps/cli`

### SWT-X009

The run is paused and the input of the Human Hand has ended; the run stopped with a snapshot.

- **Why:** A paused run plays no tick until the Human Hand calls `resume`, and no line is left that could.
- **Fix:** Resume with the hand file of the stopped run plus a `resume` line: add the line to the end of that file and give the whole file to `swt resume --hand`. A resumed run drops the first N tool lines of its hand file, N being the calls the human made before the snapshot, so a file that holds only the `resume` line is dropped whole and the run stops here again (docs/reference/cli.md, "The hand file").
- **Named in:** `apps/cli`

### SWT-X030

A held key value occurs in files of a run folder.

- **Why:** No artefact of a run may hold a key.
- **Fix:** Do not publish the run folder; replace the key at the provider, then report the leak as a defect of the redaction.
- **Named in:** `apps/cli`, `packages/lab`, `packages/models`

### SWT-X040

A record payload of the driver does not match its schema.

- **Why:** A record is checked by its writer, because the log is read by its schemas.
- **Fix:** Correct the driver, or the schema in `records.ts` in the same change.
- **Named in:** `packages/models`

### SWT-X041

A tool call of a model reached its session while no activation was open.

- **Why:** A driver calls only through its open activation; a call after the activation closed would be written with a closed cause.
- **Fix:** Await the model request with all its tool calls before the driver returns.
- **Named in:** `packages/models`

### SWT-X042

A saved session cannot be loaded: it does not match its schema, or it does not fit the session it is loaded into.

- **Why:** A resumed session asks its model what the straight run would have asked, so its conversation and its declared tools must be the ones the snapshot saved, for the game that saved them.
- **Fix:** Resume from a snapshot file as the run wrote it, with the game of that run.
- **Named in:** `packages/models`

## P: Texts

### SWT-P003

A declared prompt has no text.

- **Why:** Every text a model may read is known before the run starts. Looked in: {value}.
- **Fix:** Create `{lookedIn}`, or give the tool's `description` as the text itself.
- **Named in:** `packages/sdk`

### SWT-P010

No folder has a file for the prompt.

- **Why:** Every prompt a plugin declares needs a text file.
- **Fix:** Add {id}.md to the prompts folder of {owner}, of the game or of the library.
- **Named in:** `packages/prompts`, `packages/sdk`

### SWT-P011

The frontmatter of a prompt file is missing or malformed.

- **Why:** A prompt file starts with a frontmatter that holds `id` and `variables`.
- **Fix:** Write `---`, `id: <path without .md>`, `variables: <names, separated by commas>` and `---` above the text.
- **Named in:** `packages/prompts`

### SWT-P012

A prompt file states another id than the one it was found under.

- **Why:** A prompt file states its own id: its path under the prompts folder, without `.md`.
- **Fix:** Set the id to "{expected}", or move the file.
- **Named in:** `packages/prompts`

### SWT-P013

A prompt file and the owner of the prompt declare different variables.

- **Why:** A prompt file declares exactly the variables its owner declares.
- **Fix:** Make the `variables` line of the file and the declaration of the owner the same.
- **Named in:** `packages/prompts`

### SWT-P014

A prompt is rendered with a missing, an unknown or an undeclared variable.

- **Why:** A prompt is rendered with a value for exactly the variables it declares.
- **Fix:** Pass a value for every declared variable and for no other, and declare every variable the text uses.
- **Named in:** `packages/prompts`

### SWT-P015

No directory above the package holds `library/prompts/`.

- **Why:** The prompt library is the last place a prompt is looked up in.
- **Fix:** Run from a checkout or from an installed package that carries `library/prompts/`.
- **Named in:** `packages/prompts`

## L: Log and chain

### SWT-L001

{EVENTS_FILE} is missing.

- **Why:** Every line of the log is chained to the line before it by its hash, so a changed, deleted, inserted or moved line shows.
- **Fix:** Restore the run folder from a copy that was not changed; a log that does not verify is no evidence.
- **Named in:** `packages/runlog`, `packages/viewer-core`

### SWT-L002

A head is not signed, or no head covers the tail of the log.

- **Why:** A head signed with the run's key covers every line of the log.
- **Fix:** Check that run.pub is the key of this run. A run that crashed has no signed end: play it again.
- **Named in:** `packages/runlog`

### SWT-L003

A manifest that a caller built past the type (a cast, plain JavaScript, a value out of a range).

- **Why:** A run folder is opened with a manifest that matches the run manifest format, so the run can be verified and compared later.
- **Fix:** Build the manifest with the manifest builder of the engine, and correct the field that is named.
- **Named in:** `packages/runlog`

### SWT-L004

Line {index}{value} is not a stored envelope.

- **Why:** Every line of events.jsonl is one stored envelope: an event of the log with the time it was written at.
- **Fix:** Restore the run folder from a copy that was not changed; a log that does not verify is no evidence.
- **Named in:** `packages/runlog`

### SWT-L005

Line {line}: {reason}.

- **Why:** In a log, seq is the line number, tick never falls, and causedBy and basis are smaller than seq.
- **Fix:** The writer of the log broke the order: report it with the run folder.
- **Named in:** `packages/runlog`

### SWT-L006

A file that is written once and would hold a secret; it names the place, never the value.

- **Why:** The manifest, the game and the texts of a run folder are written once and named by hash in the signed chain, so a secret in them cannot be taken out later.
- **Fix:** Take the value out of the game's parameters, options or texts; a key comes from the environment only.
- **Named in:** `packages/runlog`

### SWT-L007

The folder of the previous run, {previous}, cannot be read: {summary}.

- **Why:** A resumed run chains from a head the previous run signed, repeats the previous log up to that head and marks the resume in the next line, so nothing can be put between the two runs.
- **Fix:** Name the folder of the run the snapshot was taken from, unchanged, and resume again from one of its snapshot files.
- **Named in:** `packages/runlog`

### SWT-L008

{directory} is not a snapshot to resume from: {value}.

- **Why:** A run resumes only from a snapshot file whose state is the one its signed checkpoint names, taken from the run and the game that are resumed.
- **Fix:** Use a file of the folder `snapshots` of the run to resume, as the run wrote it.
- **Named in:** `packages/runlog`

## C: Command line

### SWT-C001

The game file was not found.

- **Why:** `swt run` plays the game of one file, and the path is read from the current directory.
- **Fix:** Correct the path, or change to the directory the path starts from.
- **Named in:** `apps/cli`

### SWT-C002

The file is of a type that holds no game, or its content is no game.

- **Why:** A game file is a module that default-exports a game ({value}), or a game in its data form ({value}, {value}).
- **Fix:** Default-export the result of `defineGame` from a module, or write the fields of the game as one JSON or YAML object.
- **Named in:** `apps/cli`

### SWT-C003

The command line cannot be read: an unknown command or flag, a missing argument, a bad flag value.

- **Why:** The commands are `swt run <game file>` (with `--fake`, or with `--budget <usd>` for a live run; `--hand <file>` and `--snapshot-at <ticks>` for the Human Hand and snapshots), `swt resume <run dir> --game <game file>` (with `--snapshot <file>`, `--ticks <n>`, `--out <dir>`, `--hand` and `--snapshot-at`), `swt log verify <run dir> [--previous <run dir>]`, `swt report <run dir> [--game <game file>]`, `swt replay <run dir> --game <game file>`, `swt scan <folder>`, `swt experiment run <spec file> [--out dir] [--ledger file]` and `swt experiment analyse <experiment dir>`; a seed is a whole number from 0 to 4294967295.
- **Fix:** Write the command in one of these forms; `swt --help` lists the commands, and `swt <command> --help` the flags and the exit codes of one.
- **Named in:** `apps/cli`

### SWT-C010

The fake driver cannot call a granted tool, because the tool has no `sample`.

- **Why:** The fake driver plays seeded legal calls from the `sample` function of each tool; the run still plays without the tool.
- **Fix:** Give the tool a `sample` in the body of its mechanic.
- **Named in:** `apps/cli`

### SWT-C020

A run with live models was asked for.

- **Why:** At milestone M1 the command line plays a game with the fake driver only; model drivers arrive with M2.
- **Fix:** Add `--fake` to the command.
- **Named in:** `apps/cli`

### SWT-C021

A `--set` that is not `name=json`.

- **Why:** `--set` overrides one param of a game family, and the value is read as JSON so that a number, a boolean and a string stay apart.
- **Fix:** Write `--set name=value` with a JSON value: `--set games=2`, `--set brain=false`, `--set label='"a"'`.
- **Named in:** `apps/cli`

### SWT-C022

A `--purpose` or a `--thinking` that is none of the known words.

- **Why:** The value goes into the run manifest, which holds a fixed set of words.
- **Fix:** Use one of: {value}.
- **Named in:** `apps/cli`

### SWT-C023

A confirmatory run outside an experiment. On a tree that is not clean it is `confirmatoryDirty`.

- **Why:** A confirmatory run is pooled with the other runs of its plan, and the plan is the committed specification of an experiment.
- **Fix:** Run it through `swt experiment run`, or use `--purpose pilot` or `exploratory` for a single run.
- **Named in:** `apps/cli`

### SWT-C024

An experiment file is not there: the spec file, or the state file of an experiment's folder.

- **Why:** `swt experiment run` reads the spec file of an experiment, and `swt experiment analyse` the folder that `swt experiment run` wrote.
- **Fix:** Give the path of a spec file (for example `games/quarry/experiments/open-quarries.json`), or the folder that holds `experiment.json`.
- **Named in:** `apps/cli`

### SWT-C025

The spend ledger is unreadable, or the run's cap does not fit under the ledger's cap.

- **Why:** With `--ledger` a live run starts only when the costs of the runs before it, the caps of the runs that have no cost line yet and its own cap fit under the ledger's cap. A run that crashed keeps its whole cap.
- **Fix:** Use a smaller `--budget`, or have the owner raise `capUsd` in the first line. A line that cannot be read is repaired by hand.
- **Named in:** `apps/cli`

### SWT-C026

A `--director-model` names no Director of the game.

- **Why:** The flag replaces the model of one Director of this game for the run (decision A52); a name of no Director would replace nothing.
- **Fix:** Name one of the game's Directors: {value}.
- **Named in:** `apps/cli`

### SWT-C030

The installed table cannot be built.

- **Why:** A game in its data form names its mechanics by id; the ids come from the `swarmtales.mechanics` field of the installed packages, each entry the name of an export that is a mechanic definition.
- **Fix:** Install the dependencies again; in a mechanic package, list in `swarmtales.mechanics` only exports made with `defineMechanic`, and give every mechanic its own id.
- **Named in:** `apps/cli`

### SWT-C031

The replayed log of a run folder differs from its log.

- **Why:** A replay repeats the tool calls and the records of a log; with the game of the run and the code of the run every other line comes out the same.
- **Fix:** The game file is the run's, so a mechanic, the scheduler or the kernel changed since the run: replay with the commit the manifest names (`kernel.commit`).
- **Named in:** `apps/cli`

## E: Experiments and the lab

### SWT-E001

An experiment spec, a noise-floor file or a results file does not match its schema.

- **Why:** A file of the lab has exactly the fields of its schema; an unknown key is an error, never ignored.
- **Fix:** Correct the named field, or remove a key the schema does not have.
- **Named in:** `packages/lab`

### SWT-E002

An arm overrides a param the game family does not declare.

- **Why:** An arm is a diff of the typed params of a game family.
- **Fix:** Use one of [{value}], or add the param to the game family.
- **Named in:** `packages/lab`

### SWT-E003

The estimated cost of the plan is above the experiment's cap.

- **Why:** An experiment does not start when its estimate does not fit under `budget.totalUsd`.
- **Fix:** Plan fewer runs, or raise the cap with the owner's go.
- **Named in:** `packages/lab`

### SWT-E004

The experiment's cap was reached between two runs.

- **Why:** A run starts only when its whole cap fits under the cap of the experiment; no run is stopped half way for it.
- **Fix:** Read the state file; the experiment continues with the same plan under a cap the owner approves.
- **Named in:** `apps/cli`, `packages/lab`

### SWT-E005

Two runs of one experiment do not compare.

- **Why:** Runs are pooled only when kernel, scheduler, model, pricing and tool texts are the same.
- **Fix:** Play the series with one checkout and one model id; do not pool the two runs.
- **Named in:** `packages/lab`

### SWT-E006

A run folder is unfinished, unverified or belongs to another experiment.

- **Why:** Facts are read only from a finished run whose log verifies and whose manifest names this experiment.
- **Fix:** Verify the folder with `swt verify`; leave a broken run out, with its record kept.
- **Named in:** `packages/lab`

### SWT-E007

The experiment stops, because three runs in a row were excluded or failed, or a run reported a leak.

- **Why:** A systematic fault costs three runs, not the series; a leak stops at once.
- **Fix:** Find the cause in the run folders that were kept before any further run.
- **Named in:** `apps/cli`, `packages/lab`

### SWT-E008

The reference engine cannot measure: its file changed or is missing, or it refused a position or a depth.

- **Why:** The engine is a measuring instrument: only the pinned file, a legal position and a depth from 1 to 64 give numbers that compare with the baseline.
- **Fix:** Restore third_party/garbochess/garbochess.js from the repository, and analyse only the positions of a chess run at a depth from 1 to 64.
- **Named in:** `apps/cli`

### SWT-E010

A metric of the spec is exported by no loaded mechanic.

- **Why:** A metric of a spec is a generic key of the lab or "<plugin id>.<metric id>" of a mechanic of the game.
- **Fix:** Use one of [{value}].
- **Named in:** `packages/lab`

### SWT-E011

The analysis is asked for before every planned run has a status.

- **Why:** An estimate is computed once, over the whole plan; nobody looks at half a series.
- **Fix:** Finish the experiment with `swt experiment run`, then analyse it.
- **Named in:** `packages/lab`

## T: Testkit

### SWT-T001

The oracle file {what}.

- **Why:** An oracle file is version 1 of `swarmtales.oracle` (oracles/README.md), and its counts are a checksum of its timeline.
- **Fix:** Take the file from `oracles/` unchanged, or export it again from the tag `v0-final`.
- **Named in:** `packages/testkit`

### SWT-T002

The oracle `{variant}` with the seed {seed} {oracle}.

- **Why:** The oracle runner of M1 replays the calls of residents under the seeded order of `turns` in one run from start to end.
- **Fix:** Compare this file once the game that needs it is ported; the oracle runner is extended in that issue.
- **Named in:** `packages/testkit`

### SWT-T003

The replayed log differs at line {at}: the log has {expected}, the replay wrote {got}.

- **Why:** A replay repeats the calls and the records of a log; with the same game and the same code every other line comes out the same.
- **Fix:** Compare `firstDifference.expected` with `firstDifference.got`: the game, a mechanic or the kernel changed since the run, or the log was edited.
- **Named in:** `packages/testkit`

### SWT-T004

Line {seq} of the log ({source} {type} of {actor}) is an input outside an activation inside tick {tick}.

- **Why:** A replay makes a call inside the activation it belongs to or between two ticks; an input from outside in the middle of a tick has no place it can be repeated at.
- **Fix:** Replay a run whose calls from outside were made between ticks (the Human Hand, a script); input inside a tick is not replayable at M3.
- **Named in:** `packages/testkit`

### SWT-T005

A log that stops inside a tick: it has no `run_ended`, and a tick started after the last one that ended.

- **Why:** The run crashed or was cut off in the middle of a tick. A replay plays whole ticks, so the lines of the open tick cannot be compared; a run that stopped between two ticks (paused, or stopped by `--ticks`) is replayable.
- **Fix:** Replay the run it was resumed from or a run that ended; `swt log verify` says whether the lines that are there hold.
- **Named in:** `apps/cli`, `packages/testkit`
