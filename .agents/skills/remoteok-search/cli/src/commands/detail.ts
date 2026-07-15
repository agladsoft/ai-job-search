import { fetchJobs, parseId, toDetail, writeError, type JobDetailResult } from "../helpers.js"

export interface DetailOpts {
  id: string // a RemoteOK numeric id or a job URL
  format: "json" | "plain"
}

/**
 * RemoteOK has no per-job endpoint, so `detail` fetches the feed and finds the job by
 * id (one GET). The feed already carries each job's full description, so in a
 * scrape/rank flow the search results usually suffice and `detail` is rarely needed.
 */
export async function runDetail(opts: DetailOpts): Promise<number> {
  const id = parseId(opts.id)
  if (!id) {
    writeError(`could not parse a RemoteOK job id from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const job = (await fetchJobs()).find((j) => String(j.id) === id)
    if (!job) {
      writeError(`job ${id} not found in the RemoteOK feed (it may have expired)`, "NOT_FOUND")
      return 1
    }
    const detail: JobDetailResult = toDetail(job)

    if (opts.format === "plain") {
      const lines: string[] = [
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
