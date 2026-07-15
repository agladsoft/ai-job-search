# crunchboard-cli

Zero-dependency Bun CLI for [CrunchBoard](https://www.crunchboard.com) (TechCrunch's job board)
via its public RSS feeds. Part of the `crunchboard-search` skill — see `../SKILL.md` and
`../url-reference.md`. Small corpus; low-yield supplementary source.

## Setup

```bash
bun install   # dev types only
```

## Run

```bash
bun run src/cli.ts search -q "engineer" --format table
bun run src/cli.ts detail <id> --format plain
```

## Test / typecheck

```bash
bun run typecheck
bun run test        # unit tests (RSS parsing, no network) + one live search
```

`CRUNCHBOARD_BASE_URL` overrides the base URL (default `https://www.crunchboard.com`).
