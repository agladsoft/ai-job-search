import { describe, expect, test } from "bun:test"
import { parseJSON, runCLI } from "./helpers.js"

// Contract tests. The search test makes live datajobs.com requests (category pages);
// validation tests never touch the network.

interface SearchResponse {
  meta: { count: number; page: number; total: number }
  results: Array<{ id: string; title: string; url: string }>
}

describe("search (live)", () => {
  test("returns exit 0 and results in the contract shape", async () => {
    const res = await runCLI(["search", "-c", "Data-Scientist-Jobs", "--limit", "5", "--format", "json"])
    expect(res.exitCode).toBe(0)
    const body = parseJSON<SearchResponse>(res)
    expect(Array.isArray(body.results)).toBe(true)
    expect(body.results.length).toBeGreaterThan(0)
    const first = body.results[0]
    expect(first.id).toBeTruthy()
    expect(first.title).toBeTruthy()
    expect(first.url).toContain("datajobs.com")
    expect(first.url).toContain("-Job~")
  }, 30000)
})

describe("validation (no network)", () => {
  test("a non-numeric --limit exits 1 with a JSON error on stderr", async () => {
    const res = await runCLI(["search", "--limit", "abc"])
    expect(res.exitCode).toBe(1)
    expect(res.stdout).toBe("")
    expect(JSON.parse(res.stderr).code).toBe("BAD_ARG")
  })
  test("detail with no url exits 1 with a JSON error on stderr", async () => {
    const res = await runCLI(["detail"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("NO_ID")
  })
  test("detail with a bare id (no path) exits 1 BAD_ID", async () => {
    const res = await runCLI(["detail", "123456"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("BAD_ID")
  })
  test("an unknown command exits 1 with a JSON error on stderr", async () => {
    const res = await runCLI(["frobnicate"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("BAD_CMD")
  })
})
