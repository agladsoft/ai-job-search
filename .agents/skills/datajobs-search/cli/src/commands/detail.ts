import { fetchPage, jobPathOf, parseDetailPage, parseId, writeError, type JobDetailResult } from "../helpers.js"

export interface DetailOpts {
  id: string // a full /<Company>/<Role>-Job~<id> URL (preferred) or a bare id
  format: "json" | "plain"
}

/**
 * DataJobs detail pages are server-rendered at `/<Company>/<Role>-Job~<id>`. The full path
 * is required (a bare numeric id cannot reconstruct the company/role slug), so pass the
 * `url` from a search result. Parses the title ("Role job at Company") and body description.
 */
export async function runDetail(opts: DetailOpts): Promise<number> {
  const path = jobPathOf(opts.id)
  if (!path) {
    writeError(`datajobs detail needs the full "/<Company>/<Role>-Job~<id>" URL (a bare id is insufficient); got "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const html = await fetchPage(path)
    if (!html) {
      writeError(`job ${parseId(opts.id) ?? path} not found`, "NOT_FOUND")
      return 1
    }
    const detail: JobDetailResult = parseDetailPage(html, `${opts.id.startsWith("http") ? opts.id : "https://datajobs.com" + path}`)
    if (opts.format === "plain") {
      const lines = [
        detail.title,
        `${detail.company ?? "—"}`,
        "",
        detail.description ?? "(no description)",
        "",
        `URL: ${detail.url}`,
        `id: ${detail.id}`,
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(detail, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
