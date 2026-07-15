import { fetchPage, parseId, toDetail, vacancyFromDetail, writeError, type JobDetailResult } from "../helpers.js"

export interface DetailOpts {
  id: string // an ods.ai vacancy uuid or a /jobs/<uuid> URL
  format: "json" | "plain"
}

/** Fetch a `/jobs/<uuid>` page and parse the vacancy (with full description) from __NEXT_DATA__. */
export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = parseId(opts.id)
  if (!id) {
    writeError(`could not parse an ods.ai vacancy id from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const html = await fetchPage(`/jobs/${encodeURIComponent(id)}`)
    if (!html) {
      writeError(`vacancy ${id} not found`, "NOT_FOUND")
      return 1
    }
    const v = vacancyFromDetail(html)
    if (!v) {
      writeError(`could not parse vacancy ${id} from the page`, "PARSE_FAILED")
      return 1
    }
    const detail: JobDetailResult = toDetail(v)
    if (opts.format === "plain") {
      const lines = [
        detail.title,
        `${detail.company ?? "—"} · ${detail.location ?? "—"}`,
        detail.date ? `Posted: ${detail.date.slice(0, 10)}` : "",
        detail.salary ? `Salary: ${detail.salary}` : "",
        detail.tags.length ? `Tags: ${detail.tags.join(", ")}` : "",
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
