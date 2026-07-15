---
name: datajobs-search
version: 1.0.0
description: >
  Use this skill to search live data / analytics / machine-learning job listings on
  datajobs.com, or to look up a specific posting. Covers data scientists, data & ML engineers,
  data architects and analytics leaders (incl. Lead / Director / Chief Data roles). Trigger
  phrases: data jobs, data science jobs, ML / machine learning jobs, analytics jobs, data
  engineer / architect jobs, "are there data <role> jobs", look up this datajobs.com posting.
context: fork
allowed-tools: Bash(bun run .agents/skills/datajobs-search/cli/src/cli.ts *)
---

# datajobs.com Search Skill

Search live data / analytics / ML job listings from **[datajobs.com](https://datajobs.com)**. No
authentication, no API key, and **zero runtime dependencies** — it runs with just `bun`.

> Server-rendered HTML board with **no keyword-search endpoint** — jobs are browsed via
> **category pages** (e.g. `/Data-Science-Jobs`, `/Machine-Learning-Jobs`). This skill fetches the
> relevant categories, parses the listing cards with chunked regex, and filters client-side.

## Commands

### Search job listings

```bash
bun run .agents/skills/datajobs-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keywords matched **client-side** over title/company/category.
  Optional.
- `--category <slug>` / `-c <slug>` — search a single category instead of the default set. Accepts
  a slug (`Machine-Learning-Jobs`) or free text (`data architect` → `Data-Architect-Jobs`). Default
  categories: `Data-Science-Jobs`, `Machine-Learning-Jobs`, `Data-Engineer-Jobs`,
  `Data-Architect-Jobs`, `Analytics-Jobs`.
- `--location <text>` / `-l <text>` — **client-side** substring over the location, e.g. `-l "Remote"`.
- `--page <n>` — 1-indexed page (client-side). Default 1.
- `--limit <n>` / `-n <n>` — results per page. Default 25.
- `--format json|table|plain` — default `json`.

> **No posting date.** Listing cards don't carry a date, so results are **not** age-filtered
> (`--jobage` is accepted but ignored).

### Fetch full job detail

```bash
bun run .agents/skills/datajobs-search/cli/src/cli.ts detail <url> [--format json|plain]
```

Pass the **full** `https://datajobs.com/<Company>/<Role>-Job~<id>` URL from a search result — a bare
numeric id cannot reconstruct the company/role path. Returns the title/company (from the page title
"Role job at Company") and the description.

## Usage examples

```bash
bun run .agents/skills/datajobs-search/cli/src/cli.ts search -q "lead" --format table
bun run .agents/skills/datajobs-search/cli/src/cli.ts search -c "Data-Architect-Jobs" -l "remote" --format table
bun run .agents/skills/datajobs-search/cli/src/cli.ts detail "https://datajobs.com/IAC-Applications/Chief-Data-Architect-Cloud-Job~9105" --format plain
```

## Output

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }`; each result carries `id`,
`title`, `company`, `location`, `url`, `category` (`date` is always `null`). Errors go to **stderr**
as `{ "error", "code" }`, exit code `1`.

## Notes

- `DATAJOBS_BASE_URL` overrides the base URL for a mirror/test instance.
- The board carries genuine **leadership** titles (Chief Data Architect, Director of Data Science,
  Lead ML Engineer) alongside IC roles — more than most niche data boards.
- Some non-ASCII company names may show minor mojibake from the source page's encoding; the
  underlying posting text is unaffected.
