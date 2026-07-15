// Data source: ai-jobs.net — a server-rendered AI / ML / data-focused job board. Its
// listing pages carry `<li>` job cards we parse with chunked regex (each card parsed
// independently, so one malformed card can't break the rest). Every posting is an
// AI/ML/data role, which makes this a high-relevance source for AI/data leadership.
//
// Two quirks discovered during investigation:
//  - The site's keyword box does NOT filter via a GET param (`?search=` is ignored), so
//    --query/--location are applied CLIENT-SIDE. Pagination (`?page=N`) does work.
//  - The hiring company is NOT exposed on the card or the detail page (the board
//    anonymises it), so `company` is always `null`. Title/location/salary/tags/date/
//    description are all available.
//
// Base URL is swappable via AIJOBS_BASE_URL for testing/mirrors.

export const DEFAULT_BASE_URL = "https://ai-jobs.net"

/** Base URL: AIJOBS_BASE_URL (for a mirror/test) or the default. */
export function baseUrl(): string {
  const raw = (process.env.AIJOBS_BASE_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36 ai-jobs-search-skill/1.0"

/**
 * GET a page with exponential backoff on 429/5xx. Returns "" on 404. Browser UA so the
 * server returns the full HTML listing.
 */
export async function httpFetch(path: string): Promise<string> {
  const url = `${baseUrl()}${path}`
  const maxRetries = 6
  let delay = 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
        redirect: "follow",
      })
    } catch (e) {
      throw new Error(
        `could not reach ai-jobs.net at ${baseUrl()} (${e instanceof Error ? e.message : String(e)})`,
      )
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`ai-jobs.net request failed: ${response.status} ${response.statusText}`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) {
      throw new Error(`ai-jobs.net request failed: ${response.status} ${response.statusText}`)
    }
    return await response.text()
  }
  throw new Error("ai-jobs.net request failed after retries")
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** A search result in the portal-skill contract shape (missing values are null). */
export interface JobResult {
  id: string
  title: string
  company: string | null // ai-jobs.net does not expose the hiring company -> always null
  location: string | null
  date: string | null
  url: string
  job_type: string | null
  seniority: string | null
  salary: string | null
  remote: boolean
  tags: string[]
}

