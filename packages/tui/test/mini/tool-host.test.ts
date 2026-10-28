import { describe, expect, test } from "bun:test"
import { claudeToolStart } from "../../src/mini/tool"

describe("claude tool headers", () => {
  test("maps legacy file markers to Verb(target)", () => {
    expect(claudeToolStart("# Wrote src/a.ts")).toBe("⏺ Write(src/a.ts)")
    expect(claudeToolStart("# Created src/a.ts")).toBe("⏺ Write(src/a.ts)")
    expect(claudeToolStart("# Edited src/a.ts")).toBe("⏺ Edit(src/a.ts)")
    expect(claudeToolStart("# Deleted src/a.ts")).toBe("⏺ Delete(src/a.ts)")
    expect(claudeToolStart("# Patched src/a.ts")).toBe("⏺ Patch(src/a.ts)")
  })

  test("maps subagent headers to Task", () => {
    expect(claudeToolStart("# Explore Subagent\nScan the repo")).toBe("⏺ Task(Explore)\nScan the repo")
  })

  test("maps the generic gear fallback", () => {
    expect(claudeToolStart("⚙ fetch https://example.com")).toBe("⏺ fetch(https://example.com)")
    expect(claudeToolStart("⚙ custom")).toBe("⏺ custom")
  })

  test("leaves plain text alone", () => {
    expect(claudeToolStart("no marker here")).toBe("no marker here")
    expect(claudeToolStart("")).toBe("")
  })
})
