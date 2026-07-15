---
name: ods-search
version: 1.0.0
description: >
  Use this skill to search live data-science, ML and AI job listings on ods.ai (Open Data
  Science), a CIS/Russian data-science community board, or to look up a specific posting.
  Postings are engineer/scientist-level (ML/DS/CV/data engineers), often Russian-language,
  with salaries frequently in RUB — a work-authorization-friendly, Russian-OK niche.
  Trigger phrases: data science jobs, ML jobs, machine learning jobs, ODS jobs, CIS/Russian
  remote data jobs, "are there ML/DS jobs", look up this ods.ai vacancy.
context: fork
allowed-tools: Bash(bun run .agents/skills/ods-search/cli/src/cli.ts *)
---

# ods.ai (Open Data Science) Search Skill

Search live data-science / ML / AI job listings from **[ods.ai](https://ods.ai)** (Open Data
Science). No authentication, no API key, and **zero runtime dependencies** — it runs with just
`bun`. ods.ai is a Next.js app that embeds its data as JSON in a `__NEXT_DATA__` script, so this
skill fetches the page and parses that JSON (no DOM scraping).

> Worked example of the JSON-in-`__NEXT_DATA__` pattern. The full vacancy list is embedded on
> `/jobs` (so filtering is client-side); a job detail at `/jobs/<uuid>` carries the full
> description.

## Relevance note

ods.ai is a **CIS/Russian data-science community**. Postings are mostly **IC-level** (ML / DS /
computer-vision / data engineers), **often Russian-language**, and salaries are frequently in
**RUB**. It is a differentiated, **work-authorization-friendly** source for a Russian-speaking
candidate (remote CIS roles, Russian OK) — not a leadership/CTO board.

## Commands

### Search job listings

```bash
bun run .agents/skills/ods-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keywords matched **client-side** over title/tags. Optional.
- `--location <text>` / `-l <text>` — **client-side** substring over cities / work type, e.g.
  `-l "remote"`.
- `--jobage <days>` — posted within N days (client-side over `publication_dt`).
- `--page <n>` — 1-indexed page (client-side). Default 1.
- `--limit <n>` / `-n <n>` — results per page. Default 25.
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/ods-search/cli/src/cli.ts detail <uuid|url> [--format json|plain]
```

`uuid` is the `id` from a `search` result (or a full `https://ods.ai/jobs/<uuid>` URL). Returns
the full description (falling back to the company blurb when the role description is blank), plus
company, salary, tags, and levels.

## Usage examples

```bash
bun run .agents/skills/ods-search/cli/src/cli.ts search -q "ml" --limit 10 --format table
bun run .agents/skills/ods-search/cli/src/cli.ts search -q "computer vision" -l "remote" --format table
bun run .agents/skills/ods-search/cli/src/cli.ts detail ba0ddae5-40b8-40c0-8362-a2e226eedd20 --format plain
```

## Output

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }`; each result carries
`id` (uuid), `title`, `company`, `location`, `date`, `url` (missing values `null`). Extra:
`work_type`, `job_type`, `salary`, `tags`. Errors go to **stderr** as `{ "error", "code" }`, exit 1.

## Notes

- `ODS_BASE_URL` overrides the base URL for a mirror/test instance.
- The parser reads only **Published** vacancies; `company` is the `company_name`, falling back to
  the poster's `owner.display_name` on the list view.
- `location` is the vacancy `cities`, falling back to `work_type` ("Remote", "Remote or office",
  "Office").
- Titles and descriptions are frequently **Russian-language**; salaries in **RUB**.
