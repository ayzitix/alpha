import { describe, expect, test } from "bun:test"
import { isModelCommand } from "../../src/mini/footer.prompt"

describe("/model command", () => {
  test("matches the bare command and ignores trailing text", () => {
    for (const input of ["/model", "  /MODEL  ", "/model anthropic/claude", "/model\tfoo"]) {
      expect(isModelCommand(input)).toBe(true)
    }
  })

  test("does not match other prompts or lookalikes", () => {
    for (const input of ["/models", "/model2", "model", "text /model", "/compact", "/modeling"]) {
      expect(isModelCommand(input)).toBe(false)
    }
  })
})
