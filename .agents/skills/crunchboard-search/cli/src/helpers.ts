// Data source: CrunchBoard (TechCrunch's job board), via its public RSS feeds. Like
// weworkremotely-search this parses RSS <item> elements — but CrunchBoard supports a
// SERVER-SIDE keyword search feed (`/jobs/search.rss?q=<kw>`), so `--query` maps to the
// feed URL rather than being filtered client-side. Titles are "Role at Company
// (Location)". The corpus is small (a declined board), so results are typically few.
//
// Base URL is swappable via CRUNCHBOARD_BASE_URL for testing/mirrors.

export const DEFAULT_BASE_URL = "https://www.crunchboard.com"

export function baseUrl(): string {
  const raw = (process.env.CRUNCHBOARD_BASE_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 crunchboard-search-skill/1.0"

/**
 * GET a CrunchBoard RSS feed as text. Retries 429/5xx with exponential backoff + jitter;
 * returns "" on a 404. A malformed feed yields zero items rather than crashing.
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
      throw new Error(`could not reach CrunchBoard at ${baseUrl()} (${e instanceof Error ? e.message : String(e)})`)
    }
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) throw new Error(`CrunchBoard feed request failed: ${response.status} ${response.statusText}`)
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) throw new Error(`CrunchBoard feed request failed: ${response.status} ${response.statusText}`)
    return await response.text()
  }
  throw new Error("CrunchBoard feed request failed after retries")
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** A parsed CrunchBoard feed item (raw field text, entity-decoded). */
export interface CbItem {
  title: string
  link: string
  guid: string
  description: string
  pubDate: string
}

export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
}
export interface JobDetailResult extends JobResult {
  description: string | null
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}
export function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => numericEntity(parseInt(d, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, h) => numericEntity(parseInt(h, 16)))
    .replace(/&amp;/g, "&")
}

function tag(chunk: string, name: string): string {
  const m = chunk.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"))
  return m ? decodeEntities(m[1].trim()) : ""
}

/** Parse a CrunchBoard RSS feed into items; each <item> parsed independently. */
export function parseFeed(xml: string): CbItem[] {
  const items: CbItem[] = []
  const re = /<item>([\s\S]*?)<\/item>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const c = m[1]
    items.push({
      title: tag(c, "title"),
      link: tag(c, "link"),
      guid: tag(c, "guid"),
      description: tag(c, "description"),
      pubDate: tag(c, "pubDate"),
    })
  }
  return items
}

/** The numeric job id from a CrunchBoard URL `/jobs/<id>-<slug>` or a bare id. */
export function parseId(input: string): string | null {
  const t = input.trim()
  if (!t) return null
  if (/^\d+$/.test(t)) return t
  const m = t.match(/\/jobs\/(\d+)/)
  return m ? m[1] : null
}

/**
 * CrunchBoard titles are "Role at Company (Location)". Split on the LAST " at " (a role
 * can contain "at"), then peel a trailing "(Location)" off the company part.
 */
export function splitTitle(title: string): { role: string; company: string | null; location: string | null } {
  const idx = title.lastIndexOf(" at ")
  if (idx === -1) return { role: title.trim(), company: null, location: null }
  const role = title.slice(0, idx).trim()
  let rest = title.slice(idx + 4).trim()
  const loc = rest.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  if (loc) return { role, company: loc[1].trim() || null, location: loc[2].trim() || null }
  return { role, company: rest || null, location: null }
}

export function toIsoDate(pubDate: string): string | null {
  if (!pubDate) return null
  const t = Date.parse(pubDate)
  return isNaN(t) ? null : new Date(t).toISOString()
}

export function toResult(item: CbItem): JobResult {
  const { role, company, location } = splitTitle(item.title)
  return {
    id: parseId(item.link || item.guid) || "",
    title: role || "(untitled)",
    company,
    location,
    date: toIsoDate(item.pubDate),
    url: item.link || item.guid,
  }
}
export function toDetail(item: CbItem): JobDetailResult {
  return { ...toResult(item), description: cleanHtml(item.description) }
}

/** Strip a description's HTML/whitespace into readable prose. Null for empty. */
export function cleanHtml(html: string | null | undefined): string | null {
  if (!html) return null
  const withBreaks = html.replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  const text = decodeEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return text || null
}

/** Keep items published within `days`. Sentinel (<=0 or >=9999) disables it. */
export function filterByAge(items: CbItem[], days: number, now: Date): CbItem[] {
  if (!(days > 0) || days >= 9999) return items
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000
  return items.filter((it) => {
    const t = Date.parse(it.pubDate)
    return isNaN(t) ? true : t >= cutoff
  })
}

/** Case-insensitive substring filter over the title (which carries company+location). */
export function filterByLocation(items: CbItem[], location: string | undefined): CbItem[] {
  const needle = (location ?? "").trim().toLowerCase()
  if (!needle) return items
  return items.filter((it) => `${it.title} ${it.description}`.toLowerCase().includes(needle))
}

/**
 * Feed path. CrunchBoard supports a server-side keyword search feed; with no query it
 * returns the full (small) board feed.
 */
export function feedPath(query: string | undefined): string {
  const q = (query ?? "").trim()
  return q ? `/jobs/search.rss?q=${encodeURIComponent(q)}` : `/jobs.rss`
}
