# Codebase map

What every part of `alpha` does, in the order you will need it. For a mechanical
list of every exported symbol in `packages/cli` and `packages/tui/src/mini`, see
[`EXPORTS.md`](./EXPORTS.md).

---

## 1. Mental model

`alpha` is three things wired together:

```
┌──────────────────────────┐        HTTP + SSE         ┌──────────────────────────┐
│ packages/cli             │ ────────────────────────▶ │ packages/server          │
│  argv → command → client │ ◀──────────────────────── │  Hono/Effect HTTP API    │
│  (also hosts the server) │        events             │  + SSE event feed        │
└───────────┬──────────────┘                           └───────────┬──────────────┘
            │                                                      │
            │ renders                                              │ calls
            ▼                                                      ▼
┌──────────────────────────┐                           ┌──────────────────────────┐
│ packages/tui/src/mini    │                           │ packages/core            │
│  split-footer renderer   │                           │  sessions, tools,        │
│  scrollback + composer   │                           │  permissions, config,    │
└──────────────────────────┘                           │  projects, providers     │
                                                       └──────────────────────────┘
```

Rules that hold everywhere:

- **The UI is a client.** It never runs a model call or a tool itself. It sends a
  prompt over HTTP and reads an SSE stream of events.
- **`core` owns state.** Sessions, messages, permissions, config and tool
  execution live there. `server` is a transport adapter over `core`.
- **`schema` owns shapes.** Anything that crosses a process boundary is defined
  in `packages/schema` and generated into `packages/protocol` and `packages/client`.
- **The binary is the same program.** When `alpha` needs a local server it spawns
  itself with `serve --service` (or runs it in-process with `--standalone`).

---

## 2. Packages

| Package | Role |
|---|---|
| `packages/cli` | entrypoint, commands, background-service management, headless `run`, ACP |
| `packages/tui` | terminal UI primitives; **only `src/mini` remains** — the interactive cli |
| `packages/server` | HTTP API, SSE feed, auth, pairing |
| `packages/core` | agent runtime: sessions, tools, permissions, config, providers, projects |
| `packages/schema` | Effect schemas for every wire type |
| `packages/protocol` | HTTP API definition built from schemas |
| `packages/client` | typed client (promise + effect + solid) used by UIs |
| `packages/ai` | model/provider integration layer over the Vercel AI SDK |
| `packages/plugin` | plugin/tool interfaces and host runtime |
| `packages/util` | shared helpers (global paths, process, fs, logging, npm) |
| `packages/ui`, `packages/theme` | shared visual primitives and theme tokens |
| `packages/latex`, `packages/merman` | math/Mermaid rendering for terminal output |
| `packages/codemode` | "code mode" execution surface for tools |
| `packages/simulation` | simulation harness (build-time graph embedding disabled in this fork) |
| `packages/http-recorder`, `packages/httpapi-codegen` | test/dev tooling for the HTTP layer |
| `packages/script` | build metadata helpers (version, channel, highlights) |

---

## 3. One prompt, end to end

1. `packages/cli/src/index.ts` boots Effect services and hands `argv` to
   `Runtime.run(Commands, Handlers)`.
2. The root command (`commands/handlers/default.ts`) resolves/creates the local
   server via `services/server-connection.ts`, then calls `runMini()` from
   `packages/cli/src/mini.ts`.
3. `runMini` validates the terminal, builds the SDK client, and dynamically
   imports `@opencode/tui/mini` (`runInteractiveDeferredMode`).
4. `packages/tui/src/mini/runtime.ts` boots: config → model info → session
   history → `runtime.lifecycle.ts` creates the split-footer renderer →
   `stream-v2.transport.ts` subscribes to server events → `runtime.queue.ts`
   drives the prompt loop.
5. Transport turns events into **`StreamCommit`** rows (immutable, committed to
   terminal scrollback) and footer updates (mutable live region).
   `scrollback.surface.ts` + `scrollback.writer.tsx` render rows;
   `footer.ts` + `footer.view.tsx` render the pinned composer/status.
6. On submit the prompt is enqueued through the SDK. The server admits it to the
   session, runs the model loop (`core/src/session`), executes tools
   (`core/src/tool`), and streams events back. Permission requests arrive as
   events and are rendered by `footer.permission.tsx`.

---

## 4. `packages/cli`

### 4.1 Entry and framework

