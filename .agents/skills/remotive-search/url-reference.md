# Remotive API reference

Endpoint documentation for the `remotive-search` skill. This is the file to update if
Remotive changes its API. Base URL is swappable via `REMOTIVE_API_URL`
(default `https://remotive.com`).

## Endpoints

| Purpose | Method + path | Notes |
|---------|---------------|-------|
| Search / list jobs | `GET /api/remote-jobs` | Returns all jobs, or filtered by `search`/`category`. |
| Category list | `GET /api/remote-jobs/categories` | `{ jobs: [{ id, name, slug }] }` — the valid `category` slugs. |

There is **no per-job detail endpoint**. The list response already contains each job's
full `description`, so `detail` refetches the list and finds the job by id.

## Query parameters (`/api/remote-jobs`)

| Param | Maps to CLI flag | Notes |
|-------|------------------|-------|
| `search` | `--query` / `-q` | Full-text over title/description. |
| `category` | `--category` | A category **slug** (e.g. `software-development`), not the display name. |
| `limit` | derived from `--limit`/`--page` | Caps rows returned; the CLI requests `page * limit`. |

**Not supported by the API** (the CLI applies these client-side after fetching):
- location — every job is remote; `--location` substring-matches `candidate_required_location`.
- posting age — `--jobage` filters on `publication_date` locally.
- offset/pagination — `--page` slices the fetched set locally.

## Response shape

Top-level (a **flat object**, not a `{data, meta}` envelope):

```json
{
  "00-warning": "...",
  "0-legal-notice": "...",
  "job-count": 38,
  "total-job-count": 38,
  "jobs": [ /* RemotiveJob[] */ ]
}
```

Per-job fields (the ones this skill reads):

| Field | Contract field | Notes |
|-------|----------------|-------|
| `id` (number) | `id` (string) | Stringified for the contract. Trailing digits of the `url` too. |
| `url` | `url` | Canonical Remotive job URL (`/remote-jobs/<category>/<slug>-<id>`). |
| `title` | `title` | |
| `company_name` | `company` | `null` when empty. |
| `candidate_required_location` | `location` | Eligibility geography, not an office. `null` when empty. |
| `publication_date` | `date` | ISO `YYYY-MM-DDTHH:MM:SS`. |
| `category` | `category` | Display name (e.g. "Software Development"), not the slug. |
| `tags` (string[]) | `tags` | |
| `job_type` | `job_type` | e.g. `full_time`. |
| `salary` | `salary` | Often empty; `null` when so. |
| `description` (HTML) | `description` (detail only) | HTML with inline Tailwind styles; stripped by `cleanHtml`. |

## Terms & rate limits

The `0-legal-notice` field states Remotive's terms in full. Summary:

- Attribute Remotive and link back to the Remotive job `url`; do not republish listings
  to third-party job boards.
- Jobs are delayed 24h; **advise ≤ ~4 GETs per day**; excessive requests are blocked.
- A private paid API exists for higher-volume/commercial use ($5k/mo starting).

This skill is search + detail for personal job-hunting only and never republishes, so it
stays within the personal-use bar — keep query volume low.
