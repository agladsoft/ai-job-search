# datajobs-cli

Zero-dependency Bun CLI for [datajobs.com](https://datajobs.com) (data/analytics jobs), via its
category pages. Part of the `datajobs-search` skill — see `../SKILL.md` and `../url-reference.md`.
No keyword-search endpoint; the CLI fetches categories and filters client-side.

## Setup

```bash
bun install   # dev types only
```

## Run

```bash
bun run src/cli.ts search -q "lead" --format table
bun run src/cli.ts detail "https://datajobs.com/<Company>/<Role>-Job~<id>" --format plain
```

## Test / typecheck

```bash
bun run typecheck
bun run test        # unit tests (card parse, no network) + one live category search
```

`DATAJOBS_BASE_URL` overrides the base URL (default `https://datajobs.com`).
