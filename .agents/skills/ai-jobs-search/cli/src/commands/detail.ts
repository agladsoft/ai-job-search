import { httpFetch, jobPath, parseDetailPage, parseId, writeError, type JobDetailResult } from "../helpers.js"

export interface DetailOpts {
  id: string // an ai-jobs.net "<slug>-<id>" token or a /job/<slug>-<id>/ URL
  format: "json" | "plain"
}

/**
 * ai-jobs.net detail pages are server-rendered. `detail` fetches /job/<slug>-<id>/ and
 * reads the title/location/description from the OpenGraph meta tags (the page exposes no
 * structured JobPosting and no company name).
 */
export async function runDetail(opts: DetailOpts): Promise<number> {
  const path = jobPath(opts.id)
  const id = parseId(opts.id)
  if (!path || !id) {
    writeError(`could not parse an ai-jobs.net job path from "${opts.id}" (need "<slug>-<id>" or a /job/ URL)`, "BAD_ID")
    return 1
  }
  try {
    const html = await httpFetch(path)
    if (!html) {
      writeError(`job "${id}" not found`, "NOT_FOUND")
      return 1
    }
    const detail: JobDetailResult = parseDetailPage(html, path, id, new Date())

    if (opts.format === "plain") {
      const lines: string[] = [
        detail.title,
        `${detail.location ?? "—"}${detail.remote ? " · Remote" : ""}`,
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
