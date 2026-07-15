import { fetchFeed, parseFeed, parseId, toDetail, writeError, type JobDetailResult } from "../helpers.js"

export interface DetailOpts {
  id: string // a CrunchBoard numeric id or a full job URL
  format: "json" | "plain"
}

/**
 * The RSS feed carries each job's full description, so `detail` resolves from the master
 * feed by matching the numeric id — one request. A job that has scrolled off the (small)
 * feed returns NOT_FOUND; in a scrape/rank flow the search results already hold the body.
 */
export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = parseId(opts.id)
  if (!id) {
    writeError(`could not parse a CrunchBoard job id from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const items = parseFeed(await fetchFeed("/jobs.rss"))
    const item = items.find((it) => parseId(it.link || it.guid) === id)
    if (!item) {
      writeError(`job ${id} not found in the CrunchBoard feed (it may have expired)`, "NOT_FOUND")
      return 1
    }
    const detail: JobDetailResult = toDetail(item)
    if (opts.format === "plain") {
      const lines = [
        detail.title,
        `${detail.company ?? "—"} · ${detail.location ?? "—"}`,
        detail.date ? `Posted: ${detail.date.slice(0, 10)}` : "",
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
