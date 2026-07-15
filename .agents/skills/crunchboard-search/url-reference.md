# CrunchBoard RSS reference

Feed documentation for the `crunchboard-search` skill. Base URL swappable via
`CRUNCHBOARD_BASE_URL` (default `https://www.crunchboard.com`).

## Feeds

| Purpose | Path | Notes |
|---------|------|-------|
| Keyword search | `GET /jobs/search.rss?q=<kw>` | **Server-side** keyword filter. Single words work best. |
| Master feed | `GET /jobs.rss` | All current jobs (used by `detail` for id lookup). |

The board is **small** (a declined TechCrunch property) — expect few items. Note that a
multi-word `q` (e.g. `head of ai`) is loosely matched and may return the whole feed.

Note: the HTML search page `GET /jobs/search?q=&l=&lat=&long=&d=` also works (workplace
Remote/On-site + category facets), and even plain `curl` with a browser UA returns full
server-rendered HTML — but the RSS feeds are cleaner, so this skill uses RSS. (The subagent's
original "Cloudflare-blocked / not integrable" assessment was wrong.)

## `<item>` fields

| Element | Contract field | Notes |
|---------|----------------|-------|
| `link` / `guid` | `url` + `id` | `/jobs/<id>-<slug>`; `id` = the numeric segment after `/jobs/`. |
| `title` | `title` + `company` + `location` | Format **"Role at Company (Location)"** — split on the last `" at "`, then peel `(Location)`. |
| `description` | `description` (detail) | Job body (includes location/remote text). |
| `pubDate` | `date` | RFC-822 → ISO 8601. |
| `enclosure` | — | Company logo; ignored. |
