# /hunt - Scrape and Rank in One Pass

You are running the discovery pipeline end to end: find fresh postings, then triage-score them into a ranked shortlist, in a single command. `/hunt` is a thin wrapper - it does not re-implement anything. It runs `/scrape` then `/rank` back to back and presents only the final ranked shortlist.

Use `/hunt` when you just want "find me new roles and tell me which are worth it" without stopping between the two steps. `/scrape` and `/rank` remain available standalone.

`$ARGUMENTS` is an optional focus area (e.g. `/hunt data science`) or `broad` (`/hunt broad`), passed straight through to the scrape step. `/rank` then scores everything the scrape just marked `new`.

Run these two steps in order.

---

## Step 1: Scrape

Execute the job-scraper skill (`.claude/skills/job-scraper/SKILL.md`) exactly as `/scrape` would, passing `$ARGUMENTS` through as its focus/mode argument. This searches the portals, deduplicates against `job_scraper/seen_jobs.json` and `job_search_tracker.csv`, and marks new postings with `"status": "new"`.

Do not present the intermediate scrape table - `/hunt` shows only the ranked result. Just note how many new postings the scrape found, then continue.

If the scrape finds nothing new, say so ("No new postings found - nothing to rank") and stop.

---

## Step 2: Rank

Execute `.claude/commands/rank.md` exactly, with **no arguments** (so it ranks all jobs the scrape just marked `new`). This runs the full ranking flow including:

- Step 4: update `seen_jobs.json` (`status: ranked`, scores, verdict).
- Step 4b: merge the shortlist into `job_scraper/shortlist.json` for the CV pipeline.
- Step 5: present the ranked shortlist.

---

## Presentation

Show only `/rank`'s Step 5 output (the ranked shortlist, below-threshold, and excluded sections), prefixed with a one-line summary: "Scraped <N> new postings, ranked into <X> shortlisted." Keep `/rank`'s CV-pipeline footer intact:

> Full ranked menu (shortlisted + below-threshold, with location and notes) exported to `job_scraper/shortlist.json`. To run the full CV workflow on any of these, set `"picked": true` on their entries and run `/cv-wf-batch` in the claude-cv-agents repo.
