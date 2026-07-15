# hubstafftalent-cli

Zero-dependency Bun CLI for [Hubstaff Talent](https://hubstafftalent.net)'s public job
listings. Part of the `hubstafftalent-search` skill — see `../SKILL.md` for the full
command reference and `../url-reference.md` for the markup anchors and the XHR-fragment
trick that avoids needing a headless browser. **Personal use only**, low volume.

## Setup

```bash
bun install   # dev types only; the CLI runs on plain bun + fetch
```

## Run

```bash
bun run src/cli.ts search -q "software engineer" --limit 5 --format table
bun run src/cli.ts detail <slug> --format plain
```

## Test / typecheck

```bash
bun run typecheck
bun run test        # unit tests (fragment unwrap + card parse, no network) + one live search
```

`HUBSTAFF_BASE_URL` overrides the base URL (default `https://hubstafftalent.net`).
