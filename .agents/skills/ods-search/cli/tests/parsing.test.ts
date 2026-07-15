import { describe, expect, test } from "bun:test"
import {
  cleanHtml,
  extractNextData,
  filterByAge,
  filterByQuery,
  formatSalary,
  parseId,
  toResult,
  vacanciesFromList,
  vacancyFromDetail,
  type OdsVacancy,
} from "../src/helpers.js"

// Deterministic unit tests over the __NEXT_DATA__ parse + normalize logic — no network.

function nextDataHtml(pageProps: unknown): string {
  return `<html><body><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps } })}</script></body></html>`
}
function vac(over: Partial<OdsVacancy> = {}): OdsVacancy {
  return {
    id: "ba0ddae5-40b8-40c0-8362-a2e226eedd20",
    title: "Middle+/Senior Computer Vision Engineer",
    owner: { display_name: "Roman" },
    salary_from: 300000,
    salary_to: 400000,
    salary_currency: "RUB",
    salary_payment_period: "Month",
    status: "Published",
    publication_dt: "2026-06-14T15:16:59.696Z",
    work_type: "Remote or office",
    type_of_employment: "Full-time",
    cities: [],
    tags: ["cv", "ml"],
    ...over,
  }
}

describe("extractNextData / vacanciesFromList", () => {
  test("parses the vacancies array from __NEXT_DATA__", () => {
    const html = nextDataHtml({ vacancies: { vacancies: [vac(), vac({ id: "x", status: "Draft" })] } })
    expect(extractNextData(html)).toBeTruthy()
    // Draft is filtered out; only Published remains
    expect(vacanciesFromList(html)).toHaveLength(1)
  })
  test("empty when no __NEXT_DATA__", () => {
    expect(vacanciesFromList("<html></html>")).toHaveLength(0)
  })
})

describe("vacancyFromDetail", () => {
  test("reads the single vacancy (with description)", () => {
    const html = nextDataHtml({ vacancy: vac({ company_name: "Acme", description: "<p>Build <b>CV</b> models.</p>" }) })
    const v = vacancyFromDetail(html)
    expect(v?.company_name).toBe("Acme")
  })
})

describe("toResult", () => {
  test("maps a vacancy to the contract shape", () => {
    const r = toResult(vac())
    expect(r.id).toBe("ba0ddae5-40b8-40c0-8362-a2e226eedd20")
    expect(r.title).toContain("Computer Vision")
    expect(r.company).toBe("Roman") // owner.display_name when no company_name
    expect(r.location).toBe("Remote or office") // cities empty -> work_type
    expect(r.date).toBe("2026-06-14T15:16:59.696Z")
    expect(r.url).toBe("https://ods.ai/jobs/ba0ddae5-40b8-40c0-8362-a2e226eedd20")
    expect(r.salary).toBe("RUB 300,000–400,000/month")
  })
  test("prefers company_name over owner", () => {
    expect(toResult(vac({ company_name: "Acme" })).company).toBe("Acme")
  })
})

describe("formatSalary", () => {
  test("null when unset", () => expect(formatSalary(vac({ salary_from: 0, salary_to: 0 }))).toBeNull())
  test("renders currency + period", () => expect(formatSalary(vac())).toBe("RUB 300,000–400,000/month"))
})

describe("cleanHtml", () => {
  test("strips tags", () => {
    const t = cleanHtml("<p>Build <b>CV</b> models.</p>")
    expect(t).toContain("Build")
    expect(t).toContain("CV")
    expect(t).not.toContain("<")
  })
  test("null for empty", () => expect(cleanHtml("")).toBeNull())
})

describe("parseId", () => {
  test("bare uuid", () => expect(parseId("ba0ddae5-40b8-40c0-8362-a2e226eedd20")).toBe("ba0ddae5-40b8-40c0-8362-a2e226eedd20"))
  test("from URL", () => expect(parseId("https://ods.ai/jobs/ba0ddae5-40b8-40c0-8362-a2e226eedd20")).toBe("ba0ddae5-40b8-40c0-8362-a2e226eedd20"))
  test("null when absent", () => expect(parseId("nope")).toBeNull())
})

describe("filters", () => {
  const now = new Date("2026-06-20T00:00:00Z")
  test("filterByAge keeps recent, drops old", () => {
    const list = [vac({ publication_dt: "2026-06-14T00:00:00Z" }), vac({ id: "b", publication_dt: "2026-01-01T00:00:00Z" })]
    expect(filterByAge(list, 14, now)).toHaveLength(1)
  })
  test("filterByQuery matches title/tags", () => {
    const list = [vac({ title: "Head of AI", tags: [] }), vac({ id: "b", title: "Data Scientist", tags: ["ml"] })]
    expect(filterByQuery(list, "head of ai")).toHaveLength(1)
    expect(filterByQuery(list, "ml")).toHaveLength(1)
    expect(filterByQuery(list, "kubernetes")).toHaveLength(0)
  })
})
