# AGENTS.md

This repository is `alpha`: a fork of opencode that ships only the `mini`
split-footer CLI. See README.md for the product shape.

## Rules

- Keep the terminal frontend inside `packages/tui/src/mini`. Do not reintroduce a
  full-screen/alternate-screen UI.
- The CLI is a client of the local server. Do not move agent-runtime concerns
  into `packages/cli` or into the frontend.
- Never add self-update/upgrade flows that would install upstream `opencode`
  artifacts into an `alpha` install.
- Preserve the MIT attribution in LICENSE and NOTICE.

## Build and checks

```bash
bun install
bun run typecheck                  # turbo typecheck across packages
bun run build -- --single          # build the current platform binary
cd packages/tui && bun test test/mini
```

Never run tests from the repository root (the root script intentionally fails).

## Style

Match the surrounding code: Effect services, `bun check` for typechecking,
single-word local names, early returns, no `any`, no empty catch blocks.