| File | What it does |
|---|---|
| `src/index.ts` | process entry; wires `Commands` to lazy `Handlers`, logs, heap/CPU profilers, shutdown deadline |
| `src/framework/spec.ts` | tiny spec builder over `effect/cli` (`Spec.make(name, {params, commands})`) |
| `src/framework/runtime.ts` | binds a spec tree to lazy handler modules; wraps each handler so `--print-logs` applies |
| `src/version.ts` | embeds version/channel/artifact/highlights at build time |
| `src/env.ts` | environment/variable helpers |
| `src/mini.ts` | `runMini(input)`: terminal validation, SDK connection, launches the frontend |
| `src/mini-host.ts` | the "host" object the frontend receives: model preferences, signals, diagnostics tracing, `openEditor` |
| `src/session-target.ts` | resolves `--continue` / `--session` / `--fork` into a concrete session |
| `src/server-process.ts` | runs the server in-process (`default`), as a service (`--service`) or over stdio |

### 4.2 Commands

The root command **is** the interactive CLI; everything else is a subcommand
(`src/commands/commands.ts` defines flags, `src/index.ts` maps handlers):

| Command | Handler | Does |
|---|---|---|
| `alpha [directory]` | `handlers/default.ts` | interactive split-footer cli; flags: `-c`, `-s`, `--fork`, `--replay[-limit]`, `-m`, `--agent`, `--prompt`, `--auto`, `--standalone`, `--server`, `--demo` |
| `alpha run <message..>` | `handlers/run.ts` | non-interactive: one prompt, stream to stdout or `--format json` |
| `alpha serve` | `handlers/serve.ts` | headless HTTP server (`--service`, `--stdio`, `--hostname`, `--port`, `--cors`) |
| `alpha models` | `handlers/models.ts` | list providers/models |
| `alpha stats` | `handlers/stats.ts` | token/cost statistics |
| `alpha reload` | `handlers/reload.ts` | reload plugins/config in the running service |
| `alpha pair` | `handlers/pair.ts` | pair a remote client with this server |
| `alpha acp` | `handlers/acp.ts` | Agent Client Protocol server |
| `alpha api` | `handlers/api.ts` | print the HTTP API |
| `alpha auth …` | `handlers/auth/*` | `list`, `login`, `logout`, `export`, `import`, `switch` |
| `alpha mcp …` | `handlers/mcp/*` | `list`, `add`, `auth`, `logout` |
| `alpha plugin …` | `handlers/plugin/*` | `list`, `add`, `check`, `update`, `remove` |
| `alpha session …` | `handlers/session/*` | `list`, `delete`, `export`, `import` |
| `alpha service …` | `handlers/service/*` | `start`, `restart`, `status`, `stop`, `get`, `set`, `unset` — background server control |
| `alpha debug …` | `handlers/debug/*` | `agents`, `config`, `heap-dump`, `paths` |

Removed in this fork: `upgrade`/`uninstall` (they would install upstream
`opencode` artifacts over `alpha`).

### 4.3 Services

| File | What it does |
|---|---|
| `services/server-connection.ts` | finds a compatible running server, starts one, or connects to `--server`; replaces a mismatched one |
| `services/service-config.ts` | reads/writes service settings (password, cors, tunnel flags) |
| `services/service-registration.ts` | registers the running service (pid, port, password) so clients can find it |
| `services/standalone.ts` | in-process server lifecycle for `--standalone` |
| `services/port-owner.ts` | identifies what owns a port when binding fails |
| `services/remote-tunnel.ts` | optional public tunnel for `pair --remote` |
| `services/retained-image.ts` | keeps pasted images alive across prompts |
| `services/updater.ts`, `updater-action.ts`, `update-preflight.tsx` | update plumbing (no command exposes it in this fork) |

### 4.4 Headless run

`src/run/` streams a single prompt without the renderer: `run.ts` (orchestration
and flags), `noninteractive.ts` (stdout formatting), `ui.ts` (spinners/progress),
`v1.ts` (legacy bridge), `index.ts` (public entry).

---

## 5. `packages/tui/src/mini` — the interface

This is where the visible behaviour of `alpha` lives. Files, grouped by job:

### 5.1 Boot and orchestration

| File | What it does |
|---|---|
| `runtime.ts` | top-level orchestrator: resolve config/model/session, create lifecycle, start stream, run prompt queue (`runInteractiveDeferredMode`) |
| `runtime.boot.ts` | resolves settings, model info, session info, agent/command/reference catalogs |
| `runtime.lifecycle.ts` | creates the OpenTUI renderer in `split-footer` mode (no alternate screen), entry/exit splash, SIGINT handling, shutdown |
| `runtime.queue.ts` | prompt queue: submit, steer, cancel, replay pending input, run the loop until the footer closes |
| `index.ts` | public entry (`runMiniFrontend`) |

### 5.2 Streaming and state

