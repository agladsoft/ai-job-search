import { describe, expect, test } from "bun:test"
import {
  cleanHtml,
  feedPath,
  filterByAge,
  filterByLocation,
  filterByQuery,
  parseFeed,
  slugOf,
  splitCompanyTitle,
  toDetail,
  toIsoDate,
  toResult,
} from "../src/helpers.js"

// Deterministic unit tests over the pure RSS-parse/normalize/filter logic — no network.
// The fixture mirrors the real WWR feed: "Company: Role" titles and double-encoded
// (&lt;/&amp;amp;) description HTML.

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <item>
    <media:content url="https://x/logo.gif" type="image/png"/>
    <title>Acme Corp: Senior Platform Engineer</title>
    <region>Anywhere in the World</region>
    <country></country>
    <state>New York</state>
    <skills></skills>
    <category>Back-End Programming</category>
    <type>Full-Time</type>
    <description>&lt;p&gt;Build &amp;amp; ship &lt;strong&gt;systems&lt;/strong&gt;.&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Go&lt;/li&gt;&lt;/ul&gt;</description>
    <pubDate>Wed, 15 Jul 2026 17:35:23 +0000</pubDate>
    <guid>https://weworkremotely.com/remote-jobs/acme-corp-senior-platform-engineer</guid>
    <link>https://weworkremotely.com/remote-jobs/acme-corp-senior-platform-engineer</link>
  </item>
  <item>
    <title>SoloFounder Role Without Company Prefix</title>
    <region>Europe Only</region>
    <country>Germany</country>
    <state></state>
    <skills></skills>
    <category>Design</category>
    <type>Contract</type>
    <description>&lt;p&gt;Design things.&lt;/p&gt;</description>
    <pubDate>Mon, 01 Jun 2026 09:00:00 +0000</pubDate>
    <guid>https://weworkremotely.com/remote-jobs/solofounder-role</guid>
    <link>https://weworkremotely.com/remote-jobs/solofounder-role</link>
  </item>
</channel></rss>`

describe("parseFeed", () => {
  test("parses every <item> in the feed", () => {
    expect(parseFeed(FEED)).toHaveLength(2)
  })
  test("returns [] for markup with no items (e.g. a 301-redirected HTML page)", () => {
    expect(parseFeed("<html><body>not a feed</body></html>")).toHaveLength(0)
  })
})

describe("splitCompanyTitle", () => {
  test("splits 'Company: Role' on the first delimiter", () => {
    expect(splitCompanyTitle("Acme Corp: Senior Engineer")).toEqual({ company: "Acme Corp", role: "Senior Engineer" })
  })
  test("keeps a colon inside the role with the role", () => {
    expect(splitCompanyTitle("Acme: Lead: Payments")).toEqual({ company: "Acme", role: "Lead: Payments" })
  })
  test("no delimiter means no company", () => {
    expect(splitCompanyTitle("Just A Role")).toEqual({ company: null, role: "Just A Role" })
  })
})

describe("slugOf", () => {
  test("extracts the last path segment of a job URL", () => {
    expect(slugOf("https://weworkremotely.com/remote-jobs/acme-corp-senior-platform-engineer")).toBe(
      "acme-corp-senior-platform-engineer",
    )
  })
  test("passes a bare slug through", () => {
    expect(slugOf("acme-corp-senior-platform-engineer")).toBe("acme-corp-senior-platform-engineer")
  })
})

describe("toIsoDate", () => {
  test("converts an RFC-822 pubDate to ISO 8601", () => {
    expect(toIsoDate("Wed, 15 Jul 2026 17:35:23 +0000")).toBe("2026-07-15T17:35:23.000Z")
  })
  test("returns null for empty/unparseable input", () => {
    expect(toIsoDate("")).toBeNull()
    expect(toIsoDate("not a date")).toBeNull()
  })
})

describe("toResult", () => {
  test("maps a WWR item to the portal-skill contract shape", () => {
    const r = toResult(parseFeed(FEED)[0])
    expect(r.id).toBe("acme-corp-senior-platform-engineer")
    expect(r.title).toBe("Senior Platform Engineer")
    expect(r.company).toBe("Acme Corp")
    expect(r.location).toBe("Anywhere in the World")
    expect(r.date).toBe("2026-07-15T17:35:23.000Z")
    expect(r.url).toContain("weworkremotely.com")
  })
})

describe("toDetail / cleanHtml", () => {
  test("double-decodes the description and strips tags", () => {
    const d = toDetail(parseFeed(FEED)[0])
    expect(d.description).toContain("Build & ship") // &amp;amp; -> & across two decode passes
    expect(d.description).toContain("systems")
    expect(d.description).toContain("Go")
    expect(d.description).not.toContain("<")
    expect(d.description).not.toContain("&amp;")
  })
  test("cleanHtml returns null for empty input", () => {
    expect(cleanHtml("")).toBeNull()
  })
})

describe("filterByQuery", () => {
  const items = parseFeed(FEED)
  test("matches over title/category/skills, case-insensitive", () => {
    expect(filterByQuery(items, "platform")).toHaveLength(1)
    expect(filterByQuery(items, "design")).toHaveLength(1)
    expect(filterByQuery(items, "kubernetes")).toHaveLength(0)
  })
  test("empty query keeps everything", () => {
    expect(filterByQuery(items, "")).toHaveLength(2)
  })
})

describe("filterByAge", () => {
  const items = parseFeed(FEED)
  const now = new Date("2026-07-16T00:00:00Z")
  test("keeps recent, drops old", () => {
    // item 1 is 2026-07-15 (1 day), item 2 is 2026-06-01 (45 days)
    expect(filterByAge(items, 7, now)).toHaveLength(1)
  })
  test("sentinel disables the filter", () => {
    expect(filterByAge(items, 9999, now)).toHaveLength(2)
  })
})

describe("filterByLocation", () => {
  const items = parseFeed(FEED)
  test("substring-matches the eligibility region/country/state", () => {
    expect(filterByLocation(items, "europe")).toHaveLength(1)
    expect(filterByLocation(items, "germany")).toHaveLength(1)
    expect(filterByLocation(items, "asia")).toHaveLength(0)
  })
})

describe("feedPath", () => {
  test("maps a category slug to its per-category feed", () => {
    expect(feedPath("programming")).toBe("/categories/remote-programming-jobs.rss")
  })
  test("no category uses the master feed", () => {
    expect(feedPath(undefined)).toBe("/remote-jobs.rss")
    expect(feedPath("")).toBe("/remote-jobs.rss")
  })
})
