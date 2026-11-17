/** Move rows `ids` so they land at `targetIndex` (drag-and-drop reorder). */
export function moveLines<T>(lines: readonly T[], ids: readonly number[], targetIndex: number): T[] {
  const moving = new Set(ids)
  const moved = ids.map((i) => lines[i])
  const rest = lines.filter((_, i) => !moving.has(i))
  let insertAt = 0
  for (let i = 0; i < targetIndex; i++) if (!moving.has(i)) insertAt++
  // Dragging down past the target lands after it; otherwise a one-row move would be a no-op.
  if (Math.max(...ids) < targetIndex) insertAt++
  rest.splice(insertAt, 0, ...moved)
  return rest
}
