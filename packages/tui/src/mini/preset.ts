// Visual presets for the mini transcript.
//
// A preset only changes chrome: the leading glyphs, section labels and the
// shell/tool prefix. Layout and behaviour stay identical, so presets are safe
// to switch without touching the renderer. Mono mode stays ASCII regardless of
// preset because the cell buffer cannot draw decorative glyphs there.
import type { MiniPreset } from "./types"

export type PresetStyle = {
  readonly name: MiniPreset
  /** Prefix for a user prompt line. */
  readonly user: string
  /** Literal marker that introduces a reasoning block. */
  readonly thinking: string
  /** Prefix for section headings such as Todos/Questions. */
  readonly section: string
  /** Gutter in front of assistant text (hanging indent). */
  readonly assistant: string
  /** Gutter in front of a tool result block. */
  readonly result: string
  /** Glyph used as the composer rail. */
  readonly promptRail: string
  /** First line of a shell tool call. */
  readonly shell: (command: string) => string
  /** Footer spinner glyph. */
  readonly spinner: string
  /** Glyph in front of the product name in the splash. */
  readonly splashMark: string
  /** Prefix for the per-turn summary row. */
  readonly summary: string
}

const styles: Record<MiniPreset, PresetStyle> = {
  default: {
    name: "default",
    user: "›",
    thinking: "Thinking:",
    section: "# ",
    assistant: "",
    result: "",
    promptRail: "┃",
    shell: (command) => `$ ${command}`,
    spinner: "▪",
    splashMark: "▪",
    summary: "",
  },
  claude: {
    name: "claude",
    user: "⏺",
    thinking: "✻ Thinking…",
    section: "· ",
    assistant: "⏺ ",
    result: "  ⎿  ",
    promptRail: "❯",
    shell: (command) => `⏺ Bash(${command})`,
    spinner: "✻",
    splashMark: "⏺",
    summary: "✻ ",
  },
}

export function presetStyle(name: MiniPreset | undefined, mono = false): PresetStyle {
  const style = styles[name ?? "default"] ?? styles.default
  if (!mono) return style
  return {
    ...style,
    user: ">",
    thinking: style.name === "claude" ? "Thinking:" : style.thinking,
    section: style.name === "claude" ? "* " : style.section,
    assistant: style.name === "claude" ? ">" : style.assistant,
    result: style.name === "claude" ? "|" : style.result,
    promptRail: style.name === "claude" ? ">" : "|",
    shell: (command) => `$ ${command}`,
    spinner: "*",
    splashMark: "[O]",
    summary: "",
  }
}
