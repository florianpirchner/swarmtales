# Contributing

Read [`CLAUDE.md`](CLAUDE.md) for the rules of this repository. This page holds the terms under which a contribution
comes in.

## Licence of contributions

Swarm Tales is licensed under the Sustainable Use License 1.0 with Additional Terms, all of it: code, prompts, game
texts, docs and run data (see [`LICENSE`](LICENSE) and [`LICENSE-FAQ.md`](LICENSE-FAQ.md)). It is source-available,
not open source.

## Contributor license agreement

By opening a pull request you confirm that you wrote the contribution, or have the right to submit it, and
you grant the licensor (Florian Pirchner) a perpetual, worldwide, non-exclusive, royalty-free,
irrevocable license to use, modify, sublicense and relicense the contribution under any terms, including
commercial licenses. You keep the copyright in your contribution.

State "I agree to the CLA in CONTRIBUTING.md" in your first pull request. Pull requests without it are not
merged.

## Sign-off

Every commit carries a `Signed-off-by` line with your name and e-mail address:

```
Signed-off-by: Ada Lovelace <ada@example.org>
```

`git commit -s` adds it. The line records the person who is responsible for the commit; it is not a Developer
Certificate of Origin, because the agreement above holds the terms of a contribution. `pnpm check:signoff` fails on
a commit without the line, and on a commit whose author is not among its signers.

A contribution written with a model is welcome; the person who submits it signs off. The name of a program is no
sign-off: a commit that only an agent or a bot identity signed off fails the check. A commit that an agent session
made keeps the agent's git identity and carries the `Signed-off-by` line of the person who operates the session and
answers for the contribution (`git commit --trailer "Signed-off-by: Your Name <you@example.org>"`).

## No copyleft, ever

No GPL and no other copyleft licence anywhere: not in a dependency (production, development, optional, peer or
transitive), not in a tool, not in a copied file, not in data. The rule and the allowlist are in
[`docs/LICENCE-POLICY.md`](docs/LICENCE-POLICY.md); `pnpm check:licences` enforces them.

- **A new dependency needs an issue that names its licence.** The lockfile changes only in a pull request with that
  issue. Versions are exact.
- **A copied file** goes under `third_party/<name>/` with the licence text of its source and a row in
  `third_party/manifest.json`.
- A pull request states that it "contains no code or text copied from a source under a licence outside the
  allowlist".

## SPDX header

Every source file (`.ts`, `.tsx`, `.js`, `.mjs`, `.cjs`) starts with this line, and nothing else about the licence:

```ts
// SPDX-License-Identifier: LicenseRef-SUL-1.0
```

Every `package.json` says `"license": "LicenseRef-SUL-1.0"`.

## Before you open a pull request

- The change has an issue with "done when", "allowed paths" and "proving test".
- `pnpm check` is green.
- The pull request goes to `develop` and fills in the template.
- Your first pull request states "I agree to the CLA in CONTRIBUTING.md".
