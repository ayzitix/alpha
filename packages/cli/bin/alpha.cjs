#!/usr/bin/env node

// Launcher for the alpha CLI.
//
// Resolves, in order: $ALPHA_BIN_PATH, a cached binary next to this script,
// or the platform package installed under node_modules. Signals are forwarded
// so Ctrl-C reaches the agent instead of killing only this wrapper.
const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")
const os = require("os")

const signals = ["SIGINT", "SIGTERM", "SIGHUP"]

function resolveBinary() {
  if (process.env.ALPHA_BIN_PATH) return process.env.ALPHA_BIN_PATH
  const dir = path.dirname(fs.realpathSync(__filename))
  const cached = path.join(dir, ".alpha")
  if (fs.existsSync(cached)) return cached
  const platform = { darwin: "darwin", linux: "linux", win32: "windows" }[os.platform()] ?? os.platform()
  const arch = { x64: "x64", arm64: "arm64", arm: "arm" }[os.arch()] ?? os.arch()
  const name = `alpha-${platform}-${arch}`
  const exe = platform === "windows" ? "alpha.exe" : "alpha"
  let current = dir
  for (;;) {
    const candidate = path.join(current, "node_modules", name, "bin", exe)
    if (fs.existsSync(candidate)) return candidate
    const parent = path.dirname(current)
    if (parent === current) return
    current = parent
  }
}

const target = resolveBinary()
if (!target) {
  console.error("Could not find the alpha binary. Build it with `bun run build` or set ALPHA_BIN_PATH.")
  process.exit(1)
}

const child = spawn(target, process.argv.slice(2), { stdio: "inherit" })
const forwarders = {}
const detach = () => {
  for (const signal of signals) process.off(signal, forwarders[signal])
}

child.on("error", (error) => {
  detach()
  console.error(error.message)
  process.exit(1)
})

for (const signal of signals) {
  forwarders[signal] = () => {
    if (!child.killed) child.kill(signal)
  }
  process.on(signal, forwarders[signal])
}

child.on("exit", (code, signal) => {
  detach()
  if (signal) return process.kill(process.pid, signal)
  process.exit(typeof code === "number" ? code : 0)
})
