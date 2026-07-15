import { describe, expect, test } from "bun:test"
import { parseJSON, runCLI } from "./helpers.js"

// Contract tests. The search test makes ONE live CrunchBoard request; validation tests
// never touch the network. Note: CrunchBoard's corpus is small, so a broad query is used.

interface SearchResponse {
  meta: { count: number; page: number; total: number }
  results: Array<{ id: string; title: string; url: string }>
}

describe("search (live)", () => {
  test("returns exit 0 and results in the contract shape", async () => {
    const res = await runCLI(["search", "-q", "engineer", "--limit", "5", "--format", "json"])
    expect(res.exitCode).toBe(0)
    const body = parseJSON<SearchResponse>(res)
    expect(Array.isArray(body.results)).toBe(true)
    // Small board; if it has any 'engineer' role the fields must be well-formed.
    if (body.results.length > 0) {
      const first = body.results[0]
      expect(first.id).toBeTruthy()
      expect(first.title).toBeTruthy()
      expect(first.url).toContain("crunchboard.com")
    }
  }, 30000)
})

describe("validation (no network)", () => {
  test("a non-numeric --limit exits 1 with a JSON error on stderr", async () => {
    const res = await runCLI(["search", "--limit", "abc"])
    expect(res.exitCode).toBe(1)
    expect(res.stdout).toBe("")
    expect(JSON.parse(res.stderr).code).toBe("BAD_ARG")
  })
  test("detail with no id exits 1 with a JSON error on stderr", async () => {
    const res = await runCLI(["detail"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("NO_ID")
  })
  test("an unknown command exits 1 with a JSON error on stderr", async () => {
    const res = await runCLI(["frobnicate"])
    expect(res.exitCode).toBe(1)
    expect(JSON.parse(res.stderr).code).toBe("BAD_CMD")
  })
})
