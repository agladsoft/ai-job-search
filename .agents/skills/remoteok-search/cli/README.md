# remoteok-cli

Zero-dependency Bun CLI for the [RemoteOK](https://remoteok.com) public remote-jobs API. Part of
the `remoteok-search` skill — see `../SKILL.md` for the full command reference and
`../url-reference.md` for the API. Please credit Remote OK and link back to the Remote OK job URL
(their terms), and keep request volume low.

## Setup

```bash
bun install   # dev types only; the CLI runs on plain bun + fetch
```

## Run

```bash
bun run src/cli.ts search -q "engineering manager" --limit 5 --format table
bun run src/cli.ts detail 1134826 --format plain
```

## Test / typecheck

```bash
bun run typecheck
bun run test        # unit tests (no network) + one live search
```

`REMOTEOK_API_URL` overrides the base URL (default `https://remoteok.com`) for a mirror or test
instance.
