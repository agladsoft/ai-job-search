# Search Queries for Job Scraper

<!-- Populated by /setup on 2026-07-09. Re-run `/setup --section search` to update. -->

## Search Sites

Primary (global — no Denmark-specific portal in use; the built-in Jobindex/Jobbank/Jobdanmark/Jobnet tools are not applicable to this search):
- **linkedin.com/jobs** - LinkedIn job listings, global search, no location filter (`.agents/skills/linkedin-search` CLI)
- Direct Google searches with `site:` filters for known target companies' career pages

Remote-focused portal CLIs (zero-dependency `bun run .agents/skills/<name>/cli/src/cli.ts search …`, same JSON contract as LinkedIn — `/scrape` runs them in parallel and dedups by canonical URL):
- **ai-jobs-search** - ai-jobs.net, **AI/ML/data roles only** — highest-relevance source for AI/data leadership. Keyword filter is client-side; results carry `company: null` (the board doesn't publish it)
- **freehire-search** - freehire.dev aggregator (~50 ATS platforms), tech-focused, faceted JSON API
- **remotive-search** - Remotive remote-jobs JSON API. ⚠️ Credit Remotive + link back; keep to ~4 GETs/day (24h delay)
- **remoteok-search** - RemoteOK JSON API (broad remote aggregator). ⚠️ Credit Remote OK + link back to its job URL or API access is suspended
- **weworkremotely-search** - We Work Remotely RSS feeds (master + per-category); all remote
- **hubstafftalent-search** - Hubstaff Talent freelance/remote listings (server-rendered XHR fragment; personal-use only)

Browser-assisted source (no CLI — driven via the Playwright MCP because Cloudflare blocks plain HTTP; skip if the MCP is not connected):
- **wellfound-search** - Wellfound (ex-AngelList) startup/tech jobs. Best of the added sources for **startup leadership** (founding eng, Head of Eng, VP Eng, CTO). See its `SKILL.md` for the navigate→extract procedure.

Not integrated (recorded decisions, do not re-add):
- **Toptal** - a vetted private network; you apply to *join Toptal*, not to individual jobs. No public postings/API/RSS to scrape. (Toptal *client* roles still surface via We Work Remotely.)
- **WorkWave** - a field-service SaaS vendor, not a job board; only its own careers page. Irrelevant to a CTO/AI search.
- **FlexJobs** - paid-subscription site (listings paywalled) and blocks automated clients (curl status 000). Not scrapeable.
- **theaijobboard.com** - defunct: the domain 301-redirects to an unrelated gambling site. Replaced by `ai-jobs-search` (ai-jobs.net) as the AI-focused source.
- **JS Remotely / javascript.jobs** - live HTML board but JavaScript IC/dev roles; weak fit for a CTO/Head-of-AI search. Any remote leadership roles it carries surface via LinkedIn/Wellfound/RemoteOK.
- **Hubstaff Talent / Wellfound freelance-vs-fit note** - these skew IC/freelance; leadership fit is thin except Wellfound. Ranking (not scraping) filters this — no seniority gate at scrape time.

Region-specific portals (e.g. Bayt.com for GCC, or others) are not yet configured. Add one with `/add-portal` if a specific market becomes a priority.

## Query Categories

Queries are grouped by priority. This search casts a global net (candidate is open to relocation anywhere) with a soft preference for UAE/GCC and Europe — see Location Filter below.

### Priority 1: CTO / Chief Technology Officer

Strongest and most desired career direction.

```
site:linkedin.com/jobs "Chief Technology Officer" fintech
site:linkedin.com/jobs "CTO" "cross-border payments"
"Chief Technology Officer" fintech OR payments -site:linkedin.com
```

### Priority 2: Head of AI / AI Strategy

Domain expertise: AI/ML strategy, LLMs, agentic AI, MLOps, AI governance.

```
site:linkedin.com/jobs "Head of AI" OR "VP of AI"
site:linkedin.com/jobs "AI strategy" director OR head fintech
"Head of AI" OR "Chief AI Officer" regulated OR fintech -site:linkedin.com
```

### Priority 3: VP / Head of Engineering / Engineering Manager

Adjacent roles one level below CTO.

```
site:linkedin.com/jobs "VP of Engineering" fintech OR payments
site:linkedin.com/jobs "Head of Engineering" AI OR fintech
site:linkedin.com/jobs "Engineering Manager" fintech OR AI OR payments
```

### Priority 4: Fractional/Advisory CTO & Broader Technical Leadership

Wider net, including part-time/advisory engagements.

```
site:linkedin.com/jobs "Fractional CTO" OR "Advisory CTO"
site:linkedin.com/jobs "technology executive" fintech OR "digital assets"
"fractional CTO" fintech OR startup -site:linkedin.com
```

## Location Filter

Candidate is a **Russian citizen based in Dubai**, goal **start fast** (see `04-job-evaluation.md`
dimension 4 for the full work-authorization model — `/rank` applies the veto, not `/scrape`). Do not
exclude postings on location alone at scrape time; prioritize triage order:
- **Ideal (start-fast):** Fully-remote (global/EOR), UAE / GCC / MENA (current base — no visa)
- **Acceptable:** Anywhere that sponsors a work visa / relocation (open to relocating, but slower)
- **Excluded at rank (work-auth wall, not relocation):** explicit no-sponsorship / must-have-existing-work-auth, region-locked remote needing local work-auth (US/EU-only) with no sponsorship/EOR, citizens-/nationals-only, active security clearance, native/fluent non-English/Russian language requirement

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape [focus_area]" -> relevant category queries + custom focus-specific queries
