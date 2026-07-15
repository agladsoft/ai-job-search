---
name: remotive-search
version: 1.0.0
description: >
  Use this skill to search live remote-only job listings across software, data,
  design, marketing, product, sales and support via the Remotive public API, or to
  look up a specific Remotive posting. Remotive is fully remote roles worldwide, so
  it is a strong source for remote-friendly candidates. Trigger phrases: find a
  remote job, remote job search, work from home roles, remote developer / engineering
  jobs, remote product/marketing/design jobs, "are there remote <role> jobs", look up
  this Remotive job posting.
context: fork
allowed-tools: Bash(bun run .agents/skills/remotive-search/cli/src/cli.ts *)
---

# Remotive Search Skill

Search live **remote-only** job listings from **[Remotive](https://remotive.com)** via
its public JSON API. No authentication, no API key, and **zero runtime dependencies** —
it runs with just `bun`. Every Remotive posting is a remote role, with an eligibility
geography (e.g. "Worldwide", "Europe, UK") rather than an office location.

> Country-agnostic worked example of the repo's job-portal-skill pattern, like
> `linkedin-search`. Like `freehire-search` (and unlike the HTML-scraping portals) it
> queries a public JSON API, so results are structured rather than parsed from markup.

## ⚠️ Terms & rate limits — read before use

Remotive grants public API access so developers can **share Remotive's jobs and drive
traffic back to Remotive**. Their terms ask that you:

- **Credit Remotive** as the source and **link back to the Remotive job URL** (the
  `url` field) wherever a posting is shown.
- **Do not republish** Remotive listings to third-party job sites (LinkedIn Jobs,
  Google Jobs, Jooble, etc.).
- **Keep requests light** — jobs are delayed 24h and Remotive advises **≤ ~4 GETs per
  day**; "excessive requests will be blocked".

This skill is **search + detail for personal job-hunting only**. It never republishes
listings, so it stays within the personal-use bar — but keep query volume low during a
session, and prefer one broad search over many narrow ones.

## When to use this skill

- Find remote job openings by keyword and/or category, optionally filtered by
  eligibility geography or recency
- Get the full (HTML-stripped) description of a specific Remotive posting by its id

## Commands

### Search job listings

```bash
bun run .agents/skills/remotive-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — full-text keywords (title/description). Optional.
- `--category <slug>` — Remotive category slug, e.g. `software-development`, `product`,
  `devops-sysadmin`, `data`, `design`, `marketing`, `sales`, `customer-service`. The
  live list (with slugs) is at
  [`/api/remote-jobs/categories`](https://remotive.com/api/remote-jobs/categories) —
  never invent a slug.
- `--location <text>` / `-l <text>` — **client-side** substring filter over the
  eligibility geography (`candidate_required_location`), e.g. `-l "Europe"`. The API
  has no location parameter (every job is remote).
- `--jobage <days>` — posted within N days. Applied **client-side** (the API has no age
  parameter).
- `--page <n>` — 1-indexed page (client-side over the fetched set). Default 1.
- `--limit <n>` / `-n <n>` — results per page. Default 25.
- `--format json|table|plain` — default `json`.

> **Location & age are client-side.** The Remotive API filters only by `search` and
> `category`; this CLI over-fetches and applies `--location`/`--jobage`/`--page` locally,
> so those flags cost no extra API calls.

### Fetch full job detail

```bash
bun run .agents/skills/remotive-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the numeric `id` from a `search` result. You may also pass a full
`https://remotive.com/remote-jobs/<category>/<slug>-<id>` URL — passing the URL lets
`detail` narrow its single API call to that job's category. Returns the full
(HTML-stripped) description plus category, tags, employment type, and salary.

> Remotive has **no per-job endpoint**, so `detail` refetches the list and finds the
> job by id (one GET). The search feed already carries each job's full `description`,
> so in a scrape/rank flow you rarely need `detail` at all.

## Usage examples

```bash
# Remote engineering-manager roles, table view
bun run .agents/skills/remotive-search/cli/src/cli.ts search -q "engineering manager" --limit 10 --format table

# Remote software-development roles eligible in Europe, posted in the last 14 days
bun run .agents/skills/remotive-search/cli/src/cli.ts search --category software-development -l "Europe" --jobage 14 --format table

# Remote leadership roles anywhere
bun run .agents/skills/remotive-search/cli/src/cli.ts search -q "head of engineering" --format json

# Full details for a specific job
bun run .agents/skills/remotive-search/cli/src/cli.ts detail 2091062 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing a result's `id` to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }`; each result
carries at least `id` (the Remotive numeric id as a string), `title`, `company`,
`location` (eligibility geography), `date`, and `url` (missing values are `null`). All
errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process
exits with code `1`.

## Notes

- Data is from Remotive's public API — no credentials. `REMOTIVE_API_URL` overrides the
  base URL for a mirror/test instance.
- `date` is `publication_date` (ISO). Remotive delays jobs 24h, so the freshest postings
  are a day old by design.
- Every posting is remote; `location` is the eligibility geography, not an office. Treat
  a job with no location as "unspecified", not "no restriction".
- The API retries 429/5xx with exponential backoff; an unreachable API exits non-zero
  with a clear message.
