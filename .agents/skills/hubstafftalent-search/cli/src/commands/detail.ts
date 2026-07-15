import { httpFetch, parseDetailPage, slugOf, writeError, type JobDetailResult } from "../helpers.js"

export interface DetailOpts {
  id: string // a Hubstaff job slug or a /jobs/<slug> URL
  format: "json" | "plain"
}

/**
 * Hubstaff job detail pages (/jobs/<slug>) are server-rendered, so `detail` fetches
 * the page plainly and parses `.job-description` for the full body and `<title>` for
 * the title/company. One request.
 */
export async function runDetail(opts: DetailOpts): Promise<number> {
  const slug = slugOf(opts.id)
  if (!slug) {
    writeError(`could not parse a Hubstaff job slug from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const html = await httpFetch(`/jobs/${encodeURIComponent(slug)}`, false)
    if (!html) {
      writeError(`job "${slug}" not found`, "NOT_FOUND")
      return 1
    }
    const detail: JobDetailResult = parseDetailPage(html, slug, new Date())

    if (opts.format === "plain") {
      const lines: string[] = [
        detail.title,
        `${detail.company ?? "—"} · ${detail.location ?? "—"}`,
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
