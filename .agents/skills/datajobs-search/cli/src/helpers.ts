// Data source: datajobs.com — an old-school, server-rendered data/analytics job board.
// It has no keyword-search endpoint; jobs are browsed via category pages
// (e.g. /Data-Science-Jobs, /Machine-Learning-Jobs). This skill fetches the relevant
// category pages and parses the listing cards with chunked regex, then filters
// client-side. Job URLs are `/<Company>/<Role>-Job~<id>`; detail pages are
// server-rendered. Cards do not carry a posting date (so `date` is null on search).
//
// Base URL is swappable via DATAJOBS_BASE_URL for testing/mirrors.

export const DEFAULT_BASE_URL = "https://datajobs.com"

export function baseUrl(): string {
  const raw = (process.env.DATAJOBS_BASE_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}
export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 datajobs-search-skill/1.0"

/** The category pages searched by default (data/AI/analytics + leadership-relevant). */
export const DEFAULT_CATEGORIES = [
  "Data-Science-Jobs",
  "Machine-Learning-Jobs",
  "Data-Engineer-Jobs",
  "Data-Architect-Jobs",
  "Analytics-Jobs",
]

/** GET a page's HTML with exponential backoff on 429/5xx. "" on 404. */
export async function fetchPage(path: string): Promise<string> {
  const url = `${baseUrl()}${path}`
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow" })
    } catch (e) {
      throw new Error(`could not reach datajobs.com at ${baseUrl()} (${e instanceof Error ? e.message : String(e)})`)
    }
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) throw new Error(`datajobs.com request failed: ${response.status} ${response.statusText}`)
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) throw new Error(`datajobs.com request failed: ${response.status} ${response.statusText}`)
    return await response.text()
  }
  throw new Error("datajobs.com request failed after retries")
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  category: string | null
}
export interface JobDetailResult extends JobResult {
  description: string | null
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}
export function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);?/g, (_, d) => numericEntity(parseInt(d, 10))) // datajobs omits some ';'
    .replace(/&#[xX]([0-9a-fA-F]+);?/g, (_, h) => numericEntity(parseInt(h, 16)))
}
function stripInline(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
}

/**
 * Parse a category page's listing cards. Each card is:
 *   <a href="/<Company>/<Role>-Job~<id>"><strong>Role</strong> &#150 <span>Company</span></a>
 *   … <em><span>Location</span>
 * Parsed independently per card. `category` labels the source page.
 */
export function parseJobCards(html: string, category: string | null): JobResult[] {
  const results: JobResult[] = []
  // Anchor: role in <strong>, company in the first <span> after it (separated by an en-dash
  // "&#150", sometimes without the trailing ';'). Location is a following <em><span>…</span>,
  // grabbed from a bounded window after the anchor (not part of this match, to avoid
  // over-constraining it).
  const re = /<a href="(\/[^"]*-Job~(\d+))">\s*<strong>([\s\S]*?)<\/strong>[\s\S]{0,40}?<span[^>]*>([\s\S]*?)<\/span>\s*<\/a>/gi
  let m: RegExpExecArray | null
  const seen = new Set<string>()
  while ((m = re.exec(html)) !== null) {
    const href = m[1]
    const id = m[2]
    if (seen.has(id)) continue
    seen.add(id)
    const title = stripInline(m[3]) || "(untitled)"
    const company = stripInline(m[4]) || null
    const locM = html.slice(re.lastIndex, re.lastIndex + 260).match(/<em>\s*<span[^>]*>([\s\S]*?)<\/span>/i)
    const location = locM ? stripInline(locM[1]) || null : null
    results.push({ id, title, company, location, date: null, url: `${baseUrl()}${href}`, category })
  }
  return results
}

/** The job id from a `/…-Job~<id>` URL/path or a bare id. */
export function parseId(input: string): string | null {
  const t = input.trim()
  if (!t) return null
  const m = t.match(/-Job~(\d+)/)
  if (m) return m[1]
  return /^\d+$/.test(t) ? t : null
}

/** The `/<Company>/<Role>-Job~<id>` path from a full URL, or "" if not present. */
export function jobPathOf(input: string): string {
  const noHost = input.replace(/^https?:\/\/[^/]+/i, "") // drop scheme+host so the path is clean
  const m = noHost.match(/(\/[^"?#]*-Job~\d+)/)
  return m ? m[1] : ""
}

/** Detail: title tag is "Role job at Company"; body text is the description. */
export function parseDetailPage(html: string, url: string): JobDetailResult {
  const titleTag = stripInline((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] ?? "")
  const at = titleTag.toLowerCase().lastIndexOf(" job at ")
  const title = at >= 0 ? titleTag.slice(0, at).trim() : titleTag.replace(/\s*\|.*$/, "").trim() || "(untitled)"
  let company: string | null = null
  if (at >= 0) company = titleTag.slice(at + " job at ".length).replace(/\s*\|.*$/, "").trim() || null
  return {
    id: parseId(url) || "",
    title,
    company,
    location: null,
    date: null,
    url,
    category: null,
    description: extractDescription(html),
  }
}

/** Best-effort description: the main content block, else the meta description. */
function extractDescription(html: string): string | null {
  const body = html.match(/<div[^>]*(?:id|class)="[^"]*(?:job-?description|description|content|posting)[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
  if (body) return cleanHtml(body[1])
  const meta = html.match(/<meta name="description" content="([^"]*)"/i)
  return meta ? decodeEntities(meta[1]).trim() || null : null
}

export function cleanHtml(html: string | null | undefined): string | null {
  if (!html) return null
  const withBreaks = html.replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  const text = decodeEntities(withBreaks.replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim()
  return text || null
}

/** Case-insensitive keyword filter over title/company/category. Empty keeps all. */
export function filterByQuery(rows: JobResult[], query: string | undefined): JobResult[] {
  const needle = (query ?? "").trim().toLowerCase()
  if (!needle) return rows
  return rows.filter((r) => `${r.title} ${r.company ?? ""} ${r.category ?? ""}`.toLowerCase().includes(needle))
}
/** Case-insensitive substring over location. Empty keeps all. */
export function filterByLocation(rows: JobResult[], location: string | undefined): JobResult[] {
  const needle = (location ?? "").trim().toLowerCase()
  if (!needle) return rows
  return rows.filter((r) => (r.location || "").toLowerCase().includes(needle))
}

/** Normalize a category flag to a page slug (e.g. "machine learning" -> "Machine-Learning-Jobs"). */
export function categorySlug(category: string): string {
  const c = category.trim()
  if (/-jobs$/i.test(c)) return c
  const titled = c
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join("-")
  return `${titled}-Jobs`
}
