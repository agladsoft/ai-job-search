import { describe, expect, test } from "bun:test"
import {
  categorySlug,
  cleanHtml,
  filterByLocation,
  filterByQuery,
  jobPathOf,
  parseDetailPage,
  parseId,
  parseJobCards,
} from "../src/helpers.js"

// Deterministic unit tests over the card-parse / normalize logic — no network. Fixture
// mirrors the real datajobs.com category-page markup (note the `&#150` en-dash with no ';').

const CAT = `<div>
<div style="margin-bottom:10px; border-bottom:#ddd dashed 1px;">
  <div style="position:absolute;">&#187;</div>
  <div style="margin-left:13px; font-size:16px;">
    <a href="/Lawrence-Berkeley-National-Laboratory/Data-Science-Engineer-Job~676399"><strong>Data Science Engineer</strong> &#150 <span style="text-transform:capitalize;">Lawrence Berkeley National Laboratory </span></a>
  </div>
  <div style="margin-left:13px; font-size:12px;"> <em> <span style="text-transform:capitalize;">Berkeley, CA</span> </em> </div>
</div>
<div>
  <div style="margin-left:13px; font-size:16px;">
    <a href="/Cook-County/Director-of-Data-Science-Job~641845"><strong>Director of Data Science</strong> &#150 <span>Cook County Assessor Office </span></a>
  </div>
  <div style="margin-left:13px;"> <em> <span>Remote</span> </em> </div>
</div>
</div>`

describe("parseJobCards", () => {
  const rows = parseJobCards(CAT, "Data-Science-Jobs")
  test("parses every card", () => expect(rows).toHaveLength(2))
  test("maps the first card to the contract shape", () => {
    const r = rows[0]
    expect(r.id).toBe("676399")
    expect(r.title).toBe("Data Science Engineer")
    expect(r.company).toBe("Lawrence Berkeley National Laboratory")
    expect(r.location).toBe("Berkeley, CA")
    expect(r.url).toBe("https://datajobs.com/Lawrence-Berkeley-National-Laboratory/Data-Science-Engineer-Job~676399")
    expect(r.category).toBe("Data-Science-Jobs")
    expect(r.date).toBeNull() // cards carry no date
  })
  test("captures a leadership title + remote location", () => {
    expect(rows[1].title).toBe("Director of Data Science")
    expect(rows[1].location).toBe("Remote")
  })
})

describe("parseId / jobPathOf", () => {
  test("parseId from URL/path or bare id", () => {
    expect(parseId("https://datajobs.com/X/Data-Scientist-Job~123456")).toBe("123456")
    expect(parseId("/X/Y-Job~999")).toBe("999")
    expect(parseId("999")).toBe("999")
    expect(parseId("nope")).toBeNull()
  })
  test("jobPathOf extracts the path", () => {
    expect(jobPathOf("https://datajobs.com/X/Data-Scientist-Job~123456")).toBe("/X/Data-Scientist-Job~123456")
    expect(jobPathOf("no path here")).toBe("")
  })
})

describe("parseDetailPage", () => {
  const html = `<html><head><title>Data Science Engineer job at Lawrence Berkeley National Laboratory | DataJobs</title>
    <meta name="description" content="Build data pipelines and ML models."></head><body></body></html>`
  const d = parseDetailPage(html, "https://datajobs.com/Lawrence-Berkeley-National-Laboratory/Data-Science-Engineer-Job~676399")
  test("splits title/company from the <title> tag", () => {
    expect(d.title).toBe("Data Science Engineer")
    expect(d.company).toBe("Lawrence Berkeley National Laboratory")
    expect(d.id).toBe("676399")
  })
  test("falls back to meta description", () => {
    expect(d.description).toContain("data pipelines")
  })
})

describe("categorySlug", () => {
  test("passes a *-Jobs slug through", () => expect(categorySlug("Machine-Learning-Jobs")).toBe("Machine-Learning-Jobs"))
  test("normalizes free text", () => {
    expect(categorySlug("data architect")).toBe("Data-Architect-Jobs")
    expect(categorySlug("machine learning")).toBe("Machine-Learning-Jobs")
  })
})

describe("filters", () => {
  const rows = parseJobCards(CAT, "Data-Science-Jobs")
  test("filterByQuery over title/company/category", () => {
    expect(filterByQuery(rows, "director")).toHaveLength(1)
    expect(filterByQuery(rows, "berkeley")).toHaveLength(1)
    expect(filterByQuery(rows, "kubernetes")).toHaveLength(0)
  })
  test("filterByLocation substring", () => {
    expect(filterByLocation(rows, "remote")).toHaveLength(1)
    expect(filterByLocation(rows, "ca")).toHaveLength(1)
  })
})

describe("cleanHtml", () => {
  test("null for empty", () => expect(cleanHtml("")).toBeNull())
})
