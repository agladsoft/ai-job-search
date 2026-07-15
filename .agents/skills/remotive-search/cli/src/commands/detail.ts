import { apiGet, categoryFromUrl, parseId, toDetail, writeError, type JobDetailResult } from "../helpers.js"

export interface DetailOpts {
  id: string // a Remotive numeric id or a /remote-jobs/<category>/<slug>-<id> URL
  format: "json" | "plain"
}

/**
 * Remotive has no per-job endpoint, so `detail` refetches the list and finds the
 * job by id. When the input is a full URL we narrow the single API call to that
 * job's category; a bare id has to scan the whole feed. Either way it is one GET —
 * keep detail lookups occasional (see the ≤4/day guidance in helpers.ts).
 */
export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = parseId(opts.id)
  if (!id) {
    writeError(`could not parse a Remotive job id from "${opts.id}"`, "BAD_ID")
    return 1
  }
  const category = categoryFromUrl(opts.id)
  try {
    const path = category
      ? `/api/remote-jobs?category=${encodeURIComponent(category)}`
      : `/api/remote-jobs`
    const body = await apiGet(path)
    const job = (body?.jobs ?? []).find((j) => String(j.id) === id)
    if (!job) {
      writeError(`job ${id} not found in the Remotive feed (it may have expired)`, "NOT_FOUND")
      return 1
    }
    const detail = toDetail(job)

    if (opts.format === "plain") {
      const lines: string[] = [
        detail.title,
        `${detail.company ?? "—"} · ${detail.location ?? "—"}`,
        detail.date ? `Posted: ${detail.date.slice(0, 10)}` : "",
        detail.category ? `Category: ${detail.category}` : "",
        detail.job_type ? `Employment: ${detail.job_type}` : "",
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
