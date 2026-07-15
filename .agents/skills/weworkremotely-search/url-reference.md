# We Work Remotely RSS reference

Feed documentation for the `weworkremotely-search` skill. Update this file if WWR changes
its feed structure. Base URL is swappable via `WWR_BASE_URL` (default
`https://weworkremotely.com`).

## Feeds

| Purpose | Path | Notes |
|---------|------|-------|
| All jobs (master) | `/remote-jobs.rss` | ~50–60 items across every category. |
| Per-category | `/categories/remote-<slug>-jobs.rss` | e.g. `/categories/remote-programming-jobs.rss`. |

Category slugs: `programming`, `devops-sysadmin`, `design`, `sales-and-marketing`,
`management-and-finance`, `product`, `customer-support`, `all-other-remote`.

- A **valid** category feed returns `200` with RSS.
- A **bad** slug `301`-redirects (followed to an HTML page) — no `<item>` elements, so the
  parser returns zero results rather than crashing.
- The feeds are **static per category**: there are no `search`/`location`/`age`/`page`
  query parameters, so the CLI applies all filtering client-side after one fetch.

## `<item>` fields

Each `<item>` (order as published) carries:

| Element | Contract field | Notes |
|---------|----------------|-------|
| `media:content` (attr `url`) | — | Logo; ignored. |
| `title` | `title` + `company` | Format **"Company: Role"**; split on the first `": "`. |
| `region` | `location` / `region` | Eligibility geography ("Anywhere in the World", "Europe Only"). |
| `country` | — (location filter input) | Often empty; HQ country when present. |
| `state` | — (location filter input) | Often the HQ state/city. |
| `skills` | — (query filter input) | Frequently empty. |
| `category` | `category` | e.g. "Back-End Programming", "Sales and Marketing". |
| `type` | `job_type` | e.g. "Full-Time", "Contract". |
| `description` | `description` (detail only) | **Double-encoded HTML** (`&amp;lt;p&amp;gt;`, `&amp;amp;`). |
| `pubDate` | `date` | RFC-822; converted to ISO 8601. |
| `link` | `url` + `id` | The WWR job page; `id` = the URL's last path segment (slug). |
| `guid` | fallback for `url`/`id` | Equals `link` in practice. |

## Encoding quirks

- **Titles** are XML-entity-encoded once (`&amp;` for `&`); decoded once by the field
  extractor.
- **Descriptions** are entity-encoded **twice**: the feed carries `&amp;lt;p&amp;gt;` for
  `<p>` and `&amp;amp;` for `&`. The extractor decodes once (recovering HTML), then
  `cleanHtml` decodes again while stripping tags — two passes total.
- A description's embedded `<a href>` links usually point at the **company's own site**,
  not the WWR posting. The contract `url` is always the WWR `link`.
