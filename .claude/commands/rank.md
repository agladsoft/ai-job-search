# /rank - Triage Scraped Jobs into a Ranked Shortlist

You are batch-scoring the jobs that `/scrape` has collected, so the user can decide where to spend `/apply` effort. `/scrape` finds and dedupes postings; `/apply` evaluates one at a time in depth. `/rank` is the bridge: it scores every new posting against the fit framework and returns a ranked shortlist.

`/rank` produces **triage scores**, not final evaluations. It scores from the posting text and the candidate profile only - no company research, no reviewer agent. `/apply`'s Step 1 evaluation (which adds company research) remains authoritative and always re-runs when the user applies.

Follow these steps **in order**.

---

## Step 0: Parse Input

`$ARGUMENTS` may contain:

- Nothing → rank all jobs with status `new` in `job_scraper/seen_jobs.json`
- A focus area (e.g. `/rank data science`) → rank only jobs whose title or stored fit-notes match the focus
- `--all` → re-rank every job that has not been applied to, including previously ranked ones (useful after the profile changes)
- `--top <N>` → shortlist size (default 5)

---

## Step 1: Load State

1. Read `job_scraper/seen_jobs.json`. If the file is missing or has no entries, tell the user to run `/scrape` first and stop.
2. Build the **applied exclusion set** - jobs already applied to or already turned into a CV are out of scope regardless of flags. Match by **normalized URL** (trim, lowercase, strip a trailing slash) as the primary key, with company+role as a fuzzy fallback. Sources:
   - `job_search_tracker.csv`: the `source` column (job URL) and company+role of every row.
   - The CV pipeline's role folders, if reachable: `/Users/ant747/Documents/cv-speed-up/claude-cv-agents/roles/*/source/jd_link` each hold the URL of a role a CV was already built for. Include those URLs. (Skip this source silently if the path is not present.)
   - Any entry in `job_scraper/shortlist.json` (if it exists) marked `"status": "applied"` (already handled) or `"status": "excluded"` (a job the user has dismissed and never wants to see again). Both are terminal.
   URL matching matters: the tracker's `source` matches postings exactly, whereas company+role drifts (e.g. "Nameless Ventures" vs "Nameless Ventures (client: ...)").
3. Select candidates: entries with status `new` (or all non-applied entries with `--all`), minus the exclusion set, filtered by the focus area if one was given.
4. If no candidates remain, say so ("Nothing new to rank - run /scrape to find fresh postings") and stop.
5. Read the scoring framework and profile **once**:
   - `.claude/skills/job-application-assistant/04-job-evaluation.md`
   - `.claude/skills/job-application-assistant/01-candidate-profile.md`

State how many jobs will be ranked before proceeding.

---

## Step 2: Batch-Fetch and Score

Dispatch parallel `general-purpose` agents via the **Agent tool**, ~5 jobs per agent (a single agent is fine for ≤5 jobs). Token-efficiency rules, consistent with `/apply`:

- Pass each agent everything it needs **inline in the prompt** - the job list (title, company, URL) and a compact scoring rubric extracted from the files you read in Step 1: the strong/moderate/weak skill match areas, direct/adjacent experience domains, behavioral thrive/drain factors, career goals, deal-breakers, and the location constraints. Do **not** make agents re-read the profile files.
- Agents fetch each posting URL with WebFetch and score **only from actually fetched content**. If a URL is dead, redirects to a listing page, or the posting has expired, the agent marks that job `expired` - it never scores from the title alone and never fabricates posting content.
- Scope is triage: posting text vs. rubric. **No company research, no salary lookup, no web searches** - that depth belongs to `/apply`.

Each agent returns a JSON array, one object per job:

```json
{
  "key": "<the job's key in seen_jobs.json>",
  "status": "scored" | "expired",
  "scores": { "technical": 0-100, "experience": 0-100, "behavioral": 0-100, "career": 0-100 },
  "location": "PASS" | "FAIL" | "FLAG",
  "deadline": "YYYY-MM-DD" | null,
  "strengths": ["1-3 bullets, grounded in the posting text"],
  "gaps": ["1-3 bullets, honest"],
  "language": "<posting language>"
}
```