| File | What it does |
|---|---|
| `stream-v2.transport.ts` | subscribes to server events; turns deltas into commits and footer updates; the main event state machine |
| `stream-v2.fragment.ts` | accumulates partial text/tool fragments before they become immutable rows |
| `stream-v2.subagent.ts` | tracks child sessions started by subagent tools |
| `stream-v2.image.ts` | inlines images returned by tools or attached to prompts |
| `stream.ts` | thin bridge between transport output and the footer API |
| `session.shared.ts` | prompt/message helpers: compare, copy, project prompt input |
| `session-data.ts` | converts session history into replay rows (resume/after resize) |
| `catalog.shared.ts` | loads models, agents, commands and references for pickers |
| `verbosity.ts` | `quiet` / `default` / `everything` presets over thinking, tools, shell output, turn summary, footer |
| `turn-summary.ts` | builds the "Build · model · 1.2s" row at the end of a turn |

### 5.3 Rendering

| File | What it does |
|---|---|
| `scrollback.surface.ts` | the scrollback control surface: commits rows, handles resize, keeps ordering |
| `scrollback.writer.tsx` | renders commit rows (markdown, code, tables, diffs, todos) into the scrollback |
| `scrollback.shared.ts` | syntax styles and shared row theming |
| `entry.body.ts` | decides the body shape of an entry (text, markdown, structured, code) |
| `tool.ts` | tool rendering: paths, headers, inline info, scroll bodies, snapshots |
| `tool.public.ts` | the small stable surface for other packages (`readDisplayText`, `toolInlineInfo`, …) |
| `mono.ts` | ASCII/monochrome fallbacks for terminals without glyph support |
| `preset.ts` | visual presets (`default`, `claude`): leading glyphs, section labels, shell prefix, spinner, splash mark. Selected with `mini.preset`; mono always degrades a preset to ASCII |
| `theme.ts` | terminal theme resolution (light/dark, palette probing) |
| `splash.ts` | entry/exit splash, including the `alpha -s <id>` resume command |
| `demo.ts` | the `--demo` fixtures (`/fmt`, `/permission`, `/question`) |

### 5.4 Footer (the live region)

| File | What it does |
|---|---|
| `footer.ts` | footer state machine and public API (`RunFooter`): status, hints, panels, commit subscription |
| `footer.view.tsx` | lays out the footer: composer, autocomplete panel, status line, spinner |
| `footer.prompt.tsx` | the multiline composer: editing, history, paste, attachments, submit |
| `footer.command.tsx` | slash-command menu, model/agent/variant/skill/queued-prompt pickers |
| `footer.menu.tsx` | generic menu panel used by the pickers |
| `footer.permission.tsx` | permission prompts (once / always / reject) |
| `footer.form.tsx` | structured forms and questions (single, multi, custom fields) |
| `footer.subagent.tsx` | subagent panel: child sessions and their progress |
| `footer.width.ts` | width/layout policy for the footer |
| `prompt.editor.ts` | text editing primitives for the composer |
| `prompt.shared.ts` | prompt comparison/copy helpers |
| `permission.shared.ts` | permission presentation: labels, "always" rules, staging |
| `form.shared.ts` | form state helpers shared by the form footer and transport |
| `types.ts` | the internal contract: `StreamCommit`, `RunInput`, footer state, settings |

### 5.5 The rendering contract

Everything the transport emits is one of two things:

- **`StreamCommit`** — immutable. Appended once to scrollback, never edited.
  Kinds cover text, reasoning, tools, diffs, todos, errors, images, turn summary.
- **Footer update** — mutable. Repainted in place: status, spinner, hints,
  composer, permission/form panel.

If you add a new kind of output, you touch `stream-v2.transport.ts` (produce it),
`types.ts` (type it), `scrollback.writer.tsx` / `tool.ts` (render it).

### 5.6 Slash commands

There are two kinds, and they are implemented in different places.

**Handled locally by the frontend** (no server round trip):

| Command | What it does | Where |
|---|---|---|
| `/new` | starts a new session (new session id, same directory) | `runtime.queue.ts` → `onNewSession`, matched by `isNewCommand` in `prompt.shared.ts` |
| `/compact` | compacts older context; shows "compacting session" while it runs | `runtime.queue.ts` → `onCompact` |
| `/exit`, `/quit`, `/q`, `:q` | closes `alpha` | `runtime.queue.ts`, `EXIT_COMMANDS` in `prompt.shared.ts` |
| `/editor` | composes the prompt in `$VISUAL`/`$EDITOR` and submits it | menu action in `footer.prompt.tsx`, `openEditor` via `cli/src/mini-host.ts` |
| `/settings` | opens the transcript settings panel (verbosity, footer, thinking…) | menu action + typed handler in `footer.prompt.tsx` |
| `/model` | opens the model picker (same one as the `ctrl+p` menu); trailing text is ignored | `isModelCommand` + `onModel` in `footer.prompt.tsx`, wired to `openModel` in `footer.view.tsx` |
| `/clear` | clears the terminal screen | command-palette action only (`footer.command.tsx`) |

