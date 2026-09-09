export function number(value: number): string {
  return String(Math.round(value * 100) / 100)
}

const entities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}

function escapeCharacter(character: string): string {
  return entities[character] ?? character
}

export function escapeText(value: string): string {
  return value.replace(/[&<>]/g, escapeCharacter)
}

export function escapeAttribute(value: string): string {
  return value.replace(/[&<>"]/g, escapeCharacter)
}
