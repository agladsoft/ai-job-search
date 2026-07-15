# ods-cli

Zero-dependency Bun CLI for [ods.ai](https://ods.ai) (Open Data Science) data-science/ML jobs,
via its embedded `__NEXT_DATA__` JSON. Part of the `ods-search` skill — see `../SKILL.md` and
`../url-reference.md`. CIS/Russian community board (IC-heavy, often Russian-language, RUB salaries).

## Setup

```bash
bun install   # dev types only
```

## Run

```bash
bun run src/cli.ts search -q "ml" --format table
bun run src/cli.ts detail <uuid> --format plain
```

## Test / typecheck

```bash
bun run typecheck
bun run test        # unit tests (__NEXT_DATA__ parse, no network) + one live search
```

`ODS_BASE_URL` overrides the base URL (default `https://ods.ai`).
