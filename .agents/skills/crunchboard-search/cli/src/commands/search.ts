import {
  feedPath,
  fetchFeed,
  filterByAge,
  filterByLocation,
  parseFeed,
  toResult,
  writeError,
  type JobResult,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string
  jobage: number
  page: number
  limit: number
  format: "json" | "table" | "plain"
}

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
    { header: "TITLE", width: 42, cell: (r) => r.title },
    { header: "COMPANY", width: 22, cell: (r) => r.company ?? "—" },
    { header: "LOCATION", width: 22, cell: (r) => r.location ?? "—" },
    { header: "DATE", width: 10, cell: (r) => shortDate(r.date) },
  ]
  const row = (cells: string[]) => cells.map((c, i) => c.slice(0, columns[i].width).padEnd(columns[i].width)).join("  ")
  const header = row(columns.map((c) => c.header))
  return [header, "-".repeat(header.length), ...rows.map((r) => row(columns.map((c) => c.cell(r))))].join("\n")
}
function renderPlain(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  return rows
    .map((r) => [r.title, `  ${r.company ?? "—"} · ${r.location ?? "—"} · ${shortDate(r.date)}`, `  id: ${r.id}`, `  ${r.url}`].join("\n"))
    .join("\n\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    // CrunchBoard filters `--query` SERVER-SIDE via the search RSS; age/location are local.
    const items = parseFeed(await fetchFeed(feedPath(opts.query)))
    const filtered = filterByLocation(filterByAge(items, opts.jobage, new Date()), opts.location)
    const start = (opts.page - 1) * opts.limit
    const rows = filtered.slice(start, start + opts.limit).map(toResult)
    const total = filtered.length
    if (opts.format === "table") process.stdout.write(renderTable(rows) + "\n")
    else if (opts.format === "plain") process.stdout.write(renderPlain(rows) + "\n")
    else process.stdout.write(JSON.stringify({ meta: { count: rows.length, page: opts.page, total }, results: rows }, null, 2) + "\n")
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
