// Data source: the RemoteOK public JSON API (https://remoteok.com/api). Like
// remotive-search it is a JSON adapter — but the response is a *bare array* whose
// FIRST element is a legal/metadata object ({last_updated, legal}), not a job; every
// following element is a job. There are no query parameters (the endpoint returns the
// latest ~100 postings), so all filtering is client-side.
//
// ⚠️ Terms: RemoteOK requires linking back to the Remote OK job URL and crediting
// Remote OK as the source, or they suspend API access. This skill is search + detail
// for personal job-hunting only — it never republishes listings. Keep volume low.
//
// Base URL is swappable via REMOTEOK_API_URL for testing/mirrors.

export const DEFAULT_BASE_URL = "https://remoteok.com"

/** API base URL: REMOTEOK_API_URL (for a mirror/test) or the default. */
export function baseUrl(): string {
  const raw = (process.env.REMOTEOK_API_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "remoteok-search-skill/1.0 (personal job search; +https://remoteok.com)"

/** A RemoteOK job — the fields this skill reads (the wire shape carries more). */
export interface RemoteOkJob {
  slug: string
  id: string
  epoch?: number
  date: string // ISO, e.g. "2026-07-14T19:00:19+00:00"
  company: string
  position: string // the job title
  tags: string[]
  description: string // HTML
  location: string
  salary_min?: number
  salary_max?: number
  url: string
  apply_url?: string
}

/**
 * GET and parse the RemoteOK JSON array, dropping the leading legal/metadata element
 * (the only element with no `id`/`position`). Retries 429/5xx with exponential
 * backoff + jitter; a connection failure fails fast with a clear message.
 */
export async function fetchJobs(): Promise<RemoteOkJob[]> {
  const url = `${baseUrl()}/api`
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
        `could not reach the RemoteOK API at ${baseUrl()} (${e instanceof Error ? e.message : String(e)})`,
      )
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`RemoteOK API request failed: ${response.status} ${response.statusText}`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (!response.ok) {
      throw new Error(`RemoteOK API request failed: ${response.status} ${response.statusText}`)
    }

    const body = (await response.json().catch(() => null)) as unknown
    if (!Array.isArray(body)) {
      throw new Error("RemoteOK API returned an unexpected response body (not an array)")
    }
    // Drop the legal/metadata element(s): a real job has both an id and a position.
    return (body as RemoteOkJob[]).filter((j) => j && j.id && j.position)
  }
  throw new Error("RemoteOK API request failed after retries")
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * A search result in the portal-skill contract shape. `id` is the RemoteOK job id
 * (what `detail <id>` consumes); missing values are `null`, never omitted. The extra
 * fields (tags/salary) are a permitted superset.
 */
export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  tags: string[]
  salary: string | null
}

/** A job detail: the search result plus the cleaned (HTML-stripped) description. */
export interface JobDetailResult extends JobResult {
  description: string | null
}

/** Reshape a RemoteOK job into the contract search-result fields. */
export function toResult(j: RemoteOkJob): JobResult {
  return {
    id: String(j.id),
    title: j.position || "(untitled)",
    company: j.company || null,
    location: (j.location || "").trim() || null,
    date: j.date || null,
    url: j.url,
    tags: Array.isArray(j.tags) ? j.tags : [],
    salary: formatSalary(j.salary_min, j.salary_max),
  }
}

/** Reshape a RemoteOK job into the detail result (adds the cleaned description). */
export function toDetail(j: RemoteOkJob): JobDetailResult {
  return { ...toResult(j), description: cleanHtml(j.description) }
}

/** Human-readable salary line, or null when unset (RemoteOK uses 0 for "no salary"). */
export function formatSalary(min?: number, max?: number): string | null {
  const lo = min && min > 0 ? min : 0
  const hi = max && max > 0 ? max : 0
  if (!lo && !hi) return null
  if (lo && hi) return `$${lo.toLocaleString("en-US")} – $${hi.toLocaleString("en-US")}`
  return `$${(lo || hi).toLocaleString("en-US")}`
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
 * Strip a RemoteOK description's HTML into readable prose: block/line-break tags
 * become newlines, entities decoded, tags removed. Null for empty input.
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
 * Extract a RemoteOK job id from a bare id or a job URL. URLs end in `-<id>`
 * (.../remote-<slug>-<id>), so the trailing digit run is the id. Null when absent.
 */
export function parseId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return trimmed
  const ids = trimmed.match(/\d{3,}/g)
  return ids ? ids[ids.length - 1] : null
}

/**
 * Keep only jobs posted within `days` (inclusive). `days <= 0` or `>= 9999` means "no
 * age filter". Undated jobs are kept (we can't prove them stale).
 */
export function filterByAge(jobs: RemoteOkJob[], days: number, now: Date): RemoteOkJob[] {
  if (!(days > 0) || days >= 9999) return jobs
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000
  return jobs.filter((j) => {
    if (!j.date) return true
    const t = Date.parse(j.date)
    return isNaN(t) ? true : t >= cutoff
  })
}

/**
 * Case-insensitive keyword filter over title, company and tags (not the full
 * description, to avoid matching boilerplate). Empty query keeps everything.
 */
export function filterByQuery(jobs: RemoteOkJob[], query: string | undefined): RemoteOkJob[] {
  const needle = (query ?? "").trim().toLowerCase()
  if (!needle) return jobs
  return jobs.filter((j) =>
    `${j.position} ${j.company} ${(j.tags || []).join(" ")}`.toLowerCase().includes(needle),
  )
}

/** Case-insensitive substring filter over the location. Empty keeps everything. */
export function filterByLocation(jobs: RemoteOkJob[], location: string | undefined): RemoteOkJob[] {
  const needle = (location ?? "").trim().toLowerCase()
  if (!needle) return jobs
  return jobs.filter((j) => (j.location || "").toLowerCase().includes(needle))
}
