import { describe, expect, test } from "bun:test"
import { presetStyle } from "../../src/mini/preset"

describe("mini presets", () => {
  test("default keeps the existing chrome", () => {
    const style = presetStyle("default")
    expect(style.user).toBe("›")
    expect(style.thinking).toBe("Thinking:")
    expect(style.section).toBe("# ")
    expect(style.shell("git status")).toBe("$ git status")
    expect(style.spinner).toBe("▪")
    expect(style.summary).toBe("")
    expect(style.assistant).toBe("")
    expect(style.result).toBe("")
    expect(style.promptRail).toBe("┃")
  })

  test("claude swaps glyphs without touching layout", () => {
    const style = presetStyle("claude")
    expect(style.user).toBe("⏺")
    expect(style.thinking).toBe("✻ Thinking…")
    expect(style.section).toBe("· ")
    expect(style.shell("git status")).toBe("⏺ Bash(git status)")
    expect(style.spinner).toBe("✻")
    expect(style.splashMark).toBe("⏺")
    expect(style.summary).toBe("✻ ")
    expect(style.assistant).toBe("⏺ ")
    expect(style.result).toBe("  ⎿  ")
    expect(style.promptRail).toBe("❯")
  })

  test("mono degrades every preset to ASCII", () => {
    for (const name of ["default", "claude"] as const) {
      const style = presetStyle(name, true)
      expect(style.user).toBe(">")
      expect(style.thinking).toBe("Thinking:")
      expect(style.shell("ls")).toBe("$ ls")
      expect(style.spinner).toBe("*")
      expect(style.splashMark).toBe("[O]")
      expect(style.summary).toBe("")
      expect(style.assistant).toBe(name === "claude" ? ">" : "")
      expect(style.result).toBe(name === "claude" ? "|" : "")
      expect(style.promptRail).toBe(name === "claude" ? ">" : "|")
    }
    expect(presetStyle("claude", true).section).toBe("* ")
  })

  test("an unknown preset falls back to default", () => {
    expect(presetStyle(undefined).name).toBe("default")
  })
})
