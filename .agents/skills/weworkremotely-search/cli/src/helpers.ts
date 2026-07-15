// Data source: the We Work Remotely (WWR) public RSS feeds. Unlike the JSON-API
// adapters (freehire/remotive) and the HTML-scraping portals (linkedin/jobindex),
// WWR publishes RSS 2.0 — so this skill fetches an XML feed and parses <item>
// elements into the portal-skill contract. Every WWR posting is a remote role.
//
// The master feed (remote-jobs.rss) carries all categories; per-category feeds live
// at categories/remote-<slug>-jobs.rss. Each <item> already contains the full
// (entity-encoded HTML) description, so there is no separate detail request.
//
// Base URL is swappable via WWR_BASE_URL for testing/mirrors.

export const DEFAULT_BASE_URL = "https://weworkremotely.com"

/** Base URL: WWR_BASE_URL (for a mirror/test) or the default. */
export function baseUrl(): string {
  const raw = (process.env.WWR_BASE_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) weworkremotely-search-skill/1.0"

/**
 * GET a WWR RSS feed as text. Retries 429/5xx with exponential backoff + jitter;
 * returns "" on a 404 (a missing feed is empty, not an error). A bad category slug
 * 301-redirects to an HTML page — that has no <item> elements, so parseFeed yields
 * zero results rather than crashing.
 */
export async function fetchFeed(path: string): Promise<string> {
  const url = `${baseUrl()}${path}`
  const maxRetries = 6
  let delay = 500

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let response: Response
    try {
      response = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml" },
        redirect: "follow",
      })
    } catch (e) {
      throw new Error(
        `could not reach We Work Remotely at ${baseUrl()} (${e instanceof Error ? e.message : String(e)})`,
      )
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`WWR feed request failed: ${response.status} ${response.statusText}`)
      }
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) {
      throw new Error(`WWR feed request failed: ${response.status} ${response.statusText}`)
    }
    return await response.text()
  }
  throw new Error("WWR feed request failed after retries")
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** A parsed WWR feed item (raw field text, XML-entity-decoded). */
export interface WwrItem {
  title: string
  region: string
  country: string
  state: string
  skills: string
  category: string
  type: string
  pubDate: string
  link: string
  guid: string
  description: string
}

/**
 * A search result in the portal-skill contract shape. `id` is the WWR job slug (the
 * last path segment of the job URL) — what `detail <id>` consumes; missing values
 * are `null`, never omitted. The extra fields (category/job_type/region) are a
 * permitted superset.
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
  region: string | null
}

/** A job detail: the search result plus the cleaned (HTML-stripped) description. */
export interface JobDetailResult extends JobResult {
  description: string | null
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

/**
 * Decode XML/HTML entities. WWR double-encodes description markup (the feed carries
 * `&amp;lt;p&amp;gt;`), so callers decode once to recover the HTML, then cleanHtml
 * decodes again while stripping tags — two passes total.
 */
export function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&amp;/g, "&") // last: so &amp;lt; -> &lt; on this pass, decoded on the next
}

/** Extract the text of a single-occurrence tag from an item chunk, decoded. */
function tag(chunk: string, name: string): string {
  const m = chunk.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"))
  return m ? decodeEntities(m[1].trim()) : ""
}

/**
 * Parse a WWR RSS feed into items. Each <item>...</item> is parsed independently, so
 * one malformed item cannot break the rest (the portal-skill chunked-parse contract).
 */
export function parseFeed(xml: string): WwrItem[] {
  const items: WwrItem[] = []
  const re = /<item>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const c = m[1]
    items.push({
      title: tag(c, "title"),
      region: tag(c, "region"),
      country: tag(c, "country"),
      state: tag(c, "state"),
      skills: tag(c, "skills"),
      category: tag(c, "category"),
      type: tag(c, "type"),
      pubDate: tag(c, "pubDate"),
      link: tag(c, "link"),
      guid: tag(c, "guid"),
      description: tag(c, "description"),
    })
  }
  return items
}

/** The slug (last path segment) of a WWR job URL — used as the contract `id`. */
export function slugOf(url: string): string {
  const path = url.split(/[?#]/)[0].replace(/\/+$/, "")
  const seg = path.split("/").pop() ?? ""
  return seg
}

/**
 * WWR titles are "Company: Role". Split on the FIRST ": " so a colon inside the role
 * stays with the role. A title with no delimiter has no company (returns null).
 */
export function splitCompanyTitle(title: string): { company: string | null; role: string } {
  const idx = title.indexOf(": ")
  if (idx === -1) return { company: null, role: title.trim() }
  return { company: title.slice(0, idx).trim() || null, role: title.slice(idx + 2).trim() }
}

/** RFC-822 pubDate -> ISO 8601, or null when absent/unparseable. */
export function toIsoDate(pubDate: string): string | null {
  if (!pubDate) return null
  const t = Date.parse(pubDate)
  return isNaN(t) ? null : new Date(t).toISOString()
}

/** Reshape a WWR item into the contract search-result fields. */
export function toResult(item: WwrItem): JobResult {
  const { company, role } = splitCompanyTitle(item.title)
  return {
    id: slugOf(item.link || item.guid),
    title: role || "(untitled)",
    company,
    location: item.region || null, // eligibility geography, not an office
    date: toIsoDate(item.pubDate),
    url: item.link || item.guid,
    category: item.category || null,
    job_type: item.type || null,
    region: item.region || null,
  }
}

/** Reshape a WWR item into the detail result (adds the cleaned description). */
export function toDetail(item: WwrItem): JobDetailResult {
  return { ...toResult(item), description: cleanHtml(item.description) }
}

/**
 * Strip a WWR description into readable prose. The item text was XML-decoded once by
 * `tag()`, leaving HTML; here block/line-break tags become newlines, a second entity
 * decode resolves the inner `&amp;`-escapes, and tags are removed. Null for empty.
 */
export function cleanHtml(html: string | null | undefined): string | null {
  if (!html) return null
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  const text = decodeEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text || null
}

/**
 * Keep only items published within `days` (inclusive). `days <= 0` or `>= 9999` means
 * "no age filter". Undated items are kept (we can't prove them stale).
 */
export function filterByAge(items: WwrItem[], days: number, now: Date): WwrItem[] {
  if (!(days > 0) || days >= 9999) return items
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000
  return items.filter((it) => {
    const t = Date.parse(it.pubDate)
    return isNaN(t) ? true : t >= cutoff
  })
}

/**
 * Case-insensitive keyword filter over an item's title, category and skills (not the
 * full description, to avoid matching boilerplate). Empty query keeps everything.
 */
export function filterByQuery(items: WwrItem[], query: string | undefined): WwrItem[] {
  const needle = (query ?? "").trim().toLowerCase()
  if (!needle) return items
  return items.filter((it) =>
    `${it.title} ${it.category} ${it.skills}`.toLowerCase().includes(needle),
  )
}

/** Case-insensitive substring filter over the eligibility region. Empty keeps all. */
export function filterByLocation(items: WwrItem[], location: string | undefined): WwrItem[] {
  const needle = (location ?? "").trim().toLowerCase()
  if (!needle) return items
  return items.filter((it) => `${it.region} ${it.country} ${it.state}`.toLowerCase().includes(needle))
}

/** Feed path for a category slug, or the master feed when no category is given. */
export function feedPath(category: string | undefined): string {
  const slug = (category ?? "").trim().toLowerCase()
  return slug ? `/categories/remote-${slug}-jobs.rss` : `/remote-jobs.rss`
}
