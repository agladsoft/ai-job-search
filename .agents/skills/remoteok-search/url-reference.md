# RemoteOK API reference

Endpoint documentation for the `remoteok-search` skill. Update this file if RemoteOK changes
its API. Base URL is swappable via `REMOTEOK_API_URL` (default `https://remoteok.com`).

## Endpoint

| Purpose | Method + path | Notes |
|---------|---------------|-------|
| List jobs | `GET /api` | Returns the latest ~100 postings. **No query parameters.** |

There is **no per-job detail endpoint** and **no search parameters**. The list response already
contains each job's full `description`, so `detail` refetches the list and finds the job by id,
and all filtering (`--query`/`--location`/`--jobage`/`--page`) is client-side.

## Response shape

A **bare JSON array**. The **first element** is a legal/metadata object:

```json
{ "last_updated": 1784129993, "legal": "API Terms of Service: Please link back ... mention Remote OK ..." }
```

Every following element is a job. The CLI drops the metadata element by keeping only entries
that have both an `id` and a `position`.

Per-job fields (the ones this skill reads):

| Field | Contract field | Notes |
|-------|----------------|-------|
| `id` | `id` | Numeric id (string). Also the trailing digits of `url`. |
| `position` | `title` | The job title. |
| `company` | `company` | `null` when empty. |
| `location` | `location` | Free text ("Worldwide", "Bridgetown,", …). `null` when empty. |
| `date` | `date` | ISO `YYYY-MM-DDTHH:MM:SS+00:00`. |
| `tags` (string[]) | `tags` | Skill/category tags. |
| `salary_min` / `salary_max` | `salary` | `0` means unset → `null`; otherwise `$min – $max`. |
| `description` (HTML) | `description` (detail only) | HTML; stripped by `cleanHtml`. |
| `url` | `url` | Canonical RemoteOK job URL (`/remote-jobs/<slug>-<id>`; host is mixed-case `remoteOK.com`). |
| `apply_url` | — | Ignored (usually equals `url`). |

## Terms & rate limits

The `legal` field states RemoteOK's terms. Summary:

- **Link back** to the Remote OK job `url` (followable, not `nofollow`) and **credit Remote OK**
  as the source.
- Do not misuse the RemoteOK logo.
- **Failure to link back → API access suspended.**

This skill is search + detail for personal job-hunting only and never republishes, so it stays
within the personal-use bar — keep query volume low.
