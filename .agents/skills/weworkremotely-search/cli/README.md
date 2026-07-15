# weworkremotely-cli

Zero-dependency Bun CLI for [We Work Remotely](https://weworkremotely.com)'s public RSS
feeds. Part of the `weworkremotely-search` skill — see `../SKILL.md` for the full command
reference and `../url-reference.md` for the feed structure. Every posting is remote.

## Setup

```bash
bun install   # dev types only; the CLI runs on plain bun + fetch
```

## Run

```bash
bun run src/cli.ts search -q "engineer" --limit 5 --format table
bun run src/cli.ts detail <slug> --format plain
```

## Test / typecheck

```bash
bun run typecheck
bun run test        # unit tests (RSS parsing, no network) + one live feed fetch
```

`WWR_BASE_URL` overrides the base URL (default `https://weworkremotely.com`) for a mirror
or test instance.
