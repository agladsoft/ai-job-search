# ai-jobs-cli

Zero-dependency Bun CLI for [ai-jobs.net](https://ai-jobs.net) (AI / ML / data jobs). Part of
the `ai-jobs-search` skill — see `../SKILL.md` for the full command reference and
`../url-reference.md` for the markup anchors and the two site quirks (client-side keyword
filtering; `company` is always `null`). Personal use, low volume.

## Setup

```bash
bun install   # dev types only; the CLI runs on plain bun + fetch
```

## Run

```bash
bun run src/cli.ts search -q "head of ai" --limit 5 --format table
bun run src/cli.ts detail <slug-id> --format plain
```

## Test / typecheck

```bash
bun run typecheck
bun run test        # unit tests (card parse, no network) + one live search
```

`AIJOBS_BASE_URL` overrides the base URL (default `https://ai-jobs.net`) for a mirror or test
instance.
