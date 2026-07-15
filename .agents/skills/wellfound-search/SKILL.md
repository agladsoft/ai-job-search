---
name: wellfound-search
version: 1.0.0
description: >
  Use this skill to search live startup and tech job listings on Wellfound (formerly
  AngelList Talent) — strong for startup / founding / head-of / VP / CTO and engineering
  roles at venture-backed companies, worldwide and remote. Wellfound is browser-assisted
  (Cloudflare blocks plain HTTP), so it drives the Playwright MCP rather than a CLI.
  Trigger phrases: startup jobs, Wellfound, AngelList jobs, founding engineer, head of
  engineering at a startup, CTO at a startup, venture-backed roles, "startup <role> jobs".
context: fork
allowed-tools: >
  mcp__playwright__browser_navigate, mcp__playwright__browser_evaluate,
  mcp__playwright__browser_wait_for, mcp__playwright__browser_close
---

# Wellfound Search Skill (browser-assisted)

Search live startup/tech job listings on **[Wellfound](https://wellfound.com)** (formerly
AngelList Talent). Wellfound is the **strongest of the added sources for startup
leadership** roles — founding engineer, Head of Engineering, VP Eng, CTO — at
venture-backed companies.

> ⚠️ **This is NOT a `bun run` CLI.** Wellfound sits behind Cloudflare bot-management:
> plain `fetch()`/`curl`/WebFetch all return **403**. Only a **real headless browser**
> passes. So this skill is the repo's **browser-assisted / LLM-adaptable tier** — it
> drives the **Playwright MCP** (`mcp__playwright__browser_*`) to render the page and
> extract job cards into the **same portal-skill contract** the CLI adapters emit, so
> `/scrape` dedups and ranks Wellfound results identically. If the Playwright MCP is not
> connected in the session, this source is unavailable — skip it and note that in the
> scrape summary (do not fabricate results).

## Search procedure

**1. Build the search URL** from the role (and optional location). Slugify by
lowercasing and replacing spaces with hyphens.

| Intent | URL |
|--------|-----|
| Role + location | `https://wellfound.com/role/l/<role-slug>/<location-slug>` |
| Role (US default) | `https://wellfound.com/role/l/<role-slug>/united-states` |
| Browse all | `https://wellfound.com/jobs` |

Examples: `/role/l/head-of-engineering/united-states`, `/role/l/software-engineer/remote`,
`/role/l/engineering-manager/united-states`. A wrong slug returns a Wellfound 404 page
(real 404, not a block) — try a broader role slug.

**2. Navigate and wait** for the listings to render:

```
mcp__playwright__browser_navigate  { url: <search URL> }
mcp__playwright__browser_wait_for  { text: "Save" }   // job cards carry Save/Apply actions
```

Confirm the page title is a real Wellfound jobs title (e.g. "… Jobs in United States …"),
**not** "wellfound.com" (that title + HTTP 403 means Cloudflare blocked the load — retry
once, then skip the source).

**3. Extract job cards** with one evaluate call. This snippet keys off the **stable**
`/jobs/` and `/company/` anchors (Wellfound's CSS class names are hashed per deploy and
must not be relied on):

```
mcp__playwright__browser_evaluate { function: `() => {
  const abs = (h) => h && h.startsWith('/') ? 'https://wellfound.com' + h : h;
  const jobs = Array.from(document.querySelectorAll('a[href^="/jobs/"]')).map(a => {
    const href = a.getAttribute('href');
    const title = a.innerText.trim();
    // Row = smallest ancestor holding salary/location/posted for THIS job only
    let row = a;
    for (let i=0;i<5 && row.parentElement;i++){ row = row.parentElement;
      if (/\$|remote|today|ago|week|in office/i.test(row.innerText) && row.querySelectorAll('a[href^="/jobs/"]').length===1) break; }
    const rowText = row.innerText.replace(/\s+/g,' ').trim();
    // Company = nearest ancestor block that contains a /company/ link
    let block=a, companyName=null, companySlug=null;
    for (let i=0;i<9 && block.parentElement;i++){ block=block.parentElement;
      const c=block.querySelector('a[href^="/company/"]');
      if (c){ companySlug=(c.getAttribute('href')||'').split('/company/')[1]||null;
        const h=block.querySelector('h2,h3'); companyName=(h?h.innerText:'').trim()||null; break; } }
    const id = (href.match(/\/jobs\/(\d+)/)||[])[1] || href;
    return { id, title, company: companyName, company_slug: companySlug,
             url: abs(href), row: rowText.slice(0,180) };
  });
  // De-dup by id (the same job can appear twice) and drop empty titles.
  const seen=new Set(); const out=[];
  for (const j of jobs){ if(!j.title||seen.has(j.id))continue; seen.add(j.id); out.push(j); }
  return JSON.stringify(out);
}` }
```

**4. Map each row to the contract.** From `row`, pull:
- `job_type` — "Full-time" / "Contract" / "Internship".
- `salary` — the `$… – $…` span (may be absent).
- `location` — the place name, or "Remote" / "In office" when present; else `null`.
- `date` — Wellfound shows relative recency ("today", "2 weeks ago"); convert to an
  approximate ISO date if a jobage filter is in play, else leave `null`.

Emit results in the standard shape so `/scrape` treats them like any portal:
`{ "meta": { "count": N }, "results": [ { id, title, company, location, date, url, salary, job_type } ] }`
(missing values `null`). Apply any keyword/location/jobage filtering **client-side** in
the mapping step (the URL already scopes role+location).

**5. Close the browser** when done: `mcp__playwright__browser_close`.

## Detail procedure

Navigate to the job `url` (`https://wellfound.com/jobs/<id>-<slug>`), `wait_for` text
"Apply", then evaluate to grab the description:

```
mcp__playwright__browser_evaluate { function: `() => {
  const main = document.querySelector('main') || document.body;
  return main.innerText.replace(/\s+\n/g,'\n').trim().slice(0, 6000);
}` }
```

The rendered `main` text carries the role description, requirements, and company blurb;
strip the surrounding nav/boilerplate when summarising.

## Notes

- **Cloudflare is the whole constraint.** Never claim Wellfound results without a
  successful browser render. A 403 / "wellfound.com" title = blocked → retry once, then
  skip and record the source as unavailable this run.
- **Canonical URL for dedup.** Wellfound job URLs are `/jobs/<id>-<slug>`; the numeric
  `<id>` is the identity (`tools/url_normalize.py` reduces the slug so variants dedup).
- **Best-fit source.** Prioritise leadership/eng role slugs (`head-of-engineering`,
  `engineering-manager`, `vp-engineering`, `cto`, `founding-engineer`) — this is where
  Wellfound adds coverage the other sources lack.
- Personal job-hunting use, low volume — a few page loads per run, no crawling.
