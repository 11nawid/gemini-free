/**
 * Cleans up redundant / useless filler text from assistant responses.
 *
 * The underlying model occasionally repeats branding words or phrases (for
 * example "Gemini Free Free, Free" or long strings of the same token) and
 * emits repeated blank lines. This pipeline removes that noise while leaving
 * code fences and legitimate prose untouched.
 */

const CODE_FENCE = /```[\s\S]*?```|`[^`\n]*`/g;

function cleanNonCode(text: string): string {
  let out = text;

  // Collapse runs of 2+ identical words separated by spaces and/or punctuation:
  // "Free Free Free" -> "Free", "Free, Free, Free." -> "Free", "OK OK OK" -> "OK".
  out = out.replace(/(\b[\w'’-]+\b)(?:[\s,.;:!?…]+(?=\1\b)\1)+/gi, '$1');

  // Collapse consecutive identical non-empty lines (useful for repeated filler
  // or duplicated bullet lines: "• Hello\n• Hello" -> "• Hello").
  out = out.replace(/^([ \t]*[^\n]+?)[ \t]*\n(?=.*\n)?(?:\1[ \t]*\n)+/gm, '$1\n');

  // Collapse 3+ consecutive blank lines down to a single blank line.
  out = out.replace(/\n{3,}/g, '\n\n');

  // Collapse 3+ consecutive spaces to a single space.
  out = out.replace(/ {3,}/g, ' ');

  return out;
}

export function cleanAssistantText(text: string): string {
  if (!text) return text;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex lastIndex to be safe.
  CODE_FENCE.lastIndex = 0;

  while ((match = CODE_FENCE.exec(text)) !== null) {
    let before = text.slice(lastIndex, match.index);
    before = cleanNonCode(before).trimEnd();
    if (before && !before.endsWith('\n')) before += '\n';
    result += before;
    result += match[0]; // keep code fences verbatim
    lastIndex = match.index + match[0].length;
  }
  result += cleanNonCode(text.slice(lastIndex)).trimEnd();

  return result.trim();
}
