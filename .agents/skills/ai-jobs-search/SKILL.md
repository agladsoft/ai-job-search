---
name: ai-jobs-search
version: 1.0.0
description: >
  Use this skill to search live AI / ML / data job listings via ai-jobs.net, or to look up
  a specific posting. Every listing is an AI, machine-learning, or data role (engineer,
  scientist, architect, director, head), so this is the high-relevance source for AI/data
  careers and AI leadership. Trigger phrases: AI jobs, machine learning jobs, ML engineer
  jobs, data science jobs, head of AI / director of AI roles, LLM / MLOps / data engineering
  jobs, "are there AI jobs in <place>", look up this ai-jobs.net posting.
context: fork
allowed-tools: Bash(bun run .agents/skills/ai-jobs-search/cli/src/cli.ts *)
---

# ai-jobs.net Search Skill

Search live **AI / ML / data** job listings from **[ai-jobs.net](https://ai-jobs.net)**. No
authentication, no API key, and **zero runtime dependencies** — it runs with just `bun`. Every
posting is an AI/ML/data role, which makes this the most relevant source in the set for AI and
data careers (including AI/data **leadership**).

> Worked example of the repo's job-portal-skill pattern. ai-jobs.net is server-rendered, so
> this skill parses `<li>` job cards with chunked regex — no headless browser. `robots.txt`
> allows everything but `/account/`.

## Two quirks to know

1. **No server-side keyword search.** The site's search box does not filter via a GET
   parameter (`?search=` is ignored), so `--query`/`--location` are applied **client-side**
   over the listing. `--page` (→ `?page=N`, ~50 results/page) does work — use it to reach more
   postings.
2. **No hiring company.** ai-jobs.net does not publish the employer on the card or the detail
   page, so **`company` is always `null`**. Title, location, salary, seniority, type, tags,
   date, and description are all available; the company usually appears inside the description,
   and the `url` links to the full posting.

## When to use this skill

- Find AI/ML/data job openings by keyword and/or location, optionally filtered by recency
- Get the description of a specific ai-jobs.net posting by its slug-id

## Commands

### Search job listings

```bash
bun run .agents/skills/ai-jobs-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keywords matched **client-side** over title, tags and
  seniority. Optional.
- `--location <text>` / `-l <text>` — **client-side** substring over the location, e.g.
  `-l "Remote"` or `-l "Europe"`.
- `--jobage <days>` — created within N days. Applied **client-side** over the parsed date.
- `--page <n>` — 1-indexed page (→ `?page=N`, ~50 results/page). Default 1.
- `--limit <n>` / `-n <n>` — client-side cap on results from the page. Default 25.
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/ai-jobs-search/cli/src/cli.ts detail <slug-id|url> [--format json|plain]
```

`slug-id` is the `id`-bearing token from a `search` result's URL (its numeric tail is the id).
You may also pass a full `https://ai-jobs.net/job/<slug>-<id>/` URL. Returns the description
(from the posting's OpenGraph summary) plus title/location.

## Usage examples

```bash
# AI leadership roles, table view (client-side keyword filter)
bun run .agents/skills/ai-jobs-search/cli/src/cli.ts search -q "head of ai" --format table

# Director/architect roles, remote, last 14 days
bun run .agents/skills/ai-jobs-search/cli/src/cli.ts search -q "director" -l "remote" --jobage 14 --format table

# Page 2 of the latest AI/ML/data postings
bun run .agents/skills/ai-jobs-search/cli/src/cli.ts search --page 2 --format json

# Full details for a specific job
bun run .agents/skills/ai-jobs-search/cli/src/cli.ts detail principal-knowledge-data-architect-headquarters-chevy-chase-md-219682 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing a result's id/slug to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's detail (`detail` command) |

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }`; each result carries
at least `id`, `title`, `company` (**always `null`** for this source), `location`, `date`, and
`url` (other missing values are `null`). Extra fields: `job_type`, `seniority`, `salary`,
`remote`, `tags`. All errors are written to **stderr** as `{ "error": "...", "code": "..." }`
and the process exits with code `1`.

## Notes

- `AIJOBS_BASE_URL` overrides the base URL for a mirror/test instance.
- **Dates are relative** on the site ("6d ago", "2w ago", "today"); the parser resolves them to
  ISO `YYYY-MM-DD`.
- Because keyword search is client-side over ~50 cards/page, use `--page` to widen coverage for
  a specific role, and lean on the fact that **every** listing is already an AI/ML/data role.
- Requests retry 429/5xx with exponential backoff; an unreachable site exits non-zero with a
  clear message.