Scoring uses the dimension definitions from `04-job-evaluation.md` verbatim. The honesty rule applies to triage too: gaps are stated, never smoothed over, and a posting that is a poor fit gets a low score even if it looks prestigious.

---

## Step 3: Aggregate and Rank

Back in the main context, for each scored job:

1. Compute the overall score with the weighting from `04-job-evaluation.md` (Technical 30%, Experience 25%, Behavioral 15%, Career Alignment 30%; location is unweighted).
2. Map to the framework's verdict bands (Strong Fit 75+, Good Fit 60-74, Moderate Fit 45-59, Weak Fit 30-44, Poor Fit <30).
3. **Location veto:** `FAIL` (e.g. requires relocation) excludes the job from the shortlist no matter the score - list it separately with the reason. `FLAG` (e.g. heavy travel) stays in the ranking but carries a visible ⚠ marker for the user to judge.
4. **Deadline urgency:** a deadline within 7 days gets a 🔥 marker and wins ties. A deadline that has already passed moves the job to `expired`.

Sort by overall score (descending), urgency as tiebreaker.

---

## Step 4: Update State

Update `job_scraper/seen_jobs.json` in place - these fields are additive to the scraper's schema:

- Ranked jobs: set `"status": "ranked"` and add `"rank_score": <overall>`, `"rank_verdict": "<band>"`, `"rank_date": "YYYY-MM-DD"`
- Dead or past-deadline jobs: set `"status": "expired"`

Do not modify `job_search_tracker.csv` - that file records applications, and `/rank` never applies. Re-running `/rank` is idempotent: already-`ranked` jobs are skipped unless `--all` re-scores them.

---

## Step 4b: Export the Full Ranked Queue

This is the handoff to the CV pipeline (the `claude-cv-agents` repo), which consumes a picked queue. Export the **whole ranked menu** so the user can pick any role manually, not just the auto-shortlisted ones.

