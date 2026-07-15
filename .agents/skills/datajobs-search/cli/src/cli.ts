#!/usr/bin/env bun
// Self-contained CLI for searching datajobs.com (a data/analytics job board). Zero runtime
// dependencies. The site has no keyword-search endpoint — jobs are browsed via category
// pages — so this CLI fetches the relevant categories and filters client-side.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { baseUrl, DEFAULT_CATEGORIES } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}
const ALIAS: Record<string, string> = { q: "query", n: "limit", l: "location", c: "category" }
function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (!a.startsWith("-")) {
      ;(flags._ as string[]).push(a)
      continue
    }
    const name = a.replace(/^-+/, "")
    const key = ALIAS[name] ?? name
    const next = argv[i + 1]
    let value: string | boolean = true
    if (next !== undefined && !next.startsWith("-")) {
      value = next
      i++
    }
    flags[key] = value
  }
  return flags
}
type FlagValue = string | boolean | string[] | undefined
function stringFlag(raw: FlagValue): string | undefined {
  return typeof raw === "string" ? raw : undefined
}

const HELP = `datajobs-cli — search datajobs.com (data / analytics jobs)

USAGE
  bun run src/cli.ts search [-q "<keywords>"] [-c "<category>"] [-l "<place>"] [--format json|table|plain]
  bun run src/cli.ts detail <url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>      Keywords matched over title/company/category (client-side). Optional.
  --category, -c <slug>   A single category page instead of the default set, e.g. "Machine-Learning-Jobs"
                          or "data architect" (normalized to <Title>-Jobs). Default categories:
                          ${DEFAULT_CATEGORIES.join(", ")}.
  --location, -l <text>   Client-side substring over the location, e.g. -l "Remote".
  --page <n>              1-indexed page (client-side). Default 1.
  --limit, -n <n>         Results per page. Default 25.
  --format <fmt>          json (default) | table | plain.

DETAIL
  <url>                   The full https://datajobs.com/<Company>/<Role>-Job~<id> URL from a
                          search result (a bare id cannot reconstruct the path).

EXAMPLES
  bun run src/cli.ts search -q "machine learning" --format table
  bun run src/cli.ts search -c "Data-Architect-Jobs" -l "remote" --format table
  bun run src/cli.ts detail "https://datajobs.com/Some-Co/Data-Scientist-Job~123456" --format plain

Public listings. Source: ${baseUrl()} (datajobs.com). No keyword-search endpoint; category-based.
Note: listing cards carry no posting date, so results are not age-filtered.
`

function parseIntFlag(name: string, raw: string | boolean | string[]): number | null {
  const val = parseInt(raw as string, 10)
  if (isNaN(val)) {
    process.stderr.write(JSON.stringify({ error: `--${name} must be a number, got "${raw}"`, code: "BAD_ARG" }) + "\n")
    return null
  }
  return val
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)
  const cmd = (flags._ as string[])[0]
  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }
  if (cmd === "search") {
    const fmt = (flags.format as string) || "json"
    for (const name of ["jobage", "page", "limit"] as const) {
      if (flags[name] !== undefined) {
        const v = parseIntFlag(name, flags[name])
        if (v === null) return 1
        flags[name] = String(v)
      }
    }
    const opts: SearchOpts = {
      query: stringFlag(flags.query),
      category: stringFlag(flags.category),
      location: stringFlag(flags.location),
      jobage: flags.jobage ? parseInt(flags.jobage as string, 10) : 9999,
      page: flags.page ? Math.max(1, parseInt(flags.page as string, 10)) : 1,
      limit: flags.limit ? Math.max(1, parseInt(flags.limit as string, 10)) : 25,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }
  if (cmd === "detail") {
    const id = (flags._ as string[])[1]
    if (!id) {
      process.stderr.write(JSON.stringify({ error: "detail requires a job URL", code: "NO_ID" }) + "\n")
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: DetailOpts = { id, format: fmt === "plain" ? "plain" : "json" }
    return runDetail(opts)
  }
  process.stderr.write(JSON.stringify({ error: `Unknown command "${cmd}"`, code: "BAD_CMD" }) + "\n")
  return 1
}
main().then((code) => process.exit(code))