/** A job detail: the search-result fields plus the description (from og:description). */
export interface JobDetailResult extends JobResult {
  description: string | null
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeHtmlEntities(text: string): string {
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

/** Strip HTML tags to a single-line trimmed string, entities decoded. */
function stripInline(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
}

/**
 * Resolve a relative "Nd ago" / "Nw ago" / "today" recency string to an ISO date
 * (YYYY-MM-DD) using `now`. Returns null when unparseable.
 */
export function parseRelativeDate(raw: string, now: Date): string | null {
  const s = raw.trim().toLowerCase()
  if (!s) return null
  const ms = now.getTime()
  const day = 24 * 60 * 60 * 1000
  if (s.startsWith("today") || s.endsWith("h ago") || s.endsWith("m ago") || s.endsWith("s ago"))
    return new Date(ms).toISOString().slice(0, 10)
  if (s.startsWith("yesterday")) return new Date(ms - day).toISOString().slice(0, 10)
  const m = s.match(/^(\d+)\s*(d|w|mo|y)\b/)
  if (!m) return null
  const n = parseInt(m[1], 10)
  const mult = m[2] === "d" ? day : m[2] === "w" ? 7 * day : m[2] === "mo" ? 30 * day : 365 * day
  return new Date(ms - n * mult).toISOString().slice(0, 10)
}

/** The job id (trailing digit run) from a /job/<slug>-<id>/ path or a bare id. */
export function parseId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return trimmed
  const ids = trimmed.match(/\d{3,}/g)
  return ids ? ids[ids.length - 1] : null
}

/** The /job/<slug>/ path (without host) from a bare slug-id or a full URL. */
export function jobPath(input: string): string | null {
  const m = input.match(/\/job\/([^/?#]+)/)
  if (m) return `/job/${m[1]}/`
  // A bare "<slug>-<id>" token.
  if (/^[a-z0-9][a-z0-9-]*-\d+$/i.test(input.trim())) return `/job/${input.trim()}/`
  return null
}

/**
 * Parse an ai-jobs.net listing page into job cards. Each `<li ... position-relative ...>`
 * card is parsed independently. `now` resolves the relative dates deterministically.
 */
export function parseJobCards(html: string, now: Date): JobResult[] {
  const results: JobResult[] = []
  // Cards are <li> elements carrying the job anchor; split on the card class prefix.
  const chunks = html.split(/<li class="d-flex justify-content-between position-relative/).slice(1)
  for (const raw of chunks) {
    const chunk = raw.split("</li>")[0]

    const anchor = chunk.match(/<a class="[^"]*stretched-link[^"]*"[^>]*href="(\/job\/([^"]+?))\/"[^>]*>([\s\S]*?)<\/a>/)
    if (!anchor) continue
    const path = anchor[1] // /job/<slug-with-id>
    const slugId = anchor[2]
    const idMatch = slugId.match(/(\d+)$/)
    if (!idMatch) continue
    const id = idMatch[1]
    // Title = anchor text minus the "Featured"/"Feat." badge spans.
    const title = stripInline(anchor[3].replace(/<span class="[^"]*text-bg-primary[^"]*">[\s\S]*?<\/span>/gi, "")) || "(untitled)"

    // Salary: the text-bg-success badge whose text carries a number (the "R" remote
    // badge is also text-bg-success but is just "R").
    let salary: string | null = null
    let remote = /<span class="[^"]*text-bg-success[^"]*">\s*R\s*<\/span>/i.test(chunk) || /remote/i.test(chunk)
    for (const m of chunk.matchAll(/<span class="[^"]*text-bg-success[^"]*">([^<]*)<\/span>/gi)) {
      const txt = stripInline(m[1])
      if (/\d/.test(txt)) { salary = txt; break }
    }

    const seniority = pick(chunk, /<span class="[^"]*text-bg-warning[^"]*">([^<]*)<\/span>/) || null
    const jobType = pick(chunk, /<span class="[^"]*text-bg-secondary[^"]*">([^<]*)<\/span>/) || null
    const date = parseRelativeDate(pick(chunk, /<div class="[^"]*text-muted[^"]*">([^<]*)<\/div>/), now)

    // Location: the .text-end div that holds the place name before the date/remote badge.
    // Take the div containing the location text (strip any inner badge spans).
    let location: string | null = null
    const locDiv = chunk.match(/<div>\s*([^<]{2,}?)\s*<span class="[^"]*text-bg-success[^"]*">\s*R\s*<\/span>\s*<\/div>/i)
      || chunk.match(/<\/span>\s*<\/div>\s*<div>\s*([^<]{2,}?)\s*<\/div>\s*<div class="[^"]*text-muted/i)
    if (locDiv) location = stripInline(locDiv[1]) || null

    // Tags: classless <span>text</span> (benefit spans carry class="text-success").
    const tags: string[] = []
    for (const m of chunk.matchAll(/<span>([^<]+)<\/span>/g)) {
      const t = stripInline(m[1])
      if (t && t !== "|") tags.push(t)
    }

    results.push({
      id,
      title,
      company: null, // not exposed by ai-jobs.net
      location: location || (remote ? "Remote" : null),
      date,
      url: `${baseUrl()}${path}/`,
      job_type: jobType,
      seniority,
      salary,
      remote,
      tags,
    })
  }
  return results
}

/** First capture group of the first match, trimmed & entity-decoded, or "". */
function pick(chunk: string, re: RegExp): string {
  const m = chunk.match(re)
  return m ? stripInline(m[1]) : ""
}

/**
 * Parse a /job/<slug>-<id>/ detail page. Company is unavailable; the description comes
 * from og:description (clean, semicolon-joined summary), title/location from og:title
 * ("<Role> - <Location>").
 */
export function parseDetailPage(html: string, path: string, id: string, now: Date): JobDetailResult {
  const ogTitle = decodeHtmlEntities(pickRaw(html, /property="og:title" content="([^"]*)"/))
  const dash = ogTitle.indexOf(" - ")
  const title = dash >= 0 ? ogTitle.slice(0, dash).trim() : ogTitle.trim() || "(untitled)"
  const location = dash >= 0 ? ogTitle.slice(dash + 3).trim() || null : null
  const description = decodeHtmlEntities(pickRaw(html, /property="og:description" content="([^"]*)"/)) || null
  const remote = /remote/i.test(ogTitle) || /"og:description" content="[^"]*remote/i.test(html)

  return {
    id,
    title,
    company: null,
    location,
    date: null,
    url: `${baseUrl()}${path}`,
    job_type: null,
    seniority: null,
    salary: null,
    remote,
    tags: [],
    description,
  }
}

function pickRaw(html: string, re: RegExp): string {
  const m = html.match(re)
  return m ? m[1].trim() : ""
}

/** Keep only cards created within `days`. Sentinel (<=0 or >=9999) disables it. */
export function filterByAge(cards: JobResult[], days: number, now: Date): JobResult[] {
  if (!(days > 0) || days >= 9999) return cards
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000
  return cards.filter((c) => {
    if (!c.date) return true
    const t = Date.parse(c.date)
    return isNaN(t) ? true : t >= cutoff
  })
}

/**
 * Case-insensitive keyword filter over title/tags/seniority (the site's own keyword
 * box does not filter server-side). Empty query keeps everything.
 */
export function filterByQuery(cards: JobResult[], query: string | undefined): JobResult[] {
  const needle = (query ?? "").trim().toLowerCase()
  if (!needle) return cards
  return cards.filter((c) =>
    `${c.title} ${(c.tags || []).join(" ")} ${c.seniority ?? ""}`.toLowerCase().includes(needle),
  )
}

/** Case-insensitive substring filter over the location. Empty keeps everything. */
export function filterByLocation(cards: JobResult[], location: string | undefined): JobResult[] {
  const needle = (location ?? "").trim().toLowerCase()
  if (!needle) return cards
  return cards.filter((c) => (c.location || "").toLowerCase().includes(needle))
}