Merge every job you gave a triage score this run into `job_scraper/shortlist.json` - **both shortlisted AND below-threshold** jobs. The only jobs you leave out are `expired`/dead-URL ones (they can't be applied to). Location-vetoed jobs (`FAIL`) ARE included but written with `status: "excluded"` (a hard veto - relocation / work-authorization / language dealbreaker - is not something to keep in the pick menu), with the reason in `location` (format `FAIL: <reason>`) and `notes`. Location `FLAG` jobs (soft, e.g. heavy travel) stay `proposed` so the user judges per role - only `FAIL` auto-excludes.

Create the file as `{}` if it does not exist. It is a JSON object keyed by job URL; each entry has this schema:

```json
{
  "<url>": {
    "url": "https://...",
    "title": "Chief Technology Officer",
    "company": "Acme Inc",
    "rank_score": 78,
    "rank_verdict": "Strong Fit",
    "rank_date": "YYYY-MM-DD",
    "location": "Copenhagen (on-site) - FLAG: heavy travel",
    "notes": "Strong platform-scaling match; gap: no direct fintech regulatory experience. Deadline 2026-07-20 🔥",
    "picked": false,
    "status": "proposed"
  }
}
```

- `location`: the posting's location plus its veto status - one of `PASS` / `FLAG: <why>` / `FAIL: <why>` (e.g. "Remote (EU) - PASS", "Berlin - FAIL: relocation required"). This is what lets the user judge location at pick time.
- `notes`: a 1-2 sentence honest digest for manual triage - the top strength and the top gap from your Step 2 findings, plus a `🔥` and the date if the deadline is within 7 days. No fabrication; if you have nothing grounded to say, use the verdict band.

Merge rules (follow exactly - the CV pipeline stamps its own fields onto these entries):

- **Terminal entry already in `shortlist.json` (`status` is `applied` or `excluded`):** leave `status` and `picked` as-is; you may refresh the rank-derived fields but never reopen it. These never re-enter the pick menu.
- **Applied job (URL in the Step 1 applied exclusion set) not yet in `shortlist.json`** → do **not** add it. If it *is* already present, the rule above already keeps it terminal; if it is present but still `proposed`, set its `status` to `applied` (mirror the truth).
- **New url that is a location `FAIL`** → add it with `"picked": false` and `"status": "excluded"` (auto-veto; reason in `location`/`notes`).
- **New url** (not applied/excluded, not FAIL) → add the full entry with `"picked": false` and `"status": "proposed"`.
- **Existing url** (still `proposed`/`failed`) → refresh the rank-derived fields (`rank_score`, `rank_verdict`, `rank_date`, `location`, `notes`). NEVER touch `picked`, `status`, or any field the pipeline added (`role_dir`, `pdf`, `exit`, `in_range`, `completed`, `fail_phase`, `fail_reason`). A re-rank must not undo a user's pick or a completed run.
- Do not add `expired`/dead-URL jobs.

**File ordering:** when writing `shortlist.json`, keep the actionable entries (`proposed`/`failed`) first, highest `rank_score` first, then append all terminal entries (`applied` and `excluded`) at the **tail** (also score-desc within that group). This keeps the pick menu at the top and sinks done/dismissed jobs out of the way.

The `status` lifecycle:
- `proposed` (fresh) → `applied` | `failed`, stamped by `/cv-wf-batch` (`done == applied`: a produced CV counts as applied and is also logged to `job_search_tracker.csv`).
- `proposed` → `excluded`, set **by the user** to dismiss a job they will never apply to, **or automatically by `/rank`** when a job has a location `FAIL` veto.
- `/rank` writes `proposed` on brand-new non-applied entries, mirrors `applied` onto entries whose URL is in the applied set, and never touches `applied`/`excluded` entries. Both are terminal - a re-rank never reopens them, and `excluded` URLs are dropped before scoring (Step 1) so they do not appear in the ranked shortlist either.

---

## Step 5: Present the Shortlist

```
## Job Ranking - YYYY-MM-DD

Ranked <N> new postings (<X> shortlisted, <Y> below threshold, <Z> expired/vetoed).

### Shortlist

| # | Score | Verdict | Title | Company | Location | Deadline | |
|---|-------|---------|-------|---------|----------|----------|---|
| 1 | 78 | Strong Fit | ... | ... | ... | ... | 🔥 |

### Why these ranked highest
**1. <Title> at <Company> (78)** - [2-3 strength bullets and the honest gap, from the agent's findings]
[repeat for each shortlisted job]

### Below threshold
| Score | Verdict | Title | Company | One-line reason |

### Excluded
- <Title> at <Company> - location FAIL: requires relocation
- <Title> at <Company> - expired <date>
```

Rules for the presentation:

- Every claim traces to fetched posting text or the profile - no invented details.
- Say explicitly that these are **triage scores from the posting text only**, and that `/apply` will re-evaluate with company research before anything is drafted.
- Add the CV-pipeline footer: "Full ranked menu (shortlisted + below-threshold, with location and notes) exported to `job_scraper/shortlist.json`. To run the full CV workflow on any of these, set `\"picked\": true` on their entries and run `/cv-wf-batch` in the claude-cv-agents repo."
- Then ask: "Want to apply to any of these? Give me the number(s) and I'll start with the full `/apply` workflow."
- If the user picks one, run the `/apply` workflow on that job's URL, passing the triage verdict as prior context but **re-running the full Step 1 evaluation** - triage never substitutes for it.

---

## Important Rules

1. **Never rank unfetched postings.** A job whose posting cannot be retrieved is marked expired, not guessed at.
2. **Triage depth only.** No company research, no salary lookups, no reviewer agents - `/rank` exists to be cheap enough to run on every scrape batch.
3. **Deal-breakers veto scores.** A 90-point job that fails a location deal-breaker is excluded, not ranked first.
4. **Honest scoring.** Gaps are reported per job; a low-scoring posting is presented as such. The score bands and weights come from `04-job-evaluation.md` - if the user disagrees with a ranking, the fix is updating their profile or the framework, not bending scores.
5. **State stays consistent.** `seen_jobs.json` fields are only added, never restructured, so `/scrape`'s dedup keeps working; the tracker is read-only for this command.
