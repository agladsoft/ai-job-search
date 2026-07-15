// Data source: ods.ai (Open Data Science) — a data-science / ML community job board,
// CIS/Russian-origin. It is a Next.js app that embeds its data as JSON in a
// `__NEXT_DATA__` <script>, so this skill fetches the page and parses that JSON (no DOM
// scraping, no separate API). The list lives at `/jobs`
// (props.pageProps.vacancies.vacancies); a job detail at `/jobs/<uuid>` carries the full
// description. Postings are IC-heavy (ML/DS/CV engineers), often Russian-language, salaries
// frequently in RUB — a work-auth-friendly, Russian-OK niche, not a leadership board.
//
// Base URL is swappable via ODS_BASE_URL for testing/mirrors.

export const DEFAULT_BASE_URL = "https://ods.ai"

export function baseUrl(): string {
  const raw = (process.env.ODS_BASE_URL ?? "").trim()
  return (raw || DEFAULT_BASE_URL).replace(/\/+$/, "")
}
export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 ods-search-skill/1.0"

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
      throw new Error(`could not reach ods.ai at ${baseUrl()} (${e instanceof Error ? e.message : String(e)})`)
    }
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) throw new Error(`ods.ai request failed: ${response.status} ${response.statusText}`)
      await sleep(delay + Math.floor(Math.random() * 500))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) throw new Error(`ods.ai request failed: ${response.status} ${response.statusText}`)
    return await response.text()
  }
  throw new Error("ods.ai request failed after retries")
}
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Parse the `__NEXT_DATA__` JSON blob from a page's HTML. Null when absent/invalid. */
export function extractNextData(html: string): any | null {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

/** An ods.ai vacancy — the fields this skill reads (list and detail share most). */
export interface OdsVacancy {
  id: string
  title: string
  owner?: { display_name?: string } | null
  company_name?: string | null
  work_type?: string | null
  type_of_employment?: string | null
  salary_from?: number | null
  salary_to?: number | null
  salary_currency?: string | null
  salary_payment_period?: string | null
  cities?: Array<string | { name?: string }> | null
  tags?: Array<string | { name?: string }> | null
  publication_dt?: string | null
  status?: string
  description?: string | null
  about_company?: string | null
}

/** The vacancies list from a `/jobs` page (only Published ones). */
export function vacanciesFromList(html: string): OdsVacancy[] {
  const data = extractNextData(html)
  const arr: OdsVacancy[] = data?.props?.pageProps?.vacancies?.vacancies ?? []
  return Array.isArray(arr) ? arr.filter((v) => !v.status || v.status === "Published") : []
}

/** The single vacancy from a `/jobs/<id>` detail page. */
export function vacancyFromDetail(html: string): OdsVacancy | null {
  const pp = extractNextData(html)?.props?.pageProps
  if (!pp) return null
  return pp.vacancy ?? pp.vacancies?.vacancies?.[0] ?? null
}

export interface JobResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  work_type: string | null
  job_type: string | null
  salary: string | null
  tags: string[]
}
export interface JobDetailResult extends JobResult {
  description: string | null
}

function names(arr: Array<string | { name?: string }> | null | undefined): string[] {
  if (!Array.isArray(arr)) return []
  return arr.map((x) => (typeof x === "string" ? x : x?.name || "")).filter(Boolean)
}
export function formatSalary(v: OdsVacancy): string | null {
  const lo = v.salary_from && v.salary_from > 0 ? v.salary_from : 0
  const hi = v.salary_to && v.salary_to > 0 ? v.salary_to : 0
  if (!lo && !hi) return null
  const cur = v.salary_currency ? `${v.salary_currency} ` : ""
  const per = v.salary_payment_period ? `/${v.salary_payment_period.toLowerCase()}` : ""
  const amt = lo && hi ? `${lo.toLocaleString("en-US")}–${hi.toLocaleString("en-US")}` : `${(lo || hi).toLocaleString("en-US")}`
  return `${cur}${amt}${per}`
}

export function toResult(v: OdsVacancy): JobResult {
  const cities = names(v.cities)
  return {
    id: String(v.id),
    title: v.title || "(untitled)",
    company: v.company_name || v.owner?.display_name || null,
    location: cities.length ? cities.join(", ") : v.work_type || null,
    date: v.publication_dt || null,
    url: `${baseUrl()}/jobs/${v.id}`,
    work_type: v.work_type || null,
    job_type: v.type_of_employment || null,
    salary: formatSalary(v),
    tags: names(v.tags),
  }
}
export function toDetail(v: OdsVacancy): JobDetailResult {
  // The role description is sometimes left blank; fall back to the company blurb so detail
  // is not empty (both carry the useful text).
  return { ...toResult(v), description: cleanHtml(v.description) || cleanHtml(v.about_company) }
}

function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}
function decode(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, d) => numericEntity(parseInt(d, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, h) => numericEntity(parseInt(h, 16)))
}
export function cleanHtml(html: string | null | undefined): string | null {
  if (!html) return null
  const withBreaks = html.replace(/<\s*br\s*\/?>/gi, "\n").replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  const text = decode(withBreaks.replace(/<[^>]+>/g, " ")).replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim()
  return text || null
}

export function parseId(input: string): string | null {
  const t = input.trim()
  if (!t) return null
  const m = t.match(/\/jobs\/([0-9a-f-]{8,})/i)
  if (m) return m[1]
  return /^[0-9a-f-]{8,}$/i.test(t) ? t : null
}

export function filterByAge(v: OdsVacancy[], days: number, now: Date): OdsVacancy[] {
  if (!(days > 0) || days >= 9999) return v
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000
  return v.filter((x) => {
    if (!x.publication_dt) return true
    const t = Date.parse(x.publication_dt)
    return isNaN(t) ? true : t >= cutoff
  })
}
export function filterByQuery(v: OdsVacancy[], query: string | undefined): OdsVacancy[] {
  const needle = (query ?? "").trim().toLowerCase()
  if (!needle) return v
  return v.filter((x) => `${x.title} ${names(x.tags).join(" ")}`.toLowerCase().includes(needle))
}
export function filterByLocation(v: OdsVacancy[], location: string | undefined): OdsVacancy[] {
  const needle = (location ?? "").trim().toLowerCase()
  if (!needle) return v
  return v.filter((x) => `${names(x.cities).join(" ")} ${x.work_type ?? ""}`.toLowerCase().includes(needle))
}
