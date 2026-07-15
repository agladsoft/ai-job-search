# remotive-cli

Zero-dependency Bun CLI for the [Remotive](https://remotive.com) public remote-jobs API.
Part of the `remotive-search` skill — see `../SKILL.md` for the full command reference,
and `../url-reference.md` for the API endpoints. Please credit Remotive, link back to the
Remotive job URL, and keep requests to ~4/day (their terms).

## Setup

```bash
bun install   # dev types only; the CLI runs on plain bun + fetch
```

## Run

```bash
bun run src/cli.ts search -q "engineering manager" --limit 5 --format table
bun run src/cli.ts detail 2091062 --format plain
```

## Test / typecheck

```bash
bun run typecheck
bun run test        # unit tests (no network) + one live search
```

`REMOTIVE_API_URL` overrides the base URL (default `https://remotive.com`) for a
mirror or test instance.
