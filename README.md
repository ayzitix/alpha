# alpha

A terminal-first coding agent. `alpha` stays in your shell scrollback: no
alternate screen, no full-screen TUI — output appends to the terminal the way
`git` or `cargo` does, with a live composer pinned at the bottom.

It is a focused fork of [opencode](https://github.com/anomalyco/opencode)
(`MIT`): the interactive frontend is opencode's `mini`, and everything else —
the desktop app, web UI, full-screen TUI and the rest of the product surface —
has been removed.

```
▪ alpha v0.0.0 · ~/code/project
┃ Ask anything, / for commands, @ for context…
  Build · <model> · ctrl+p menu
```

## Build

Requires [Bun 1.4.4](https://bun.sh) (pinned in `package.json`).

```bash
bun install
bun run build -- --single        # current platform only
./packages/cli/dist/cli-linux-x64/bin/alpha --version
```

`bun run build` without `--single` builds every target.

## Use

```bash
alpha                    # interactive cli in the current directory
alpha /path/to/project   # start somewhere else
alpha -c                 # continue the last session
alpha -s <session-id>    # resume a specific session
alpha -m <provider/model> --agent plan
alpha --standalone       # private server, skip the shared background service
alpha run "fix the tests"    # non-interactive, streams to stdout
alpha serve                  # headless server only
```

`/` opens commands, `@` attaches files, `ctrl+p` opens the menu, `esc` interrupts.

## What is inside

| Path | Purpose |
|---|---|
| `packages/tui/src/mini` | the interactive frontend: split-footer renderer, scrollback commits, prompt editor, permissions |
| `packages/cli` | entrypoint, command surface, background-service client, server process |
| `packages/server`, `packages/core`, `packages/ai` | agent runtime, tools, sessions, providers |
| `packages/client`, `packages/schema`, `packages/protocol` | typed client and wire formats |

The CLI is a client: it talks to a local server over HTTP + SSE. `--standalone`
runs that server privately; the default reuses one shared background service per
user.

## Docs

- [`docs/CODEBASE.md`](./docs/CODEBASE.md) — what every package, command and
  mini module does, plus a "where to change what" table.
- [`docs/EXPORTS.md`](./docs/EXPORTS.md) — every export in `packages/cli` and
  `packages/tui/src/mini` (regenerate with `bun run script/gen-exports.ts`).

## Tests

```bash
cd packages/tui && bun test test/mini     # renderer unit tests
bun run typecheck                         # from the repo root
```

## Attribution

`alpha` is derived from [opencode](https://github.com/anomalyco/opencode),
copyright the opencode contributors, licensed under MIT. The original license
and copyright notice are preserved in [`LICENSE`](./LICENSE) and
[`NOTICE`](./NOTICE).
