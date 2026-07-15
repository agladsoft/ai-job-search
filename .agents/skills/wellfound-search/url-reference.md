# Wellfound reference (browser-assisted)

Reference for the `wellfound-search` skill. Update this if Wellfound changes its URL
scheme or the page structure. **There is no CLI** — Wellfound is reached only through the
Playwright MCP because Cloudflare blocks non-browser clients.

## Access constraint (the reason this is browser-only)

| Client | Result |
|--------|--------|
| `curl` / Bun `fetch()` | **403** (Cloudflare edge block, ~1.7KB challenge) |
| WebFetch | **403** |
| Playwright headless browser | **passes** — renders the real app |

So a zero-dependency CLI adapter (like the other portals) is impossible here. The skill
drives `mcp__playwright__browser_navigate` + `browser_evaluate` and maps the result into
the portal-skill contract.

## URL patterns

| Purpose | URL |
|---------|-----|
| Role + location list | `/role/l/<role-slug>/<location-slug>` (e.g. `/role/l/software-engineer/united-states`) |
| Remote role list | `/role/l/<role-slug>/remote` |
| Browse all | `/jobs` |
| Job detail | `/jobs/<id>-<slug>` (e.g. `/jobs/4470052-software-engineer`) |
| Company | `/company/<slug>` |

- Slugify roles by lowercasing and hyphenating (`Head of Engineering` →
  `head-of-engineering`).
- A bad role/location slug returns a genuine **404** page (title "404: Page not found"),
  distinct from a Cloudflare **403** block (title "wellfound.com").
- A role-list page renders ~40–50 job anchors grouped under company blocks.

## Extraction anchors (stable)

Wellfound's CSS class names are **hashed per deploy** (`styles_component__UCLp3`) — do not
select on them. Use these stable anchors instead:

| Field | Anchor | Notes |
|-------|--------|-------|
| job url + id | `a[href^="/jobs/"]` | `id` = the digits in `/jobs/<id>-<slug>`. |
| title | that anchor's `innerText` | |
| company slug | nearest ancestor's `a[href^="/company/"]` href | The `/company/` link is a logo (empty text). |
| company name | that ancestor block's `h2`/`h3` text | e.g. "Ascend", "Current". |
| type / salary / location / posted | the job row's `innerText` | e.g. "Full-time $140k – $175k San Francisco". Parse from text. |

The same job can appear twice on a page — de-dup by `id` during extraction.

## Detail page

The job page (`/jobs/<id>-<slug>`) renders the description inside `main`; take
`main.innerText` and strip surrounding nav/boilerplate. Requires the browser (same
Cloudflare constraint).
