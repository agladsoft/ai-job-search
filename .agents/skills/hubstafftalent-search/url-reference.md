# Hubstaff Talent reference

Endpoint documentation for the `hubstafftalent-search` skill. Update this file if
Hubstaff changes its markup. Base URL is swappable via `HUBSTAFF_BASE_URL` (default
`https://hubstafftalent.net`).

## The key trick: XHR results fragment

Hubstaff's `/search/jobs` page ships an **empty** `<div id="results">` and populates it
client-side — a plain GET or WebFetch sees no jobs. But the **same URL**, requested with
these headers, returns a server-rendered Rails-UJS fragment containing the cards:

```
X-Requested-With: XMLHttpRequest
Accept: text/javascript, text/html, application/xml, */*
```

The body looks like:

```js
$('#results').html("<div class=\"content-section\">…<div class=\"search-result\">…</div>…");
```

`extractResultsHtml` locates the `#results` `.html("…")` argument, finds the end of the
JS string literal, and un-escapes it (`unescapeJs` — handles `\n \t \" \/ \\ \uXXXX` and
drops the backslash Rails adds before `$`, which is invalid JSON so `JSON.parse` cannot
be used).

## Endpoints

| Purpose | Request | Notes |
|---------|---------|-------|
| Search | `GET /search/jobs?search[keywords]=<kw>&page=<n>` **+ XHR headers** | Returns the UJS results fragment. 15 results/page. |
| Detail | `GET /jobs/<slug>` (plain) | Server-rendered; full body in `.job-description`. |

Only `search[keywords]` and `page` are used; the CLI applies `--location`/`--jobage`/
`--limit` client-side. (The full form has many range params — `payrate_*`, `budget_*`,
`experience_level`, `countries[]`, `languages[]` — but they are optional.)

`robots.txt`: disallows `/admin`, `/wizards`, `/categories/*/skill/*`. `/search/jobs` and
`/jobs/*` are allowed.

## Search card anchors (`.search-result`)

| Field | Anchor | Notes |
|-------|--------|-------|
| slug + title | `a.name` `href="/jobs/<slug>"`, text | `id` = slug; title trimmed. |
| job_type | `span.label` text | "hourly", "full time", … |
| pay_rate | `div.pay-rate` text | e.g. "$30/hr" (or budget). |
| company | `a.job-agency` text | Leading `<i>` icon stripped; the hiring client. |
| location | `span.location` text | `<strong>HQ:</strong>` label + pin icon stripped. |
| remote | `title="Remote job"` present | Boolean. |
| date | `title="Created"` … `Mon DD` | **Year-less**; resolved to the most recent occurrence. |
| snippet | `div.profil-bio` text | **Truncated** description; use `detail` for the full body. |
| skills | `div.list-inline` → `a.tag` texts | Skill tags. |

## Detail page anchors (`/jobs/<slug>`)

| Field | Anchor | Notes |
|-------|--------|-------|
| title + company | `<title>` = "`<Role> job at <Company>`" | Split on the last " job at ". |
| description | `div.job-description` | Full body; HTML-stripped by `cleanHtml`. |
| location | `span.location` | Same anchor as the card. |

Each `.search-result` block is parsed independently, so one malformed card cannot break
the rest (the portal-skill chunked-parse contract).
