import {
  apiGet,
  filterByAge,
  filterByLocation,
  toResult,
  writeError,
  type JobResult,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  category?: string // Remotive category slug (see /api/remote-jobs/categories)
  location?: string // client-side substring filter over candidate_required_location
  jobage: number // posted within N days (client-side; the API has no age param)
  page: number
  limit: number
  format: "json" | "table" | "plain"
}

/**
 * Build the Remotive query string. The API supports `search`, `category`, and
 * `limit` only — there is no age, location, or offset parameter — so we fetch
 * `page * limit` rows and apply age/location/paging client-side (see runSearch).
 */
function buildQuery(opts: SearchOpts): URLSearchParams {
  const p = new URLSearchParams()
  if (opts.query) p.set("search", opts.query)
  if (opts.category) p.set("category", opts.category)
  // Over-fetch enough to satisfy the requested page after client-side filtering.
  p.set("limit", String(Math.max(1, opts.page * opts.limit)))
  return p
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
    { header: "ID", width: Math.max(2, ...rows.map((r) => r.id.length)), cell: (r) => r.id },
    { header: "TITLE", width: 38, cell: (r) => r.title },
    { header: "COMPANY", width: 22, cell: (r) => r.company ?? "—" },
    { header: "LOCATION", width: 24, cell: (r) => r.location ?? "—" },
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
      `  ${r.company ?? "—"} · ${r.location ?? "—"} · ${shortDate(r.date)}`,
      `  id: ${r.id}`,
      `  ${r.url}`,
    ].join("\n")
  return rows.map(block).join("\n\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const body = await apiGet(`/api/remote-jobs?${buildQuery(opts).toString()}`)
    const all = body?.jobs ?? []

    // The API filters only by search+category; apply age and location client-side,
    // then slice the requested page. `total` reflects the post-filter count.
    const filtered = filterByLocation(filterByAge(all, opts.jobage, new Date()), opts.location)
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
