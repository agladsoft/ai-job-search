# Job Application Assistant for Anton Chislov

## Role
This repo is a job application workspace. Claude acts as a career advisor and application assistant for Anton Chislov, helping with:
1. **Job fit evaluation** - Assess job postings against your profile (skills, experience, behavioral traits)
2. **CV tailoring** - Adapt existing CV templates (LaTeX/moderncv) to target specific roles
3. **Cover letter writing** - Draft targeted cover letters using existing templates (LaTeX)
4. **Interview preparation** - Prepare answers, questions, and talking points for interviews
5. **Career strategy** - Advise on positioning and personal branding

## Candidate Profile

<!-- This section is auto-populated by /setup. You can also fill it in manually. -->

### Identity
- **Name:** Anton Chislov
- **Location:** Dubai, UAE. **Citizenship: Russian** (needs a sponsored work visa for most countries).
- **Languages:** English (fluent), Russian (native)
- **Status:** Employed (CTO at Teseract), actively looking
- **Search priority:** Start fast — **fully-remote (global) or UAE/MENA strongly preferred** (no visa, fastest start). Open to first-time relocation anywhere, but **only where a work visa is sponsored** (slower).
- **LinkedIn headline:** "CTO / Head of AI / Head of Engineering | Fintech & Payments | Governed AI platforms (LLMs, agentic AI, MLOps) processing billions of events monthly | Scaled payments 3x with AI-driven anti-fraud | Ex-Cisco"

### Education
<!-- List your degrees, most recent first -->
- **Master's Degree in Computer Science** (graduated Dec 2006) - North Caucasus State Technical University

### Professional Experience
<!-- List your roles, most recent first. Full detail in .claude/skills/job-application-assistant/01-candidate-profile.md -->
- **CTO / Head of Engineering, AI & Data Platforms** (Aug 2024 - Present) - **Teseract (formerly Majoritas)** (Dubai, UAE, Remote)
  - Set technology and AI/ML strategy; led legacy-to-cloud migration of 85% of enterprise clients
  - Shipped fine-tuned proprietary LLMs and agentic AI workflows to production serving 40M+ queries/month
  - Built ML-powered fraud detection recovering $260K in revenue; automated settlement workflows unlocking $1.8M annual cash flow
- **Fractional CTO** (Aug 2025 - Dec 2025, concurrent part-time) - **Stealth FinTech Startup** (Dubai, UAE)
- **CTO / Head of Platform Engineering & Security** (Aug 2022 - Aug 2024) - **Smart Predictive Technologies** (Dubai, UAE, Remote)
  - Grew transactions 2x to $12M revenue; built SOC 2/PCI-DSS compliance from scratch
- **CTO, Engineering Services Provider** (Apr 2021 - Aug 2022) - **QuantumSoft, LLC** (Boston, MA / EMEAR, USA)
- **Head of Engineering Department** (May 2015 - Apr 2021, progressed through 3 titles) - **Cisco Systems, SON Project** (EMEAR / USA)

