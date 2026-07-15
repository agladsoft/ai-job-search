import {
  DEFAULT_CATEGORIES,
  categorySlug,
  fetchPage,
  filterByLocation,
  filterByQuery,
  parseJobCards,
  writeError,
  type JobResult,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  category?: string
  location?: string
  jobage: number // accepted but unused — cards carry no date (documented)
  page: number
  limit: number
  format: "json" | "table" | "plain"
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
    { header: "COMPANY", width: 26, cell: (r) => r.company ?? "—" },
    { header: "LOCATION", width: 24, cell: (r) => r.location ?? "—" },
  ]
  const row = (cells: string[]) => cells.map((c, i) => c.slice(0, columns[i].width).padEnd(columns[i].width)).join("  ")
  const header = row(columns.map((c) => c.header))
  return [header, "-".repeat(header.length), ...rows.map((r) => row(columns.map((c) => c.cell(r))))].join("\n")
}
function renderPlain(rows: JobResult[]): string {
  if (rows.length === 0) return "No results."
  return rows.map((r) => [r.title, `  ${r.company ?? "—"} · ${r.location ?? "—"}`, `  id: ${r.id}`, `  ${r.url}`].join("\n")).join("\n\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    // No server keyword search — fetch category page(s), merge, then filter client-side.
    const cats = opts.category ? [categorySlug(opts.category)] : DEFAULT_CATEGORIES
    const pages = await Promise.all(cats.map((c) => fetchPage(`/${c}`).then((h) => parseJobCards(h, c)).catch(() => [] as JobResult[])))
    // Merge + dedup by id (a job can appear in multiple categories).
    const byId = new Map<string, JobResult>()
    for (const r of pages.flat()) if (!byId.has(r.id)) byId.set(r.id, r)
    const all = [...byId.values()]

    const filtered = filterByLocation(filterByQuery(all, opts.query), opts.location)
    const start = (opts.page - 1) * opts.limit
    const rows = filtered.slice(start, start + opts.limit)
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
