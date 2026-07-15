// Data source: Hubstaff Talent (https://hubstafftalent.net), a free freelance/remote
// job marketplace. Its search results are rendered client-side, BUT the same
// /search/jobs endpoint returns a server-rendered Rails-UJS fragment when called as
// an XHR (`X-Requested-With: XMLHttpRequest`, `Accept: text/javascript`): a
// `$('#results').html("<...>")` string we unwrap and parse with chunked regex — so
// this stays a zero-dependency Bun CLI, no headless browser required. Job detail
// pages (/jobs/<slug>) are server-rendered and fetched plainly.
//
// ⚠️ Personal use only. Hubstaff Talent is a freelance marketplace; this skill reads
// public search results at low volume for personal job-hunting. Keep it to a handful
// of requests, no bulk crawling, no commercial/republishing use.
//
// Base URL is swappable via HUBSTAFF_BASE_URL for testing/mirrors.

export const DEFAULT_BASE_URL = "https://hubstafftalent.net"

/** Base URL: HUBSTAFF_BASE_URL (for a mirror/test) or the default. */
export function baseUrl(): string {
  const raw = (process.env.HUBSTAFF_BASE_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 hubstafftalent-search-skill/1.0"

/**
 * GET a URL with exponential backoff on 429/5xx. `xhr` adds the headers that make
 * /search/jobs return its server-rendered results fragment. Returns "" on 404.
 */
export async function httpFetch(path: string, xhr = false): Promise<string> {
  const url = `${baseUrl()}${path}`
  const maxRetries = 6
  let delay = 500

  const headers: Record<string, string> = { "User-Agent": UA }
  if (xhr) {
    headers["X-Requested-With"] = "XMLHttpRequest"
    headers["Accept"] = "text/javascript, text/html, application/xml, */*"
  } else {
    headers["Accept"] = "text/html,application/xhtml+xml"
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, { headers, redirect: "follow" })
    } catch (e) {
      throw new Error(
        `could not reach Hubstaff Talent at ${baseUrl()} (${e instanceof Error ? e.message : String(e)})`,
      )
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Hubstaff request failed: ${response.status} ${response.statusText}`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) {
      throw new Error(`Hubstaff request failed: ${response.status} ${response.statusText}`)
    }
    return await response.text()
  }
  throw new Error("Hubstaff request failed after retries")
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * Un-escape a Rails `escape_javascript` string literal. Handles the standard escapes
 * (\n \r \t \b \f \" \' \\ and \uXXXX/\xXX), and drops the backslash before any other
 * character — so `<\/div>` -> `</div>` and `\$30/hr` -> `$30/hr` (Rails escapes `$`,
 * which is invalid JSON, so we cannot rely on JSON.parse here).
 */
function unescapeJs(s: string): string {
  return s.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_, esc: string) => {
    const head = esc[0]
    if (head === "u" || head === "x") return numericEntity(parseInt(esc.slice(1), 16))
    switch (esc) {
      case "n": return "\n"
      case "r": return "\r"
      case "t": return "\t"
      case "b": return "\b"
      case "f": return "\f"
      case "0": return "\0"
      default: return esc // \" -> ", \/ -> /, \\ -> \, \$ -> $
    }
  })
}

/**
 * Unwrap the `$('#results').html("<...>")` UJS fragment into the raw results HTML.
 * We locate the argument of the `#results` .html(...) call, find the end of the JS
 * string literal, and un-escape it. Returns "" when the marker is absent (e.g. an
 * unexpected response), so the parser degrades to zero results.
 */
export function extractResultsHtml(fragment: string): string {
  const anchor = fragment.indexOf("#results")
  const openIdx = anchor >= 0 ? fragment.indexOf('.html("', anchor) : fragment.indexOf('.html("')
  if (openIdx < 0) return ""
  const start = openIdx + '.html("'.length
  const rest = fragment.slice(start)
  // End of the JS string literal: the first double-quote not escaped by a backslash.
  const endRel = rest.search(/(?<!\\)"/)
  const body = endRel >= 0 ? rest.slice(0, endRel) : rest
  return unescapeJs(body)
}

/** A search result in the portal-skill contract shape (missing values are null). */
export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  job_type: string | null
  pay_rate: string | null
  remote: boolean
  skills: string[]
  snippet: string | null
}

/** A job detail: the search-result fields plus the full (stripped) description. */
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

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

/**
 * Hubstaff prints the created date as "Jul 14" with no year. Resolve it to ISO
 * YYYY-MM-DD by assuming the most recent occurrence: this year unless that date is in
 * the future (then last year). Returns null when unparseable.
 */
export function parseCreatedDate(raw: string, now: Date): string | null {
  const m = raw.trim().match(/([A-Za-z]{3})\s+(\d{1,2})/)
  if (!m) return null
  const mon = MONTHS[m[1].toLowerCase()]
  if (mon === undefined) return null
  const day = parseInt(m[2], 10)
  let year = now.getUTCFullYear()
  const asDate = Date.UTC(year, mon, day)
  // Allow a small future skew (timezone), else roll back a year.
  if (asDate > now.getTime() + 2 * 24 * 60 * 60 * 1000) year -= 1
  const d = new Date(Date.UTC(year, mon, day))
  return d.toISOString().slice(0, 10)
}

/** First capture group of the first match, trimmed & entity-decoded, or "". */
function pick(chunk: string, re: RegExp): string {
  const m = chunk.match(re)
  return m ? stripInline(m[1]) : ""
}

/**
 * Parse the results HTML into job cards. Each `.search-result` block is parsed
 * independently, so one malformed card cannot break the rest (the portal-skill
 * chunked-parse contract). `now` resolves the year-less created dates deterministically.
 */
export function parseJobCards(html: string, now: Date): JobResult[] {
  const results: JobResult[] = []
  // Split on the card boundary; the first slice is the pre-card header, drop it.
  const chunks = html.split('<div class="search-result">').slice(1)
  for (const raw of chunks) {
    // Bound the chunk to a single card (up to the next card or the container end).
    const chunk = raw.split('<div class="search-result">')[0]

    const nameM = chunk.match(/<a class="name[^"]*"[^>]*href="\/jobs\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/)
    if (!nameM) continue // no title/slug -> not a real card
    const slug = nameM[1]
    const title = stripInline(nameM[2]) || "(untitled)"

    const company = pick(chunk, /<a class="[^"]*job-agency[^"]*"[^>]*>([\s\S]*?)<\/a>/) || null
    // Location: the .location span, with the "HQ:" label and pin icon stripped out.
    const locRaw = (chunk.match(/<span class="location[^"]*">([\s\S]*?)<\/span>/) || [])[1] ?? ""
    const location = stripInline(locRaw.replace(/<strong>[^<]*<\/strong>/gi, "")).replace(/^:\s*/, "") || null

    const jobType = pick(chunk, /<span class="label[^"]*">([\s\S]*?)<\/span>/) || null
    const payRate = pick(chunk, /<div class="pay-rate">([\s\S]*?)<\/div>/) || null
    const remote = /title="Remote job"/i.test(chunk)
    const createdRaw = (chunk.match(/title="Created"[^>]*><\/i>\s*([A-Za-z]{3}\s+\d{1,2})/) || [])[1] ?? ""
    const date = parseCreatedDate(createdRaw, now)
    const snippet = pick(chunk, /<div class="profil-bio[^"]*">([\s\S]*?)<\/div>/) || null

    const skills: string[] = []
    const skillRe = /<a class="tag[^"]*"[^>]*>([\s\S]*?)<\/a>/g
    let sm: RegExpExecArray | null
    while ((sm = skillRe.exec(chunk)) !== null) {
      const s = stripInline(sm[1])
      if (s) skills.push(s)
    }

    results.push({
      id: slug,
      title,
      company,
      location: location || (remote ? "Remote" : null),
      date,
      url: `${baseUrl()}/jobs/${slug}`,
      job_type: jobType,
      pay_rate: payRate,
      remote,
      skills,
      snippet,
    })
  }
  return results
}

/** The job slug from a bare slug or a /jobs/<slug> URL. */
export function slugOf(input: string): string {
  const path = input.split(/[?#]/)[0].replace(/\/+$/, "")
  const seg = path.split("/").pop() ?? ""
  return seg
}

/**
 * Parse a server-rendered /jobs/<slug> detail page into a detail result. The full
 * body lives in `.job-description`; the title/company come from the `<title>` tag
 * ("<Role> job at <Company>").
 */
export function parseDetailPage(html: string, slug: string, now: Date): JobDetailResult {
  const titleTag = stripInline((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] ?? "")
  const atIdx = titleTag.toLowerCase().lastIndexOf(" job at ")
  const title = atIdx >= 0 ? titleTag.slice(0, atIdx).trim() : titleTag || "(untitled)"
  const company = atIdx >= 0 ? titleTag.slice(atIdx + " job at ".length).trim() || null : null

  const descM = html.match(/<div class="job-description[^"]*">([\s\S]*?)<\/div>/)
  const description = cleanHtml(descM ? descM[1] : null)

  const remote = /title="Remote job"|Remote job/i.test(html)
  const locRaw = (html.match(/<span class="location[^"]*">([\s\S]*?)<\/span>/) || [])[1] ?? ""
  const location = stripInline(locRaw.replace(/<strong>[^<]*<\/strong>/gi, "")).replace(/^:\s*/, "") || (remote ? "Remote" : null)

  return {
    id: slug,
    title,
    company,
    location,
    date: null, // the detail page does not reliably carry the created date
    url: `${baseUrl()}/jobs/${slug}`,
    job_type: null,
    pay_rate: null,
    remote,
    skills: [],
    snippet: null,
    description,
  }
}

/**
 * Strip a job-description's HTML into readable prose: block/line-break tags become
 * newlines, entities decoded, tags removed. Null for empty input.
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

/** Case-insensitive substring filter over the location. Empty keeps everything. */
export function filterByLocation(cards: JobResult[], location: string | undefined): JobResult[] {
  const needle = (location ?? "").trim().toLowerCase()
  if (!needle) return cards
  return cards.filter((c) => (c.location || "").toLowerCase().includes(needle))
}

/** Build the /search/jobs query string for a keyword + page. */
export function searchPath(query: string | undefined, page: number): string {
  const p = new URLSearchParams()
  p.set("search[keywords]", query ?? "")
  p.set("page", String(page))
  return `/search/jobs?${p.toString()}`
}