### Technical Skills
- **Primary:** AI/ML strategy & delivery (LLMs, agentic AI, MLOps, AI governance), technology executive leadership (CTO), fintech & payments platform architecture, cloud/distributed systems (AWS, GCP, Azure, Kubernetes, Kafka)
- **Secondary:** Hands-on coding (Python, TypeScript, Go, C#/.NET), data platform architecture (Flink, Snowflake, BigQuery), digital asset custody/blockchain settlement
- **Domain:** Regulated financial services, cross-border payments, digital assets, regulatory compliance (PCI-DSS, SOC2, GDPR, PSD2, MiCA, Basel III)
- **Software:** Kafka, Flink, Spark, Kubernetes, Docker, Terraform, Snowflake, BigQuery, vLLM

### Certifications
<!-- None found in source documents -->

### Publications
<!-- None found in source documents -->

### Awards
<!-- None found in source documents -->

### Behavioral Profile
<!-- No formal assessment on file. Notes below are inferred from LinkedIn - see .claude/skills/job-application-assistant/02-behavioral-profile.md for details and caveats -->
- **Hands-on at executive level** - stays close to architecture and code rather than managing purely from a distance
- **Governance-first innovation** - pairs new capability (AI, cloud, digital assets) with formal governance frameworks
- **Strengths:** Systems-level/organizational reframing, mentorship-driven team retention (consistently 90%+)
- **Growth areas:** Not yet assessed
- **Thrives in:** Ambiguous, early-stage/fractional environments; small pods with fewer handoffs

### What Excites You
<!-- What motivates you professionally -->
- Taking AI from pilot to production at scale
- Building and scaling engineering organizations
- Regulated-industry technical leadership (compliance/governance as part of strategy, not an afterthought)
- Turnaround / 0-to-1 challenges

### Target Sectors
<!-- Industries and companies you're targeting -->
- Any industry, with a CTO / Head of AI role focus (not restricted to fintech)
- Strongest fit: fintech & payments, regulated financial services, digital assets

### Deal-breakers
<!-- Hard constraints on job search -->
- **Work-authorization walls** (a Russian citizen based in Dubai cannot clear these, and relocation does not fix them): explicit "no visa sponsorship" / "must have existing work authorization"; region-locked remote requiring local work-auth (e.g. US/EU-only) with no sponsorship or employer-of-record; citizens-/nationals-only; active security clearance; native/fluent requirement in a language other than English or Russian.
- Note: "requires relocation" is **not** a deal-breaker (open to relocation with sponsorship); a posting merely silent on sponsorship is a **flag to confirm**, not a rejection.

## Repo Structure
- `cv/` - LaTeX CV variants (moderncv template, banking style)
- `cover_letters/` - LaTeX cover letters (custom cover.cls template)
- `.claude/skills/` - AI skill definitions for the application workflow
- `.agents/skills/` - Job search CLI tools

## Workflow for New Job Applications
1. User provides a job posting (URL or text)
2. **Always evaluate fit first**: skills match, experience match, behavioral/culture match. Present this assessment to the user before proceeding.
3. If good fit: create targeted CV (`cv/main_<company>.tex`) and cover letter (`cover_letters/cover_<company>_<role>.tex`)
4. **Verify both documents** (see Verification Checklist below)
5. Prepare interview talking points based on the role requirements and your strengths

**Important:** When mentioning agentic coding or AI tooling in CVs/cover letters, explicitly reference **Claude Code** by name.

## Verification Checklist
After creating or updating a CV or cover letter, re-read the generated file and verify **all** of the following before presenting to the user. Report the results as a pass/fail checklist.

### Factual accuracy
- [ ] All claims match actual profile (CLAUDE.md / candidate profile) - no fabricated skills, experience, or achievements
- [ ] Job titles, dates, company names, and locations are correct
- [ ] Contact details are correct
- [ ] All company-specific claims (partnerships, products, technology, expansions) have been independently verified via WebFetch/WebSearch - do not trust reviewer agent research without verification

### Targeting
- [ ] Profile statement / opening paragraph is tailored to the specific role (not generic)
- [ ] Skills and experience bullets are reframed to match the job requirements
- [ ] Key job requirements are addressed (with gaps acknowledged where relevant)
- [ ] Nice-to-have requirements are highlighted where there is a match

### Consistency
- [ ] CV follows the standard 2-page moderncv/banking format
- [ ] Cover letter uses cover.cls template and established structure
- [ ] Tone is consistent across CV and cover letter
- [ ] No contradictions between CV and cover letter content

### Quality
- [ ] No LaTeX syntax errors (balanced braces, correct commands)
- [ ] No spelling or grammar errors
- [ ] Agentic coding / AI tooling references mention **Claude Code** by name
- [ ] Cover letter is addressed to the correct person (or "Dear Hiring Manager" if unknown)
- [ ] Cover letter fits approximately one page

### Compiled PDF verification (MANDATORY - never skip)
Both documents MUST be compiled and visually inspected via the Read tool on the PDF output. "Looks fine in the .tex" is not acceptable - LaTeX page-break decisions are unpredictable. Iterate until these all pass:
- [ ] CV compiled with **lualatex** (pdflatex often fails on modern MiKTeX with fontawesome5 font-expansion errors). Cover letter compiled with **xelatex** (cover.cls requires fontspec).
- [ ] **CV is exactly 2 pages** - not 1, not 3
- [ ] **No orphaned `\cventry` titles** - a job/education title must never sit at the bottom of a page with its bullets spilling to the next page. Use `\needspace{5\baselineskip}` before each `\cventry` to prevent this, and `\enlargethispage{2-3\baselineskip}` to rescue a trailing section that just barely spills
- [ ] **Cover letter is exactly 1 page** - signature block must fit with the body, never overflow
- [ ] **Cover letter bullet font matches body font** - `\lettercontent{}` must not wrap `\begin{itemize}...\end{itemize}` (the command's trailing `\\` errors on `\end{itemize}`, and moving itemize outside loses the Raleway font). Standard pattern: close `\lettercontent{}`, then wrap the list in `{\raggedright\fontspec[Path = OpenFonts/fonts/raleway/]{Raleway-Medium}\fontsize{11pt}{13pt}\selectfont \begin{itemize}...\end{itemize}\par}`

### ATS & keyword verification (CV)
ATS parsers read the PDF's embedded text layer, not the rendered page. Extract it with `pdftotext -layout` and verify what a parser sees. `pdftotext` (poppler) is optional - if missing, skip the parseability items with a warning and check keyword coverage from the visual PDF read instead.
- [ ] CV text layer extracts cleanly - no `(cid:*)` markers, `�` replacement characters, or text visible in the PDF but absent from the extraction
- [ ] Email and phone appear as **literal text** in the extraction (icon-glyph noise like `MOBILE-ALT`/`Envelope` is harmless, but a contact detail carried only by an icon or hyperlink is invisible to ATS)
- [ ] Reading order of the extracted text matches the visual order (single-column stock template is safe; multi-column custom templates are where this breaks)
- [ ] Posting keywords covered or honestly absent - synonym-only matches tightened to the posting's exact term where truthfully applicable, keywords the profile genuinely supports added to experience bullets, genuine gaps left visible and **never stuffed**