**Sent to the server** as a command invocation, then executed by
`core/src/session/command.ts` → `Command.Service`:

| Command | What it does | Registered in |
|---|---|---|
| `/init` | guided `AGENTS.md` setup: sends a built-in prompt to the model | `core/src/plugin/command.ts` |
| `/review [commit\|branch\|pr]` | reviews uncommitted changes, a commit, a branch or a PR | `core/src/plugin/command.ts` |
| `/<server>:<prompt>` | runs an MCP prompt and submits its messages as the prompt | `core/src/plugin/command.ts` (from `Mcp.prompts()`) |
| any user command | markdown commands from config (`command/*.md`, `command` key) with `$ARGUMENTS`, `agent`, `model`, `subtask` | `core/src/config/plugin/command.ts` |

Unknown commands are rejected by the server with `Command.NotFoundError`.

## 5.7 Presets

`mini.preset` switches the transcript chrome without touching layout:

| | `default` | `claude` |
|---|---|---|
| user prompt | `›` | `⏺` |
| reasoning | `Thinking:` | `✻ Thinking…` |
| section headings | `# Todos` | `· Todos` |
| shell tool | `$ cmd` | `⏺ Bash(cmd)` |
| footer spinner | `▪` | `✻` |
| splash mark | `▪ alpha` | `⏺ alpha` |
| turn summary | `alpha · model · 1s` | `✻ alpha · model · 1s` |
| assistant gutter | — | `⏺ ` |
| tool result gutter | — | `  ⎿  ` |
| composer rail | `┃` | `❯` |

Config only (not yet in the `/settings` panel), requires a restart:

```json
{ "mini": { "preset": "claude" } }
```

Mono mode always wins: every preset degrades to ASCII (`>`, `Thinking:`,
`$ cmd`, `*`, `[O]`).

The gutter is structural: `RunScrollbackStream.createEntry` wraps the entry
renderable in a row with a fixed-width glyph and gives the body a numeric width
(`surface.width - glyph`), which produces a real hanging indent for wrapped
lines. Entries are replayed on resize, so widths are recomputed then.

Statusline: with the `claude` preset the row is split — identity (spinner,
agent, model) on the left, telemetry and actions (context, provider, cost,
menu) on the right, separated by a flex spacer. When the two halves do not fit,
the row falls back to the single wrapping line used by the default preset.

Still open: tool action lines still use the legacy `$ cmd` / `# Wrote` markers
(only shell calls got `⏺ Bash(...)`), there is no dim rule around the composer,
and thinking is not an inline spinner while streaming.

Demo mode (`alpha --demo`) adds frontend-only `/help`, `/permission`,
`/form`, `/fmt` fixtures in `mini/demo.ts`; they do not exist in a normal
session.

To add a command:

- **no code** — drop a markdown file in the project's command directory;
- **built-in** — register it in `core/src/plugin/command.ts` with
  `ctx.command.transform((editor) => editor.add({ name, description, execute }))`;
- **client-side** — intercept it in `runtime.queue.ts` and add the entry to
  `slashOptions` in `footer.prompt.tsx`.

---

## 6. `packages/server`

Transport only; all decisions live in `core`.

| Area | Files |
|---|---|
| API assembly | `api.ts`, `routes.ts`, `handlers.ts` |
| Request pipeline | `middleware/*`, `auth.ts`, `cors.ts`, `location.ts`, `request-tracing.ts` |
| Event stream | `event-feed.ts` (SSE), `handlers/event.ts` |
| Process lifecycle | `process.ts`, `service-status.ts`, `server-info.ts`, `workerd.ts` |
| Pairing | `pairing.ts` |
| Handlers | `handlers/{session,message,permission,form,agent,command,config,credential,debug,event,fs,generate,integration,location,mcp,media,migration,model,persistent-pty,plugin,project,provider,pty,pty-socket,reference,rpc,server,session-error,shell,skill,usage,vcs,voice,websearch,worktree}.ts` |

The API surface is generated from `packages/protocol`; do not hand-edit
`packages/client` generated files.

---

## 7. `packages/core`

