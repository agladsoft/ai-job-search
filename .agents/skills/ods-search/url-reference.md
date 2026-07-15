# ods.ai reference

Documentation for the `ods-search` skill. Base URL swappable via `ODS_BASE_URL` (default
`https://ods.ai`). ods.ai is a Next.js app; data is embedded as JSON in a `__NEXT_DATA__`
`<script>`, so there is no separate REST API — fetch the page and parse that JSON.

## Pages

| Purpose | Path | JSON location in `__NEXT_DATA__` |
|---------|------|----------------------------------|
| Vacancy list | `GET /jobs` | `props.pageProps.vacancies.vacancies` (array; the full list — filter client-side) |
| Vacancy detail | `GET /jobs/<uuid>` | `props.pageProps.vacancy` (single object, with `description` + `about_company`) |

`robots.txt` allows crawling (disallows some misc bots only). No `?q=`/server search — the list is
the whole set, filtered locally.

## Vacancy fields

| Field | Contract field | Notes |
|-------|----------------|-------|
| `id` (uuid) | `id` + `url` | `url` = `/jobs/<uuid>`. |
| `title` | `title` | Often Russian-language. |
| `company_name` (detail) / `owner.display_name` (list) | `company` | List has only the poster's display name; detail has `company_name`. |
| `cities` (array) / `work_type` | `location` | `cities` are often empty → fall back to `work_type` ("Remote", "Remote or office", "Office"). |
| `publication_dt` | `date` | ISO 8601. |
| `salary_from/to`, `salary_currency`, `salary_payment_period` | `salary` | Frequently **RUB**, per Month. |
| `type_of_employment` | `job_type` | e.g. "Full-time". |
| `tags` (array) | `tags` | |
| `description` (detail) | `description` | HTML; **may be empty** → fall back to `about_company`. |
| `status` | — | Only `"Published"` vacancies are returned. |

## Relevance

CIS/Russian data-science community: IC-heavy (ML/DS/CV/data engineers), Russian-language common,
RUB salaries — a work-auth-friendly niche for a Russian-speaking candidate, not a leadership board.
