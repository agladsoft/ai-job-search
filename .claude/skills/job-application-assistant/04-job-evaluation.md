# Job Evaluation Framework

<!-- SETUP: Skill match areas and career goals are personalized by running /setup -->

## Scoring Dimensions

Evaluate each job posting against these five dimensions:

### 1. Technical Skills Match (0-100)
How well do the required/preferred skills align with the candidate's capabilities?

| Score | Meaning |
|-------|---------|
| 80-100 | Core requirements are primary skills |
| 60-79 | Most requirements match, 1-2 gaps that are learnable |
| 40-59 | Partial match, significant upskilling needed |
| 0-39 | Fundamental mismatch |

**Strong match areas:** Technology/engineering executive leadership (CTO), AI/ML strategy & delivery (LLMs, agentic AI, MLOps, model governance), fintech & payments platform architecture, regulatory compliance (PCI-DSS, SOC2, GDPR, PSD2, MiCA), cloud/distributed systems (AWS, GCP, Azure, Kubernetes, Kafka), building & scaling engineering organizations
**Moderate match areas:** Hands-on coding across modern stack (Python, TypeScript, Go, C#/.NET), data platform architecture (Flink, Snowflake, BigQuery), digital asset custody/blockchain settlement, board/executive stakeholder communication
**Weak match areas:** [SKILLS_YOU_LACK]

### 2. Experience Match (0-100)
Does work history align with what they're looking for?

| Score | Meaning |
|-------|---------|
| 80-100 | Direct experience in the same domain and role type |
| 60-79 | Related experience, transferable skills clear |
| 40-59 | Adjacent experience, would need to make the case |
| 0-39 | Unrelated experience |

**Strong:** Fintech and payments technology leadership (CTO/Head of Engineering roles), regulated financial services, AI/ML strategy at executive level, telecom infrastructure at scale (Cisco)
**Moderate:** B2B SaaS platform engineering, engineering-services/outstaffing delivery, digital asset/crypto infrastructure
**Entry-level:** [ROLES_WITH_LIMITED_EXPERIENCE]

### 3. Behavioral/Culture Fit (0-100)
Does the role and company culture match the behavioral profile?

| Score | Meaning |
|-------|---------|
| 80-100 | Culture strongly matches behavioral preferences |
| 60-79 | Mixed signals but mostly compatible |
| 40-59 | Some friction areas |
| 0-39 | Significant culture mismatch |

**Red flags to research:** Department disorganization, work dominated by maintenance over development, poor chemistry with leadership, culture mismatches. Check reviews, media coverage, LinkedIn connections, and network contacts for insider perspective.

### 4. Location & Work Authorization (Pass / Flag / Fail + Notes)

The candidate is a **Russian citizen based in Dubai, UAE**, whose current priority is to **start
fast**. Location is a veto gate, but a FAIL is a **work-authorization wall — never merely "requires
relocation"** (the candidate is open to relocating anywhere *with sponsorship*). Classify into four
tiers:

- **PASS + start-fast boost** — Fully-remote **global** (or remote via employer-of-record /
  contractor), or **UAE / Dubai / MENA**-based (already resident, no relocation). Fastest to start,
  no visa needed. Give the Career-Alignment start-fast boost (see dimension 5).
- **PASS (relocation, viable)** — Onsite/hybrid that **offers or plausibly supports visa
  sponsorship / relocation**. Kept, but **no** start-fast boost, so it ranks below remote (slower
  start via visa/move).
- **FLAG (confirm sponsorship)** — Onsite/hybrid, **or region-locked remote, that is silent on
  sponsorship**. Keep it in the ranking with a "confirm visa sponsorship" note — silence is **not**
  a dealbreaker.
- **FAIL (blocked for a Russian citizen)** — a hard wall that willingness-to-relocate cannot fix:
  explicit **"no visa sponsorship" / "must have existing work authorization"**; **region-locked
  remote** requiring local work-auth (e.g. "Remote — US only", "remote in Poland") with no
  sponsorship/EOR; **citizens- or nationals-only**; **active security clearance**; **native/fluent
  requirement in a language other than English or Russian** (Mandarin, German, French, Polish,
  Japanese, Korean, etc.).

Frequent international travel is a **FLAG** (discuss), not a FAIL.

### 5. Career Alignment & Motivation (0-100)
Does this role advance career goals and contain tasks that energize?

| Score | Meaning |
|-------|---------|
| 80-100 | Strongly aligned with career direction, clear growth path |
| 60-79 | Good role but only partially aligned with long-term goals |
| 40-59 | Decent job but doesn't build toward career goals |
| 0-39 | Dead end or backwards step |

**Active job-search mode (temporary strategy):** Currently prioritizing speed-of-hire over strict career-ladder progression. Engineering Manager / Senior Engineering Manager / Head of Engineering-tier roles that are a genuine skills and domain match score in the 60-79 "partially aligned" band or higher on this dimension - they are a lateral step while job-hunting, not a "backwards step," even though they sit one level below CTO. Only score below 60 here if the role is also a poor skills/domain match on its own terms.

**Career goals:**
- Take AI from pilot to production at scale as a core part of the mandate, not a side initiative
- Build and scale engineering organizations (team-building, mentorship, org design)
- Hold technical leadership in regulated industries where governance/compliance is part of the strategy, not an afterthought

**Motivation filter:** Evaluate not just whether you *can* do the tasks, but whether the tasks will *energize* you. Consider:
- Tasks that energize: shipping AI/ML from pilot to production, building or turning around engineering teams, 0-to-1 and turnaround challenges (including fractional/startup work), navigating regulatory/compliance strategy alongside technology
- Tasks that drain: [YOUR_DRAINING_TASKS]
- Non-task factors: leadership style, department culture, company values, degree of autonomy
- No hard deal-breakers currently recorded

**Life situation alignment:** Consider personal constraints:
- **Citizenship / work authorization**: Russian citizen based in Dubai, UAE. Needs a sponsored work
  visa for most countries, so roles that cannot sponsor are hard FAILs (see dimension 4). Fully-remote
  (global/EOR) and UAE/MENA roles need no visa and start fastest.
- **Flexibility**: Open to first-time relocation to *any* location, but **only where a work visa is
  sponsored**; fully-remote or UAE/MENA strongly preferred.
- **Professional development**: [YOUR_GROWTH_PRIORITIES]
- **Start-fast boost (temporary strategy)**: The current priority is **speed-to-start**, so
  **fully-remote (global) and UAE/MENA roles get a boost** on Career Alignment - treat them as at
  least "partially aligned" (60-79) on location fit alone, even if career-ladder alignment on its own
  would score lower. This boost is for remote/UAE-MENA **only**; a role that requires relocation
  (even with sponsorship) does **not** get it, because the visa/move makes it slower to start. Stacks
  with the EM-tier caveat above - a genuinely-matched EM role that is also remote/UAE/MENA should land
  in the upper half of 60-79 or into 80-100.

### 6. Salary Benchmark (Optional)

If the salary lookup tool is configured (`salary_data.json` exists), look up the company:
```
python salary_lookup.py "<Company Name>" --json
```

If a city is known from the posting, add `--city "<City>"` to narrow results.

Present findings as:
```
### Salary Benchmark
| Metric | Value |
|--------|-------|
| [Category] index | XX.X (+/-X.X% vs baseline) |
| Overall index | XX.X (+/-X.X% vs baseline) |
```

Interpret results relative to the baseline defined in the data file's metadata. For index-based data, higher typically means above-market compensation.

If the salary tool is not configured, skip this section.

## Output Format

Present the evaluation as:

```
## Job Fit Evaluation: [Role] at [Company]

| Dimension | Score | Notes |
|-----------|-------|-------|
| Technical Skills | XX/100 | [brief note] |
| Experience Match | XX/100 | [brief note] |
| Behavioral Fit | XX/100 | [brief note] |
| Location & Work Auth | PASS/FLAG/FAIL | [remote-fast / relocation-w-sponsorship / confirm-sponsorship / work-auth wall] |
| Career Alignment | XX/100 | [brief note] |

**Overall Score: XX/100** (weighted average of scored dimensions)

### Verdict: [Strong Fit / Good Fit / Moderate Fit / Weak Fit / Poor Fit]

### Key Strengths for This Role
- [bullet points]

### Gaps to Address
- [bullet points]

### Recommendation
[1-2 sentences: apply/skip/apply with caveats]

### Company Research Checklist
- [ ] Checked company website (mission, values, recent news)
- [ ] Checked review sites (Glassdoor, Jobindex, etc.)
- [ ] Checked LinkedIn for team size, recent hires, connections
- [ ] Checked media for restructuring, growth, or workplace issues
- [ ] Identified network contacts who may know the team/manager
```

## Weighting
- Technical Skills: 30%
- Experience Match: 25%
- Behavioral Fit: 15%
- Career Alignment: 30%

(Location & Work Authorization is a veto gate — PASS/FLAG keep the role, FAIL excludes — not a weighted dimension. The remote/UAE-MENA start-fast boost is applied inside Career Alignment.)

## Thresholds
- **Strong Fit** (75+): Definitely apply, tailor everything
- **Good Fit** (60-74): Apply, address gaps in cover letter
- **Moderate Fit** (45-59): Consider carefully, discuss with user
- **Weak Fit** (30-44): Probably skip unless strategic reasons
- **Poor Fit** (<30): Skip

## Pre-Application: Call the Employer (Best Practice)

Before writing the application, consider whether the candidate should call the contact person listed in the posting. **Only call if there are substantive questions** - never call just to "be remembered."

### When to Suggest Calling
- The posting has unclear or ambiguous requirements
- It's unclear which competencies are essential vs. nice-to-have
- The role description is vague about day-to-day tasks
- There's a named contact person who invites questions

### Good Questions to Ask
- "What are the primary challenges in this role?"
- "How is time typically divided across the listed responsibilities?"
- "Which competencies are most critical for success in this position?"
- "What does success look like in the first 6-12 months?"

### Rules for the Call
- Prepare a 30-second "elevator pitch" about your background in case they ask
- The call's purpose is **gathering information**, not delivering a pitch
- Take notes - use what you learn to tailor the application
- Reference the conversation naturally in the cover letter ("After speaking with [name], I was especially drawn to...")