| Subsystem | Files / dirs | What it owns |
|---|---|---|
| Sessions | `session.ts`, `session/` | durable history, prompt admission, inbox, execution, compaction, revert, subagents, title, usage |
| Execution | `session/execution/`, `session/run-coordinator.ts`, `session/runner` | one LLM step at a time, tool loop, interruption, restart recovery |
| Messages | `session/message*, session/projector.ts` | projecting durable events into visible messages |
| Tools | `tool.ts`, `tool/` | tool registry, built-in tools, plugin tools, MCP tools, output limits |
| Permissions | `permission.ts`, `permission/` | ask/allow/deny, saved rules |
| Agents | `agent.ts`, `agent/` | built-in agents (code/plan/…), custom agents, prompts |
| Providers/models | `provider.ts`, `model.ts`, `models-dev*`, `model-resolver.ts`, `aisdk*.ts` | provider discovery, auth, model metadata, selection |
| Config | `config.ts`, `config/` | global/project config, schemas, discovery, plugins |
| Projects/locations | `project.ts`, `project/`, `instance.ts`, `location*.ts`, `workspace.ts` | project identity, per-directory state, multi-location routing |
| Plugins | `plugin.ts`, `plugin/` | plugin loading, hooks, host, updates |
| State/snapshots | `snapshot.ts`, `state.ts`, `file-mutation.ts` | file snapshots for revert/diff |
| Files | `filesystem.ts`, `filesystem/`, `ripgrep.ts`, `file-access.ts` | search, watch, read/write limits |
| Git | `git.ts`, `vcs.ts`, `vcs/`, `worktree.ts`, `worktree/` | status/diff, worktrees |
| Terminals | `pty.ts`, `pty/`, `persistent-pty*` | shell sessions |
| Integrations | `mcp/`, `skill/`, `command.ts`, `form.ts`, `websearch.ts`, `image.ts`, `voice.ts` | MCP servers, skills, slash commands, forms, search, images, voice |
| Events | `bus.ts`, `bus/`, `event/`, `event-logger.ts` | in-process and durable event plumbing |

---

## 8. Wire types and client

| Package | Files | Notes |
|---|---|---|
| `schema` | ~97 files (`session*.ts`, `permission.ts`, `form.ts`, `tool.ts`, `provider.ts`, `model.ts`, `event.ts`, …) | single source of truth for shapes |
| `protocol` | `api.ts` + generated route definitions | built from schemas |
| `client` | `promise/`, `effect/`, `solid/`, `generated/` | three flavours over the same API; `generated/` is machine-written |
| `ai` | `llm.ts`, `generation.ts`, `image.ts`, `media.ts`, `protocols/`, `provider-*.ts` | provider adapters, retries, caching, error mapping |

Regenerate the client after changing server endpoints:

```bash
cd packages/client && bun run generate
```

---

## 9. Where to change what

| Goal | Touch |
|---|---|
| Change what a turn looks like | `tui/src/mini/stream-v2.transport.ts` (data), `scrollback.writer.tsx`, `tool.ts` (render) |
| Change the composer / keybindings | `footer.prompt.tsx`, `footer.command.tsx`, `config/keybind.ts` |
| Change the status line / spinner | `footer.view.tsx`, `footer.ts`, `turn-summary.ts` |
| Change permission UX | `footer.permission.tsx`, `permission.shared.ts`, `util/permission.ts` |
| Add a slash command | `core/src/command.ts` (+ frontend catalog in `catalog.shared.ts`) |
| Add an agent | `core/src/agent/` |
| Add a built-in tool | `core/src/tool/` (registry in `core/src/tool.ts`) |
| Add an HTTP endpoint | `server/src/handlers/*`, `protocol`, then regenerate the client |
| Add a CLI subcommand | `cli/src/commands/commands.ts` (spec) + `cli/src/index.ts` (handler map) + handler file |
| Change model/provider behaviour | `core/src/provider.ts`, `model-resolver.ts`, `packages/ai/*` |
| Change verbosity presets | `tui/src/mini/verbosity.ts` |

## 10. Constraints of this fork

- No full-screen/alternate-screen UI: `mini` is the only interactive frontend.
- No self-update path: `upgrade`/`uninstall` are gone on purpose.
- No embedded web UI: `serve` exposes the HTTP API only.
- No keyless free tier: the `opencode` provider is still registered for API
  keys and Console sign-in, but zero-cost models are removed from the catalog
  in `core/src/plugin/provider/opencode.ts`, so they never reach a picker or a
  request. Paid `opencode/*` models keep working with a key.
- Internal package scopes remain `@opencode/*` (cheaper upstream cherry-picks).
- Runtime paths still use `OPENCODE_*` env vars and `~/.config/opencode`,
  `~/.local/share/opencode` — shared with a normal opencode install.
