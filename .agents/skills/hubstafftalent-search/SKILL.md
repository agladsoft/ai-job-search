---
name: hubstafftalent-search
version: 1.0.0
description: >
  Use this skill to search live freelance and remote job listings across development,
  design, marketing, writing, admin and IT via Hubstaff Talent's public job board, or
  to look up a specific posting. Good for remote and contract/freelance roles worldwide.
  Trigger phrases: find a freelance job, remote contract work, freelance developer /
  designer / marketing jobs, gig/contract roles, "are there freelance <role> jobs", look
  up this Hubstaff Talent job posting.
context: fork
allowed-tools: Bash(bun run .agents/skills/hubstafftalent-search/cli/src/cli.ts *)
---

# Hubstaff Talent Search Skill

Search live freelance/remote job listings from
**[Hubstaff Talent](https://hubstafftalent.net)** — a free job marketplace. No
authentication, no API key, and **zero runtime dependencies** — it runs with just `bun`.

> Worked example of the repo's job-portal-skill pattern. Hubstaff renders its results
> list client-side, but the same `/search/jobs` endpoint returns a **server-rendered
> Rails-UJS fragment** when called as an XHR — this skill fetches that fragment and
> parses it with chunked regex, so it stays a zero-dependency CLI with **no headless
> browser**. Detail pages (`/jobs/<slug>`) are plainly server-rendered.

## ⚠️ Personal use only

Hubstaff Talent is a freelance marketplace. This skill reads **public** search results
at low volume for **personal** job-hunting. Keep it to a handful of requests — no bulk
crawling, no commercial or republishing use. `robots.txt` allows `/search/jobs` and
`/jobs/*` (it disallows only `/admin`, `/wizards`, and category skill pages).

## When to use this skill

- Find freelance/remote job openings by keyword, optionally filtered by location or recency
- Get the full description of a specific Hubstaff posting by its slug

## Commands

### Search job listings

```bash
bun run .agents/skills/hubstafftalent-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keywords (maps to Hubstaff's `search[keywords]`). Optional.
- `--location <text>` / `-l <text>` — **client-side** substring over the card location,
  e.g. `-l "Remote"` or `-l "Europe"`.
- `--jobage <days>` — created within N days. Applied **client-side** over the parsed
  "Created" date.
- `--page <n>` — 1-indexed page. Hubstaff returns **15 results per page**. Default 1.
- `--limit <n>` / `-n <n>` — client-side cap on results from the page (≤ 15). Default 15.
- `--format json|table|plain` — default `json`.

> **15 per page, server-side.** Keyword/page go to the server; `--location`/`--jobage`/
> `--limit` are applied locally to that page. For more than 15 results, advance `--page`.

### Fetch full job detail

```bash
bun run .agents/skills/hubstafftalent-search/cli/src/cli.ts detail <slug|url> [--format json|plain]
```

`slug` is the `id` from a `search` result. You may also pass a full
`https://hubstafftalent.net/jobs/<slug>` URL. Returns the full (HTML-stripped)
description plus title/company/location parsed from the server-rendered detail page.

## Usage examples

```bash
# Freelance/remote engineering roles, table view
bun run .agents/skills/hubstafftalent-search/cli/src/cli.ts search -q "software engineer" --limit 10 --format table

# Remote CTO/leadership roles created in the last 14 days
bun run .agents/skills/hubstafftalent-search/cli/src/cli.ts search -q "cto" -l "Remote" --jobage 14 --format table

# ML roles, page 2
bun run .agents/skills/hubstafftalent-search/cli/src/cli.ts search -q "machine learning" --page 2 --format json

# Full details for a specific job
bun run .agents/skills/hubstafftalent-search/cli/src/cli.ts detail structural-design-engineer-2 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing a result's `id` (slug) to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }`; each result
carries at least `id` (the Hubstaff slug), `title`, `company`, `location`, `date`, and
`url` (missing values are `null`). Extra fields: `job_type`, `pay_rate`, `remote`,
`skills`, `snippet`. All errors are written to **stderr** as
`{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- `HUBSTAFF_BASE_URL` overrides the base URL for a mirror/test instance.
- The search list carries a **truncated** description (`snippet`); use `detail` for the
  full body.
- **Created dates are year-less** ("Jul 14"). The parser resolves the year to the most
  recent occurrence (this year, or last year if that date would be in the future).
- Search results are **freelance/contract-heavy**; `company` is often the hiring client.
- Requests retry 429/5xx with exponential backoff; an unreachable site exits non-zero
  with a clear message.
