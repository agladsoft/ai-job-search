import { describe, expect, test } from "bun:test"
import {
  categoryFromUrl,
  cleanHtml,
  filterByAge,
  filterByLocation,
  parseId,
  toResult,
  type RemotiveJob,
} from "../src/helpers.js"

// Deterministic unit tests over the pure normalization/filter logic — no network.

function job(overrides: Partial<RemotiveJob> = {}): RemotiveJob {
  return {
    id: 2091062,
    url: "https://remotive.com/remote-jobs/software-development/senior-product-engineer-fullstack-2091062",
    title: "Senior Product Engineer",
    company_name: "Clipster",
    category: "Software Development",
    tags: ["golang", "react"],
    job_type: "full_time",
    publication_date: "2026-07-13T07:05:10",
    candidate_required_location: "Europe, UK, Germany",
    salary: "",
    description: "<p>Build <strong>things</strong>.</p><ul><li>Go</li><li>React</li></ul>",
    ...overrides,
  }
}

describe("parseId", () => {
  test("returns a bare numeric id unchanged", () => {
    expect(parseId("2091062")).toBe("2091062")
  })
  test("extracts the trailing id from a Remotive job URL", () => {
    expect(parseId(job().url)).toBe("2091062")
  })
  test("returns null for input without an id", () => {
    expect(parseId("https://remotive.com/remote-jobs")).toBeNull()
    expect(parseId("")).toBeNull()
  })
})

describe("categoryFromUrl", () => {
  test("extracts the category slug from a job URL", () => {
    expect(categoryFromUrl(job().url)).toBe("software-development")
  })
  test("returns null for a bare id", () => {
    expect(categoryFromUrl("2091062")).toBeNull()
  })
})

describe("toResult", () => {
  test("maps Remotive fields to the portal-skill contract shape", () => {
    const r = toResult(job())
    expect(r.id).toBe("2091062") // numeric id becomes a string
    expect(r.company).toBe("Clipster")
    expect(r.location).toBe("Europe, UK, Germany")
    expect(r.date).toBe("2026-07-13T07:05:10")
    expect(r.url).toContain("remotive.com")
  })
  test("missing values become null, never omitted", () => {
    const r = toResult(job({ company_name: "", candidate_required_location: "", salary: "" }))
    expect(r.company).toBeNull()
    expect(r.location).toBeNull()
    expect(r.salary).toBeNull()
  })
})

describe("cleanHtml", () => {
  test("strips tags and preserves list/paragraph breaks", () => {
    const text = cleanHtml(job().description)
    expect(text).toContain("Build")
    expect(text).toContain("things")
    expect(text).toContain("Go")
    expect(text).toContain("React")
    expect(text).not.toContain("<")
  })
  test("returns null for empty input", () => {
    expect(cleanHtml("")).toBeNull()
    expect(cleanHtml(null)).toBeNull()
  })
})

describe("filterByAge", () => {
  const now = new Date("2026-07-15T00:00:00Z")
  test("keeps jobs within the window", () => {
    const jobs = [job({ id: 1, publication_date: "2026-07-14T00:00:00" })]
    expect(filterByAge(jobs, 14, now)).toHaveLength(1)
  })
  test("drops jobs older than the window", () => {
    const jobs = [job({ id: 2, publication_date: "2026-06-01T00:00:00" })]
    expect(filterByAge(jobs, 14, now)).toHaveLength(0)
  })
  test("no filter when days is the sentinel", () => {
    const jobs = [job({ publication_date: "2020-01-01T00:00:00" })]
    expect(filterByAge(jobs, 9999, now)).toHaveLength(1)
  })
  test("keeps undated jobs (cannot prove stale)", () => {
    const jobs = [job({ publication_date: "" })]
    expect(filterByAge(jobs, 7, now)).toHaveLength(1)
  })
})

describe("filterByLocation", () => {
  test("matches case-insensitive substring of the eligibility geography", () => {
    const jobs = [job({ candidate_required_location: "Europe, UK" })]
    expect(filterByLocation(jobs, "europe")).toHaveLength(1)
    expect(filterByLocation(jobs, "asia")).toHaveLength(0)
  })
  test("empty filter keeps everything", () => {
    const jobs = [job(), job({ candidate_required_location: "" })]
    expect(filterByLocation(jobs, "")).toHaveLength(2)
  })
})
