# Idea: Swarm Tales as a web platform

Status: idea only (2026-10-28). Nothing is built. Revisit once swarmtales.dev is online.

## The idea

A React web app on swarmtales.dev. People sign in with Google or GitHub, write their own stories,
run their own swarms, and read the tales their runs produce. Each user brings their own model key
(BYOK, starting with OpenRouter), so the model calls run on their account.

## What it costs us

With BYOK the biggest cost, the model calls, is paid by each user. What remains:

| Item | Why it is small | Rough cost |
|---|---|---|
| Run workers | A run lasts 30-60 minutes but mostly waits on the model; it fits a background job on a small queue (Fly.io, or Cloudflare Workers with Durable Objects) | cents per run |
| Storage | Event logs, digests and reports are a few MB per run; object storage (R2, S3) | near zero |
| Sign-in | Google and GitHub via Auth.js or Clerk's free tier | free at first |

For a few hundred active users, about 20-50 USD a month.

## How to fund it

The options combine:

1. **Free tier with limits:** BYOK, for example 6-24 agents and 2 concurrent runs. GitHub Sponsors
   or Ko-fi cover the hosting.
2. **Pro tier (about 5-10 USD a month):** large swarms (96+), longer runs, private stories,
   snapshots and continuations.
3. **The novella as the paid feature:** the chronicler and the novelist run on our key, with a
   margin. "Turn my run into a story" is the magic of the product, and people pay for that rather
   than for infrastructure.
4. **Reach before revenue:** a public gallery of the best tales, a newsletter or a book. An
   audience brings sponsors. We could apply for research or showcase credits with model providers;
   whether they fund this is unknown.

## Technical notes

- **Keys:** OpenRouter supports an OAuth flow (PKCE). The user connects their account and we
  never store a raw key. Much safer than a key field. Any stored secret is encrypted at rest and
  never logged.
- **Stories from strangers:** stories are TypeScript today (the builder DSL in `src/story/`). We
  must never run user code. The web app needs a story editor that produces a data form, validated
  with Typebox, that the engine turns into a story. The DSL stays for us; the web form is a safe
  subset of it.
- **Runs:** the pass/block scheduler (SPEC §3) and the virtual clock already make runs
  deterministic and resumable, which suits background jobs that may be restarted.
- **Abuse:** per-user limits on agents, minutes and concurrent runs; a budget cap per run, as the
  CLI already has.

## Open questions

- Which providers besides OpenRouter (Anthropic directly)?
- Are tales public by default, private by default, or the author's choice?
- Who owns a generated novella, and under which license is it shown in the gallery?
