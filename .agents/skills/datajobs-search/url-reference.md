# datajobs.com reference

Markup documentation for the `datajobs-search` skill. Base URL swappable via `DATAJOBS_BASE_URL`
(default `https://datajobs.com`).

## Navigation (no keyword search)

datajobs.com has **no `?q=`/`/search` endpoint** (both 404). Jobs are browsed via **category pages**:

| Path | Notes |
|------|-------|
| `GET /<Category>-Jobs` | Listing page, e.g. `/Data-Science-Jobs`, `/Machine-Learning-Jobs`, `/Data-Engineer-Jobs`, `/Data-Architect-Jobs`, `/Analytics-Jobs`, `/Data-Scientist-Jobs`, `/DBA-Jobs`, `/Business-Intelligence-Jobs`. |
| `GET /<Company>/<Role>-Job~<id>` | Server-rendered job detail. |

The adapter fetches a default set of the AI/data-relevant categories (or one `--category`), merges +
dedups by id, and filters client-side.

## Listing card

```html
<a href="/<Company>/<Role>-Job~<id>"><strong>Role</strong> &#150 <span>Company</span></a>
… <em><span>Location</span></em>
```

| Field | Source | Notes |
|-------|--------|-------|
| id | `-Job~<id>` in the href | |
| title | the `<strong>` in the anchor | |
| company | the `<span>` after the `&#150` en-dash (note: often **no trailing `;`**) | |
| location | the following `<em><span>…</span>` | grabbed from a bounded window after the anchor |
| date | — | **not present** on cards → `null` |
| url | the anchor href | |

## Detail page

`GET /<Company>/<Role>-Job~<id>` — the `<title>` is "**Role** job at **Company**" (split on the last
" job at "); the description is the main content block (falls back to the meta description). Detail
requires the full path (a bare id can't reconstruct the company/role slug).
