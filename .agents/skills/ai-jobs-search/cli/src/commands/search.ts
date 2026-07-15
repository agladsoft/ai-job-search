import {
  filterByAge,
  filterByLocation,
  filterByQuery,
  httpFetch,
  parseJobCards,
  writeError,
  type JobResult,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  location?: string // client-side substring over the card location
  jobage: number // created within N days (client-side over the parsed relative date)
  page: number
  limit: number
  format: "json" | "table" | "plain"
}

/** The date portion, or "—" when absent. */
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
    { header: "ID", width: Math.max(2, ...rows.map((r) => r.id.length)), cell: (r) => r.id },
    { header: "TITLE", width: 40, cell: (r) => r.title },
    { header: "LOCATION", width: 26, cell: (r) => r.location ?? "—" },
    { header: "LEVEL", width: 14, cell: (r) => r.seniority ?? "—" },
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
      `  ${r.location ?? "—"} · ${r.seniority ?? "—"} · ${r.salary ?? "—"} · ${shortDate(r.date)}`,
      `  id: ${r.id}`,
      `  ${r.url}`,
    ].join("\n")
  return rows.map(block).join("\n\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    // ai-jobs.net has no working keyword GET param; --page maps to ?page=N, and
    // --query/--location/--jobage are applied client-side to that page's cards.
    const html = await httpFetch(`/?page=${opts.page}`)
    const cards = parseJobCards(html, new Date())

    const filtered = filterByLocation(filterByAge(filterByQuery(cards, opts.query), opts.jobage, new Date()), opts.location)
    const rows = filtered.slice(0, opts.limit)
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
