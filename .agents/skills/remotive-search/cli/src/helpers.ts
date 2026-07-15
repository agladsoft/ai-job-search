// Data source: the Remotive public JSON API (https://remotive.com/api/remote-jobs).
// Reads are unauthenticated — no API key, the same bar as freehire-search — but
// unlike freehire the response is a flat object ({ "job-count", "total-job-count",
// jobs: [...] }) with no {data, meta} envelope, and there is no per-job detail
// endpoint (the search feed already carries each job's full description).
//
// ⚠️ Terms: Remotive asks that consumers link back to the Remotive job URL and
// credit Remotive as the source, and advises no more than ~4 GETs per day (jobs
// are delayed 24h and "excessive requests will be blocked"). This skill is
// search + detail for personal job-hunting only — it never republishes listings.
//
// Base URL is swappable via REMOTIVE_API_URL for testing/mirrors.

export const DEFAULT_BASE_URL = "https://remotive.com"

/** API base URL: REMOTIVE_API_URL (for a mirror/test) or the default. */
export function baseUrl(): string {
  const raw = (process.env.REMOTIVE_API_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "remotive-search-skill/1.0 (personal job search; +https://remotive.com)"

/** The Remotive list response: a flat object, not a {data, meta} envelope. */
export interface RemotiveResponse {
  "job-count": number
  "total-job-count": number
  jobs: RemotiveJob[]
}

/** A Remotive job — the fields this skill reads (the wire shape carries more). */
export interface RemotiveJob {
  id: number
  url: string
  title: string
  company_name: string
  company_logo?: string
  category: string
  tags: string[]
  job_type: string
  publication_date: string // ISO, e.g. "2026-07-13T07:05:10"
  candidate_required_location: string
  salary: string
  description: string // HTML
}

/**
 * GET and parse a Remotive JSON response. Retries 429/5xx (transient / rate-limit
 * states) with exponential backoff + jitter; returns `null` on a 404. A connection
 * failure fails fast with a clear message so an outage degrades this source rather
 * than hanging the caller.
 */
export async function apiGet(path: string): Promise<RemotiveResponse | null> {
  const url = `${baseUrl()}${path}`
  const maxRetries = 6
  let delay = 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        redirect: "follow",
      })
    } catch (e) {
      throw new Error(
        `could not reach the Remotive API at ${baseUrl()} (${e instanceof Error ? e.message : String(e)})`,
      )
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Remotive API request failed: ${response.status} ${response.statusText}`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return null

    const body = (await response.json().catch(() => null)) as RemotiveResponse | null
    if (!response.ok) {
      throw new Error(`Remotive API request failed: ${response.status} ${response.statusText}`)
    }
    if (!body || !Array.isArray(body.jobs)) {
      throw new Error("Remotive API returned an unexpected response body (no jobs array)")
    }
    return body
  }
  throw new Error("Remotive API request failed after retries")
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * A search result in the portal-skill contract shape. `id` is the Remotive numeric
 * job id as a string (what `detail <id>` consumes); missing values are `null`,
 * never omitted. The extra fields (category/tags/job_type/salary) are a permitted
 * superset.
 */
export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  category: string | null
  job_type: string | null
  tags: string[]
  salary: string | null
}

/** A job detail: the search result plus the cleaned (HTML-stripped) description. */
export interface JobDetailResult extends JobResult {
  description: string | null
}

/** Reshape a Remotive job into the contract search-result fields. */
export function toResult(j: RemotiveJob): JobResult {
  return {
    id: String(j.id),
    title: j.title || "(untitled)",
    company: j.company_name || null,
    // Remotive is remote-only; candidate_required_location holds the eligibility
    // geography ("Worldwide", "Europe, UK", ...) — the closest thing to a location.
    location: j.candidate_required_location || null,
    date: j.publication_date || null,
    url: j.url,
    category: j.category || null,
    job_type: j.job_type || null,
    tags: Array.isArray(j.tags) ? j.tags : [],
    salary: j.salary || null,
  }
}

/** Reshape a Remotive job into the detail result (adds the cleaned description). */
export function toDetail(j: RemotiveJob): JobDetailResult {
  return { ...toResult(j), description: cleanHtml(j.description) }
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
}

/**
 * Strip a Remotive description's HTML into readable prose: block/line-break tags
 * become newlines, entities are decoded, tags (with their inline Tailwind styles)
 * removed. Null for empty input.
 */
export function cleanHtml(html: string | null | undefined): string | null {
  if (!html) return null
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  const text = decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text || null
}

/**
 * Extract a Remotive numeric job id from a bare id or a job URL. Remotive URLs end
 * in `-<id>` (e.g. .../senior-product-engineer-fullstack-2091062), so the trailing
 * digit run is the id. Returns null when no id is present.
 */
export function parseId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return trimmed
  const ids = trimmed.match(/\d{4,}/g)
  return ids ? ids[ids.length - 1] : null
}

/**
 * Extract the Remotive category slug from a job URL when present. URLs are shaped
 * `/remote-jobs/<category-slug>/<title-slug>-<id>`; the slug lets `detail` narrow
 * its single API call to one category instead of pulling the whole feed. Null when
 * the input is a bare id or an unrecognised URL.
 */
export function categoryFromUrl(input: string): string | null {
  const m = input.match(/\/remote-jobs\/([^/]+)\/[^/]+$/)
  return m ? m[1] : null
}

/**
 * Keep only jobs published within `days` (inclusive). `days <= 0` or `>= 9999` is
 * treated as "no age filter". Undated jobs are kept (we can't prove them stale).
 */
export function filterByAge(jobs: RemotiveJob[], days: number, now: Date): RemotiveJob[] {
  if (!(days > 0) || days >= 9999) return jobs
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000
  return jobs.filter((j) => {
    if (!j.publication_date) return true
    const t = Date.parse(j.publication_date)
    return isNaN(t) ? true : t >= cutoff
  })
}

/**
 * Case-insensitive substring match of a location filter against a job's eligibility
 * geography. Empty filter keeps everything; a job with no location is dropped only
 * when a filter is set (it can't be shown to satisfy the filter).
 */
export function filterByLocation(jobs: RemotiveJob[], location: string | undefined): RemotiveJob[] {
  const needle = (location ?? "").trim().toLowerCase()
  if (!needle) return jobs
  return jobs.filter((j) => (j.candidate_required_location || "").toLowerCase().includes(needle))
}
