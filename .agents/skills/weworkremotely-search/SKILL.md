---
name: weworkremotely-search
version: 1.0.0
description: >
  Use this skill to search live remote-only job listings across programming, devops,
  design, product, management, sales/marketing and support via We Work Remotely's
  public RSS feeds, or to look up a specific WWR posting. WWR is fully remote roles
  worldwide, so it is a strong source for remote-friendly candidates. Trigger phrases:
  find a remote job, remote job search, work from home roles, remote developer /
  engineering jobs, remote product/design/marketing jobs, "are there remote <role>
  jobs", look up this We Work Remotely posting.
context: fork
allowed-tools: Bash(bun run .agents/skills/weworkremotely-search/cli/src/cli.ts *)
---

# We Work Remotely Search Skill

Search live **remote-only** job listings from
**[We Work Remotely](https://weworkremotely.com)** (WWR) via its public RSS feeds. No
authentication, no API key, and **zero runtime dependencies** — it runs with just `bun`.
Every WWR posting is a remote role, with an eligibility **region** (e.g. "Anywhere in the
World", "Europe Only") rather than an office location.

> Country-agnostic worked example of the repo's job-portal-skill pattern. Unlike the
> JSON-API adapters (`freehire-search`, `remotive-search`) and the HTML-scraping portals
> (`linkedin-search`, `jobindex-search`), WWR publishes **RSS 2.0**, so this skill parses
> an XML feed's `<item>` elements into the shared contract. Each item already carries the
> full description, so search results are self-contained.

## When to use this skill

- Find remote job openings by keyword and/or category, optionally filtered by region or
  recency
- Get the full (HTML-stripped) description of a specific WWR posting by its slug

## Commands

### Search job listings

```bash
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keywords matched **client-side** over title, category
  and skills (not the full description, to avoid matching boilerplate). Optional.
- `--category <slug>` — WWR category → its per-category feed. One of: `programming`,
  `devops-sysadmin`, `design`, `sales-and-marketing`, `management-and-finance`, `product`,
  `customer-support`, `all-other-remote`. Omit to search the **master feed** (all
  categories).
- `--location <text>` / `-l <text>` — **client-side** substring over the eligibility
  region/country/state, e.g. `-l "Europe"`.
- `--jobage <days>` — posted within N days. Applied **client-side** over `pubDate`.
- `--page <n>` — 1-indexed page (client-side). Default 1.
- `--limit <n>` / `-n <n>` — results per page. Default 25.
- `--format json|table|plain` — default `json`.

> **RSS has no query parameters.** WWR feeds are static per category, so every filter
> (`--query`/`--location`/`--jobage`/`--page`) is applied locally after fetching one feed —
> none costs an extra request.

### Fetch full job detail

```bash
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts detail <slug|url> [--format json|plain]
```

`slug` is the `id` from a `search` result. You may also pass a full
`https://weworkremotely.com/remote-jobs/<slug>` URL. Detail resolves from the master feed
(one request); a job that has scrolled off the feed returns `NOT_FOUND` — in a scrape/rank
flow the search results already hold the description, so `detail` is rarely needed.

## Usage examples

```bash
# Remote engineering roles, table view
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search -q "engineer" --limit 10 --format table

# Remote programming roles eligible in Europe, posted in the last 14 days
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search --category programming -l "Europe" --jobage 14 --format table

# Remote leadership roles across all categories
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search -q "head of" --format json

# Full details for a specific job
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts detail garden3d-head-of-marketing-communications --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing a result's `id` (slug) to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }`; each result
carries at least `id` (the WWR slug), `title`, `company`, `location` (eligibility region),
`date`, and `url` (missing values are `null`). All errors are written to **stderr** as
`{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- Data is from WWR's public RSS feeds — no credentials. `WWR_BASE_URL` overrides the base
  URL for a mirror/test instance.
- **Titles are "Company: Role".** The parser splits on the first `": "`; a title with no
  delimiter has a `null` company.
- **Descriptions are double-encoded HTML** in the feed; the parser decodes twice while
  stripping tags. The `link`/`url` inside a description is often the company's own site,
  not the WWR posting — the contract `url` is always the WWR job page.
- `date` is `pubDate` (converted to ISO). Every posting is remote; `location`/`region` is
  the eligibility geography, not an office.
- A bad `--category` slug 301-redirects to an HTML page with no `<item>` elements, so it
  yields zero results rather than an error.
- The feeds retry 429/5xx with exponential backoff; an unreachable feed exits non-zero
  with a clear message.
