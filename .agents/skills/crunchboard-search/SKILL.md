---
name: crunchboard-search
version: 1.0.0
description: >
  Use this skill to search live tech/startup job listings on CrunchBoard (TechCrunch's job
  board) via its public RSS feeds, or to look up a specific posting. Covers software,
  engineering, data and some AI roles, with a Remote workplace filter. Trigger phrases:
  startup jobs, TechCrunch jobs, CrunchBoard, tech job search, software/engineering jobs,
  "are there startup <role> jobs", look up this CrunchBoard posting.
context: fork
allowed-tools: Bash(bun run .agents/skills/crunchboard-search/cli/src/cli.ts *)
---

# CrunchBoard Search Skill

Search live tech/startup job listings from **[CrunchBoard](https://www.crunchboard.com)**
(TechCrunch's job board) via its public RSS feeds. No authentication, no API key, and **zero
runtime dependencies** — it runs with just `bun`.

> RSS worked example, like `weworkremotely-search` — but CrunchBoard exposes a **server-side
> keyword search feed** (`/jobs/search.rss?q=<kw>`), so `--query` maps to the feed URL rather
> than being filtered client-side.

## ⚠️ Small corpus

CrunchBoard has declined over the years; the board is **small** (often only a handful of live
postings). Treat it as a low-yield supplementary source — worth a cheap RSS query, not a primary
board.

## Commands

### Search job listings

```bash
bun run .agents/skills/crunchboard-search/cli/src/cli.ts search [-q "<keywords>"] [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keywords via CrunchBoard's **server-side** search RSS. Single
  words work best (multi-word queries are loosely matched).
- `--location <text>` / `-l <text>` — **client-side** substring over title/description, e.g.
  `-l "Remote"`.
- `--jobage <days>` — posted within N days (client-side over `pubDate`).
- `--page <n>` — 1-indexed page (client-side). Default 1.
- `--limit <n>` / `-n <n>` — results per page. Default 25.
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/crunchboard-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the numeric `id` from a `search` result (or a full
`https://www.crunchboard.com/jobs/<id>-<slug>` URL). Resolves from the master RSS feed (one
request); the feed already carries each job's full description.

## Usage examples

```bash
bun run .agents/skills/crunchboard-search/cli/src/cli.ts search -q "engineer" --format table
bun run .agents/skills/crunchboard-search/cli/src/cli.ts search -q "data" -l "remote" --format table
bun run .agents/skills/crunchboard-search/cli/src/cli.ts detail 545478873 --format plain
```

## Output

Search JSON is `{ "meta": { "count", "page", "total" }, "results": [...] }`; each result carries
`id`, `title`, `company`, `location`, `date`, `url` (missing values `null`). Errors go to
**stderr** as `{ "error", "code" }`, exit code `1`.

## Notes

- `CRUNCHBOARD_BASE_URL` overrides the base URL for a mirror/test instance.
- **Titles are "Role at Company (Location)"** — the parser splits on the last `" at "`, then peels
  a trailing `(Location)` off the company. Remote/location detail is also inside the description.
- `date` is `pubDate` (converted to ISO). The RSS feeds retry 429/5xx with exponential backoff.
