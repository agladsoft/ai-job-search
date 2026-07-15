import { describe, expect, test } from "bun:test"
import {
  cleanHtml,
  filterByAge,
  filterByLocation,
  filterByQuery,
  formatSalary,
  parseId,
  toResult,
  type RemoteOkJob,
} from "../src/helpers.js"

// Deterministic unit tests over the pure normalization/filter logic — no network.

function job(overrides: Partial<RemoteOkJob> = {}): RemoteOkJob {
  return {
    slug: "remote-underwriter-coralisle-group-ltd-1134826",
    id: "1134826",
    date: "2026-07-14T19:00:19+00:00",
    company: "Coralisle Group Ltd.",
    position: "Underwriter",
    tags: ["finance", "excel"],
    description: "<p>Do <strong>things</strong>.</p><ul><li>Excel</li></ul>",
    location: "Bridgetown, ",
    salary_min: 0,
    salary_max: 0,
    url: "https://remoteOK.com/remote-jobs/remote-underwriter-coralisle-group-ltd-1134826",
    ...overrides,
  }
}

describe("parseId", () => {
  test("returns a bare numeric id unchanged", () => {
    expect(parseId("1134826")).toBe("1134826")
  })
  test("extracts the trailing id from a RemoteOK job URL", () => {
    expect(parseId(job().url)).toBe("1134826")
  })
  test("returns null for input without an id", () => {
    expect(parseId("https://remoteok.com/remote-jobs")).toBeNull()
    expect(parseId("")).toBeNull()
  })
})

describe("toResult", () => {
  test("maps RemoteOK fields to the portal-skill contract shape", () => {
    const r = toResult(job())
    expect(r.id).toBe("1134826")
    expect(r.title).toBe("Underwriter") // `position` -> title
    expect(r.company).toBe("Coralisle Group Ltd.")
    expect(r.location).toBe("Bridgetown,") // trailing space trimmed
    expect(r.date).toBe("2026-07-14T19:00:19+00:00")
    expect(r.url).toContain("remoteOK.com")
  })
  test("missing values become null, never omitted", () => {
    const r = toResult(job({ company: "", location: "  " }))
    expect(r.company).toBeNull()
    expect(r.location).toBeNull()
    expect(r.salary).toBeNull()
  })
})

describe("formatSalary", () => {
  test("null when both bounds are 0/unset (RemoteOK's 'no salary')", () => {
    expect(formatSalary(0, 0)).toBeNull()
    expect(formatSalary(undefined, undefined)).toBeNull()
  })
  test("renders a range or a single bound", () => {
    expect(formatSalary(100000, 150000)).toBe("$100,000 – $150,000")
    expect(formatSalary(0, 120000)).toBe("$120,000")
  })
})

describe("cleanHtml", () => {
  test("strips tags and keeps the text", () => {
    const text = cleanHtml(job().description)
    expect(text).toContain("Do")
    expect(text).toContain("things")
    expect(text).toContain("Excel")
    expect(text).not.toContain("<")
  })
  test("returns null for empty input", () => {
    expect(cleanHtml("")).toBeNull()
  })
})

describe("filterByAge", () => {
  const now = new Date("2026-07-16T00:00:00Z")
  test("keeps recent, drops old", () => {
    const jobs = [job({ id: "1", date: "2026-07-15T00:00:00+00:00" }), job({ id: "2", date: "2026-06-01T00:00:00+00:00" })]
    expect(filterByAge(jobs, 7, now)).toHaveLength(1)
  })
  test("sentinel disables the filter", () => {
    expect(filterByAge([job({ date: "2020-01-01T00:00:00+00:00" })], 9999, now)).toHaveLength(1)
  })
})

describe("filterByQuery", () => {
  const jobs = [job({ position: "Head of AI", tags: ["ai", "ml"] }), job({ id: "2", position: "Underwriter", tags: ["finance"] })]
  test("matches over title/company/tags, case-insensitive", () => {
    expect(filterByQuery(jobs, "head of ai")).toHaveLength(1)
    expect(filterByQuery(jobs, "finance")).toHaveLength(1)
    expect(filterByQuery(jobs, "kubernetes")).toHaveLength(0)
  })
  test("empty query keeps everything", () => {
    expect(filterByQuery(jobs, "")).toHaveLength(2)
  })
})

describe("filterByLocation", () => {
  test("substring-matches the location, case-insensitive", () => {
    const jobs = [job({ location: "Bridgetown, Barbados" }), job({ id: "2", location: "Remote" })]
    expect(filterByLocation(jobs, "barbados")).toHaveLength(1)
    expect(filterByLocation(jobs, "remote")).toHaveLength(1)
    expect(filterByLocation(jobs, "berlin")).toHaveLength(0)
  })
})
