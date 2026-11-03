# The story format: one schema, TypeScript or YAML

A story is pure data. It can be written in the TypeScript builder (`packages/sdk/src/define.ts`,
what `stories/cityofkeys` and `stories/whispers` do) or as a YAML or JSON file. Both produce the
same data and meet the same two checks: the story schema, then the cross-field rules of
`validateStory`. Design: [docs/ideas/monorepo.md](ideas/monorepo.md) §3a.

## Which to use

- **TypeScript** for stories that compute (loops over levels, shared constants), with compile-time
  tool names. A registered story lives in `stories/<name>/story.ts` with a README and an entry in
  `stories/index.ts`.
- **YAML or JSON** for a story that is just data: a variant, an experiment, a teaching example. Play
  it by path, no registration: `swt run --story path/to/story.yaml --provider scripted`. A YAML
  story is not part of the registry (and so not of `pnpm validate`); `swt story validate <file>`
  checks it.

`test/fixtures/stories/lantern-row.story.yaml` is a small, complete example.

## Editor support

`story.schema.json` at the repository root is the schema as JSON Schema. A YAML file that starts
with

```yaml
# yaml-language-server: $schema=../../story.schema.json
```

(a path relative to the file) gets completion, hover text and validation from the YAML extension of
VS Code and any editor with the YAML language server. `swt story show <name> --yaml` writes a
registered story in this form. After a change of the schema, regenerate the file:
`swt story schema`. A test fails when the committed file is out of date.

## The schema

`packages/contracts/src/story-schema.ts` holds one Typebox schema, `StorySchema`. Its static type
must fit `StoryDefinition`: `parseStoryData` in the sdk assigns one to the other, so an interface
change that the schema does not follow fails the build. `test/story/schema.test.ts` checks that every
registered story, as plain JSON, passes it.

Covered field by field: the run, models, rules (marks, blame, ultimatum, receipts, DM limit), levels
(puzzles, teams, tools), cast, personas, the director (triggers, conditions and actions, including
the recursive petitions and lotteries), acts, the gamemaker and the classifier.

**Limit.** The sections of single mechanics (`tribunal`, `names`, `coreMotives`, `goals`, `seal`,
`whisperer`, `popularity`, `guards`, `holdout`) are "open" in the schema: it says they are objects
and nothing more, so an editor offers no completion inside them. `validateStory` still checks their
content, but a misspelled key that it does not look at passes. Each mechanic is to add the schema of
its own options (it already has one for its `options`), and the story schema then refers to them.

## Loading

`parseStoryData(value)` (sdk) takes untrusted data and returns the story or a list of issues, schema
violations first (with the path, e.g. `/levels/0/reward: ...`), then the rules of `validateStory`.
`readStoryFile(path)` in `apps/cli/src/swt/story-file.ts` parses a `.yaml`, `.yml` or `.json` file and
calls it; a missing file, a syntax error or a duplicate key come back as issues, never as a crash.

The YAML parser is [`yaml`](https://github.com/eemeli/yaml) (one dependency of `apps/cli`, no
dependencies of its own, YAML 1.2, errors with line and column). It was already in the lockfile
through vite. js-yaml needs a separate types package and reads YAML 1.1, where `no` and `on` are
booleans, which is a trap in a story text.

The file is only the data: `swt run --story file.yaml` writes the serialized story into
`000-run.json` like any other run. Resuming a snapshot finds its story in the registry only.
