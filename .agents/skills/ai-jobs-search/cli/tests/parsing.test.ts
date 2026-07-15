import { describe, expect, test } from "bun:test"
import {
  filterByAge,
  filterByLocation,
  filterByQuery,
  jobPath,
  parseDetailPage,
  parseId,
  parseJobCards,
  parseRelativeDate,
} from "../src/helpers.js"

// Deterministic unit tests over the pure card-parse / normalize / filter logic — no
// network. The fixture mirrors the real ai-jobs.net listing markup captured during build.

const LISTING = `<ul>
<li class="d-flex justify-content-between position-relative pb-2 py-2 mb-1"> <div> <div>
  <a class="font-monospace fw-bold stretched-link" href="/job/principal-knowledge-data-architect-headquarters-chevy-chase-md-219682/" target="_blank">
    <span class="fw-light text-bg-primary px-1 rounded d-none d-sm-inline">Featured</span>
    <span class="fw-light text-bg-primary px-1 rounded d-inline d-sm-none">Feat.</span>
    Principal Knowledge &amp; Data Architect </a>
  <span class="text-bg-success px-1 rounded">USD 174K-284K</span> </div>
  <div> <span>AWS Neptune</span> | <span>Canonicalization</span> | <span>Cypher</span> </div>
  <div> <span class="text-success">Health and wellness</span> </div> </div>
  <div class="text-end"> <div> <span class="text-bg-warning px-1 rounded">Senior-level</span> <span class="text-bg-secondary px-1 rounded">Full Time</span> </div>
  <div> Headquarters - Chevy Chase, MD <span class="text-bg-success px-1 rounded">R</span> </div>
  <div class="text-muted">6d ago</div> </div> </li>
<li class="d-flex justify-content-between position-relative pb-2 py-2 mb-1"> <div> <div>
  <a class="font-monospace fw-bold stretched-link" href="/job/ml-engineer-remote-200475/" target="_blank"> ML Engineer </a> </div>
  <div> <span>Python</span> | <span>PyTorch</span> </div> </div>
  <div class="text-end"> <div> <span class="text-bg-warning px-1 rounded">Mid-level</span> <span class="text-bg-secondary px-1 rounded">Full Time</span> </div>
  <div> Remote </div>
  <div class="text-muted">today</div> </div> </li>
</ul>`

const NOW = new Date("2026-07-15T12:00:00Z")

describe("parseJobCards", () => {
  const cards = parseJobCards(LISTING, NOW)

  test("parses every <li> job card", () => {
    expect(cards).toHaveLength(2)
  })
  test("maps the first card to the contract shape", () => {
    const c = cards[0]
    expect(c.id).toBe("219682")
    expect(c.title).toBe("Principal Knowledge & Data Architect") // badges stripped, entity decoded
    expect(c.company).toBeNull() // ai-jobs.net never exposes the company
    expect(c.location).toBe("Headquarters - Chevy Chase, MD")
    expect(c.remote).toBe(true)
    expect(c.salary).toBe("USD 174K-284K")
    expect(c.seniority).toBe("Senior-level")
    expect(c.job_type).toBe("Full Time")
    expect(c.date).toBe("2026-07-09") // 6 days before NOW
    expect(c.url).toContain("/job/principal-knowledge-data-architect-headquarters-chevy-chase-md-219682/")
    expect(c.tags).toContain("AWS Neptune")
    expect(c.tags).not.toContain("Health and wellness") // benefit span (has a class) excluded
  })
  test("second card: remote location, 'today' date", () => {
    const c = cards[1]
    expect(c.id).toBe("200475")
    expect(c.title).toBe("ML Engineer")
    expect(c.location).toBe("Remote")
    expect(c.remote).toBe(true)
    expect(c.date).toBe("2026-07-15")
    expect(c.salary).toBeNull()
  })
})

describe("parseRelativeDate", () => {
  test("resolves days/weeks/months/today/yesterday", () => {
    expect(parseRelativeDate("6d ago", NOW)).toBe("2026-07-09")
    expect(parseRelativeDate("2w ago", NOW)).toBe("2026-07-01")
    expect(parseRelativeDate("today", NOW)).toBe("2026-07-15")
    expect(parseRelativeDate("yesterday", NOW)).toBe("2026-07-14")
    expect(parseRelativeDate("3h ago", NOW)).toBe("2026-07-15")
  })
  test("returns null for unparseable input", () => {
    expect(parseRelativeDate("", NOW)).toBeNull()
    expect(parseRelativeDate("a while back", NOW)).toBeNull()
  })
})

describe("parseId / jobPath", () => {
  test("parseId takes the trailing id from a slug-id or URL", () => {
    expect(parseId("principal-knowledge-data-architect-headquarters-chevy-chase-md-219682")).toBe("219682")
    expect(parseId("https://ai-jobs.net/job/ml-engineer-remote-200475/")).toBe("200475")
    expect(parseId("")).toBeNull()
  })
  test("jobPath builds /job/<slug>/ from a token or URL", () => {
    expect(jobPath("ml-engineer-remote-200475")).toBe("/job/ml-engineer-remote-200475/")
    expect(jobPath("https://ai-jobs.net/job/ml-engineer-remote-200475/?x=1")).toBe("/job/ml-engineer-remote-200475/")
    expect(jobPath("no-id-here")).toBeNull()
  })
})

describe("parseDetailPage", () => {
  const html = `<html><head>
    <meta property="og:title" content="ML Engineer - Remote">
    <meta property="og:description" content="Build models; ship RAG pipelines; own inference infra">
    </head><body></body></html>`
  const d = parseDetailPage(html, "/job/ml-engineer-remote-200475/", "200475", NOW)
  test("splits title/location from og:title and reads og:description", () => {
    expect(d.title).toBe("ML Engineer")
    expect(d.location).toBe("Remote")
    expect(d.description).toContain("RAG pipelines")
    expect(d.company).toBeNull()
    expect(d.remote).toBe(true)
  })
})

describe("filters", () => {
  const cards = parseJobCards(LISTING, NOW)
  test("filterByQuery matches title/tags/seniority", () => {
    expect(filterByQuery(cards, "architect")).toHaveLength(1)
    expect(filterByQuery(cards, "pytorch")).toHaveLength(1)
    expect(filterByQuery(cards, "senior")).toHaveLength(1)
    expect(filterByQuery(cards, "kubernetes")).toHaveLength(0)
  })
  test("filterByAge keeps recent, drops old", () => {
    // card 0 = 6d ago, card 1 = today
    expect(filterByAge(cards, 3, NOW)).toHaveLength(1)
    expect(filterByAge(cards, 9999, NOW)).toHaveLength(2)
  })
  test("filterByLocation substring-matches", () => {
    expect(filterByLocation(cards, "chevy chase")).toHaveLength(1)
    expect(filterByLocation(cards, "remote")).toHaveLength(1)
    expect(filterByLocation(cards, "berlin")).toHaveLength(0)
  })
})
