import {
  feedPath,
  fetchFeed,
  filterByAge,
  filterByLocation,
  filterByQuery,
  parseFeed,
  toResult,
  writeError,
  type JobResult,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  category?: string // WWR category slug -> per-category feed
  location?: string // client-side substring over the eligibility region
  jobage: number // posted within N days (client-side over pubDate)
  page: number
  limit: number
  format: "json" | "table" | "plain"
}

/** The date portion (YYYY-MM-DD) of an ISO timestamp, or "—" when absent. */
function shortDate(date: string | null): string {
  return date ? date.slice(0, 10) : "—"
}

interface Column {
  header: string
  width: number
  cell: (r: JobResult) => string
}

function renderTable(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  const columns: Column[] = [
    { header: "TITLE", width: 40, cell: (r) => r.title },
    { header: "COMPANY", width: 24, cell: (r) => r.company ?? "—" },
    { header: "REGION", width: 22, cell: (r) => r.region ?? "—" },
    { header: "CATEGORY", width: 20, cell: (r) => r.category ?? "—" },
    { header: "DATE", width: 10, cell: (r) => shortDate(r.date) },
  ]
  const row = (cells: string[]) => cells.map((c, i) => c.slice(0, columns[i].width).padEnd(columns[i].width)).join("  ")
  const header = row(columns.map((c) => c.header))
  const body = rows.map((r) => row(columns.map((c) => c.cell(r))))
  return [header, "-".repeat(header.length), ...body].join("\n")
}

function renderPlain(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  const block = (r: JobResult) =>
    [
      r.title,
      `  ${r.company ?? "—"} · ${r.region ?? "—"} · ${shortDate(r.date)}`,
      `  id: ${r.id}`,
      `  ${r.url}`,
    ].join("\n")
  return rows.map(block).join("\n\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const xml = await fetchFeed(feedPath(opts.category))
    const items = parseFeed(xml)

    // The RSS feed has no query/age/location parameters; all filtering is client-side.
    const filtered = filterByLocation(
      filterByAge(filterByQuery(items, opts.query), opts.jobage, new Date()),
      opts.location,
    )
    const start = (opts.page - 1) * opts.limit
    const rows = filtered.slice(start, start + opts.limit).map(toResult)
    const total = filtered.length

    if (opts.format === "table") {
      process.stdout.write(renderTable(rows) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(renderPlain(rows) + "\n")
    } else {
      process.stdout.write(
        JSON.stringify({ meta: { count: rows.length, page: opts.page, total }, results: rows }, null, 2) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
