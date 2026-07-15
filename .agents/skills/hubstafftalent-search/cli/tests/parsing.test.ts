import { describe, expect, test } from "bun:test"
import {
  cleanHtml,
  extractResultsHtml,
  filterByAge,
  filterByLocation,
  parseCreatedDate,
  parseDetailPage,
  parseJobCards,
  searchPath,
  slugOf,
} from "../src/helpers.js"

// Deterministic unit tests over the pure fragment-unwrap / card-parse / normalize logic
// — no network. The fixtures mirror the real Hubstaff markup captured during build.

const CARD_HTML = `<div class="content-section"><h5>Displaying <b>(1 - 15)</b> of <b>745</b> results</h5>
<div class="search-result"><div class="main-details">
  <a class="name margin-right-10" rel="nofollow" href="/jobs/structural-design-engineer-2">Structural Design Engineer </a>
  <span class="label label-hourly margin-left-5">hourly</span>
  <div class="pay-rate">$15/hr</div>
  <div class="clearfix"></div>
  <div class="job-company">
    <a class="is-inline-block job-agency" rel="nofollow" target="_blank" href="https://structwell.com.au/"><i class="hi hi-agency" title="Client"></i> Structwell Engineers</a>
    <span class="location text-success"><i class="hi hi-pin" title="From"></i> <strong>HQ:</strong> Busselton, Western Australia, Australia</span>
    <span class="nowrap"><i class="hi hi-remote" title="Remote job"></i> Remote job</span>
    <span><i class="hi hi-calendar" title="Created"></i> Jul 14</span>
  </div>
  <div class="profil-bio push-bottom-10">Structwell Engineers is a growing consultancy. We specialise in Structur...</div>
  <div class="list-inline"><li><a class="tag tag-sm" href="/search/jobs?x=1">ETABS</a></li><li><a class="tag tag-sm" href="/search/jobs?x=2">AutoCAD</a></li></div>
</div></div>
<div class="search-result"><div class="main-details">
  <a class="name" rel="nofollow" href="/jobs/product-designer-868414">Product Designer</a>
  <span class="label label-full_time">full time</span>
  <div class="pay-rate">$30/hr</div>
  <div class="job-company">
    <a class="job-agency" href="http://x.com"><i class="hi hi-agency"></i> Coldwell Banker Watson &amp; Knox</a>
    <span class="location"><i class="hi hi-pin"></i> <strong>HQ:</strong> New York, United States</span>
    <span><i class="hi hi-calendar" title="Created"></i> Dec 20</span>
  </div>
  <div class="profil-bio">Design things.</div>
</div></div></div>`

const NOW = new Date("2026-07-15T12:00:00Z")

describe("extractResultsHtml", () => {
  test("unwraps the $('#results').html(\"...\") UJS fragment", () => {
    const frag = `$('#results').html("<div class=\\"x\\">a \\"b\\" c<\\/div>");`
    expect(extractResultsHtml(frag)).toBe('<div class="x">a "b" c</div>')
  })
  test("drops the backslash Rails puts before $ (invalid JSON escape)", () => {
    const frag = `$('#results').html("<div class=\\"pay-rate\\">\\$30/hr<\\/div>");`
    expect(extractResultsHtml(frag)).toBe('<div class="pay-rate">$30/hr</div>')
  })
  test("returns '' when the marker is absent", () => {
    expect(extractResultsHtml("some other javascript();")).toBe("")
  })
})

describe("parseJobCards", () => {
  const cards = parseJobCards(CARD_HTML, NOW)

  test("parses every .search-result card independently", () => {
    expect(cards).toHaveLength(2)
  })
  test("maps the first card to the contract shape", () => {
    const c = cards[0]
    expect(c.id).toBe("structural-design-engineer-2")
    expect(c.title).toBe("Structural Design Engineer") // trailing space trimmed
    expect(c.company).toBe("Structwell Engineers") // icon stripped
    expect(c.location).toBe("Busselton, Western Australia, Australia") // HQ: label stripped
    expect(c.remote).toBe(true)
    expect(c.pay_rate).toBe("$15/hr")
    expect(c.job_type).toBe("hourly")
    expect(c.date).toBe("2026-07-14")
    expect(c.url).toContain("/jobs/structural-design-engineer-2")
    expect(c.skills).toEqual(["ETABS", "AutoCAD"])
  })
  test("decodes entities in the company name", () => {
    expect(cards[1].company).toBe("Coldwell Banker Watson & Knox")
  })
  test("a year-less future date (Dec 20) rolls back to last year", () => {
    expect(cards[1].date).toBe("2025-12-20")
  })
})

describe("parseCreatedDate", () => {
  test("resolves a recent month/day to this year", () => {
    expect(parseCreatedDate("Jul 14", NOW)).toBe("2026-07-14")
  })
  test("resolves a future month/day to last year", () => {
    expect(parseCreatedDate("Dec 20", NOW)).toBe("2025-12-20")
  })
  test("returns null for unparseable input", () => {
    expect(parseCreatedDate("", NOW)).toBeNull()
    expect(parseCreatedDate("yesterday", NOW)).toBeNull()
  })
})

describe("slugOf", () => {
  test("extracts the slug from a /jobs/<slug> URL", () => {
    expect(slugOf("https://hubstafftalent.net/jobs/product-designer-868414")).toBe("product-designer-868414")
  })
  test("passes a bare slug through", () => {
    expect(slugOf("product-designer-868414")).toBe("product-designer-868414")
  })
})

describe("parseDetailPage", () => {
  const html = `<html><head><title>Structural Design Engineer  job at Structwell Engineers</title></head>
    <body><span class="location"><i class="hi hi-pin"></i> <strong>HQ:</strong> Busselton, Australia</span>
    <div class="job-description push-bottom-30 text-light-grey"><p>Build <strong>bridges</strong>.</p><ul><li>AutoCAD</li></ul></div></body></html>`
  const d = parseDetailPage(html, "structural-design-engineer-2", NOW)

  test("splits title/company from the <title> tag", () => {
    expect(d.title).toBe("Structural Design Engineer")
    expect(d.company).toBe("Structwell Engineers")
  })
  test("extracts and strips the .job-description body", () => {
    expect(d.description).toContain("Build")
    expect(d.description).toContain("bridges")
    expect(d.description).toContain("AutoCAD")
    expect(d.description).not.toContain("<")
  })
  test("reads the location", () => {
    expect(d.location).toBe("Busselton, Australia")
  })
})

describe("cleanHtml", () => {
  test("returns null for empty input", () => {
    expect(cleanHtml("")).toBeNull()
  })
})

describe("filters", () => {
  const cards = parseJobCards(CARD_HTML, NOW)
  test("filterByAge keeps recent, drops old", () => {
    // card 0 = 2026-07-14 (1 day), card 1 = 2025-12-20 (~7 months)
    expect(filterByAge(cards, 7, NOW)).toHaveLength(1)
    expect(filterByAge(cards, 9999, NOW)).toHaveLength(2)
  })
  test("filterByLocation substring-matches, case-insensitive", () => {
    expect(filterByLocation(cards, "australia")).toHaveLength(1)
    expect(filterByLocation(cards, "new york")).toHaveLength(1)
    expect(filterByLocation(cards, "berlin")).toHaveLength(0)
  })
})

describe("searchPath", () => {
  test("builds the keyword+page query with the bracketed param", () => {
    const p = searchPath("engineer", 2)
    expect(p).toContain("search%5Bkeywords%5D=engineer")
    expect(p).toContain("page=2")
  })
})
