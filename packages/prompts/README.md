# @swarmtales/prompts

Prompt file loader and lookup (layer L2, see [`docs/LAYERS.md`](../../docs/LAYERS.md)).

- **The file format.** A prompt is a Markdown file with a small frontmatter (`id`, `variables`) and a body with
  `{{variable}}` placeholders, and nothing else: no conditions, no loops. `parsePromptFile` reads one, `renderBody`
  fills it and fails on a missing, an unknown or an undeclared variable.
- **The lookup.** `createPromptLookup` implements the `PromptLookup` of the contracts. For one owner (a mechanic
  id, or the kernel) and one prompt id it takes the first file it finds: the game's folder, the owner's `prompts/`
  folder, then `library/prompts/`. The file must declare exactly the variables its owner declared.
- **The library.** `library/prompts/replies/core/` holds the four replies of the kernel's tool pipeline
  (`unknown-tool`, `not-granted`, `locked`, `steps`), byte-identical to the old platform; `test/carried.test.ts`
  pins their sha256.

A fault is a `PromptError`, an `SwtError` with one issue whose summary names the file and what is wrong with it.
The package builds its codes itself (it may not import the sdk's catalogue):

| Code | Raised when |
|---|---|
| `SWT-P010` | no folder has a file for the prompt |
| `SWT-P011` | the frontmatter of a file is missing or malformed |
| `SWT-P012` | a file states another id than the one it was found under |
| `SWT-P013` | a file and the owner of the prompt declare different variables |
| `SWT-P014` | a prompt is rendered with a missing, an unknown or an undeclared variable |
| `SWT-P015` | no directory above the package holds `library/prompts/` |

Carried from `packages/prompts` of the old platform (tag `v0-final`): `file.ts`, `lookup.ts` and the folder
functions of `library.ts`, with their tests. The typed registry of prompt ids (`registry.ts`, `keys/`), the
functions over it (`render`, `text`, `loadPrompt`) and the library validation (`validate.ts`) list prompts of
parts that are not on this platform yet; they return with their first user.
