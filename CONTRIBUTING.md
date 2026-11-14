# Contributing

Read [`CLAUDE.md`](CLAUDE.md) for the rules of this repository. This page holds the terms under which a contribution
comes in.

## Licence of contributions

Swarm Tales is licensed under the Apache License 2.0, all of it: code, prompts, game texts, docs and run data. A
contribution comes in under the same licence (section 5 of the licence). There is no contributor licence agreement.

## Sign-off (Developer Certificate of Origin)

Every commit carries a `Signed-off-by` line with your name and e-mail address:

```
Signed-off-by: Ada Lovelace <ada@example.org>
```

`git commit -s` adds it. With the line you certify the Developer Certificate of Origin 1.1:

```
Developer Certificate of Origin
Version 1.1

Copyright (C) 2004, 2006 The Linux Foundation and its contributors.

Everyone is permitted to copy and distribute verbatim copies of this
license document, but changing it is not allowed.


Developer's Certificate of Origin 1.1

By making a contribution to this project, I certify that:

(a) The contribution was created in whole or in part by me and I
    have the right to submit it under the open source license
    indicated in the file; or

(b) The contribution is based upon previous work that, to the best
    of my knowledge, is covered under an appropriate open source
    license and I have the right under that license to submit that
    work with modifications, whether created in whole or in part
    by me, under the same open source license (unless I am
    permitted to submit under a different license), as indicated
    in the file; or

(c) The contribution was provided directly to me by some other
    person who certified (a), (b) or (c) and I have not modified
    it.

(d) I understand and agree that this project and the contribution
    are public and that a record of the contribution (including all
    personal information I submit with it, including my sign-off) is
    maintained indefinitely and may be redistributed consistent with
    this project or the open source license(s) involved.
```

`pnpm check:signoff` fails on a commit without the line, and on a commit whose author is not among its signers.

A contribution written with a model is welcome; the person who submits it signs off. The certificate is a
statement of a person, so the name of a program is no sign-off: a commit that only an agent or a bot identity
signed off fails the check. A commit that an agent session made keeps the agent's git identity and carries the
`Signed-off-by` line of the person who operates the session and answers for the contribution
(`git commit --trailer "Signed-off-by: Your Name <you@example.org>"`).

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
// SPDX-License-Identifier: Apache-2.0
```

Every `package.json` says `"license": "Apache-2.0"`.

## Before you open a pull request

- The change has an issue with "done when", "allowed paths" and "proving test".
- `pnpm check` is green.
- The pull request goes to `develop` and fills in the template.
