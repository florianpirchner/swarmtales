<!-- Pull requests go to `develop`. One issue, one pull request, at most 400 hand-written lines. -->

Closes #

## What changed

## Variable changed

<!-- One of: none, kernel, frame, prompts. For a port: prompt texts and tool names byte-identical: yes or no. -->

## Check

<!-- Paste the summary table that `pnpm check` prints. While the workflow is not a required check, this is the record. -->

## Record (for `docs/ISSUE-RECORD.md`)

| Tokens in | Tokens out | Cache read | Cache write | Wall time | Changed lines (source + tests) |
|---|---|---|---|---|---|
| | | | | | |

## Licence and sign-off

- [ ] Contains no code or text copied from a source under a licence outside the allowlist.
- [ ] I agree to the CLA in CONTRIBUTING.md (the first pull request of each contributor says so).
- [ ] Every commit is signed off by a person (`git commit -s`; in an agent session the line of the person who operates it).
- [ ] No new dependency, or the issue names its licence and `THIRD-PARTY-LICENSES.md` is regenerated.

## Review

- [ ] A challenger in a separate session, who saw only the specification and the result, reviewed this change.
- [ ] The row for this issue is added to `docs/ISSUE-RECORD.md`.

## API checklist

Fill this in when the pull request changes a public export, a command, an error text, a file format, a template or
a sample (the diff shows it in a `*.api.md` report). Otherwise write "no public surface changed" and delete the list.

1. [ ] The tutorial sentence that introduces it can be written first, in plain words.
2. [ ] There is exactly one way to do this; the pull request says what it replaces.
3. [ ] The editor completes every name the user must type; no bare `string` where a reference fits.
4. [ ] Every wrong use is an error at the earliest point (editor, check, load), with a type test per misuse.
5. [ ] Each new error has a code, a fix line and a catalogue page.
6. [ ] TSDoc with `@param`, `@returns`, `@throws` and an `@example` that compiles; Typebox schemas carry descriptions.
7. [ ] Defaults make the small case small; the smallest correct use is stated in lines.
8. [ ] The name matches `docs/GLOSSARY.md`; no new synonym.
9. [ ] It works with the fake model, in `play()`, and in YAML or JSON form (or is marked code-only).
10. [ ] It is serialisable into the run header, so a run records what was configured.
11. [ ] The hover type fits in a few lines.
12. [ ] A sample or how-to shows it, that code is tested, and the samples' type-check time stayed inside the budget.
