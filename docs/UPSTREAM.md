# Upstream

`alpha` is a fork of [anomalyco/opencode](https://github.com/anomalyco/opencode).

| | |
|---|---|
| Repository | `github.com/anomalyco/opencode` |
| Branch | `dev` |
| Base commit | `62ae125d943fce8d5fac6e72304d1b68d92becc8` |
| Commit date | 2026-10-28 09:38:10 UTC |
| Commit subject | `fix(stats): ignore requests rejected before routing (#59773)` |
| Package version at fork | `2.2.0` (release line `v2.2.0`, 2026-10-27) |
| Drift at fork time | 1 commit behind `dev` (`d6867f221061`, a mobile stats fix) |

## What the fork changed

Removed: full-screen TUI (`packages/tui/src/app.tsx`, `routes/`, `component/`,
`feature-plugins/`, …), desktop, web app, console, stats, stories, posts, sdk,
session-ui, gui-plugins, services, embedded web UI in the binary, `upgrade` and
`uninstall` commands, and the simulation graph in the build.

Changed: the root command is the interactive cli (upstream: `opencode mini`);
binary and product name are `alpha`; `packages/tui/src/mini` is the only
frontend.

Added: `/model` slash command, `docs/CODEBASE.md`, `docs/EXPORTS.md`.

## Keeping up

```bash
git remote add upstream https://github.com/anomalyco/opencode.git
git fetch upstream dev
git log --oneline 62ae125d..upstream/dev          # what landed upstream
git diff --stat 62ae125d..upstream/dev            # where it touched
```

Merge strategy:

- Most upstream work lands in `packages/core`, `packages/server`,
  `packages/schema`, `packages/protocol`, `packages/ai` and `packages/client` —
  these are intact in this fork, so merges there are usually clean.
- `packages/tui/src/mini` is intact too (only `/model` added), so upstream mini
  improvements can be merged directly.
- Expect conflicts only in `packages/cli/src/commands/commands.ts`,
  `packages/cli/src/index.ts`, `packages/cli/script/build.ts`,
  `packages/cli/src/server-process.ts` and `packages/tui/package.json` — the
  places where fork-only edits live.
- Do not merge upstream `packages/app`, `packages/desktop`, `packages/web`,
  `packages/cli/src/commands/handlers/{upgrade,uninstall}.ts` or the web-UI
  asset plumbing back in.

## Version stamping

Local builds report the root `package.json` version (currently `2.2.0`), not a
synthetic `0.0.0-<channel>-<date>` id. `packages/script/src/index.ts` falls back
to `rootPkg.version` when `OPENCODE_VERSION` is unset.

This matters because the Console/Zen gateway reads the client identity built by
`App.useragent` (`opencode/<channel>/<version>/<name>`) and rejects clients whose
version is not a real semver at or above its minimum. With a `0.0.0-main-*`
string every free-tier request fails with HTTP 426:

```
OpenCode 1.18.0 or newer is required to use the free tier
```

That check is server-side and unrelated to the mini frontend. Note that
open-code's free tier is documented as available only to official OpenCode
clients, so a fork should not depend on it; use your own provider credentials
or a paid model.
