import { Context, Effect, FileSystem, Option } from "effect"
import { Commands } from "../commands"
import { Runtime } from "../../framework/runtime"
import { ServerConnection } from "../../services/server-connection"
import { Config } from "../../config"
import { resolve } from "@opencode/tui/config"
import { Global } from "@opencode/util/global"

// The root command is the interactive cli. It is a thin client: the agent
// runtime lives in the background server this handler connects to.
export default Runtime.handler(Commands, (input) =>
  Effect.gen(function* () {
    const directory = Option.getOrUndefined(input.directory)
    if (directory !== undefined) process.chdir(directory)

    const { runMini, validateMiniTerminal } = yield* Effect.promise(() => import("../../mini"))
    yield* Effect.promise(async () => validateMiniTerminal())
    const server = yield* ServerConnection.resolve({
      server: Option.getOrUndefined(input.server),
      standalone: input.standalone,
      mismatch: "replace",
    })
    const config = yield* Config.Service
    const global = yield* Global.Service
    const resolved = resolve(yield* config.get(), { terminalSuspend: process.platform !== "win32" })
    const fileSystem = yield* FileSystem.FileSystem
    const runServicePromise = Effect.runPromiseWith(Context.make(FileSystem.FileSystem, fileSystem))
    const service = server.service
    yield* Effect.promise(() =>
      runMini({
        server: {
          endpoint: server.endpoint,
          reconnect: service ? (signal) => runServicePromise(service.reconnect(), { signal }) : undefined,
        },
        continue: input.continue,
        session: Option.getOrUndefined(input.session),
        fork: input.fork,
        model: Option.getOrUndefined(input.model),
        agent: Option.getOrUndefined(input.agent),
        prompt: Option.getOrUndefined(input.prompt),
        replay: Option.getOrUndefined(input.replay) ?? resolved.mini?.replay ?? true,
        replayLimit: Option.getOrUndefined(input.replayLimit) ?? resolved.mini?.replay_limit,
        demo: input.demo,
        tuiConfig: resolved,
        config: {
          update: (update) => runServicePromise(config.update(update)),
        },
        paths: { home: global.home, state: global.state, log: global.log },
      }),
    )
  }),
)
