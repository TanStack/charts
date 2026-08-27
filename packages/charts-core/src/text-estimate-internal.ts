export function estimateTextWidth(
  text: string,
  fontSize: number,
  fontWeight: number,
  letterSpacing = 0,
): number {
  let emWidth = 0
  for (const character of text) {
    emWidth += estimateCharacterWidth(character)
  }
  const clampedWeight = Math.min(900, Math.max(100, fontWeight))
  const weightFactor = 1 + (clampedWeight - 400) / 12_500
  return Math.max(
    0,
    emWidth * fontSize * weightFactor +
      Math.max(0, Array.from(text).length - 1) * letterSpacing,
  )
}

function estimateCharacterWidth(character: string): number {
  if (/\s/u.test(character)) return 0.33
  if (/[\u0300-\u036f]/u.test(character)) return 0
  if (/[ilI1|!.,:;'`]/u.test(character)) return 0.28
  if (/[mwMW@#%&]/u.test(character)) return 0.9
  if (/[A-Z]/u.test(character)) return 0.64
  if (/[0-9]/u.test(character)) return 0.56
  if (character.codePointAt(0)! > 0x7f) return 1
  return 0.54
}
