export function number(value: number): string {
  return String(Math.round(value * 100) / 100)
}

const entities: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
}

const unsafeCharacter =
  /[&<>\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]|[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g

function escapeCharacter(character: string): string {
  return entities[character] ?? '\uFFFD'
}

export function escapeText(value: string): string {
  return value.replace(unsafeCharacter, escapeCharacter)
}

export function escapeAttribute(value: string): string {
  return value
    .replace(unsafeCharacter, escapeCharacter)
    .replace(/"/g, entities['"'])
}
