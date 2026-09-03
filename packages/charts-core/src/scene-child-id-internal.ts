/** Resolves one stable child namespace without duplicating an existing prefix. */
export function sceneChildId(ownerId: string, childId: string): string {
  return childId === ownerId || childId.startsWith(`${ownerId}:`)
    ? childId
    : `${ownerId}:${childId}`
}
