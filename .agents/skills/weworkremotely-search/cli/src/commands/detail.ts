import { fetchFeed, parseFeed, slugOf, toDetail, writeError, type JobDetailResult } from "../helpers.js"

export interface DetailOpts {
  id: string // a WWR job slug or a full job URL
  format: "json" | "plain"
}

/**
 * WWR's RSS feed carries each job's full description, so `detail` resolves from the
 * master feed by matching the job slug — one request, no HTML page fetch. A job that
 * has scrolled off the feed returns NOT_FOUND; in a scrape/rank flow the search
 * results already hold the description, so detail is rarely needed.
 */
export async function runDetail(opts: DetailOpts): Promise<number> {
  const wanted = slugOf(opts.id) // accepts a bare slug or a full URL
  if (!wanted) {
    writeError(`could not parse a WWR job slug from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const items = parseFeed(await fetchFeed("/remote-jobs.rss"))
    const item = items.find((it) => slugOf(it.link || it.guid) === wanted)
    if (!item) {
      writeError(`job "${wanted}" not found in the WWR feed (it may have expired)`, "NOT_FOUND")
      return 1
    }
    const detail: JobDetailResult = toDetail(item)

    if (opts.format === "plain") {
      const lines: string[] = [
        detail.title,
        `${detail.company ?? "—"} · ${detail.region ?? "—"}`,
        detail.date ? `Posted: ${detail.date.slice(0, 10)}` : "",
        detail.category ? `Category: ${detail.category}` : "",
        detail.job_type ? `Employment: ${detail.job_type}` : "",
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
