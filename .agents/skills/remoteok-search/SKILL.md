---
name: remoteok-search
version: 1.0.0
description: >
  Use this skill to search live remote job listings across engineering, design, product,
  marketing, sales and more via the RemoteOK public API, or to look up a specific RemoteOK
  posting. RemoteOK aggregates remote roles worldwide, so it is a strong broad source for
  remote-friendly candidates. Trigger phrases: find a remote job, remote job search, work
  from home roles, remote developer / engineering jobs, "are there remote <role> jobs",
  look up this RemoteOK job posting.
context: fork
allowed-tools: Bash(bun run .agents/skills/remoteok-search/cli/src/cli.ts *)
---

# RemoteOK Search Skill

Search live **remote** job listings from **[RemoteOK](https://remoteok.com)** via its public
JSON API. No authentication, no API key, and **zero runtime dependencies** — it runs with just
`bun`. RemoteOK is a broad remote-jobs aggregator; every posting is a remote role.

> Country-agnostic worked example of the repo's job-portal-skill pattern, like
> `remotive-search` and `freehire-search`. It queries a public JSON API, so results are
> structured rather than parsed from markup.

## ⚠️ Terms & rate limits — read before use

RemoteOK grants public API access so developers can **share RemoteOK's jobs and drive traffic
back to RemoteOK**. Their terms require that you:

- **Credit Remote OK** as the source and **link back to the Remote OK job URL** (the `url`
  field) wherever a posting is shown — with a followable link, not `nofollow`.
- Do not misuse the RemoteOK logo/brand.
- **They suspend API access** if the link-back/credit terms are not honored.

This skill is **search + detail for personal job-hunting only** — it never republishes
listings, so it stays within the personal-use bar. Keep query volume low.

## When to use this skill

- Find remote job openings by keyword and/or location, optionally filtered by recency
- Get the full (HTML-stripped) description of a specific RemoteOK posting by its id

## Commands

### Search job listings

```bash
bun run .agents/skills/remoteok-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keywords matched **client-side** over title, company and
  tags. Optional.
- `--location <text>` / `-l <text>` — **client-side** substring over the location field, e.g.
  `-l "Europe"` or `-l "remote"`.
- `--jobage <days>` — posted within N days. Applied **client-side** over the posting date.
- `--page <n>` — 1-indexed page (client-side). Default 1.
- `--limit <n>` / `-n <n>` — results per page. Default 25.
- `--format json|table|plain` — default `json`.

> **The API has no query parameters.** `GET /api` returns the latest ~100 postings; this CLI
> applies every filter (`--query`/`--location`/`--jobage`/`--page`) locally after one fetch,
> so no filter costs an extra request.

### Fetch full job detail

```bash
bun run .agents/skills/remoteok-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the numeric `id` from a `search` result. You may also pass a full
`https://remoteok.com/remote-jobs/<slug>-<id>` URL. Returns the full (HTML-stripped)
description plus tags and salary.

> RemoteOK has **no per-job endpoint**, so `detail` refetches the feed and finds the job by id
> (one GET). The feed already carries each job's full `description`, so in a scrape/rank flow
> you rarely need `detail`.

## Usage examples

```bash
# Remote engineering-manager roles, table view
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q "engineering manager" --limit 10 --format table

# Remote leadership roles posted in the last 14 days
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q "head of" --jobage 14 --format table

# Full details for a specific job
bun run .agents/skills/remoteok-search/cli/src/cli.ts detail 1134826 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing a result's `id` to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }`; each result carries
at least `id`, `title`, `company`, `location`, `date`, and `url` (missing values are `null`).
Extra fields: `tags`, `salary`. All errors are written to **stderr** as
`{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- Data is from RemoteOK's public API — no credentials. `REMOTEOK_API_URL` overrides the base
  URL for a mirror/test instance.
- The API response is a **bare array** whose first element is a legal/metadata object; the CLI
  drops it (a real job always has an `id` and a `position`).
- `date` is the posting date (ISO). `salary` is derived from `salary_min`/`salary_max`
  (RemoteOK uses `0` for "no salary", rendered as `null`).
- Every posting is remote; `location` is the eligibility geography (often free text like
  "Worldwide" or a city), not an office.
- The API retries 429/5xx with exponential backoff; an unreachable API exits non-zero with a
  clear message.
