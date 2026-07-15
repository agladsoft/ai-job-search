# ai-jobs.net reference

Markup documentation for the `ai-jobs-search` skill. Update this file if ai-jobs.net changes
its HTML. Base URL is swappable via `AIJOBS_BASE_URL` (default `https://ai-jobs.net`).

## Endpoints

| Purpose | Request | Notes |
|---------|---------|-------|
| Listing | `GET /?page=<n>` | ~50 `<li>` job cards/page. `?page` paginates. |
| Detail | `GET /job/<slug>-<id>/` | Server-rendered; title/location/description in OpenGraph meta. |

`robots.txt`: `Allow: /`, `Disallow: /account/`. Listing/detail are allowed.

## Two quirks

1. **Keyword search is NOT a GET param.** `?search=`, `?q=`, `?kw=` are all ignored (the
   listing is identical). So `--query`/`--location` are applied client-side; only `--page`
   affects the server response.
2. **No hiring company** is published on the card or the detail page (no company link, no
   `img alt`, no JSON-LD, no author meta). `company` is therefore always `null`.

## Listing card anchors (`<li class="d-flex justify-content-between position-relative …">`)

| Field | Anchor | Notes |
|-------|--------|-------|
| id + slug | `a.stretched-link` `href="/job/<slug>-<id>/"` | `id` = trailing digit run of the slug. |
| title | that anchor's text | Strip the `text-bg-primary` "Featured"/"Feat." badge spans; decode entities. |
| salary | `span.text-bg-success` **containing a digit** | e.g. "USD 174K-284K". The remote badge is also `text-bg-success` but is just "R". |
| remote | a `text-bg-success` span whose text is "R" (or "remote" anywhere) | Boolean. |
| seniority | `span.text-bg-warning` | e.g. "Senior-level", "Mid-level", "Entry-level". |
| job_type | `span.text-bg-secondary` | e.g. "Full Time". |
| location | the `.text-end` div holding the place name before the date | Strip the trailing "R" badge. |
| date | `div.text-muted` | **Relative** ("6d ago", "2w ago", "today"); resolved to ISO. |
| tags | **classless** `<span>…</span>` | Benefit spans carry `class="text-success"` and are excluded. |

Each `<li>` card is parsed independently, so one malformed card cannot break the rest (the
portal-skill chunked-parse contract).

## Detail page (`/job/<slug>-<id>/`)

No JSON-LD JobPosting. Read the OpenGraph meta:

| Field | Source |
|-------|--------|
| title | `og:title` = "`<Role> - <Location>`" (split on the first " - "). |
| location | the segment after " - " in `og:title`. |
| description | `og:description` — a clean, semicolon-joined responsibilities summary. |
| company | not available → `null`. |
