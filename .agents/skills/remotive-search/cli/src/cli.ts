#!/usr/bin/env bun
// Self-contained CLI for searching the Remotive public JSON API (remote-only jobs).
// No external CLI framework and zero runtime dependencies, so it runs anywhere
// `bun` is available with nothing installed beyond the repo clone.
//
// Reads are public (no API key), but Remotive asks consumers to credit Remotive,
// link back to the Remotive job URL, and GET at most ~4 times a day (data is
// delayed 24h). This skill is search + detail for personal job-hunting only.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { baseUrl } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

// Short-flag aliases.
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
    // A flag with no following value (or another flag next) is a boolean.
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

/** A flag's string value, or undefined when unset or a bare boolean flag. */
function stringFlag(raw: FlagValue): string | undefined {
  return typeof raw === "string" ? raw : undefined
}

const HELP = `remotive-cli — search the Remotive remote-jobs API

USAGE
  bun run src/cli.ts search [-q "<keywords>"] [--category <slug>] [-l "<place>"] [--format json|table|plain]
  bun run src/cli.ts detail <id|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>      Full-text keywords (title/description). Optional.
  --category <slug>       Remotive category slug, e.g. software-development, product,
                          devops-sysadmin. See https://remotive.com/api/remote-jobs/categories
  --location, -l <text>   Client-side filter over the eligibility geography
                          (candidate_required_location), e.g. -l "Europe". Substring, case-insensitive.
  --jobage <days>         Posted within N days (client-side; the API has no age param).
  --page <n>              1-indexed page (client-side over the fetched set). Default 1.
  --limit, -n <n>         Results per page. Default 25.
  --format <fmt>          json (default) | table | plain.

DETAIL
  <id|url>                A Remotive numeric job id, or a full
                          https://remotive.com/remote-jobs/<category>/<slug>-<id> URL.

EXAMPLES
  bun run src/cli.ts search -q "engineering manager" --limit 10 --format table
  bun run src/cli.ts search --category software-development -l "Europe" --jobage 14 --format table
  bun run src/cli.ts search -q "head of AI" --format json
  bun run src/cli.ts detail 2091062 --format plain

Reads are public (no API key). Source: ${baseUrl()} — please credit Remotive and
link back to the Remotive job URL. Keep it to ~4 requests/day.
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
      process.stderr.write(JSON.stringify({ error: "detail requires an <id|url>", code: "NO_ID" }) + "\n")
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
