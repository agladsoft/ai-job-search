import { describe, expect, test } from "bun:test"
import { cleanHtml, feedPath, filterByAge, parseFeed, parseId, splitTitle, toIsoDate, toResult } from "../src/helpers.js"

// Deterministic unit tests — no network. Fixture mirrors the real CrunchBoard RSS.

const FEED = `<?xml version="1.0" encoding="UTF-8"?><rss><channel>
  <item>
    <guid>https://www.crunchboard.com/jobs/545478873-software-engineer-ai-ml-specialist-at-credential-engine</guid>
    <link>https://www.crunchboard.com/jobs/545478873-software-engineer-ai-ml-specialist-at-credential-engine</link>
    <title>Software Engineer - AI/ML Specialist at Credential Engine (Washington, D.C., USA)</title>
    <description>Position Details&#10;Position Location: Remote, flexible in the United States</description>
    <pubDate>Wed, 17 Jun 2026 20:05:29 +0000</pubDate>
  </item>
  <item>
    <guid>https://www.crunchboard.com/jobs/900000001-head-of-ai-at-acme-corp-anywhere</guid>
    <link>https://www.crunchboard.com/jobs/900000001-head-of-ai-at-acme-corp-anywhere</link>
    <title>Head of AI at Acme Corp (Remote)</title>
    <description>Lead our AI org.</description>
    <pubDate>Mon, 01 Jun 2026 09:00:00 +0000</pubDate>
  </item>
</channel></rss>`

const NOW = new Date("2026-06-20T00:00:00Z")

describe("parseFeed / parseId", () => {
  test("parses every item", () => expect(parseFeed(FEED)).toHaveLength(2))
  test("extracts the numeric id from a job URL", () => {
    expect(parseId("https://www.crunchboard.com/jobs/545478873-software-engineer")).toBe("545478873")
  })
  test("passes a bare id through", () => expect(parseId("545478873")).toBe("545478873"))
})

describe("splitTitle", () => {
  test("splits 'Role at Company (Location)' on the last ' at '", () => {
    expect(splitTitle("Software Engineer - AI/ML Specialist at Credential Engine (Washington, D.C., USA)")).toEqual({
      role: "Software Engineer - AI/ML Specialist",
      company: "Credential Engine",
      location: "Washington, D.C., USA",
    })
  })
  test("handles no parens (company, no location)", () => {
    expect(splitTitle("Data Scientist at Acme")).toEqual({ role: "Data Scientist", company: "Acme", location: null })
  })
  test("handles no ' at ' (no company)", () => {
    expect(splitTitle("Just A Role")).toEqual({ role: "Just A Role", company: null, location: null })
  })
})

describe("toResult", () => {
  test("maps an item to the contract shape", () => {
    const r = toResult(parseFeed(FEED)[0])
    expect(r.id).toBe("545478873")
    expect(r.title).toBe("Software Engineer - AI/ML Specialist")
    expect(r.company).toBe("Credential Engine")
    expect(r.location).toBe("Washington, D.C., USA")
    expect(r.date).toBe("2026-06-17T20:05:29.000Z")
    expect(r.url).toContain("crunchboard.com")
  })
})

describe("toIsoDate / cleanHtml", () => {
  test("RFC-822 to ISO", () => expect(toIsoDate("Wed, 17 Jun 2026 20:05:29 +0000")).toBe("2026-06-17T20:05:29.000Z"))
  test("cleanHtml decodes and trims", () => {
    const t = cleanHtml(parseFeed(FEED)[0].description)
    expect(t).toContain("Position Location: Remote")
  })
  test("cleanHtml null for empty", () => expect(cleanHtml("")).toBeNull())
})

describe("filterByAge", () => {
  test("keeps recent, drops old", () => {
    // item1 = 2026-06-17 (3d before NOW), item2 = 2026-06-01 (19d)
    expect(filterByAge(parseFeed(FEED), 7, NOW)).toHaveLength(1)
  })
  test("sentinel disables", () => expect(filterByAge(parseFeed(FEED), 9999, NOW)).toHaveLength(2))
})

describe("feedPath", () => {
  test("server-side search feed when a query is given", () => {
    expect(feedPath("engineer")).toBe("/jobs/search.rss?q=engineer")
  })
  test("master feed when no query", () => {
    expect(feedPath(undefined)).toBe("/jobs.rss")
    expect(feedPath("")).toBe("/jobs.rss")
  })
})
