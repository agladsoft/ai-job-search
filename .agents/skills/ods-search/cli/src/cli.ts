#!/usr/bin/env bun
// Self-contained CLI for searching ods.ai (Open Data Science) — a CIS/Russian data-science
// & ML community job board. Zero runtime dependencies. The site is a Next.js app; this CLI
// fetches the page and reads its embedded __NEXT_DATA__ JSON, so filtering is client-side.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { baseUrl } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}
const ALIAS: Record<string, string> = { q: "query", n: "limit", l: "location" }
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

const HELP = `ods-cli — search ods.ai (Open Data Science) data-science / ML jobs

USAGE
  bun run src/cli.ts search [-q "<keywords>"] [-l "<place>"] [--jobage <days>] [--format json|table|plain]
  bun run src/cli.ts detail <uuid|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>      Keywords matched over title/tags (client-side). Optional.
  --location, -l <text>   Client-side substring over cities / work type, e.g. -l "remote".
  --jobage <days>         Posted within N days (client-side).
  --page <n>              1-indexed page (client-side). Default 1.
  --limit, -n <n>         Results per page. Default 25.
  --format <fmt>          json (default) | table | plain.

DETAIL
  <uuid|url>              An ods.ai vacancy uuid (a search result's id) or a full
                          https://ods.ai/jobs/<uuid> URL.

EXAMPLES
  bun run src/cli.ts search -q "engineer" --format table
  bun run src/cli.ts search -q "ml" -l "remote" --jobage 30 --format table
  bun run src/cli.ts detail ba0ddae5-40b8-40c0-8362-a2e226eedd20 --format plain

Public data (no key). Source: ${baseUrl()} (ods.ai). CIS/Russian data-science community —
postings are IC-heavy and often Russian-language; salaries frequently in RUB.
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
      process.stderr.write(JSON.stringify({ error: "detail requires a <uuid|url>", code: "NO_ID" }) + "\n")
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
